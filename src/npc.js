/* 海上 NPC 船队：按海域势力份额生成、在港口之间往返、可见可接触；
   以及遭遇时的多选项互动与声望系统。NPC 本身不写入存档，读档时重新生成。 */
import { Container, Sprite, Graphics, Text, Rectangle } from 'pixi.js';
import { PORTS, ZONES, GOODS, G, FACTION_COLOR, FACTION_NAME, RIVALS, SHIP_TYPES } from './data.js';
import { S, port, zone, zoneLeader, price, fleetValue, totalCrew, rep, addRep, dayDistance, buySuppliesAt } from './game.js';
import { projX, projY } from './geo.js';
import { findPath, snapToWater, NAV } from './nav.js';
import { clamp, pick, rand, randInt, hash } from './util.js';

const WS = 1;
const FONT = '"PingFang SC","Hiragino Sans GB","Microsoft YaHei",sans-serif';
export const FACTIONS = ['whale', 'redsail', 'goldsand', 'pirate', 'free'];
export const FACTION_LABEL = { ...FACTION_NAME, pirate: '海盗', free: '自由商人' };
const TINT = { whale: 0x9cc4ef, redsail: 0xef9c9c, goldsand: 0xefd79c, pirate: 0xb0a0a8, free: 0xdfe6ee };

const POOL = 46;               // 全球同时存在的 NPC 船队数
const HAIL_R = 26;             // 可招呼距离（逻辑单位）
const PIRATE_AGGRO = 60;       // 海盗察觉半径

/* ---------- 声望（实现在 game.js，这里转出以保持调用点不变） ---------- */
export { rep, addRep, repLabel, ensureRep } from './game.js';

/* ---------- 生成 ---------- */
const KINDS = [
  { kind: 'merchant', name: '商船队', w: 5 },
  { kind: 'escort', name: '护航舰队', w: 2 },
  { kind: 'fisher', name: '渔船', w: 2 },
];
function zonePorts(zid) { return PORTS.filter(p => p.zone === zid); }
function pickFactionFor(zid) {
  const sh = S.share[zid]; if (!sh) return 'free';
  const roll = Math.random() * 110;
  let acc = 0;
  for (const r of RIVALS) { acc += sh[r.id] || 0; if (roll < acc) return r.id; }
  if (roll < acc + 6) return 'pirate';
  return 'free';
}
let seq = 0;
function makeNpc(zid) {
  const ps = zonePorts(zid); if (ps.length < 2) return null;
  const faction = pickFactionFor(zid);
  let kind = 'merchant';
  if (faction === 'pirate') kind = 'raider';
  else { const tot = KINDS.reduce((a, k) => a + k.w, 0); let x = Math.random() * tot; kind = KINDS.find(k => (x -= k.w) <= 0)?.kind || 'merchant'; }
  const a = pick(ps);
  const n = {
    id: 'n' + (++seq), faction, kind, zone: zid,
    x: projX(a.lon) + rand(-8, 8), y: projY(a.lat) + rand(-8, 8),
    from: a.id, to: null, path: null, leg: 0, heading: 0,
    speed: kind === 'fisher' ? rand(14, 22) : kind === 'escort' ? rand(34, 46) : rand(24, 38),
    ships: kind === 'fisher' ? 1 : randInt(1, kind === 'escort' ? 4 : 3),
    strength: 0, cargo: null, cooldown: 0, life: rand(500, 1400), chasing: false,
  };
  const w = snapToWater(n.x, n.y); n.x = w.c * NAV + NAV / 2; n.y = w.r * NAV + NAV / 2;
  n.strength = Math.round(n.ships * (kind === 'escort' ? 22 : kind === 'raider' ? 18 : kind === 'fisher' ? 2 : 10) * rand(0.75, 1.3));
  if (kind !== 'fisher') {
    const gd = pick(GOODS.filter(g => g.base >= 45));
    n.cargo = { good: gd.id, qty: randInt(8, 42) };
  }
  return n;
}

export class NpcFleet {
  constructor(map) {
    this.map = map; this.root = new Container(); this.root.eventMode = 'passive';
    this.onClick = () => {};
    this.list = []; this.views = new Map(); this.free = [];
    this.queue = []; this.k = 1; this.spawnT = 0;
    this.onEncounter = () => {};
  }
  reset() {
    this.list = []; this.queue = [];
    for (const [, v] of this.views) { v.c.visible = false; this.free.push(v); }
    this.views.clear();
    for (let i = 0; i < POOL; i++) { const z = pick(ZONES); const n = makeNpc(z.id); if (n) this.list.push(n); }
  }
  setScale(k) { this.k = k; for (const [, v] of this.views) v.c.scale.set(k); }

