/* HTML 侧栏 / 弹窗 / 事件 / 海战界面 */
import { GOODS, G, SHIP_TYPES, YARD_SHIPS, ZONES, RIVALS, FACTION_COLOR, FACTION_NAME, PORTS, CHARS, CAPTAIN_KEYS, RIVAL_REP, VICTORY_ZONES } from './data.js';
import * as g from './game.js';
import { S, B, hooks, port, zone, rival, T, captain } from './game.js';
import { portrait, bust } from './portraits.js';
import { hexDist, moveRange, RANGE } from './battle.js';
import * as Q from './quests.js';
import { STORY } from './story.js';
import { fmt, clamp, pick, randInt, rand } from './util.js';
import { runTypewriter, setMenuCursor, floatText, tweenNumber, flash } from './fx.js';
import * as N from './npc.js';
import * as C from './contracts.js';
import * as geo from './geo.js';
import { audio } from './audio.js';

let map = null;
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

/* ========= 剧情对话序列 ========= */
let dlg = null;
function showDialogue(pages, opts = {}) { if (!pages || !pages.length) { if (opts.onEnd) opts.onEnd(); return; } dlg = { pages, i: 0, opts }; renderDlg(); }
function renderDlg() {
  const pg = dlg.pages[dlg.i]; const c = pg.who === 'captain' ? captain() : (CHARS[pg.who] || CHARS.ahai);
  const last = dlg.i === dlg.pages.length - 1; const acc = dlg.opts.accept;
  const btns = last && acc
    ? `<button class="btn primary" data-a="dlgAccept">${acc.label}</button>${acc.decline ? `<button class="btn" data-a="dlgDecline">${acc.decline}</button>` : ''}`
    : `<button class="btn primary" data-a="dlgNext">${last ? '结束' : '▶ 继续'}</button>`;
  showModal(`<div class="npc big"><div class="bust-wrap">${bust(c, 136)}</div><div><h2>${dlg.opts.title || c.name}</h2><p class="muted" style="font-size:12px;margin-top:-4px">${c.name} · ${c.title}</p><p data-tw class="dlg-text ${pg.reward ? 'gold' : ''}">${Q.fillText(pg.text)}</p><p class="muted" style="font-size:10px;font-family:var(--pix)">${dlg.i + 1}/${dlg.pages.length}</p></div></div><div class="row tw-actions">${btns}</div>`);
}
function endDlg() { const d = dlg; dlg = null; closeModal(); if (d && d.opts.onEnd) d.opts.onEnd(); }

