/* 游戏状态与规则逻辑（与表现层解耦；表现层通过 hooks 注入） */
import { GOODS, G, SHIP_TYPES, ZONES, RIVALS, FACTION_NAME, PORTS, SHIP_NAMES, CHARS, LINES } from './data.js';
import { rand, randInt, pick, clamp, fmt, hash } from './util.js';
import { projX, projY, greatCircleKm } from './geo.js';
import { START_PORT, VICTORY_ZONES } from './data.js';

export let S = null;   // 存档状态
export let B = null;   // 战斗状态
export const SAVE_KEY = 'aot-save-v3';
export const OLD_SAVE_KEYS = ['aot-save-v2', 'aot-save'];
export const hooks = {
  render() {}, renderTop() {}, showModal() {}, closeModal() {}, toast() {},
  renderBattle() {}, onArrive() {}, rollEvent() {}, openPortTab() {}, openSeaMap() {},
  onEvent() {}, showDialogue() {}, questPorts() { return new Set(); }, portMarkers() { return {}; },
  hoverPort() {}, npcDay() {},
  /** 由表现层注入：某港口的真实绕行航程长度（逻辑单位）。默认直线兜底。 */
  routeLen(pid) { const b = port(pid); return Math.hypot(S.ship.x - projX(b.lon), S.ship.y - projY(b.lat)); },
};

export const port = id => PORTS.find(p => p.id === id);
export const zone = id => ZONES.find(z => z.id === id);
export const rival = id => RIVALS.find(r => r.id === id);
export const T = sh => SHIP_TYPES[sh.type];
export const totalCrew = () => S.fleet.reduce((a, s) => a + s.crew, 0);
export const capacity = () => S.fleet.reduce((a, s) => a + T(s).cargo, 0);
export const cargoUsed = () => Object.values(S.cargo).reduce((a, b) => a + b, 0) + S.supplies;
export const freeSpace = () => Math.max(0, capacity() - cargoUsed());
export const fleetValue = () => S.fleet.reduce((a, s) => a + T(s).price, 0);
export const dateStr = (d = S.day) => `第${Math.floor(d / 360) + 1}年 ${Math.floor(d % 360 / 30) + 1}月 ${d % 30 + 1}日`;
export const atSea = () => !!(S && S.dest);
export const captain = () => CHARS[S.captain || 'lin'];
export function log(msg, cls = '') { S.log.unshift({ d: S.day, msg, cls }); if (S.log.length > 150) S.log.length = 150; }

export function mkShip(type, name, opts = {}) { const t = SHIP_TYPES[type]; return { type, name, hp: t.hp, cannons: opts.cannons ?? 0, crew: opts.crew ?? 0 }; }
export function nextShipName() {
  const used = new Set(S.fleet.map(s => s.name));
  const free = SHIP_NAMES.filter(n => !used.has(n + '号'));
  return (free.length ? pick(free) : '无名') + '号';
}

export function newGame() {
  S = {
    gold: 3000, day: 0, pos: START_PORT, ship: { x: projX(port(START_PORT).lon), y: projY(port(START_PORT).lat) }, dest: null, voyage: null, dayAcc: 0.3, weather: { type: 'clear', days: 0 },
    fleet: [], cargo: {}, supplies: 30, drift: {}, stock: {}, share: {}, dev: {}, mem: {}, log: [],
    captain: null, tab: 'port', ptab: 'market', won: false, stats: { trades: 0, battles: 0, wins: 0 },
  };
  S.fleet.push(mkShip('sloop', '初雪号', { cannons: 4, crew: 15 }));
  S.rep = { whale: 0, redsail: 0, goldsand: 0, pirate: 0, free: 10 };
  for (const p of PORTS) {
    S.drift[p.id] = {}; S.stock[p.id] = {}; S.dev[p.id] = 0;
    for (const g of GOODS) { S.drift[p.id][g.id] = rand(0.85, 1.15); S.stock[p.id][g.id] = 0; }
  }
  // 势力份额：按各海域的大本营归属生成
  S.share = {};
  const startZone = port(START_PORT).zone;
  for (const z of ZONES) {
    const home = RIVALS.find(r => r.home === z.id);
    const sh = { player: z.id === startZone ? 12 : 0, whale: 0, redsail: 0, goldsand: 0 };
    let rest = 100 - sh.player;
    if (home) { sh[home.id] = Math.round(rest * 0.62); rest -= sh[home.id]; }
    const others = RIVALS.filter(r => !home || r.id !== home.id);
    others.forEach((r, i) => { const v = i === others.length - 1 ? rest : Math.round(rest / others.length); sh[r.id] += v; rest -= v; });
    S.share[z.id] = sh;
  }
  migrate();
  remember(START_PORT);
  log('你在白帆港继承了一艘小帆船和 3,000 金币。目标：在六大海域都取得过半的势力份额，称霸沧海。', 'gold');
}