  /** 按游戏日推进：玩家在港口停泊或剧情跳天时，海上世界照样在走 */
  day(days = 1) {
    if (!S) return;
    for (let i = 0; i < 6; i++) this.pumpQueue();          // 让停泊期间也能算出航线
    const px = S.ship.x, py = S.ship.y, dd = dayDistance();
    for (const n of this.list) {
      n.cooldown = Math.max(0, n.cooldown - days * 6);
      n.life -= days * 6;
      if (!n.path && !n.pending) { this.assign(n); continue; }
      if (Math.hypot(n.x - px, n.y - py) < 260) continue;   // 近场由逐帧推进负责
      if (!n.path || n.pending) continue;
      let budget = (n.speed / 30) * dd * days;
      while (budget > 0 && n.leg < n.path.length) {
        const t = n.path[n.leg]; const dx = t.x - n.x, dy = t.y - n.y, d = Math.hypot(dx, dy);
        if (d < 1) { n.leg++; continue; }
        const step = Math.min(d, budget);
        n.x += dx / d * step; n.y += dy / d * step; n.heading = Math.atan2(dy, dx); budget -= step;
      }
      if (n.leg >= n.path.length) { n.from = n.to; n.to = null; n.path = null; }
    }
  }
  /** 被击沉 / 被俘后从世界上移除 */
  remove(id) {
    const i = this.list.findIndex(n => n.id === id); if (i < 0) return;
    this.list.splice(i, 1);
    const v = this.views.get(id); if (v) { v.c.visible = false; this.views.delete(id); this.free.push(v); }
    const z = pick(ZONES); const fresh = makeNpc(z.id); if (fresh) this.list.push(fresh);
  }

  /* ---- 航线（分帧计算，避免卡顿） ---- */
  assign(n) {
    const ps = zonePorts(n.zone);
    let dest = pick(ps);
    if (Math.random() < 0.3) { const z2 = pick(ZONES); const p2 = zonePorts(z2.id); if (p2.length) { dest = pick(p2); n.zone = z2.id; } }
    if (!dest || dest.id === n.from) return;
    n.to = dest.id; n.pending = true; this.queue.push(n);
  }
  pumpQueue() {
    const n = this.queue.shift(); if (!n) return;
    if (!n.to) { n.pending = false; return; }
    const d = port(n.to);
    n.path = findPath({ x: n.x, y: n.y }, { x: projX(d.lon), y: projY(d.lat) });
    n.leg = 0; n.pending = false;
  }

