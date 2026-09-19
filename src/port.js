/* 港口场景：运行时生成的像素街景 + 建筑热区 + 路人 / 海鸥 / 旗子 / 烟 / 浪花动画（全部原创） */
import { Container, Sprite, Graphics, Text } from 'pixi.js';
import { S, hooks, port, zone } from './game.js';
import { canvasTexture, pixelsToCanvas } from './pixelart.js';
import { seeded, hash, clamp } from './util.js';

const FONT = '"PingFang SC","Hiragino Sans GB","Microsoft YaHei",sans-serif';
const BASE_H = 200;

/* 各地区建筑风格（由 ZONES[].style 选择） */
const STYLES = {
  iberian: { wall: '#e8dcc0', wall2: '#cbbfa0', beam: '#5a3a22', roof: '#9a3f2e', roof2: '#6e2b20', roofStyle: 'gable', ground: '#8a8a7a', ground2: '#6f6f62', hill: '#3f6a48', hill2: '#2f5238', sky: ['#4f8fd0', '#a8d4f0'] },
  northern: { wall: '#6b4a2a', wall2: '#553a20', beam: '#2e1c0e', roof: '#5a6a7a', roof2: '#3e4a56', roofStyle: 'steep', ground: '#767676', ground2: '#5a5a5a', hill: '#4a6a5a', hill2: '#36503f', sky: ['#5f88ae', '#c4d6e6'] },
  mediterranean: { wall: '#f0ece0', wall2: '#d6d1c0', beam: '#8a6a3a', roof: '#b4653a', roof2: '#8a482a', roofStyle: 'flat', ground: '#c0b49a', ground2: '#a09274', hill: '#7a8a5a', hill2: '#5c6a42', sky: ['#4fa0e0', '#cfe8f6'] },
  ottoman: { wall: '#e6dcc8', wall2: '#c8bda6', beam: '#6a5a3a', roof: '#8a7a5a', roof2: '#6a5c42', roofStyle: 'dome', ground: '#b0a488', ground2: '#8e836a', hill: '#8a8a5a', hill2: '#6a6a42', sky: ['#6fb0e0', '#f0dcc0'] },
  westafrican: { wall: '#d9b077', wall2: '#b9925c', beam: '#7a5a3a', roof: '#8a7a3a', roof2: '#66582a', roofStyle: 'thatch', ground: '#c8b07a', ground2: '#a68e5a', hill: '#3f8a4a', hill2: '#2f6a38', sky: ['#3fa8e0', '#b8ecf6'] },
  indian: { wall: '#f0e0c8', wall2: '#d4c2a4', beam: '#8a4a2a', roof: '#a85a3a', roof2: '#80402a', roofStyle: 'curved', ground: '#c0a888', ground2: '#9c8666', hill: '#5a8a4a', hill2: '#446a38', sky: ['#6fbce0', '#f6e0c0'] },
  seasia: { wall: '#d8c08a', wall2: '#b8a06c', beam: '#6a4a2a', roof: '#7a6a3a', roof2: '#5a4c28', roofStyle: 'thatch', ground: '#b8a878', ground2: '#96885c', hill: '#2f8a4a', hill2: '#236a38', sky: ['#3fb0e0', '#c8f0f6'] },
  eastasia: { wall: '#f0ece0', wall2: '#d6d1c0', beam: '#7a3a2a', roof: '#2f6a5a', roof2: '#214a40', roofStyle: 'curved', ground: '#9a8a7a', ground2: '#7a6a5a', hill: '#4a7a4a', hill2: '#365c36', sky: ['#7fb4e6', '#f0d0dc'] },
  colonial: { wall: '#e6eef7', wall2: '#c4d2e2', beam: '#6a5a4a', roof: '#a85a4a', roof2: '#823f34', roofStyle: 'gable', ground: '#b8b0a0', ground2: '#968e80', hill: '#4a8a5a', hill2: '#356a42', sky: ['#4fbce6', '#d8f0f8'] },
  brazil: { wall: '#f0dcc0', wall2: '#d2bd9e', beam: '#7a5a3a', roof: '#b06a3a', roof2: '#8a4e2a', roofStyle: 'flat', ground: '#c4a880', ground2: '#a08a64', hill: '#2f8a4a', hill2: '#236a38', sky: ['#3fa8e0', '#ffe0b0'] },
};
const styleOf = p => STYLES[zone(p.zone)?.style] || STYLES.iberian;
const BUILDINGS = [
  { key: 'market', name: '货栈', ptab: 'market' },
  { key: 'tavern', name: '酒馆', ptab: 'tavern' },
  { key: 'office', name: '港务府', ptab: 'invest' },
  { key: 'yard', name: '造船厂', ptab: 'yard' },
];

