/* 海图场景：PixiJS 渲染的平铺海面、像素陆地、港口、船精灵、实时航行、昼夜 */
import { Application, Container, Sprite, TilingSprite, Graphics, Text, Rectangle } from 'pixi.js';
import { PORTS, ZONES, LAND, FACTION_COLOR } from './data.js';
import { S, hooks, port, zone, zoneLeader, fleetSpeed, dayDistance, passDays, log, weatherTick, weatherSpeed, WEATHER_ICON } from './game.js';
import { WeatherLayer } from './weather.js';
import { audio } from './audio.js';
import { makeWaterFrames, makeShipTextures, makePortIcon, makeLandCanvas, canvasTexture } from './pixelart.js';
import { PortScene } from './port.js';
import { BattleScene } from './battle.js';
import { clamp } from './util.js';

export const WS = 2;              // 逻辑单位 → 世界像素
const W = 900, H = 560;           // 逻辑地图尺寸
const FONT = '"PingFang SC","Hiragino Sans GB","Microsoft YaHei",sans-serif';

export class WorldMap {
  constructor() {
    this.follow = true; this.speedMul = 1; this.onPortTap = () => {};
    this.frame = 0; this.frameT = 0; this.wakes = []; this.wakeT = 0; this.drag = null; this.dragDist = 0;
    this.heading = 0; this.dir = 'E'; this.flip = false; this.mode = 'sea';
  }

  async init(el) {
    this.el = el; this.app = new Application();
    await this.app.init({ resizeTo: el, background: '#0a2438', antialias: false, resolution: 1, autoDensity: false, preference: 'webgl' });
    el.prepend(this.app.canvas);
    this.world = new Container(); this.app.stage.addChild(this.world);

    // 海面：两层平铺，不同速度滚动
    this.waterFrames = makeWaterFrames(4, WS);
    this.water = new TilingSprite({ texture: this.waterFrames[0], width: W * WS, height: H * WS });
    this.world.addChild(this.water);
    this.water2 = new TilingSprite({ texture: this.waterFrames[2], width: W * WS, height: H * WS });
    this.water2.alpha = 0.35; this.water2.tilePosition.set(11, 7); this.world.addChild(this.water2);

    // 陆地
    this.land = new Sprite(canvasTexture(makeLandCanvas(LAND, W, H, WS))); this.world.addChild(this.land);

    // 海域名
    for (const z of ZONES) {
      const t = new Text({ text: z.name, style: { fontFamily: FONT, fontSize: 22, fontWeight: '700', letterSpacing: 8, fill: z.color } });
      t.alpha = 0.4; t.anchor.set(0.5); t.position.set(z.label[0] * WS + 20, z.label[1] * WS - 8); this.world.addChild(t);
    }

    // 港口
    this.portLayer = new Container(); this.world.addChild(this.portLayer); this.ports = {};
    const icon = makePortIcon();
    for (const p of PORTS) {
      const c = new Container(); c.position.set(p.x * WS, p.y * WS); c.eventMode = 'static'; c.cursor = 'pointer';
      c.hitArea = new Rectangle(-22, -30, 44, 56);
      const ring = new Graphics(); c.addChild(ring);
      const spr = new Sprite(icon); spr.anchor.set(0.5, 0.7); spr.scale.set(WS); c.addChild(spr);
      const label = new Text({ text: p.name, style: { fontFamily: FONT, fontSize: 12, fill: '#e8f0f8', stroke: { color: '#0b1a2a', width: 3 } } });
      label.anchor.set(0.5, 0); label.position.set(0, 12); c.addChild(label);
      c.on('pointertap', () => { if (this.dragDist > 6) return; this.onPortTap(p.id); });
      c.on('pointerover', () => { spr.tint = 0xffffaa; label.style.fill = '#f2c14e'; });
      c.on('pointerout', () => { spr.tint = 0xffffff; label.style.fill = S.mem[p.id] ? '#e8f0f8' : '#9fb2c6'; });
      this.portLayer.addChild(c); this.ports[p.id] = { c, ring, spr, label };
    }

    // 航迹 + 船
    this.wakeLayer = new Container(); this.wakeLayer.eventMode = 'none'; this.world.addChild(this.wakeLayer);
    this.shipTex = makeShipTextures();
    this.ship = new Sprite(this.shipTex.E[0]); this.ship.anchor.set(0.5, 0.72); this.ship.scale.set(3); this.ship.eventMode = 'none'; this.world.addChild(this.ship);

    // 昼夜遮罩
    this.night = new Graphics().rect(0, 0, W * WS, H * WS).fill(0x0a1030); this.night.alpha = 0; this.night.eventMode = 'none'; this.world.addChild(this.night);

    // 港口场景
    this.port = new PortScene(this.app, this.shipTex); this.app.stage.addChild(this.port.root);
    this.battle = new BattleScene(this.app, this.shipTex, this.waterFrames); this.app.stage.addChild(this.battle.root);
    this.weather = new WeatherLayer(this.app); this.app.stage.addChild(this.weather.root);

    // 拖动镜头
    const st = this.app.stage; st.eventMode = 'static'; st.hitArea = this.app.screen;
    st.on('pointerdown', e => { if (this.mode !== 'sea') return; this.drag = { x: e.global.x, y: e.global.y, wx: this.world.x, wy: this.world.y }; this.dragDist = 0; });
    st.on('pointermove', e => {
      if (!this.drag) return; const dx = e.global.x - this.drag.x, dy = e.global.y - this.drag.y; this.dragDist = Math.hypot(dx, dy);
      if (this.dragDist > 6) { this.follow = false; this.world.position.set(this.drag.wx + dx, this.drag.wy + dy); this.clampCamera(); }
    });
    const end = () => { this.drag = null; }; st.on('pointerup', end); st.on('pointerupoutside', end);

    this.refreshPorts(); this.placeShip(); this.snapCamera();
    this.setMode(S.dest ? 'sea' : 'port');
    this.app.ticker.add(t => this.tick(t));
  }

