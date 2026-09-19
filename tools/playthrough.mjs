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
 * 用法: node tools/playthrough.mjs [--strategy=trade|quest|contract|mixed|force] [--years=30] [--seed=1] [--json]
 *
 * force（武力路线）额外说明见下方「武力路线」一节：遭遇供给上限来自浏览器里对真实
 * npc.js / map.js 的实测，不是拍脑袋的常数。
 */
global.localStorage = { getItem: () => null, setItem() {}, removeItem() {} };
global.document = { querySelector: () => null };      // quests.flushDialogues 会查「有没有别的弹窗挡着」

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
  showDialogue(pages, opts = {}) {
    pendingDialogue++;
    // 决战对话是个「迎战 / 再准备准备」的选择，不作答的话主线会永远停在决战那一步。
    // 其余对话一律点完就好：接任务由 takeQuestsHere() 直接调 Q.accept，
    // 在这里再 accept 一次会把已有进度清零。
    if (opts.accept && typeof opts.qid === 'string' && opts.qid.startsWith('boss:')) {
      // 真人玩家不会拿一艘光船去送：明显不够打就先婉拒，回头攒够家当再来。
      const guns = g.S.fleet.reduce((a, sh) => a + sh.cannons, 0);
      if (g.S.fleet.length >= 5 && guns >= 60) opts.accept.onAccept();
      else if (opts.accept.onDecline) opts.accept.onDecline();
      return;
    }
    if (opts.onEnd) opts.onEnd();
  },
  questPorts: () => Q.questPorts(),
  portMarkers: pid => Q.portMarkers(pid),
  onEvent: (t, d) => Q.questEvent(t, d),
  onCargo: () => { if (!g.S.dest) C.recheckHere(); },
  dayTick: () => {
    // 月结的收支在 monthTick 里混成一笔，这里按同样的公式先记一次账，
    // 最后才能回答「金币里有多少是打出来的、多少是海域主导发的」
    if (g.S.day % 30 === 0) {
      FS.wages += g.totalCrew() * 4;
      for (const z of ZONES) if (g.S.share[z.id].player >= 50) FS.domIncome += Math.round(g.S.share[z.id].player * 40);
    }
    C.contractEvent('day');
  },
  onArrive: () => {},
  routeBetween: (a, b) => routeUnits(a, b),
  routeLen: pid => routeUnits(g.S.pos, pid) ?? 0,
  rollEvent(to, done) { done(0); },     // 航行事件在 sail() 里单独摇
});

/* ---------- 航行 ---------- */
function sail(pid, opts = {}) {
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
  const from = S.pos;
  g.passDays(days + extra);
  S.pos = pid; S.dest = null; S.voyage = null;
  g.remember(pid);
  C.contractEvent('arrive', { pid, from });
  Q.questEvent('arrive', { pid });
  takeQuestsHere();
  Q.checkQuests();
  drainStory();
  if (S.supplies >= g.dailySupply()) S.hunger = 0;
  lastSailDays = days + extra;
  seaDays += days + extra;
  maybeEncounter(days + extra, opts.pirateOnly);
  return true;
}
/** 上一段航程实际在海上的天数（猎杀按航海日摇遭遇要用） */
let lastSailDays = 0, seaDays = 0;

/**
 * 遇敌：按**在海上的天数**摇，不是按回合摇。
 * 按回合摇会把「一回合只跑一小段」的打法（跑任务、跑短程委托）罚得莫名其妙的重——
 * 同样的三十年，长途贸易只摇几十次，短程打法要摇几百次，于是测出来的不是策略差异，
 * 而是回合数差异。港口里停着的时候不会被打劫。
 */
