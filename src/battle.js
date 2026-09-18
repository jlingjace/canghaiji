/* 六角格海战场景：格子 / 单位 / 玩家操作 / 敌方 AI / 特效动画 */
import { Container, Sprite, TilingSprite, Graphics, Text } from 'pixi.js';
import { S, B, hooks, T, fleeChance, blog, endBattle, alive, fireAt, boardAt, rival } from './game.js';
import { SHIP_TYPES, CHARS, RIVAL_REP } from './data.js';
import { clamp, pick, rand } from './util.js';

const FONT = '"PingFang SC","Hiragino Sans GB","Microsoft YaHei",sans-serif';
export const COLS = 12, ROWS = 8, RANGE = 3;
const SQ3 = Math.sqrt(3);

/* ---- 六角格数学（odd-r 偏移坐标，尖顶六边形） ---- */
function toCube(col, row) { const x = col - (row - (row & 1)) / 2; return [x, -x - row, row]; }
export function hexDist(a, b) { const A = toCube(a.col, a.row), C = toCube(b.col, b.row); return Math.max(Math.abs(A[0] - C[0]), Math.abs(A[1] - C[1]), Math.abs(A[2] - C[2])); }
const DIRS_EVEN = [[1, 0], [0, -1], [-1, -1], [-1, 0], [-1, 1], [0, 1]], DIRS_ODD = [[1, 0], [1, -1], [0, -1], [-1, 0], [0, 1], [1, 1]];
function neighbors(h) { return ((h.row & 1) ? DIRS_ODD : DIRS_EVEN).map(([dc, dr]) => ({ col: h.col + dc, row: h.row + dr })).filter(n => n.col >= 0 && n.col < COLS && n.row >= 0 && n.row < ROWS); }
const key = h => `${h.col},${h.row}`;
export const moveRange = u => Math.max(2, Math.ceil(SHIP_TYPES[u.ref.type].speed / 2));

export class BattleScene {
  constructor(app, shipTex, waterFrames) {
    this.app = app; this.shipTex = shipTex; this.waterFrames = waterFrames;
    this.root = new Container(); this.root.visible = false;
    this.active = false; this.busy = false; this.tweens = []; this.particles = []; this.t = 0;
  }