/* ========= 任务页 ========= */
function renderQuests() {
  Q.ensureQuestState();
  const bar = (v, t) => `<div class="hpbar"><i style="width:${clamp(v / t * 100, 0, 100)}%;background:${v >= t ? 'var(--good)' : 'var(--gold)'}"></i></div>`;
  const rewardTxt = r => [r?.gold ? fmt(r.gold) + ' 金币' : '', r?.sharePts ? `${zone(r.shareZone).name}份额 +${r.sharePts}` : '', r?.ship ? SHIP_TYPES[r.ship].name : '', r?.cannons ? `火炮 +${r.cannons}` : '', r?.crew ? `船员 +${r.crew}` : ''].filter(Boolean).join(' · ');
  const card = q => `<div class="card"><div class="row"><b>${q.type === 'main' ? '◆ ' : ''}${q.title}</b><span class="muted" style="font-size:11px">${CHARS[q.giver]?.name || ''}</span><span class="spacer"></span>${Q.qStatus(q.id) === 'ready' ? `<span class="badge low">可交付 → ${port(q.turnIn).name}</span>` : ''}</div>
    ${q.objectives.map((o, i) => { const v = Q.objValue(q, i), t = Q.objTarget(o); return `<div style="font-size:12px;margin-top:4px">${Q.objDone(q, i) ? '☑' : '☐'} ${o.label} <span class="muted">${Math.min(v, t)}/${t}</span>${bar(v, t)}</div>`; }).join('')}
    ${rewardTxt(q.reward) ? `<div class="muted" style="font-size:11px;margin-top:4px">奖励：${rewardTxt(q.reward)}</div>` : ''}</div>`;
  const act = Q.activeQuests(); const mains = act.filter(q => q.type === 'main'), sides = act.filter(q => q.type === 'side');
  const nm = Q.nextMain(); let hint = '';
  if (nm && Q.qStatus(nm.id) === 'locked') hint = Q.prereqMet(nm)
    ? `<p class="gold" style="font-size:12px">下一章「${nm.title}」：${nm.port ? `前往 ${port(nm.port).name} 找 ${CHARS[nm.giver]?.name || ''}` : '停靠任意港口即可开启'}</p>`
    : `<p class="muted" style="font-size:12px">下一章「${nm.title}」尚未解锁${nm.prereq?.share ? `（需 ${zone(nm.prereq.share.zone).name} 份额 ≥ ${nm.prereq.share.pct}%）` : nm.prereq?.day ? `（第 ${nm.prereq.day} 天后）` : ''}。</p>`;
  const clues = Q.QUESTS.filter(q => q.type === 'side' && Q.qStatus(q.id) === 'locked' && Q.prereqMet(q) && q.port && !S.q.declined[q.id]).slice(0, 6)
    .map(q => `<div style="font-size:12px">◇ ${port(q.port).name}（${zone(port(q.port).zone).name}）· ${CHARS[q.giver]?.name || ''} 有一件委托</div>`).join('');
  const declined = Q.QUESTS.filter(q => S.q.declined[q.id]).length;
  return `<h2>任务</h2><p class="muted" style="font-size:12px">${STORY.title} · 主线 ${Q.MAIN.filter(q => Q.qStatus(q.id) === 'done').length}/${Q.MAIN.length} 章 · 已完成 ${Q.doneCount()} 个任务</p>
    <h3>主线</h3>${mains.map(card).join('')}${!mains.length && !nm ? '<p class="muted">主线已全部完成。</p>' : ''}${hint}
    <h3>支线</h3>${sides.map(card).join('') || '<p class="muted" style="font-size:12px">暂无进行中的支线。</p>'}
    <h3>委托（${C.activeContracts().length}/5）</h3>${C.activeContracts().map(c => `<div class="card"><div class="row"><span class="badge ${C.daysLeft(c) <= 3 ? 'high' : 'low'}">剩 ${C.daysLeft(c)} 天</span><b>${c.label}</b><span class="spacer"></span><span class="gold">${fmt(c.reward)}</span></div><div class="muted" style="font-size:11px">进度 ${C.progressText(c)}${c.to !== S.pos ? ` · 交付地 ${port(c.to).name}` : ''}</div></div>`).join('') || '<p class="muted" style="font-size:12px">港口的委托板上随时有新活计。</p>'}
    <h3>线索</h3>${clues || '<p class="muted" style="font-size:12px">目前没有新的委托消息。</p>'}${declined ? `<p class="muted" style="font-size:11px">已婉拒 ${declined} 个委托，再次到访该港可重新接取。</p>` : ''}`;
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
  <p><b>世界</b>：这是一张真实世界地图，港口都在它们真实的经纬度上。航线会自动绕开陆地，所以从里斯本去果阿要绕好望角（约 42 天），去塞维利亚只要 2 天。滚轮缩放，拖动平移，<kbd>🌍</kbd> 看全图，<kbd>？</kbd> 是图例。</p>
  <p><b>找港口</b>：图标越大规模越大，上方金色短条是造船厂等级（▮▮▮ 才能造盖伦帆船与巡防舰）。悬停看详情，<kbd>📖 名录</kbd> 可按海域、规模、造船厂、商品利润筛选排序，点「前往」直接出航。</p>
  <p><b>航行</b>：点击港口出航，途中可改航向。<kbd>⌖ 船队</kbd> 回到船上，<kbd>▶</kbd> 快进。每天消耗补给 = 船员数 ÷ 20，远洋要备足或中途补给。</p>
  <p><b>海上遇到船</b>：海面上的小船是各势力的商队、护航队、渔船和海盗，旗色代表阵营。靠近会触发遭遇，可以打招呼、海上交易、打听行情、雇佣护航、索要通行费、威慑劝降或开战。航行中点 <kbd>🚩 招呼</kbd> 可主动搭话。每种选择都会改变你与该势力的关系。</p>
  <p><b>委托</b>：每个港口的委托板每 20 天换一批运货、采购、剿匪、快航的短期活计，有时限有报酬，完成还给海域份额。</p>
  <p><b>贸易</b>：每个港口有「特产」（约 55% 基准价）和「紧缺」（约 170% 基准价）。低买高卖，注意货舱容量与补给占位。大量买卖会影响当地价格，跨月逐步恢复。</p>
  <p><b>事件</b>：航程中点会遇到风暴、海盗、顺风、漂流物、热病，或与对手商会船队相遇（可选择攻击）。</p>
  <p><b>势力份额</b>：投资港口、在该海域卖货、完成委托、击败对手商会船队（+6）都能提升份额。主导海域每月有收益并有进货折扣。三家对手商会每月也在扩张。在 10 个海域中主导 6 个即获胜。</p>
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
  const to = port(pid), z = zone(to.zone);
  const route = map.planRoute(pid);
  const days = Math.max(1, Math.ceil(route.length / g.dayDistance()));
  const km = geo.greatCircleKm(geo.unprojLon(S.ship.x), geo.unprojLat(S.ship.y), to.lon, to.lat);
  const need = days * g.dailySupply();
  const low = g.crewShortage();
  const checks = [];
  const add = (lv, t, d) => checks.push({ lv, t, d });
  if (low.length) add(S.dest ? 'warn' : 'bad', '船员', `${low.map(s => s.name).join('、')} 不足满员 20%，${S.dest ? '航速受损' : '无法出航，请先到酒馆招募'}`);
  else if (S.fleet.some(sh => sh.crew < T(sh).crew * 0.5)) add('warn', '船员', '部分船只半数以下人手，战斗与接舷吃亏');
  else add('ok', '船员', `共 ${g.totalCrew()} 人，各船人手充足`);
  if (S.supplies >= need) add('ok', '补给', `${S.supplies} / 需要约 ${need}（日耗 ${g.dailySupply()}）`);
  else if (S.supplies >= need * 0.7) add('warn', '补给', `${S.supplies} / 需要约 ${need}，勉强够，建议补到 ${need + g.dailySupply() * 3}`);
  else add('bad', '补给', `只有 ${S.supplies}，需要约 ${need}。撑到第 ${Math.max(1, Math.floor(S.supplies / g.dailySupply()))} 天断粮，之后 ${g.HUNGER_GRACE} 天半口粮，再往后每天减员`);
  const hurt = S.fleet.filter(sh => sh.hp < T(sh).hp * 0.5);
  if (hurt.length) add('warn', '船体', `${hurt.map(x => x.name).join('、')} 耐久不足一半，遇上海盗很危险`);
  else add('ok', '船体', '各船耐久良好');
  const due = C.activeContracts().filter(c => C.daysLeft(c) < days + (c.to === pid ? 0 : 6));
  if (due.length) add('warn', '委托', due.map(c => `${c.label.slice(0, 18)}… 剩 ${C.daysLeft(c)} 天`).join('；'));
  const qp = hooks.questPorts();
  if (qp.has && qp.has(pid)) add('ok', '任务', '这里有任务或委托目标');
  if (S.weather && S.weather.type === 'storm') add('warn', '天候', `风暴中（还有 ${S.weather.days} 天），航速只有 72%`);
  const space = g.freeSpace();
  add(space > 0 ? 'ok' : 'warn', '货舱', `空舱 ${space} / ${g.capacity()}${space === 0 ? '，到港前无法再装货' : ''}`);
  const ICON = { ok: '<span class="good">✓</span>', warn: '<span class="warn">⚠</span>', bad: '<span class="bad">✖</span>' };
  const warn = `<div class="card" style="margin-top:6px"><b>出航前检查</b>${checks.map(c => `<div class="row" style="margin-top:4px;align-items:flex-start"><span style="width:18px">${ICON[c.lv]}</span><span style="width:40px" class="muted">${c.t}</span><span style="flex:1;font-size:12px" class="${c.lv === 'bad' ? 'bad' : c.lv === 'warn' ? 'warn' : ''}">${c.d}</span></div>`).join('')}</div>`;
  showModal(`<h2>${S.dest ? '改变航向 → ' : '前往 '}${to.name}</h2>
    <p>${S.dest ? '当前位置' : port(S.pos).name} → ${to.name}（${z.name}） · 直线 <b>${fmt(km)}</b> km · 实际航程约 <b>${days}</b> 天 · 航速 ${g.fleetSpeed()}</p>
    <p class="muted" style="font-size:12px">${['', '小港', '中港', '大港'][to.tier]} · 造船厂 ${'▮'.repeat(to.yard)}${'▯'.repeat(3 - to.yard)}（${to.yard >= 3 ? '可造全部船型' : to.yard === 2 ? '可造大商船' : '仅小型船'}）</p>
    <p>预计消耗补给 ${need}（现有 ${S.supplies}）· 特产：${to.produce.map(x => G[x].name).join('、')} · 紧缺：${to.demand.map(x => G[x].name).join('、')}</p>
    ${warn}
    <div class="row"><button class="btn primary" data-a="sail" data-pid="${pid}" ${low.length && !S.dest ? 'disabled' : ''}>${S.dest ? '改变航向' : '出航'}</button>${!S.dest && S.supplies < need ? `<button class="btn" data-a="sailSup" data-pid="${pid}" data-q="${Math.min(g.freeSpace(), need + g.dailySupply() * 3 - S.supplies)}">补足补给（${fmt(Math.min(g.freeSpace(), need + g.dailySupply() * 3 - S.supplies) * g.SUPPLY_PRICE)}）</button>` : ''}<button class="btn" data-a="closeModal">取消</button></div>`);
}
function sail(pid) {
  const to = port(pid); closeModal(); flash(); map.setMode('sea'); audio.sfx('sail');
  g.log(S.dest ? `船队改变航向，前往 ${to.name}。` : `从 ${port(S.pos).name} 启航前往 ${to.name}，预计 ${g.voyageDays(pid)} 天。`);
  map.startVoyage(pid); S.tab = 'port'; render();
}
function arrive(pid) {
  flash(); map.setMode('port'); audio.sfx('bell'); S.escorted = false; C.contractEvent('arrive', { pid }); g.remember(pid); g.log(`抵达 ${port(pid).name}。`, 'good');
  S.tab = 'port'; S.ptab = 'market'; Q.questEvent('arrive', { pid }); g.save(true); render();
}

/* ========= 航行事件 ========= */
function rollEvent(to, done) {
  const r = Math.random();
  if (r < 0.42) { done(0); return; }
  if (r < 0.58) {
    const sh = pick(S.fleet); const dmg = Math.round(T(sh).hp * rand(0.1, 0.3)); sh.hp -= dmg;
    const extra = randInt(1, 2); let txt = `风暴袭来，${sh.name} 受损 ${dmg} 点，船队被迫绕行，航程延长 ${extra} 天。`;
    if (sh.hp <= 0) { if (S.fleet.length > 1) { S.fleet.splice(S.fleet.indexOf(sh), 1); g.loseCargoFor(sh); txt += ` ${sh.name} 在风暴中沉没！`; } else { sh.hp = 1; txt += ' 船体几近解体，勉强保住。'; } }
    g.setWeather('storm', randInt(1, 2)); audio.sfx('thunder'); g.log(txt, 'bad'); showEvent('风暴', txt, () => done(extra)); return;
  }
  if (r < 0.72) { g.log('顺风顺水，船队跑得飞快。', 'good'); S.supplies += 3; showEvent('顺风', `信风鼓满帆面，船队一路顺畅，还省下了几天口粮（补给 +3）。`, () => done(0)); return; }
  if (r < 0.86) {
    const gd = pick(GOODS); const q = Math.min(g.freeSpace(), randInt(3, 15));
    if (q > 0) { S.cargo[gd.id] = (S.cargo[gd.id] || 0) + q; g.log(`捞起遇难船只的漂流货箱：${gd.name} ×${q}。`, 'good'); showEvent('漂流物', `海面上漂着遇难船的货箱，你的船员捞起了 ${gd.name} ×${q}。`, () => done(0)); }
    else { const gold = randInt(100, 400); S.gold += gold; g.log(`捞起一只漂流钱箱，获得 ${gold} 金币。`, 'good'); showEvent('漂流物', `海面上漂着一只钱箱，里面有 ${gold} 金币。`, () => done(0)); }
    return;
  }
  const sh = pick(S.fleet); const loss = Math.max(1, Math.floor(sh.crew * 0.1)); sh.crew = Math.max(1, sh.crew - loss);
  g.log(`${sh.name} 爆发热病，${loss} 名船员病故。`, 'bad');
  showEvent('热病', `${sh.name} 上爆发热病，${loss} 名船员病故。船医建议下次多备药材。`, () => done(0));
}