function maybeEncounter(days, pirateOnly = false) {
  const p = 1 - Math.pow(1 - 0.012, Math.max(1, days));     // 海上每天约 1.2%
  if (Math.random() >= p) return;
  // 猎杀航段自己按实测供给摇对手商会船队，这里只留海盗，免得同一批遭遇被算两遍
  const kind = (!pirateOnly && Math.random() >= 0.75) ? 'rival' : 'pirate';
  const rid = ['whale', 'redsail', 'goldsand'][Math.floor(Math.random() * 3)];
  resolveBattle(kind, kind === 'rival' ? rid : null, g.makeEnemy(kind), g.port(g.S.pos).zone);
}

/* ==================================================================
 * 武力路线（--strategy=force）
 *
 * 一、遭遇供给上限从哪来
 *   对手商会船队不是脚本凭空生成的，真实游戏里它们是 npc.js 的 NPC：
 *   全球同时只有 POOL=46 支船队，阵营按所在海域的份额抽（pickFactionFor），
 *   接触半径 HAIL_R=26、主动招呼半径 HAIL_R*2.2=57.2，打赢后 npc.remove() 会
 *   在随机海域补一条新船。所以「一年能打几场」是有硬上限的。
 *
 *   这个上限是**实测**出来的，不是估的：在浏览器里跑真实的 map.js + npc.js
 *   （window.aot.map），让玩家在某片海域的港口之间不停巡航（1× 航速，
 *   与 map.skipAhead 同样的 dt=0.25），凡是进入 57.2 半径的对手商会船队一律
 *   击沉并调用 npc.remove()，数 720 个游戏日里能打多少场。结果（场/年）：
 *     iberia 73.5 · guinea 59 · medsea 30 · nanyang 26.5 · caribbean 17.5
 *     eastasia 17.5 · brazil 17.5 · levant 14 · northeu 14 · indocean 13
 *   （同一海域跑两轮的偏差在 ±15% 以内；差别主要来自海域面积——46 支船队是
 *    按海域数平摊的，小海域密度高。）
 *   只靠自动触发（半径 26、且 55% 概率才弹遭遇）的话 medsea 只有 20.5 场/年，
 *   所以「主动搜寻」的收益大概是 1.4~1.5 倍，不是无限。
 *
 * 二、份额越高供给越低
 *   pickFactionFor 按海域份额抽阵营，玩家份额涨上去之后新船更可能是自由商人/海盗。
 *   实测（把全部海域份额设成同一个值再量 medsea）：0% → 30 场/年，48% → 9，70% → 7.5。
 *   下面 supplyMult() 就是在这三个点上做线性插值。
 *
 * 三、敌人强度用的是 npc.js 的规则，不是 game.js 的 makeEnemy
 *   makeEnemy('rival') 是按玩家实力缩放的（任务决战 / 随机遇袭走这条），
 *   但海上招呼来的船队走的是 npcBattleFleet(n)——强度只看 n.strength，
 *   与玩家多强**完全无关**。这正是武力路线的关键：船队练起来之后，
 *   猎杀对象不会跟着变强。下面照搬 npc.js 的 makeNpc + npcBattleFleet 数学。
 * ================================================================== */
