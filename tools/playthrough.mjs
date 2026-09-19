/*
 * 无头试玩：在 node 里把一局游戏从新开局跑到底，记录节奏数据。
 *
 * 为什么需要它：到目前为止所有测试都是分段冒烟 + 静态读码，没人真的从头玩到尾过。
 * 「通关要多久」「主线能不能走完」「中间有没有大段空转」这些问题只有跑完一局才知道。
 *
 * 能跑什么：game.js / quests.js / contracts.js 都是纯逻辑，可以直接跑真实代码。
 * 不能跑什么：六角格海战场景（battle.js）依赖 Pixi，这里用同样的 fireAt/boardAt
 *   伤害函数做了一个简化结算——命中与沉没的数学一致，但没有走位，所以战斗结果
 *   会比实战略乐观。航程用 tools/routes.json 里预先算好的真实绕行距离。
 *
 * 用法: node tools/playthrough.mjs [--strategy=trade|quest|contract|mixed] [--years=30] [--seed=1] [--json]
 */
global.localStorage = { getItem: () => null, setItem() {}, removeItem() {} };

import { readFileSync } from 'node:fs';
import * as g from '../src/game.js';
import * as Q from '../src/quests.js';
import * as C from '../src/contracts.js';
import { PORTS, GOODS, G, SHIP_TYPES, ZONES, YARD_SHIPS } from '../src/data.js';

const ROUTES = JSON.parse(readFileSync(new URL('./routes.json', import.meta.url), 'utf8'));
const routeUnits = (a, b) => a === b ? 0 : (ROUTES[`${a}|${b}`] ?? ROUTES[`${b}|${a}`] ?? null);

const arg = (k, d) => { const m = process.argv.find(a => a.startsWith(`--${k}=`)); return m ? m.split('=')[1] : d; };
const STRATEGY = arg('strategy', 'mixed');
const YEARS = Number(arg('years', 30));
const MAX_DAY = YEARS * 360;
const AS_JSON = process.argv.includes('--json');

/* ---------- 可复现的随机（覆盖 Math.random，让整局可重放）---------- */
let _seed = Number(arg('seed', 1)) >>> 0;
Math.random = () => { _seed = (_seed * 1664525 + 1013904223) >>> 0; return _seed / 4294967296; };

/* ---------- 记录 ---------- */
const log = { milestones: [], daily: [], notes: [] };
const mark = (what, extra = {}) => {
  if (log.milestones.some(m => m.what === what)) return;
  log.milestones.push({ what, day: g.S.day, year: +(g.S.day / 360).toFixed(1), gold: Math.round(g.S.gold), ...extra });
};

/* ---------- 接管表现层 ---------- */
let pendingDialogue = 0;
Object.assign(g.hooks, {
  render() {}, renderTop() {}, showModal() {}, closeModal() {}, toast() {}, renderBattle() {},
  openPortTab() {}, openSeaMap() {}, hoverPort() {}, npcDay() {},
  showDialogue() { pendingDialogue++; },
  questPorts: () => Q.questPorts(),
  portMarkers: pid => Q.portMarkers(pid),
  onEvent: (t, d) => Q.questEvent(t, d),
  onCargo: () => { if (!g.S.dest) C.recheckHere(); },
  dayTick: () => C.contractEvent('day'),
  onArrive: () => {},
  routeBetween: (a, b) => routeUnits(a, b),
  routeLen: pid => routeUnits(g.S.pos, pid) ?? 0,
  rollEvent(to, done) { done(0); },     // 航行事件在 sail() 里单独摇
});

/* ---------- 航行 ---------- */
function sail(pid) {
  const S = g.S;
  if (pid === S.pos) return true;
  const units = routeUnits(S.pos, pid);
  if (units == null) { log.notes.push(`第 ${S.day} 天：${S.pos} → ${pid} 无航线`); return false; }
  const days = Math.max(1, Math.ceil(units / g.dayDistance()));
  // 中途事件：概率与 ui.js 的 rollEvent 对齐（42% 无事、16% 风暴、14% 顺风、14% 漂流物、14% 热病）
  const r = Math.random();
  let extra = 0;
  if (r >= 0.42 && r < 0.58) {
    const sh = S.fleet[Math.floor(Math.random() * S.fleet.length)];
    sh.hp = Math.max(1, sh.hp - Math.round(g.T(sh).hp * (0.1 + Math.random() * 0.2)));
    extra = 1 + Math.floor(Math.random() * 2);
  } else if (r < 0.72) S.supplies += 3;
  else if (r < 0.86) { const gd = GOODS[Math.floor(Math.random() * GOODS.length)]; const q = Math.min(g.freeSpace(), 3 + Math.floor(Math.random() * 12)); if (q > 0) S.cargo[gd.id] = (S.cargo[gd.id] || 0) + q; }
  else { const sh = S.fleet[Math.floor(Math.random() * S.fleet.length)]; sh.crew = Math.max(1, sh.crew - Math.max(1, Math.floor(sh.crew * 0.1))); }
  g.passDays(days + extra);
  S.pos = pid; S.dest = null; S.voyage = null;
  g.remember(pid);
  C.contractEvent('arrive', { pid });
  Q.questEvent('arrive', { pid });
  takeQuestsHere();
  Q.checkQuests();
  if (S.supplies >= g.dailySupply()) S.hunger = 0;
  return true;
}