/* ---- 小精灵 ---- */
const PED_ROWS = [[
  '....hhhh....', '...hhhhhh...', '...hssssh...', '....ssss....', '...cccccc...', '..cccccccc..', '..s.cccc.s..', '....cccc....',
  '....pppp....', '....pppp....', '...pp..pp...', '...pp..pp...', '..pp....pp..', '..bb....bb..', '............', '............',
], [
  '............', '....hhhh....', '...hhhhhh...', '...hssssh...', '....ssss....', '...cccccc...', '..cccccccc..', '..s.cccc.s..',
  '....cccc....', '....pppp....', '....pppp....', '....pppp....', '....pppp....', '....pppp....', '....bbbb....', '............',
]];
const SHIRTS = ['#c0392b', '#2a8a8a', '#d6b04f', '#4f8fd6', '#6a2a5a', '#3f6b3a'];
const GULL_ROWS = [
  ['.w.....w.', '..w...w..', '...wbw...', '.........', '.........'],
  ['.........', 'ww.....ww', '..wwbww..', '.........', '.........'],
  ['.........', '.........', '...wbw...', '..w...w..', '.w.....w.'],
];
const FLAG_ROWS = f => [
  ['ffffffff', 'ffllffff', 'ffffffff', 'ffffffll', 'ffffffff', 'ffffff..'],
  ['ffffffff', 'fllfffff', 'fffffff.', 'fffffll.', 'ffffff..', 'fffff...'],
  ['fffffff.', 'ffllfff.', 'ffffffff', 'ffffllff', 'ffffffff', 'fffffff.'],
][f];
const CLOUD_ROWS = [
  '......wwww......', '...wwwwwwwww....', '.wwwwwwwwwwwww..', 'wwwwwwwwwwwwwwww', '.wwwwwwwwwwwwww.', '...wwwwwwwwww...',
];

function hexLerp(a, b, t) {
  const pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16);
  const c = k => Math.round(((pa >> k) & 255) + (((pb >> k) & 255) - ((pa >> k) & 255)) * t);
  return '#' + [c(16), c(8), c(0)].map(v => v.toString(16).padStart(2, '0')).join('');
}

export class PortScene {
  constructor(app, shipTex) {
    this.app = app; this.shipTex = shipTex;
    this.root = new Container(); this.root.visible = false;
    this.scene = new Container(); this.root.addChild(this.scene);
    this.labels = new Container(); this.labels.eventMode = 'none'; this.root.addChild(this.labels);
    this.pid = null; this.size = ''; this.t = 0; this.hover = null;
    this.pedTex = SHIRTS.map(c => PED_ROWS.map(r => canvasTexture(pixelsToCanvas(r, { h: '#3a2a1c', s: '#e9bd98', c, p: '#2a3a5a', b: '#3a2412' }, 1))));
    this.gullTex = GULL_ROWS.map(r => canvasTexture(pixelsToCanvas(r, { w: '#f4f4f4', b: '#888' }, 1)));
    this.cloudTex = canvasTexture(pixelsToCanvas(CLOUD_ROWS, { w: '#f6f8fb' }, 1));
    this.resizeT = 0;
  }