  /* ================= 开局 ================= */
  begin() {
    this.active = true; this.busy = false; this.t = 0;
    this.root.removeChildren().forEach(c => c.destroy({ children: true }));
    const vw = this.app.screen.width, vh = this.app.screen.height;
    this.R = Math.floor(Math.min((vw - 24) / (SQ3 * (COLS + 0.5)), (vh - 60) / (1.5 * ROWS + 0.5)));
    const R = this.R; this.ox = Math.round((vw - SQ3 * R * (COLS + 0.5)) / 2 + SQ3 * R / 2); this.oy = Math.round((vh - (1.5 * ROWS + 0.5) * R) / 2 + R);
    this.sc = Math.max(2, Math.floor(R * 1.5 / 16));

    this.water = new TilingSprite({ texture: this.waterFrames[0], width: vw, height: vh }); this.root.addChild(this.water);
    this.gridG = new Graphics(); this.root.addChild(this.gridG);
    this.hl = new Graphics(); this.root.addChild(this.hl);
    this.hits = new Container(); this.root.addChild(this.hits);
    this.units = new Container(); this.root.addChild(this.units);
    this.fx = new Container(); this.root.addChild(this.fx);
    this.top = new Container(); this.root.addChild(this.top);

    for (let row = 0; row < ROWS; row++) for (let col = 0; col < COLS; col++) {
      const c = this.center({ col, row }); const pts = this.hexPts(c.x, c.y, R - 1);
      this.gridG.poly(pts).fill({ color: 0x0a2438, alpha: 0.18 }).stroke({ width: 1, color: 0x5fb0d8, alpha: 0.28 });
      const hit = new Graphics().poly(pts).fill({ color: 0xffffff, alpha: 0.001 }); hit.eventMode = 'static'; hit.cursor = 'pointer';
      hit.on('pointertap', () => this.onHexTap({ col, row })); this.hits.addChild(hit);
    }
    const title = new Text({ text: B.kind === 'pirate' ? '遭遇海盗船队' : `与 ${rival(B.rivalId).name} 船队交战`, style: { fontFamily: FONT, fontSize: 14, fontWeight: '700', fill: '#f2c14e', stroke: { color: '#06101a', width: 4 }, letterSpacing: 2 } });
    title.position.set(12, 10); this.top.addChild(title);
    this.phaseText = new Text({ text: '', style: { fontFamily: FONT, fontSize: 12, fill: '#e8f0f8', stroke: { color: '#06101a', width: 3 } } });
    this.phaseText.position.set(12, 32); this.top.addChild(this.phaseText);

    /* 单位布置 */
    B.units = []; B.round = 1; B.phase = 'player'; B.target = null; B.sel = null;
    const pShips = S.fleet, eShips = B.enemy;
    const spread = (n, side) => { const rows = []; const start = Math.floor((ROWS - n) / 2); for (let i = 0; i < n; i++) rows.push({ col: side === 'p' ? (i % 2 ? 1 : 2) : (i % 2 ? COLS - 2 : COLS - 3), row: clamp(start + i, 0, ROWS - 1) }); return rows; };
    spread(pShips.length, 'p').forEach((h, i) => B.units.push({ id: 'p' + i, side: 'p', ref: pShips[i], col: h.col, row: h.row, moved: false, acted: false }));
    spread(eShips.length, 'e').forEach((h, i) => B.units.push({ id: 'e' + i, side: 'e', ref: eShips[i], col: h.col, row: h.row, moved: false, acted: false }));
    for (const u of B.units) this.mkUnit(u);
    const eCap = B.kind === 'pirate' ? CHARS.barro : CHARS[RIVAL_REP[B.rivalId]];
    blog(`${eCap.name}：“${B.kind === 'pirate' ? '把货交出来，或者喂鱼！' : '这片海域没有你的位置。'}”`, 'bad');
    blog('我方行动：点击自己的船选中，点绿色格子移动，点红圈敌船攻击。', 'muted');
    this.selectNext(); this.refresh();
  }
  end() { this.active = false; this.root.removeChildren().forEach(c => c.destroy({ children: true })); this.tweens = []; this.particles = []; this.root.position.set(0, 0); }

  center(h) { return { x: this.ox + SQ3 * this.R * (h.col + 0.5 * (h.row & 1)), y: this.oy + 1.5 * this.R * h.row }; }
  hexPts(cx, cy, r) { const p = []; for (let i = 0; i < 6; i++) { const a = Math.PI / 180 * (60 * i - 30); p.push(cx + r * Math.cos(a), cy + r * Math.sin(a)); } return p; }
  unitAt(h) { return B.units.find(u => u.ref.hp > 0 && u.col === h.col && u.row === h.row); }
  aliveUnits(side) { return B.units.filter(u => u.side === side && u.ref.hp > 0); }
  maxHp(u) { return u.side === 'p' ? T(u.ref).hp : u.ref.maxHp; }

  mkUnit(u) {
    const c = new Container(); const spr = new Sprite(this.shipTex.E[0]); spr.anchor.set(0.5, 0.6); spr.scale.set(u.side === 'p' ? this.sc : -this.sc, this.sc);
    if (u.side === 'e') spr.tint = B.kind === 'pirate' ? 0xe0b8b8 : 0xc8d4ec;
    c.addChild(spr);
    const name = new Text({ text: u.ref.name, style: { fontFamily: FONT, fontSize: 10, fill: u.side === 'p' ? '#ffe08a' : '#ffb4b4', stroke: { color: '#06101a', width: 3 } } });
    name.anchor.set(0.5, 1); name.y = -this.R * 0.8; c.addChild(name);
    const hp = new Graphics(); hp.y = this.R * 0.5; c.addChild(hp);
    u.view = { c, spr, name, hp }; u.phase = Math.random() * 6; this.units.addChild(c); this.placeUnit(u); this.updateHp(u);
  }
  placeUnit(u) { const p = this.center(u); u.view.c.position.set(p.x, p.y); }
  updateHp(u) {
    const g = u.view.hp, w = this.R * 1.3, r = clamp(u.ref.hp / this.maxHp(u), 0, 1);
    g.clear().rect(-w / 2, 0, w, 4).fill(0x06101a).rect(-w / 2 + 1, 1, (w - 2) * r, 2).fill(r > 0.5 ? 0x5ad48a : r > 0.25 ? 0xf0a35e : 0xe8646c);
  }

