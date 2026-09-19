/* 海上导航：陆地栅格 + A* 寻路 + 航线平滑。让船队绕过大陆而不是横穿。 */
import { MAP_W, MAP_H, projX, projY, landPolysXY } from './geo.js';

export const NAV = 4;                       // 每个导航格 = 4 逻辑单位 ≈ 0.33°
export const NC = Math.ceil(MAP_W / NAV), NR = Math.ceil(MAP_H / NAV);

/** 窄于一个导航格、但历史上必须通航的海峡：[经度, 纬度, 半径(度)] */
const STRAITS = [
  [-5.6, 35.95, 0.45],   // 直布罗陀
  [1.6, 51.0, 0.5],      // 多佛尔
  [11.0, 56.2, 0.7],     // 大贝尔特 / 厄勒（丹麦海峡）
  [12.8, 55.8, 0.5],
  [26.2, 40.3, 0.45],    // 达达尼尔
  [29.0, 41.1, 0.45],    // 博斯普鲁斯
  [15.3, 38.2, 0.35],    // 墨西拿
  [43.4, 12.6, 0.5],     // 曼德海峡
  [32.5, 29.5, 0.4],     // 苏伊士湾口（红海北端）
  [56.3, 26.6, 0.6],     // 霍尔木兹
  [100.4, 3.6, 0.9],     // 马六甲
  [103.8, 1.2, 0.6],     // 新加坡海峡
  [105.8, -6.0, 0.6],    // 巽他
  [129.5, 33.9, 0.6],    // 对马 / 关门
  [-79.0, 22.5, 0.8],    // 佛罗里达海峡（古巴以北）
  [-74.0, 19.5, 0.7],    // 向风海峡
  [-61.5, 11.2, 0.6],    // 特立尼达以北
];

let mask = null;          // Uint8Array：1 = 陆地
let coast = null;         // Uint8Array：1 = 紧邻陆地的水域（加权，鼓励离岸航行）
const idx = (c, r) => r * NC + c;

/** 用 canvas 填充多边形再读像素来栅格化，比逐点 isPointInPath 快两个数量级 */
export function buildMask() {
  if (mask) return mask;
  const cv = document.createElement('canvas'); cv.width = NC; cv.height = NR;
  const x = cv.getContext('2d', { willReadFrequently: true });
  x.fillStyle = '#fff'; x.scale(1 / NAV, 1 / NAV);
  for (const poly of landPolysXY()) {
    x.beginPath();
    poly.forEach(([px, py], i) => (i ? x.lineTo(px, py) : x.moveTo(px, py)));
    x.closePath(); x.fill();
  }
  const data = x.getImageData(0, 0, NC, NR).data;
  mask = new Uint8Array(NC * NR);
  for (let i = 0; i < NC * NR; i++) mask[i] = data[i * 4 + 3] > 80 ? 1 : 0;
  // 强制打通关键海峡
  for (const [lon, lat, rDeg] of STRAITS) {
    const cx = projX(lon) / NAV, cy = projY(lat) / NAV, rr = Math.max(1, rDeg * 12 / NAV);
    for (let r = Math.floor(cy - rr); r <= Math.ceil(cy + rr); r++)
      for (let c = Math.floor(cx - rr); c <= Math.ceil(cx + rr); c++) {
        if (c < 0 || r < 0 || c >= NC || r >= NR) continue;
        if ((c - cx) ** 2 + (r - cy) ** 2 <= rr * rr) mask[idx(c, r)] = 0;
      }
  }
  // 近岸标记
  coast = new Uint8Array(NC * NR);
  for (let r = 0; r < NR; r++) for (let c = 0; c < NC; c++) {
    if (mask[idx(c, r)]) continue;
    let near = 0;
    for (let dr = -1; dr <= 1 && !near; dr++) for (let dc = -1; dc <= 1; dc++) {
      const nc = c + dc, nr = r + dr;
      if (nc < 0 || nr < 0 || nc >= NC || nr >= NR) continue;
      if (mask[idx(nc, nr)]) { near = 1; break; }
    }
    coast[idx(c, r)] = near;
  }
  return mask;
}
/**
 * 给「画面」用的高分辨率陆地掩膜：1 逻辑单位 = 1 像素（导航网格是 4 单位一格）。
 * 海岸线的台阶因此细 4 倍。寻路仍然用粗网格，互不影响。
 */
let hiMask = null;
export function buildHiMask() {
  if (hiMask) return hiMask;
  const cv = document.createElement('canvas'); cv.width = MAP_W; cv.height = MAP_H;
  const x = cv.getContext('2d', { willReadFrequently: true });
  x.fillStyle = '#fff';
  for (const poly of landPolysXY()) {
    x.beginPath();
    poly.forEach(([px, py], i) => (i ? x.lineTo(px, py) : x.moveTo(px, py)));
    x.closePath(); x.fill();
  }
  const data = x.getImageData(0, 0, MAP_W, MAP_H).data;
  hiMask = new Uint8Array(MAP_W * MAP_H);
  for (let i = 0; i < MAP_W * MAP_H; i++) hiMask[i] = data[i * 4 + 3] > 110 ? 1 : 0;
  // 与寻路一致：把关键海峡也在高分辨率上打通，免得画面里陆地连着而航线却穿过去
  for (const [lon, lat, rDeg] of STRAITS) {
    const cx = projX(lon), cy = projY(lat), rr = Math.max(1.5, rDeg * 12);
    for (let r = Math.floor(cy - rr); r <= Math.ceil(cy + rr); r++)
      for (let c = Math.floor(cx - rr); c <= Math.ceil(cx + rr); c++) {
        if (c < 0 || r < 0 || c >= MAP_W || r >= MAP_H) continue;
        if ((c - cx) ** 2 + (r - cy) ** 2 <= rr * rr) hiMask[r * MAP_W + c] = 0;
      }
  }
  return hiMask;
}

