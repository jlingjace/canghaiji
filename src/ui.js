/* HTML 侧栏 / 弹窗 / 事件 / 海战界面 */
import { GOODS, G, SHIP_TYPES, YARD_SHIPS, ZONES, RIVALS, FACTION_COLOR, FACTION_NAME, PORTS, CHARS, CAPTAIN_KEYS, RIVAL_REP } from './data.js';
import * as g from './game.js';
import { S, B, hooks, port, zone, rival, T, captain } from './game.js';
import { portrait, bust } from './portraits.js';
import { hexDist, moveRange, RANGE } from './battle.js';
import { fmt, clamp, pick, randInt, rand } from './util.js';
import { runTypewriter, setMenuCursor, floatText, tweenNumber, flash } from './fx.js';
import { audio } from './audio.js';

let map = null;
let pending = null;      // 遭遇对手商会时的待决状态
let eventCb = null;

/* ========= 基础弹窗 ========= */
export function showModal(html) {
  document.getElementById('modal').innerHTML = `<div class="modal-bg"><div class="modal">${html}</div></div>`;
  const m = document.querySelector('.modal'); runTypewriter(m); setMenuCursor(m); audio.sfx('open');
}
export function closeModal() { document.getElementById('modal').innerHTML = ''; }
let toastT = null;
export function toast(msg) {
  let el = document.getElementById('toast');
  if (!el) { el = document.createElement('div'); el.id = 'toast'; document.body.appendChild(el); }
  el.textContent = msg; el.style.display = 'block'; clearTimeout(toastT); toastT = setTimeout(() => el.style.display = 'none', 2200);
}
function npcCard(key, line) { const c = CHARS[key]; return `<div class="npc">${portrait(c, 56)}<div><b>${c.name}</b> <span class="muted">${c.title}</span><div class="say">“${line}”</div></div></div>`; }
function showEvent(title, text, cb, who = 'ahai') {
  eventCb = cb; const c = CHARS[who];
  showModal(`<div class="npc big"><div class="bust-wrap">${bust(c, 136)}</div><div><h2>${title}</h2><p class="muted" style="font-size:12px;margin-top:-4px">${c.name} · ${c.title}</p><p data-tw>${text}</p></div></div><div class="row tw-actions"><button class="btn primary" data-a="eventOk">继续</button></div>`);
}

/* ========= 开局 / 帮助 ========= */
export function chooseCaptain() {
  showModal(`<h2>选择你的船长</h2><p class="muted">每位船长有一项专精，会影响整局游戏。</p><div class="cards">${CAPTAIN_KEYS.map(k => {
    const c = CHARS[k];
    return `<div class="ccard" data-a="pickCaptain" data-c="${k}"><div class="bust-wrap" style="--d:${CAPTAIN_KEYS.indexOf(k) * 0.09}s">${bust(c, 128)}</div><b>${c.name}</b><span class="muted" style="font-size:12px">${c.title}</span><p>${c.intro}</p><p class="gold">${c.bonus}</p></div>`;
  }).join('')}</div>`);
}
function help() {
  showModal(`<h2>玩法说明</h2>
  <p><b>目标</b>：在西洋、北海、东海、南洋、珍珠海、黄金海六大海域都取得 ≥50% 的势力份额。</p>
  <p><b>航行</b>：点击海图上的港口即可出航，船队会实时航行，途中可以再点其他港口改变航向。拖动海图查看远处，<kbd>⌖ 船队</kbd> 让镜头回到船上，<kbd>▶</kbd> 切换航行快进。每天消耗补给 = 船员数 ÷ 10，断粮会减员。</p>
  <p><b>贸易</b>：每个港口有「特产」（约 55% 基准价）和「紧缺」（约 170% 基准价）。低买高卖，注意货舱容量与补给占位。大量买卖会影响当地价格，跨月逐步恢复。</p>
  <p><b>事件</b>：航程中点会遇到风暴、海盗、顺风、漂流物、热病，或与对手商会船队相遇（可选择攻击）。</p>
  <p><b>势力份额</b>：投资港口、在该海域卖货、击败对手商会船队（+6）都能提升份额。主导海域每月有收益并有进货折扣。三家对手商会每月也在扩张。</p>
  <p><b>船队</b>：造船厂买船、修理、装炮；酒馆招募船员、打听情报、停泊休整。新船需要先招募船员才能出航。船队上限 6 艘。</p>
  <p><b>海战</b>：炮击靠火炮，接舷靠船员，撤退靠航速。全灭会被救起从头再来，但会失去全部货物和一半金币。</p>
  <p><b>存档</b>：每次抵港自动保存到浏览器本地，航行中每 10 秒自动保存；也可手动保存/读取。</p>
  <div class="row"><button class="btn primary" data-a="closeModal">开始航行</button></div>`);
}

