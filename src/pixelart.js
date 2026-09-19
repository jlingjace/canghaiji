/* 运行时生成的像素贴图（全部原创）。换成真 PNG 素材时只需把这里的函数改成 Assets.load。 */
import { Texture } from 'pixi.js';
import { seeded } from './util.js';
import * as geo from './geo.js';
import * as nav from './nav.js';
import * as A from './art.js';

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

/**
 * 海面平铺贴图：32×32、6 帧。
 * 用整数频率的正弦叠加做涌浪，所以左右上下都能无缝平铺；波光按帧右移，循环正好闭合。
 */
export function makeWaterFrames(frames = 6, scale = 2) {
  const S = 32, out = [];
  const DEEP = A.rgb('#0f3d5f'), BASE = A.rgb('#17547d'), LIGHT = A.rgb('#2477a6'), CREST = A.rgb('#3f9ec4');
  const TAU = Math.PI * 2;
  const swell = (x, y) =>
    0.19 * Math.sin(TAU * x / S + 1.3) * Math.sin(TAU * 2 * y / S) +
    0.13 * Math.sin(TAU * 2 * x / S - 0.7) * Math.cos(TAU * y / S) +
    0.08 * Math.sin(TAU * 3 * x / S + 2.1) * Math.sin(TAU * 3 * y / S + 0.4);
  for (let f = 0; f < frames; f++) {
    const c = document.createElement('canvas'); c.width = S * scale; c.height = S * scale;
    const ctx = c.getContext('2d'); ctx.imageSmoothingEnabled = false;
    const shift = f * S / frames;
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
      const v = swell(x + shift * 0.5, y) + 0.5;
      let col = v < 0.34 ? A.mix(DEEP, BASE, v / 0.34)
              : v < 0.62 ? A.mix(BASE, LIGHT, (v - 0.34) / 0.28)
              : A.mix(LIGHT, CREST, Math.min(1, (v - 0.62) / 0.24));
      col = A.mix(col, v > 0.5 ? CREST : DEEP, Math.abs(A.bayer(x, y)) * 0.20);
      ctx.fillStyle = A.hex(col); ctx.fillRect(x * scale, y * scale, scale, scale);
    }
    // 波光：在涌浪脊线上挑几处短划，逐帧右移
    const spark = seeded(4242);
    for (let i = 0; i < 9; i++) {
      const sy = Math.floor(spark() * S);
      const sx = Math.floor((spark() * S + shift * 2) % S);
      if (swell(sx, sy) + 0.5 < 0.55) continue;
      const len = 2 + Math.floor(spark() * 3);
      for (let k = 0; k < len; k++) {
        ctx.fillStyle = k === len - 1 ? '#9fd6ec' : '#62b0d6';
        ctx.fillRect(((sx + k) % S) * scale, sy * scale, scale, scale);
      }
    }
    out.push(canvasTexture(c));
  }
  return out;
}

/* ================= 船只：32×32，带船体明暗、鼓帆、索具、艏浪 ================= */
export const SHIP_PX = 32;
const SP = {
  hull: '#6a4526', deck: '#b58a4c', trim: '#8a5f30', dark: '#2a1a0d',
  sail: '#f2ead6', mast: '#4a3118', yard: '#3d2a15', rope: '#6a5540', flag: '#d64545', foam: '#dcf0fa',
};

const line = (px, x0, y0, x1, y1, col) => {
  const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0));
  for (let i = 0; i <= n; i++) px(Math.round(x0 + (x1 - x0) * i / n), Math.round(y0 + (y1 - y0) * i / n), 1, 1, col);
};