  /* ---- 每帧 ---- */
  tick(dt, modalOpen) {
    const S0 = S; if (!S0) return;
    if (this.queue.length) this.pumpQueue();
    const px = S0.ship.x, py = S0.ship.y;
    for (const n of this.list) {
      n.cooldown = Math.max(0, n.cooldown - dt);
      n.life -= dt;
      if (!n.path && !n.pending) { this.assign(n); continue; }
      if (n.pending || !n.path) continue;
      // 海盗追击
      const dpx = px - n.x, dpy = py - n.y, dp = Math.hypot(dpx, dpy);
      const weak = fleetValue() < n.strength * 900;
      n.chasing = n.kind === 'raider' && S0.dest && dp < PIRATE_AGGRO && weak && rep('pirate') < 40;
      let tgt, sp = n.speed;
      if (n.chasing) { tgt = { x: px, y: py }; sp = n.speed * 1.25; }
      else { tgt = n.path[n.leg]; if (!tgt) { n.from = n.to; n.to = null; n.path = null; continue; } }
      const dx = tgt.x - n.x, dy = tgt.y - n.y, d = Math.hypot(dx, dy);
      if (d < 1.2 && !n.chasing) { n.leg++; continue; }
      const step = Math.min(d, sp * dt);
      n.x += dx / d * step; n.y += dy / d * step; n.heading = Math.atan2(dy, dx);
      // 接触判定
      if (!modalOpen && n.cooldown <= 0 && dp < HAIL_R && S0.dest) {
        n.cooldown = 30;
        if (n.chasing || (n.kind === 'raider' && dp < HAIL_R * 0.6)) { this.onEncounter(n, 'ambush'); return; }
        if (n.kind !== 'fisher' && Math.random() < 0.55) { this.onEncounter(n, 'meet'); return; }
      }
      if (n.life <= 0 && dp > 300) { const z = pick(ZONES); const fresh = makeNpc(z.id); if (fresh) Object.assign(n, fresh, { id: n.id }); }
    }
    this.render();
  }
  render() {
    const m = this.map, z = m.zoom;
    const vw = m.app.screen.width, vh = m.app.screen.height, pad = 80;
    const x0 = (-m.world.x - pad) / z, y0 = (-m.world.y - pad) / z;
    const x1 = (-m.world.x + vw + pad) / z, y1 = (-m.world.y + vh + pad) / z;
    const seen = new Set();
    for (const n of this.list) {
      const wx = n.x * WS, wy = n.y * WS;
      if (wx < x0 || wx > x1 || wy < y0 || wy > y1) continue;
      seen.add(n.id);
      let v = this.views.get(n.id);
      if (!v) {
        v = this.free.pop();
        if (!v) {
          const c = new Container();
          c.eventMode = 'static'; c.cursor = 'pointer'; c.hitArea = new Rectangle(-11, -14, 22, 24);
          const ring = new Graphics(); c.addChild(ring);
          const spr = new Sprite(m.shipTex.E[0]); spr.anchor.set(0.5, 0.72); c.addChild(spr);
          const flag = new Graphics(); c.addChild(flag);
          const tag = new Text({ text: '', style: { fontFamily: FONT, fontSize: 9, fill: '#e8f0f8', stroke: { color: '#06101a', width: 3 } } });
          tag.anchor.set(0.5, 1); tag.position.set(0, -12); c.addChild(tag);
          this.root.addChild(c); v = { c, spr, flag, tag, ring };
          c.on('pointertap', () => { if (m.dragDist > 6) return; const cur = v.npc; if (cur) this.onClick(cur); });
          c.on('pointerover', () => { spr.tint = 0xffffff; v.tag.visible = true; });
          c.on('pointerout', () => { const cur = v.npc; if (cur) spr.tint = TINT[cur.faction]; });
        }
        v.npc = n; v.c.visible = true; this.views.set(n.id, v);
        // 船型剪影按规模分三档
        const sc = n.kind === 'fisher' ? 0.62 : n.ships >= 3 ? 1.12 : n.ships === 2 ? 0.9 : 0.74;
        v.baseScale = sc; v.spr.scale.set(sc);
        v.spr.tint = TINT[n.faction];
        v.flag.clear().rect(-2, -8 - sc * 8, 7, 4).fill(FACTION_COLOR[n.faction] || 0xcccccc);
        // 关系色环：友好绿 / 敌视红 / 中立灰
        const r = rep(n.faction);
        const rc = n.kind === 'raider' ? 0xe8646c : r >= 25 ? 0x5ad48a : r <= -25 ? 0xe8646c : 0x8fa6bd;
        v.ring.clear().circle(0, -2, 9 + sc).stroke({ width: 1.5, color: rc, alpha: n.kind === 'raider' ? 0.9 : 0.5 });
        v.tag.text = n.kind === 'raider' ? '☠' : FACTION_LABEL[n.faction].slice(0, 2);
        v.tag.style.fill = n.kind === 'raider' ? '#ff9a9a' : '#cfdcea';
        v.c.scale.set(this.k);
      }
      v.c.position.set(wx, wy);
      const flip = Math.cos(n.heading) < 0;
      v.spr.scale.x = flip ? -v.baseScale : v.baseScale;
      v.flag.x = flip ? -4 : 0;
      v.tag.visible = z > 0.55;
    }
    for (const [id, v] of [...this.views]) if (!seen.has(id)) { v.c.visible = false; this.views.delete(id); this.free.push(v); }
  }

  /** 玩家在港口/海上主动点击招呼时，找最近的可接触 NPC */
  nearest(maxR = HAIL_R * 2.2) {
    let best = null, bd = maxR;
    for (const n of this.list) { const d = Math.hypot(n.x - S.ship.x, n.y - S.ship.y); if (d < bd) { bd = d; best = n; } }
    return best;
  }
}

