/* 任务引擎：前置 / 接取 / 目标追踪 / 交付 / 奖励 / 剧情对话队列。内容数据在 story.js */
import { S, B, hooks, port, zone, log, transferShare, mkShip, nextShipName, checkWin, captain, makeEnemy, startBattle, T , sellable } from './game.js';
import { STORY } from './story.js';
import { CHARS, SHIP_TYPES, G, PORTS } from './data.js';
import { fmt, clamp, rand } from './util.js';

export const QUESTS = [...STORY.main, ...STORY.side];
const byId = Object.fromEntries(QUESTS.map(q => [q.id, q]));
export const questById = id => byId[id];
export const MAIN = STORY.main;

/* 新增 NPC 并入角色表 */
for (const c of STORY.newChars || []) if (!CHARS[c.key]) CHARS[c.key] = { name: c.name, title: c.title, ...c.portrait };

/* ---------- 状态 ---------- */
export function ensureQuestState() {
  if (!S.q) S.q = { status: {}, progress: {}, declined: {}, prologueDone: false, offeredOnce: {} };
}
export const qStatus = id => (S.q && S.q.status[id]) || 'locked';
export function prereqMet(q) {
  const p = q.prereq || {};
  if ((p.quests || []).some(id => qStatus(id) !== 'done')) return false;
  if (p.day && S.day < p.day) return false;
  if (p.share && (S.share[p.share.zone]?.player || 0) < p.share.pct) return false;
  return true;
}
export const activeQuests = () => QUESTS.filter(q => ['active', 'ready'].includes(qStatus(q.id)));
export const doneCount = () => QUESTS.filter(q => qStatus(q.id) === 'done').length;
/** 当前可在某港接取的任务（主线优先） */
export function availableAt(pid) {
  return QUESTS.filter(q => qStatus(q.id) === 'locked' && prereqMet(q) && !S.q.declined[q.id] && (q.port === pid || (q.port == null && q.type === 'main')))
    .sort((a, b) => (a.type === 'main' ? 0 : 1) - (b.type === 'main' ? 0 : 1));
}
/** 尚未达到接取条件的主线（用于任务页提示） */
export function nextMain() { return MAIN.find(q => qStatus(q.id) !== 'done'); }

/* ---------- 目标 ---------- */
export function objTarget(o) { return o.qty ?? o.count ?? o.pct ?? o.amount ?? 1; }
export function objValue(q, i) {
  const o = q.objectives[i]; const pr = (S.q.progress[q.id] || [])[i] || 0;
  switch (o.kind) {
    case 'share': return Math.floor(S.share[o.zone]?.player || 0);
    case 'dominate': return Object.values(S.share).filter(s => s.player >= 50).length;
    case 'gold': return Math.max(0, Math.floor(S.gold));
    case 'fleet': return o.type ? (S.fleet.some(s => s.type === o.type) ? 1 : 0) : S.fleet.length;
    case 'explore': return Object.keys(S.mem).length;
    default: return pr;
  }
}
export const objDone = (q, i) => objValue(q, i) >= objTarget(q.objectives[i]);
export const questObjectivesDone = q => q.objectives.every((_, i) => objDone(q, i));
function bump(q, i, v, set = false) {
  const arr = S.q.progress[q.id] || (S.q.progress[q.id] = q.objectives.map(() => 0));
  arr[i] = set ? Math.max(arr[i], v) : arr[i] + v;
  arr[i] = Math.min(arr[i], objTarget(q.objectives[i]));
}

/* ---------- 对话队列 ---------- */
const queue = [];
export function enqueue(pages, opts = {}) { if (opts.qid && queue.some(d => d.opts.qid === opts.qid)) return; queue.push({ pages, opts }); }
export function flushDialogues() {
  if (!S || !queue.length || B || document.querySelector('.modal-bg')) return false;
  const d = queue.shift();
  hooks.showDialogue(d.pages, { ...d.opts, onEnd: () => { if (d.opts.onEnd) d.opts.onEnd(); hooks.render(); } });
  return true;
}
export const fillText = t => t.replace(/\{captain\}/g, captain().name);

/* ---------- 接取 ---------- */
function offer(q) {
  if (S.q.offeredOnce[q.id] === S.day && q.type === 'side') return;
  S.q.offeredOnce[q.id] = S.day;
  enqueue(q.intro, {
    qid: 'offer:' + q.id, title: `${q.type === 'main' ? '主线' : '支线'} · ${q.title}`,
    accept: { label: q.type === 'main' ? '接下这件事' : '接受委托', decline: q.type === 'side' ? '暂时婉拒' : null,
      onAccept: () => accept(q), onDecline: () => { S.q.declined[q.id] = true; log(`婉拒了「${q.title}」。下次到访时可再接取。`); } },
  });
}
export function accept(q) {
  S.q.status[q.id] = 'active'; S.q.progress[q.id] = q.objectives.map(() => 0);
  log(`接受任务「${q.title}」：${q.objectives.map(o => o.label).join('；')}`, 'gold');
  hooks.toast(`新任务：${q.title}`);
  // 接取时立刻评估一次（如已在目标港口 / 已持有货物）
  questEvent('arrive', { pid: S.pos, silentOffer: true });
}