  /* ---------- 进入某港口 ---------- */
  show(pid) {
    const vw = this.app.screen.width, vh = this.app.screen.height;
    const size = `${vw}x${vh}`;
    if (pid === this.pid && size === this.size) return;
    this.pid = pid; this.size = size; this.build();
  }
  build() {
    const vw = this.app.screen.width, vh = this.app.screen.height;
    const K = Math.max(2, Math.floor(Math.min(vw / 320, vh / BASE_H)));
    this.K = K; const W = Math.ceil(vw / K), H = Math.ceil(vh / K);
    this.W = W; this.H = H;
    this.scene.removeChildren().forEach(c => c.destroy({ children: true }));
    this.labels.removeChildren().forEach(c => c.destroy({ children: true }));
    this.scene.scale.set(K);
    const p = port(this.pid), st = styleOf(p), rng = seeded(hash(p.id) + 11);
    const horizon = Math.round(H * 0.42), groundY = Math.round(H * 0.70), seaY = Math.round(H * 0.84);
    this.groundY = groundY; this.seaY = seaY;

    /* 背景画布 */
    const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
    const x = cv.getContext('2d');
    const px = (a, b, w, h, col) => { x.fillStyle = col; x.fillRect(Math.round(a), Math.round(b), Math.round(w), Math.round(h)); };
    // 天空：分带 + 抖动
    for (let y = 0; y < horizon; y++) {
      const t = y / horizon, bands = 7, q = Math.floor(t * bands) / bands, q2 = Math.min(1, q + 1 / bands), frac = t * bands - Math.floor(t * bands);
      px(0, y, W, 1, hexLerp(st.sky[0], st.sky[1], q));
      if (frac > 0.6) { x.fillStyle = hexLerp(st.sky[0], st.sky[1], q2); for (let i = (y % 2); i < W; i += 2) x.fillRect(i, y, 1, 1); }
    }
    // 远山两层
    const hill = (yBase, amp, col, seedOff) => { const r = seeded(hash(p.id) + seedOff); let hx = 0; while (hx < W) { const w = 30 + Math.floor(r() * 40), h = amp * (0.5 + r()); for (let i = 0; i < w && hx + i < W; i++) { const hh = Math.round(h * Math.sin(Math.PI * i / w)); px(hx + i, yBase - hh, 1, hh + 1, col); } hx += w - 6; } };
    hill(horizon + 4, 26, st.hill2, 3); hill(horizon + 8, 16, st.hill, 5);
    px(0, horizon + 6, W, groundY - horizon - 6, st.hill2);
    // 城墙 / 远景房屋剪影
    px(0, groundY - 30, W, 30, hexLerp(st.hill2, '#000000', 0.25));
    for (let i = 0, hx = 2; hx < W; i++) { const w = 10 + Math.floor(rng() * 12), h = 14 + Math.floor(rng() * 16); px(hx, groundY - h, w, h, hexLerp(st.wall2, '#000000', 0.45)); px(hx - 1, groundY - h - 3, w + 2, 3, hexLerp(st.roof2, '#000000', 0.35)); for (let k = 0; k < 2; k++) px(hx + 2 + Math.floor(rng() * (w - 4)), groundY - h + 3 + Math.floor(rng() * (h - 8)), 2, 2, '#f2c14e'); hx += w + 2 + Math.floor(rng() * 4); }
    // 地面 / 石板
    px(0, groundY, W, seaY - groundY, st.ground);
    for (let i = 0; i < W * 2; i++) px(Math.floor(rng() * W), groundY + 1 + Math.floor(rng() * (seaY - groundY - 2)), 1 + Math.floor(rng() * 3), 1, st.ground2);
    px(0, groundY, W, 1, hexLerp(st.ground, '#ffffff', 0.25));
    // 码头边 / 海
    px(0, seaY - 3, W, 3, '#5a4a36'); px(0, seaY - 3, W, 1, '#7a6a50');
    for (let i = 0; i < W; i += 9) px(i, seaY - 5, 2, 5, '#3e2a16');
    px(0, seaY, W, H - seaY, '#1c4f78');
    for (let i = 0; i < W * 1.2; i++) px(Math.floor(rng() * W), seaY + 2 + Math.floor(rng() * (H - seaY - 2)), 2 + Math.floor(rng() * 3), 1, rng() < 0.5 ? '#2d6f9c' : '#17436a');

    /* 主体建筑 */
    this.hot = []; this.windows = []; this.flagPos = null; this.smokePos = null;
    const slots = [0.06, 0.30, 0.54, 0.79].map(f => Math.round(W * f));
    const widths = [Math.round(W * 0.18), Math.round(W * 0.17), Math.round(W * 0.18), Math.round(W * 0.19)];
    BUILDINGS.forEach((b, i) => {
      const w = widths[i], h = b.key === 'office' ? 46 + Math.floor(rng() * 6) : b.key === 'yard' ? 30 + Math.floor(rng() * 4) : 34 + Math.floor(rng() * 8);
      const bx = slots[i], by = groundY - 2;
      const info = this.drawBuilding(x, px, bx, by, w, h, st, b.key, rng, p);
      this.hot.push({ ...b, rect: { x: bx - 2, y: by - h - (info.roofH || 10), w: w + 4, h: h + (info.roofH || 10) + 2 } });
    });
    // 路灯 / 木箱 / 树
    for (let lx = 14; lx < W; lx += Math.round(W / 4)) { px(lx, seaY - 16, 1, 13, '#2a2a2a'); px(lx - 1, seaY - 18, 3, 3, '#f2c14e'); px(lx - 2, seaY - 19, 5, 1, '#2a2a2a'); }
    const tree = (tx, ty) => { if (st.roofStyle === 'thatch' || st === STYLES.brazil) { px(tx, ty - 14, 2, 14, '#7a5a3a'); for (const [dx, dy] of [[-6, -14], [4, -15], [-3, -18], [3, -19], [-7, -11], [6, -11]]) px(tx + dx, ty + dy, 5, 2, '#2f8a4a'); } else { px(tx, ty - 10, 2, 10, '#5a3a22'); px(tx - 4, ty - 18, 10, 9, '#2c6a3a'); px(tx - 2, ty - 21, 6, 4, '#2c6a3a'); px(tx - 3, ty - 16, 3, 3, '#3f8a4a'); } };
    tree(slots[1] - 8, groundY - 1); tree(W - 6, groundY - 1);

    this.bg = new Sprite(canvasTexture(cv)); this.scene.addChild(this.bg);

    /* 窗灯（夜晚） */
    this.glow = new Graphics();
    for (const wnd of this.windows) this.glow.rect(wnd.x, wnd.y, wnd.w, wnd.h).fill(0xffd27a);
    this.glow.alpha = 0; this.scene.addChild(this.glow);

    /* 云 */
    this.clouds = [];
    for (let i = 0; i < 3; i++) { const c = new Sprite(this.cloudTex); c.alpha = 0.85; c.position.set(rng() * W, 6 + rng() * (horizon * 0.5)); c.vx = 2 + rng() * 3; this.scene.addChild(c); this.clouds.push(c); }
    /* 烟 */
    this.smokeLayer = new Container(); this.scene.addChild(this.smokeLayer); this.smoke = []; this.smokeT = 0;
    /* 海鸥 */
    this.gulls = [];
    for (let i = 0; i < 3; i++) { const g = new Sprite(this.gullTex[0]); g.anchor.set(0.5); g.position.set(rng() * W, 10 + rng() * (horizon - 20)); g.vx = (8 + rng() * 8) * (rng() < 0.5 ? -1 : 1); g.scale.x = g.vx > 0 ? 1 : -1; g.phase = rng() * 6; g.baseY = g.y; this.scene.addChild(g); this.gulls.push(g); }
    /* 路人 */
    this.peds = [];
    for (let i = 0; i < 4; i++) { const v = Math.floor(rng() * SHIRTS.length); const s = new Sprite(this.pedTex[v][0]); s.anchor.set(0.5, 1); s.position.set(rng() * W, seaY - 6 - Math.floor(rng() * 8)); s.vx = (6 + rng() * 6) * (rng() < 0.5 ? -1 : 1); s.scale.x = s.vx > 0 ? 1 : -1; s.variant = v; s.pause = 0; this.scene.addChild(s); this.peds.push(s); }
    /* 旗子 */
    this.flag = null;
    if (this.flagPos) { const zc = zone(p.zone).color; this.flagTex = [0, 1, 2].map(f => canvasTexture(pixelsToCanvas(FLAG_ROWS(f), { f: zc, l: '#ffffff' }, 1))); this.flag = new Sprite(this.flagTex[0]); this.flag.position.set(this.flagPos.x + 1, this.flagPos.y); this.scene.addChild(this.flag); }
    /* 浪花 */
    const foam = f => { const c = document.createElement('canvas'); c.width = W; c.height = 3; const fx = c.getContext('2d'); const r = seeded(77 + f); for (let i = 0; i < W; i += 1) { if (r() < 0.45) { fx.fillStyle = r() < 0.5 ? '#cfe8f5' : '#86c0dc'; fx.fillRect(i, f === 0 ? 0 : 1, 2, 1); } } return canvasTexture(c); };
    this.foamTex = [foam(0), foam(1)]; this.foam = new Sprite(this.foamTex[0]); this.foam.position.set(0, seaY); this.scene.addChild(this.foam);
    /* 停泊的船（点击出海） */
    this.ship = new Sprite(this.shipTex.E[0]); this.ship.anchor.set(0.5, 0.75); this.ship.scale.set(2); this.ship.position.set(Math.round(W * 0.5), seaY + 10);
    this.ship.eventMode = 'static'; this.ship.cursor = 'pointer';
    this.ship.on('pointertap', () => hooks.openSeaMap());
    this.ship.on('pointerover', () => { this.ship.tint = 0xffffaa; this.setHover('ship'); }); this.ship.on('pointerout', () => { this.ship.tint = 0xffffff; this.setHover(null); });
    this.scene.addChild(this.ship);
    /* 色调遮罩 */
    this.warm = new Graphics().rect(0, 0, W, H).fill(0xff7a2a); this.warm.alpha = 0; this.warm.eventMode = 'none'; this.scene.addChild(this.warm);
    this.night = new Graphics().rect(0, 0, W, H).fill(0x0a1030); this.night.alpha = 0; this.night.eventMode = 'none'; this.scene.addChild(this.night);
    /* 热区 + 标签 */
    this.outlines = {};
    for (const h of this.hot) {
      const g = new Graphics().rect(h.rect.x, h.rect.y, h.rect.w, h.rect.h).fill({ color: 0xffffff, alpha: 0.001 });
      g.eventMode = 'static'; g.cursor = 'pointer';
      g.on('pointertap', () => hooks.openPortTab(h.ptab));
      g.on('pointerover', () => this.setHover(h.key)); g.on('pointerout', () => this.setHover(null));
      this.scene.addChild(g);
      const o = new Graphics().rect(h.rect.x, h.rect.y, h.rect.w, h.rect.h).stroke({ width: 1, color: 0xf2c14e }); o.visible = false; o.eventMode = 'none'; this.scene.addChild(o); this.outlines[h.key] = o;
      const t = new Text({ text: h.name, style: { fontFamily: FONT, fontSize: 12, fill: '#e8f0f8', stroke: { color: '#06101a', width: 3 } } });
      t.anchor.set(0.5, 1); t.position.set((h.rect.x + h.rect.w / 2) * K, (h.rect.y - 2) * K); t.alpha = 0.8; this.labels.addChild(t); h.label = t;
    }
    /* 任务标记 ! / ? */
    this.markers = {};
    const mk = (k, x, y) => { const t = new Text({ text: '!', style: { fontFamily: '"Press Start 2P",monospace', fontSize: 16, fill: '#f2c14e', stroke: { color: '#06101a', width: 4 } } }); t.anchor.set(0.5, 1); t.position.set(x, y); t.visible = false; t.baseY = y; this.labels.addChild(t); this.markers[k] = t; };
    for (const h of this.hot) mk(h.key, (h.rect.x + h.rect.w / 2) * K, (h.rect.y - 2) * K - 16);
    mk('ship', this.ship.x * K, (this.ship.y - 14) * K);
    this.refreshMarkers();
    const shipLabel = new Text({ text: '出海 ▸ 海图', style: { fontFamily: FONT, fontSize: 12, fill: '#f2c14e', stroke: { color: '#06101a', width: 3 } } });
    shipLabel.anchor.set(0.5, 0); shipLabel.position.set(this.ship.x * K, (this.ship.y + 8) * K); this.labels.addChild(shipLabel);
    const plate = new Text({ text: `◆ ${p.name} · ${zone(p.zone).name}`, style: { fontFamily: FONT, fontSize: 14, fontWeight: '700', fill: '#f2c14e', stroke: { color: '#06101a', width: 4 }, letterSpacing: 2 } });
    plate.position.set(12, vh - 30); this.labels.addChild(plate);
  }

