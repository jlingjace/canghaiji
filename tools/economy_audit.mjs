/* 经济审计：直接跑 game.js 的真实买卖代码路径，枚举所有刷钱回路。
   用法：node tools/economy_audit.mjs            只看短程（单程 ≤8 天）
        node tools/economy_audit.mjs --all       全部港口对
   退出码 1 = 发现了「原地刷钱」级别的漏洞。 */
global.localStorage = { getItem: () => null, setItem() {}, removeItem() {} };
import * as g from '../src/game.js';
import { PORTS, GOODS, G } from '../src/data.js';
import { projX, projY, greatCircleKm } from '../src/geo.js';

g.newGame();
const S = g.S;
S.captain = 'lin';                                        // 议价最强的船长
S.fleet = [g.mkShip('merchant', '审计号', { cannons: 0, crew: 60 })];
S.supplies = 40;
const flatDrift = () => { for (const p of PORTS) for (const gd of GOODS) S.drift[p.id][gd.id] = 1; };
const clearStock = () => { for (const p of PORTS) for (const gd of GOODS) S.stock[p.id][gd.id] = 0; };
const speed = g.dayDistance();
const legDays = (a, b) => Math.max(1, Math.ceil(Math.hypot(projX(a.lon) - projX(b.lon), projY(a.lat) - projY(b.lat)) / speed));
const reset = () => { flatDrift(); clearStock(); S.cargo = {}; S.gold = 5e7; };

/** 在当前港口把某货买满再全卖掉，重复 n 次，返回净收益 */
function samePortLoop(p, gid, n = 3) {
  reset(); S.pos = p.id;
  const g0 = S.gold;
  for (let i = 0; i < n; i++) { g.buy(gid, 'max'); g.sell(gid, 'all'); }
  return S.gold - g0;
}

/** A 买满 → 到 B 全卖 → 在 B 买满同一种货 → 回 A 全卖，稳态每天净收益 */
function flipLoop(a, b, gid, cycles = 80) {
  reset();
  const T = legDays(a, b) * 2;
  let tail = 0, tailDays = 0;
  for (let i = 0; i < cycles; i++) {
    const g0 = S.gold;
    S.pos = a.id; g.buy(gid, 'max');
    g.decayStock(legDays(a, b));
    S.pos = b.id; g.sell(gid, 'all'); g.buy(gid, 'max');
    g.decayStock(legDays(a, b));
    S.pos = a.id; g.sell(gid, 'all');
    flatDrift();                                          // 隔离机制本身，排除月度漂移噪声
    if (i >= cycles - 20) { tail += S.gold - g0; tailDays += T; }
  }
  return tailDays ? tail / tailDays : 0;
}

/** A 买满 → B 全卖 → 空船回 A，稳态每天净收益（正常的单向贸易） */
function oneWayLoop(a, b, gid, cycles = 80) {
  reset();
  const T = legDays(a, b) * 2;
  let tail = 0, tailDays = 0;
  for (let i = 0; i < cycles; i++) {
    const g0 = S.gold;
    S.pos = a.id; g.buy(gid, 'max');
    g.decayStock(legDays(a, b));
    S.pos = b.id; g.sell(gid, 'all');
    g.decayStock(legDays(a, b));
    flatDrift();
    if (i >= cycles - 20) { tail += S.gold - g0; tailDays += T; }
  }
  return tailDays ? tail / tailDays : 0;
}

const showAll = process.argv.includes('--all');
let fatal = 0;

console.log('=== ① 原地循环：在同一港口买满再全卖，重复 3 次 ===');
const same = [];
for (const p of PORTS) for (const gd of GOODS) same.push({ n: `${p.name}·${gd.name}`, v: samePortLoop(p, gd.id) });
same.sort((x, y) => y.v - x.v);
const samePos = same.filter(x => x.v > 0);
for (const w of same.slice(0, 3)) console.log(`   最好情况 ${w.n}：${Math.round(w.v).toLocaleString()} 金币`);
console.log(`   为正的组合：${samePos.length} / ${same.length}${samePos.length ? '   ← 原地刷钱！' : '   ✓ 全部亏损'}`);
if (samePos.length) fatal++;

