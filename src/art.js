/*
 * 美术工具箱：所有场景（海图 / 港口 / 船只）共用同一套光照模型、调色与噪声，
 * 这样三个场景的质感才会是一致的，而不是各画各的。
 *
 * 约定：光从左上打来（SUN），所以任何立体物的左 / 上面受光、右 / 下面背光，
 * 并在右下方投影。远处的东西往天色里褪（大气透视）。
 */

/* ========= 颜色 ========= */
export const rgb = hex => {
  const v = parseInt(hex.slice(1), 16);
  return [(v >> 16) & 255, (v >> 8) & 255, v & 255];
};
export const hex = ([r, g, b]) => '#' + [r, g, b].map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
export const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
export const mixHex = (a, b, t) => hex(mix(rgb(a), rgb(b), t));
/** 明暗：t>0 提亮（向暖白），t<0 压暗（向冷蓝），比单纯乘系数更像颜料 */
export function shade(c, t) {
  const a = Array.isArray(c) ? c : rgb(c);
  const out = t >= 0 ? mix(a, [255, 246, 224], t) : mix(a, [18, 26, 46], -t);
  return Array.isArray(c) ? out : hex(out);
}
/** 饱和度调整（-1 ~ 1） */
export function sat(c, t) {
  const a = Array.isArray(c) ? c : rgb(c);
  const l = a[0] * 0.299 + a[1] * 0.587 + a[2] * 0.114;
  const out = [l + (a[0] - l) * (1 + t), l + (a[1] - l) * (1 + t), l + (a[2] - l) * (1 + t)];
  return Array.isArray(c) ? out : hex(out);
}
/** 大气透视：越远越往天色里褪、越去饱和 */
export const atmo = (c, skyC, d) => mix(sat(Array.isArray(c) ? c : rgb(c), -d * 0.5), Array.isArray(skyC) ? skyC : rgb(skyC), d * 0.75);

/* ========= 光照 ========= */
export const SUN = { x: -0.62, y: -0.72 };            // 指向光源的单位向量（左上）
/** 由坡面法线（dx,dy = 高度梯度）求受光系数 −1~1 */
export function lambert(dx, dy) {
  const nz = 1.6;                                      // 越大坡度影响越柔
  const len = Math.hypot(dx, dy, nz) || 1;
  return -(dx * SUN.x + dy * SUN.y) / len * 2.2;
}

/* ========= 抖动（像素画避免色带的正统做法）========= */
const BAYER8 = [
  [0, 32, 8, 40, 2, 34, 10, 42], [48, 16, 56, 24, 50, 18, 58, 26],
  [12, 44, 4, 36, 14, 46, 6, 38], [60, 28, 52, 20, 62, 30, 54, 22],
  [3, 35, 11, 43, 1, 33, 9, 41], [51, 19, 59, 27, 49, 17, 57, 25],
  [15, 47, 7, 39, 13, 45, 5, 37], [63, 31, 55, 23, 61, 29, 53, 21],
].map(r => r.map(v => (v + 0.5) / 64 - 0.5));
export const bayer = (x, y) => BAYER8[y & 7][x & 7];