/* ================= 遭遇：描述与选项 ================= */
export function npcTitle(n) {
  const k = { merchant: '商船队', escort: '护航舰队', fisher: '渔船', raider: '海盗船队' }[n.kind];
  if (n.faction === 'pirate') return k;
  if (n.faction === 'free') return '自由商人的' + k;
  return `${FACTION_LABEL[n.faction]}的${k}`;
}
export function npcDesc(n) {
  const cargoTxt = n.cargo ? `船舱里装着${G[n.cargo.good].name}` : '看不出装了什么';
  const strTxt = n.strength > 60 ? '火力可观' : n.strength > 25 ? '武装一般' : '几乎没有武装';
  return `${n.ships} 艘船，${strTxt}，${cargoTxt}。`;
}
/** 海上补给单价：港口 3 金币，渔船 6、商船 9，越缺越值 */
export const supplyUnit = n => n.kind === 'fisher' ? 6 : 9;
/** 对方船上能匀出来的补给量 */
export const supplyStock = n => Math.max(10, Math.round(n.ships * (n.kind === 'fisher' ? 40 : 25)));
const myPower = () => fleetValue() / 900 + totalCrew() / 20;
/** 实力对比：>1.4 压制，0.7~1.4 相当，<0.7 劣势 */
export const powerRatio = n => myPower() / Math.max(6, n.strength);

/** 该 NPC 在海上买卖货物的报价（相对当前所在海域均价） */
export function npcTrade(n) {
  if (!n.cargo) return null;
  const p = port(S.pos);
  const base = price(p, n.cargo.good);
  const disc = n.faction === 'pirate' ? rand(0.45, 0.68) : rand(0.78, 0.95);
  return { good: n.cargo.good, qty: n.cargo.qty, unit: Math.max(1, Math.round(base * disc)) };
}

/**
 * 生成遭遇选项。每项：{ id, label, hint, kind:'talk'|'trade'|'info'|'pay'|'demand'|'hire'|'fight'|'leave', disabled }
 */
export function encounterOptions(n, mode) {
  const out = [];
  const r = rep(n.faction), pr = powerRatio(n), zid = port(S.dest || S.pos).zone;
  const mine = S.share[zid]?.player >= 50;
  out.push({ id: 'greet', kind: 'talk', label: '打招呼', hint: '交换航海见闻，略微改善关系' });
  if (n.cargo && n.kind !== 'raider') out.push({ id: 'buy', kind: 'trade', label: '海上交易', hint: '买下他们的货，通常比港口便宜' });
  else if (n.cargo && n.kind === 'raider' && r > -20) out.push({ id: 'buy', kind: 'trade', label: '买下赃物', hint: '来路不明，但便宜得多；会提高海盗好感、降低商会好感' });
  if (n.kind !== 'raider') {
    const u = supplyUnit(n);
    out.push({ id: 'supply', kind: 'trade', label: `买补给（${u} 金币/单位）`,
      hint: S.gold < u ? '金币不足' : n.kind === 'fisher' ? '渔船的鱼干最便宜，断粮时的救命稻草' : '比港口贵，但海上有得买就不错了', disabled: S.gold < u });
  }
  out.push({ id: 'info', kind: 'info', label: '打听行情（80 金币）', hint: S.gold < 80 ? '金币不足 80' : '问出附近港口一件高价商品', disabled: S.gold < 80 });
  if (n.kind === 'escort' && n.faction !== 'pirate') out.push({ id: 'hire', kind: 'hire', label: '雇佣护航（600 金币）', hint: S.gold < 600 ? '金币不足 600' : '本次航程内海盗不会主动袭击', disabled: S.gold < 600 });
  if (mine && n.faction !== 'free' && n.kind !== 'raider') out.push({ id: 'toll', kind: 'demand', label: '索要通行费', hint: '你主导本海域；对方可能照付，也可能翻脸' });
  if (pr > 1.5 && n.kind !== 'fisher') out.push({ id: 'intimidate', kind: 'demand', label: '威慑劝降', hint: '实力碾压时可不战而取其货物，但名声受损' });
  if (mode === 'ambush' || n.kind === 'raider') out.push({ id: 'bribe', kind: 'pay', label: '交买路钱', hint: S.gold < 300 ? '金币不足，凑不出买路钱' : '花钱脱身，避免一场恶战', disabled: S.gold < 300 });
  if (pr <= 1.5 && n.kind !== 'fisher') out.push({ id: 'intimidate', kind: 'demand', label: '威慑劝降', hint: '需要实力明显压制对方（提升船队规模与火炮）', disabled: true });
  if (!mine && n.faction !== 'free' && n.kind !== 'raider') out.push({ id: 'toll', kind: 'demand', label: '索要通行费', hint: `需要你在${zone(zid).name}的份额过半`, disabled: true });
  out.push({ id: 'fight', kind: 'fight', label: '发动攻击', hint: n.kind === 'raider' ? '击沉海盗可获战利品' : '击败商会船队可夺取其海域份额，但关系会严重恶化' });
  out.push({ id: 'leave', kind: 'leave', label: mode === 'ambush' ? '全力甩开' : '继续航行', hint: mode === 'ambush' ? '航速高才容易摆脱' : '' });
  return out;
}