/* ========= 出航 ========= */
function planVoyage(pid) {
  if (B) return;
  if (pid === S.pos && !S.dest) return toast('船队已停泊在此港');
  if (S.dest === pid) return toast('已在前往该港口的航线上');
  const to = port(pid), z = zone(to.zone); const days = g.voyageDays(pid); const need = days * g.dailySupply();
  const low = g.crewShortage();
  let warn = '';
  if (low.length && !S.dest) warn += `<p class="bad">${low.map(s => s.name).join('、')} 船员不足（至少需要满员 20%），无法出航。请先到酒馆招募。</p>`;
  else if (S.supplies < need) warn += `<p class="warn">补给不足：需要约 ${need}，现有 ${S.supplies}。途中断粮会导致船员减员。</p>`;
  showModal(`<h2>${S.dest ? '改变航向 → ' : '前往 '}${to.name}</h2>
    <p>${S.dest ? '当前位置' : port(S.pos).name} → ${to.name}（${z.name}） · 航程约 <b>${days}</b> 天 · 船队航速 ${g.fleetSpeed()}</p>
    <p>预计消耗补给 ${need}（现有 ${S.supplies}）· 特产：${to.produce.map(x => G[x].name).join('、')} · 紧缺：${to.demand.map(x => G[x].name).join('、')}</p>
    ${warn}
    <div class="row"><button class="btn primary" data-a="sail" data-pid="${pid}" ${low.length && !S.dest ? 'disabled' : ''}>${S.dest ? '改变航向' : '出航'}</button><button class="btn" data-a="closeModal">取消</button></div>`);
}
function sail(pid) {
  const to = port(pid); closeModal(); flash(); map.setMode('sea'); audio.sfx('sail');
  g.log(S.dest ? `船队改变航向，前往 ${to.name}。` : `从 ${port(S.pos).name} 启航前往 ${to.name}，预计 ${g.voyageDays(pid)} 天。`);
  map.startVoyage(pid); S.tab = 'port'; render();
}
function arrive(pid) {
  flash(); map.setMode('port'); audio.sfx('bell'); g.remember(pid); g.log(`抵达 ${port(pid).name}。`, 'good');
  S.tab = 'port'; S.ptab = 'market'; g.save(true); render();
}

/* ========= 航行事件 ========= */
function rollEvent(to, done) {
  const r = Math.random();
  if (r < 0.34) { done(0); return; }
  if (r < 0.46) {
    const sh = pick(S.fleet); const dmg = Math.round(T(sh).hp * rand(0.1, 0.3)); sh.hp -= dmg;
    const extra = randInt(1, 2); let txt = `风暴袭来，${sh.name} 受损 ${dmg} 点，船队被迫绕行，航程延长 ${extra} 天。`;
    if (sh.hp <= 0) { if (S.fleet.length > 1) { S.fleet.splice(S.fleet.indexOf(sh), 1); g.loseCargoFor(sh); txt += ` ${sh.name} 在风暴中沉没！`; } else { sh.hp = 1; txt += ' 船体几近解体，勉强保住。'; } }
    g.setWeather('storm', randInt(1, 2)); audio.sfx('thunder'); g.log(txt, 'bad'); showEvent('风暴', txt, () => done(extra)); return;
  }
  if (r < 0.56) {
    const enemy = g.makeEnemy('pirate');
    showEvent('海盗！', `“把货交出来，也许我留你们一条命！”——一支海盗船队从雾中逼近：${g.describeFleet(enemy)}。他们向你开火了！`, () => g.startBattle('pirate', null, enemy, to.zone, () => done(0)), 'barro'); return;
  }
  if (r < 0.66) { g.log('顺风顺水，船队跑得飞快。', 'good'); S.supplies += 3; showEvent('顺风', `信风鼓满帆面，船队一路顺畅，还省下了几天口粮（补给 +3）。`, () => done(0)); return; }
  if (r < 0.74) {
    const gd = pick(GOODS); const q = Math.min(g.freeSpace(), randInt(3, 15));
    if (q > 0) { S.cargo[gd.id] = (S.cargo[gd.id] || 0) + q; g.log(`捞起遇难船只的漂流货箱：${gd.name} ×${q}。`, 'good'); showEvent('漂流物', `海面上漂着遇难船的货箱，你的船员捞起了 ${gd.name} ×${q}。`, () => done(0)); }
    else { const gold = randInt(100, 400); S.gold += gold; g.log(`捞起一只漂流钱箱，获得 ${gold} 金币。`, 'good'); showEvent('漂流物', `海面上漂着一只钱箱，里面有 ${gold} 金币。`, () => done(0)); }
    return;
  }
  if (r < 0.82) {
    const sh = pick(S.fleet); const loss = Math.max(1, Math.floor(sh.crew * 0.1)); sh.crew = Math.max(1, sh.crew - loss);
    g.log(`${sh.name} 爆发热病，${loss} 名船员病故。`, 'bad'); showEvent('热病', `${sh.name} 上爆发热病，${loss} 名船员病故。船医建议下次多备药材。`, () => done(0)); return;
  }
  const sh = S.share[to.zone]; const cands = RIVALS.filter(x => sh[x.id] > 0);
  const tot = cands.reduce((a, x) => a + sh[x.id], 0); let x = Math.random() * tot, rv = cands[0];
  for (const c of cands) { x -= sh[c.id]; if (x <= 0) { rv = c; break; } }
  const enemy = g.makeEnemy('rival'); const rep = CHARS[RIVAL_REP[rv.id]];
  pending = { rv, enemy, done, zone: to.zone };
  showModal(`<div class="npc big"><div class="bust-wrap">${bust(rep, 136)}</div><div><h2>遭遇 ${rv.name} 船队</h2><p class="muted" style="font-size:12px;margin-top:-4px">${rep.name} · ${rep.title}</p><p data-tw>“这片海不欢迎新面孔。识相的话，让开航道。”</p><p data-tw>${zone(to.zone).name}海域上，${rv.name} 的船队正沿相反航向驶过：${g.describeFleet(enemy)}。</p></div></div>
    <p class="muted">击败对手船队可夺取其在本海域约 6 点份额；但对方火力可能远胜于你。</p>
    <div class="row tw-actions"><button class="btn danger" data-a="attackRival" data-rid="${rv.id}">发动攻击</button><button class="btn" data-a="avoidRival">避开</button></div>`);
}