/* ========= 海战：六角格场景 + 侧栏 HUD ========= */
function renderBattle() {
  if (!B) return;
  if (!map.battle.active) { closeModal(); map.setMode('battle'); map.battle.begin(); }
  render();
}
function renderBattleHUD() {
  const eName = B.npc ? N.FACTION_LABEL[B.npc.faction] + '船队' : B.kind === 'pirate' ? '海盗船队' : rival(B.rivalId).name + '船队';
  const eCap = B.kind === 'pirate' ? CHARS.barro : CHARS[RIVAL_REP[B.rivalId]] || CHARS.barro; const myCap = captain();
  const bar = (hp, max) => `<div class="hpbar"><i style="width:${clamp(hp / max * 100, 0, 100)}%;background:${hp / max < 0.3 ? 'var(--bad)' : 'var(--good)'}"></i></div>`;
  const units = (B.units || []).filter(u => u.side === 'p');
  const inRange = sel => {
    if (!sel || sel.acted) return '';
    const es = (B.units || []).filter(u => u.side === 'e' && u.ref.hp > 0 && hexDist(sel, u) <= RANGE);
    if (!es.length) return `<p class="muted" style="font-size:12px">射程内无敌船（射程 ${RANGE} 格），先移动靠近。</p>`;
    return es.map(e => { const d = hexDist(sel, e); return `<div class="row" style="margin:4px 0"><span style="font-size:12px"><b class="bad">${e.ref.name}</b> <span class="muted">距离 ${d}</span></span><button class="btn sm primary" data-a="bfireAt" data-e="${e.id}">炮击</button><button class="btn sm" data-a="bboardAt" data-e="${e.id}" ${d === 1 ? '' : 'disabled'}>接舷</button></div>`; }).join('');
  };
  const mine = units.map((u, i) => { const s = u.ref, max = T(s).hp, sel = B.sel === u;
    return `<div class="bship ${s.hp <= 0 ? 'dead' : ''} ${sel ? 'sel' : ''}" data-a="bsel" data-i="${i}" style="cursor:pointer"><b>${sel ? '▶ ' : ''}${s.name}</b> <span class="muted">${SHIP_TYPES[s.type].name}</span>${s.hp > 0 && u.acted ? '<span class="badge low" style="float:right">已行动</span>' : s.hp > 0 && u.moved ? '<span class="badge" style="float:right;color:var(--muted);border-color:var(--muted)">已移动</span>' : ''}
      ${bar(s.hp, max)}<small class="muted">耐久 ${Math.max(0, s.hp)}/${max} · 火炮 ${s.cannons} · 船员 ${s.crew}</small></div>`; }).join('');
  const theirs = B.enemy.map(s => `<div class="bship ${s.hp <= 0 ? 'dead' : ''}"><b>${s.name}</b> <span class="muted">${SHIP_TYPES[s.type].name}</span>${bar(s.hp, s.maxHp)}<small class="muted">耐久 ${Math.max(0, s.hp)}/${s.maxHp} · 火炮 ${s.cannons} · 船员 ${s.crew}</small></div>`).join('');
  const logs = B.log.slice(-10).map(l => `<div class="${l.cls}">${l.msg}</div>`).join('');
  let ctl = '';
  if (B.over) ctl = `<div class="card"><b class="${B.result === 'win' ? 'good' : B.result === 'lose' ? 'bad' : 'warn'}">${B.result === 'win' ? '★ 战斗胜利' : B.result === 'lose' ? '✖ 船队全灭' : '↩ 成功撤离'}</b><div class="row" style="margin-top:8px"><button class="btn primary" data-a="battleDone">${B.result === 'lose' ? '重整旗鼓' : '继续航行'}</button></div></div>`;
  else if (B.phase !== 'player') ctl = `<div class="card"><b class="warn">敌方行动中…</b></div>`;
  else {
    const sel = B.sel; const mr = sel ? moveRange(sel) : 0; const tgt = B.target;
    ctl = `<div class="card"><b>${sel ? sel.ref.name : '选择一艘船'}</b> ${sel ? `<span class="muted">移动 ${mr} 格 · 射程 ${RANGE} 格 · ${sel.moved ? '已移动' : '可移动'} · ${sel.acted ? '已行动' : '可行动'}</span>` : ''}
      ${tgt ? `<p>目标 <b class="bad">${tgt.ref.name}</b>（距离 ${hexDist(sel, tgt)} 格）</p><div class="row"><button class="btn primary" data-a="bfire">炮击</button><button class="btn" data-a="bboard" ${hexDist(sel, tgt) === 1 ? '' : 'disabled'}>接舷${hexDist(sel, tgt) === 1 ? '' : '（需相邻）'}</button><button class="btn" data-a="bcancel">取消</button></div>`
        : `${inRange(sel)}<p class="muted" style="font-size:12px">点绿色格子移动，点红圈敌船或用上方按钮攻击。</p><div class="row"><button class="btn" data-a="bwait" ${sel ? '' : 'disabled'}>待机</button><button class="btn" data-a="bend">结束回合</button><button class="btn danger" data-a="bflee">撤退（约 ${Math.round(g.fleeChance() * 100)}%）</button></div>`}
    </div>`;
  }
  return `<h2>海战 · ${eName}</h2><div class="vs"><div class="bust-wrap still">${bust(myCap, 64)}</div><div><b>${myCap.name}</b><br><span class="muted" style="font-size:12px">${myCap.title}</span></div><span class="vsx">VS</span><div style="text-align:right"><b>${eCap.name}</b><br><span class="muted" style="font-size:12px">${eCap.title}</span></div><div class="bust-wrap flip still">${bust(eCap, 64)}</div></div>
    <p class="muted" style="font-size:12px">第 ${B.round} 回合 · ${B.over ? '战斗结束' : B.phase === 'player' ? '我方行动' : '敌方行动'}</p>${ctl}
    <h3>我方船只</h3>${mine}<h3>${eName}</h3>${theirs}<div class="blog" id="blog">${logs}</div>`;
}

/* ========= 地图上的港口浮动提示 ========= */
function showPortTip(pid) {
  let el = document.getElementById('porttip');
  if (!pid) { if (el) el.style.display = 'none'; return; }
  if (!el) { el = document.createElement('div'); el.id = 'porttip'; document.getElementById('mapwrap').appendChild(el); }
  const p = port(pid), known = !!S.mem[pid];
  const TIER = ['', '小港', '中港', '大港'];
  const days = Math.max(1, Math.ceil(Math.hypot(geo.projX(p.lon) - S.ship.x, geo.projY(p.lat) - S.ship.y) / g.dayDistance()));
  const km = geo.greatCircleKm(geo.unprojLon(S.ship.x), geo.unprojLat(S.ship.y), p.lon, p.lat);
  el.innerHTML = `<b>${p.name}</b> <span class="muted">${p.nameEn}</span><br>
    <span style="color:${zone(p.zone).color}">${zone(p.zone).name}</span> · ${TIER[p.tier]} · 造船厂 <span class="gold">${'▮'.repeat(p.yard)}</span>${'▯'.repeat(3 - p.yard)}<br>
    ${fmt(km)} km · 约 ${days} 天<br>
    ${known ? `<span class="good">产</span> ${p.produce.map(x => G[x].name).join('、')}　<span class="bad">缺</span> ${p.demand.map(x => G[x].name).join('、')}` : '<span class="muted">尚未到访</span>'}`;
  el.style.display = 'block';
}