const FS = {
  loot: 0, shareFromBattle: 0, rivalBattles: 0, rivalWins: 0, pirateBattles: 0, pirateWins: 0,
  wipes: 0, huntLegs: 0, huntDays: 0, repairGold: 0, buyCost: 0, sellRevenue: 0,
  domIncome: 0, wages: 0, huntKills: 0, zoneKills: {},
};
/** 实测：连续在该海域巡航时，一年能打到的对手商会船队场次（见上方说明） */
const ZONE_HUNT_RATE = {
  iberia: 73.5, guinea: 59, medsea: 30, nanyang: 26.5, caribbean: 17.5,
  eastasia: 17.5, brazil: 17.5, levant: 14, northeu: 14, indocean: 13,
};
/** 玩家份额涨上去之后，新生成的 NPC 更少属于对手商会——实测 0%→1.0、48%→0.30、70%→0.25 */
function supplyMult() {
  const avg = ZONES.reduce((a, z) => a + g.S.share[z.id].player, 0) / ZONES.length;
  const pts = [[0, 1], [48, 0.30], [70, 0.25]];
  if (avg <= 0) return 1;
  if (avg >= 70) return 0.25;
  for (let i = 1; i < pts.length; i++) {
    if (avg <= pts[i][0]) {
      const [x0, y0] = pts[i - 1], [x1, y1] = pts[i];
      return y0 + (y1 - y0) * (avg - x0) / (x1 - x0);
    }
  }
  return 0.25;
}
/** 泊松抽样：一段航程里撞上几支对手船队 */
function poisson(lambda) {
  if (lambda <= 0) return 0;
  let L = Math.exp(-lambda), k = 0, p = 1;
  do { k++; p *= Math.random(); } while (p > L && k < 60);
  return k - 1;
}
const NPC_KIND_W = [['merchant', 5], ['escort', 2], ['fisher', 2]];   // npc.js 的 KINDS 权重
const randI = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
const rnd = (a, b) => a + Math.random() * (b - a);
/** 照搬 npc.js makeNpc 里的 ships / strength */
function makeNpcStats() {
  const tot = NPC_KIND_W.reduce((a, k) => a + k[1], 0);
  let x = Math.random() * tot, kind = 'merchant';
  for (const [k, w] of NPC_KIND_W) { if ((x -= w) <= 0) { kind = k; break; } }
  const ships = kind === 'fisher' ? 1 : randI(1, kind === 'escort' ? 4 : 3);
  const per = kind === 'escort' ? 22 : kind === 'fisher' ? 2 : 10;
  return { kind, ships, strength: Math.round(ships * per * rnd(0.75, 1.3)) };
}
/** 照搬 npc.js npcBattleFleet：强度只看 n.strength，和玩家实力无关 */
function npcBattleFleet(n) {
  const pool = n.strength > 70 ? ['merchant', 'galleon', 'frigate'] : n.strength > 30 ? ['schooner', 'merchant', 'galleon'] : ['sloop', 'schooner'];
  const cnt = Math.max(1, Math.min(n.ships, 5));
  const names = ['旗舰', '护航舰', '武装商船', '运输船', '巡逻舰'];
  const hpB = Math.max(120, n.strength * 14), cB = Math.max(6, Math.round(n.strength * 0.7)), crB = Math.max(20, n.strength * 2);
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  return Array.from({ length: cnt }, (_, i) => {
    const t = pool[Math.floor(Math.random() * pool.length)], tt = SHIP_TYPES[t];
    const hp = clamp(Math.round(hpB / cnt * rnd(0.8, 1.2)), 40, tt.hp);
    return { type: t, name: names[i % names.length], hp, maxHp: hp,
      cannons: clamp(Math.round(cB / cnt * rnd(0.8, 1.2)), 2, tt.cannons),
      crew: clamp(Math.round(crB / cnt * rnd(0.8, 1.2)), 5, tt.crew) };
  });
}
/** 遇到的是哪家商会：按 npc.js pickFactionFor 的规则，与该海域份额成正比 */
function pickRivalIn(zid) {
  const sh = g.S.share[zid];
  const ids = ['whale', 'redsail', 'goldsand'];
  const tot = ids.reduce((a, r) => a + Math.max(0, sh[r]), 0);
  if (tot <= 0) return null;
  let x = Math.random() * tot;
  for (const r of ids) { if ((x -= Math.max(0, sh[r])) <= 0) return r; }
  return ids[0];
}
/** 在目标海域巡航一段，并按实测供给结算这一段能打到的对手船队 */
function huntLeg(zid) {
  const S = g.S;
  const ports = PORTS.filter(p => p.zone === zid && p.id !== S.pos);
  if (!ports.length) return false;
  // 挑本海域里最近的港口来回巡：真人猎杀也是在自家海域兜圈子
  const dest = ports.sort((a, b) => (routeUnits(S.pos, a.id) ?? 1e9) - (routeUnits(S.pos, b.id) ?? 1e9))[0];
  const legDays = Math.max(1, Math.ceil((routeUnits(S.pos, dest.id) ?? 0) / g.dayDistance()));
  topUpSupplies(legDays + 8);
  if (!sail(dest.id, { pirateOnly: true })) return false;
  FS.huntLegs++; FS.huntDays += lastSailDays;
  const lambda = ZONE_HUNT_RATE[zid] / 360 * supplyMult() * lastSailDays;
  let n = poisson(lambda);
  for (let i = 0; i < n && !S.won; i++) {
    const rid = pickRivalIn(zid); if (!rid) break;
    // 打不动了就不打了：真人不会拿残血船队硬送
    if (g.S.fleet.reduce((a, s) => a + s.hp, 0) < g.S.fleet.reduce((a, s) => a + g.T(s).hp, 0) * 0.45) break;
    const stats = makeNpcStats();
    g.startBattle('rival', rid, npcBattleFleet(stats), zid, () => {});
    g.B.npc = { faction: rid, kind: stats.kind, zone: zid, id: 'sim' };
    const r = runBattle();
    FS.huntKills += r === 'win' ? 1 : 0;
    FS.zoneKills[zid] = (FS.zoneKills[zid] || 0) + (r === 'win' ? 1 : 0);
  }
  return true;
}