/* ---------- 简化海战结算（伤害数学与 game.js 一致，但没有走位）---------- */
function resolveBattle(kind, rivalId, enemy, zoneId) {
  g.startBattle(kind, rivalId, enemy, zoneId, () => {});
  const B = g.B;
  let round = 0;
  while (round++ < 40) {
    const mine = g.alive(g.S.fleet), foes = g.alive(B.enemy);
    if (!mine.length) { g.endBattle('lose'); return 'lose'; }
    if (!foes.length) { g.endBattle('win'); return 'win'; }
    for (const a of mine) { const t = foes[Math.floor(Math.random() * foes.length)]; if (t && t.hp > 0) g.fireAt(a, t, true, 1 + Math.floor(Math.random() * 3)); }
    const foes2 = g.alive(B.enemy);
    for (const a of foes2) { const t = mine[Math.floor(Math.random() * mine.length)]; if (t && t.hp > 0) g.fireAt(a, t, false, 1 + Math.floor(Math.random() * 3)); }
  }
  g.endBattle('flee'); return 'flee';
}

/* ---------- 经营动作 ---------- */
const capacityFree = () => g.freeSpace();
function topUpSupplies(days) {
  const need = Math.ceil(days * g.dailySupply()) + 10;
  if (g.S.supplies < need) g.buySupplies(Math.min(capacityFree(), need - g.S.supplies));
}
function hireAll() { g.S.fleet.forEach((sh, i) => g.hire(i, g.T(sh).crew - sh.crew)); }
function repairAll() { g.repairAll(); }

/** 没钱买货时的自救：接一张运货委托，货是委托方装的，不用本金 */
function takeFreightForCash() {
  const S = g.S;
  const c = C.boardFor(S.pos).find(x => x.kind === 'deliver' && !C.isTaken(x.id) && !C.isClosed(x.id) && capacityFree() >= x.qty);
  if (!c) return false;
  if (C.accept(c)) return false;
  mark('破产后靠运货委托自救');
  topUpSupplies(20);
  return sail(c.to);
}

/** 找当前港到任一已知港的最佳一趟买卖（用真实航程算每天收益） */
function bestRun() {
  const S = g.S, here = g.port(S.pos);
  let best = null;
  const space = capacityFree();
  if (space < 10) return null;
  for (const dest of PORTS) {
    if (dest.id === S.pos) continue;
    const units = routeUnits(S.pos, dest.id); if (units == null) continue;
    const days = Math.max(1, Math.ceil(units / g.dayDistance()));
    if (days > 60) continue;
    for (const gd of GOODS) {
      const qMax = g.maxAffordable(here, gd.id, Math.max(0, S.gold * 0.9), space);
      if (qMax < 5) continue;
      const cost = g.quote(here, gd.id, qMax, 'buy').total;
      const gain = g.quote(dest, gd.id, qMax, 'sell').total;
      const perDay = (gain - cost) / (days * 2);
      if (gain > cost && (!best || perDay > best.perDay)) best = { dest: dest.id, good: gd.id, qty: qMax, perDay, days, profit: gain - cost };
    }
  }
  return best;
}

/* ---------- 策略 ---------- */
function upgradeFleet() {
  const S = g.S, p = g.port(S.pos);
  const avail = YARD_SHIPS[p.yard] || [];
  // 有钱就买能买到的最大船（留一半现金做本钱）
  const want = ['galleon', 'merchant', 'schooner'].find(t => avail.includes(t) && S.gold > SHIP_TYPES[t].price * 2.2);
  if (want && S.fleet.length < 6) { g.buyShip(want); hireAll(); mark(`购入首艘${SHIP_TYPES[want].name}`, { fleet: S.fleet.length }); return true; }
  return false;
}
function investIfRich() {
  const S = g.S;
  if (S.gold > 80000) { g.invest(Math.floor(S.gold * 0.35)); return true; }
  return false;
}