  /* ================= 高亮 / 刷新 ================= */
  refresh() {
    this.hl.clear();
    const sel = B.sel;
    if (B.phase === 'player' && sel && sel.ref.hp > 0 && !B.over) {
      if (!sel.moved) for (const h of this.reachable(sel)) { const c = this.center(h); this.hl.poly(this.hexPts(c.x, c.y, this.R - 2)).fill({ color: 0x5ad48a, alpha: 0.22 }); }
      if (!sel.acted) for (const e of this.aliveUnits('e')) if (hexDist(sel, e) <= RANGE) { const c = this.center(e); this.hl.circle(c.x, c.y, this.R * 0.7).stroke({ width: 2, color: 0xe8646c, alpha: 0.9 }); }
      const c = this.center(sel); this.hl.poly(this.hexPts(c.x, c.y, this.R - 1)).stroke({ width: 2, color: 0xf2c14e });
      if (B.target && B.target.ref.hp > 0) { const t = this.center(B.target); this.hl.poly(this.hexPts(t.x, t.y, this.R - 1)).stroke({ width: 2, color: 0xffffff }); }
    }
    this.phaseText.text = B.over ? '战斗结束' : `第 ${B.round} 回合 · ${B.phase === 'player' ? '我方行动' : '敌方行动中…'}`;
    for (const u of B.units) this.updateHp(u);
    hooks.renderBattle();
  }
  reachable(u) {
    const n = moveRange(u); const seen = new Map([[key(u), 0]]); const out = []; let frontier = [u];
    for (let d = 1; d <= n; d++) { const next = []; for (const h of frontier) for (const nb of neighbors(h)) { if (seen.has(key(nb)) || this.unitAt(nb)) continue; seen.set(key(nb), d); out.push(nb); next.push(nb); } frontier = next; }
    return out;
  }
  path(u, to) {
    const prev = new Map([[key(u), null]]); let frontier = [u];
    while (frontier.length) { const next = []; for (const h of frontier) for (const nb of neighbors(h)) { if (prev.has(key(nb)) || this.unitAt(nb)) continue; prev.set(key(nb), h); if (key(nb) === key(to)) { const p = [nb]; let c = h; while (c && key(c) !== key(u)) { p.unshift(c); c = prev.get(key(c)); } return p; } next.push(nb); } frontier = next; }
    return null;
  }
  selectNext() {
    B.target = null;
    B.sel = this.aliveUnits('p').find(u => !u.acted) || this.aliveUnits('p')[0] || null;
  }

