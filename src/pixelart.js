/* 运行时生成的像素贴图（全部原创）。换成真 PNG 素材时只需把这里的函数改成 Assets.load。 */
import { Texture } from 'pixi.js';
import { seeded } from './util.js';

export function canvasTexture(canvas) {
  const t = Texture.from(canvas);
  t.source.scaleMode = 'nearest';
  return t;
}

/** 把字符行 + 调色板画成 canvas，'.' 为透明 */
export function pixelsToCanvas(rows, palette, scale = 1) {
  const h = rows.length, w = rows[0].length;
  const c = document.createElement('canvas'); c.width = w * scale; c.height = h * scale;
  const x = c.getContext('2d'); x.imageSmoothingEnabled = false;
  for (let y = 0; y < h; y++) for (let i = 0; i < w; i++) {
    const col = palette[rows[y][i]]; if (!col) continue;
    x.fillStyle = col; x.fillRect(i * scale, y * scale, scale, scale);
  }
  return c;
}

/** 海面平铺贴图：4 帧，波光每帧右移 4px，16px 周期正好循环 */
export function makeWaterFrames(frames = 4, scale = 2) {
  const size = 16, out = [];
  const base = '#1c4f78', dark = '#17436a', light = '#2d6f9c', foam = '#86c0dc';
  for (let f = 0; f < frames; f++) {
    const c = document.createElement('canvas'); c.width = size * scale; c.height = size * scale;
    const x = c.getContext('2d'); x.fillStyle = base; x.fillRect(0, 0, c.width, c.height);
    const rng = seeded(1234);
    for (let i = 0; i < 20; i++) { x.fillStyle = dark; x.fillRect(Math.floor(rng() * size) * scale, Math.floor(rng() * size) * scale, scale, scale); }
    const rw = seeded(99);
    for (let i = 0; i < 4; i++) {
      const py = Math.floor(rw() * size), px = Math.floor(rw() * size) + f * (size / frames), len = 2 + Math.floor(rw() * 3);
      for (let k = 0; k < len; k++) { x.fillStyle = k === len - 1 ? foam : light; x.fillRect(((px + k) % size) * scale, py * scale, scale, scale); }
    }
    out.push(canvasTexture(c));
  }
  return out;
}

const SHIP_PAL = { h: '#6b4a2a', k: '#3e2a16', d: '#a5793f', m: '#e8e0cc', s: '#f4efe2', t: '#cfc7b4', f: '#d64545', y: '#f2c14e' };
const SHIP_E = [
  '.......ff.......',
  '.......mf.......',
  '.......m........',
  '....s..mssss....',
  '...ss..msssss...',
  '...sss.mssssss..',
  '...ttt.msssstt..',
  '....tt.mssttt...',
  '.......mstt.....',
  '.......m........',
  '.......m........',
  '..ddddddddddd...',
  '.hhhhhhhhhhhhhhy',
  '.hhhhhhhhhhhhhh.',
  '..kkkkkkkkkkkk..',
  '....kkkkkkkk....',
];
const SHIP_N = [
  '.......ff.......',
  '.......mf.......',
  '.......m........',
  '....sssmsss.....',
  '...ssssmssss....',
  '...ssssmssss....',
  '...ttttmtttt....',
  '.......m........',
  '......dmd.......',
  '......dhd.......',
  '.....hhhhh......',
  '.....hhhhh......',
  '.....hhhhh......',
  '.....hhhhh......',
  '......kkk.......',
  '......kkk.......',
];
function frame2(rows) {
  // 第二帧：整体上移 1px 模拟颠簸，旗子换向
  const r = rows.slice(1).concat(['................']);
  return r.map(l => l.replace('ff.', 'f..').replace('mf', 'mf'));
}
/** 船精灵：E（东，向西时镜像）、N、S 各 2 帧，16×16 原始像素 */
export function makeShipTextures() {
  const mk = rows => canvasTexture(pixelsToCanvas(rows, SHIP_PAL, 1));
  const S_rows = SHIP_N.map(l => l); // 南向暂用同一船型
  return { E: [mk(SHIP_E), mk(frame2(SHIP_E))], N: [mk(SHIP_N), mk(frame2(SHIP_N))], S: [mk(S_rows), mk(frame2(S_rows))] };
}

