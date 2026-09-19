/* 海图场景：真实世界地图、平铺海面、港口（按规模/造船厂分级）、实时航行（绕行陆地）、缩放、昼夜 */
import { Application, Container, Sprite, TilingSprite, Graphics, Text, Rectangle } from 'pixi.js';
import { PORTS, ZONES, FACTION_COLOR } from './data.js';
import { S, hooks, port, zone, zoneLeader, fleetSpeed, dayDistance, passDays, log, weatherTick, weatherSpeed, weatherDayMul, WEATHER_ICON } from './game.js';
import { WeatherLayer } from './weather.js';
import { audio } from './audio.js';
import { makeWaterFrames, makeShipTextures, makePortIcon, makePortSymbol, makeWorldLandCanvas, canvasTexture } from './pixelart.js';
import { PortScene } from './port.js';
import { BattleScene } from './battle.js';
import { NpcFleet } from './npc.js';
import { MAP_W, MAP_H, projX, projY } from './geo.js';
import { findPath, pathLength, waterComponents } from './nav.js';
import { clamp } from './util.js';

export const WS = 1;                       // 逻辑单位 → 世界像素
const FONT = '"PingFang SC","Hiragino Sans GB","Microsoft YaHei",sans-serif';
export const ZOOM_MIN = 0.16, ZOOM_MAX = 4.0;   // 0.22 时 1/n 档位最低只到 0.25，窄画布装不下全图
/** 渲染分辨率：跟上设备像素比，否则在 Retina 上整个画面会被浏览器拉伸 2× 再平滑 */
export const RES = Math.min(2, Math.max(1, Math.round((typeof window !== 'undefined' && window.devicePixelRatio) || 1)));
/**
 * 把缩放吸附到「一个逻辑像素正好等于整数个物理像素」的档位。
 * 像素画在非整数倍下会出现忽宽忽窄的像素块，看起来就是锯齿与抖动；吸附之后完全消失。
 * ≥1 时按 1/RES 步进（RES=2 → 1.0 / 1.5 / 2.0…），<1 时按整数倍缩小（1/2、1/3…）。
 */
const LEVELS = (() => {
  const out = [];
  for (let n = Math.ceil(1 / ZOOM_MIN); n >= 2; n--) out.push(1 / n);        // 缩小侧：1/n 整数倍下采样
  for (let k = 0; 1 + k / RES <= ZOOM_MAX + 1e-6; k++) out.push(1 + k / RES); // 放大侧：1/RES 步进
  return out.filter(v => v >= ZOOM_MIN - 1e-6).sort((a, b) => a - b);
})();
const nearestLevel = z => LEVELS.reduce((a, b) => Math.abs(b - z) < Math.abs(a - z) ? b : a, LEVELS[0]);
export function snapZoom(z) { return nearestLevel(clamp(z, ZOOM_MIN, ZOOM_MAX)); }
/** 只向下取的版本：给「全图」用，保证结果一定装得下 */
export function snapZoomDown(z) {
  const c = clamp(z, ZOOM_MIN, ZOOM_MAX);
  for (let i = LEVELS.length - 1; i >= 0; i--) if (LEVELS[i] <= c + 1e-6) return LEVELS[i];
  return LEVELS[0];
}
/** 朝 factor 的方向至少挪一档——否则每次只缩 1.4× 时会永远卡在同一档 */
function stepLevel(from, factor) {
  const target = nearestLevel(clamp(from * factor, ZOOM_MIN, ZOOM_MAX));
  if (target !== from) return target;
  const i = LEVELS.indexOf(from);
  if (i < 0) return target;
  const j = factor < 1 ? i - 1 : i + 1;
  return LEVELS[Math.max(0, Math.min(LEVELS.length - 1, j))];
}
/* 航行视图：地图拉近，船按真实世界比例显示（不再是恒定屏幕尺寸的图标）。
   SHIP_W 是船在世界坐标里的尺寸系数，32px 贴图 × 0.78 ≈ 25 逻辑单位 ≈ 2 经纬度。 */
export const SAIL_ZOOM = 2, PORT_ZOOM = 1, SHIP_W = 0.78;
/** LOD 阈值：低于 LOD_DETAIL 港口换符号，低于 LOD_SHIPS 不画 NPC 船 */
export const LOD_DETAIL = 0.75, LOD_SHIPS = 0.7;