/* ========= 海战：六角格场景 + 侧栏 HUD ========= */
function renderBattle() {
  if (!B) return;
  if (!map.battle.active) { closeModal(); map.setMode('battle'); map.battle.begin(); }
  render();
}
function renderBattleHUD() {
  const eName = B.kind === 'pirate' ? '海盗船队' : rival(B.rivalId).name + '船队';
  const eCap = B.kind === 'pirate' ? CHARS.barro : CHARS[RIVAL_REP[B.rivalId]]; const myCap = captain();
  const bar = (hp, max) => `<div class="hpbar"><i style="width:${clamp(hp / max * 100, 0, 100)}%;background:${hp / max < 0.3 ? 'var(--bad)' : 'var(--good)'}"></i></div>`;
  const units = (B.units || []).filter(u => u.side === 'p');
  const mine = units.map((u, i) => { const s = u.ref, max = T(s).hp, sel = B.sel === u;
    return `<div class="bship ${s.hp <= 0 ? 'dead' : ''} ${sel ? 'sel' : ''}" data-a="bsel" data-i="${i}" style="cursor:pointer"><b>${sel ? '▶ ' : ''}${s.name}</b> <span class="muted">${SHIP_TYPES[s.type].name}</span>${s.hp > 0 && u.acted ? '<span class="badge low" style="float:right">已行动</span>' : s.hp > 0 && u.moved ? '<span class="badge" style="float:right;color:var(--muted);border-color:var(--muted)">已移动</span>' : ''}
      ${bar(s.hp, max)}<small class="muted">耐久 ${Math.max(0, s.hp)}/${max} · 火炮 ${s.cannons} · 船员 ${s.crew}</small></div>`; }).join('');
  const theirs = B.enemy.map(s => `<div class="bship ${s.hp <= 0 ? 'dead' : ''}"><b>${s.name}</b> <span class="muted">${SHIP_TYPES[s.type].name}</span>${bar(s.hp, s.maxHp)}<small class="muted">耐久 ${Math.max(0, s.hp)}/${s.maxHp} · 火炮 ${s.cannons} · 船员 ${s.crew}</small></div>`).join('');
  const logs = B.log.slice(-10).map(l => `<div class="${l.cls}">${l.msg}</div>`).join('');
  let ctl = '';
  if (B.over) ctl = `<div class="card"><b class="${B.result === 'win' ? 'good' : B.result === 'lose' ? 'bad' : 'warn'}">${B.result === 'win' ? '★ 战斗胜利' : B.result === 'lose' ? '✖ 船队全灭' : '↩ 成功撤离'}</b><div class="row" style="margin-top:8px"><button class="btn primary" data-a="battleDone">${B.result === 'lose' ? '重整旗鼓' : '继续航行'}</button></div></div>`;
  else if (B.phase !== 'player') ctl = `<div class="card"><b class="warn">敌方行动中…</b></div>`;
  else {
    const sel = B.sel; const mr = sel ? moveRange(sel) : 0;
    const tgt = B.target;
    ctl = `<div class="card"><b>${sel ? sel.ref.name : '选择一艘船'}</b> ${sel ? `<span class="muted">移动 ${mr} 格 · 射程 ${RANGE} 格 · ${sel.moved ? '已移动' : '可移动'} · ${sel.acted ? '已行动' : '可行动'}</span>` : ''}
      ${tgt ? `<p>目标 <b class="bad">${tgt.ref.name}</b>（距离 ${hexDist(sel, tgt)} 格）</p><div class="row"><button class="btn primary" data-a="bfire">炮击</button><button class="btn" data-a="bboard" ${hexDist(sel, tgt) === 1 ? '' : 'disabled'}>接舷${hexDist(sel, tgt) === 1 ? '' : '（需相邻）'}</button><button class="btn" data-a="bcancel">取消</button></div>`
        : `<p class="muted" style="font-size:12px">点绿色格子移动，点红圈敌船攻击。</p><div class="row"><button class="btn" data-a="bwait" ${sel ? '' : 'disabled'}>待机</button><button class="btn" data-a="bend">结束回合</button><button class="btn danger" data-a="bflee">撤退（约 ${Math.round(g.fleeChance() * 100)}%）</button></div>`}
    </div>`;
  }
  return `<h2>海战 · ${eName}</h2><div class="vs"><div class="bust-wrap still">${bust(myCap, 64)}</div><div><b>${myCap.name}</b><br><span class="muted" style="font-size:12px">${myCap.title}</span></div><span class="vsx">VS</span><div style="text-align:right"><b>${eCap.name}</b><br><span class="muted" style="font-size:12px">${eCap.title}</span></div><div class="bust-wrap flip still">${bust(eCap, 64)}</div></div>
    <p class="muted" style="font-size:12px">第 ${B.round} 回合 · ${B.over ? '战斗结束' : B.phase === 'player' ? '我方行动' : '敌方行动'}</p>${ctl}
    <h3>我方船只</h3>${mine}<h3>${eName}</h3>${theirs}<div class="blog" id="blog">${logs}</div>`;
}