/* ---------- 简化海战结算（伤害数学与 game.js 一致，但没有走位）---------- */
/** 打完当前这场 B，并且**把战后通知补齐**——ui.js 的 battleDone 做的事这里一件都不能少 */
function runBattle() {
  const B = g.B; if (!B) return null;
  const goldBefore = g.S.gold;
  const shareBefore = B.zone ? g.S.share[B.zone].player : 0;
  let round = 0, result = 'flee';
  // 真人玩家不会打到全灭：明显打不过就撤，撤退判定用游戏里同一个公式。
  // 少了这一步，试玩里的战损会被系统性高估，一局会在「全灭→半资产→再全灭」里打转。
  const power = f => f.reduce((a, s) => a + s.hp * 0.5 + s.cannons * 8 + s.crew * 0.6, 0);
  while (round++ < 40) {
    const mine = g.alive(g.S.fleet), foes = g.alive(B.enemy);
    if (!mine.length) { result = 'lose'; break; }
    if (!foes.length) { result = 'win'; break; }
    if (round > 1 && power(mine) < power(foes) * 0.6 && Math.random() < g.fleeChanceAt(4)) { result = 'flee'; break; }
    for (const a of mine) { const t = foes[Math.floor(Math.random() * foes.length)]; if (t && t.hp > 0) g.fireAt(a, t, true, 1 + Math.floor(Math.random() * 3)); }
    const foes2 = g.alive(B.enemy);
    for (const a of foes2) { const t = mine[Math.floor(Math.random() * mine.length)]; if (t && t.hp > 0) g.fireAt(a, t, false, 1 + Math.floor(Math.random() * 3)); }
  }
  g.endBattle(result);
  // 胜利要通知任务与委托：少了这一步，剿匪委托、「击败 N 支船队」与决战
  // 在无头试玩里永远不会推进，于是一半的主线看起来像是「卡住了」。
  const info = { won: g.B.result === 'win', kind: g.B.kind, rivalId: g.B.rivalId, zone: g.B.zone, boss: g.B.boss, npc: g.B.npc };
  // 统计：战利品金币与「靠打仗夺来的份额」分开记账，最后要回答「金币/份额各自从哪来」
  FS.loot += Math.max(0, g.S.gold - goldBefore);
  if (info.zone) FS.shareFromBattle += Math.max(0, g.S.share[info.zone].player - shareBefore);
  if (info.kind === 'rival') { FS.rivalBattles++; if (info.won) FS.rivalWins++; }
  else { FS.pirateBattles++; if (info.won) FS.pirateWins++; }
  if (result === 'lose') FS.wipes++;
  // ui.js 的 battleDone：打了 NPC 船队要扣对方阵营声望、加海盗好感（胜 −22 / 败 −8）
  if (info.npc) {
    g.addRep(info.npc.faction, info.won ? -22 : -8);
    if (info.npc.faction !== 'pirate') g.addRep('pirate', 4);
  }
  const cb = g.clearBattle();
  if (info.won) { Q.questEvent('battleWin', info); C.contractEvent('battleWin', info); }
  if (cb) cb(0);
  Q.checkQuests();
  return result;
}
function resolveBattle(kind, rivalId, enemy, zoneId) { g.startBattle(kind, rivalId, enemy, zoneId, () => {}); return runBattle(); }
/** 把剧情队列点完；决战对话会在回调里直接开打，所以要夹着战斗一起排空 */
function drainStory() {
  for (let i = 0; i < 40; i++) {
    if (g.B) runBattle();
    if (!Q.flushDialogues()) break;
  }
  if (g.B) runBattle();
}