export class WorldMap {
  constructor() {
    this.follow = true; this.speedMul = 1; this.onPortTap = () => {};
    this.frame = 0; this.frameT = 0; this.wakes = []; this.wakeT = 0; this.drag = null; this.dragDist = 0;
    this.heading = 0; this.dir = 'E'; this.flip = false; this.mode = 'sea'; this.zoom = 1;
  }

  async init(el) {
    this.el = el; this.app = new Application();
    await this.app.init({ resizeTo: el, background: '#0a2438', antialias: true, resolution: RES, autoDensity: true, preference: 'webgl' });
    el.prepend(this.app.canvas);
    // 顶栏是渲染之后才撑开的，而 Pixi 的 resizeTo 只在 window resize 时重新量容器，
    // 不补这个观察器画布会一直比 #mapwrap 高一截（被 overflow:hidden 裁掉）。
    if (typeof ResizeObserver !== 'undefined') new ResizeObserver(() => this.app.resize()).observe(el);
    // 连通性自检：海峡开凿半径一改错就可能把某片海封成孤岛，而寻路失败是静默退化成直线的，
    // 船队会直接穿过陆地。开发模式下把它喊出来，免得又要靠玩家发现。
    if (import.meta.env && import.meta.env.DEV) {
      try {
        const wc = waterComponents(PORTS);
        const tally = {};
        for (const c of Object.values(wc.ports)) tally[c] = (tally[c] || 0) + 1;
        const main = Object.entries(tally).sort((a, b) => b[1] - a[1])[0];
        if (Object.keys(tally).length > 1) {
          const bad = PORTS.filter(p => String(wc.ports[p.id]) !== main[0]).map(p => p.name);
          console.warn(`[nav] ${bad.length} 个港口与主航道不连通，寻路会退化成穿陆地的直线：`, bad.join('、'));
        }
      } catch (e) { /* 自检失败不影响游戏 */ }
    }
    this.world = new Container(); this.app.stage.addChild(this.world);
    this.world.scale.set(this.zoom);

    // 海面：两层平铺
    this.waterFrames = makeWaterFrames(6, 2);
    this.water = new TilingSprite({ texture: this.waterFrames[0], width: MAP_W * WS, height: MAP_H * WS });
    this.world.addChild(this.water);
    this.water2 = new TilingSprite({ texture: this.waterFrames[3], width: MAP_W * WS, height: MAP_H * WS });
    this.water2.alpha = 0.18; this.water2.tilePosition.set(11, 7); this.world.addChild(this.water2);

    // 真实世界陆地
    this.land = new Sprite(canvasTexture(makeWorldLandCanvas()));
    this.land.width = MAP_W * WS; this.land.height = MAP_H * WS; this.world.addChild(this.land);

    // 海域名
    this.zoneLabels = [];
    for (const z of ZONES) {
      const cx = projX((z.lonRange[0] + z.lonRange[1]) / 2), cy = projY((z.latRange[0] + z.latRange[1]) / 2);
      const t = new Text({ text: z.name, style: { fontFamily: FONT, fontSize: 26, fontWeight: '700', letterSpacing: 8, fill: z.color, stroke: { color: '#06101a', width: 4 } } });
      t.alpha = 0.55; t.anchor.set(0.5); t.position.set(cx * WS, cy * WS); t.eventMode = 'none';
      this.world.addChild(t); this.zoneLabels.push(t);
    }

    // 航线
    this.routeG = new Graphics(); this.routeG.eventMode = 'none'; this.world.addChild(this.routeG);

    // 港口
    this.portLayer = new Container(); this.world.addChild(this.portLayer); this.ports = {};
    const iconCache = new Map(), symCache = new Map();
    const iconFor = p => {
      const key = `${zone(p.zone)?.style || 'iberian'}|${p.tier}`;
      if (!iconCache.has(key)) iconCache.set(key, makePortIcon(zone(p.zone)?.style || 'iberian', p.tier));
      return iconCache.get(key);
    };
    const symFor = p => {
      const col = zone(p.zone)?.color || '#e8dcc0';
      const key = `${col}|${p.tier}`;
      if (!symCache.has(key)) symCache.set(key, makePortSymbol(p.tier, col));
      return symCache.get(key);
    };
    for (const p of PORTS) {
      const c = new Container(); c.position.set(projX(p.lon) * WS, projY(p.lat) * WS);
      c.eventMode = 'static'; c.cursor = 'pointer'; c.hitArea = new Rectangle(-16, -20, 32, 38);
      const ring = new Graphics(); c.addChild(ring);
      const tierS = p.tier >= 3 ? 1.15 : p.tier === 2 ? 0.92 : 0.72;
      const spr = new Sprite(iconFor(p)); spr.anchor.set(0.5, 0.78); spr.scale.set(tierS); c.addChild(spr);
      const icons = { detail: iconFor(p), symbol: symFor(p) };
      const yardG = new Graphics(); c.addChild(yardG);
      const label = new Text({ text: p.name, style: { fontFamily: FONT, fontSize: 11, fill: '#e8f0f8', stroke: { color: '#06101a', width: 3 } } });
      label.anchor.set(0.5, 0); label.position.set(0, 9 * tierS); c.addChild(label);
      c.on('pointertap', () => { if (this.dragDist > 6) return; this.onPortTap(p.id); });
      c.on('pointerover', () => { spr.tint = 0xffffaa; label.style.fill = '#f2c14e'; hooks.hoverPort(p.id); });
      c.on('pointerout', () => { spr.tint = 0xffffff; label.style.fill = S.mem[p.id] ? '#e8f0f8' : '#9fb2c6'; hooks.hoverPort(null); });
      this.portLayer.addChild(c); this.ports[p.id] = { c, ring, spr, label, yardG, tierS, p, icons, lod: 'detail' };
    }

    // NPC 船队
    this.npc = new NpcFleet(this); this.world.addChild(this.npc.root);

    // 航迹 + 玩家船
    this.wakeLayer = new Container(); this.wakeLayer.eventMode = 'none'; this.world.addChild(this.wakeLayer);
    this.shipTex = makeShipTextures();
    this.ship = new Sprite(this.shipTex.E[0]); this.ship.anchor.set(0.5, 0.72); this.ship.eventMode = 'none'; this.world.addChild(this.ship);

    // 昼夜遮罩
    this.night = new Graphics().rect(0, 0, MAP_W * WS, MAP_H * WS).fill(0x0a1030);
    this.night.alpha = 0; this.night.eventMode = 'none'; this.world.addChild(this.night);

    // 其他场景
    this.port = new PortScene(this.app, this.shipTex); this.app.stage.addChild(this.port.root);
    this.port.preload();                       // 手绘背景板后台加载，不挡开局
    this.battle = new BattleScene(this.app, this.shipTex, this.waterFrames); this.app.stage.addChild(this.battle.root);
    this.weather = new WeatherLayer(this.app); this.app.stage.addChild(this.weather.root);

    // 拖动 + 滚轮缩放
    const st = this.app.stage; st.eventMode = 'static'; st.hitArea = this.app.screen;
    st.on('pointerdown', e => { if (this.mode !== 'sea') return; this.drag = { x: e.global.x, y: e.global.y, wx: this.world.x, wy: this.world.y }; this.dragDist = 0; });
    st.on('pointermove', e => {
      if (!this.drag) return; const dx = e.global.x - this.drag.x, dy = e.global.y - this.drag.y; this.dragDist = Math.hypot(dx, dy);
      if (this.dragDist > 6) { this.follow = false; this.world.position.set(this.drag.wx + dx, this.drag.wy + dy); this.clampCamera(); }
    });
    const end = () => { this.drag = null; }; st.on('pointerup', end); st.on('pointerupoutside', end);
    this.app.canvas.addEventListener('wheel', e => {
      if (this.mode !== 'sea') return;
      e.preventDefault();
      const r = this.app.canvas.getBoundingClientRect();
      this.zoomAt(e.clientX - r.left, e.clientY - r.top, Math.exp(-e.deltaY * 0.0016));
    }, { passive: false });

    this.refreshPorts(); this.placeShip(); this.snapCamera();
    this.setMode(S.dest ? 'sea' : 'port');
    this.app.ticker.add(t => this.tick(t));
  }