/* ========= 海上遭遇：多选项互动 ========= */
let enc = null;
const FACE = { whale: 'alice', redsail: 'hector', goldsand: 'salim', pirate: 'barro', free: 'qian' };
function showEncounter(n, mode) {
  enc = { n, mode };
  const c = CHARS[FACE[n.faction]] || CHARS.qian;
  const r = N.rep(n.faction), pr = N.powerRatio(n);
  const powerTxt = pr > 1.5 ? '<span class="good">我方占优</span>' : pr > 0.75 ? '<span class="warn">势均力敌</span>' : '<span class="bad">对方更强</span>';
  const opts = N.encounterOptions(n, mode);
  const hail = mode === 'ambush'
    ? `<p data-tw>“${n.faction === 'pirate' ? '把货交出来，或者喂鱼！' : '站住！这片海是我们的。'}”对方升起了战旗，正朝你逼近。</p>`
    : `<p data-tw>海面上遇到一支${N.npcTitle(n)}。${N.npcDesc(n)}</p>`;
  showModal(`<div class="npc big"><div class="bust-wrap">${bust(c, 128)}</div><div><h2>${mode === 'ambush' ? '遭遇拦截' : '海上相遇'} · ${N.npcTitle(n)}</h2>
    <p class="muted" style="font-size:12px;margin-top:-4px">关系 ${N.repLabel(r)}（${r > 0 ? '+' : ''}${r}） · 实力 ${powerTxt}</p>${hail}</div></div>
    <div class="tw-actions">${opts.map(o => `<div class="encopt"><button class="btn ${o.kind === 'fight' ? 'danger' : o.kind === 'leave' ? '' : 'primary'}" data-a="encOpt" data-o="${o.id}" ${o.disabled ? 'disabled' : ''}>${o.label}</button><span class="muted" style="font-size:11px">${o.hint || ''}</span></div>`).join('')}</div>`);
}
function encResult(text, back) {
  const n = enc.n; const c = CHARS[FACE[n.faction]] || CHARS.qian;
  showModal(`<div class="npc big"><div class="bust-wrap">${bust(c, 128)}</div><div><h2>${N.npcTitle(n)}</h2><p data-tw>${text.replace(/\n/g, '<br>')}</p></div></div>
    <div class="row tw-actions"><button class="btn primary" data-a="${back ? 'encBack' : 'encDone'}">${back ? '返回' : '继续航行'}</button></div>`);
}
function encTrade(t) {
  const n = enc.n;
  const spaceLeft = g.freeSpace();
  const maxQ = Math.min(t.qty, spaceLeft, Math.floor(Math.max(0, S.gold) / t.unit));
  showModal(`<h2>海上交易 · ${N.npcTitle(n)}</h2>
    <p>对方出售 <b>${G[t.good].name}</b> ×${t.qty}，开价 <b class="gold">${t.unit}</b> 金币/件${t.unit < g.price(port(S.pos), t.good) ? '（低于行情）' : ''}。</p>
    <p class="muted" style="font-size:12px">你的金币 ${fmt(S.gold)} · 空舱 ${spaceLeft} · 最多可买 ${maxQ}</p>
    <div class="row">${[1, 5, 10, 25].map(q => `<button class="btn" data-a="encBuy" data-q="${q}" ${maxQ < q ? 'disabled' : ''}>买 ${q}</button>`).join('')}
    <button class="btn primary" data-a="encBuy" data-q="${maxQ}" ${maxQ <= 0 ? 'disabled' : ''}>买满 ${maxQ}</button>
    <button class="btn" data-a="encBack">返回</button></div>`);
  enc.trade = t;
}
function encSupply(sp) {
  const n = enc.n;
  const maxQ = Math.min(sp.qty, g.freeSpace(), Math.floor(Math.max(0, S.gold) / sp.unit));
  const needDays = S.dest ? g.voyageLeft() : 6;
  const want = Math.min(maxQ, Math.max(0, needDays * g.dailySupply() + 6 - S.supplies));
  showModal(`<h2>海上补给 · ${N.npcTitle(n)}</h2>
    <p>对方愿意匀出 <b>${sp.qty}</b> 单位补给，开价 <b class="gold">${sp.unit}</b> 金币/单位（港口 ${g.SUPPLY_PRICE}）。</p>
    <p class="muted" style="font-size:12px">你的补给 ${S.supplies} · 日耗 ${g.dailySupply()} · 还剩约 ${needDays} 天航程 · 空舱 ${g.freeSpace()} · 最多可买 ${maxQ}</p>
    <div class="row">${[10, 30, 60].map(q => `<button class="btn" data-a="encSup" data-q="${q}" ${maxQ < q ? 'disabled' : ''}>买 ${q}</button>`).join('')}
    ${want > 0 ? `<button class="btn primary" data-a="encSup" data-q="${want}">买够到港（${want}）</button>` : ''}
    <button class="btn" data-a="encSup" data-q="${maxQ}" ${maxQ <= 0 ? 'disabled' : ''}>买满 ${maxQ}</button>
    <button class="btn" data-a="encBack">返回</button></div>`);
  enc.supply = sp;
}
function encFinish() {
  const e = enc; enc = null; closeModal(); render();
  if (e && e.after) e.after();
}