/** 横帆：帆桁 + 鼓起的帆面。左受光、右背光、后缘最暗，中间一道缩帆索 */
function square(px, cx, halfW, yTop, h, bulge = 2, lean = 0) {
  px(cx - halfW - 1, yTop, halfW * 2 + 3, 1, SP.yard);                 // 帆桁
  px(cx - halfW - 1, yTop, 1, 1, A.shade(SP.yard, 0.3));
  for (let i = -halfW; i <= halfW; i++) {
    const t = (i + halfW) / (halfW * 2), belly = Math.sin(Math.PI * t);
    const top = yTop + 1 + Math.round((1 - belly) * 0.9);
    const bot = yTop + h + Math.round(belly * bulge);
    const k = 0.40 - t * 1.15 + belly * 0.20 + lean;
    for (let y = top; y <= bot; y++) px(cx + i, y, 1, 1, A.shade(SP.sail, k * 0.5));
    px(cx + i, bot, 1, 1, A.shade(SP.sail, k * 0.5 - 0.20));           // 帆脚边
    const reef = top + Math.round((bot - top) * 0.58);
    px(cx + i, reef, 1, 1, A.shade(SP.sail, k * 0.5 - 0.14));
  }
  for (let y = yTop + 1; y <= yTop + h + bulge; y++) px(cx + halfW, y, 1, 1, A.shade(SP.sail, -0.48));  // 后缘
}
/** 三角纵帆（后桅） */
function lateen(px, xMast, yTop, yBot, back) {
  const h = yBot - yTop;
  for (let j = 0; j <= h; j++) {
    const w = Math.round(j / h * back);
    for (let i = 1; i <= w; i++) {
      const k = 0.28 - (i / Math.max(1, w)) * 0.9;
      px(xMast - i, yTop + j, 1, 1, A.shade(SP.sail, k * 0.5));
    }
    if (w) px(xMast - w, yTop + j, 1, 1, A.shade(SP.sail, -0.42));
  }
  line(px, xMast, yTop, xMast - back, yBot, SP.yard);                  // 斜桁
}

function drawShipSide(px, lift) {
  const B = -lift;
  const deckY = 19 + B, keel = 25 + B;
  // 索具
  for (const [x0, y0, x1, y1] of [[15, 2, 4, deckY], [15, 2, 29, deckY], [24, 6, 30, deckY - 1], [7, 7, 3, deckY - 1], [15, 2, 24, 6], [15, 2, 7, 7]])
    line(px, x0, y0 + B, x1, y1, SP.rope);
  // 桅杆
  px(15, 2 + B, 1, 18, SP.mast); px(24, 6 + B, 1, 14, SP.mast); px(7, 7 + B, 1, 13, SP.mast);
  px(16, 2 + B, 1, 18, A.shade(SP.mast, -0.3));
  // 帆：主桅上下两道横帆、前桅一道、后桅三角帆
  square(px, 15, 3, 4 + B, 4, 1);                   // 中帆
  square(px, 15, 6, 10 + B, 7, 2);                  // 主帆
  square(px, 24, 4, 8 + B, 8, 2, -0.10);            // 前帆（略暗，在主帆之后）
  lateen(px, 7, 8 + B, deckY - 1, 5);
  // 旗
  px(16, 0 + B, 4, 1, SP.flag); px(16, 1 + B, 3, 1, A.shade(SP.flag, -0.25)); px(15, 0 + B, 1, 2, SP.mast);
  // 船体：左艉楼高、船腰低、右艏楼略起
  const top = c => c <= 4 ? deckY - 4 : c <= 7 ? deckY - 3 : c <= 25 ? deckY : deckY - 1;
  const bot = c => (c <= 3 || c >= 29) ? keel - 2 : keel;
  for (let c = 2; c <= 30; c++) {
    const t = top(c), k = bot(c);
    px(c, t, 1, 1, SP.deck);
    px(c, t + 1, 1, Math.max(0, k - t - 3), SP.hull);
    px(c, k - 2, 1, 1, A.shade(SP.hull, -0.22));
    px(c, k - 1, 1, 1, A.shade(SP.hull, -0.42));
    px(c, k, 1, 1, SP.dark);
  }
  for (let c = 3; c <= 29; c++) px(c, top(c) + 2, 1, 1, SP.trim);      // 舷侧饰带
  for (const c of [10, 14, 18, 22]) px(c, top(c) + 4, 2, 2, SP.dark);  // 炮门
  px(3, deckY - 3, 3, 2, A.shade(SP.deck, 0.3));                       // 艉楼窗
  px(3, deckY - 6, 5, 1, A.shade(SP.trim, 0.2));                       // 艉楼栏杆
  for (let i = 0; i < 5; i++) px(29 + (i > 2 ? 1 : 0), deckY - 2 - i, 1, 1, SP.mast);   // 艏斜桁
  // 艏浪与艉迹
  px(29, keel, 3, 1, SP.foam); px(30, keel - 1, 2, 1, SP.foam);
  px(1, keel, 3, 1, A.shade(SP.foam, -0.35));
}