  /* ----- 缩放 ----- */
  zoomAt(sx, sy, factor) {
    const z0 = this.zoom, z1 = stepLevel(snapZoom(z0), factor);
    if (z1 === z0) return;
    const wx = (sx - this.world.x) / z0, wy = (sy - this.world.y) / z0;
    this.zoom = z1; this.world.scale.set(z1);
    this.world.position.set(sx - wx * z1, sy - wy * z1);
    this.follow = false; this.zoomTarget = null; this.clampCamera(); this.applyZoomScaling();
  }
  setZoom(z) {
    const vw = this.app.screen.width, vh = this.app.screen.height;
    this.zoomTarget = null;
    this.zoomAt(vw / 2, vh / 2, clamp(z, ZOOM_MIN, ZOOM_MAX) / this.zoom);
  }
  /** 直接套用一个缩放值，保持当前的跟随状态（平滑缩放用） */
  applyZoom(z) {
    this.zoom = clamp(z, ZOOM_MIN, ZOOM_MAX);
    this.world.scale.set(this.zoom);
    this.applyZoomScaling();
    if (this.follow) this.followCamera(); else this.clampCamera();
  }
  /** 平滑推到某个缩放级别；follow=true 时镜头同时跟住船队 */
  glideZoom(z, follow = true) {
    this.zoomTarget = snapZoom(clamp(z, ZOOM_MIN, ZOOM_MAX));
    if (follow) this.follow = true;
  }
  fitWorld() {
    const vw = this.app.screen.width, vh = this.app.screen.height;
    this.zoom = snapZoomDown(Math.min(vw / (MAP_W * WS), vh / (MAP_H * WS)));   // 向下取，保证真的装得下
    this.zoomTarget = null;
    this.world.scale.set(this.zoom); this.follow = false;
    this.world.position.set((vw - MAP_W * WS * this.zoom) / 2, (vh - MAP_H * WS * this.zoom) / 2);
    this.clampCamera(); this.applyZoomScaling();
  }
  /** 图标与文字保持接近固定的屏幕尺寸，并按缩放级别隐藏次要标签 */
  applyZoomScaling() {
    // 拉远时港口换成简洁的地图符号：几十个详细小码头挤在一起会糊成一片
    const detail = this.zoom >= LOD_DETAIL;
    // 港口是地图符号：只做「部分反向缩放」，拉近时跟着世界一起变大，拉远时也不至于消失
    const k = clamp(Math.pow(1 / this.zoom, 0.6), 0.45, 2.2);
    for (const id in this.ports) {
      const o = this.ports[id];
      const want = detail ? 'detail' : 'symbol';
      if (o.lod !== want) { o.lod = want; o.spr.texture = o.icons[want]; o.spr.anchor.set(0.5, detail ? 0.78 : 0.62); }
      // 符号模式保持大致固定的屏幕尺寸（约 14px），全球视角下才点得到、也不会糊成一片
      o.c.scale.set(detail ? k : clamp(0.85 / this.zoom, 0.8, 4.2));
      o.label.scale.set(clamp(1 / (this.zoom * o.c.scale.x), 0.45, 1.6));
      o.label.y = detail ? 9 * this.tierSOf(o) : 7;
    }
    for (const t of this.zoneLabels) { t.scale.set(clamp(0.9 / this.zoom, 0.4, 4.2)); t.alpha = this.zoom < 1.3 ? 0.42 : 0.14; }
    const zv = document.getElementById('zoomv'); if (zv) zv.textContent = `${this.zoom.toFixed(1)}×`;
    // 船是世界里的实体：只按世界比例显示，拉远就该变小
    this.ship.scale.set(SHIP_W * (this.flip ? -1 : 1), SHIP_W);
    this.ship.visible = this.zoom >= LOD_SHIPS * 0.6;
    if (this.npc) { this.npc.setScale(1); if (this.zoom < LOD_SHIPS) this.npc.render(); }
    this.layoutLabels();
  }
  tierSOf(o) { return o.tierS; }
  /**
   * 港口名避让：按优先级（当前港 / 目的地 / 任务港 / 规模）依次占位，
   * 与已放下的标签在屏幕上重叠的就不显示。全球视角下的名字堆叠由此消失。
   */
  layoutLabels() {
    const z = this.zoom, vw = this.app.screen.width, vh = this.app.screen.height;
    const quest = hooks.questPorts ? hooks.questPorts() : new Set();
    const placed = [];
    // 海域名先占位（它们是最粗的分区信息），港口名再往空隙里塞
    for (const t of this.zoneLabels) {
      const sx = t.x * z + this.world.x, sy = t.y * z + this.world.y;
      const w = t.width * z + 8, h = t.height * z + 4;
      const x0 = sx - w / 2, y0 = sy - h / 2;
      let hit = false;
      for (const r of placed) { if (x0 < r.x1 && x0 + w > r.x0 && y0 < r.y1 && y0 + h > r.y0) { hit = true; break; } }
      t.visible = !hit && sx > -w && sy > -h && sx < vw + w && sy < vh + h;
      if (t.visible) placed.push({ x0, y0, x1: x0 + w, y1: y0 + h });
    }
    const list = [];
    for (const id in this.ports) {
      const o = this.ports[id], p = o.p;
      const sx = projX(p.lon) * WS * z + this.world.x, sy = projY(p.lat) * WS * z + this.world.y;
      if (sx < -60 || sy < -40 || sx > vw + 60 || sy > vh + 40) { o.label.visible = false; continue; }
      const pri = p.id === S.pos ? 0 : p.id === S.dest ? 1 : quest.has && quest.has(p.id) ? 2 : 5 - p.tier;
      list.push({ o, sx, sy, pri });
    }
    list.sort((a, b) => a.pri - b.pri);
    for (const it of list) {
      const cs = it.o.c.scale.x * z;
      const w = it.o.label.width * cs + 5, h = it.o.label.height * cs + 3;
      const x0 = it.sx - w / 2, y0 = it.sy + it.o.label.y * cs;
      let hit = false;
      for (const r of placed) { if (x0 < r.x1 && x0 + w > r.x0 && y0 < r.y1 && y0 + h > r.y0) { hit = true; break; } }
      it.o.label.visible = !hit;
      if (!hit) placed.push({ x0, y0, x1: x0 + w, y1: y0 + h });
    }
  }