  /* ----- 场景模式：海图 / 港口 ----- */
  setMode(m) {
    if (m === 'port' && S.dest) m = 'sea';
    this.mode = m;
    this.world.visible = m === 'sea';
    this.port.root.visible = m === 'port';
    this.battle.root.visible = m === 'battle';
    if (m === 'port') this.port.show(S.pos);
    if (m === 'sea') { this.follow = true; this.snapCamera(); }
    audio.playBgm(m === 'battle' ? 'battle' : m === 'port' ? 'port' : 'sea');
  }

  /* ----- 港口标记：主导势力光环 / 已到访 / 当前停泊 ----- */
  refreshPorts() {
    const qp = hooks.questPorts();
    for (const p of PORTS) {
      const o = this.ports[p.id]; const leader = zoneLeader(p.zone); const sh = S.share[p.zone][leader];
      o.ring.clear();
      o.ring.circle(0, -4, 24).stroke({ width: 3, color: sh >= 50 ? FACTION_COLOR[leader] : zone(p.zone).color, alpha: sh >= 50 ? 0.9 : 0.25 });
      if (p.id === S.pos && !S.dest) o.ring.circle(0, -4, 29).stroke({ width: 2, color: 0xf2c14e, alpha: 0.9 });
      const star = qp.has(p.id); o.label.text = star ? `★ ${p.name}` : p.name;
      o.label.style.fill = star ? '#f2c14e' : S.mem[p.id] ? '#e8f0f8' : '#9fb2c6';
    }
  }

  /* ----- 航行 ----- */
  startVoyage(pid) {
    const to = port(pid);
    const prev = S.voyage;
    S.voyage = { from: S.pos, to: pid, total: Math.hypot(to.x - S.ship.x, to.y - S.ship.y), traveled: 0, eventFired: prev ? prev.eventFired : false, days: prev ? prev.days : 0 };
    S.dest = pid; this.follow = true; this.refreshPorts();
  }
  move(dt) {
    const to = port(S.dest); const dx = to.x - S.ship.x, dy = to.y - S.ship.y; const dist = Math.hypot(dx, dy);
    const fs = fleetSpeed(); const speed = 40 * (fs / 6) * this.speedMul * weatherSpeed();   // 逻辑单位 / 秒
    const step = Math.min(dist, speed * dt);
    if (dist > 0.01) { S.ship.x += dx / dist * step; S.ship.y += dy / dist * step; this.heading = Math.atan2(dy, dx); this.updateDir(); }
    const v = S.voyage; if (v) v.traveled += step;
    S.dayAcc += step / dayDistance();
    let dayPassed = false;
    while (S.dayAcc >= 1) { S.dayAcc -= 1; passDays(1); weatherTick(); if (v) v.days++; dayPassed = true; }
    if (dayPassed) hooks.renderTop();
    this.wakeT += dt; if (this.wakeT > 0.1 && step > 0) { this.wakeT = 0; this.spawnWake(); }
    if (v && !v.eventFired && v.traveled >= v.total * 0.5) {
      v.eventFired = true;
      hooks.rollEvent(to, extra => { if (extra > 0) { passDays(extra); log(`船队被迫绕行，多耗了 ${extra} 天。`); } hooks.render(); });
    }
    if (dist - step <= 0.5) this.arrive();
  }
  arrive() {
    const pid = S.dest; const p = port(pid);
    S.ship = { x: p.x, y: p.y }; S.dest = null; S.voyage = null; S.pos = pid;
    this.refreshPorts(); hooks.onArrive(pid);
  }
  updateDir() {
    const a = (this.heading + Math.PI * 2) % (Math.PI * 2);   // 0 = 东，π/2 = 南（屏幕向下）
    if (a < Math.PI / 4 || a > 7 * Math.PI / 4) { this.dir = 'E'; this.flip = false; }
    else if (a < 3 * Math.PI / 4) { this.dir = 'S'; this.flip = false; }
    else if (a < 5 * Math.PI / 4) { this.dir = 'E'; this.flip = true; }
    else { this.dir = 'N'; this.flip = false; }
  }
  spawnWake() {
    const g = new Graphics().rect(-2, -2, 4, 4).fill(0xdff3ff);
    const bx = S.ship.x * WS - Math.cos(this.heading) * 16, by = S.ship.y * WS - Math.sin(this.heading) * 16 + 4;
    g.position.set(bx + (Math.random() * 8 - 4), by + (Math.random() * 6 - 3)); g.alpha = 0.6;
    this.wakeLayer.addChild(g); this.wakes.push({ g, life: 1.4 });
  }

