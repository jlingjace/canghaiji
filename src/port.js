/* 港口场景：运行时生成的像素街景 + 建筑热区 + 路人 / 海鸥 / 旗子 / 烟 / 浪花动画（全部原创） */
import { Container, Sprite, Graphics, Text } from 'pixi.js';
import { S, hooks, port, zone } from './game.js';
import { canvasTexture, pixelsToCanvas } from './pixelart.js';
import { seeded, hash, clamp } from './util.js';
import * as A from './art.js';

const FONT = '"PingFang SC","Hiragino Sans GB","Microsoft YaHei",sans-serif';
const BASE_W = 480, BASE_H = 300;   // 场景内部分辨率：像素更细，才画得下屋檐、窗台、招牌

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
    const K = Math.max(2, Math.floor(Math.min(vw / BASE_W, vh / BASE_H)));
    this.K = K; const W = Math.ceil(vw / K), H = Math.ceil(vh / K);
    this.W = W; this.H = H;
    this.scene.removeChildren().forEach(c => c.destroy({ children: true }));
    this.labels.removeChildren().forEach(c => c.destroy({ children: true }));
    this.scene.scale.set(K);
    const p = port(this.pid), st = styleOf(p), rng = seeded(hash(p.id) + 11);
    const horizon = Math.round(H * 0.34), groundY = Math.round(H * 0.72), seaY = Math.round(H * 0.855);
    const townY = Math.round(H * 0.58), wallY = townY;    // 中景城镇的地平 / 城墙顶
    this.groundY = groundY; this.seaY = seaY;

    /* ===== 背景画布：从远到近一层层画上去 ===== */
    const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
    const x = cv.getContext('2d');
    const px = (a, b, w, h, col) => { x.fillStyle = col; x.fillRect(Math.round(a), Math.round(b), Math.max(0, Math.round(w)), Math.max(0, Math.round(h))); };
    const N = A.makeNoise(hash(p.id) + 7);
    const skyLow = st.sky[1];

    /* --- 天空：抖动渐变 + 太阳与辉光 --- */
    A.ditherGradient(x, 0, 0, W, horizon + 6, st.sky[0], skyLow, 16);
    const sunX = Math.round(W * 0.22), sunY = Math.round(horizon * 0.34);
    for (let r = 26; r > 0; r--) {                       // 辉光
      x.globalAlpha = 0.030 * (1 - r / 26);
      x.fillStyle = '#fff2c8'; x.beginPath(); x.arc(sunX, sunY, r, 0, 7); x.fill();
    }
    x.globalAlpha = 1; x.fillStyle = '#fff6d8'; x.beginPath(); x.arc(sunX, sunY, 4, 0, 7); x.fill();

    /* --- 远山：两道山脊，越远越往天色里褪 --- */
    const ridgeLayer = (yBase, amp, col, depth, seedOff, snow) => {
      const hgt = new Int16Array(W);
      for (let i = 0; i < W; i++) hgt[i] = Math.round(amp * (0.35 + N.ridge(i * 0.014 + seedOff, seedOff * 3, 4) * 0.9));
      for (let i = 0; i < W; i++) {
        const h0 = hgt[i], slope = (hgt[Math.min(W - 1, i + 2)] - hgt[Math.max(0, i - 2)]) / 4;
        const lit = A.lambert(-slope * 2.2, -1.2) * 0.30;               // 左坡亮、右坡暗
        let c = A.shade(col, lit);
        c = A.hex(A.atmo(c, skyLow, depth));
        px(i, yBase - h0, 1, h0 + 2, c);
        if (snow && h0 > amp * 0.78) px(i, yBase - h0, 1, Math.round((h0 - amp * 0.78) * 0.9) + 1, A.hex(A.atmo('#eef3f7', skyLow, depth * 0.8)));
        px(i, yBase - h0, 1, 1, A.hex(A.atmo(A.shade(col, 0.30), skyLow, depth)));   // 山脊受光边
      }
    };
    const snowy = st === STYLES.northern;
    ridgeLayer(horizon + 14, 46, st.hill2, 0.64, 3.1, snowy);
    ridgeLayer(horizon + 30, 30, st.hill, 0.38, 7.7, false);
    // 山脚到城镇之间的缓坡田野，做一层淡淡的过渡而不是一块平色
    for (let y = horizon + 30; y < townY; y++) {
      const t = (y - horizon - 30) / Math.max(1, townY - horizon - 30);
      const base = A.sat(A.shade(st.hill, 0.02 + t * 0.16), -0.30);
      px(0, y, W, 1, A.hex(A.atmo(base, skyLow, 0.42 * (1 - t * 0.5))));
      if (y % 4 === 0) for (let i = (y * 5) % 9; i < W; i += 9 + (y % 5)) px(i, y, 3, 1, A.hex(A.atmo(A.sat(A.shade(st.hill2, 0.14), -0.35), skyLow, 0.38 * (1 - t * 0.5))));
    }

    /* --- 中景：城镇剪影（塔楼 / 穹顶 / 尖顶），比远山近、比主街远 --- */
    const midY = townY, HAZE = 0.24;
    const tw = A.hex(A.atmo(A.shade(st.wall, -0.12), skyLow, HAZE));
    const twD = A.hex(A.atmo(A.shade(st.wall, -0.42), skyLow, HAZE));
    const twL = A.hex(A.atmo(A.shade(st.wall, 0.12), skyLow, HAZE));
    const tr = A.hex(A.atmo(st.roof, skyLow, HAZE));
    const trD = A.hex(A.atmo(A.shade(st.roof2, -0.22), skyLow, HAZE));
    for (let hx = -6; hx < W;) {
      const bw = 13 + Math.floor(rng() * 24);
      const bh = Math.round((10 + rng() * 52) * (0.7 + Math.sin(hx * 0.013 + 1.2) * 0.4));   // 起伏的天际线
      const ty = midY - bh;
      px(hx, ty, bw, bh, tw);
      px(hx, ty, bw, 1, twL);
      px(hx + bw - 3, ty, 3, bh, twD);
      const kind = rng();
      if (kind < 0.16) {                                     // 尖塔
        const sh = 10 + Math.floor(rng() * 10);
        for (let i = 0; i < sh; i++) px(hx + bw / 2 - (sh - i) * 0.3, ty - sh + i, (sh - i) * 0.6 + 1, 1, i % 3 ? tr : trD);
        px(hx + bw / 2, ty - sh - 3, 1, 3, trD);
      } else if (kind < 0.30) {                              // 穹顶
        const rr = Math.round(bw / 2);
        for (let i = 0; i < rr; i++) { const half = Math.sqrt(Math.max(0, rr * rr - (rr - i) ** 2)); for (let k = -half; k <= half; k++) px(hx + bw / 2 + k, ty - rr + i, 1, 1, A.hex(A.atmo(A.shade(st.roof, 0.28 - (k + half) / (half * 2 || 1) * 0.8), skyLow, HAZE))); }
        px(hx + bw / 2, ty - rr - 3, 1, 3, trD);
      } else {                                               // 坡屋顶
        const rh = 3 + Math.floor(rng() * 4);
        for (let i = 0; i < rh; i++) { const t = i / Math.max(1, rh - 1), half = bw * 0.18 + (bw / 2 + 2 - bw * 0.18) * t; px(hx + bw / 2 - half, ty - rh + i, half * 2, 1, i < rh * 0.5 ? tr : trD); }
      }
      for (let k = 0; k < 3 + Math.floor(rng() * 3); k++) px(hx + 2 + Math.floor(rng() * Math.max(1, bw - 5)), ty + 4 + Math.floor(rng() * Math.max(1, bh - 8)), 2, 2, '#c99a3f');
      hx += bw + 1 + Math.floor(rng() * 4);
    }

    /* --- 城墙 / 拱廊：把中景和主街隔开 --- */
    const wallTop = wallY, wallC = A.shade(st.wall2, -0.20);
    for (let y = wallTop; y < groundY; y++) {                                   // 越往下越暗（环境遮蔽）
      const t = (y - wallTop) / (groundY - wallTop);
      px(0, y, W, 1, A.shade(st.wall2, -0.14 - t * 0.28));
    }
    for (let y = wallTop + 4; y < groundY - 2; y += 6)                           // 石砌层
      for (let xx = ((y % 12) ? 5 : 0); xx < W; xx += 11) px(xx, y, 9, 1, A.shade(st.wall2, -0.06));
    px(0, wallTop, W, 2, A.shade(st.wall2, 0.24));
    for (let i = 0; i < W; i += 12) { px(i, wallTop - 5, 7, 5, wallC); px(i, wallTop - 5, 7, 1, A.shade(st.wall2, 0.28)); px(i + 5, wallTop - 5, 2, 5, A.shade(st.wall2, -0.34)); }   // 雉堞
    for (let ax = 10; ax < W - 16; ax += 34) {                                   // 拱券门洞
      const aw = 15, ah = 22, ay = groundY - ah;
      for (let j = 0; j < ah; j++) {
        const half = j < aw / 2 ? Math.round(Math.sqrt(Math.max(0, (aw / 2) ** 2 - (aw / 2 - j) ** 2))) : aw / 2;
        px(ax + aw / 2 - half, ay + j, half * 2, 1, A.shade(st.wall2, -0.68));
      }
      px(ax - 2, ay - 2, aw + 4, 2, A.shade(st.wall2, 0.16));
      px(ax - 2, ay, aw + 4, 1, 'rgba(10,16,26,0.35)');
    }
    px(0, groundY - 3, W, 3, A.shade(st.wall2, -0.52));

    /* --- 地面：带透视的石板，近大远小 --- */
    A.ditherGradient(x, 0, groundY, W, seaY - groundY, A.shade(st.ground, -0.14), A.shade(st.ground, 0.10), 8);
    const gh = seaY - groundY;
    for (let row = 0, y = groundY + 1; y < seaY - 1; row++) {
      const sh = 2 + Math.round((y - groundY) / gh * 3);                        // 石板高度
      const sw = 5 + Math.round((y - groundY) / gh * 6);                        // 石板宽度
      for (let sx = -(row % 2) * sw / 2; sx < W; sx += sw) {
        const v = N.noise(sx * 0.3, y * 0.7) - 0.5;
        px(sx, y, sw - 1, sh - 1, A.shade(st.ground, v * 0.22 + (y - groundY) / gh * 0.06));
        px(sx, y, sw - 1, 1, A.shade(st.ground, v * 0.22 + 0.16));              // 石面受光
        px(sx, y + sh - 1, sw, 1, A.shade(st.ground2, -0.30));                  // 缝隙
      }
      y += sh;
    }
    px(0, groundY, W, 1, A.shade(st.ground, 0.30));

    /* ===== 主体建筑 ===== */
    this.hot = []; this.windows = []; this.flagPos = null; this.smokePos = null;
    const slots = [0.04, 0.285, 0.53, 0.775].map(f => Math.round(W * f));
    const widths = [Math.round(W * 0.20), Math.round(W * 0.18), Math.round(W * 0.20), Math.round(W * 0.21)];
    const lean = [3, -4, 0, 5];                        // 前后进退：正数更靠前（基线更低、更大）
    BUILDINGS.forEach((b, i) => {
      const w = widths[i];
      const h = (b.key === 'office' ? 82 : b.key === 'yard' ? 48 : 62) + Math.floor(rng() * 22);
      const bx = slots[i], by = groundY + 1 + lean[i];
      const info = this.drawBuilding(x, px, bx, by, w, h, st, b.key, rng, p, N);
      this.hot.push({ ...b, rect: { x: bx - 4, y: by - h - info.roofH, w: w + 8, h: h + info.roofH + 2 } });
    });

    /* --- 码头边缘 + 系缆桩 --- */
    px(0, seaY - 5, W, 5, A.shade('#6a5a42', 0.10));
    px(0, seaY - 5, W, 1, A.shade('#6a5a42', 0.34));
    px(0, seaY - 1, W, 1, '#2a2013');
    for (let i = 6; i < W; i += 34) {
      px(i, seaY - 12, 5, 7, '#6e5a3c'); px(i, seaY - 12, 5, 1, '#967d54'); px(i + 4, seaY - 11, 1, 6, '#3d3020');
      px(i - 1, seaY - 13, 7, 2, '#5a4830'); px(i - 1, seaY - 13, 7, 1, '#87704c');
      px(i - 2, seaY - 5, 9, 1, 'rgba(12,18,30,0.35)');
    }
    for (let i = 20; i < W; i += 34) { px(i, seaY - 4, 3, 9, '#3e2a16'); px(i, seaY - 4, 1, 9, '#5a4023'); }   // 木桩入水

    /* --- 海水：深度渐变 + 建筑倒影 --- */
    A.ditherGradient(x, 0, seaY, W, H - seaY, '#2b6e93', '#123a5c', 10);
    const src = x.getImageData(0, 0, W, H), sd = src.data;
    const refH = Math.min(H - seaY, 34);
    for (let j = 0; j < refH; j++) {
      const fade = 1 - j / refH;
      const wob = Math.round(Math.sin(j * 0.55) * 1.6 + Math.sin(j * 0.21) * 1.2);
      for (let i = 0; i < W; i++) {
        const sy = seaY - 2 - Math.round(j * 1.25);
        if (sy < 0) continue;
        const si = (sy * W + Math.max(0, Math.min(W - 1, i + wob))) * 4;
        const di = ((seaY + j) * W + i) * 4;
        const al = 0.42 * fade;
        sd[di]     = sd[di]     * (1 - al) + sd[si]     * 0.62 * al;
        sd[di + 1] = sd[di + 1] * (1 - al) + sd[si + 1] * 0.70 * al;
        sd[di + 2] = sd[di + 2] * (1 - al) + (sd[si + 2] * 0.55 + 90) * al;
      }
    }
    x.putImageData(src, 0, 0);
    for (let j = 1; j < H - seaY; j += 3) {                                      // 水面横向高光
      const a = 0.10 + 0.10 * Math.sin(j * 0.9);
      x.globalAlpha = a; x.fillStyle = '#bfe4f5';
      for (let i = (j * 7) % 11; i < W; i += 11 + (j % 5)) x.fillRect(i, seaY + j, 3 + (j % 3), 1);
    }
    x.globalAlpha = 1;

    /* --- 前景道具：更暗更大，把画面框住 --- */
    const crate = (cx, cy, cw) => {
      px(cx + 1, cy + cw, cw + 1, 1, 'rgba(10,16,26,0.42)');
      px(cx, cy, cw, cw, '#7a5630'); px(cx, cy, cw, 1, '#a07a46'); px(cx + cw - 2, cy, 2, cw, '#563a1e');
      px(cx + 1, cy + Math.round(cw / 2), cw - 3, 1, '#4b331b');
    };
    const barrel = (cx, cy, bw, bh) => {
      px(cx + 1, cy + bh, bw + 1, 1, 'rgba(10,16,26,0.42)');
      for (let i = 0; i < bw; i++) { const t = Math.abs(i - (bw - 1) / 2) / (bw / 2); px(cx + i, cy + Math.round(t * 1.4), 1, bh - Math.round(t * 2.4), A.shade('#8a6038', 0.22 - t * 0.7)); }
      px(cx, cy + 2, bw, 1, '#3f2a16'); px(cx, cy + bh - 3, bw, 1, '#3f2a16');
    };
    const rope = (cx, cy) => { for (let r = 5; r > 1; r--) { px(cx - r, cy - r / 2, r * 2, 1, r % 2 ? '#a89060' : '#826c44'); } px(cx - 5, cy + 2, 10, 1, 'rgba(10,16,26,0.35)'); };
    crate(6, seaY - 22, 11); crate(15, seaY - 17, 8); barrel(W - 26, seaY - 20, 9, 13); barrel(W - 15, seaY - 17, 8, 11);
    rope(Math.round(W * 0.42), seaY - 8); crate(Math.round(W * 0.64), seaY - 15, 7);

    /* --- 路灯 --- */
    for (let lx = Math.round(W * 0.16); lx < W; lx += Math.round(W / 4)) {
      px(lx + 1, seaY - 7, 4, 1, 'rgba(10,16,26,0.35)');
      px(lx, seaY - 26, 1, 20, '#2d3038'); px(lx - 1, seaY - 26, 3, 1, '#3d424c');
      px(lx - 2, seaY - 30, 5, 4, '#23262c'); px(lx - 1, seaY - 29, 3, 2, '#ffd98a'); px(lx - 3, seaY - 31, 7, 1, '#2d3038');
      this.windows.push({ x: lx - 1, y: seaY - 29, w: 3, h: 2 });
    }
    /* --- 树 --- */
    const tree = (tx, ty) => {
      const palm = st.roofStyle === 'thatch' || st === STYLES.brazil;
      px(tx + 2, ty, 6, 1, 'rgba(10,16,26,0.35)');
      if (palm) {
        for (let i = 0; i < 20; i++) px(tx + Math.round(Math.sin(i * 0.3) * 1.2), ty - i, 2, 1, A.shade('#7a5a3a', 0.2 - (i % 3) * 0.16));
        for (const [dx, dy, l] of [[-9, -20, 9], [7, -21, 8], [-5, -25, 6], [5, -26, 6], [-10, -16, 8], [9, -16, 7]]) {
          for (let i = 0; i < l; i++) px(tx + dx + (dx < 0 ? i : -i), ty + dy + Math.round(i * i * 0.05), 2, 1, A.shade('#2f8a4a', 0.18 - i * 0.05));
        }
      } else {
        px(tx, ty - 14, 3, 14, '#4e3520'); px(tx, ty - 14, 1, 14, '#6b4a2c');
        for (let r = 0; r < 12; r++) {
          const wdt = Math.round(Math.sin(Math.PI * (r + 2) / 16) * 16);
          px(tx + 1 - wdt / 2, ty - 26 + r, wdt, 1, A.shade('#2f6f3d', 0.26 - r * 0.045));
        }
      }
    };
    tree(slots[1] - 14, groundY + 1); tree(W - 10, groundY + 1);

    this.bg = new Sprite(canvasTexture(cv)); this.scene.addChild(this.bg);

    /* 窗灯（夜晚） */
    this.glow = new Graphics();
    for (const wnd of this.windows) this.glow.rect(wnd.x, wnd.y, wnd.w, wnd.h).fill(0xffd27a);
    this.glow.alpha = 0; this.glow.eventMode = 'none'; this.scene.addChild(this.glow);

    /* 云 */
    this.clouds = [];
    for (let i = 0; i < 4; i++) { const c = new Sprite(this.cloudTex); c.alpha = 0.55 + rng() * 0.3; c.scale.set(1 + rng() * 1.6, 1 + rng() * 0.6); c.position.set(rng() * W, 6 + rng() * (horizon * 0.48)); c.vx = 1.6 + rng() * 3; c.eventMode = 'none'; this.scene.addChild(c); this.clouds.push(c); }
    /* 烟 */
    this.smokeLayer = new Container(); this.smokeLayer.eventMode = 'none'; this.scene.addChild(this.smokeLayer); this.smoke = []; this.smokeT = 0;
    /* 海鸥 */
    this.gulls = [];
    for (let i = 0; i < 4; i++) { const g = new Sprite(this.gullTex[0]); g.anchor.set(0.5); g.eventMode = 'none'; g.position.set(rng() * W, 12 + rng() * (horizon - 24)); g.vx = (8 + rng() * 9) * (rng() < 0.5 ? -1 : 1); g.scale.x = g.vx > 0 ? 1 : -1; g.phase = rng() * 6; g.baseY = g.y; this.scene.addChild(g); this.gulls.push(g); }
    /* 路人 */
    this.peds = [];
    for (let i = 0; i < 6; i++) {
      const v = Math.floor(rng() * SHIRTS.length); const sp = new Sprite(this.pedTex[v][0]);
      sp.anchor.set(0.5, 1); sp.eventMode = 'none';
      const depth = rng();                                            // 近处的人更大更暗一点，拉开层次
      sp.position.set(rng() * W, groundY + 6 + Math.round(depth * (seaY - groundY - 14)));
      sp.scale.set(0.85 + depth * 0.55); sp.baseScale = sp.scale.x;
      sp.vx = (6 + rng() * 7) * (rng() < 0.5 ? -1 : 1); sp.scale.x = sp.vx > 0 ? sp.baseScale : -sp.baseScale;
      sp.variant = v; sp.pause = 0; this.scene.addChild(sp); this.peds.push(sp);
    }
    /* 旗子 */
    this.flag = null;
    if (this.flagPos) { const zc = zone(p.zone).color; this.flagTex = [0, 1, 2].map(f => canvasTexture(pixelsToCanvas(FLAG_ROWS(f), { f: zc, l: '#ffffff' }, 1))); this.flag = new Sprite(this.flagTex[0]); this.flag.eventMode = 'none'; this.flag.scale.set(1.4); this.flag.position.set(this.flagPos.x + 1, this.flagPos.y); this.scene.addChild(this.flag); }
    /* 岸边浪花 */
    const foam = f => {
      const c = document.createElement('canvas'); c.width = W; c.height = 4; const fx = c.getContext('2d'); const r = seeded(77 + f);
      for (let i = 0; i < W; i++) { const v = r(); if (v < 0.5) { fx.fillStyle = v < 0.22 ? '#eaf6ff' : '#9fd0e6'; fx.fillRect(i, f === 0 ? 0 : 1, 2, 1); } if (r() < 0.2) { fx.fillStyle = 'rgba(220,240,252,0.55)'; fx.fillRect(i, 2, 1, 1); } }
      return canvasTexture(c);
    };
    this.foamTex = [foam(0), foam(1)]; this.foam = new Sprite(this.foamTex[0]); this.foam.eventMode = 'none'; this.foam.position.set(0, seaY - 1); this.scene.addChild(this.foam);
    /* 停泊的船（点击出海） */
    this.ship = new Sprite(this.shipTex.E[0]); this.ship.anchor.set(0.5, 0.75); this.ship.scale.set(1.4); this.ship.position.set(Math.round(W * 0.52), seaY + 14);
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
      const t = new Text({ text: h.name, style: { fontFamily: FONT, fontSize: 13, fill: '#e8f0f8', stroke: { color: '#06101a', width: 4 } } });
      t.anchor.set(0.5, 1); t.position.set((h.rect.x + h.rect.w / 2) * K, (h.rect.y - 3) * K); t.alpha = 0.85; this.labels.addChild(t); h.label = t;
    }
    /* 任务标记 ! / ? */
    this.markers = {};
    const mk = (k, mx, my) => { const t = new Text({ text: '!', style: { fontFamily: '"Press Start 2P",monospace', fontSize: 16, fill: '#f2c14e', stroke: { color: '#06101a', width: 4 } } }); t.anchor.set(0.5, 1); t.position.set(mx, my); t.visible = false; t.baseY = my; this.labels.addChild(t); this.markers[k] = t; };
    for (const h of this.hot) mk(h.key, (h.rect.x + h.rect.w / 2) * K, (h.rect.y - 3) * K - 18);
    mk('ship', this.ship.x * K, (this.ship.y - 18) * K);
    this.refreshMarkers();
    const shipLabel = new Text({ text: '出海 ▸ 海图', style: { fontFamily: FONT, fontSize: 12, fill: '#f2c14e', stroke: { color: '#06101a', width: 3 } } });
    shipLabel.anchor.set(0.5, 0); shipLabel.position.set(this.ship.x * K, (this.ship.y + 10) * K); this.labels.addChild(shipLabel);
    const plate = new Text({ text: `◆ ${p.name} · ${zone(p.zone).name}`, style: { fontFamily: FONT, fontSize: 14, fontWeight: '700', fill: '#f2c14e', stroke: { color: '#06101a', width: 4 }, letterSpacing: 2 } });
    plate.position.set(12, vh - 30); this.labels.addChild(plate);
  }

  /* ---------- 画一栋建筑 ----------
     统一光照：左上受光。每栋都有 受光墙 / 背光墙 / 檐下阴影 / 地面投影 / 内凹的窗与门，
     屋顶按地域分五种做法。返回屋顶总高，供热区计算。 */
  drawBuilding(x, px, bx, by, w, h, st, kind, rng, p, N) {
    const top = by - h;
    const LIT = A.shade(st.wall, 0.16), MID = st.wall, DARK = A.shade(st.wall, -0.26), DARKER = A.shade(st.wall, -0.46);
    const shadowW = Math.max(3, Math.round(w * 0.16));

    /* 地面投影（光在左上 → 影子落右下） */
    for (let j = 0; j < 6; j++) { x.globalAlpha = 0.30 * (1 - j / 6); x.fillStyle = '#0e1622'; x.fillRect(bx + 2 + j, by + j, w + 6 - j, 1); }
    x.globalAlpha = 1;

    /* 墙体：左受光 → 右背光的横向渐变，底部再压暗一点（环境遮蔽） */
    for (let i = 0; i < w; i++) {
      const t = i / (w - 1);
      const col = i >= w - shadowW ? A.mix(A.rgb(DARK), A.rgb(DARKER), (i - (w - shadowW)) / shadowW) : A.mix(A.rgb(LIT), A.rgb(MID), t / (1 - shadowW / w));
      for (let j = 0; j < h; j++) {
        const ao = j > h - 8 ? (j - (h - 8)) / 8 * 0.22 : 0;
        px(bx + i, top + j, 1, 1, A.hex(A.mix(col, [14, 20, 32], ao)));
      }
    }
    /* 墙面材质：石缝 / 木筋 / 抹灰 */
    if (st.roofStyle === 'gable' || st.roofStyle === 'steep') {                 // 半木构
      for (let i = 0; i <= 3; i++) px(bx + Math.round(i * (w - 2) / 3), top, 2, h, st.beam);
      px(bx, top + Math.round(h * 0.42), w, 2, st.beam);
      px(bx, top + Math.round(h * 0.42), w, 1, A.shade(st.beam, 0.22));
    } else if (st.roofStyle === 'flat' || st.roofStyle === 'dome') {            // 砖石
      for (let yy = top + 3; yy < by - 1; yy += 5) for (let xx = bx + ((yy % 10) ? 3 : 0); xx < bx + w - 2; xx += 8) px(xx, yy, 5, 1, A.shade(st.wall2, -0.10));
    } else {                                                                     // 粗抹灰的斑驳
      for (let k = 0; k < w * 2; k++) { const rx = bx + Math.floor(rng() * w), ry = top + 2 + Math.floor(rng() * (h - 4)); px(rx, ry, 1 + Math.floor(rng() * 3), 1, A.shade(st.wall, -0.10)); }
    }
    px(bx, top, w, 1, A.shade(st.wall, 0.34));                                  // 墙顶受光边
    px(bx, by - 3, w, 3, A.shade(st.wall2, -0.40));                             // 勒脚
    px(bx, by - 3, w, 1, A.shade(st.wall2, -0.12));

    /* 窗：内凹 + 窗台 + 百叶 */
    const win = (wx, wy, ww, wh, shutter) => {
      px(wx - 1, wy - 1, ww + 2, wh + 2, A.shade(st.beam, 0.05));
      px(wx, wy, ww, wh, '#16233d');
      px(wx, wy, ww, 1, '#0b1322'); px(wx, wy, 1, wh, '#0b1322');
      px(wx + ww - 1, wy + 1, 1, wh - 1, '#2f4a70');
      px(wx + Math.floor(ww / 2), wy, 1, wh, A.shade(st.beam, 0.15));           // 窗棂
      px(wx - 2, wy + wh, ww + 4, 1, A.shade(st.wall, 0.30));                   // 窗台
      px(wx - 2, wy + wh + 1, ww + 4, 1, 'rgba(12,18,30,0.34)');
      if (shutter) { px(wx - 3, wy - 1, 2, wh + 2, A.shade(st.roof, -0.10)); px(wx + ww + 1, wy - 1, 2, wh + 2, A.shade(st.roof, -0.32)); }
      this.windows.push({ x: wx, y: wy, w: ww, h: wh });
    };
    const rows = h > 56 ? 3 : 2, cols = Math.max(2, Math.floor(w / 15));
    const ww = 5, wh = 7, stepX = (w - 10) / Math.max(1, cols - 1), stepY = (h - 22) / rows;
    const shutter = st === STYLES.northern || st === STYLES.iberian || st === STYLES.colonial;
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      const wx = Math.round(bx + 5 + c * stepX) - 2, wy = Math.round(top + 8 + r * stepY);
      if (r === rows - 1 && Math.abs(wx + ww / 2 - (bx + w / 2)) < w * 0.22) continue;   // 给门让位
      win(wx, wy, ww, wh, shutter);
    }

    /* 门：拱券 / 方门 + 台阶 + 门灯 */
    const dw = kind === 'yard' ? Math.round(w * 0.46) : 11, dh = kind === 'yard' ? Math.round(h * 0.55) : 17;
    const dx = bx + Math.round(w / 2 - dw / 2), dy = by - dh;
    const arched = st.roofStyle === 'dome' || st.roofStyle === 'flat' || st.roofStyle === 'curved';
    px(dx - 2, dy - (arched ? dw / 2 : 0) - 2, dw + 4, dh + (arched ? dw / 2 : 0) + 2, A.shade(st.wall2, -0.20));
    if (arched) { const r0 = dw / 2 + 1; for (let j = 0; j < r0; j++) { const half = Math.round(Math.sqrt(Math.max(0, r0 * r0 - (r0 - j) ** 2))); px(dx + dw / 2 - half, dy - r0 + j, half * 2, 1, '#241608'); } }
    px(dx, dy, dw, dh, kind === 'yard' ? '#140f0a' : '#2e1c0c');
    px(dx, dy, dw, 2, '#140d06');
    if (kind !== 'yard') { px(dx + Math.floor(dw / 2), dy + 2, 1, dh - 2, '#4a2f14'); px(dx + dw - 3, dy + Math.round(dh / 2), 1, 1, '#f2c14e'); }
    px(dx - 3, by, dw + 6, 2, A.shade(st.ground, 0.18)); px(dx - 2, by + 2, dw + 4, 1, A.shade(st.ground, -0.20));   // 台阶
    px(dx - 5, dy + 2, 2, 3, '#23262c'); px(dx - 5, dy + 5, 2, 2, '#ffd98a');                                        // 门灯
    this.windows.push({ x: dx - 5, y: dy + 5, w: 2, h: 2 });

    /* 屋顶 */
    let roofH = 10;
    const rs = st.roofStyle, eaves = 4;
    const tileRow = (x0, y0, ww2, i) => {
      px(x0, y0, ww2, 1, A.shade(st.roof, i % 4 === 0 ? -0.26 : 0.02));
      px(x0, y0, Math.ceil(ww2 * 0.42), 1, A.shade(st.roof, i % 4 === 0 ? -0.14 : 0.16));     // 左坡受光
      px(x0 + Math.ceil(ww2 * 0.78), y0, Math.floor(ww2 * 0.22), 1, A.shade(st.roof2, -0.18)); // 右坡背光
    };
    const cxm = bx + w / 2;
    /** 从屋脊(halfTop)到屋檐(halfBot)的坡面，i=0 是脊 */
    const slope = (halfTop, halfBot, hgt, curve) => {
      for (let i = 0; i < hgt; i++) {
        const t = hgt <= 1 ? 1 : i / (hgt - 1);
        const k = curve ? Math.pow(t, 0.55) : t;
        const half = halfTop + (halfBot - halfTop) * k;
        tileRow(cxm - half, top - hgt + i, half * 2, i);
      }
    };
    if (rs === 'gable' || rs === 'steep') {
      roofH = rs === 'steep' ? Math.round(w * 0.34) : Math.round(w * 0.20);
      slope(Math.round(w * 0.16), w / 2 + eaves, roofH, false);
      px(cxm - Math.round(w * 0.16), top - roofH, Math.round(w * 0.32), 1, A.shade(st.roof, 0.38));   // 屋脊受光
      px(bx - eaves, top - 1, w + eaves * 2, 1, A.shade(st.roof2, -0.40));                            // 檐口
      if (rs === 'steep') { px(cxm - 1, top - roofH - 5, 2, 5, A.shade(st.beam, 0.1)); px(cxm - 2, top - roofH - 7, 4, 2, '#c0392b'); }
    } else if (rs === 'curved') {
      roofH = 15;
      slope(Math.round(w * 0.12), w / 2 + 8, roofH, true);
      px(cxm - Math.round(w * 0.12), top - roofH, Math.round(w * 0.24), 2, A.shade(st.roof, 0.34));
      px(bx - 10, top - 4, 4, 4, st.roof2); px(bx + w + 6, top - 4, 4, 4, st.roof2);                  // 翘角
      px(bx - 10, top - 6, 4, 2, A.shade(st.roof, 0.28)); px(bx + w + 6, top - 6, 4, 2, A.shade(st.roof, 0.28));
      px(bx - eaves - 4, top - 1, w + eaves * 2 + 8, 1, A.shade(st.roof2, -0.42));
    } else if (rs === 'thatch') {
      roofH = 16;
      for (let i = 0; i < roofH; i++) {
        const t = i / (roofH - 1), half = w * 0.10 + (w / 2 + 6 - w * 0.10) * Math.pow(t, 0.8);
        px(cxm - half, top - roofH + i, half * 2, 1, A.shade(st.roof, 0.26 - t * 0.62));
        if (i % 3 === 0) for (let k = -half; k < half; k += 3) px(cxm + k, top - roofH + i, 1, 1, A.shade(st.roof2, -0.20));
      }
      for (let i = 0; i < w + 12; i += 2) px(bx - 6 + i, top - 2, 1, 2 + Math.floor(rng() * 3), A.shade(st.roof2, -0.30));   // 毛边
    } else if (rs === 'dome') {
      roofH = Math.round(w * 0.46);
      const r0 = w / 2 + 2;
      for (let i = 0; i < roofH; i++) {
        const yy = roofH - i, half = Math.sqrt(Math.max(0, r0 * r0 - (yy * r0 / roofH) ** 2));
        for (let k = -half; k <= half; k++) {
          const t = (k + half) / (half * 2 || 1);
          px(bx + w / 2 + k, top - roofH + i, 1, 1, A.shade(st.roof, 0.34 - t * 0.9 - i / roofH * 0.1));
        }
      }
      px(bx - 3, top - 2, w + 6, 3, A.shade(st.roof2, -0.12));                                  // 鼓座
      px(bx + w / 2 - 1, top - roofH - 6, 2, 6, '#e0b44a'); px(bx + w / 2 - 2, top - roofH - 8, 4, 2, '#f2c14e');
    } else {
      roofH = 9;
      px(bx - 3, top - 5, w + 6, 5, A.shade(st.roof, -0.08));                                   // 女儿墙
      px(bx - 3, top - 5, w + 6, 1, A.shade(st.roof, 0.30));
      px(bx - 3, top - 1, w + 6, 1, 'rgba(12,18,30,0.40)');
      for (let i = 0; i < w + 6; i += 6) px(bx - 3 + i, top - 8, 3, 3, A.shade(st.roof, 0.12));  // 齿饰
    }
    px(bx, top, w, 3, 'rgba(10,16,28,0.30)');                                                     // 檐下阴影

    /* 招牌与功能装饰 */
    const sign = (sx, sy, glyph) => {
      px(sx + 3, sy - 4, 1, 4, '#3a2a18'); px(sx - 1, sy - 5, 9, 2, '#3a2a18');
      px(sx, sy, 8, 9, '#4a3018'); px(sx + 1, sy + 1, 6, 7, '#d9b877'); px(sx + 1, sy + 1, 6, 1, '#f0d69c');
      px(sx + 2, sy + 9, 7, 1, 'rgba(10,16,26,0.35)');
      if (glyph === 'cup') { px(sx + 2, sy + 3, 4, 4, '#7a4a20'); px(sx + 6, sy + 4, 1, 2, '#7a4a20'); }
      if (glyph === 'scale') { px(sx + 4, sy + 2, 1, 5, '#6a4a20'); px(sx + 2, sy + 3, 5, 1, '#6a4a20'); px(sx + 1, sy + 4, 2, 1, '#6a4a20'); px(sx + 6, sy + 4, 2, 1, '#6a4a20'); }
      if (glyph === 'anchor') { px(sx + 4, sy + 2, 1, 5, '#55606c'); px(sx + 2, sy + 3, 5, 1, '#55606c'); px(sx + 2, sy + 6, 1, 1, '#55606c'); px(sx + 6, sy + 6, 1, 1, '#55606c'); }
      if (glyph === 'seal') { px(sx + 3, sy + 3, 3, 3, '#a03028'); px(sx + 2, sy + 6, 5, 1, '#6a4a20'); }
    };
    if (kind === 'market') {
      const ay = by - 26, aw = w + 10;
      for (let i = 0; i < aw; i += 4) { px(bx - 5 + i, ay, 4, 4, (i / 4) % 2 ? '#f0ead8' : '#b8342c'); px(bx - 5 + i, ay, 4, 1, (i / 4) % 2 ? '#ffffff' : '#d1453c'); }   // 条纹雨棚
      px(bx - 5, ay + 4, aw, 1, '#5a4022'); px(bx - 4, ay + 5, aw - 2, 3, 'rgba(10,16,26,0.32)');
      px(bx - 5, ay + 4, 1, 22, '#5a4022'); px(bx + w + 4, ay + 4, 1, 22, '#5a4022');
      // 摊位上的货
      px(bx - 3, by - 10, 10, 4, '#8a6038'); px(bx - 3, by - 10, 10, 1, '#a87c46');
      px(bx - 2, by - 13, 3, 3, '#c0392b'); px(bx + 2, by - 13, 3, 3, '#d6a03a'); px(bx + 6, by - 12, 2, 2, '#3f6b3a');
      sign(bx + w + 6, by - 34, 'scale');
    }
    if (kind === 'tavern') {
      const chx = bx + w - 9;
      px(chx, top - roofH - 9, 5, roofH + 9, A.shade(st.wall2, -0.20)); px(chx, top - roofH - 9, 2, roofH + 9, A.shade(st.wall2, 0.08));
      px(chx - 1, top - roofH - 11, 7, 2, A.shade(st.beam, 0.05));
      this.smokePos = { x: chx + 2, y: top - roofH - 12 };
      sign(bx - 12, top + 12, 'cup');
      // 门口的桌椅
      px(bx + w + 3, by - 8, 9, 2, '#7a5a3a'); px(bx + w + 4, by - 6, 1, 6, '#5a4028'); px(bx + w + 10, by - 6, 1, 6, '#5a4028');
      px(bx + w + 2, by - 12, 3, 4, '#6a4a2a'); px(bx + w + 12, by - 12, 3, 4, '#6a4a2a');
    }
    if (kind === 'office') {
      const mx = bx + Math.round(w / 2);
      px(mx, top - roofH - 22, 2, 22, '#2d3038'); px(mx, top - roofH - 22, 1, 22, '#454a54');
      this.flagPos = { x: mx + 1, y: top - roofH - 22 };
      const zc = zone(p.zone).color;
      px(bx + 5, top + 8, 6, 20, zc); px(bx + 5, top + 8, 2, 20, A.shade(zc, 0.25)); px(bx + 5, top + 7, 6, 1, '#d6c79c');
      px(bx + w - 11, top + 8, 6, 20, zc); px(bx + w - 11, top + 8, 2, 20, A.shade(zc, 0.25)); px(bx + w - 11, top + 7, 6, 1, '#d6c79c');
      // 门前平台与柱廊
      px(bx - 5, by, w + 10, 3, A.shade(st.ground, 0.20)); px(bx - 7, by + 3, w + 14, 2, A.shade(st.ground, -0.10));
      for (const cxp of [bx + Math.round(w * 0.30), bx + Math.round(w * 0.70)]) { px(cxp, by - 24, 4, 24, A.shade(st.wall, 0.18)); px(cxp + 3, by - 24, 1, 24, A.shade(st.wall, -0.30)); px(cxp - 1, by - 26, 6, 2, A.shade(st.wall, 0.26)); }
      sign(bx + w + 6, by - 30, 'seal');
    }
    if (kind === 'yard') {
      const cxp = bx + w + 9;
      px(cxp, by - 56, 3, 56, '#5a3a22'); px(cxp, by - 56, 1, 56, '#7a5230');                     // 吊臂立柱
      px(cxp, by - 56, 24, 3, '#5a3a22'); px(cxp, by - 56, 24, 1, '#7a5230');
      px(cxp + 21, by - 53, 1, 16, '#c8b07a');                                                     // 吊索
      px(cxp + 17, by - 37, 10, 5, '#8a6a3a'); px(cxp + 17, by - 37, 10, 1, '#a88a5a');            // 吊着的货
      px(cxp + 1, by - 3, 26, 3, 'rgba(10,16,26,0.30)');
      // 船台上的龙骨
      for (let i = 0; i < 9; i++) px(bx + 8 + i * 5, by - 6 - i, 4, 2, '#a88a5a');
      px(bx - 6, by - 12, 16, 3, '#6b4a2a'); px(bx - 3, by - 18, 11, 6, '#6b4a2a'); px(bx - 3, by - 18, 11, 1, '#8a6238');
      sign(bx - 14, top + 14, 'anchor');
    }
    return { roofH: roofH + (kind === 'office' ? 22 : kind === 'tavern' ? 11 : 0) };
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