function stepTrade() {
  const S = g.S;
  repairAll(); hireAll(); upgradeFleet(); investIfRich();
  const run = bestRun();
  if (!run) { if (!takeFreightForCash()) g.rest(5); return; }
  g.buy(run.good, run.qty);
  topUpSupplies(run.days + 4);
  if (!sail(run.dest)) return;
  g.sell(run.good, 'all');
}

function stepContract() {
  const S = g.S;
  repairAll(); hireAll(); upgradeFleet(); investIfRich();
  const board = C.boardFor(S.pos).filter(c => !C.isTaken(c.id) && !C.isClosed(c.id));
  for (const c of board) {
    if (S.ct.active.length >= 1) break;
    if (c.kind === 'deliver' && capacityFree() < c.qty) continue;
    if (c.kind === 'bounty') continue;
    C.accept(c);
  }
  const act = C.activeContracts();
  const target = act.find(c => c.to !== S.pos) || act[0];
  if (!target) { stepTrade(); return; }
  if (target.kind === 'procure' && (S.cargo[target.good] || 0) < target.qty) {
    // 去产地买
    const src = PORTS.filter(p => p.produce.includes(target.good))
      .sort((a, b) => (routeUnits(S.pos, a.id) ?? 1e9) - (routeUnits(S.pos, b.id) ?? 1e9))[0];
    if (src && src.id !== S.pos) { topUpSupplies(20); if (!sail(src.id)) return; }
    g.buy(target.good, target.qty - (g.S.cargo[target.good] || 0));
    topUpSupplies(20); sail(target.to); return;
  }
  topUpSupplies(20);
  sail(target.to);
}

/** 抵港时把这里能接的任务都接下来（真人玩家会这么做） */
function takeQuestsHere() {
  for (const q of Q.availableAt(g.S.pos)) { Q.accept(q); mark(`接下任务「${q.title}」`); }
}
function stepQuest() {
  const S = g.S;
  repairAll(); hireAll(); upgradeFleet(); investIfRich();
  takeQuestsHere(); Q.checkQuests();
  const ready = Q.QUESTS.filter(q => Q.qStatus(q.id) === 'ready')[0];
  if (ready && ready.turnIn) { topUpSupplies(30); sail(ready.turnIn); return; }
  // 主线可能要求先去某个港口才开放，没事干就往还没解锁的主线港口走
  const nm = Q.nextMain();
  if (nm && Q.qStatus(nm.id) === 'locked' && Q.prereqMet(nm) && nm.port && nm.port !== S.pos) { topUpSupplies(30); sail(nm.port); return; }
  const active = Q.QUESTS.filter(q => Q.qStatus(q.id) === 'active')[0];
  if (active) {
    const o = active.objectives.find((_, i) => !Q.objDone(active, i));
    if (o && o.port && o.port !== S.pos) { topUpSupplies(30); sail(o.port); return; }
    if (o && (o.kind === 'buy' || o.kind === 'sell' || o.kind === 'deliver') && o.good) {
      const need = o.qty || 10;
      if (o.kind === 'buy' || o.kind === 'deliver') {
        const src = PORTS.filter(p => p.produce.includes(o.good)).sort((a, b) => (routeUnits(S.pos, a.id) ?? 1e9) - (routeUnits(S.pos, b.id) ?? 1e9))[0];
        if (src && src.id !== S.pos) { topUpSupplies(30); if (!sail(src.id)) return; }
        g.buy(o.good, need);
        if (o.port && o.port !== g.S.pos) { topUpSupplies(30); sail(o.port); }
        return;
      }
    }
  }
  stepTrade();
}

const STEPS = { trade: stepTrade, contract: stepContract, quest: stepQuest };
function stepMixed() {
  const n = g.S.day % 3;
  (n === 0 ? stepQuest : n === 1 ? stepContract : stepTrade)();
}

/* ---------- 主循环 ---------- */
g.newGame();
g.S.captain = 'lin';
Q.ensureQuestState(); C.ensureContracts();
Q.maybePrologue();
Q.checkQuests();

takeQuestsHere();
const step = STRATEGY === 'mixed' ? stepMixed : (STEPS[STRATEGY] || stepTrade);
let lastDay = -1, stuck = 0, turns = 0;
const zoneLead = () => ZONES.filter(z => g.S.share[z.id].player >= 50).length;