/* ========= 价格 ========= */
function baseMult(p, gid) {
  if (p.produce.includes(gid)) return 0.55;
  if (p.demand.includes(gid)) return 1.7;
  return 0.9 + (hash(p.id + gid) % 26) / 100;
}
export function price(p, gid) {
  const m = baseMult(p, gid) * S.drift[p.id][gid] * (1 + S.stock[p.id][gid] / 100);
  return Math.max(1, Math.round(G[gid].base * m));
}
export const dominated = zid => S.share[zid].player >= 50;
export function buyPrice(p, gid) {
  const mult = Math.max(0.82, (dominated(p.zone) ? 0.92 : 1) * (S.captain === 'lin' ? 0.95 : 1) * repBuyMod(p));
  return Math.max(1, Math.round(price(p, gid) * mult));
}
export function sellPrice(p, gid) { return Math.max(1, Math.round(price(p, gid) * 0.9 * repSellMod(p))); }
export const SUPPLY_PRICE = 3;
export function remember(pid) { const p = port(pid); const prices = {}; for (const g of GOODS) prices[g.id] = price(p, g.id); S.mem[pid] = { day: S.day, prices }; }

/* ========= 势力份额 ========= */
export function transferShare(zid, to, pts) {
  const sh = S.share[zid]; const others = Object.keys(sh).filter(k => k !== to);
  const tot = others.reduce((a, k) => a + sh[k], 0); if (tot <= 0) return;
  pts = Math.min(pts, tot);
  for (const k of others) { const take = pts * sh[k] / tot; sh[k] = Math.max(0, sh[k] - take); }
  sh[to] += pts; normalizeShare(zid);
}
export function transferFrom(zid, from, to, pts) { const sh = S.share[zid]; pts = Math.min(pts, sh[from]); sh[from] -= pts; sh[to] += pts; normalizeShare(zid); }
function normalizeShare(zid) { const sh = S.share[zid]; const tot = Object.values(sh).reduce((a, b) => a + b, 0); for (const k in sh) sh[k] = Math.round(sh[k] / tot * 1000) / 10; }
export function zoneLeader(zid) { const sh = S.share[zid]; let best = null; for (const k in sh) if (!best || sh[k] > sh[best]) best = k; return best; }
export function checkWin() {
  if (S.won) return;
  if (ZONES.filter(z => S.share[z.id].player >= 50).length >= VICTORY_ZONES) {
    S.won = true; log(`${VICTORY_ZONES} 片海域尽归你的旗下，你成为了沧海之主！`, 'gold');
    hooks.showModal(`<h2>称霸沧海</h2><p>${dateStr()}，你的商会已在 ${VICTORY_ZONES} 片海域取得过半份额。从里斯本到长崎，每一座港口的年鉴上都写着你的名字。</p>
      <p class="muted">航行 ${Math.floor(S.day / 360)} 年 ${Math.floor(S.day % 360 / 30)} 个月 · 交易 ${S.stats.trades} 次 · 海战 ${S.stats.battles} 场（胜 ${S.stats.wins}）</p>
      <p>游戏可以继续，尽情经营你的海上帝国。</p><div class="row"><button class="btn primary" data-a="closeModal">继续航行</button></div>`);
  }
}