  /**
   * 整份 S 被换掉之后（读档 / 新开局）重置表现层。
   * 不做的话，上一局的航线金线、上一局的 NPC 船队、按旧船位算出来的航程缓存
   * 会原封不动留在新地图上——看起来像是新开的局里凭空多出一条航线。
   */
  resetView() {
    this.routeG.clear();
    this.routeCache = null;
    this.npc.reset();
    this.follow = true;
    this.placeShip(); this.snapCamera();
    this.refreshPorts(); this.drawRoute();
  }

  /* ----- 场景模式 ----- */
  setMode(m) {
    if (m === 'port' && S.dest) m = 'sea';
    this.mode = m;
    this.world.visible = m === 'sea';
    this.port.root.visible = m === 'port';
    this.battle.root.visible = m === 'battle';
    if (m === 'port') this.port.show(S.pos);
    if (m === 'sea') { this.follow = true; this.snapCamera(); this.glideZoom(S.dest ? SAIL_ZOOM : PORT_ZOOM, true); this.applyZoomScaling(); }
    audio.playBgm(m === 'battle' ? 'battle' : m === 'port' ? 'port' : 'sea');
  }

  /* ----- 港口标记 ----- */
  refreshPorts() {
    const qp = hooks.questPorts();
    for (const p of PORTS) {
      const o = this.ports[p.id]; const leader = zoneLeader(p.zone); const sh = S.share[p.zone][leader];
      const lean = this.zoom >= LOD_DETAIL;
      const R = lean ? 13 * o.tierS : 8;
      o.ring.clear(); o.yardG.visible = lean;
      // 拉远时只给「你主导的」和当前 / 目的港画环，否则四十个圈会盖过地图本身
      if (lean || sh >= 50 || p.id === S.pos || p.id === S.dest)
        o.ring.circle(0, -3, R).stroke({ width: lean ? 2.5 : 1.5, color: sh >= 50 ? FACTION_COLOR[leader] : zone(p.zone).color, alpha: sh >= 50 ? 0.95 : (lean ? 0.3 : 0.22) });
      if (p.id === S.pos && !S.dest) o.ring.circle(0, -3, R + 4).stroke({ width: 2, color: 0xf2c14e, alpha: 0.95 });
      if (p.id === S.dest) o.ring.circle(0, -3, R + 4).stroke({ width: 2, color: 0x5ad48a, alpha: 0.95 });
      // 造船厂等级：港口上方 1–3 个金色小方块
      o.yardG.clear();
      const known = !!S.mem[p.id];
      for (let i = 0; i < p.yard; i++) {
        const w = 3, gap = 1.5, total = p.yard * w + (p.yard - 1) * gap;
        o.yardG.rect(-total / 2 + i * (w + gap), -R - 8, w, 4).fill({ color: known ? 0xf2c14e : 0x6a7a8a, alpha: known ? 1 : 0.5 });
      }
      const star = qp.has(p.id); o.label.text = star ? `★ ${p.name}` : p.name;
      o.label.style.fontSize = lean ? 11 : 10;
      o.label.style.fill = star ? '#f2c14e' : known ? '#e8f0f8' : '#9fb2c6';
      o.spr.alpha = known ? 1 : 0.72;
    }
    this.layoutLabels();
  }