/* ========= 噪声 ========= */
/** 可复现的 2D 值噪声，带双线性插值 */
export function makeNoise(seed = 1) {
  const P = new Uint8Array(512);
  let t = seed >>> 0;
  const rnd = () => { t = (t + 0x6D2B79F5) >>> 0; let r = Math.imul(t ^ (t >>> 15), 1 | t); r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r; return ((r ^ (r >>> 14)) >>> 0) / 4294967296; };
  for (let i = 0; i < 256; i++) P[i] = Math.floor(rnd() * 256);
  for (let i = 0; i < 256; i++) P[256 + i] = P[i];
  const at = (xi, yi) => P[(P[xi & 255] + (yi & 255)) & 511] / 255;
  const sm = v => v * v * (3 - 2 * v);
  const noise = (x, y) => {
    const xi = Math.floor(x), yi = Math.floor(y), fx = sm(x - xi), fy = sm(y - yi);
    const a = at(xi, yi), b = at(xi + 1, yi), c = at(xi, yi + 1), d = at(xi + 1, yi + 1);
    return (a + (b - a) * fx) + ((c + (d - c) * fx) - (a + (b - a) * fx)) * fy;
  };
  /** 分形噪声 */
  const fbm = (x, y, oct = 4, lac = 2, gain = 0.5) => {
    let s = 0, amp = 1, f = 1, norm = 0;
    for (let i = 0; i < oct; i++) { s += noise(x * f, y * f) * amp; norm += amp; amp *= gain; f *= lac; }
    return s / norm;
  };
  /** 山脊噪声：造出连绵山脉而不是圆丘 */
  const ridge = (x, y, oct = 4) => {
    let s = 0, amp = 1, f = 1, norm = 0;
    for (let i = 0; i < oct; i++) { s += (1 - Math.abs(noise(x * f, y * f) * 2 - 1)) * amp; norm += amp; amp *= 0.5; f *= 2; }
    return s / norm;
  };
  return { noise, fbm, ridge };
}

/* ========= 栅格工具 ========= */
/**
 * 距离变换：对 want 值的格子，求到最近的非 want 格子的距离（棋盘 BFS，单位=格）。
 * 用来做「离岸多远」「离海多远」，进而得到浅滩渐变与内陆抬升。
 */
export function distanceField(mask, w, h, want, maxD = 64) {
  const d = new Uint8Array(w * h).fill(255);
  let q = [];
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = y * w + x;
    if (mask[i] === want) continue;
    d[i] = 0; q.push(i);
  }
  let step = 0;
  while (q.length && step < maxD) {
    step++;
    const nq = [];
    for (const i of q) {
      const x = i % w, y = (i - x) / w;
      for (let k = 0; k < 8; k++) {
        const nx = x + (k % 3) - 1, ny = y + ((k / 3) | 0) - 1;
        if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
        const j = ny * w + nx;
        if (d[j] !== 255) continue;
        d[j] = step; nq.push(j);
      }
    }
    q = nq;
  }
  return d;
}

/* ========= canvas 绘制助手 ========= */
/** 带抖动的竖直渐变，避免大面积色带 */
export function ditherGradient(ctx, x, y, w, h, top, bottom, steps = 12) {
  const a = rgb(top), b = rgb(bottom);
  for (let j = 0; j < h; j++) {
    const t = h <= 1 ? 0 : j / (h - 1);
    const q = Math.floor(t * steps) / steps, q2 = Math.min(1, q + 1 / steps);
    const frac = t * steps - Math.floor(t * steps);
    ctx.fillStyle = hex(mix(a, b, q)); ctx.fillRect(x, y + j, w, 1);
    if (frac > 0.5) {
      ctx.fillStyle = hex(mix(a, b, q2));
      for (let i = 0; i < w; i++) if (bayer(x + i, y + j) + 0.5 < frac) ctx.fillRect(x + i, y + j, 1, 1);
    }
  }
}
/** 软投影：右下方向的半透明色块，让物体「坐」在地面上 */
export function dropShadow(ctx, x, y, w, h, alpha = 0.28) {
  ctx.save(); ctx.globalAlpha = alpha; ctx.fillStyle = '#101826';
  for (let j = 0; j < h; j++) ctx.fillRect(x + j, y + j, w - j * 0.6, 1);
  ctx.restore();
}
/** 接地阴影（AO）：物体底部一条渐隐的暗带 */
export function contactShadow(ctx, x, y, w, n = 3) {
  ctx.save();
  for (let j = 0; j < n; j++) { ctx.globalAlpha = 0.26 * (1 - j / n); ctx.fillStyle = '#0d1420'; ctx.fillRect(x - j, y + j, w + j * 2, 1); }
  ctx.restore();
}