/* ========= 侧栏 ========= */
export function render() { renderTop(); renderTabs(); renderPanel(); renderMapCtl(); if (map) map.refreshPorts(); }
function renderMapCtl() {
  const el = document.getElementById('mapctl'); if (!el || !map) return;
  if (B) { el.innerHTML = ''; return; }
  if (S.dest) el.innerHTML = `<button class="btn" data-a="recenter" title="镜头回到船队">⌖ 船队</button><button class="btn" data-a="speed" id="speedbtn" title="航行速度">▶ ${map.speedMul}×</button>`;
  else if (map.mode === 'port') el.innerHTML = `<button class="btn primary" data-a="seaMap">⛵ 出海 · 海图</button>`;
  else el.innerHTML = `<button class="btn" data-a="backPort">⚓ 回港</button><button class="btn" data-a="recenter" title="镜头回到船队">⌖ 船队</button>`;
}
let lastGold = null;
export function resetGoldTween() { lastGold = null; }
function renderTop() {
  const p = port(S.pos); const cap = captain();
  const wi = g.WEATHER_ICON[S.weather?.type || 'clear'];
  const status = S.dest ? `航行中 → <b>${port(S.dest).name}</b>（第 ${S.voyage.days + 1} 天，约剩 ${g.voyageDays(S.dest)} 天）${wi}` : `停泊 <b>${p.name}</b>（${zone(p.zone).name}）${wi}`;
  document.getElementById('top').innerHTML = `<span class="title">沧海纪</span>
    <span class="cap">${portrait(cap, 28)}<b>${cap.name}</b></span>
    <span class="stat">金币 <b id="goldv" class="${S.gold < 0 ? 'bad' : 'gold'}">${fmt(S.gold)}</b></span>
    <span class="stat">${g.dateStr()}</span>
    <span class="stat">${status}</span>
    <span class="stat">船队 <b>${S.fleet.length}</b> 艘 · 航速 ${g.fleetSpeed()}</span>
    <span class="stat">货舱 <b>${g.cargoUsed()}/${g.capacity()}</b></span>
    <span class="stat">补给 <b class="${S.supplies < g.dailySupply() * 5 ? 'warn' : ''}">${S.supplies}</b>（日耗 ${g.dailySupply()}）</span>
    <span class="spacer"></span>
    <span class="row"><button class="btn" data-a="mute" title="音乐 / 音效">${audio.muted ? '🔇 静音' : '🔊 音效'}</button><button class="btn" data-a="help">玩法</button><button class="btn" data-a="save">保存</button><button class="btn" data-a="load">读取</button><button class="btn" data-a="newGame">新游戏</button></span>`;
  const gv = document.getElementById('goldv');
  if (lastGold !== null && lastGold !== S.gold && gv) {
    tweenNumber(gv, lastGold, S.gold);
    const d = S.gold - lastGold; floatText(gv, (d > 0 ? '+' : '−') + fmt(Math.abs(d)), d > 0 ? 'good' : 'bad'); audio.sfx(d > 0 ? 'coin' : 'pay');
  }
  lastGold = S.gold;
}
export const TABS = [['port', '港口'], ['fleet', '船队'], ['share', '势力'], ['journal', '航海志']];
function renderTabs() { if (B) { document.getElementById('tabs').innerHTML = `<button class="active">⚔ 海战</button>`; return; } document.getElementById('tabs').innerHTML = TABS.map(([id, n]) => `<button class="${S.tab === id ? 'active' : ''}" data-a="tab" data-tab="${id}">${n}</button>`).join(''); }
function renderPanel() {
  const el = document.getElementById('panel');
  if (B) { el.innerHTML = renderBattleHUD(); const bl = document.getElementById('blog'); if (bl) bl.scrollTop = bl.scrollHeight; return; }
  if (S.tab === 'port') el.innerHTML = S.dest ? renderAtSea() : renderPort();
  else if (S.tab === 'fleet') el.innerHTML = renderFleet();
  else if (S.tab === 'share') el.innerHTML = renderShare();
  else el.innerHTML = renderJournal();
}
function renderAtSea() {
  const to = port(S.dest); const v = S.voyage;
  return `<h2>航行中</h2>${npcCard('ahai', pick(['风向不错，保持航向！', '瞭望手说前方海面平静。', '船长，补给还够撑几天，别绕远路。', '再点一个港口就能改航向，随你吩咐。']))}
    <div class="card"><b>目的地</b> ${to.name}（${zone(to.zone).name}）<br><span class="muted">已航行 ${v.days} 天 · 约剩 ${g.voyageDays(S.dest)} 天 · 特产：${to.produce.map(x => G[x].name).join('、')} · 紧缺：${to.demand.map(x => G[x].name).join('、')}</span></div>
    <div class="card"><b>镜头与速度</b><div class="row" style="margin-top:6px"><button class="btn" data-a="recenter">⌖ 回到船队</button><button class="btn" data-a="speed">${map.speedMul === 1 ? '▶ 快进 3×' : '▶ 恢复 1×'}</button></div><p class="muted" style="font-size:12px">拖动海图可以查看远处；点击其他港口可改变航向。港口操作要等抵港后进行。</p></div>`;
}
function renderPort() {
  const p = port(S.pos), z = zone(p.zone); const leader = g.zoneLeader(z.id);
  const sub = [['market', '市场'], ['yard', '造船厂'], ['tavern', '酒馆'], ['invest', '投资']];
  let html = `<h2>${p.name} <span class="muted" style="font-size:13px">${z.name} · 造船厂等级 ${p.yard} · 发展度 ${S.dev[p.id].toFixed(1)}</span></h2>
    <p class="muted" style="font-size:12px">海域主导：<span style="color:${FACTION_COLOR[leader]}">${FACTION_NAME[leader]}</span>（${S.share[z.id][leader].toFixed(1)}%）${g.dominated(z.id) ? ' · <span class="good">你享有 8% 进货折扣</span>' : ''}</p>
    <div class="subtabs">${sub.map(([id, n]) => `<button class="btn ${S.ptab === id ? 'active' : ''}" data-a="ptab" data-ptab="${id}">${n}</button>`).join('')}</div>`;
  html += npcCard({ market: 'qian', yard: 'mu', tavern: 'hong', invest: 'cen' }[S.ptab], g.npcLine(S.ptab, p));
  if (S.ptab === 'market') html += renderMarket(p);
  else if (S.ptab === 'yard') html += renderYard(p);
  else if (S.ptab === 'tavern') html += renderTavern(p);
  else html += renderInvest(p);
  return html;
}
function renderMarket(p) {
  const rows = GOODS.map(gd => {
    const bp = g.buyPrice(p, gd.id), sp = g.sellPrice(p, gd.id), have = S.cargo[gd.id] || 0; const ratio = g.price(p, gd.id) / gd.base;
    const tag = p.produce.includes(gd.id) ? '<span class="badge low">特产</span>' : p.demand.includes(gd.id) ? '<span class="badge high">紧缺</span>' : ratio < 0.85 ? '<span class="badge low">偏低</span>' : ratio > 1.25 ? '<span class="badge high">偏高</span>' : '';
    return `<tr><td>${gd.name} ${tag}</td><td class="r">${bp} / <span class="muted">${sp}</span></td><td class="r">${have || '<span class="muted">-</span>'}</td>
      <td><span class="row nowrap"><button class="btn sm" data-a="buy" data-g="${gd.id}" data-q="1">买1</button><button class="btn sm" data-a="buy" data-g="${gd.id}" data-q="10">买10</button><button class="btn sm" data-a="buy" data-g="${gd.id}" data-q="max">买满</button>
      <button class="btn sm" data-a="sell" data-g="${gd.id}" data-q="10" ${have ? '' : 'disabled'}>卖10</button><button class="btn sm" data-a="sell" data-g="${gd.id}" data-q="all" ${have ? '' : 'disabled'}>全卖</button></span></td></tr>`;
  }).join('');
  return `<div class="card"><div class="row"><b>补给</b> <span class="muted">${g.SUPPLY_PRICE} 金币/单位 · 现有 ${S.supplies} · 日耗 ${g.dailySupply()} · 空舱 ${g.freeSpace()}</span></div>
    <div class="row" style="margin-top:6px"><button class="btn sm" data-a="buySup" data-q="10">+10</button><button class="btn sm" data-a="buySup" data-q="50">+50</button><button class="btn sm" data-a="buySup" data-q="max">买满</button><button class="btn sm" data-a="sellSup" data-q="10">卖10</button></div></div>
    <div class="scroll"><table><thead><tr><th>商品</th><th class="r">买入 / 卖出</th><th class="r">持有</th><th>操作</th></tr></thead><tbody>${rows}</tbody></table></div>
    <p class="muted" style="font-size:12px">大量买入会推高当地价格，抛售会压低价格；每月逐步恢复。在一个海域卖货会缓慢提升你在该海域的份额。</p>`;
}
function renderYard(p) {
  const forSale = YARD_SHIPS[p.yard].map(t => { const s = SHIP_TYPES[t];
    return `<tr><td><b>${s.name}</b></td><td class="r">${s.cargo}</td><td class="r">${s.hp}</td><td class="r">${s.cannons}</td><td class="r">${s.speed}</td><td class="r">${s.crew}</td><td class="r gold">${fmt(s.price)}</td><td><button class="btn sm" data-a="buyShip" data-t="${t}" ${S.gold < s.price ? 'disabled' : ''}>购买</button></td></tr>`; }).join('');
  const mine = S.fleet.map((sh, i) => { const t = T(sh); const rc = (t.hp - sh.hp) * 4;
    return `<div class="card"><div class="row"><b>${sh.name}</b><span class="muted">${t.name}</span><span class="spacer"></span><span class="muted">售价 ${fmt(g.shipRefund(sh))}</span></div>
      <div class="hpbar"><i style="width:${sh.hp / t.hp * 100}%"></i></div>
      <div class="row muted" style="font-size:12px">耐久 ${sh.hp}/${t.hp} · 火炮 ${sh.cannons}/${t.cannons} · 船员 ${sh.crew}/${t.crew}</div>
      <div class="row" style="margin-top:6px">
        <button class="btn sm" data-a="repair" data-i="${i}" ${rc > 0 ? '' : 'disabled'}>修理（${fmt(rc)}）</button>
        <button class="btn sm" data-a="addCannon" data-i="${i}" data-q="1">+1 炮（150）</button>
        <button class="btn sm" data-a="addCannon" data-i="${i}" data-q="5">+5 炮</button>
        <button class="btn sm" data-a="removeCannon" data-i="${i}" data-q="5">−5 炮</button>
        <button class="btn sm danger" data-a="sellShip" data-i="${i}" ${S.fleet.length > 1 ? '' : 'disabled'}>出售</button>
      </div></div>`; }).join('');
  return `<h3>出售船只</h3><div class="scroll"><table><thead><tr><th>船型</th><th class="r">载货</th><th class="r">耐久</th><th class="r">炮位</th><th class="r">航速</th><th class="r">船员</th><th class="r">价格</th><th></th></tr></thead><tbody>${forSale}</tbody></table></div>
    <p class="muted" style="font-size:12px">${p.yard < 3 ? '更大的船只需要在 3 级造船厂购买（铁锚城、灰岩堡、翠玉港、风语城、黑石港）。' : '这里可以买到所有船型。'}新船不含火炮与船员。</p>
    <h3>我的船只 <button class="btn sm" data-a="repairAll">全部修理</button></h3>${mine}`;
}
function renderTavern(p) {
  const rows = S.fleet.map((sh, i) => { const t = T(sh); const low = sh.crew < Math.ceil(t.crew * 0.2);
    return `<tr><td>${sh.name} <span class="muted">${t.name}</span></td><td class="r ${low ? 'bad' : ''}">${sh.crew}/${t.crew}</td>
      <td><span class="row nowrap"><button class="btn sm" data-a="hire" data-i="${i}" data-q="5">+5</button><button class="btn sm" data-a="hire" data-i="${i}" data-q="20">+20</button><button class="btn sm" data-a="hire" data-i="${i}" data-q="${t.crew - sh.crew}" ${sh.crew >= t.crew ? 'disabled' : ''}>满员</button><button class="btn sm" data-a="dismiss" data-i="${i}" data-q="5">遣散5</button></span></td></tr>`; }).join('');
  return `<div class="card"><b>招募船员</b> <span class="muted">25 金币/人，月薪 4 金币/人。船员低于满员 20% 无法出航，低于 30% 航速 −1；接舷战靠船员数取胜。</span>
    <table style="margin-top:6px"><thead><tr><th>船只</th><th class="r">船员</th><th>操作</th></tr></thead><tbody>${rows}</tbody></table></div>
    <div class="card"><b>打听情报</b> <span class="muted">50 金币，得知某港口当前卖价最高的商品，并记入航海志。</span><div class="row" style="margin-top:6px"><button class="btn" data-a="rumor">买酒打听（50）</button></div></div>
    <div class="card"><b>停泊休整</b> <span class="muted">停泊期间不消耗补给。跨月时物价会重新波动、对手商会会行动。</span><div class="row" style="margin-top:6px"><button class="btn" data-a="rest" data-d="7">停泊 7 天</button><button class="btn" data-a="rest" data-d="30">停泊 30 天</button></div></div>`;
}
function renderInvest(p) {
  const z = zone(p.zone); const cur = S.share[z.id].player; const est = a => (a / (400 + 10 * cur)).toFixed(1);
  return `<div class="card"><b>${z.name} 势力份额</b>${shareBar(z.id)}
    <p class="muted" style="font-size:12px;margin-top:8px">份额 ≥ 50% 即主导该海域：每月获得「份额 × 40」金币收益，并在该海域所有港口享受 8% 进货折扣。六大海域全部主导即获胜。</p></div>
    <div class="card"><b>向 ${p.name} 投资</b> <span class="muted">建设港口以提升你的商会在 ${z.name} 的份额。份额越高，进一步扩张的成本越高。</span>
    <div class="row" style="margin-top:8px">
      <button class="btn" data-a="invest" data-amt="1000" ${S.gold < 1000 ? 'disabled' : ''}>投资 1,000（+${est(1000)}）</button>
      <button class="btn" data-a="invest" data-amt="5000" ${S.gold < 5000 ? 'disabled' : ''}>投资 5,000（+${est(5000)}）</button>
      <button class="btn" data-a="invest" data-amt="20000" ${S.gold < 20000 ? 'disabled' : ''}>投资 20,000（+${est(20000)}）</button>
    </div></div>
    <p class="muted" style="font-size:12px">其他扩张手段：在本海域卖出货物（缓慢），或在航行中击败对手商会的船队（一次夺取 6 点）。</p>`;
}
function shareBar(zid) {
  const sh = S.share[zid]; const keys = ['player', 'whale', 'redsail', 'goldsand'];
  return `<div class="bar" style="margin-top:6px">${keys.map(k => `<i style="width:${sh[k]}%;background:${FACTION_COLOR[k]}" title="${FACTION_NAME[k]} ${sh[k].toFixed(1)}%"></i>`).join('')}</div>
    <div class="legend">${keys.map(k => `<span><i style="background:${FACTION_COLOR[k]}"></i>${FACTION_NAME[k]} ${sh[k].toFixed(1)}%</span>`).join('')}</div>`;
}
function renderFleet() {
  const cargoRows = Object.entries(S.cargo).map(([k, q]) => `<tr><td>${G[k].name}</td><td class="r">${q}</td><td class="r muted">${S.avgCost && S.avgCost[k] ? S.avgCost[k] : '-'}</td></tr>`).join('');
  const ships = S.fleet.map(sh => { const t = T(sh); return `<div class="card"><div class="row"><b>${sh.name}</b><span class="muted">${t.name}</span></div>
    <div class="hpbar"><i style="width:${sh.hp / t.hp * 100}%"></i></div>
    <div class="row muted" style="font-size:12px">耐久 ${sh.hp}/${t.hp} · 载货 ${t.cargo} · 火炮 ${sh.cannons}/${t.cannons} · 船员 ${sh.crew}/${t.crew} · 航速 ${t.speed}</div></div>`; }).join('');
  const cap = captain();
  return `<h2>船队</h2><div class="npc"><div class="bust-wrap still">${bust(cap, 96)}</div><div><b>${cap.name}</b> <span class="muted">${cap.title} · 船长</span><div class="gold" style="font-size:12px">${cap.bonus}</div><div class="say">“${cap.intro}”</div></div></div>
    <p class="muted" style="font-size:12px">航速 ${g.fleetSpeed()}（取最慢船，船员不足减速） · 总载货 ${g.capacity()} · 月薪支出 ${fmt(g.totalCrew() * 4)} · 船队估值 ${fmt(g.fleetValue())}</p>${ships}
    <h3>货舱 ${g.cargoUsed()}/${g.capacity()}</h3>
    <table><thead><tr><th>货物</th><th class="r">数量</th><th class="r">最近进价</th></tr></thead><tbody><tr><td>补给</td><td class="r">${S.supplies}</td><td class="r muted">${g.SUPPLY_PRICE}</td></tr>${cargoRows}</tbody></table>`;
}
function renderShare() {
  let income = 0; for (const z of ZONES) if (g.dominated(z.id)) income += Math.round(S.share[z.id].player * 40);
  const zones = ZONES.map(z => { const leader = g.zoneLeader(z.id); const ports = PORTS.filter(p => p.zone === z.id).map(p => p.name).join('、');
    return `<div class="card"><div class="row"><b style="color:${z.color}">${z.name}</b><span class="muted" style="font-size:12px">${ports}</span><span class="spacer"></span><span style="color:${FACTION_COLOR[leader]};font-size:12px">${g.dominated(z.id) ? '★ 你主导' : S.share[z.id][leader] >= 50 ? `${FACTION_NAME[leader]} 主导` : '群雄逐鹿'}</span></div>${shareBar(z.id)}</div>`; }).join('');
  const won = ZONES.filter(z => g.dominated(z.id)).length;
  return `<h2>势力版图</h2><p class="muted" style="font-size:12px">已主导 ${won}/6 个海域 · 每月主导收益 ${fmt(income)} 金币</p>${zones}
    <h3>对手商会</h3>${RIVALS.map(r => { const rep = CHARS[RIVAL_REP[r.id]]; return `<div class="npc">${portrait(rep, 48)}<div><b style="color:${r.color}">${r.name}</b> <span class="muted">${rep.name} · ${rep.title}</span><div class="muted" style="font-size:12px">大本营 ${zone(r.home).name}，每月会在各海域扩张，尤其巩固大本营。</div></div></div>`; }).join('')}`;
}
function renderJournal() {
  const rows = GOODS.map(gd => {
    let lo = null, hi = null;
    for (const pid in S.mem) { const pr = S.mem[pid].prices[gd.id]; if (pr == null) continue;
      if (!lo || pr < lo.pr) lo = { pid, pr }; if (!hi || pr > hi.pr) hi = { pid, pr }; }
    if (!lo) return '';
    const spread = hi.pr * 0.9 - lo.pr;
    return `<tr><td>${gd.name}</td><td>${port(lo.pid).name} <span class="muted">${lo.pr}</span></td><td>${port(hi.pid).name} <span class="muted">${hi.pr}</span></td><td class="r ${spread > 0 ? 'good' : 'muted'}">${spread > 0 ? '+' + Math.round(spread) : '-'}</td></tr>`;
  }).join('');
  const logs = S.log.map(l => `<div><span class="d">${g.dateStr(l.d)}</span><span class="${l.cls}">${l.msg}</span></div>`).join('');
  return `<h2>航海志</h2><h3>已知价格（按到访 / 情报记录）</h3>
    <table><thead><tr><th>商品</th><th>最低价港口</th><th>最高价港口</th><th class="r">单件毛利*</th></tr></thead><tbody>${rows}</tbody></table>
    <p class="muted" style="font-size:12px">*按最高价的 90% 卖出估算，且价格随时间波动，仅供参考。到访过 ${Object.keys(S.mem).length}/${PORTS.length} 个港口。</p>
    <h3>日志</h3><div class="log">${logs}</div>`;
}