  /* ----- 每帧 ----- */
  tick(t) {
    const dt = t.deltaMS / 1000;
    this.frameT += t.deltaMS;
    if (this.frameT > 350) { this.frameT = 0; this.frame = (this.frame + 1) % this.waterFrames.length; this.water.texture = this.waterFrames[this.frame]; this.water2.texture = this.waterFrames[(this.frame + 2) % 4]; }
    const ws = S && S.weather?.type === 'storm' ? 3 : S && S.weather?.type === 'rain' ? 1.6 : 1;
    this.water.tilePosition.x += dt * 5 * ws; this.water.tilePosition.y += dt * 1.5 * ws;
    this.water2.tilePosition.x -= dt * 3 * ws; this.water2.tilePosition.y += dt * 2.5 * ws;
    for (const w of this.wakes) { w.life -= dt; w.g.alpha = Math.max(0, w.life / 1.4) * 0.6; w.g.scale.set(1 + (1.4 - w.life) * 0.5); }
    this.wakes = this.wakes.filter(w => { if (w.life <= 0) { w.g.destroy(); return false; } return true; });
    if (!S) return;
    const modalOpen = !!document.querySelector('.modal-bg');
    const wt = this.mode === 'battle' ? 'clear' : (S.weather?.type || 'clear');
    this.weather.tick(dt, wt);
    if (this.mode === 'battle') { this.battle.tick(dt); return; }
    const [sx, sy] = this.weather.shakeOffset(); this.app.stage.position.set(Math.round(sx), Math.round(sy));
    if (this.mode === 'port') { if (!modalOpen) this.port.tick(dt); return; }
    if (!modalOpen && S.dest) this.move(dt);
    this.placeShip();
    if (this.follow) this.followCamera();
    this.updateNight();
    this.updateBanner();
  }
  placeShip() {
    this.ship.position.set(Math.round(S.ship.x * WS), Math.round(S.ship.y * WS));
    const bob = Math.floor(performance.now() / (S.dest ? 280 : 700)) % 2;
    this.ship.texture = this.shipTex[this.dir][bob]; this.ship.scale.x = this.flip ? -3 : 3;
  }
  updateNight() {
    const d = (Math.cos(S.dayAcc * Math.PI * 2) + 1) / 2;   // dayAcc=0.5 正午，0/1 子夜
    this.night.alpha = 0.5 * Math.pow(d, 1.6);
  }
  updateBanner() {
    const el = document.getElementById('sailbanner'); if (!el) return;
    if (!S.dest) { if (el.style.display !== 'none') el.style.display = 'none'; return; }
    const v = S.voyage; const hour = Math.floor(S.dayAcc * 24);
    const txt = `⛵ 航行中 → ${port(S.dest).name} · 第 ${v.days + 1} 天 · ${String(hour).padStart(2, '0')}:00 · ${WEATHER_ICON[S.weather?.type || 'clear']} · 补给 ${S.supplies}`;
    if (el.textContent !== txt) el.textContent = txt; if (el.style.display !== 'block') el.style.display = 'block';
  }

  /* ----- 镜头 ----- */
  followCamera() {
    const vw = this.app.screen.width, vh = this.app.screen.height;
    const tx = vw / 2 - S.ship.x * WS, ty = vh / 2 - S.ship.y * WS;
    this.world.x += (tx - this.world.x) * 0.08; this.world.y += (ty - this.world.y) * 0.08; this.clampCamera();
  }
  snapCamera() { const vw = this.app.screen.width, vh = this.app.screen.height; this.world.position.set(vw / 2 - S.ship.x * WS, vh / 2 - S.ship.y * WS); this.clampCamera(); }
  clampCamera() {
    const vw = this.app.screen.width, vh = this.app.screen.height, ww = W * WS, wh = H * WS;
    this.world.x = Math.round(ww <= vw ? (vw - ww) / 2 : clamp(this.world.x, vw - ww, 0));
    this.world.y = Math.round(wh <= vh ? (vh - wh) / 2 : clamp(this.world.y, vh - wh, 0));
  }
  recenter() { this.follow = true; }
}