/* ========= 时间 ========= */
export function passDays(n, inPort = false) {
  let starved = false;
  for (let i = 0; i < n; i++) {
    S.day++;
    if (!inPort) {
      const use = dailySupply();
      if (S.supplies >= use) S.supplies -= use;
      else { S.supplies = 0; starved = true; for (const sh of S.fleet) sh.crew = Math.max(1, sh.crew - Math.ceil(sh.crew * 0.05)); }
    }
    hooks.npcDay(1);
    if (S.day % 30 === 0) monthTick();
  }
  if (starved) log('补给耗尽，船员因饥渴不断减员！', 'bad');
}
export function monthTick() {
  const wages = totalCrew() * 4; S.gold -= wages;
  let income = 0;
  for (const z of ZONES) if (dominated(z.id)) income += Math.round(S.share[z.id].player * 40);
  S.gold += income;
  for (const r of RIVALS) { const zid = Math.random() < 0.45 ? r.home : pick(ZONES).id; transferShare(zid, r.id, rand(0.8, 2.6)); }
  for (const p of PORTS) for (const g of GOODS) { S.drift[p.id][g.id] = clamp(S.drift[p.id][g.id] * rand(0.92, 1.08), 0.75, 1.3); S.stock[p.id][g.id] *= 0.65; }
  ensureRep();
  for (const k of REP_KEYS) { const v = S.rep[k] || 0; S.rep[k] = Math.abs(v) < 1 ? 0 : Math.round(v - Math.sign(v) * Math.max(0.5, Math.abs(v) * 0.03)); }
  log(`月结：支付船员薪酬 ${fmt(wages)}${income ? `，海域主导收益 +${fmt(income)}` : ''}。`, income ? 'good' : '');
  if (S.gold < -5000) { for (const sh of S.fleet) sh.crew = Math.max(1, Math.floor(sh.crew * 0.8)); log('商会严重负债，大量船员弃船而去！', 'bad'); }
}

/* ========= 声望 ========= */
const REP_KEYS = ['whale', 'redsail', 'goldsand', 'pirate', 'free'];
export function ensureRep() { if (!S.rep) S.rep = { whale: 0, redsail: 0, goldsand: 0, pirate: 0, free: 10 }; return S.rep; }
export function rep(f) { ensureRep(); return S.rep[f] ?? 0; }
export function addRep(f, v) { ensureRep(); if (!(f in S.rep)) return; S.rep[f] = clamp(Math.round(S.rep[f] + v), -100, 100); }
export function repLabel(v) { return v >= 60 ? '盟友' : v >= 25 ? '友好' : v >= -10 ? '中立' : v >= -45 ? '冷淡' : v >= -75 ? '敌视' : '死敌'; }
/** 声望对进货价的影响（±6%） */
export function repBuyMod(p) { const f = zoneLeader(p.zone); if (f === 'player' || !S.rep || !(f in S.rep)) return 1; return 1 - clamp(S.rep[f], -60, 60) / 1000; }
/** 声望对卖出价的影响（±5%） */
export function repSellMod(p) { const f = zoneLeader(p.zone); if (f === 'player' || !S.rep || !(f in S.rep)) return 1; return 1 + clamp(S.rep[f], -60, 60) / 1200; }