/* ========= 动作分派 ========= */
const PORT_ACTIONS = new Set(['buy', 'sell', 'buySup', 'sellSup', 'buyShip', 'sellShip', 'repair', 'repairAll', 'addCannon', 'removeCannon', 'hire', 'dismiss', 'rumor', 'invest', 'rest', 'ptab']);
export const ACTIONS = {
  tab: d => { S.tab = d.tab; render(); },
  ptab: d => { S.ptab = d.ptab; render(); },
  buy: d => g.buy(d.g, d.q), sell: d => g.sell(d.g, d.q),
  buySup: d => g.buySupplies(d.q), sellSup: d => g.sellSupplies(d.q),
  buyShip: d => g.buyShip(d.t), sellShip: d => g.sellShip(+d.i), repair: d => g.repair(+d.i), repairAll: () => g.repairAll(),
  addCannon: d => g.addCannon(+d.i, d.q), removeCannon: d => g.removeCannon(+d.i, d.q),
  hire: d => g.hire(+d.i, d.q), dismiss: d => g.dismiss(+d.i, d.q), invest: d => g.invest(d.amt), rest: d => g.rest(+d.d),
  rumor: () => { const r = g.rumor(); if (!r) return; render();
    showModal(`<div class="npc big"><div class="bust-wrap">${bust(CHARS.hong, 136)}</div><div><h2>酒馆情报</h2><p class="muted" style="font-size:12px;margin-top:-4px">红姨 · 酒馆老板娘</p><p data-tw>“${r.p.name}那边的${r.best.name}，这阵子卖到 ${r.pr} 金币上下，${zone(r.p.zone).name}的商人都在往那儿运。这消息值你那 50 个金币吧？”</p></div></div><div class="row tw-actions"><button class="btn primary" data-a="closeModal">谢了</button></div>`); },
  sailTo: d => planVoyage(d.pid), sail: d => sail(d.pid),
  recenter: () => map.recenter(),
  mute: () => { audio.init(); audio.toggleMute(); renderTop(); },
  seaMap: () => { map.setMode('sea'); renderMapCtl(); toast('点击港口出航，⚓ 回港返回街景'); },
  backPort: () => { map.setMode('port'); renderMapCtl(); },
  speed: () => { map.speedMul = map.speedMul === 1 ? 3 : 1; document.getElementById('speedbtn').textContent = `▶ ${map.speedMul}×`; if (S.tab === 'port' && S.dest) renderPanel(); },
  closeModal: () => closeModal(), help: () => help(),
  save: () => g.save(false), load: () => { resetGoldTween(); g.load(false); },
  newGame: () => showModal(`<h2>开始新游戏？</h2><p>当前进度会被覆盖。</p><div class="row"><button class="btn danger" data-a="confirmNew">开始新游戏</button><button class="btn" data-a="closeModal">取消</button></div>`),
  confirmNew: () => { g.newGame(); resetGoldTween(); closeModal(); map.snapCamera(); render(); chooseCaptain(); },
  pickCaptain: d => { S.captain = CAPTAIN_KEYS.includes(d.c) ? d.c : 'lin'; g.log(`${CHARS[S.captain].name} 就任船长。`, 'gold'); closeModal(); render(); help(); },
  eventOk: () => { const cb = eventCb; eventCb = null; closeModal(); render(); if (cb) cb(); },
  attackRival: d => { const pd = pending; pending = null; g.startBattle('rival', d.rid, pd.enemy, pd.zone, pd.done); },
  avoidRival: () => { const pd = pending; pending = null; closeModal(); g.log('你调整航向，避开了对手的船队。'); pd.done(0); },
  bsel: d => map.battle.select(+d.i), bfire: () => map.battle.act('fire'), bboard: () => map.battle.act('board'), bcancel: () => map.battle.act('cancel'),
  bwait: () => map.battle.act('wait'), bend: () => map.battle.act('endTurn'), bflee: () => map.battle.act('flee'),
  battleDone: () => { const cb = g.clearBattle(); map.battle.end(); closeModal(); map.setMode(S.dest ? 'sea' : 'port'); render(); if (cb) cb(0); },
};

export function initUI(worldMap) {
  map = worldMap;
  Object.assign(hooks, { render, renderTop, showModal, closeModal, toast, renderBattle, onArrive: arrive, rollEvent,
    openPortTab: ptab => { S.tab = 'port'; S.ptab = ptab; render(); document.getElementById('panel').scrollTop = 0; },
    openSeaMap: () => { map.setMode('sea'); renderMapCtl(); toast('点击港口出航，⚓ 回港返回街景'); } });
  map.onPortTap = pid => planVoyage(pid);
  const boot = () => { audio.init(); document.removeEventListener('pointerdown', boot); document.removeEventListener('keydown', boot); };
  document.addEventListener('pointerdown', boot); document.addEventListener('keydown', boot);
  document.addEventListener('click', e => {
    const b = e.target.closest('[data-a]'); if (!b || b.disabled) return;
    const a = b.dataset.a; if (b.classList.contains('btn') || b.classList.contains('ccard')) audio.sfx('click');
    if (S.dest && PORT_ACTIONS.has(a)) { toast('航行中，抵港后再操作'); return; }
    if (ACTIONS[a]) ACTIONS[a](b.dataset);
  });
  setInterval(() => { if (S && S.dest && !B) g.save(true); }, 10000);
}