/* ========= 港口名录 ========= */
let dirSort = 'dist', dirZone = 'all', dirGood = '';
function portDirectory() {
  const here = { x: S.ship.x, y: S.ship.y };
  const rows = PORTS.map(p => {
    const known = !!S.mem[p.id];
    const d = Math.round(geo.greatCircleKm(geo.unprojLon(here.x), geo.unprojLat(here.y), p.lon, p.lat));
    const days = Math.max(1, Math.ceil(Math.hypot(geo.projX(p.lon) - here.x, geo.projY(p.lat) - here.y) / g.dayDistance()));
    let best = null;
    let per = 0;
    if (dirGood && known && S.mem[p.id].prices[dirGood] != null) {
      best = S.mem[p.id].prices[dirGood];
      per = (g.sellFromSpot(p, best) - g.buyPrice(port(S.pos), dirGood)) / days;
    }
    return { p, known, d, days, best, per };
  });
  const filtered = rows.filter(r => (dirZone === 'all' || r.p.zone === dirZone));
  filtered.sort((a, b) => dirSort === 'dist' ? a.d - b.d
    : dirSort === 'tier' ? (b.p.tier - a.p.tier) || (a.d - b.d)
    : dirSort === 'yard' ? (b.p.yard - a.p.yard) || (a.d - b.d)
    : dirSort === 'price' ? ((b.per ?? -99) - (a.per ?? -99)) || ((b.best ?? -1) - (a.best ?? -1))
    : a.p.name.localeCompare(b.p.name));
  const TIER = ['', '小港', '中港', '大港'];
  const body = filtered.map(r => {
    const p = r.p;
    const prod = p.produce.map(x => G[x].name).join('、'), dem = p.demand.map(x => G[x].name).join('、');
    return `<tr class="${r.known ? '' : 'muted'}">
      <td><b>${p.name}</b><br><span class="muted" style="font-size:10px">${p.nameEn}</span></td>
      <td style="color:${zone(p.zone).color}">${zone(p.zone).name}</td>
      <td class="r">${TIER[p.tier]}</td>
      <td class="r"><span class="gold">${'▮'.repeat(p.yard)}</span>${'▯'.repeat(3 - p.yard)}</td>
      <td class="r">${fmt(r.d)} km<br><span class="muted">约 ${r.days} 天</span></td>
      <td style="white-space:normal;max-width:150px">${r.known ? `<span class="good">产</span> ${prod}<br><span class="bad">缺</span> ${dem}` : '<span class="muted">未到访</span>'}</td>
      ${dirGood ? `<td class="r">${r.best != null ? `${r.best}<br><span class="${r.per > 0 ? 'good' : 'muted'}" style="font-size:10px">${r.per > 0 ? '+' + r.per.toFixed(1) + '/天' : '不划算'}</span>` : '<span class="muted">-</span>'}</td>` : ''}
      <td><button class="btn sm" data-a="dirGo" data-pid="${p.id}" ${p.id === S.pos && !S.dest ? 'disabled' : ''}>前往</button></td></tr>`;
  }).join('');
  showModal(`<h2>港口名录 <span class="muted" style="font-size:12px">共 ${PORTS.length} 港 · 已到访 ${Object.keys(S.mem).length}</span></h2>
    <div class="row" style="margin-bottom:6px"><span class="muted" style="font-size:12px">海域</span>
      <button class="btn sm ${dirZone === 'all' ? 'active' : ''}" data-a="dirZone" data-z="all">全部</button>
      ${ZONES.map(z => `<button class="btn sm ${dirZone === z.id ? 'active' : ''}" data-a="dirZone" data-z="${z.id}">${z.name}</button>`).join('')}</div>
    <div class="row" style="margin-bottom:6px"><span class="muted" style="font-size:12px">排序</span>
      ${[['dist', '距离'], ['tier', '规模'], ['yard', '造船厂'], ['name', '名称'], ['price', '所选商品利润']].map(([k, n]) => `<button class="btn sm ${dirSort === k ? 'active' : ''}" data-a="dirSort" data-s="${k}">${n}</button>`).join('')}</div>
    <div class="row" style="margin-bottom:8px"><span class="muted" style="font-size:12px">商品</span>
      <button class="btn sm ${dirGood ? '' : 'active'}" data-a="dirGood" data-g="">不筛选</button>
      ${GOODS.map(gd => `<button class="btn sm ${dirGood === gd.id ? 'active' : ''}" data-a="dirGood" data-g="${gd.id}">${gd.name}</button>`).join('')}</div>
    <div class="scroll" style="max-height:52vh;overflow:auto"><table><thead><tr><th>港口</th><th>海域</th><th class="r">规模</th><th class="r">造船厂</th><th class="r">距离</th><th>特产 / 紧缺</th>${dirGood ? '<th class="r">已知价 / 每天</th>' : ''}<th></th></tr></thead><tbody>${body}</tbody></table></div>
    <p class="muted" style="font-size:11px">造船厂等级决定能买到的最大船型：▮▮▮ 可造全部船型。「已知价」来自到访记录与情报，右下角是以当前港买价估算的每件每天利润。</p>
    <div class="row"><button class="btn" data-a="closeModal">关闭</button></div>`);
}



/** 某商品在已知港口中的最佳去处：{p, price, profit, days, perDay} */
function bestMarket(gid, fromPid = S.pos) {
  const here = port(fromPid); const cost = g.buyPrice(here, gid);
  let best = null;
  for (const pid in S.mem) {
    if (pid === fromPid) continue;
    const pr = S.mem[pid].prices[gid]; if (pr == null) continue;
    const p = port(pid);
    const sell = g.sellFromSpot(p, pr);
    const days = Math.max(1, Math.ceil(Math.hypot(geo.projX(p.lon) - geo.projX(here.lon), geo.projY(p.lat) - geo.projY(here.lat)) / g.dayDistance()));
    const profit = sell - cost;
    const perDay = profit / days;
    if (profit > 0 && (!best || perDay > best.perDay)) best = { p, price: sell, profit, days, perDay };
  }
  return best;
}

/* ========= 港口委托板 ========= */
function renderBoard(p) {
  const list = C.boardFor(p.id);
  const act = C.activeContracts();
  const KIND = { deliver: '运货', procure: '采购', bounty: '剿匪', express: '快航' };
  const card = c => {
    const taken = C.isTaken(c.id);
    const cl = CHARS[c.client] || CHARS.qian;
    return `<div class="card"><div class="row"><span class="badge ${c.kind === 'bounty' ? 'high' : 'low'}">${KIND[c.kind]}</span><b>${c.label}</b>
      <span class="spacer"></span><span class="gold">${fmt(c.reward)} 金币</span></div>
      <div class="row" style="margin-top:2px"><span class="muted" style="font-size:11px">${cl.name}：“${c.flavor}”</span></div>
      <div class="row" style="margin-top:6px"><button class="btn sm ${taken ? '' : 'primary'}" data-a="ctAccept" data-c="${c.id}" ${taken ? 'disabled' : ''}>${taken ? '已接下' : '接受委托'}</button>
      <span class="muted" style="font-size:11px">${c.days} 天内完成${c.kind === 'deliver' ? `，需要 ${c.qty} 格空舱 · 货物由委托方装船，途中不可变卖` : ''}${c.kind === 'procure' ? '，货要自己从产地运来' : ''}</span></div></div>`;
  };
  const mine = act.length ? act.map(c => `<div class="card"><div class="row"><span class="badge ${C.daysLeft(c) <= 3 ? 'high' : 'low'}">剩 ${C.daysLeft(c)} 天</span><b>${c.label}</b><span class="spacer"></span><span class="gold">${fmt(c.reward)}</span></div>
      <div class="row" style="margin-top:4px"><span class="muted" style="font-size:11px">进度 ${C.progressText(c)}${c.to !== p.id ? ` · 交付地 ${port(c.to).name}` : ''}</span><span class="spacer"></span><button class="btn sm danger" data-a="ctQuit" data-c="${c.id}">放弃</button></div></div>`).join('') : '<p class="muted" style="font-size:12px">还没有接下的委托。</p>';
  return `${npcCard('cen', `本港的委托每 ${C.PERIOD} 天换一批，先到先得。`)}
    <h3>本港委托</h3>${list.map(card).join('')}
    <h3>进行中（${act.length}/5）</h3>${mine}`;
}