function drawShipFace(px, lift, toward) {
  const B = -lift, cx = 16, deckY = 19 + B, keel = 25 + B;
  for (const [x0, y0, x1, y1] of [[cx, 2, cx - 9, deckY], [cx, 2, cx + 9, deckY], [cx, 2, cx - 4, 12], [cx, 2, cx + 4, 12]])
    line(px, x0, y0 + B, x1, y1, SP.rope);
  px(cx, 2 + B, 1, 18, SP.mast); px(cx + 1, 2 + B, 1, 18, A.shade(SP.mast, -0.3));
  square(px, cx, 4, 4 + B, 4, 1);
  square(px, cx, 8, 10 + B, 7, 2);
  px(cx + 1, 0 + B, 4, 1, SP.flag); px(cx + 1, 1 + B, 3, 1, A.shade(SP.flag, -0.25));
  // 船体：梯形，中间受光两侧转暗
  for (let y = 0; y <= keel - deckY; y++) {
    const half = Math.round(4 + y * 0.9), yy = deckY + y;
    for (let i = -half; i <= half; i++) {
      const t = i / half;
      let col = A.shade(SP.hull, 0.20 - Math.abs(t + 0.35) * 0.55);
      if (y === 0) col = A.shade(SP.deck, -Math.abs(t) * 0.3);
      else if (y === 1) col = SP.trim;
      else if (y >= keel - deckY - 1) col = A.shade(SP.hull, -0.45);
      px(cx + i, yy, 1, 1, col);
    }
  }
  if (toward) { px(cx - 3, deckY + 2, 2, 2, A.shade(SP.deck, 0.3)); px(cx + 2, deckY + 2, 2, 2, A.shade(SP.deck, 0.15)); }  // 艉窗
  const half = 10;
  for (let i = -half; i <= half; i++) px(cx + i, keel + 1, 1, 1, SP.dark);
  for (let i = -8; i <= 8; i++) if ((i + 9) % 3) px(cx + i, keel + 2, 1, 1, A.shade(SP.foam, -Math.abs(i) / 16));
}

/** 船精灵：E（东，向西时镜像）、N、S 各 2 帧，32×32 原始像素 */
export function makeShipTextures() {
  const mk = draw => {
    const c = document.createElement('canvas'); c.width = SHIP_PX; c.height = SHIP_PX;
    const x = c.getContext('2d'); x.imageSmoothingEnabled = false;
    const px = (a, b, w, h, col) => { x.fillStyle = col; x.fillRect(a | 0, b | 0, w | 0, h | 0); };
    draw(px);
    return canvasTexture(c);
  };
  return {
    E: [mk(p => drawShipSide(p, 0)), mk(p => drawShipSide(p, 1))],
    N: [mk(p => drawShipFace(p, 0, false)), mk(p => drawShipFace(p, 1, false))],
    S: [mk(p => drawShipFace(p, 0, true)), mk(p => drawShipFace(p, 1, true))],
  };
}