/* ---------- 事件 ---------- */
export function questEvent(type, d = {}) {
  if (!S) return; ensureQuestState();
  for (const q of activeQuests()) {
    if (qStatus(q.id) !== 'active') continue;
    q.objectives.forEach((o, i) => {
      if (objDone(q, i)) return;
      switch (type) {
        case 'arrive':
          if (o.kind === 'visit' && o.port === d.pid) bump(q, i, 1, true);
          if (o.kind === 'visitZone' && port(d.pid).zone === o.zone) bump(q, i, 1, true);
          // 只能动「可支配」的货：运货委托托运的那部分不属于玩家，吃掉它会让那张委托必然违约
          if (o.kind === 'deliver' && o.port === d.pid && sellable(o.good) >= o.qty) { S.cargo[o.good] -= o.qty; if (S.cargo[o.good] <= 0) delete S.cargo[o.good]; bump(q, i, o.qty, true); log(`交付 ${G[o.good].name} ×${o.qty}。`, 'good'); }
          break;
        case 'sell':
          if (o.kind === 'sell' && o.good === d.gid && (!o.port || o.port === d.pid) && (!o.zone || port(d.pid).zone === o.zone)) bump(q, i, d.qty);
          break;
        case 'buy': if (o.kind === 'buy' && o.good === d.gid) bump(q, i, d.qty); break;
        case 'battleWin':
          if (o.kind === 'defeat' && !d.boss && matchDefeat(o, d)) bump(q, i, 1);
          if (o.kind === 'boss' && d.boss === q.id) bump(q, i, 1, true);
          break;
        case 'invest': if (o.kind === 'invest' && (!o.port || o.port === d.pid)) bump(q, i, d.amt); break;
      }
    });
  }
  // 决战触发：到达 boss 港口
  if (type === 'arrive') for (const q of activeQuests()) {
    if (qStatus(q.id) !== 'active') continue;
    const i = q.objectives.findIndex(o => o.kind === 'boss' && o.port === d.pid);
    if (i >= 0 && !objDone(q, i) && q.objectives.every((o, k) => k === i || objDone(q, k))) { triggerBoss(q, q.objectives[i]); return; }
  }
  checkQuests(type === 'arrive' ? d.pid : null);
  if (type === 'arrive' && !d.silentOffer) {
    if (S.q.lastPort !== d.pid) { for (const q of QUESTS) if (S.q.declined[q.id] && q.port === d.pid) delete S.q.declined[q.id]; S.q.lastPort = d.pid; }
    for (const q of availableAt(d.pid)) offer(q);
  }
}
function matchDefeat(o, d) {
  const want = o.rival ? 'rival' : (o.type || o.enemy || 'pirate');
  if (want === 'any') return true;
  if (want !== d.kind) return false;
  return !o.rival || o.rival === d.rivalId;
}

/** 评估完成：全部目标达成 → 交付或直接结算 */
export function checkQuests(pid = null) {
  if (!S || !S.q) return;
  for (const q of activeQuests()) {
    const st = qStatus(q.id);
    if (!questObjectivesDone(q)) continue;
    const here = pid ?? (S.dest ? null : S.pos);
    if (q.turnIn && here !== q.turnIn) {
      if (st !== 'ready') { S.q.status[q.id] = 'ready'; log(`「${q.title}」目标已完成，前往 ${port(q.turnIn).name} 交付。`, 'gold'); hooks.toast(`「${q.title}」可交付：${port(q.turnIn).name}`); }
      continue;
    }
    complete(q);
  }
}
function complete(q) {
  S.q.status[q.id] = 'done';
  const r = q.reward || {}; const lines = [];
  if (r.gold) { S.gold += r.gold; lines.push(`金币 +${fmt(r.gold)}`); }
  if (r.shareZone && r.sharePts) { transferShare(r.shareZone, 'player', r.sharePts); lines.push(`${zone(r.shareZone).name}份额 +${r.sharePts}`); }
  if (r.ship && SHIP_TYPES[r.ship]) {
    if (S.fleet.length < 6) { const t = SHIP_TYPES[r.ship]; S.fleet.push(mkShip(r.ship, nextShipName(), { cannons: Math.round(t.cannons * 0.5), crew: Math.round(t.crew * 0.6) })); lines.push(`获得 ${t.name}「${S.fleet.at(-1).name}」`); }
    else { S.gold += Math.round(SHIP_TYPES[r.ship].price * 0.6); lines.push(`船队已满，折价 ${fmt(SHIP_TYPES[r.ship].price * 0.6)} 金币`); }
  }
  if (r.cannons) { let left = r.cannons; for (const sh of S.fleet) { const add = Math.min(left, T(sh).cannons - sh.cannons); sh.cannons += add; left -= add; if (!left) break; } lines.push(`火炮 +${r.cannons - left}`); }
  if (r.crew) { let left = r.crew; for (const sh of S.fleet) { const add = Math.min(left, T(sh).crew - sh.crew); sh.crew += add; left -= add; if (!left) break; } lines.push(`船员 +${r.crew - left}`); }
  log(`完成任务「${q.title}」。${lines.join('，')}`, 'gold');
  const pages = [...q.outro, { who: q.giver, text: `【任务完成】${q.title}　${lines.join('　')}`, reward: true }];
  enqueue(pages, { qid: 'done:' + q.id, title: `${q.type === 'main' ? '主线' : '支线'}完成 · ${q.title}` });
  checkWin();
  // 主线推进：下一章若无接取港口限制，立刻在当前港口提供
  if (!S.dest) for (const nq of availableAt(S.pos)) offer(nq);
}