/* ========= 天气 ========= */
export const WEATHER_ICON = { clear: '☀', rain: '🌧', storm: '⛈' };
/** 每个航行日结算一次天气 */
export function weatherTick() {
  const w = S.weather || (S.weather = { type: 'clear', days: 0 });
  if (w.type !== 'clear') { w.days--; if (w.days <= 0) { w.type = 'clear'; w.days = 0; log('天色放晴，海面恢复平静。'); } return; }
  const r = Math.random();
  if (r < 0.10) { w.type = 'rain'; w.days = randInt(2, 3); log('天空阴沉下来，下起了雨。'); }
  else if (r < 0.14) { w.type = 'storm'; w.days = randInt(1, 2); log('乌云压顶，风暴来了！船队被迫减速。', 'bad'); }
}
export function setWeather(type, days) { S.weather = { type, days }; }
export const weatherSpeed = () => S.weather?.type === 'storm' ? 0.72 : S.weather?.type === 'rain' ? 0.9 : 1;

/* ========= 航行参数 ========= */
export function fleetSpeed() {
  let s = Math.min(...S.fleet.map(sh => T(sh).speed));
  if (S.captain === 'shen') s += 1;
  if (S.fleet.some(sh => sh.crew < T(sh).crew * 0.3)) s -= 1;
  return Math.max(2, s);
}
export const dailySupply = () => Math.max(1, Math.ceil(totalCrew() / 20));
/** 1 天航程对应的逻辑距离 */
/** 1 天航程对应的逻辑距离（真实世界比例下，横渡大西洋约 20 天） */
export const dayDistance = () => fleetSpeed() * 8;
/** 全局唯一的航程天数来源：用实际绕行航线长度，而不是直线 */
export function voyageDays(pid) { return Math.max(1, Math.ceil(hooks.routeLen(pid) / dayDistance())); }
export function voyageLeft() { const v = S.voyage; return v ? Math.max(1, Math.ceil((v.total - v.traveled) / dayDistance())) : 0; }
export function portKm(pid) { const b = port(pid); return greatCircleKm(b.lon, b.lat, port(S.pos).lon, port(S.pos).lat); }
export function crewShortage() { return S.fleet.filter(sh => sh.crew < Math.ceil(T(sh).crew * 0.2)); }

export function loseCargoFor(sh) {
  const ratio = T(sh).cargo / (capacity() + T(sh).cargo);
  for (const k in S.cargo) { S.cargo[k] = Math.floor(S.cargo[k] * (1 - ratio)); if (S.cargo[k] <= 0) delete S.cargo[k]; }
  S.supplies = Math.floor(S.supplies * (1 - ratio)); fitCargo();
}
export function fitCargo() {
  let over = cargoUsed() - capacity();
  while (over > 0) {
    const keys = Object.keys(S.cargo);
    if (!keys.length) { S.supplies = Math.max(0, S.supplies - over); break; }
    const k = keys.sort((a, b) => G[a].base - G[b].base)[0]; const d = Math.min(over, S.cargo[k]);
    S.cargo[k] -= d; over -= d; if (S.cargo[k] <= 0) delete S.cargo[k];
  }
}