/* ================= 港口图标：按地域风格上色的小码头，24×20 ================= */
const PORT_STYLE = {
  iberian:       { wall: '#e8dcc0', roof: '#9a3f2e' }, mediterranean: { wall: '#f0ece0', roof: '#b4653a' },
  ottoman:       { wall: '#e6dcc8', roof: '#8a7a5a' }, northern:      { wall: '#7d5a36', roof: '#54626f' },
  westafrican:   { wall: '#d9b077', roof: '#8a7a3a' }, indian:        { wall: '#f0e0c8', roof: '#a85a3a' },
  seasia:        { wall: '#d8c08a', roof: '#7a6a3a' }, eastasia:      { wall: '#f0ece0', roof: '#2f6a5a' },
  colonial:      { wall: '#e6eef7', roof: '#a85a4a' }, brazil:        { wall: '#f0dcc0', roof: '#b06a3a' },
};
/**
 * 低缩放下用的港口「地图符号」：一个带描边的菱形，规模决定大小，大港加一面小旗。
 * 全球视角下几十个详细的小码头会糊成一片，换成符号就清爽了。
 */
export function makePortSymbol(tier = 2, color = '#e8dcc0') {
  const R = tier >= 3 ? 5 : tier === 2 ? 4 : 3;
  const SZ = R * 2 + 6, cx = Math.floor(SZ / 2), cy = tier >= 3 ? R + 4 : R + 2;
  const c = document.createElement('canvas'); c.width = SZ; c.height = SZ;
  const x = c.getContext('2d'); x.imageSmoothingEnabled = false;
  const px = (a2, b2, w, h, col) => { x.fillStyle = col; x.fillRect(Math.round(a2), Math.round(b2), Math.round(w), Math.round(h)); };
  if (tier >= 3) { px(cx, 0, 1, 5, '#3a4450'); px(cx + 1, 0, 3, 2, color); }   // 旗杆
  for (let j = -R; j <= R; j++) {                                              // 菱形
    const w = (R - Math.abs(j)) * 2 + 1;
    px(cx - (w + 2) / 2, cy + j, w + 2, 1, '#141c26');                         // 描边
    if (Math.abs(j) < R) px(cx - w / 2, cy + j, w, 1, A.shade(color, j < 0 ? 0.22 : -0.26));
  }
  px(cx - 1, cy - 1, 2, 2, A.shade(color, 0.40));                              // 高光
  return canvasTexture(c);
}

/**
 * 港口图标。tier 决定建筑数量与是否有塔楼，style 决定墙色与屋顶色，
 * 所以在海图上一眼能看出这是个什么样的港。
 */