/* ================= 遭遇：结算 ================= */
/** 按 NPC 实力生成一支海战敌队 */
export function npcBattleFleet(n) {
  const pool = n.strength > 70 ? ['merchant', 'galleon', 'frigate'] : n.strength > 30 ? ['schooner', 'merchant', 'galleon'] : ['sloop', 'schooner'];
  const cnt = clamp(n.ships, 1, 5);
  const names = n.kind === 'raider' ? ['黑旗号', '骷髅号', '怒涛号', '血月号', '秃鹫号'] : ['旗舰', '护航舰', '武装商船', '运输船', '巡逻舰'];
  const hpBudget = Math.max(120, n.strength * 14), cBudget = Math.max(6, Math.round(n.strength * 0.7)), crBudget = Math.max(20, n.strength * 2);
  return Array.from({ length: cnt }, (_, i) => {
    const t = pick(pool), tt = SHIP_TYPES[t];
    const hp = clamp(Math.round(hpBudget / cnt * rand(0.8, 1.2)), 40, tt.hp);
    return { type: t, name: names[i % names.length], hp, maxHp: hp,
      cannons: clamp(Math.round(cBudget / cnt * rand(0.8, 1.2)), 2, tt.cannons),
      crew: clamp(Math.round(crBudget / cnt * rand(0.8, 1.2)), 5, tt.crew) };
  });
}

/**
 * 结算一个遭遇选项。返回 { text, gold, rep:{f:v}, battle, flee, goods, escorted, close }
 * 不直接改 UI；金币/货物/声望在这里改状态，文本交给 UI 显示。
 */