  /* ================= 玩家输入 ================= */
  onHexTap(h) {
    if (!this.active || this.busy || B.over || B.phase !== 'player') return;
    const u = this.unitAt(h);
    if (u && u.side === 'p') { B.sel = u; B.target = null; this.refresh(); return; }
    const sel = B.sel; if (!sel) return;
    if (u && u.side === 'e') { if (!sel.acted && hexDist(sel, u) <= RANGE) { B.target = u; this.refresh(); } else hooks.toast(sel.acted ? '这艘船本回合已行动' : '超出射程（3 格）'); return; }
    if (!sel.moved) { const ok = this.reachable(sel).some(r => key(r) === key(h)); if (!ok) return hooks.toast('超出移动范围'); this.moveUnit(sel, h).then(() => { sel.moved = true; this.refresh(); }); }
  }
  select(i) { const u = B.units.find(x => x.id === 'p' + i); if (u && u.ref.hp > 0) { B.sel = u; B.target = null; this.refresh(); } }
  async act(a) {
    if (!this.active || this.busy || B.over) return;
    const sel = B.sel;
    if (a === 'cancel') { B.target = null; this.refresh(); return; }
    if (a === 'wait' && sel) { sel.acted = true; sel.moved = true; this.afterAction(); return; }
    if (a === 'endTurn') { for (const u of this.aliveUnits('p')) { u.acted = true; u.moved = true; } this.afterAction(); return; }
    if (a === 'flee') {
      const minD = Math.min(...this.aliveUnits('e').map(e => Math.min(...this.aliveUnits('p').map(p => hexDist(p, e)))));
      const chance = clamp(fleeChance() + Math.max(0, minD - 3) * 0.1, 0.1, 0.95);
      if (Math.random() < chance) { blog('船队成功脱离战斗！', 'good'); endBattle('flee'); this.refresh(); return; }
      blog('撤退失败，敌军追了上来！', 'bad'); for (const u of this.aliveUnits('p')) { u.acted = true; u.moved = true; } this.afterAction(); return;
    }
    if ((a === 'fire' || a === 'board') && sel && B.target && !sel.acted) {
      const tgt = B.target; const d = hexDist(sel, tgt);
      if (a === 'board' && d !== 1) return hooks.toast('接舷需要相邻');
      this.busy = true;
      if (a === 'fire') await this.doFire(sel, tgt, true, d); else await this.doBoard(sel, tgt, true, 1);
      sel.acted = true; sel.moved = true; B.target = null; this.busy = false;
      this.afterAction();
    }
  }
  afterAction() {
    if (this.checkEnd()) return;
    if (this.aliveUnits('p').every(u => u.acted)) this.enemyPhase(); else { this.selectNext(); this.refresh(); }
  }
  checkEnd() {
    if (B.over) return true;
    if (!alive(B.enemy).length) { endBattle('win'); this.refresh(); return true; }
    if (!alive(S.fleet).length) { endBattle('lose'); this.refresh(); return true; }
    return false;
  }

  /* ================= 敌方 AI ================= */
  async enemyPhase() {
    B.phase = 'enemy'; B.sel = null; B.target = null; this.busy = true; this.refresh();
    await this.wait(350);
    for (const u of this.aliveUnits('e')) {
      if (B.over) break;
      const targets = this.aliveUnits('p'); if (!targets.length) break;
      let tgt = targets.reduce((a, b) => hexDist(u, a) <= hexDist(u, b) ? a : b);
      let d = hexDist(u, tgt);
      if (d > 1) {
        const reach = this.reachable(u); let best = null, bd = d;
        for (const h of reach) { const dd = hexDist(h, tgt); if (dd < bd || (dd === bd && best && Math.random() < 0.3)) { bd = dd; best = h; } }
        if (best && bd < d) { await this.moveUnit(u, best); d = bd; }
      }
      if (d <= RANGE) {
        const weak = tgt.ref.crew < T(tgt.ref).crew * 0.3 || u.ref.crew > tgt.ref.crew * 1.6;
        if (d === 1 && weak && Math.random() < 0.7) await this.doBoard(u, tgt, false, 0.7); else await this.doFire(u, tgt, false, d);
        if (this.checkEnd()) { this.busy = false; return; }
      }
      await this.wait(200);
    }
    B.round++; B.phase = 'player';
    for (const u of B.units) { u.moved = false; u.acted = false; }
    this.busy = false; this.selectNext(); blog(`—— 第 ${B.round} 回合 ——`, 'muted'); this.refresh();
  }