  /* ----- 航行（沿寻路航线） ----- */
  /** 真实绕行航程长度（带缓存），供 game.voyageDays 使用 */
  routeLen(pid) {
    if (!this.routeCache) this.routeCache = new Map();
    const key = `${pid}|${Math.round(S.ship.x / 16)}|${Math.round(S.ship.y / 16)}`;
    if (this.routeCache.has(key)) return this.routeCache.get(key);
    const len = this.planRoute(pid).length;
    if (this.routeCache.size > 120) this.routeCache.clear();
    this.routeCache.set(key, len);
    return len;
  }
  /** 任意两港之间的真实绕行航程，供委托板与 UI 估算共用；结果缓存，不重复跑 A* */
  routeBetween(aid, bid) {
    if (aid === bid) return 0;
    if (!this.pairCache) this.pairCache = new Map();
    const key = aid < bid ? `${aid}|${bid}` : `${bid}|${aid}`;
    if (this.pairCache.has(key)) return this.pairCache.get(key);
    const a = port(aid), b = port(bid);
    if (!a || !b) return null;
    const from = { x: projX(a.lon), y: projY(a.lat) }, dest = { x: projX(b.lon), y: projY(b.lat) };
    const len = pathLength(from, findPath(from, dest));
    this.pairCache.set(key, len);
    return len;
  }
  planRoute(pid) {
    const to = port(pid);
    const from = { x: S.ship.x, y: S.ship.y };
    const dest = { x: projX(to.lon), y: projY(to.lat) };
    const path = findPath(from, dest);
    return { path, length: pathLength(from, path) };
  }
  startVoyage(pid) {
    const prev = S.voyage;
    const { path, length } = this.planRoute(pid);
    S.voyage = { from: S.pos, to: pid, path, leg: 0, total: length, traveled: 0, eventFired: prev ? prev.eventFired : false, days: prev ? prev.days : 0 };
    S.dest = pid; this.refreshPorts(); this.drawRoute();
    this.glideZoom(SAIL_ZOOM, true);                    // 出航就把镜头推到航行视角
  }
  drawRoute() {
    this.routeG.clear();
    const v = S.voyage; if (!v || !v.path) return;
    this.routeG.moveTo(S.ship.x * WS, S.ship.y * WS);
    for (let i = v.leg; i < v.path.length; i++) this.routeG.lineTo(v.path[i].x * WS, v.path[i].y * WS);
    this.routeG.stroke({ width: 2 / this.zoom, color: 0xf2c14e, alpha: 0.5 });
  }
  move(dt) {
    const v = S.voyage; if (!v) return;
    const fs = fleetSpeed(); const speed = 90 * (fs / 6) * this.speedMul * weatherSpeed();   // 逻辑单位 / 秒
    let budget = speed * dt;
    while (budget > 0 && v.leg < v.path.length) {
      const tgt = v.path[v.leg];
      const dx = tgt.x - S.ship.x, dy = tgt.y - S.ship.y; const dist = Math.hypot(dx, dy);
      if (dist < 0.6) { v.leg++; continue; }
      const step = Math.min(dist, budget);
      S.ship.x += dx / dist * step; S.ship.y += dy / dist * step;
      this.heading = Math.atan2(dy, dx); this.updateDir();
      v.traveled += step; budget -= step;
      S.dayAcc += step / dayDistance() * weatherDayMul();   // 风暴天同样的距离要多花天数
      while (S.dayAcc >= 1) { S.dayAcc -= 1; passDays(1); weatherTick(); v.days++; this.dayTick = true; }
    }
    if (this.dayTick) { this.dayTick = false; hooks.renderTop(); }
    this.wakeT += dt; if (this.wakeT > 0.12) { this.wakeT = 0; this.spawnWake(); }
    this.routeT = (this.routeT || 0) + dt; if (this.routeT > 0.12) { this.routeT = 0; this.drawRoute(); }
    if (!v.eventFired && v.traveled >= v.total * 0.5) {
      v.eventFired = true;
      hooks.rollEvent(port(S.dest), extra => { if (extra > 0) { passDays(extra); log(`船队被迫绕行，多耗了 ${extra} 天。`); } hooks.render(); });
    }
    if (v.leg >= v.path.length) this.arrive();
  }
  /**
   * 快速推进航程，直到触发航海事件 / 遭遇 / 抵港。
   * 复用 move() 与 npc.tick()，所以天数、补给、天气、NPC 世界全都照常结算。
   */
  skipAhead(maxDays = 400) {
    if (!S.voyage || !S.dest) return 'noVoyage';
    const startDay = S.day, hadEvent = S.voyage.eventFired;
    let guard = 0;
    while (S.dest && guard++ < 60000) {
      this.move(0.25);
      if (!S.dest) return 'arrived';
      this.npc.tick(0.25, false);
      if (this.busy && this.busy()) return 'event';
      if (S.voyage && S.voyage.eventFired && !hadEvent) return 'event';
      if (S.day - startDay >= maxDays) return 'timeout';
    }
    return 'timeout';
  }
  arrive() {
    const pid = S.dest; const p = port(pid);
    // 「从哪个港来的」要一路带给委托层：采购委托必须是从别处运来的货才算数，
    // 判断依据只有这一个。存档里读回来的航程也有 voyage.from，所以中途存读档不会丢。
    const from = (S.voyage && S.voyage.from) || null;
    S.ship = { x: projX(p.lon), y: projY(p.lat) }; S.dest = null; S.voyage = null; S.pos = pid;
    this.routeG.clear(); this.refreshPorts(); hooks.onArrive(pid, from);
  }
  updateDir() {
    const a = (this.heading + Math.PI * 2) % (Math.PI * 2);
    if (a < Math.PI / 4 || a > 7 * Math.PI / 4) { this.dir = 'E'; this.flip = false; }
    else if (a < 3 * Math.PI / 4) { this.dir = 'S'; this.flip = false; }
    else if (a < 5 * Math.PI / 4) { this.dir = 'E'; this.flip = true; }
    else { this.dir = 'N'; this.flip = false; }
  }
  spawnWake() {
    const r = 1.1 + Math.random() * 0.8;
    const g = new Graphics().rect(-r, -r, r * 2, r * 2).fill(0xdff3ff);
    const back = 32 * SHIP_W * 0.42;                      // 从船尾冒出来，随船一起放大
    const bx = S.ship.x * WS - Math.cos(this.heading) * back, by = S.ship.y * WS - Math.sin(this.heading) * back + 1.5;
    g.position.set(bx + (Math.random() * 3 - 1.5), by + (Math.random() * 2.4 - 1.2)); g.alpha = 0.55;
    this.wakeLayer.addChild(g); this.wakes.push({ g, life: 1.6 });
  }