/* ---------- 决战 ---------- */
function triggerBoss(q, o) {
  const kind = o.rival ? 'rival' : 'pirate';
  const enemy = makeEnemy(kind === 'rival' ? 'rival' : 'pirate');
  // 强化：旗舰 + 加成
  const boost = 1.35;
  for (const e of enemy) { e.hp = Math.round(e.hp * boost); e.maxHp = e.hp; e.cannons = Math.min(SHIP_TYPES[e.type].cannons, Math.round(e.cannons * boost) + 2); e.crew = Math.min(SHIP_TYPES[e.type].crew, Math.round(e.crew * boost)); }
  const flagT = S.fleet.length >= 3 ? 'frigate' : 'galleon'; const ft = SHIP_TYPES[flagT];
  const myHp = S.fleet.reduce((a, x) => a + x.hp, 0), myC = S.fleet.reduce((a, x) => a + x.cannons, 0);
  enemy.unshift({ type: flagT, name: o.bossName || (kind === 'pirate' ? '黑潮号' : '旗舰'), hp: clamp(Math.round(myHp * 0.6), 120, ft.hp), maxHp: 0, cannons: clamp(Math.round(myC * 0.55) + 4, 6, ft.cannons), crew: clamp(Math.round(ft.crew * 0.8), 30, ft.crew) });
  enemy[0].maxHp = enemy[0].hp;
  const pages = o.pre && o.pre.length ? o.pre : [{ who: kind === 'pirate' ? 'barro' : 'hector', text: '来得正好。今天就在这片海上分个高下！' }];
  enqueue(pages, { title: `决战 · ${q.title}`, onEnd: () => { startBattle(kind, o.rival || null, enemy, port(o.port).zone, () => {}); B.boss = q.id; hooks.renderBattle(); } });
}

/* ---------- 供地图 / 港口场景使用 ---------- */
/** 港口是否为任务目标（★ 标记） */
export function questPorts() {
  const set = new Set();
  for (const q of activeQuests()) {
    if (qStatus(q.id) === 'ready' && q.turnIn) set.add(q.turnIn);
    else q.objectives.forEach((o, i) => { if (!objDone(q, i) && o.port) set.add(o.port); });
  }
  for (const q of QUESTS) if (qStatus(q.id) === 'locked' && prereqMet(q) && q.port && !S.q?.declined?.[q.id]) set.add(q.port);
  return set;
}
const GIVER_BUILDING = { qian: 'market', hong: 'tavern', mu: 'yard', cen: 'office', alice: 'office', hector: 'office', salim: 'office', ahai: 'ship' };
export function portMarkers(pid) {
  const m = {};
  for (const q of availableAt(pid)) m[GIVER_BUILDING[q.giver] || 'office'] = '!';
  for (const q of activeQuests()) if (qStatus(q.id) === 'ready' && q.turnIn === pid) m[GIVER_BUILDING[q.giver] || 'office'] = '?';
  return m;
}
export function buildingFor(charKey) { return GIVER_BUILDING[charKey] || 'office'; }

/* ---------- 序章 ---------- */
export function maybePrologue() {
  ensureQuestState();
  if (S.q.prologueDone) return false;
  S.q.prologueDone = true;
  enqueue(STORY.prologue, { title: `序章 · ${STORY.title}`, onEnd: () => { questEvent('arrive', { pid: S.pos }); } });
  return true;
}