const PORT_PAL = { b: '#8a3a2e', r: '#a0522d', w: '#e6d7b5', y: '#f2c14e', d: '#4a2a1a', s: '#c8b07a', g: '#5a7a4a' };
const PORT_ROWS = [
  '................',
  '................',
  '......bbbb......',
  '.....bbbbbb.....',
  '.....wwwwww..rr.',
  '.rrr.wywwyw.rrrr',
  'rrrrrwwwwwwrwwww',
  'wwwwwwwddwwwwyww',
  'wywwwwwddwwwwwww',
  'wwwwwwwddwwwwwww',
  'ssssssssssssssss',
  '.sssssssssssss..',
  '................',
  '................',
  '................',
  '................',
];
export function makePortIcon() { return canvasTexture(pixelsToCanvas(PORT_ROWS, PORT_PAL, 1)); }

/**
 * 陆地层：把 SVG path 栅格化成 8 逻辑单位的地块，画草地、沙岸、浅滩与树木。
 * 输出 canvas 尺寸 = 逻辑尺寸 × scale，1 逻辑单位 = 1 个"像素"。
 */
export function makeLandCanvas(paths, W, H, scale) {
  const T = 8, cols = Math.ceil(W / T), rows = Math.ceil(H / T);
  const p2 = paths.map(d => new Path2D(d));
  const probe = document.createElement('canvas').getContext('2d');
  const land = new Uint8Array(cols * rows);
  const at = (c, r) => (c < 0 || r < 0 || c >= cols || r >= rows) ? 1 : land[r * cols + c];
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    const cx = c * T + T / 2, cy = r * T + T / 2;
    land[r * cols + c] = p2.some(p => probe.isPointInPath(p, cx, cy)) ? 1 : 0;
  }
  const cv = document.createElement('canvas'); cv.width = W * scale; cv.height = H * scale;
  const x = cv.getContext('2d'); x.imageSmoothingEnabled = false;
  const px = (ux, uy, col, w = 1, h = 1) => { x.fillStyle = col; x.fillRect(ux * scale, uy * scale, w * scale, h * scale); };
  const rng = seeded(7);
  const grass = '#3f7a4a', grassD = '#35683f', sand = '#d6c38a', sandD = '#bfa96e', shallow = '#2f7fa5', shallowL = '#3a8fb5', tree = '#2c5a35', treeD = '#1f4427';
  // 浅滩：紧邻陆地的水域
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    if (at(c, r)) continue;
    let near = false;
    for (let dr = -1; dr <= 1 && !near; dr++) for (let dc = -1; dc <= 1; dc++) if ((dr || dc) && at(c + dc, r + dr)) { near = true; break; }
    if (!near) continue;
    px(c * T, r * T, shallow, T, T);
    for (let i = 0; i < 3; i++) px(c * T + Math.floor(rng() * T), r * T + Math.floor(rng() * T), shallowL);
  }
  // 陆地
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    if (!at(c, r)) continue;
    const ux = c * T, uy = r * T;
    px(ux, uy, grass, T, T);
    for (let i = 0; i < 4; i++) px(ux + Math.floor(rng() * T), uy + Math.floor(rng() * T), grassD);
    if (!at(c, r - 1)) { px(ux, uy, sand, T, 2); px(ux, uy + 2, sandD, T, 1); }
    if (!at(c, r + 1)) { px(ux, uy + T - 2, sand, T, 2); px(ux, uy + T - 3, sandD, T, 1); }
    if (!at(c - 1, r)) { px(ux, uy, sand, 2, T); px(ux + 2, uy, sandD, 1, T); }
    if (!at(c + 1, r)) { px(ux + T - 2, uy, sand, 2, T); px(ux + T - 3, uy, sandD, 1, T); }
    const inland = at(c - 1, r) && at(c + 1, r) && at(c, r - 1) && at(c, r + 1);
    if (inland && rng() < 0.35) { const tx = ux + 1 + Math.floor(rng() * 4), ty = uy + 1 + Math.floor(rng() * 3); px(tx, ty, tree, 3, 3); px(tx + 1, ty + 3, treeD, 1, 1); px(tx + 1, ty, treeD, 1, 1); }
  }
  return cv;
}