  /* ================= 动作动画 ================= */
  async moveUnit(u, to) {
    const p = this.path(u, to); if (!p) return;
    this.busy = true;
    for (const h of p) {
      const from = this.center(u), dest = this.center(h);
      await this.tween(150, k => { u.view.c.position.set(from.x + (dest.x - from.x) * k, from.y + (dest.y - from.y) * k); });
      u.col = h.col; u.row = h.row; this.spawnWake(dest.x, dest.y + this.R * 0.3);
    }
    this.busy = false;
  }
  async doFire(a, t, mine, d) {
    const A = this.center(a), Tt = this.center(t);
    this.muzzle(A.x + (Tt.x > A.x ? 1 : -1) * this.R * 0.55, A.y - 2);
    await this.cannonball(A, Tt);
    const r = fireAt(a.ref, t.ref, mine, d);
    this.impact(Tt.x, Tt.y); this.hitFlash(t); this.shake(mine ? 3 : 5); this.floatDmg(Tt.x, Tt.y - this.R * 0.6, `-${r.dmg}`, mine ? '#ffe08a' : '#ff8a8a');
    this.updateHp(t); hooks.renderBattle();
    if (r.sunk) await this.sink(t); else await this.wait(220);
  }
  async doBoard(a, t, mine, mult) {
    const A = this.center(a), Tt = this.center(t); const dx = (Tt.x - A.x) * 0.45, dy = (Tt.y - A.y) * 0.45;
    await this.tween(220, k => u_set(a.view.c, A.x + dx * k, A.y + dy * k));
    this.slash(Tt.x, Tt.y); this.shake(3);
    const r = boardAt(a.ref, t.ref, mine, mult);
    this.floatDmg(Tt.x, Tt.y - this.R * 0.6, `船员 -${r.loss}`, mine ? '#ffe08a' : '#ff8a8a'); hooks.renderBattle();
    await this.tween(220, k => u_set(a.view.c, A.x + dx * (1 - k), A.y + dy * (1 - k)));
    this.updateHp(t);
    if (r.captured) await this.sink(t, true); else await this.wait(150);
    function u_set(c, x, y) { c.position.set(x, y); }
  }