  /* ---------- 画一栋建筑，返回屋顶高度等信息 ---------- */
  drawBuilding(x, px, bx, by, w, h, st, kind, rng, p) {
    const top = by - h;
    px(bx, top, w, h, st.wall); px(bx + Math.round(w * 0.7), top, Math.round(w * 0.3), h, st.wall2);
    if (st.roofStyle === 'gable') { for (let i = 0; i <= w; i += Math.max(6, Math.round(w / 4))) px(bx + Math.min(i, w - 1), top, 1, h, st.beam); px(bx, top + Math.round(h / 2), w, 1, st.beam); px(bx, top, w, 1, st.beam); }
    if (st === STYLES.ottoman || st === STYLES.mediterranean) { for (let yy = top + 2; yy < by; yy += 4) for (let xx = bx + ((yy / 4) % 2 ? 2 : 0); xx < bx + w; xx += 6) px(xx, yy, 4, 1, st.wall2); }
    if (st.roofStyle === 'steep') { for (let yy = top + 3; yy < by; yy += 3) px(bx, yy, w, 1, st.beam); }
    // 窗
    const rows = h > 40 ? 3 : 2, cols = Math.max(2, Math.floor(w / 9));
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      const wx = bx + 3 + c * Math.floor((w - 6) / cols) + 1, wy = top + 5 + r * Math.floor((h - 14) / rows);
      if (kind !== 'yard' && r === rows - 1 && c === Math.floor(cols / 2)) continue; // 门的位置
      px(wx - 1, wy - 1, 5, 6, st.beam); px(wx, wy, 3, 4, '#1a2a4a'); px(wx, wy, 1, 1, '#5a7aa8');
      this.windows.push({ x: wx, y: wy, w: 3, h: 4 });
    }
    // 门
    const dw = kind === 'yard' ? Math.round(w * 0.5) : 7, dh = kind === 'yard' ? Math.round(h * 0.6) : 10, dx = bx + Math.round(w / 2 - dw / 2);
    px(dx - 1, by - dh - 1, dw + 2, dh + 1, st.beam); px(dx, by - dh, dw, dh, kind === 'yard' ? '#1a1a1a' : '#4a2a1a'); if (kind !== 'yard') px(dx + dw - 2, by - dh + 5, 1, 1, '#f2c14e');
    // 屋顶
    let roofH = 10;
    const rs = st.roofStyle;
    if (rs === 'gable' || rs === 'steep') { roofH = rs === 'steep' ? Math.round(w * 0.36) : Math.round(w * 0.22); for (let i = 0; i < roofH; i++) { const inset = Math.round(i * (w / 2 + 2) / roofH); px(bx - 2 + inset, top - roofH + i, w + 4 - inset * 2, 1, i % 3 === 0 ? st.roof2 : st.roof); } }
    else if (rs === 'curved') { roofH = 9; for (let i = 0; i < roofH; i++) { const inset = Math.round(i * i / roofH * 1.2); px(bx - 4 + inset, top - roofH + i, w + 8 - inset * 2, 1, i % 2 ? st.roof2 : st.roof); } px(bx - 5, top - 2, 2, 2, st.roof2); px(bx + w + 3, top - 2, 2, 2, st.roof2); }
    else if (rs === 'thatch') { roofH = 9; for (let i = 0; i < roofH; i++) { const inset = Math.round(i * 4 / roofH); px(bx - 3 + inset, top - roofH + i, w + 6 - inset * 2, 1, i % 2 ? st.roof2 : st.roof); } for (let i = 0; i < w + 6; i += 3) px(bx - 3 + i, top, 1, 2, st.roof2); }
    else if (rs === 'dome') { roofH = Math.round(w * 0.4); const r = w / 2 + 1; for (let i = 0; i < roofH; i++) { const yy = roofH - i; const half = Math.sqrt(Math.max(0, r * r - (yy * r / roofH) ** 2)); px(bx + w / 2 - half, top - roofH + i, half * 2, 1, i % 3 === 0 ? st.roof2 : st.roof); } px(bx + w / 2 - 1, top - roofH - 4, 2, 4, '#f2c14e'); }
    else { roofH = 5; px(bx - 2, top - 3, w + 4, 3, st.roof); for (let i = 0; i < w + 4; i += 4) px(bx - 2 + i, top - 5, 2, 2, st.roof); px(bx - 2, top - 3, w + 4, 1, st.beam); }
    // 功能装饰
    if (kind === 'market') { const ay = by - 16; for (let i = 0; i < w + 4; i += 3) px(bx - 2 + i, ay, 3, 3, i % 6 ? '#e8e0cc' : '#c0392b'); px(bx - 2, ay + 3, w + 4, 1, st.beam); for (const [cx, cy, cw] of [[bx + w + 4, by - 6, 6], [bx + w + 11, by - 5, 5], [bx + w + 5, by - 11, 5]]) { px(cx, cy, cw, cw, '#8a6a3a'); px(cx, cy, cw, 1, '#a88a5a'); px(cx + 1, cy + 1, cw - 2, cw - 2, '#6a4a2a'); } }
    if (kind === 'tavern') { px(bx + w - 4, top - roofH - 4, 3, roofH + 4, st.beam); this.smokePos = { x: bx + w - 3, y: top - roofH - 4 }; px(bx - 6, top + 8, 1, 6, st.beam); px(bx - 9, top + 12, 7, 6, '#4a2a1a'); px(bx - 8, top + 13, 5, 4, '#f2c14e'); px(bx - 7, top + 14, 3, 2, '#e8e0cc'); px(bx + w + 2, by - 7, 5, 7, '#7a5a3a'); px(bx + w + 2, by - 5, 5, 1, '#3a2412'); px(bx + w + 2, by - 3, 5, 1, '#3a2412'); }
    if (kind === 'office') { px(bx + Math.round(w / 2), top - roofH - 14, 1, 14, '#2a2a2a'); this.flagPos = { x: bx + Math.round(w / 2), y: top - roofH - 14 }; px(bx + 3, top + 4, 5, 12, zone(p.zone).color); px(bx + w - 8, top + 4, 5, 12, zone(p.zone).color); px(bx - 3, by - 3, w + 6, 3, hexLerp(st.ground, '#ffffff', 0.15)); px(bx - 5, by - 1, w + 10, 1, st.ground2); }
    if (kind === 'yard') { const cx = bx + w + 6; px(cx, by - 40, 2, 40, '#5a3a22'); px(cx, by - 40, 18, 2, '#5a3a22'); px(cx + 14, by - 38, 1, 12, '#c8b07a'); px(cx + 10, by - 26, 9, 3, '#8a6a3a'); for (let i = 0; i < 6; i++) px(bx + 6 + i * 4, by - 4 - i, 3, 1, '#a88a5a'); px(bx - 4, by - 8, 12, 2, '#6b4a2a'); px(bx - 2, by - 12, 8, 4, '#6b4a2a'); }
    return { roofH: roofH + (kind === 'office' ? 14 : kind === 'tavern' ? 4 : 0) };
  }

  refreshMarkers() {
    if (!this.markers || !this.pid) return;
    const m = hooks.portMarkers(this.pid);
    for (const k in this.markers) { const t = this.markers[k]; if (m[k]) { t.text = m[k]; t.visible = true; } else t.visible = false; }
  }
  setHover(key) {
    this.hover = key;
    for (const h of this.hot) { const on = h.key === key; this.outlines[h.key].visible = on; h.label.alpha = on ? 1 : 0.8; h.label.style.fill = on ? '#f2c14e' : '#e8f0f8'; }
  }

  /* ---------- 每帧 ---------- */
  tick(dt) {
    if (!this.pid) return;
    this.resizeT += dt; if (this.resizeT > 0.3) { this.resizeT = 0; this.show(this.pid); }
    this.t += dt; const W = this.W, t = this.t;
    for (const c of this.clouds) { c.x += c.vx * dt; if (c.x > W + 4) c.x = -20; }
    for (const g of this.gulls) { g.x += g.vx * dt; g.y = g.baseY + Math.sin(t * 2 + g.phase) * 3; g.texture = this.gullTex[Math.floor(t * 8 + g.phase) % 3]; if (g.x > W + 10) { g.x = -10; } if (g.x < -10) g.x = W + 10; }
    for (const s of this.peds) {
      if (s.pause > 0) { s.pause -= dt; s.texture = this.pedTex[s.variant][1]; continue; }
      s.x += s.vx * dt; s.texture = this.pedTex[s.variant][Math.floor(t * 6 + s.variant) % 2];
      if (Math.random() < dt * 0.15) s.pause = 1 + Math.random() * 2;
      if (s.x > W + 8) { s.vx = -Math.abs(s.vx); s.scale.x = -1; } if (s.x < -8) { s.vx = Math.abs(s.vx); s.scale.x = 1; }
    }
    if (this.flag) this.flag.texture = this.flagTex[Math.floor(t * 6) % 3];
    if (this.markers) for (const k in this.markers) { const mk = this.markers[k]; if (mk.visible) mk.y = mk.baseY + Math.sin(t * 4) * 4; }
    this.foam.texture = this.foamTex[Math.floor(t * 2) % 2];
    this.ship.texture = this.shipTex.E[Math.floor(t * 1.6) % 2];
    if (this.smokePos) { this.smokeT += dt; if (this.smokeT > 0.35) { this.smokeT = 0; const g = new Graphics().rect(0, 0, 2, 2).fill(0xd8d8d8); g.position.set(this.smokePos.x, this.smokePos.y); g.alpha = 0.7; this.smokeLayer.addChild(g); this.smoke.push({ g, life: 2.2 }); } }
    for (const s of this.smoke) { s.life -= dt; s.g.y -= dt * 6; s.g.x += Math.sin(t * 3 + s.life) * dt * 3; s.g.alpha = Math.max(0, s.life / 2.2) * 0.7; s.g.scale.set(1 + (2.2 - s.life) * 0.5); }
    this.smoke = this.smoke.filter(s => { if (s.life <= 0) { s.g.destroy(); return false; } return true; });
    // 昼夜
    const d = (Math.cos(S.dayAcc * Math.PI * 2) + 1) / 2, dusk = 1 - Math.abs(2 * d - 1);
    this.night.alpha = 0.55 * Math.pow(d, 1.6); this.warm.alpha = 0.22 * dusk * dusk; this.glow.alpha = clamp(d * 1.2 - 0.2, 0, 1);
  }
}