/* ---------- 经营动作 ---------- */
const capacityFree = () => g.freeSpace();
function topUpSupplies(days) {
  const need = Math.ceil(days * g.dailySupply()) + 10;
  if (g.S.supplies < need) g.buySupplies(Math.min(capacityFree(), need - g.S.supplies));
}
function hireAll() { g.S.fleet.forEach((sh, i) => g.hire(i, g.T(sh).crew - sh.crew)); }
/** 新买的船是 0 门炮的，真人玩家会先装满再出海 */
function armAll() { g.S.fleet.forEach((sh, i) => { const want = g.T(sh).cannons - sh.cannons; if (want > 0) g.addCannon(i, want); }); }
/** 净资产 = 现金 + 船队估值 + 舱里货物按当前港的卖价估 */
function netWorth() {
  const here = g.port(g.S.pos);
  let cargo = 0;
  for (const [gid, q] of Object.entries(g.S.cargo)) cargo += g.quote(here, gid, q, 'sell').total;
  return Math.round(g.S.gold + g.fleetValue() + cargo);
}
function repairAll() { g.repairAll(); }

/** 破产自救的完整顺序：先接零本金的运货委托，再拆炮，最后卖船 */
function raiseCash() {
  if (takeFreightForCash()) return true;
  const S = g.S;
  // 舱位塞满又没现金时，真人玩家会就地割肉把货变现，而不是原地枯坐。
  // 少了这一条，一局会在「满舱 + 0 金币」的状态下空转二十几年。
  if (capacityFree() < 10 || S.gold < 500) {
    const keys = Object.keys(S.cargo).filter(k => g.sellable(k) > 0);
    if (keys.length) { for (const k of keys) g.sell(k, 'all'); mark('满舱没钱时就地割肉变现'); return true; }
  }
  if (S.gold < 500) {
    const i = S.fleet.findIndex(sh => sh.cannons > 4);
    if (i >= 0) { g.removeCannon(i, S.fleet[i].cannons - 4); mark('破产后拆炮换钱'); return true; }
    if (S.fleet.length > 1) { let w = 1; for (let k = 1; k < S.fleet.length; k++) if (g.shipRefund(S.fleet[k]) < g.shipRefund(S.fleet[w])) w = k; g.sellShip(w); mark('破产后卖船换钱'); return true; }
  }
  return false;
}

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
  // 有钱就买能买到的最大船（留一半现金做本钱）；武力路线只要能打的
  const pref = STRATEGY === 'force' ? ['frigate', 'galleon'] : ['galleon', 'merchant', 'schooner'];
  const want = pref.find(t => avail.includes(t) && S.gold > SHIP_TYPES[t].price * 2.2);
  if (want && S.fleet.length < 6) { g.buyShip(want); hireAll(); mark(`购入首艘${SHIP_TYPES[want].name}`, { fleet: S.fleet.length }); return true; }
  return false;
}
function investIfRich() {
  const S = g.S;
  // 武力路线要单独量「打仗能拿多少份额」，掺进投资买份额就说不清是谁的功劳了。
  // --force-invest=1 可以放开，用来看「武力 + 投资」联手比纯贸易快多少。
  if (STRATEGY === 'force' && arg('force-invest', '0') !== '1') return false;
  if (S.gold > 80000) { g.invest(Math.floor(S.gold * 0.35)); return true; }
  return false;
}

