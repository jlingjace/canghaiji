/* 数据与剧情自洽性检查：node tools/verify.mjs */
import { PORTS, ZONES, GOODS, G, SHIP_TYPES, START_PORT, VICTORY_ZONES, RIVALS } from '../src/data.js';
import { STORY } from '../src/story.js';

const pid = new Set(PORTS.map(p => p.id)), zid = new Set(ZONES.map(z => z.id)), gid = new Set(GOODS.map(g => g.id));
const errs = [], warns = [];
const E = m => errs.push(m), W = m => warns.push(m);

if (!pid.has(START_PORT)) E(`START_PORT ${START_PORT} 不存在`);
if (VICTORY_ZONES > ZONES.length) E(`VICTORY_ZONES ${VICTORY_ZONES} > 海域数 ${ZONES.length}`);
for (const r of RIVALS) if (!zid.has(r.home)) E(`商会 ${r.id} 的大本营 ${r.home} 不存在`);

// 港口数据
const perZone = {};
for (const p of PORTS) {
  if (!zid.has(p.zone)) E(`${p.id} zone ${p.zone} 不存在`);
  perZone[p.zone] = (perZone[p.zone] || 0) + 1;
  if (Math.abs(p.lat) > 85 || Math.abs(p.lon) > 180) E(`${p.id} 经纬度越界 ${p.lon},${p.lat}`);
  for (const g of [...p.produce, ...p.demand]) if (!gid.has(g)) E(`${p.id} 引用了不存在的商品 ${g}`);
  for (const g of p.produce) if (p.demand.includes(g)) E(`${p.id} 同时把 ${g} 列为特产与紧缺`);
  if (![1, 2, 3].includes(p.tier)) E(`${p.id} tier 非法 ${p.tier}`);
  if (![1, 2, 3].includes(p.yard)) E(`${p.id} yard 非法 ${p.yard}`);
}
for (const z of ZONES) if (!perZone[z.id]) E(`海域 ${z.id} 没有任何港口`);
  else if (perZone[z.id] < 2) W(`海域 ${z.id} 只有 ${perZone[z.id]} 个港口，NPC 无法在其中往返`);
if (!PORTS.some(p => p.yard === 3)) E('没有 3 级造船厂，无法购买大型船');

// 每种商品至少要有产地与销路，否则贸易链断
for (const g of GOODS) {
  if (!PORTS.some(p => p.produce.includes(g.id))) W(`商品 ${g.name} 没有任何产地`);
  if (!PORTS.some(p => p.demand.includes(g.id))) W(`商品 ${g.name} 没有任何紧缺地`);
}

// 剧情
const qids = new Set([...STORY.main, ...STORY.side].map(q => q.id));
const KINDS = new Set(['visit', 'visitZone', 'explore', 'sell', 'buy', 'deliver', 'defeat', 'share', 'dominate', 'invest', 'gold', 'fleet', 'boss']);
for (const q of [...STORY.main, ...STORY.side]) {
  if (q.port && !pid.has(q.port)) E(`${q.id} 接取港 ${q.port} 不存在`);
  if (q.turnIn && !pid.has(q.turnIn)) E(`${q.id} 交付港 ${q.turnIn} 不存在`);
  if (q.type === 'side' && !q.port) E(`${q.id} 支线必须有接取港`);
  for (const r of (q.prereq?.quests || [])) if (!qids.has(r)) E(`${q.id} 前置任务 ${r} 不存在`);
  if (q.prereq?.share && !zid.has(q.prereq.share.zone)) E(`${q.id} 前置海域 ${q.prereq.share.zone} 不存在`);
  if (q.reward?.shareZone && !zid.has(q.reward.shareZone)) E(`${q.id} 奖励海域 ${q.reward.shareZone} 不存在`);
  if (q.reward?.ship && !SHIP_TYPES[q.reward.ship]) E(`${q.id} 奖励船型 ${q.reward.ship} 不存在`);
  for (const o of q.objectives) {
    if (!KINDS.has(o.kind)) E(`${q.id} 目标类型 ${o.kind} 不支持`);
    if (o.port && !pid.has(o.port)) E(`${q.id} 目标港 ${o.port} 不存在`);
    if (o.zone && !zid.has(o.zone)) E(`${q.id} 目标海域 ${o.zone} 不存在`);
    if (o.good && !gid.has(o.good)) E(`${q.id} 目标商品 ${o.good} 不存在`);
    if (o.kind === 'dominate' && o.count > VICTORY_ZONES) E(`${q.id} dominate ${o.count} 超过胜利要求 ${VICTORY_ZONES}`);
    // 贸易目标的可行性：买得到 / 卖得掉
    if (o.kind === 'buy' && !PORTS.some(p => p.produce.includes(o.good))) W(`${q.id}「${o.label}」：${G[o.good].name} 没有产地，只能高价买`);
    if (o.kind === 'sell' && o.zone && !PORTS.some(p => p.zone === o.zone && p.demand.includes(o.good))) W(`${q.id}「${o.label}」：${ZONES.find(z => z.id === o.zone).name}没有港口紧缺 ${G[o.good].name}，利润会很低`);
    if (o.kind === 'deliver' && !PORTS.some(p => p.produce.includes(o.good))) W(`${q.id}「${o.label}」：${G[o.good].name} 没有产地`);
  }
}
// 主线链
for (let i = 1; i < STORY.main.length; i++) {
  const prev = STORY.main[i - 1].id, cur = STORY.main[i];
  if (!(cur.prereq?.quests || []).includes(prev)) W(`主线 ${cur.id} 的前置不含上一章 ${prev}`);
}

console.log(`港口 ${PORTS.length} · 海域 ${ZONES.length} · 商品 ${GOODS.length} · 主线 ${STORY.main.length} · 支线 ${STORY.side.length} · 胜利 ${VICTORY_ZONES}/${ZONES.length}`);
console.log(`各海域港口数: ${ZONES.map(z => z.name + perZone[z.id]).join(' ')}`);
if (errs.length) { console.log(`\n✖ 错误 ${errs.length}`); errs.forEach(e => console.log('  ' + e)); }
if (warns.length) { console.log(`\n⚠ 警告 ${warns.length}`); warns.forEach(w => console.log('  ' + w)); }
if (!errs.length) console.log('\n✓ 无阻断性错误');
process.exit(errs.length ? 1 : 0);