/* ========= 海战 ========= */
export function describeFleet(f) {
  const m = {}; for (const s of f) m[SHIP_TYPES[s.type].name] = (m[SHIP_TYPES[s.type].name] || 0) + 1;
  return `${f.length} 艘（${Object.entries(m).map(([k, v]) => `${k}×${v}`).join('，')}）`;
}
export function makeEnemy(kind) {
  const fv = fleetValue(); const myCannons = S.fleet.reduce((a, x) => a + x.cannons, 0); const myCrew = totalCrew(); const myHp = S.fleet.reduce((a, x) => a + x.hp, 0);
  let pool, n, names, cannonBudget, crewBudget, hpBudget;
  if (kind === 'pirate') {
    pool = fv < 8000 ? ['sloop'] : fv < 20000 ? ['sloop', 'schooner'] : fv < 50000 ? ['schooner', 'merchant'] : ['schooner', 'merchant', 'galleon', 'frigate'];
    n = fv < 8000 ? 1 : clamp(randInt(1, S.fleet.length + 1), 1, 4); names = ['黑旗号', '骷髅号', '怒涛号', '血月号', '秃鹫号', '毒鳐号'];
    cannonBudget = Math.max(3, Math.round(myCannons * rand(0.6, 1.1))); crewBudget = Math.max(8, Math.round(myCrew * rand(0.7, 1.1))); hpBudget = Math.max(60, Math.round(myHp * rand(0.6, 1.0)));
  } else {
    pool = fv < 12000 ? ['schooner', 'merchant'] : fv < 45000 ? ['schooner', 'merchant', 'galleon'] : ['merchant', 'galleon', 'frigate'];
    n = clamp(randInt(2, S.fleet.length + 2), 2, 5); names = ['旗舰', '护航舰', '武装商船', '运输船', '巡逻舰'];
    cannonBudget = Math.max(8, Math.round(myCannons * rand(0.8, 1.15)) + 4); crewBudget = Math.max(30, Math.round(myCrew * rand(0.9, 1.2)) + 8); hpBudget = Math.max(200, Math.round(myHp * rand(0.9, 1.25)));
  }
  return Array.from({ length: n }, (_, i) => {
    const t = pick(pool), tt = SHIP_TYPES[t]; const hp = clamp(Math.round(hpBudget / n * rand(0.8, 1.2)), 40, tt.hp);
    return { type: t, name: names[i % names.length], hp, maxHp: hp, cannons: clamp(Math.round(cannonBudget / n * rand(0.75, 1.25)), 2, tt.cannons), crew: clamp(Math.round(crewBudget / n * rand(0.75, 1.2)), 5, tt.crew) };
  });
}
export function startBattle(kind, rivalId, enemy, zoneId, onDone) {
  B = { kind, rivalId, enemy, zone: zoneId, log: [], onDone, round: 1, over: false, result: null };
  S.stats.battles++;
  blog(kind === 'pirate' ? '海盗船队逼近，战斗开始！' : `与 ${rival(rivalId).name} 的船队交火！`);
  hooks.renderBattle();
}
export function clearBattle() { const cb = B && B.onDone; B = null; return cb; }
export function blog(msg, cls = '') { B.log.push({ msg, cls }); }
export const alive = f => f.filter(s => s.hp > 0);
export function enemySpeed() { return Math.min(...B.enemy.map(s => SHIP_TYPES[s.type].speed)); }
export function fleeChance() { return clamp(0.35 + (fleetSpeed() - enemySpeed()) * 0.12, 0.15, 0.9); }
/** 单目标炮击：距离 1/2/3 格伤害 100%/85%/70% */
export function fireAt(a, t, mine, dist = 1) {
  const fall = dist <= 1 ? 1 : dist === 2 ? 0.85 : 0.7;
  const dmg = Math.max(1, Math.round(a.cannons * rand(2.5, 5) * fall * (mine && S.captain === 'tie' ? 1.2 : 1)));
  t.hp -= dmg; let sunk = false;
  if (t.hp <= 0) { t.hp = 0; sunk = true; }
  blog(`${a.name} 炮击 ${t.name}，造成 ${dmg} 点损伤${sunk ? '，将其击沉！' : '。'}`, sunk ? (mine ? 'good' : 'bad') : '');
  return { dmg, sunk };
}
/** 单目标接舷：削减对方船员，归零即俘获 */
export function boardAt(a, t, mine, mult = 1) {
  const loss = Math.max(1, Math.round(a.crew * rand(0.2, 0.5) * mult));
  t.crew -= loss; a.crew = Math.max(1, a.crew - Math.max(1, Math.round(loss * 0.3)));
  let captured = false;
  if (t.crew <= 0) { t.crew = 0; t.hp = 0; t.captured = true; captured = true; blog(mine ? `${t.name} 船员全灭，被我方俘获！` : `${t.name} 被敌方登船夺取！`, mine ? 'good' : 'bad'); }
  else blog(`${a.name} 强行接舷 ${t.name}，对方船员 −${loss}。`);
  return { loss, captured };
}
export function endBattle(result) {
  B.over = true; B.result = result;
  const sunk = S.fleet.filter(s => s.hp <= 0);
  for (const s of sunk) { S.fleet.splice(S.fleet.indexOf(s), 1); if (S.fleet.length) loseCargoFor(s); }
  if (result === 'win') {
    S.stats.wins++;
    let loot = Math.round(B.enemy.reduce((a, s) => a + SHIP_TYPES[s.type].price, 0) * 0.12 * rand(0.8, 1.3));
    const cap = B.enemy.filter(s => s.captured);
    loot += cap.reduce((a, s) => a + Math.round(SHIP_TYPES[s.type].price * 0.3), 0);
    S.gold += loot;
    blog(`战斗胜利！缴获战利品与赃款 ${fmt(loot)} 金币${cap.length ? `（含 ${cap.length} 艘俘获船只的变卖所得）` : ''}。`, 'good');
    log(`击败${B.kind === 'pirate' ? '海盗' : rival(B.rivalId).name}船队，获得 ${fmt(loot)} 金币。`, 'good');
    if (B.kind === 'rival') { transferFrom(B.zone, B.rivalId, 'player', 6); blog(`${rival(B.rivalId).name} 在 ${zone(B.zone).name} 的份额被你夺走 6 点。`, 'good'); checkWin(); }
  } else if (result === 'lose') {
    S.cargo = {}; S.supplies = 20; S.gold = Math.max(0, Math.floor(S.gold * 0.5));
    S.fleet = [mkShip('sloop', '余生号', { cannons: 2, crew: 10 })];
    blog('船队全灭……你抱着桅杆漂流，被路过的渔船救起。失去全部货物与半数金币，一位老船主借给你一艘破旧小帆船。', 'bad');
    log('海战惨败，船队全灭。被渔船救起后从头再来。', 'bad');
  } else if (sunk.length) blog(`撤退途中损失 ${sunk.map(s => s.name).join('、')}。`, 'bad');
  hooks.renderBattle();
}

