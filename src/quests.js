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
  if (!S.q.latched) S.q.latched = {};      // 已达成过的任务目标，锁存后不随状态倒退
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
/**
 * 锁存表：按**单个目标**记，不是整条任务。
 * 「持有 N 金币」「份额达到 N」「船队达到 N 艘」这类目标读的是实时状态，会随着你花钱买船、
 * 对手反推而倒退回去——于是玩家被告知「可交付」，赶到交付港，交付却悄无声息地什么都没发生。
 * 而如果只在「全部目标同时达成」时才锁存，「先攒够钱、再打决战」这种任务会彻底卡死：
 * 钱一花出去，决战的前置又不成立了，决战永远触发不了。所以逐个目标锁存。
 */
function latches(q) {
  ensureQuestState();
  const L = S.q.latched;
  let a = L[q.id];
  if (typeof a === 'number') a = L[q.id] = q.objectives.map(() => a);   // 旧存档：整条任务一起锁存
  if (!Array.isArray(a)) a = L[q.id] = q.objectives.map(() => 0);
  while (a.length < q.objectives.length) a.push(0);
  return a;
}
export function objDone(q, i) {
  const a = latches(q);
  if (a[i]) return true;
  if (objValue(q, i) < objTarget(q.objectives[i])) return false;
  a[i] = S.day + 1;                                        // +1：第 0 天达成时 0 是假值，会让锁存失效
  return true;
}
/** 展示用进度：锁存过的目标不再随实时状态回落，否则进度条会和 ☑ 自相矛盾 */
export const objShown = (q, i) => (objDone(q, i) ? Math.max(objValue(q, i), objTarget(q.objectives[i])) : objValue(q, i));
export const questObjectivesDone = q => { ensureQuestState(); return q.objectives.every((_, i) => objDone(q, i)); };
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
  // 决战触发：到达 boss 港口。
  // 这里**不能** return：决战只是这次靠港的其中一件事，后面的任务结算与接取照样得跑，
  // 否则决战港会变成一个「什么任务都接不到」的黑洞。
  if (type === 'arrive') {
    const fresh = S.q.bossAt !== d.pid;
    if (fresh) { S.q.bossHold = {}; S.q.bossAt = d.pid; }                  // 换了港口就重新问一次
    for (const q of activeQuests()) {
      if (qStatus(q.id) !== 'active') continue;
      const i = q.objectives.findIndex(o => o.kind === 'boss' && o.port === d.pid);
      if (i < 0 || objDone(q, i)) continue;
      if (!q.objectives.every((o, k) => k === i || objDone(q, k))) continue;
      // 打输之后隔一阵子才会再遇上。没有这个冷却，输一场就能立刻原地再输一场，
      // 而每输一场船队只剩一艘小帆船——玩家会被锁死在一个必输的循环里出不来。
      const tried = (S.q.bossTried || {})[q.id];
      if (tried != null && S.day - tried < BOSS_COOLDOWN) {
        if (fresh) log(`${port(d.pid).name}的风声说，对方船队退回去舔伤口了，再过些天才会露面。`);
        continue;
      }
      if ((S.q.bossHold || {})[q.id]) continue;                                    // 这趟停泊已经说过「再准备准备」
      triggerBoss(q, q.objectives[i]); break;
    }
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
const BOSS_COOLDOWN = 30;          // 打输之后的再战间隔（天）
function triggerBoss(q, o) {
  const kind = o.rival ? 'rival' : 'pirate';
  const pages = o.pre && o.pre.length ? o.pre : [{ who: kind === 'pirate' ? 'barro' : 'hector', text: '来得正好。今天就在这片海上分个高下！' }];
  // 给一次拒战的机会：直接开打的话，玩家一靠港就被拖进战斗，修不了船也补不了炮，
  // 输了再进港还是同一场必输的仗。
  enqueue(pages, {
    qid: 'boss:' + q.id, title: `决战 · ${q.title}`,
    accept: {
      label: '迎战', decline: '再准备准备',
      onAccept: () => startBoss(q, o, kind),
      onDecline: () => { (S.q.bossHold || (S.q.bossHold = {}))[q.id] = 1; log('你按下战意，先回港整备。再次入港时对方仍在等你。'); },
    },
  });
}
function startBoss(q, o, kind) {
  (S.q.bossTried || (S.q.bossTried = {}))[q.id] = S.day;
  const enemy = makeEnemy(kind === 'rival' ? 'rival' : 'pirate');
  // 决战强度必须贴着「势均力敌」调：海战伤害近似平方律，双方差两成就几乎一边倒。
  // 原来的写法是同级商会船队 ×1.35 再**白送一条旗舰**，实测满编六船只有 4% 赢面——
  // 那不是硬仗，是一堵墙，而墙后面卡着整条主线。
  // 现在旗舰顶替一条护卫，护卫整体略减，实测满编六船约 9 成、四船约 3 成、三船约 1 成。
  const boost = 0.95;
  for (const e of enemy) { e.hp = Math.round(e.hp * boost); e.maxHp = e.hp; e.cannons = Math.min(SHIP_TYPES[e.type].cannons, Math.round(e.cannons * boost) + 1); e.crew = Math.min(SHIP_TYPES[e.type].crew, Math.round(e.crew * boost)); }
  const flagT = S.fleet.length >= 3 ? 'frigate' : 'galleon'; const ft = SHIP_TYPES[flagT];
  const myHp = S.fleet.reduce((a, x) => a + x.hp, 0), myC = S.fleet.reduce((a, x) => a + x.cannons, 0);
  // 下限跟着玩家走。写死 120 耐久 / 6 门炮的话，船队被打残之后决战就是一道不可能的坎，
  // 而决战又卡着主线，玩家只能重开。
  const hpLo = clamp(Math.round(myHp * 0.5), 40, 120), cLo = clamp(Math.round(myC * 0.5), 2, 6);
  if (enemy.length > 1) enemy.pop();                 // 旗舰顶替一条护卫，而不是凭空多一条
  enemy.unshift({ type: flagT, name: o.bossName || (kind === 'pirate' ? '黑潮号' : '旗舰'), hp: clamp(Math.round(myHp * 0.6), hpLo, ft.hp), maxHp: 0, cannons: clamp(Math.round(myC * 0.35) + 3, cLo, ft.cannons), crew: clamp(Math.round(ft.crew * 0.8), 30, ft.crew) });
  enemy[0].maxHp = enemy[0].hp;
  startBattle(kind, o.rival || null, enemy, port(o.port).zone, () => {});
  B.boss = q.id; hooks.renderBattle();
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