  /* ----- 每帧 ----- */
  tick(t) {
    const dt = Math.min(0.05, t.deltaMS / 1000);
    this.slowT = (this.slowT || 0) + t.deltaMS;
    const slow = this.slowT > 130;                 // 约 8 次/秒的低频活
    if (slow) this.slowT = 0;
    // 帧率读数（滑动平均），方便直接看当前机器上的真实帧率
    this.fps = this.fps ? this.fps * 0.92 + (1000 / Math.max(1, t.deltaMS)) * 0.08 : 1000 / Math.max(1, t.deltaMS);
    if (slow) { const fe = document.getElementById('fpsv'); if (fe) { const v = Math.round(this.fps); fe.textContent = `${v}fps`; fe.style.color = v >= 50 ? '' : v >= 30 ? '#f2c14e' : '#e8646c'; } }
    this.frameT += t.deltaMS;
    if (this.frameT > 350) { this.frameT = 0; this.frame = (this.frame + 1) % this.waterFrames.length; this.water.texture = this.waterFrames[this.frame]; this.water2.texture = this.waterFrames[(this.frame + 3) % this.waterFrames.length]; }
    const ws = S && S.weather?.type === 'storm' ? 3 : S && S.weather?.type === 'rain' ? 1.6 : 1;
    this.water.tilePosition.x += dt * 5 * ws; this.water.tilePosition.y += dt * 1.5 * ws;
    this.water2.tilePosition.x -= dt * 3 * ws; this.water2.tilePosition.y += dt * 2.5 * ws;
    for (const w of this.wakes) { w.life -= dt; w.g.alpha = Math.max(0, w.life / 1.4) * 0.6; w.g.scale.set(1 + (1.4 - w.life) * 0.5); }
    this.wakes = this.wakes.filter(w => { if (w.life <= 0) { w.g.destroy(); return false; } return true; });
    if (!S) return;
    if (slow || this._modal === undefined) this._modal = !!document.querySelector('.modal-bg');
    const modalOpen = this._modal;
    const wt = this.mode === 'battle' ? 'clear' : (S.weather?.type || 'clear');
    this.weather.tick(dt, wt);
    if (this.mode === 'battle') { this.battle.tick(dt); return; }
    const [sx, sy] = this.weather.shakeOffset(); this.app.stage.position.set(Math.round(sx), Math.round(sy));
    if (this.mode === 'port') { if (!modalOpen) this.port.tick(dt); return; }
    if (this.zoomTarget != null) {
      const d = this.zoomTarget - this.zoom;
      if (Math.abs(d) < 0.008) { this.applyZoom(this.zoomTarget); this.zoomTarget = null; }
      else this.applyZoom(this.zoom + d * Math.min(1, dt * 4.5));
    }
    if (!modalOpen) { if (S.dest) this.move(dt); this.npc.tick(dt, modalOpen); }
    this.placeShip();
    if (this.follow) this.followCamera();
    if (slow) { this.layoutLabels(); this.updateNight(); this.updateBanner(); }
  }
  placeShip() {
    this.ship.position.set(S.ship.x * WS, S.ship.y * WS);
    const bob = Math.floor(performance.now() / (S.dest ? 280 : 700)) % 2;
    this.ship.texture = this.shipTex[this.dir][bob];
    this.ship.scale.set(SHIP_W * (this.flip ? -1 : 1), SHIP_W);
  }
  updateNight() {
    const lonShift = (S.ship.x / MAP_W - 0.5) * 0.5;      // 经度带来的时差
    const d = (Math.cos((S.dayAcc + lonShift) * Math.PI * 2) + 1) / 2;
    this.night.alpha = 0.5 * Math.pow(d, 1.6);
  }
  updateBanner() {
    const el = document.getElementById('sailbanner'); if (!el) return;
    if (!S.dest) { if (el.style.display !== 'none') el.style.display = 'none'; return; }
    const v = S.voyage; const hour = Math.floor(S.dayAcc * 24);
    const left = Math.max(1, Math.ceil((v.total - v.traveled) / dayDistance()));
    const txt = `⛵ → ${port(S.dest).name} · 第 ${v.days + 1} 天 · 约剩 ${left} 天 · ${String(hour).padStart(2, '0')}:00 · ${WEATHER_ICON[S.weather?.type || 'clear']} · 补给 ${S.supplies}`;
    if (el.textContent !== txt) el.textContent = txt; if (el.style.display !== 'block') el.style.display = 'block';
  }