/* ========= 侧栏 ========= */
export function render() { Q.ensureQuestState(); C.ensureContracts(); Q.checkQuests(); renderTop(); renderTabs(); renderPanel(); renderMapCtl(); guidance(); if (map) { map.refreshPorts(); if (map.port) map.port.refreshMarkers(); } Q.flushDialogues(); }
function guidance() {
  const el = document.getElementById('guide'); if (!el) return;
  let txt = '', cls = '';
  const act = C.activeContracts().filter(c => C.daysLeft(c) <= 3);
  const ready = Q.QUESTS.filter(q => Q.qStatus(q.id) === 'ready');
  const nm = Q.nextMain();
  if (S.supplies < g.dailySupply() * 4 && !S.dest) { txt = `补给只剩 ${S.supplies}，在市场补满再出航`; cls = 'bad'; }
  else if (act.length) { txt = `委托「${act[0].label}」只剩 ${C.daysLeft(act[0])} 天`; cls = 'warn'; }
  else if (ready.length) { txt = `「${ready[0].title}」可交付 → ${port(ready[0].turnIn).name}`; cls = 'gold'; }
  else if (nm && Q.qStatus(nm.id) === 'active') { const o = nm.objectives.find((_, i) => !Q.objDone(nm, i)); txt = `主线「${nm.title}」：${o ? o.label : '前往交付'}`; cls = 'gold'; }
  else if (nm && Q.prereqMet(nm)) { txt = `下一章「${nm.title}」：${nm.port ? `前往 ${port(nm.port).name}` : '停靠任意港口即可开启'}`; cls = 'gold'; }
  else if (!S.dest) { txt = '打开 📖 名录挑一个港口，或在委托板接活'; cls = 'muted'; }
  else txt = `航行中 → ${port(S.dest).name}`;
  el.className = cls; el.textContent = txt ? '▸ ' + txt : '';
  el.style.display = txt ? 'block' : 'none';
}
function renderMapCtl() {
  const el = document.getElementById('mapctl'); if (!el || !map) return;
  if (B) { el.innerHTML = ''; return; }
  const zoomBtns = `<button class="btn" data-a="zoomOut" title="缩小">−</button><button class="btn" data-a="zoomIn" title="放大">＋</button><button class="btn" data-a="fitWorld" title="全图">🌍</button>`;
  const dirBtn = `<button class="btn" data-a="directory" title="港口名录">📖 名录</button><button class="btn" data-a="legend" title="图例">？</button>`;
  if (S.dest) el.innerHTML = `<button class="btn" data-a="hailNpc" title="向附近船只招呼">🚩 招呼</button>${dirBtn}<button class="btn" data-a="recenter" title="镜头回到船队">⌖ 船队</button><button class="btn" data-a="speed" id="speedbtn" title="航行速度">▶ ${map.speedMul}×</button>${zoomBtns}`;
  else if (map.mode === 'port') el.innerHTML = `${dirBtn}<button class="btn primary" data-a="seaMap">⛵ 出海 · 海图</button>`;
  else el.innerHTML = `${dirBtn}<button class="btn" data-a="backPort">⚓ 回港</button><button class="btn" data-a="recenter" title="镜头回到船队">⌖ 船队</button>${zoomBtns}`;
}
let lastGold = null;
export function resetGoldTween() { lastGold = null; }
function renderTop() {
  const p = port(S.pos); const cap = captain();
  const wi = g.WEATHER_ICON[S.weather?.type || 'clear'];
  const status = S.dest ? `航行中 → <b>${port(S.dest).name}</b>（第 ${S.voyage.days + 1} 天，约剩 ${g.voyageLeft()} 天）${wi}` : `停泊 <b>${p.name}</b>（${zone(p.zone).name}）${wi}`;
  document.getElementById('top').innerHTML = `<span class="title">沧海纪</span>
    <span class="cap">${portrait(cap, 28)}<b>${cap.name}</b></span>
    <span class="stat">金币 <b id="goldv" class="${S.gold < 0 ? 'bad' : 'gold'}">${fmt(S.gold)}</b></span>
    <span class="stat">${g.dateStr()}</span>
    <span class="stat">${status}</span>
    <span class="stat">船队 <b>${S.fleet.length}</b> 艘 · 航速 ${g.fleetSpeed()}</span>
    <span class="stat">主导 <b class="gold">${ZONES.filter(z => S.share[z.id].player >= 50).length}/${VICTORY_ZONES}</b></span>
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
export const TABS = [['port', '港口'], ['quest', '任务'], ['fleet', '船队'], ['share', '势力'], ['journal', '航海志']];
function renderTabs() { if (B) { document.getElementById('tabs').innerHTML = `<button class="active">⚔ 海战</button>`; return; } document.getElementById('tabs').innerHTML = TABS.map(([id, n]) => `<button class="${S.tab === id ? 'active' : ''}" data-a="tab" data-tab="${id}">${n}</button>`).join(''); }
function renderPanel() {
  const el = document.getElementById('panel');
  if (B) { el.innerHTML = renderBattleHUD(); const bl = document.getElementById('blog'); if (bl) bl.scrollTop = bl.scrollHeight; return; }
  if (S.tab === 'port') el.innerHTML = S.dest ? renderAtSea() : renderPort();
  else if (S.tab === 'quest') el.innerHTML = renderQuests();
  else if (S.tab === 'fleet') el.innerHTML = renderFleet();
  else if (S.tab === 'share') el.innerHTML = renderShare();
  else el.innerHTML = renderJournal();
}
function renderAtSea() {
  const to = port(S.dest); const v = S.voyage;
  return `<h2>航行中</h2>${npcCard('ahai', pick(['风向不错，保持航向！', '瞭望手说前方海面平静。', '船长，补给还够撑几天，别绕远路。', '再点一个港口就能改航向，随你吩咐。']))}
    <div class="card"><b>目的地</b> ${to.name}（${zone(to.zone).name}）<br><span class="muted">已航行 ${v.days} 天 · 约剩 ${g.voyageLeft()} 天 · 特产：${to.produce.map(x => G[x].name).join('、')} · 紧缺：${to.demand.map(x => G[x].name).join('、')}</span></div>
    <div class="card"><b>补给</b> <span class="${S.supplies < g.dailySupply() * 3 ? 'bad' : 'muted'}">现有 ${S.supplies} · 日耗 ${g.dailySupply()} · 还够 ${Math.floor(S.supplies / g.dailySupply())} 天</span>
      ${S.hunger > 0 ? `<p class="bad" style="font-size:12px;margin:4px 0 0">断粮第 ${S.hunger} 天，全队半口粮、航速 −1。${S.hunger <= g.HUNGER_GRACE ? `还有 ${g.HUNGER_GRACE - S.hunger + 1} 天开始减员。` : '正在减员！'}按 🚩 招呼渔船或商船可以在海上买粮。</p>` : ''}</div>
    <div class="card"><b>镜头与速度</b><div class="row" style="margin-top:6px"><button class="btn" data-a="recenter">⌖ 回到船队</button><button class="btn" data-a="speed">▶ ${map.speedMul}× 航速</button><button class="btn primary" data-a="skip">⏩ 跳到下一事件</button></div>
      <p class="muted" style="font-size:12px">「跳到下一事件」会一路推进到触发航海事件、遇上船队或抵港为止，天数、补给与天气照常结算。拖动海图可查看远处；点击其他港口可改变航向。</p></div>`;
}
function renderPort() {
  const p = port(S.pos), z = zone(p.zone); const leader = g.zoneLeader(z.id);
  const sub = [['market', '市场'], ['yard', '造船厂'], ['tavern', '酒馆'], ['board', '委托'], ['invest', '投资']];
  let html = `<h2>${p.name} <span class="muted" style="font-size:13px">${z.name} · 造船厂等级 ${p.yard} · 发展度 ${S.dev[p.id].toFixed(1)}</span></h2>
    <p class="muted" style="font-size:12px">海域主导：<span style="color:${FACTION_COLOR[leader]}">${FACTION_NAME[leader]}</span>（${S.share[z.id][leader].toFixed(1)}%）${g.dominated(z.id) ? ' · <span class="good">你享有 8% 进货折扣</span>' : ''}</p>
    <div class="subtabs">${sub.map(([id, n]) => `<button class="btn ${S.ptab === id ? 'active' : ''}" data-a="ptab" data-ptab="${id}">${n}</button>`).join('')}</div>`;
  if (S.ptab !== 'board') html += npcCard({ market: 'qian', yard: 'mu', tavern: 'hong', invest: 'cen' }[S.ptab] || 'qian', g.npcLine(S.ptab === 'board' ? 'invest' : S.ptab, p));
  if (S.ptab === 'board') html += renderBoard(p);
  else if (S.ptab === 'market') html += renderMarket(p);
  else if (S.ptab === 'yard') html += renderYard(p);
  else if (S.ptab === 'tavern') html += renderTavern(p);
  else html += renderInvest(p);
  return html;
}
function renderMarket(p) {
  const rows = GOODS.map(gd => {
    const bp = g.buyPrice(p, gd.id), sp = g.sellPrice(p, gd.id); const ratio = g.price(p, gd.id) / gd.base;
    const have = S.cargo[gd.id] || 0, free = g.sellable(gd.id), held = have - free;
    const tag = p.produce.includes(gd.id) ? '<span class="badge low">特产</span>' : p.demand.includes(gd.id) ? '<span class="badge high">紧缺</span>' : ratio < 0.85 ? '<span class="badge low">偏低</span>' : ratio > 1.25 ? '<span class="badge high">偏高</span>' : '';
    const bm = bestMarket(gd.id);
    // 因果提示：自己的成交把本地价格推到了哪里，以及买满一船的实际均价
    const st = S.stock[p.id][gd.id] || 0;
    const cap = g.maxAffordable(p, gd.id, Math.max(0, S.gold), g.freeSpace());
    const q = g.quote(p, gd.id, cap, 'buy');
    let note = '';
    if (Math.abs(st) >= 1) note = `<span class="${st > 0 ? 'bad' : 'good'}">行情${st > 0 ? '↑' : '↓'}${Math.abs(Math.round(st))}%</span> <span class="muted">近期成交所致，每天回落 1.4%</span>`;
    else if (cap > 0 && q.unit > bp) note = `<span class="muted">买满 ${cap} 件均价 ${q.unit}（+${Math.round((q.unit / bp - 1) * 100)}%）</span>`;
    const holdTxt = have ? `${have}${held ? `<br><span class="muted" style="font-size:10px">${held} 托运</span>` : ''}` : '<span class="muted">-</span>';
    return `<tr><td>${gd.name} ${tag}</td><td class="r">${bp} / <span class="muted">${sp}</span>${note ? `<br><span style="font-size:10px">${note}</span>` : ''}</td><td class="r">${holdTxt}</td>
      <td style="font-size:11px">${bm ? `<span class="good">${bm.p.name}</span> +${bm.profit}<br><span class="muted">${bm.days} 天 · ${bm.perDay.toFixed(1)}/天</span>` : '<span class="muted">—</span>'}</td>
      <td><span class="row nowrap"><button class="btn sm" data-a="buy" data-g="${gd.id}" data-q="1">买1</button><button class="btn sm" data-a="buy" data-g="${gd.id}" data-q="10">买10</button><button class="btn sm" data-a="buy" data-g="${gd.id}" data-q="max">买满</button>
      <button class="btn sm" data-a="sell" data-g="${gd.id}" data-q="10" ${free ? '' : 'disabled'}>卖10</button><button class="btn sm" data-a="sell" data-g="${gd.id}" data-q="all" ${free ? '' : 'disabled'}>全卖</button></span></td></tr>`;
  }).join('');
  return `<div class="card"><div class="row"><b>补给</b> <span class="muted">${g.SUPPLY_PRICE} 金币/单位 · 现有 ${S.supplies} · 日耗 ${g.dailySupply()} · 空舱 ${g.freeSpace()}</span></div>
    <div class="row" style="margin-top:6px"><button class="btn sm" data-a="buySup" data-q="10">+10</button><button class="btn sm" data-a="buySup" data-q="50">+50</button><button class="btn sm" data-a="buySup" data-q="max">买满</button><button class="btn sm" data-a="sellSup" data-q="10">卖10</button></div></div>
    <div class="scroll"><table><thead><tr><th>商品</th><th class="r">买入 / 卖出</th><th class="r">持有</th><th>最佳去处（每件）</th><th>操作</th></tr></thead><tbody>${rows}</tbody></table></div>
    <p class="muted" style="font-size:12px">买卖之间固定有 ${Math.round(g.SPREAD * (1 - g.tradeEdge(p)) * 200)}% 的价差，原地买了再卖必然亏本；成交量越大，均价越吃亏——<b>低买高卖要靠跑距离，不是靠来回刷</b>。价格冲击每天回落约 1.4%，停泊等待也能让行情恢复。<br>「最佳去处」依据你已到访或打听到的行情估算，已计入价差与航程天数。</p>`;
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
  const reps = ['whale', 'redsail', 'goldsand', 'pirate'].map(f => { const v = N.rep(f); const w = (v + 100) / 2;
    return `<div style="margin:4px 0"><span style="font-size:12px">${N.FACTION_LABEL[f]} <span class="muted">${N.repLabel(v)}（${v > 0 ? '+' : ''}${v}）</span></span>
      <div class="bar"><i style="width:${w}%;background:${v >= 25 ? 'var(--good)' : v <= -25 ? 'var(--bad)' : 'var(--gold2)'}"></i></div></div>`; }).join('');
  return `<h2>势力版图</h2><p class="muted" style="font-size:12px">已主导 <b class="gold">${won}/${VICTORY_ZONES}</b>（全图 ${ZONES.length} 个海域） · 每月主导收益 ${fmt(income)} 金币</p>${zones}
    <h3>声望</h3><div class="card">${reps}<p class="muted" style="font-size:11px;margin-top:6px">本港买卖价差 ±${(g.SPREAD * (1 - g.tradeEdge(port(S.pos))) * 100).toFixed(1)}%（声望贡献 ${(g.repEdge(port(S.pos)) * 100).toFixed(0)}% 的收窄幅度）。<br>
      声望不等于份额：份额是地盘（决定胜负），声望是态度（决定价格与海上待遇）。武力夺份额必然压低声望。关系每月会向 0 回归一点。</p></div>${'' /* */}
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
  sailSup: d => { g.buySupplies(d.q); planVoyage(d.pid); },
  buyShip: d => g.buyShip(d.t), sellShip: d => g.sellShip(+d.i), repair: d => g.repair(+d.i), repairAll: () => g.repairAll(),
  addCannon: d => g.addCannon(+d.i, d.q), removeCannon: d => g.removeCannon(+d.i, d.q),
  hire: d => g.hire(+d.i, d.q), dismiss: d => g.dismiss(+d.i, d.q), invest: d => g.invest(d.amt), rest: d => g.rest(+d.d),
  rumor: () => { const r = g.rumor(); if (!r) return; render();
    showModal(`<div class="npc big"><div class="bust-wrap">${bust(CHARS.hong, 136)}</div><div><h2>酒馆情报</h2><p class="muted" style="font-size:12px;margin-top:-4px">红姨 · 酒馆老板娘</p><p data-tw>“${r.p.name}那边的${r.best.name}，这阵子卖到 ${r.pr} 金币上下，${zone(r.p.zone).name}的商人都在往那儿运。这消息值你那 50 个金币吧？”</p></div></div><div class="row tw-actions"><button class="btn primary" data-a="closeModal">谢了</button></div>`); },
  sailTo: d => planVoyage(d.pid), sail: d => sail(d.pid),
  recenter: () => map.recenter(),
  mute: () => { audio.init(); audio.toggleMute(); renderTop(); },
  seaMap: () => { map.setMode('sea'); renderMapCtl(); toast('滚轮缩放，拖动平移，点击港口出航'); },
  zoomIn: () => { map.setZoom(map.zoom * 1.4); renderMapCtl(); },
  zoomOut: () => { map.setZoom(map.zoom / 1.4); renderMapCtl(); },
  fitWorld: () => { map.fitWorld(); renderMapCtl(); },
  directory: () => portDirectory(),
  legend: () => showModal(`<h2>海图图例</h2>
    <table><tbody>
    <tr><td><b>港口图标大小</b></td><td>小港 / 中港 / 大港。大港市场深、货量足、价格波动小。</td></tr>
    <tr><td><b>港口上方金条</b></td><td><span class="gold">▮</span> 造船厂等级：▮ 仅小型船 · ▮▮ 可造大商船 · ▮▮▮ 可造盖伦与巡防舰。灰色表示尚未到访。</td></tr>
    <tr><td><b>港口外圈颜色</b></td><td>该海域主导势力（粗亮 = 已过半）；金圈 = 当前停泊，绿圈 = 当前目的地。</td></tr>
    <tr><td><b>★ 港口名</b></td><td>有任务或委托与该港相关。</td></tr>
    <tr><td><b>海上小船</b></td><td>旗色代表势力：${['whale', 'redsail', 'goldsand', 'free'].map(f => `<span style="color:${FACTION_COLOR[f]}">■</span> ${N.FACTION_LABEL[f]}`).join('　')}　<span class="bad">☠</span> 海盗（会主动追击弱小船队）。</td></tr>
    <tr><td><b>操作</b></td><td>滚轮缩放 · 拖动平移 · 点击港口出航 · 航行中点 🚩 招呼附近船只 · 📖 名录可按规模/造船厂/商品筛选。</td></tr>
    </tbody></table>
    <div class="row"><button class="btn primary" data-a="closeModal">知道了</button></div>`),
  dirZone: d => { dirZone = d.z; portDirectory(); },
  dirSort: d => { dirSort = d.s; portDirectory(); },
  dirGood: d => { dirGood = d.g; if (dirGood) dirSort = 'price'; portDirectory(); },
  dirGo: d => { closeModal(); if (map.mode !== 'sea') map.setMode('sea'); planVoyage(d.pid); },
  ctAccept: d => { const c = C.boardFor(S.pos).find(x => x.id === d.c); if (!c) return; const err = C.accept(c); if (err) return toast(err); audio.sfx('coin'); render(); },
  hailNpc: () => { const n = map.npc.nearest(); if (!n) return toast('附近没有可以招呼的船'); showEncounter(n, 'meet'); },
  encOpt: d => {
    if (!enc) return; const n = enc.n;
    const r = N.resolveOption(n, d.o);
    if (r.battle) {
      const fleet = N.npcBattleFleet(n);
      const zid = port(S.dest || S.pos).zone;
      const kind = n.faction === 'pirate' || n.faction === 'free' ? 'pirate' : 'rival';
      closeModal();
      g.startBattle(kind, kind === 'rival' ? n.faction : null, fleet, zid, () => {});
      B.npc = { faction: n.faction, kind: n.kind, zone: zid, id: n.id };
      n.cooldown = 600; enc = null; hooks.renderBattle(); return;
    }
    if (r.trade) { encTrade(r.trade); return; }
    if (r.supply) { encSupply(r.supply); return; }
    encResult(r.text, false);
  },
  encBuy: d => {
    if (!enc || !enc.trade) return;
    const msg = N.doNpcBuy(enc.n, enc.trade, Math.min(+d.q, enc.trade.qty));
    renderTop(); encResult(msg, true);
  },
  encSup: d => {
    if (!enc || !enc.supply) return;
    const msg = N.doNpcSupply(enc.n, enc.supply.unit, Math.min(+d.q, enc.supply.qty));
    renderTop(); encResult(msg, true);
  },
  encBack: () => { if (enc) showEncounter(enc.n, enc.mode); },
  encDone: () => { if (enc) enc.n.cooldown = Math.max(enc.n.cooldown, 240); encFinish(); },
  backPort: () => { map.setMode('port'); renderMapCtl(); },
  speed: () => { map.speedMul = map.speedMul === 1 ? 3 : map.speedMul === 3 ? 8 : 1; const b = document.getElementById('speedbtn'); if (b) b.textContent = `▶ ${map.speedMul}×`; if (S.tab === 'port' && S.dest) renderPanel(); },
  skip: () => {
    if (!S.dest) return toast('船队没有在航行');
    const r = map.skipAhead();
    render();
    if (r === 'arrived') return;
    if (r === 'event') return;
    toast(r === 'noVoyage' ? '船队没有在航行' : '已推进到航程尽头');
  },
  ctQuit: d => {
    const c = C.activeContracts().find(x => x.id === d.c); if (!c) return;
    showModal(`<h2>放弃委托？</h2><p>「${c.label}」</p>
      <p class="warn">立刻按违约处理：${c.kind === 'deliver' ? '货主收回托运货物，短少部分照价赔偿，并' : ''}赔付约 ${fmt(Math.round(c.reward * 0.4))} 金币违约金。</p>
      <div class="row"><button class="btn danger" data-a="ctQuitYes" data-c="${c.id}">确认放弃</button><button class="btn" data-a="closeModal">再想想</button></div>`);
  },
  ctQuitYes: d => { const err = C.abandon(d.c); if (err) toast(err); closeModal(); render(); },
  closeModal: () => { closeModal(); render(); }, help: () => help(),
  save: () => g.save(false), load: () => { resetGoldTween(); g.load(false); },
  newGame: () => showModal(`<h2>开始新游戏？</h2><p>当前进度会被覆盖。</p><div class="row"><button class="btn danger" data-a="confirmNew">开始新游戏</button><button class="btn" data-a="closeModal">取消</button></div>`),
  confirmNew: () => { g.newGame(); resetGoldTween(); closeModal(); map.snapCamera(); render(); chooseCaptain(); },
  pickCaptain: d => { S.captain = CAPTAIN_KEYS.includes(d.c) ? d.c : 'lin'; g.log(`${CHARS[S.captain].name} 就任船长。`, 'gold'); closeModal(); Q.maybePrologue(); help(); render(); },
  dlgNext: () => { if (!dlg) return; if (dlg.i >= dlg.pages.length - 1 && dlg.opts.accept) return; dlg.i++; if (dlg.i < dlg.pages.length) renderDlg(); else endDlg(); },
  dlgAccept: () => { const d = dlg; endDlg(); if (d?.opts.accept?.onAccept) d.opts.accept.onAccept(); render(); },
  dlgDecline: () => { const d = dlg; endDlg(); if (d?.opts.accept?.onDecline) d.opts.accept.onDecline(); render(); },
  eventOk: () => { const cb = eventCb; eventCb = null; closeModal(); render(); if (cb) cb(); },
  bsel: d => map.battle.select(+d.i), bfire: () => map.battle.act('fire'),
  bfireAt: d => { const u = (B?.units || []).find(x => x.id === d.e); if (u) map.battle.act('fire', u); },
  bboardAt: d => { const u = (B?.units || []).find(x => x.id === d.e); if (u) map.battle.act('board', u); }, bboard: () => map.battle.act('board'), bcancel: () => map.battle.act('cancel'),
  bwait: () => map.battle.act('wait'), bend: () => map.battle.act('endTurn'), bflee: () => map.battle.act('flee'),
  battleDone: () => { const info = B ? { won: B.result === 'win', kind: B.kind, rivalId: B.rivalId, boss: B.boss, npc: B.npc } : null; const cb = g.clearBattle(); map.battle.end(); closeModal(); map.setMode(S.dest ? 'sea' : 'port'); if (info && info.won) { Q.questEvent('battleWin', info); C.contractEvent('battleWin', info); }
    if (info && info.npc) {
      N.addRep(info.npc.faction, info.won ? -22 : -8);
      if (info.npc.faction !== 'pirate') N.addRep('pirate', 4);
      if (info.won && info.npc.id) map.npc.remove(info.npc.id);
    }
    render(); if (cb) cb(0); },
};