/* ========= 交易 / 港口操作 ========= */
export function buy(gid, q) {
  const p = port(S.pos); const pr = buyPrice(p, gid);
  if (q === 'max') q = Math.min(Math.floor(Math.max(0, S.gold) / pr), freeSpace());
  q = Math.min(+q, freeSpace(), Math.floor(Math.max(0, S.gold) / pr));
  if (q <= 0) return hooks.toast(S.gold < pr ? '金币不足' : '货舱已满');
  S.gold -= q * pr; S.cargo[gid] = (S.cargo[gid] || 0) + q; S.stats.trades++;
  S.stock[p.id][gid] = clamp(S.stock[p.id][gid] + q * 0.5, -40, 60);
  S.avgCost = S.avgCost || {}; S.avgCost[gid] = pr;
  hooks.onEvent('buy', { gid, qty: q });
  remember(p.id); hooks.render();
}
export function sell(gid, q) {
  const p = port(S.pos); const have = S.cargo[gid] || 0; if (!have) return;
  if (q === 'all') q = have; q = Math.min(+q, have); const pr = sellPrice(p, gid);
  S.gold += q * pr; S.cargo[gid] -= q; if (S.cargo[gid] <= 0) delete S.cargo[gid]; S.stats.trades++;
  S.stock[p.id][gid] = clamp(S.stock[p.id][gid] - q * 0.5, -40, 60);
  transferShare(p.zone, 'player', q * pr / 6000); checkWin();
  hooks.onEvent('sell', { gid, qty: q, pid: p.id });
  remember(p.id); hooks.render();
}
export function buySupplies(q) {
  if (q === 'max') q = Math.min(freeSpace(), Math.floor(Math.max(0, S.gold) / SUPPLY_PRICE));
  q = Math.min(+q, freeSpace(), Math.floor(Math.max(0, S.gold) / SUPPLY_PRICE));
  if (q <= 0) return hooks.toast('金币不足或货舱已满'); S.gold -= q * SUPPLY_PRICE; S.supplies += q; hooks.render();
}
export function sellSupplies(q) { q = Math.min(+q, S.supplies); if (q <= 0) return; S.supplies -= q; S.gold += q; hooks.render(); }
export function buyShip(type) {
  const t = SHIP_TYPES[type]; if (S.gold < t.price) return hooks.toast('金币不足');
  if (S.fleet.length >= 6) return hooks.toast('船队最多 6 艘');
  S.gold -= t.price; S.fleet.push(mkShip(type, nextShipName())); log(`购入 ${t.name}「${S.fleet.at(-1).name}」。记得到酒馆招募船员。`, 'good'); hooks.render();
}
export function shipRefund(sh) { return Math.round(T(sh).price * 0.6 * (sh.hp / T(sh).hp)) + sh.cannons * 75; }
export function sellShip(i) {
  const sh = S.fleet[i]; if (!sh) return; if (S.fleet.length <= 1) return hooks.toast('不能卖掉最后一艘船');
  if (cargoUsed() > capacity() - T(sh).cargo) return hooks.toast('货舱容量不足以容纳现有货物，请先卸货');
  const v = shipRefund(sh); S.gold += v; S.fleet.splice(i, 1); log(`出售 ${sh.name}，获得 ${fmt(v)} 金币。`); hooks.render();
}
export function repair(i) {
  const sh = S.fleet[i]; const cost = (T(sh).hp - sh.hp) * 4; if (cost <= 0) return;
  const pts = Math.floor(Math.min(cost, Math.max(0, S.gold)) / 4); if (pts <= 0) return hooks.toast('金币不足');
  S.gold -= pts * 4; sh.hp += pts; hooks.render();
}
export function repairAll() { for (const sh of S.fleet) { const cost = (T(sh).hp - sh.hp) * 4; if (cost > 0 && S.gold >= cost) { S.gold -= cost; sh.hp = T(sh).hp; } } hooks.render(); }
export function addCannon(i, q) {
  const sh = S.fleet[i]; q = Math.min(+q, T(sh).cannons - sh.cannons, Math.floor(Math.max(0, S.gold) / 150));
  if (q <= 0) return hooks.toast('已达上限或金币不足'); S.gold -= q * 150; sh.cannons += q; hooks.render();
}
export function removeCannon(i, q) { const sh = S.fleet[i]; q = Math.min(+q, sh.cannons); if (q <= 0) return; sh.cannons -= q; S.gold += q * 75; hooks.render(); }
export function hire(i, q) {
  const sh = S.fleet[i]; q = Math.min(+q, T(sh).crew - sh.crew, Math.floor(Math.max(0, S.gold) / 25));
  if (q <= 0) return hooks.toast('已满员或金币不足'); S.gold -= q * 25; sh.crew += q; hooks.render();
}
export function dismiss(i, q) { const sh = S.fleet[i]; q = Math.min(+q, sh.crew - 1); if (q <= 0) return; sh.crew -= q; hooks.render(); }
/** 酒馆情报：返回 {p,best,pr} 或 null */
export function rumor() {
  if (S.gold < 50) { hooks.toast('金币不足'); return null; }
  S.gold -= 50;
  const p = pick(PORTS.filter(p => p.id !== S.pos));
  let best = null, bestR = 0;
  for (const g of GOODS) { const r = price(p, g.id) / G[g.id].base; if (r > bestR) { bestR = r; best = g; } }
  const pr = price(p, best.id);
  S.mem[p.id] = S.mem[p.id] || { day: S.day, prices: {} }; S.mem[p.id].prices[best.id] = pr; S.mem[p.id].day = S.day;
  log(`酒馆情报：${p.name}（${zone(p.zone).name}）的 ${best.name} 售价高达约 ${pr} 金币。`, 'gold');
  return { p, best, pr };
}
export function invest(amt) {
  amt = +amt; if (S.gold < amt) return hooks.toast('金币不足');
  const p = port(S.pos); const cur = S.share[p.zone].player; const pts = amt / (400 + 10 * cur);
  S.gold -= amt; transferShare(p.zone, 'player', pts); S.dev[p.id] += amt / 5000; hooks.onEvent('invest', { pid: p.id, amt });
  log(`向 ${p.name} 投资 ${fmt(amt)} 金币，${zone(p.zone).name} 份额 +${pts.toFixed(1)}。`, 'good');
  checkWin(); hooks.render();
}
export function rest(days) { passDays(days, true); log(`在 ${port(S.pos).name} 停泊 ${days} 天。`); remember(S.pos); save(true); hooks.render(); }