export function isLandXY(x, y) {
  buildMask();
  const c = Math.floor(x / NAV), r = Math.floor(y / NAV);
  if (c < 0 || r < 0 || c >= NC || r >= NR) return false;
  return !!mask[idx(c, r)];
}
/** 把一个点吸附到最近的可航水域格中心 */
export function snapToWater(x, y, maxRing = 40) {
  buildMask();
  let c = Math.max(0, Math.min(NC - 1, Math.floor(x / NAV)));
  let r = Math.max(0, Math.min(NR - 1, Math.floor(y / NAV)));
  if (!mask[idx(c, r)]) return { c, r };
  for (let ring = 1; ring <= maxRing; ring++) {
    for (let dr = -ring; dr <= ring; dr++) for (let dc = -ring; dc <= ring; dc++) {
      if (Math.max(Math.abs(dr), Math.abs(dc)) !== ring) continue;
      const nc = c + dc, nr = r + dr;
      if (nc < 0 || nr < 0 || nc >= NC || nr >= NR) continue;
      if (!mask[idx(nc, nr)]) return { c: nc, r: nr };
    }
  }
  return { c, r };
}
const cellCenter = (c, r) => ({ x: c * NAV + NAV / 2, y: r * NAV + NAV / 2 });

/** 线段是否全程在水上 */
function seaLine(ax, ay, bx, by) {
  const d = Math.hypot(bx - ax, by - ay), n = Math.max(1, Math.ceil(d / (NAV * 0.6)));
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    if (isLandXY(ax + (bx - ax) * t, ay + (by - ay) * t)) return false;
  }
  return true;
}

/* 简易二叉堆 */
class Heap {
  constructor() { this.a = []; }
  push(v, p) { const a = this.a; a.push({ v, p }); let i = a.length - 1; while (i > 0) { const par = (i - 1) >> 1; if (a[par].p <= a[i].p) break; [a[par], a[i]] = [a[i], a[par]]; i = par; } }
  pop() { const a = this.a; if (!a.length) return null; const top = a[0], last = a.pop(); if (a.length) { a[0] = last; let i = 0; for (;;) { const l = i * 2 + 1, r = l + 1; let m = i; if (l < a.length && a[l].p < a[m].p) m = l; if (r < a.length && a[r].p < a[m].p) m = r; if (m === i) break; [a[m], a[i]] = [a[i], a[m]]; i = m; } } return top.v; }
  get size() { return this.a.length; }
}

const DIRS = [[1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1], [1, 1, 1.4142], [1, -1, 1.4142], [-1, 1, 1.4142], [-1, -1, 1.4142]];

/**
 * 海上寻路：返回逻辑坐标航点数组（含终点，不含起点）；找不到路时返回直线终点。
 * 航线会避开陆地，并轻微偏好离岸水域。
 */
export function findPath(from, to) {
  buildMask();
  if (seaLine(from.x, from.y, to.x, to.y)) return [{ x: to.x, y: to.y }];
  const s = snapToWater(from.x, from.y), g = snapToWater(to.x, to.y);
  const start = idx(s.c, s.r), goal = idx(g.c, g.r);
  if (start === goal) return [{ x: to.x, y: to.y }];
  const gScore = new Float32Array(NC * NR).fill(Infinity);
  const prev = new Int32Array(NC * NR).fill(-1);
  const closed = new Uint8Array(NC * NR);
  const h = (c, r) => Math.hypot(c - g.c, r - g.r);
  const open = new Heap();
  gScore[start] = 0; open.push(start, h(s.c, s.r));
  let found = false, guard = 0;
  while (open.size && guard++ < 400000) {
    const cur = open.pop();
    if (cur === goal) { found = true; break; }
    if (closed[cur]) continue;
    closed[cur] = 1;
    const cc = cur % NC, cr = (cur - cc) / NC;
    for (const [dc, dr, w] of DIRS) {
      const nc = cc + dc, nr = cr + dr;
      if (nc < 0 || nr < 0 || nc >= NC || nr >= NR) continue;
      const ni = idx(nc, nr);
      if (mask[ni] || closed[ni]) continue;
      if (w > 1 && (mask[idx(cc + dc, cr)] || mask[idx(cc, cr + dr)])) continue;  // 不穿对角缝
      const ng = gScore[cur] + w + (coast[ni] ? 0.45 : 0);
      if (ng < gScore[ni]) { gScore[ni] = ng; prev[ni] = cur; open.push(ni, ng + h(nc, nr)); }
    }
  }
  if (!found) return [{ x: to.x, y: to.y }];
  const cells = [];
  for (let cur = goal; cur !== -1; cur = prev[cur]) { const c = cur % NC; cells.push(cellCenter(c, (cur - c) / NC)); if (cur === start) break; }
  cells.reverse();
  cells.push({ x: to.x, y: to.y });
  // 视线平滑
  const out = []; let i = 0; let cx = from.x, cy = from.y;
  while (i < cells.length) {
    let j = cells.length - 1;
    while (j > i && !seaLine(cx, cy, cells[j].x, cells[j].y)) j--;
    if (j <= i) j = i;
    out.push(cells[j]); cx = cells[j].x; cy = cells[j].y; i = j + 1;
  }
  if (out[out.length - 1] !== cells[cells.length - 1]) out.push(cells[cells.length - 1]);
  return out;
}

/** 航线总长度（逻辑单位） */
export function pathLength(from, path) {
  let d = 0, px = from.x, py = from.y;
  for (const p of path) { d += Math.hypot(p.x - px, p.y - py); px = p.x; py = p.y; }
  return d;
}