  /* ================= 特效 ================= */
  tween(ms, fn) { return new Promise(res => this.tweens.push({ t: 0, ms, fn, res })); }
  wait(ms) { return this.tween(ms, () => {}); }
  addP(g, p) { this.fx.addChild(g); this.particles.push({ g, ...p }); }
  muzzle(x, y) { const g = new Graphics().rect(-5, -5, 10, 10).fill(0xffe08a).rect(-9, -2, 18, 4).fill(0xffb347); g.position.set(x, y); this.addP(g, { life: 0.12, max: 0.12, vx: 0, vy: 0, grow: 0 }); }
  cannonball(from, to) {
    const g = new Graphics().circle(0, 0, Math.max(2, this.R * 0.08)).fill(0x111111); this.fx.addChild(g);
    return this.tween(380, k => { g.position.set(from.x + (to.x - from.x) * k, from.y + (to.y - from.y) * k - Math.sin(k * Math.PI) * this.R * 1.2); }).then(() => g.destroy());
  }
  impact(x, y) {
    for (let i = 0; i < 10; i++) { const a = Math.random() * Math.PI * 2, s = 20 + Math.random() * 40; const g = new Graphics().rect(-3, -3, 6, 6).fill(Math.random() < 0.5 ? 0x9a9a9a : 0xd0d0d0); g.position.set(x, y); this.addP(g, { life: 0.7, max: 0.7, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 20, grow: 1.6, gravity: 0 }); }
    for (let i = 0; i < 8; i++) { const a = -Math.PI / 2 + (Math.random() - 0.5) * 2.2, s = 60 + Math.random() * 90; const g = new Graphics().rect(-2, -1, 4, 2).fill(0x8a5a2a); g.position.set(x, y); g.rotation = a; this.addP(g, { life: 0.8, max: 0.8, vx: Math.cos(a) * s, vy: Math.sin(a) * s, grow: 0, gravity: 220, spin: 8 }); }
    const fl = new Graphics().circle(0, 0, this.R * 0.35).fill(0xffd27a); fl.position.set(x, y); this.addP(fl, { life: 0.1, max: 0.1, vx: 0, vy: 0, grow: 3 });
  }
  slash(x, y) { for (let i = 0; i < 3; i++) { const g = new Graphics().moveTo(-14, -10 + i * 8).lineTo(14, -4 + i * 8).stroke({ width: 2, color: 0xffffff }); g.position.set(x + (i - 1) * 4, y); this.addP(g, { life: 0.35, max: 0.35, vx: 40, vy: -20, grow: 0.4 }); } }
  hitFlash(u) { const spr = u.view.spr; const old = spr.tint; spr.tint = 0xff5050; this.tween(160, () => {}).then(() => { if (u.ref.hp > 0) spr.tint = old; }); }
  shake(px) { const r = this.root; this.tween(260, k => { const f = (1 - k) * px; r.position.set((Math.random() - 0.5) * 2 * f, (Math.random() - 0.5) * 2 * f); }).then(() => r.position.set(0, 0)); }
  floatDmg(x, y, text, color) { const t = new Text({ text, style: { fontFamily: '"Press Start 2P",monospace', fontSize: 11, fill: color, stroke: { color: '#06101a', width: 3 } } }); t.anchor.set(0.5, 1); t.position.set(x, y); this.addP(t, { life: 0.9, max: 0.9, vx: 0, vy: -40, grow: 0 }); }
  spawnWake(x, y) { const g = new Graphics().rect(-2, -2, 4, 4).fill(0xdff3ff); g.position.set(x + (Math.random() - 0.5) * 10, y); this.addP(g, { life: 0.6, max: 0.6, vx: 0, vy: 0, grow: 0.8 }); }
  async sink(u, captured = false) {
    const c = u.view.c, spr = u.view.spr; spr.tint = captured ? 0xffffff : 0x8899aa; const y0 = c.y;
    if (captured) { u.view.name.style.fill = '#f2c14e'; }
    const bubbles = setInterval(() => { const g = new Graphics().circle(0, 0, 2 + Math.random() * 2).stroke({ width: 1, color: 0xcfe8f5 }); g.position.set(c.x + (Math.random() - 0.5) * this.R, c.y + this.R * 0.3); this.addP(g, { life: 0.9, max: 0.9, vx: 0, vy: -30, grow: 0.5 }); }, 90);
    await this.tween(1100, k => { c.y = y0 + k * this.R * 0.7; c.alpha = 1 - k; spr.rotation = k * 0.25; });
    clearInterval(bubbles); c.visible = false;
  }

  /* ================= 每帧 ================= */
  tick(dt) {
    if (!this.active) return;
    this.t += dt;
    if (Math.floor(this.t * 3) % 4 !== this.wf) { this.wf = Math.floor(this.t * 3) % 4; this.water.texture = this.waterFrames[this.wf]; }
    this.water.tilePosition.x += dt * 5; this.water.tilePosition.y += dt * 1.5;
    for (const tw of this.tweens) { tw.t += dt * 1000; const k = Math.min(1, tw.t / tw.ms); tw.fn(k); if (k >= 1) { tw.done = true; tw.res(); } }
    this.tweens = this.tweens.filter(tw => !tw.done);
    for (const p of this.particles) { p.life -= dt; if (p.gravity) p.vy += p.gravity * dt; p.g.x += p.vx * dt; p.g.y += p.vy * dt; if (p.spin) p.g.rotation += p.spin * dt; const k = Math.max(0, p.life / p.max); p.g.alpha = k; if (p.grow) p.g.scale.set(1 + (1 - k) * p.grow); }
    this.particles = this.particles.filter(p => { if (p.life <= 0) { p.g.destroy(); return false; } return true; });
    for (const u of B?.units || []) if (u.ref.hp > 0) { u.view.spr.texture = this.shipTex.E[Math.floor(this.t * 2 + u.phase) % 2]; u.view.spr.y = Math.sin(this.t * 2 + u.phase) * 1.5; }
    if (B?.sel && !B.over) { const c = this.center(B.sel); /* 选中船闪烁光标 */ this.hl.alpha = 0.75 + Math.sin(this.t * 6) * 0.25; }
  }
}