while (g.S.day < MAX_DAY && !g.S.won) {
  const before = g.S.day;
  try { step(); } catch (e) { log.notes.push(`第 ${g.S.day} 天策略异常：${e.message}`); g.rest(5); }
  turns++;
  // 遇敌：按天数概率摇，越有钱越容易被盯上
  if (Math.random() < 0.10) {
    const kind = Math.random() < 0.75 ? 'pirate' : 'rival';
    const rid = ['whale', 'redsail', 'goldsand'][Math.floor(Math.random() * 3)];
    resolveBattle(kind, kind === 'rival' ? rid : null, g.makeEnemy(kind), g.port(g.S.pos).zone);
  }
  if (g.S.day === before) { if (++stuck > 20) { log.notes.push(`第 ${g.S.day} 天：连续 20 回合没有推进时间，提前结束`); break; } g.rest(3); }
  else stuck = 0;

  if (g.S.day - lastDay >= 90) {
    lastDay = g.S.day;
    log.daily.push({ day: g.S.day, year: +(g.S.day / 360).toFixed(1), gold: Math.round(g.S.gold), fleet: g.S.fleet.length,
      fleetValue: g.fleetValue(), zones: zoneLead(), quests: Q.QUESTS.filter(q => Q.qStatus(q.id) === 'done').length,
      contracts: g.S.ct.done, battles: g.S.stats.battles, wins: g.S.stats.wins });
  }
  if (g.S.gold >= 50000) mark('金币破 5 万');
  if (g.S.gold >= 200000) mark('金币破 20 万');
  if (g.S.fleet.length >= 3) mark('船队满 3 艘');
  if (zoneLead() >= 1) mark('首次主导一片海域');
  if (zoneLead() >= 3) mark('主导 3 片海域');
  const dq = Q.QUESTS.filter(q => Q.qStatus(q.id) === 'done').length;
  if (dq >= 1) mark('完成第 1 个任务');
  if (dq >= 5) mark('完成 5 个任务');
  if (dq >= 11) mark('完成 11 个任务');
}
if (g.S.won) mark('称霸沧海（通关）');

const S = g.S;
const out = {
  策略: STRATEGY, 种子: arg('seed', 1),
  结局: S.won ? '通关' : `${YEARS} 年内未通关`,
  总天数: S.day, 总年数: +(S.day / 360).toFixed(1), 回合数: turns,
  金币: Math.round(S.gold), 船队: S.fleet.length, 船队估值: g.fleetValue(),
  主导海域: `${zoneLead()}/${ZONES.length}（需 ${6}）`,
  完成任务: `${Q.QUESTS.filter(q => Q.qStatus(q.id) === 'done').length}/${Q.QUESTS.length}`,
  完成委托: S.ct.done, 违约委托: S.ct.failed,
  海战: `${S.stats.battles} 场，胜 ${S.stats.wins}`,
  交易次数: S.stats.trades,
  里程碑: log.milestones,
  季度快照: log.daily,
  异常: log.notes.slice(0, 20),
};
if (AS_JSON) { console.log(JSON.stringify(out, null, 1)); process.exit(0); }

console.log(`\n=== 试玩报告 · ${STRATEGY} · seed ${arg('seed', 1)} ===`);
for (const [k, v] of Object.entries(out)) {
  if (Array.isArray(v)) continue;
  console.log(`  ${k}：${v}`);
}
console.log('\n--- 里程碑 ---');
for (const m of out.里程碑) console.log(`  第 ${String(m.year).padStart(5)} 年  ${m.what}${m.fleet ? `（船队 ${m.fleet} 艘）` : ''}  金币 ${m.gold.toLocaleString()}`);
console.log('\n--- 每季度 ---');
console.log('   年份   金币        船队  估值      海域  任务  委托  海战');
for (const d of out.季度快照) {
  console.log(`  ${String(d.year).padStart(5)}  ${String(d.gold.toLocaleString()).padStart(11)}  ${String(d.fleet).padStart(3)}  ${String(d.fleetValue.toLocaleString()).padStart(8)}  ${String(d.zones).padStart(4)}  ${String(d.quests).padStart(4)}  ${String(d.contracts).padStart(4)}  ${String(d.battles).padStart(4)}`);
}
if (out.异常.length) { console.log('\n--- 异常 ---'); out.异常.forEach(n => console.log('  ·', n)); }