export function makePortIcon(styleKey = 'iberian', tier = 2) {
  const st = PORT_STYLE[styleKey] || PORT_STYLE.iberian;
  const W = 26, H = 22, GY = 17;                       // GY = 码头面
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const x = c.getContext('2d'); x.imageSmoothingEnabled = false;
  const px = (a, b, w, h, col) => { x.fillStyle = col; x.fillRect(a | 0, b | 0, w | 0, h | 0); };
  const rng = seeded(1700 + tier * 31 + styleKey.length * 7);

  // 码头基座（石砌，上缘受光、下缘入水）
  px(2, GY, W - 4, 3, '#9a8e78'); px(2, GY, W - 4, 1, '#c3b79c');
  px(2, GY + 3, W - 4, 2, '#5d5748'); px(3, GY + 5, W - 6, 1, '#2b3a4c');
  for (let i = 4; i < W - 4; i += 5) px(i, GY + 4, 1, 3, '#3d3529');   // 木桩

  // 房屋：从左到右，tier 越高越多越高
  const n = tier >= 3 ? 4 : tier === 2 ? 3 : 2;
  const slots = { 2: [4, 14], 3: [3, 10, 17], 4: [2, 8, 14, 20] }[n];
  for (let i = 0; i < n; i++) {
    const bx = slots[i], bw = 5 + Math.floor(rng() * 2);
    const bh = (tier >= 3 ? 8 : 6) + Math.floor(rng() * 3);
    const top = GY - bh;
    px(bx + 1, GY - 1, bw + 1, 1, 'rgba(20,28,40,0.35)');              // 接地影
    px(bx, top, bw, bh, st.wall);                                       // 受光墙
    px(bx + bw - 2, top, 2, bh, A.shade(st.wall, -0.30));               // 背光面
    px(bx, top, bw, 1, A.shade(st.wall, 0.22));
    px(bx - 1, top - 3, bw + 2, 3, st.roof);                            // 屋顶
    px(bx - 1, top - 3, bw + 2, 1, A.shade(st.roof, 0.3));
    px(bx - 1, top - 1, bw + 2, 1, A.shade(st.roof, -0.35));            // 屋檐阴影
    px(bx + 1, top + 2, 1, 2, '#f2c14e');                               // 窗
    if (bh > 7) px(bx + 3, top + 5, 1, 2, '#f2c14e');
  }
  // 大港加一座灯塔 / 钟楼
  if (tier >= 3) {
    const tx = W - 6;
    px(tx, GY - 15, 4, 15, st.wall); px(tx + 2, GY - 15, 2, 15, A.shade(st.wall, -0.30));
    px(tx - 1, GY - 18, 6, 3, st.roof); px(tx - 1, GY - 18, 6, 1, A.shade(st.roof, 0.3));
    px(tx + 1, GY - 13, 2, 2, '#f2c14e');
  }
  // 码头上的木箱与吊臂，给一点生活感
  px(3, GY - 3, 3, 3, '#8a5f30'); px(3, GY - 3, 3, 1, '#a87c46'); px(5, GY - 3, 1, 3, '#5e3f20');
  return canvasTexture(c);
}
export function makeWorldLandCanvas() {
  const { MAP_W, MAP_H, unprojLat, unprojLon } = geo;
  const { NAV, NC, NR } = nav;
  const mask = nav.buildMask();
  const N = A.makeNoise(20260919);
  const cv = document.createElement('canvas'); cv.width = MAP_W; cv.height = MAP_H;
  const ctx = cv.getContext('2d');
  const img = ctx.createImageData(MAP_W, MAP_H);
  const d = img.data;

  // 离岸距离：陆地格 → 最近海；海格 → 最近陆地
  const distToSea = A.distanceField(mask, NC, NR, 1, 60);     // 只对陆地格有意义
  const distToLand = A.distanceField(mask, NC, NR, 0, 30);    // 只对海格有意义

  /* ---- 高程场（0~1）---- */
  const elev = new Float32Array(NC * NR);
  for (let r = 0; r < NR; r++) for (let c = 0; c < NC; c++) {
    const i = r * NC + c;
    if (!mask[i]) continue;
    const inland = Math.min(1, distToSea[i] / 16);             // 海岸低、内陆高
    const base = N.fbm(c * 0.045, r * 0.045, 4);
    const ridge = N.ridge(c * 0.028 + 40, r * 0.028 + 40, 4);
    elev[i] = Math.pow(inland, 0.8) * (base * 0.45 + Math.pow(ridge, 2.2) * 0.75);
  }
  /* ---- 每格受光（山体阴影）---- */
  const lit = new Float32Array(NC * NR);
  const E = (c, r) => (c < 0 || r < 0 || c >= NC || r >= NR) ? 0 : elev[r * NC + c];
  for (let r = 0; r < NR; r++) for (let c = 0; c < NC; c++) {
    if (!mask[r * NC + c]) continue;
    lit[r * NC + c] = A.lambert((E(c + 1, r) - E(c - 1, r)) * 26, (E(c, r + 1) - E(c, r - 1)) * 26);
  }

  /* ---- 气候带配色 ---- */
  const BIO = {
    ice:    [232, 238, 244], tundra:  [150, 158, 140], boreal:   [ 52,  92,  66],
    temper: [ 74, 122,  68], medit:   [124, 134,  74], steppe:   [163, 156,  98],
    desert: [206, 184, 126], savanna: [150, 152,  84], tropic:   [ 52, 112,  58],
    rock:   [138, 130, 118], snow:    [238, 242, 246],
  };
  function biome(lat, moist) {
    const a = Math.abs(lat);
    if (a > 68) return BIO.ice;
    if (a > 58) return A.mix(BIO.tundra, BIO.boreal, moist);
    if (a > 47) return A.mix(BIO.boreal, BIO.temper, moist * 0.8 + 0.1);
    if (a > 36) return A.mix(BIO.medit, BIO.temper, moist);
    if (a > 29) return A.mix(BIO.desert, BIO.medit, moist * moist);
    if (a > 17) return A.mix(BIO.desert, BIO.savanna, Math.pow(moist, 1.6));
    if (a > 9)  return A.mix(BIO.savanna, BIO.tropic, moist);
    return A.mix(BIO.savanna, BIO.tropic, Math.min(1, moist * 1.5));
  }
  const SAND = [216, 198, 148], SAND_D = [190, 170, 118];
  const SHELF = [86, 168, 190], SHOAL = [120, 196, 206];

  /* ---- 每格基色 ---- */
  const colR = new Float32Array(NC * NR), colG = new Float32Array(NC * NR), colB = new Float32Array(NC * NR);
  for (let r = 0; r < NR; r++) for (let c = 0; c < NC; c++) {
    const i = r * NC + c;
    if (!mask[i]) continue;
    const lat = unprojLat(r * NAV + NAV / 2);
    // 湿度：噪声 + 西风带 / 信风带的粗略偏置，让撒哈拉与刚果不会长一个样
    const lon = unprojLon(c * NAV + NAV / 2);
    let moist = N.fbm(c * 0.02 + 90, r * 0.02 + 90, 3);
    moist = Math.min(1, Math.max(0, moist * 1.25 - 0.14));
    if (Math.abs(lat) > 12 && Math.abs(lat) < 33) moist *= 0.45;            // 副热带高压带 → 沙漠
    if (lon > 60 && lon < 130 && lat > 5 && lat < 30) moist = Math.min(1, moist + 0.45);  // 季风亚洲
    let col = biome(lat, moist);
    const e = elev[i];
    if (e > 0.52) col = A.mix(col, BIO.rock, Math.min(1, (e - 0.52) / 0.3));
    const snowLine = 0.86 - Math.min(0.55, Math.abs(lat) / 90 * 0.8);
    if (e > snowLine) col = A.mix(col, BIO.snow, Math.min(1, (e - snowLine) / 0.12));
    if (distToSea[i] <= 1) col = A.mix(col, SAND, 0.75);
    else if (distToSea[i] === 2) col = A.mix(col, SAND_D, 0.35);
    colR[i] = col[0]; colG[i] = col[1]; colB[i] = col[2];
  }

  /* ---- 高频细节查找表（逐像素调用噪声太慢）---- */
  const LUT = 128, nz = new Float32Array(LUT * LUT);
  for (let y = 0; y < LUT; y++) for (let x = 0; x < LUT; x++) nz[y * LUT + x] = N.fbm(x * 0.17, y * 0.17, 4) - 0.5;

  const put = (x, y, r8, g8, b8, a8) => {
    const i = (y * MAP_W + x) * 4;
    d[i] = r8; d[i + 1] = g8; d[i + 2] = b8; d[i + 3] = a8;
  };

  /* ---- 逐像素上色 ----
     地形起伏、气候、浅滩这些「场」是连续的，按粗网格算再插值就够；
     但陆海边界必须用高分辨率掩膜逐像素判断，否则海岸线是 4 像素一级的台阶。 */
  const hi = nav.buildHiMask();
  const isLand = (x, y) => (x < 0 || y < 0 || x >= MAP_W || y >= MAP_H) ? 0 : hi[y * MAP_W + x];
  // 双线性取样粗网格上的场
  const sampleCell = (arr, gx, gy) => {
    const c0 = Math.min(NC - 1, Math.max(0, Math.floor(gx))), r0 = Math.min(NR - 1, Math.max(0, Math.floor(gy)));
    const c1 = Math.min(NC - 1, c0 + 1), r1 = Math.min(NR - 1, r0 + 1);
    const fx = Math.min(1, Math.max(0, gx - c0)), fy = Math.min(1, Math.max(0, gy - r0));
    return (arr[r0 * NC + c0] * (1 - fx) + arr[r0 * NC + c1] * fx) * (1 - fy)
         + (arr[r1 * NC + c0] * (1 - fx) + arr[r1 * NC + c1] * fx) * fy;
  };
  // 邻近取样（颜色不插值，避免气候带糊成一片）
  const nearCell = (arr, gx, gy) => arr[Math.min(NR - 1, Math.max(0, Math.round(gy - 0.5))) * NC + Math.min(NC - 1, Math.max(0, Math.round(gx - 0.5)))];

  for (let y = 0; y < MAP_H; y++) {
    const gy = (y + 0.5) / NAV;
    for (let x = 0; x < MAP_W; x++) {
      const gx = (x + 0.5) / NAV;
      const n = nz[((y * 1.37 | 0) & (LUT - 1)) * LUT + ((x * 1.11 | 0) & (LUT - 1))];
      if (!isLand(x, y)) {
        /* 海：只画大陆架，深海留给下面会动的水面平铺层 */
        const dl = sampleCell(distToLand, gx, gy);
        if (dl > 15 || dl <= 0) continue;
        const t = 1 - (dl - 1) / 15;
        const sc = A.mix(SHELF, SHOAL, Math.pow(Math.max(0, t), 1.5));
        let alpha = 235 * Math.pow(Math.max(0, t), 1.35) + n * 60;
        // 紧贴岸边的一两像素加一道亮浅滩，海岸线就有了「边」
        if (isLand(x - 1, y) || isLand(x + 1, y) || isLand(x, y - 1) || isLand(x, y + 1)) { alpha = 252; }
        put(x, y, sc[0] + n * 26, sc[1] + n * 26, sc[2] + n * 20, Math.max(0, Math.min(255, alpha)));
        continue;
      }
      /* 陆 */
      const L = sampleCell(lit, gx, gy);
      const ci = Math.min(NR - 1, Math.max(0, Math.round(gy - 0.5))) * NC + Math.min(NC - 1, Math.max(0, Math.round(gx - 0.5)));
      let R = colR[ci], G = colG[ci], B = colB[ci];
      if (!R && !G && !B) { R = 74; G = 122; B = 68; }          // 粗网格判为海、但高分辨率判为陆的边角
      let k = L * 0.30 + n * 0.14;
      // 沙滩：按高分辨率掩膜量出离海几像素
      let coast = 0;
      for (let d = 1; d <= 3 && !coast; d++) {
        if (!isLand(x - d, y) || !isLand(x + d, y) || !isLand(x, y - d) || !isLand(x, y + d)
          || !isLand(x - d, y - d) || !isLand(x + d, y + d) || !isLand(x - d, y + d) || !isLand(x + d, y - d)) coast = d;
      }
      if (coast === 1) { R = R * 0.18 + SAND[0] * 0.82; G = G * 0.18 + SAND[1] * 0.82; B = B * 0.18 + SAND[2] * 0.82; k -= 0.06; }
      else if (coast === 2) { R = R * 0.45 + SAND_D[0] * 0.55; G = G * 0.45 + SAND_D[1] * 0.55; B = B * 0.45 + SAND_D[2] * 0.55; k -= 0.12; }
      else if (coast === 3) { R = R * 0.78 + SAND_D[0] * 0.22; G = G * 0.78 + SAND_D[1] * 0.22; B = B * 0.78 + SAND_D[2] * 0.22; k -= 0.16; }
      const o = k >= 0 ? [R + (255 - R) * k * 0.85, G + (246 - G) * k * 0.85, B + (224 - B) * k * 0.85]
                       : [R + (18 - R) * -k, G + (26 - G) * -k, B + (46 - B) * -k];
      put(x, y, o[0], o[1], o[2], 255);
    }
  }
  ctx.putImageData(img, 0, 0);
  return cv;
}
