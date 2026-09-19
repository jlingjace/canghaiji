/* 运行时生成的像素贴图（全部原创）。换成真 PNG 素材时只需把这里的函数改成 Assets.load。 */
import { Texture } from 'pixi.js';
import { seeded } from './util.js';
import * as geo from './geo.js';
import * as nav from './nav.js';

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
 * 真实世界陆地层：由导航栅格生成草地 / 沙岸 / 浅滩 / 树木的像素图。
 * 直接写 ImageData，避免几十万次 fillRect。
 */
export function makeWorldLandCanvas() {
  const { MAP_W, MAP_H } = geo;
  const { NAV, NC, NR } = nav;
  const mask = nav.buildMask();
  const P = NAV;                               // 1 逻辑单位 = 1 像素，每格输出 NAV×NAV 像素
  const cv = document.createElement('canvas'); cv.width = MAP_W; cv.height = MAP_H;
  const ctx = cv.getContext('2d');
  const img = ctx.createImageData(MAP_W, MAP_H);
  const d = img.data;
  const rng = seeded(20260919);
  const C = {
    grass: [63, 122, 74], grassD: [53, 104, 63], grassL: [78, 140, 88],
    sand: [214, 195, 138], sandD: [191, 169, 110],
    shallow: [47, 127, 165], shallowL: [58, 143, 181],
    tree: [44, 90, 53], treeD: [31, 68, 39],
  };
  const put = (x, y, col) => {
    if (x < 0 || y < 0 || x >= MAP_W || y >= MAP_H) return;
    const i = (y * MAP_W + x) * 4;
    d[i] = col[0]; d[i + 1] = col[1]; d[i + 2] = col[2]; d[i + 3] = 255;
  };
  const at = (c, r) => (c < 0 || r < 0 || c >= NC || r >= NR) ? 0 : mask[r * NC + c];
  for (let r = 0; r < NR; r++) for (let c = 0; c < NC; c++) {
    const land = at(c, r);
    const n = at(c, r - 1), s2 = at(c, r + 1), w = at(c - 1, r), e = at(c + 1, r);
    const ox = c * P, oy = r * P;
    if (!land) {
      let near = 0;
      for (let dr = -1; dr <= 1 && !near; dr++) for (let dc = -1; dc <= 1; dc++) if (at(c + dc, r + dr)) { near = 1; break; }
      if (!near) continue;
      for (let y = 0; y < P; y++) for (let x = 0; x < P; x++) put(ox + x, oy + y, rng() < 0.22 ? C.shallowL : C.shallow);
      continue;
    }
    for (let y = 0; y < P; y++) for (let x = 0; x < P; x++) {
      let col = C.grass;
      const rv = rng();
      if (rv < 0.16) col = C.grassD; else if (rv < 0.24) col = C.grassL;
      if (!n && y === 0) col = C.sand; else if (!n && y === 1) col = C.sandD;
      if (!s2 && y === P - 1) col = C.sand; else if (!s2 && y === P - 2) col = C.sandD;
      if (!w && x === 0) col = C.sand; else if (!w && x === 1) col = C.sandD;
      if (!e && x === P - 1) col = C.sand; else if (!e && x === P - 2) col = C.sandD;
      put(ox + x, oy + y, col);
    }
    if (n && s2 && w && e && rng() < 0.30) {
      const tx = ox + 1 + Math.floor(rng() * (P - 2)), ty = oy + 1 + Math.floor(rng() * (P - 2));
      put(tx, ty, C.tree); put(tx - 1, ty, C.tree); put(tx, ty - 1, C.treeD);
    }
  }
  ctx.putImageData(img, 0, 0);
  return cv;
}