function stepTrade() {
  const S = g.S;
  repairAll(); hireAll(); armAll(); upgradeFleet(); investIfRich();
  const run = bestRun();
  if (!run) { if (!raiseCash()) g.rest(5); return; }
  g.buy(run.good, run.qty);
  topUpSupplies(run.days + 4);
  if (!sail(run.dest)) return;
  g.sell(run.good, 'all');
}

/**
 * 现金见底时先做生意回血，别继续空转。
 * 之前没有这一步：一旦被战斗打穿家底，跑任务 / 跑委托的分支会因为买不起货、
 * 买不起补给而每回合什么都不做，整整三十年停在「金币 0、一艘小帆船」的姿势上。
 */
function brokeGuard() {
  if (g.S.gold >= 1500) return false;
  if (raiseCash()) return true;
  stepTrade();
  return true;
}

/** 某样货最近的产地 */
function nearestSource(gid) {
  const src = PORTS.filter(p => p.produce.includes(gid))
    .sort((a, b) => (routeUnits(g.S.pos, a.id) ?? 1e9) - (routeUnits(g.S.pos, b.id) ?? 1e9))[0];
  return src ? src.id : null;
}

function stepContract() {
  const S = g.S;
  repairAll(); hireAll(); armAll(); upgradeFleet(); investIfRich();
  if (brokeGuard()) return;
  const board = C.boardFor(S.pos).filter(c => !C.isTaken(c.id) && !C.isClosed(c.id));
  for (const c of board) {
    if (S.ct.active.length >= 1) break;
    if (c.kind === 'deliver' && capacityFree() < c.qty) continue;
    // 真人玩家会先看一眼「这单赶得上吗」：采购要先去产地再折回，路程是两段。
    const legs = c.kind === 'procure'
      ? (nearestSource(c.good) ? (routeUnits(S.pos, nearestSource(c.good)) ?? 0) + (routeUnits(nearestSource(c.good), c.to) ?? 0) : null)
      : (routeUnits(S.pos, c.to) ?? 0);
    if (legs == null) continue;
    if (c.kind !== 'bounty' && Math.ceil(legs / g.dayDistance()) + 3 > c.days) continue;
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
  // 真人玩家不会空着舱跑委托：先把补给买够，再拿剩下的舱位装顺路货
  const legDays = Math.max(1, Math.ceil((routeUnits(S.pos, target.to) ?? 0) / g.dayDistance()));
  topUpSupplies(legDays + 6);
  fillHoldTowards(target.to);
  const carried = Object.keys(g.S.cargo).filter(k => g.sellable(k) > 0);
  sail(target.to);
  for (const k of carried) if (g.sellable(k) > 0) g.sell(k, 'all');
}

/**
 * 顺路捎货：补给买完之后，剩下的舱位全部用来装能在目的地卖得更高的货。
 * 这里曾经先留出「日耗 ×25」的舱位再装货——船队一大，日耗 30/天，
 * 等于预留 750 格，于是后期整艘船空着跑委托，测出来的「跑委托赚不到份额」
 * 其实是测试脚本自己不做生意。
 */
function fillHoldTowards(destId) {
  const S = g.S, here = g.port(S.pos), dest = g.port(destId);
  if (!dest) return;
  const space = capacityFree();
  if (space < 8) return;
  let best = null;
  for (const gd of GOODS) {
    const q = Math.min(space, g.maxAffordable(here, gd.id, Math.max(0, S.gold * 0.9), space));
    if (q < 5) continue;
    const profit = g.quote(dest, gd.id, q, 'sell').total - g.quote(here, gd.id, q, 'buy').total;
    if (profit > 0 && (!best || profit > best.profit)) best = { gid: gd.id, q, profit };
  }
  if (best) g.buy(best.gid, best.q);
}

/** 抵港时把这里能接的任务都接下来（真人玩家会这么做） */
function takeQuestsHere() {
  for (const q of Q.availableAt(g.S.pos)) { Q.accept(q); mark(`接下任务「${q.title}」`); }
}
function stepQuest() {
  const S = g.S;
  repairAll(); hireAll(); armAll(); upgradeFleet(); investIfRich();
  takeQuestsHere(); Q.checkQuests();
  if (brokeGuard()) return;
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

/* ---------- 武力路线的回合 ---------- */
/**
 * 猎杀目标海域：默认按实测供给从高到低取 6 片（通关只要 6 片过半）。
 * 可以用 --zones=a,b,c 换一组（供给最高的六片分散在全球，通勤成本很高，
 * 用一组地理上挨着的海域能测出「通勤」到底占多少损耗）。
 */
const FORCE_ZONES = (arg('zones', '') ? arg('zones', '').split(',').filter(z => ZONES.some(x => x.id === z))
  : Object.keys(ZONE_HUNT_RATE).sort((a, b) => ZONE_HUNT_RATE[b] - ZONE_HUNT_RATE[a]).slice(0, 6));
const WAR_SHIPS = ['frigate', 'galleon'];          // 猎杀只看火力与耐久
const WANT_FLEET = 5;
function warReady() {
  const S = g.S;
  if (S.fleet.length < WANT_FLEET) return false;
  return S.fleet.every(sh => sh.cannons >= g.T(sh).cannons && sh.crew >= g.T(sh).crew * 0.9);
}
function buyWarShip() {
  const S = g.S, p = g.port(S.pos);
  const avail = YARD_SHIPS[p.yard] || [];
  const want = WAR_SHIPS.find(t => avail.includes(t) && S.gold > g.shipCost(t) + SHIP_TYPES[t].cannons * 150 + SHIP_TYPES[t].crew * 25 + 8000);
  if (!want || S.fleet.length >= 6) return false;
  g.buyShip(want); armAll(); hireAll();
  mark(`购入战斗舰「${SHIP_TYPES[want].name}」`, { fleet: S.fleet.length });
  return true;
}
/** 该去哪片海域猎杀：先补掉快到 50 的，再去还没动过的 */
function forceTargetZone() {
  const below = FORCE_ZONES.filter(z => g.S.share[z].player < 50);
  if (!below.length) return null;
  return below.sort((a, b) => (g.S.share[b].player - g.S.share[a].player) || (ZONE_HUNT_RATE[b] - ZONE_HUNT_RATE[a]))[0];
}
function stepForce() {
  const S = g.S;
  const hpBefore = S.fleet.reduce((a, sh) => a + sh.hp, 0);
  repairAll();
  FS.repairGold += Math.max(0, (S.fleet.reduce((a, sh) => a + sh.hp, 0) - hpBefore)) * 4;
  hireAll(); armAll();
  // 1) 先攒战斗船队；钱不够就去做生意
  if (!warReady()) {
    if (buyWarShip()) return;
    if (S.gold < 70000) { stepTrade(); return; }
  }
  // 2) 现金见底（付不起薪酬 / 修不起船）也退回去做生意
  if (S.gold < 12000) { stepTrade(); return; }
  const zid = forceTargetZone();
  if (!zid) { stepTrade(); return; }
  // 3) 不在目标海域就过去，顺路带一船货（真人不会空舱跑）
  if (g.port(S.pos).zone !== zid) {
    const gate = PORTS.filter(p => p.zone === zid)
      .sort((a, b) => (routeUnits(S.pos, a.id) ?? 1e9) - (routeUnits(S.pos, b.id) ?? 1e9))[0];
    if (!gate) { stepTrade(); return; }
    const legDays = Math.max(1, Math.ceil((routeUnits(S.pos, gate.id) ?? 0) / g.dayDistance()));
    topUpSupplies(legDays + 8);
    fillHoldTowards(gate.id);
    const carried = Object.keys(g.S.cargo).filter(k => g.sellable(k) > 0);
    if (!sail(gate.id)) { g.rest(3); return; }
    for (const k of carried) if (g.sellable(k) > 0) g.sell(k, 'all');
    return;
  }
  // 4) 就地巡航猎杀
  if (!huntLeg(zid)) { stepTrade(); return; }
  // 抵港后把顺路货卖掉
  for (const k of Object.keys(g.S.cargo)) if (g.sellable(k) > 0) g.sell(k, 'all');
}

const STEPS = { trade: stepTrade, contract: stepContract, quest: stepQuest, force: stepForce };
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
  drainStory();
  turns++;
  if (g.S.day === before) {
    if (++stuck === 20) {
      // 记下卡住时的现场，再继续跑——提前结束会掩盖后面的问题
      const act = Q.QUESTS.filter(q => Q.qStatus(q.id) === 'active').map(q => q.id + ':' + (q.objectives.find((_, i) => !Q.objDone(q, i)) || {}).kind);
      const rdy = Q.QUESTS.filter(q => Q.qStatus(q.id) === 'ready').map(q => q.id + '→' + q.turnIn);
      log.notes.push(`第 ${g.S.day} 天卡住：在 ${g.S.pos}，金 ${Math.round(g.S.gold)}，空舱 ${g.freeSpace()}｜进行中 ${act.join(',') || '无'}｜可交付 ${rdy.join(',') || '无'}｜委托 ${g.S.ct.active.length}`);
    }
    g.rest(3);
  } else stuck = 0;

  if (g.S.day - lastDay >= 90) {
    lastDay = g.S.day;
    log.daily.push({ day: g.S.day, year: +(g.S.day / 360).toFixed(1), gold: Math.round(g.S.gold), net: netWorth(), fleet: g.S.fleet.length,
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
  金币: Math.round(S.gold), 净资产: netWorth(), 船队: S.fleet.length, 船队估值: g.fleetValue(),
  主导海域: `${zoneLead()}/${ZONES.length}（需 ${6}）`,
  各海域份额: ZONES.map(z => `${z.name} ${Math.round(S.share[z.id].player)}`).join(' '),
  份额合计: Math.round(ZONES.reduce((a, z) => a + S.share[z.id].player, 0)),
  完成任务: `${Q.QUESTS.filter(q => Q.qStatus(q.id) === 'done').length}/${Q.QUESTS.length}`,
  完成委托: S.ct.done, 违约委托: S.ct.failed,
  海战: `${S.stats.battles} 场，胜 ${S.stats.wins}`,
  对手商会战: `${FS.rivalBattles} 场，胜 ${FS.rivalWins}（胜率 ${FS.rivalBattles ? Math.round(FS.rivalWins / FS.rivalBattles * 100) : 0}%）`,
  海盗战: `${FS.pirateBattles} 场，胜 ${FS.pirateWins}`,
  船队全灭次数: FS.wipes,
  猎杀航段: `${FS.huntLegs} 段 / ${FS.huntDays} 海上日`,
  在海天数: seaDays,
  战斗夺取份额: +FS.shareFromBattle.toFixed(1),
  各海域猎杀数: Object.entries(FS.zoneKills).map(([z, n]) => `${g.zone(z).name} ${n}`).join(' ') || '无',
  战利品金币: Math.round(FS.loot),
  卖货总收入: Math.round(S.stats.turnover || 0),
  海域主导月收益累计: Math.round(FS.domIncome),
  薪酬累计支出: Math.round(FS.wages),
  修船累计支出: Math.round(FS.repairGold),
  声望: ['whale', 'redsail', 'goldsand', 'pirate'].map(f => `${f} ${g.rep(f)}`).join(' '),
  交易次数: S.stats.trades,
  成交总额: Math.round(S.stats.turnover || 0),
  成交额折份额: Math.round((S.stats.turnover || 0) / g.SHARE_PER_GOLD),
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