  /* ----- 镜头 ----- */
  followCamera() {
    const vw = this.app.screen.width, vh = this.app.screen.height, z = this.zoom;
    const tx = vw / 2 - S.ship.x * WS * z, ty = vh / 2 - S.ship.y * WS * z;
    this.world.x += (tx - this.world.x) * 0.08; this.world.y += (ty - this.world.y) * 0.08; this.clampCamera();
  }
  snapCamera() {
    const vw = this.app.screen.width, vh = this.app.screen.height, z = this.zoom;
    this.world.position.set(vw / 2 - S.ship.x * WS * z, vh / 2 - S.ship.y * WS * z); this.clampCamera();
  }
  clampCamera() {
    const vw = this.app.screen.width, vh = this.app.screen.height, z = this.zoom;
    const ww = MAP_W * WS * z, wh = MAP_H * WS * z;
    this.world.x = ww <= vw ? (vw - ww) / 2 : clamp(this.world.x, vw - ww, 0);
    this.world.y = wh <= vh ? (vh - wh) / 2 : clamp(this.world.y, vh - wh, 0);
  }
  recenter(glide = true) {
    this.follow = true;
    if (glide) this.glideZoom(S.dest ? SAIL_ZOOM : PORT_ZOOM, true);
    else this.snapCamera();
  }
  /** 屏幕坐标 → 逻辑地图坐标 */
  toWorld(sx, sy) { return { x: (sx - this.world.x) / this.zoom / WS, y: (sy - this.world.y) / this.zoom / WS }; }
}