export function initUI(worldMap) {
  map = worldMap;
  Object.assign(hooks, { render, renderTop, showModal, closeModal, toast, renderBattle, onArrive: arrive, rollEvent,
    routeLen: pid => map.routeLen(pid), npcDay: d => map.npc.day(d),
    dayTick: () => C.contractEvent('day'),
    onEvent: Q.questEvent, showDialogue, hoverPort: showPortTip,
    questPorts: () => { const s = Q.questPorts(); for (const c of C.activeContracts()) s.add(c.to); return s; },
    portMarkers: pid => { const m = Q.portMarkers(pid); const fresh = C.boardFor(pid).some(c => !C.isTaken(c.id)); if (fresh && !m.office) m.office = '!'; return m; },
    openPortTab: ptab => { S.tab = 'port'; S.ptab = ptab; render(); document.getElementById('panel').scrollTop = 0; },
    openSeaMap: () => { map.setMode('sea'); renderMapCtl(); toast('点击港口出航，⚓ 回港返回街景'); } });
  map.onPortTap = pid => planVoyage(pid);
  map.npc.onClick = n => {
    if (B || enc || document.querySelector('.modal-bg')) return;
    const d = Math.hypot(n.x - S.ship.x, n.y - S.ship.y);
    if (d > 60) return toast(`${N.npcTitle(n)}还在 ${Math.round(d / 12)}° 外，靠近些再打招呼`);
    showEncounter(n, 'meet');
  };
  map.busy = () => !!(B || enc || document.querySelector('.modal-bg'));
  map.npc.onEncounter = (n, mode) => { if (B || enc || document.querySelector('.modal-bg')) return; if (S.escorted && n.kind === 'raider') return; showEncounter(n, mode); };
  map.npc.reset();
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