console.log('\n=== ② 对冲回路：A 买满 → B 卖光并买满 → 回 A 卖光（利用自己造成的价格冲击） ===');
const flips = [];
for (let i = 0; i < PORTS.length; i++) for (let j = i + 1; j < PORTS.length; j++) {
  const a = PORTS[i], b = PORTS[j], d = legDays(a, b);
  if (!showAll && d > 8) continue;
  for (const gd of GOODS) { const v = flipLoop(a, b, gd.id); if (v > 0) flips.push({ a, b, gd, d, v }); }
}
flips.sort((x, y) => y.v - x.v);
console.log(`   正收益回路：${flips.length} 条${flips.length ? '' : '   ✓ 全部亏损'}`);
for (const r of flips.slice(0, 8)) console.log(`   ${r.a.name} ⇄ ${r.b.name}（往返 ${r.d * 2} 天）· ${r.gd.name}：${Math.round(r.v).toLocaleString()} 金币/天`);
if (flips.length) fatal++;

console.log('\n=== ③ 单向贸易（正常玩法）：每天净收益前 10 ===');
const ways = [];
for (const a of PORTS) for (const b of PORTS) {
  if (a === b) continue;
  const d = legDays(a, b);
  if (!showAll && d > 8) continue;
  for (const gd of GOODS) { const v = oneWayLoop(a, b, gd.id); if (v > 0) ways.push({ a, b, gd, d, v }); }
}
ways.sort((x, y) => y.v - x.v);
console.log(`   有利可图的短程航线：${ways.length} 条`);
for (const r of ways.slice(0, 10)) console.log(`   ${r.a.name} → ${r.b.name}（往返 ${r.d * 2} 天，${Math.round(greatCircleKm(r.a.lon, r.a.lat, r.b.lon, r.b.lat))} km）· ${r.gd.name}：${Math.round(r.v).toLocaleString()} 金币/天`);
const oneDay = ways.filter(r => r.d <= 1);
console.log(`   其中单程 1 天的：${oneDay.length} 条，最高 ${oneDay.length ? Math.round(oneDay[0].v).toLocaleString() : 0} 金币/天`);

console.log('\n=== ④ 委托板：能否「就地买、就地交」 ===');
import * as C from '../src/contracts.js';
let ctBad = 0, ctSeen = 0;
for (const p of PORTS) for (let period = 0; period < 6; period++) {
  for (const c of C.boardFor(p.id, period)) {
    if (c.kind !== 'procure') continue;
    ctSeen++;
    reset(); S.pos = p.id;
    const g0 = S.gold; g.buy(c.good, c.qty);
    const cost = g0 - S.gold;
    if (cost > 0 && c.reward > cost) { ctBad++; if (ctBad <= 3) console.log(`   ${p.name} 采购 ${G[c.good].name}×${c.qty}：本港现买 ${cost} < 报酬 ${c.reward}   ← 可套利`); }
  }
}
console.log(`   采购委托 ${ctSeen} 条，可就地套利 ${ctBad} 条${ctBad ? '' : '   ✓ 全部亏损'}`);
if (ctBad) fatal++;

console.log('\n=== ⑤ 运货委托：托运货能否直接变卖 ===');
reset(); S.pos = PORTS[0].id;
const dc = [].concat(...PORTS.slice(0, 12).map(p => [0, 1, 2].flatMap(pr => C.boardFor(p.id, pr)))).find(c => c.kind === 'deliver');
if (dc) {
  S.pos = dc.from; S.ct = { active: [], done: 0, failed: 0 };
  const err = C.accept(dc);
  const held = S.cargo[dc.good] || 0;
  const g0 = S.gold; g.sell(dc.good, 'all');
  const got = S.gold - g0;
  console.log(`   ${port(dc.from)}接单「${dc.label}」：上船 ${held} 件，可变卖 ${g.sellable(dc.good)} 件，实际卖出所得 ${got}${got ? '   ← 白拿货物' : '   ✓ 卖不掉'}`);
  if (got) fatal++;
} else console.log('   （未抽到运货委托）');
function port(id) { return (PORTS.find(p => p.id === id) || {}).name || id; }

console.log(fatal ? `\n✖ 发现 ${fatal} 类刷钱漏洞` : '\n✓ 未发现刷钱回路');
process.exit(fatal ? 1 : 0);