export function npcLine(ctx, p) {
  const pool = LINES[ctx]; const line = pool[hash(p.id + ctx + Math.floor(S.day / 3)) % pool.length];
  const leader = zoneLeader(p.zone); const rv = leader === 'player' ? RIVALS[hash(p.id) % 3].name : FACTION_NAME[leader];
  return line.replace('{port}', p.name).replace('{prod}', G[p.produce[0]].name).replace('{dem}', G[p.demand[0]].name).replace('{zone}', zone(p.zone).name).replace('{rival}', rv);
}

/* ========= 存档 ========= */
export function save(silent) {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(S, (k, v) => typeof v === 'number' && !Number.isInteger(v) ? Math.round(v * 1000) / 1000 : v)); if (!silent) hooks.toast('已保存'); }
  catch (e) { if (!silent) hooks.toast('保存失败：浏览器存储不可用'); }
}
/** 幂等地补齐新增字段：load 与 newGame 都会调用 */
export function migrate() {
  if (!S) return;
  S.ver = 3;
  S.stats = S.stats || { trades: 0, battles: 0, wins: 0 };
  S.captain = S.captain || 'lin';
  S.weather = S.weather || { type: 'clear', days: 0 };
  S.ct = S.ct || { active: [], done: 0, failed: 0 };
  ensureRep();
  for (const k of REP_KEYS) if (typeof S.rep[k] !== 'number') S.rep[k] = 0;
  delete S.escortUntil;
  for (const p of PORTS) {
    S.drift[p.id] = S.drift[p.id] || {}; S.stock[p.id] = S.stock[p.id] || {};
    if (S.dev[p.id] == null) S.dev[p.id] = 0;
    for (const gd of GOODS) {
      if (S.drift[p.id][gd.id] == null) S.drift[p.id][gd.id] = rand(0.85, 1.15);
      if (S.stock[p.id][gd.id] == null) S.stock[p.id][gd.id] = 0;
    }
  }
  for (const z of ZONES) if (!S.share[z.id]) S.share[z.id] = { player: 0, whale: 34, redsail: 33, goldsand: 33 };
  if (!port(S.pos)) { S.pos = START_PORT; S.ship = { x: projX(port(START_PORT).lon), y: projY(port(START_PORT).lat) }; S.dest = null; S.voyage = null; }
}

export function load(silent) {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) {
      // 旧版本存档的港口 id 与坐标系已失效，不再兼容
      if (OLD_SAVE_KEYS.some(k => localStorage.getItem(k))) {
        for (const k of OLD_SAVE_KEYS) localStorage.removeItem(k);
        if (!silent) hooks.toast('旧版存档与新的真实世界地图不兼容，已开启新航程');
      } else if (!silent) hooks.toast('没有存档');
      return false;
    }
    const d = JSON.parse(raw);
    if (!d || !d.fleet || !d.share || !d.ship) { if (!silent) hooks.toast('存档损坏'); return false; }
    S = d; migrate();
    if (!silent) { hooks.toast('已读取存档'); hooks.render(); }
    return true;
  } catch (e) { if (!silent) hooks.toast('读取失败'); return false; }
}
export function hasSave() { try { return !!localStorage.getItem(SAVE_KEY); } catch (e) { return false; } }