export function resolveOption(n, id, qty = 0) {
  const R = { text: '', close: true };
  const p = port(S.pos);
  switch (id) {
    case 'greet': {
      addRep(n.faction, n.kind === 'raider' ? 1 : 3);
      const lines = [
        '“风向不错，愿你一路顺遂。”双方鸣笛致意后各自散开。',
        '对方船长隔着海面举起帽子：“外海有几股逆流，当心。”',
        '两船并行了一阵，水手们互相抛了几句玩笑话。',
        '“做生意的都是同行，海上别互相为难。”',
      ];
      R.text = pick(lines) + `\n（与${FACTION_LABEL[n.faction]}的关系略有改善）`;
      return R;
    }
    case 'buy': {
      const t = npcTrade(n); if (!t) { R.text = '对方没有可出售的货物。'; return R; }
      R.trade = t; R.close = false; return R;
    }
    case 'supply': {
      if (n.supplySold == null) n.supplySold = 0;
      const left = Math.max(0, supplyStock(n) - n.supplySold);
      if (left <= 0) { R.text = '“船上的干粮都匀给你了，真没有了。”'; return R; }
      R.supply = { unit: supplyUnit(n), qty: left };
      R.close = false; return R;
    }
    case 'info': {
      if (S.gold < 80) { R.text = '金币不足。'; return R; }
      S.gold -= 80;
      const cands = PORTS.filter(x => x.id !== S.pos);
      const tp = pick(cands);
      let best = null, br = 0;
      for (const g of GOODS) { const r2 = price(tp, g.id) / g.base; if (r2 > br) { br = r2; best = g; } }
      const pr = price(tp, best.id);
      S.mem[tp.id] = S.mem[tp.id] || { day: S.day, prices: {} };
      S.mem[tp.id].prices[best.id] = pr; S.mem[tp.id].day = S.day;
      addRep(n.faction, 1);
      R.text = `“${tp.name}那边的${best.name}正缺货，能卖到 ${pr} 金币上下。”\n（已记入航海志）`;
      return R;
    }
    case 'hire': {
      if (S.gold < 600) { R.text = '金币不足。'; return R; }
      S.gold -= 600; S.escortUntil = (S.voyage ? S.voyage.to : S.pos); S.escorted = true;
      addRep(n.faction, 4);
      R.text = '对方的护航舰调头跟上了你的船队。“到港之前，海盗不会来烦你。”';
      return R;
    }
    case 'toll': {
      const r0 = rep(n.faction), pr2 = powerRatio(n);
      if (pr2 > 1.1 || r0 < -30 || Math.random() < 0.55) {
        const gold = Math.round(120 + n.strength * rand(6, 14));
        S.gold += gold; addRep(n.faction, -8);
        R.text = `对方掂量了一下你的炮口，交了 ${gold} 金币通行费，悻悻离去。`;
        R.gold = gold;
      } else {
        addRep(n.faction, -12);
        R.text = '“这片海还轮不到你收钱！”对方拒绝了，并且记住了你的旗号。';
      }
      return R;
    }
    case 'intimidate': {
      const pr3 = powerRatio(n);
      if (pr3 > 1.5 && Math.random() < 0.75) {
        const t = npcTrade(n);
        if (t) {
          const space = Math.max(0, S.fleet.reduce((a, s) => a + SHIP_TYPES[s.type].cargo, 0) - Object.values(S.cargo).reduce((a, b) => a + b, 0) - S.supplies);
          const got = Math.min(t.qty, space);
          if (got > 0) { S.cargo[t.good] = (S.cargo[t.good] || 0) + got; R.text = `对方不战而降，把 ${G[t.good].name} ×${got} 丢上了你的甲板。`; }
          else R.text = '对方举手投降，可惜你的货舱已经满了，只能放行。';
        } else R.text = '对方举手投降，船上却没什么值钱的东西。';
        addRep(n.faction, -18); addRep('free', -6);
        n.cargo = null; n.cooldown = 240;
      } else {
        addRep(n.faction, -10);
        R.text = '对方并没有被吓住，拉开距离后扬长而去。';
      }
      return R;
    }
    case 'bribe': {
      const cost = Math.round(200 + n.strength * rand(8, 16));
      if (S.gold < cost) { R.text = `对方开价 ${cost} 金币，你付不起。`; return R; }
      S.gold -= cost; addRep('pirate', 6); n.cooldown = 300; n.chasing = false;
      R.text = `你丢过去一袋 ${cost} 金币。“识相。”对方调转船头走了。`;
      return R;
    }
    case 'fight': { R.battle = true; return R; }
    case 'leave':
    default: {
      if (n.chasing) {
        const ok = Math.random() < clamp(0.35 + (S.fleet.length ? 0.06 * (fleetValue() / 9000) : 0), 0.2, 0.85);
        if (ok) { n.chasing = false; n.cooldown = 240; R.text = '你的船队吃满了风，把对方远远甩在后面。'; }
        else { R.text = '对方咬住了你的尾流，甩不掉——只能打了！'; R.battle = true; }
        return R;
      }
      R.text = '你们互相致意后，各自驶向自己的航程。';
      return R;
    }
  }
}

/** 海上成交：买补给 */
export function doNpcSupply(n, unit, qty) {
  const got = buySuppliesAt(unit, qty);
  if (!got) return '金币不足，或者货舱已经装不下了。';
  n.supplySold = (n.supplySold || 0) + got;
  addRep(n.faction, 1);
  return `对方用吊索递过来 ${got} 单位补给，收了 ${got * unit} 金币。「一路顺风。」`;
}

/** 海上成交：买入 NPC 的货 */
export function doNpcBuy(n, t, qty) {
  const cost = qty * t.unit;
  if (qty <= 0 || S.gold < cost) return '金币不足。';
  S.gold -= cost; S.cargo[t.good] = (S.cargo[t.good] || 0) + qty;
  t.qty -= qty; if (n.cargo) n.cargo.qty = t.qty;
  addRep(n.faction, 2);
  if (n.faction === 'pirate') { for (const r of RIVALS) addRep(r.id, -2); }
  return `成交：${G[t.good].name} ×${qty}，付出 ${cost} 金币。`;
}
