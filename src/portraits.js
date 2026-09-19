import { clamp, hash } from './util.js';
import { PORTRAIT_ART } from './art_assets.js';

const esc = t => String(t).replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
/** 这个角色有没有手绘立绘 */
const artOf = c => c && c.id && PORTRAIT_ART[c.id];

export function shade(hex, amt) {
  const n = parseInt(hex.slice(1), 16);
  return '#' + [(n >> 16) + amt, ((n >> 8) & 255) + amt, (n & 255) + amt].map(v => clamp(v, 0, 255).toString(16).padStart(2, '0')).join('');
}

/** 小圆头像（紧凑卡片用） */
export function portrait(c, size = 64) {
  const art = artOf(c);
  if (art) return `<span class="pt pt-img" style="width:${size}px;height:${size}px"><img src="${art}" alt="${esc(c.name)}" loading="lazy" decoding="async"></span>`;
  const dark = shade(c.skin, -28);
  let s = `<svg class="pt" width="${size}" height="${size}" viewBox="0 0 120 120" role="img" aria-label="${c.name}">`;
  s += `<defs><clipPath id="ptclip"><circle cx="60" cy="60" r="58"/></clipPath></defs><circle cx="60" cy="60" r="58" fill="${c.bg}"/><g clip-path="url(#ptclip)">`;
  s += `<path d="M14 122 Q18 84 60 82 Q102 84 106 122 Z" fill="${c.clothes}"/><path d="M48 82 L60 96 L72 82" fill="none" stroke="${shade(c.clothes, 34)}" stroke-width="3"/>`;
  s += `<rect x="51" y="66" width="18" height="20" rx="4" fill="${dark}"/>`;
  if (c.hairStyle === 'long') s += `<path d="M34 46 Q24 100 44 108 L76 108 Q96 100 86 46 Z" fill="${c.hair}"/>`;
  s += `<circle cx="38" cy="56" r="4" fill="${c.skin}"/><circle cx="82" cy="56" r="4" fill="${c.skin}"/><ellipse cx="60" cy="54" rx="22" ry="26" fill="${c.skin}"/>`;
  if (c.hairStyle === 'short' || c.hairStyle === 'long') s += `<path d="M38 46 Q40 24 60 24 Q80 24 82 46 Q72 36 60 38 Q48 36 38 46 Z" fill="${c.hair}"/>`;
  if (c.hairStyle === 'bun') s += `<path d="M38 46 Q40 26 60 26 Q80 26 82 46 Q72 36 60 38 Q48 36 38 46 Z" fill="${c.hair}"/><circle cx="60" cy="24" r="9" fill="${c.hair}"/>`;
  if (c.hairStyle === 'bald') s += `<path d="M38 52 Q34 44 40 38 L43 54 Z M82 52 Q86 44 80 38 L77 54 Z" fill="${c.hair}"/>`;
  s += `<path d="M45 46 q6 -3 11 0 M64 46 q6 -3 11 0" stroke="${c.hair}" stroke-width="2.2" fill="none" stroke-linecap="round"/>`;
  s += `<ellipse cx="51" cy="53" rx="2.8" ry="3.2" fill="#22150f"/><ellipse cx="69" cy="53" rx="2.8" ry="3.2" fill="#22150f"/><circle cx="52" cy="52" r="0.9" fill="#fff"/><circle cx="70" cy="52" r="0.9" fill="#fff"/>`;
  s += `<path d="M60 55 q-3 7 1 8" stroke="${dark}" stroke-width="1.6" fill="none" stroke-linecap="round"/>`;
  if (c.beard === 'full') s += `<path d="M40 58 Q40 88 60 90 Q80 88 80 58 Q74 74 60 76 Q46 74 40 58 Z" fill="${c.hair}"/>`;
  if (c.beard === 'goatee') s += `<path d="M52 72 Q60 86 68 72 Q60 76 52 72 Z" fill="${c.hair}"/>`;
  if (c.beard === 'stubble') s += `<path d="M42 60 Q44 80 60 82 Q76 80 78 60 Q72 74 60 76 Q48 74 42 60 Z" fill="${c.hair}" opacity=".28"/>`;
  if (c.mustache) s += `<path d="M50 65 q10 -5 20 0 q-10 3 -20 0 Z" fill="${c.hair}"/>`;
  if (c.mouth === 'smile') s += `<path d="M53 68 Q60 74 67 68" stroke="#7a3b30" stroke-width="2" fill="none" stroke-linecap="round"/>`;
  else if (c.mouth === 'grin') s += `<path d="M52 67 Q60 76 68 67 Z" fill="#fff" stroke="#7a3b30" stroke-width="1.5"/>`;
  else if (c.mouth === 'frown') s += `<path d="M53 71 Q60 66 67 71" stroke="#7a3b30" stroke-width="2" fill="none" stroke-linecap="round"/>`;
  else s += `<path d="M54 69 L66 69" stroke="#7a3b30" stroke-width="2" stroke-linecap="round"/>`;
  const hc = c.hatColor || '#222', trim = c.trim || '#c9a54a';
  if (c.hat === 'tricorn') s += `<path d="M36 44 Q40 22 60 22 Q80 22 84 44 Z" fill="${hc}"/><path d="M18 46 Q60 24 102 46 Q80 38 60 40 Q40 38 18 46 Z" fill="${hc}"/><path d="M40 41 Q60 35 80 41" stroke="${trim}" stroke-width="1.5" fill="none"/>`;
  if (c.hat === 'bandana') s += `<path d="M36 46 Q60 36 84 46 L84 36 Q60 22 36 36 Z" fill="${hc}"/><path d="M84 40 q10 4 12 14 q-8 -4 -12 -8 Z" fill="${hc}"/>`;
  if (c.hat === 'turban') s += `<ellipse cx="60" cy="34" rx="26" ry="15" fill="${hc}"/><path d="M36 38 Q60 30 84 38" stroke="${shade(hc, -30)}" stroke-width="2" fill="none"/><circle cx="60" cy="30" r="3" fill="#f2c14e"/>`;
  if (c.hat === 'cap') s += `<path d="M36 44 L84 44 L82 32 Q60 24 38 32 Z" fill="${hc}"/><path d="M34 45 L86 45" stroke="${trim}" stroke-width="3"/>`;
  if (c.hat === 'beret') s += `<path d="M34 42 Q36 22 64 24 Q88 26 84 44 Q60 36 34 42 Z" fill="${hc}"/>`;
  if (c.acc === 'eyepatch') s += `<ellipse cx="69" cy="53" rx="6.5" ry="5.5" fill="#15100c"/><path d="M40 44 L75 49" stroke="#15100c" stroke-width="1.6"/>`;
  if (c.acc === 'earring') s += `<circle cx="83" cy="62" r="2.6" fill="none" stroke="#f2c14e" stroke-width="1.5"/>`;
  if (c.acc === 'scar') s += `<path d="M46 42 L50 58" stroke="#b66a5c" stroke-width="1.6"/>`;
  if (c.acc === 'glasses') s += `<circle cx="51" cy="53" r="6" fill="none" stroke="#c9a54a" stroke-width="1.5"/><circle cx="69" cy="53" r="6" fill="none" stroke="#c9a54a" stroke-width="1.5"/><path d="M57 53 L63 53" stroke="#c9a54a" stroke-width="1.5"/>`;
  if (c.acc === 'feather') s += `<path d="M86 30 q8 -16 16 -12 q-4 8 -14 14 Z" fill="#e9e9e9"/>`;
  return s + `</g></svg>`;
}

/**
 * 半身立绘（对话窗 / 船长选择 / 海战对峙用）。
 * 含闭口层 .m-closed 与开口层 .m-open（CSS 切换实现说话），眼睑层 .lids 用 CSS 关键帧眨眼。
 */
export function bust(c, w = 160) {
  const h = Math.round(w * 1.25);
  const art = artOf(c);
  if (art) return `<span class="bust bust-img" style="width:${w}px;height:${h}px"><img src="${art}" alt="${esc(c.name)}" loading="lazy" decoding="async"></span>`;
  const skin = c.skin, dark = shade(skin, -28), light = shade(skin, 16);
  const cl = c.clothes, clD = shade(cl, -34), clL = shade(cl, 30), trim = c.trim || '#c9a54a', eye = c.eyes || '#2b1b12';
  const inner = c.inner || '#efe6d2', hair = c.hair, hc = c.hatColor || '#222';
  const delay = ((hash(c.name) % 37) / 10).toFixed(1);
  let s = `<svg class="bust" width="${w}" height="${h}" viewBox="0 0 160 200" role="img" aria-label="${c.name}">`;
  /* 背景 */
  s += `<rect width="160" height="200" fill="${c.bg}"/><rect y="118" width="160" height="82" fill="${shade(c.bg, -12)}"/>`;
  s += `<g stroke="${shade(c.bg, 40)}" stroke-width="6" opacity=".18"><path d="M-10 190 L170 30"/><path d="M-10 230 L170 70"/><path d="M-10 150 L170 -10"/></g>`;
  s += `<circle cx="80" cy="96" r="62" fill="${shade(c.bg, 18)}" opacity=".35"/>`;
  /* 躯干 */
  const torso = 'M14 202 Q18 150 80 142 Q142 150 146 202 Z';
  const outfit = c.outfit || 'coat';
  if (outfit === 'vest') {
    s += `<path d="${torso}" fill="#d9d1bf"/><path d="M14 202 Q18 150 62 144 L66 202 Z" fill="${cl}"/><path d="M146 202 Q142 150 98 144 L94 202 Z" fill="${clD}"/>`;
    s += `<path d="M62 144 L80 168 L98 144" fill="none" stroke="#bfb5a0" stroke-width="3"/>`;
  } else if (outfit === 'robe') {
    s += `<path d="${torso}" fill="${cl}"/><path d="M80 142 Q30 160 22 202 L80 202 Z" fill="${clL}"/><path d="M80 142 Q130 160 138 202 L80 202 Z" fill="${clD}"/>`;
    s += `<path d="M62 148 L80 176 L98 148 Q80 158 62 148 Z" fill="${inner}"/><rect x="14" y="178" width="132" height="13" fill="${trim}"/><rect x="14" y="184" width="132" height="2" fill="${shade(trim, -40)}"/>`;
  } else if (outfit === 'dress') {
    s += `<path d="${torso}" fill="${cl}"/><path d="M100 146 Q142 150 146 202 L100 202 Z" fill="${clD}"/>`;
    s += `<path d="M58 146 Q80 172 102 146 Q80 152 58 146 Z" fill="${light}"/><path d="M14 202 Q24 150 60 145 L54 202 Z" fill="${trim}" opacity=".85"/><path d="M146 202 Q136 150 100 145 L106 202 Z" fill="${trim}" opacity=".85"/>`;
    s += `<circle cx="80" cy="160" r="4" fill="${trim}"/>`;
  } else if (outfit === 'apron') {
    s += `<path d="${torso}" fill="${cl}"/><path d="M100 146 Q142 150 146 202 L100 202 Z" fill="${clD}"/>`;
    s += `<path d="M48 162 L112 162 L120 202 L40 202 Z" fill="#c8b89a"/><path d="M48 162 L112 162 L120 202 L40 202 Z" fill="none" stroke="#a89878" stroke-width="2"/><path d="M56 162 L64 146 M104 162 L96 146" stroke="#a89878" stroke-width="3"/>`;
  } else if (outfit === 'uniform') {
    s += `<path d="${torso}" fill="${cl}"/><path d="M100 146 Q142 150 146 202 L100 202 Z" fill="${clD}"/>`;
    s += `<path d="M64 148 L80 172 L96 148 Q80 156 64 148 Z" fill="${inner}"/><path d="M80 172 L80 202" stroke="${trim}" stroke-width="3"/>`;
    s += `<rect x="20" y="146" width="30" height="9" rx="2" fill="${trim}"/><rect x="110" y="146" width="30" height="9" rx="2" fill="${trim}"/><path d="M22 155 l0 6 M28 155 l0 6 M34 155 l0 6 M40 155 l0 6 M46 155 l0 6 M112 155 l0 6 M118 155 l0 6 M124 155 l0 6 M130 155 l0 6 M136 155 l0 6" stroke="${trim}" stroke-width="2"/>`;
    s += `<rect x="54" y="168" width="8" height="10" fill="#c0392b"/><circle cx="58" cy="184" r="5" fill="${trim}"/><circle cx="58" cy="184" r="2" fill="${shade(trim, -50)}"/>`;
    s += `<circle cx="88" cy="182" r="2.6" fill="${trim}"/><circle cx="88" cy="194" r="2.6" fill="${trim}"/>`;
  } else { // coat
    s += `<path d="${torso}" fill="${cl}"/><path d="M100 146 Q142 150 146 202 L100 202 Z" fill="${clD}"/>`;
    s += `<path d="M60 146 L80 178 L100 146 Q80 156 60 146 Z" fill="${inner}"/><path d="M60 146 L70 202 L80 178 Z" fill="${clD}"/><path d="M100 146 L90 202 L80 178 Z" fill="${shade(cl, -50)}"/>`;
    s += `<circle cx="80" cy="186" r="2.8" fill="${trim}"/><circle cx="80" cy="196" r="2.8" fill="${trim}"/>`;
  }
  if (c.strap) s += `<path d="M44 148 L118 202" stroke="#3a2412" stroke-width="8"/><rect x="74" y="166" width="10" height="8" fill="${trim}"/>`;
  /* 颈 */
  s += `<rect x="67" y="108" width="26" height="40" rx="7" fill="${dark}"/>`;
  /* 后发 */
  if (c.hairStyle === 'long') s += `<path d="M44 76 Q28 150 52 162 L108 162 Q132 150 116 76 Z" fill="${hair}"/>`;
  /* 耳 / 头 */
  s += `<ellipse cx="51" cy="90" rx="6" ry="8" fill="${skin}"/><ellipse cx="109" cy="90" rx="6" ry="8" fill="${skin}"/>`;
  s += `<ellipse cx="80" cy="86" rx="30" ry="35" fill="${skin}"/><path d="M54 100 Q80 130 106 100 Q80 118 54 100 Z" fill="${dark}" opacity=".28"/>`;
  s += `<ellipse cx="62" cy="97" rx="6" ry="3" fill="#e8807a" opacity=".22"/><ellipse cx="98" cy="97" rx="6" ry="3" fill="#e8807a" opacity=".22"/>`;
  /* 前发 */
  const hairTop = 'M50 78 Q52 46 80 46 Q108 46 110 78 Q98 62 80 66 Q62 62 50 78 Z';
  if (c.hairStyle === 'short' || c.hairStyle === 'long') s += `<path d="${hairTop}" fill="${hair}"/>`;
  if (c.hairStyle === 'bun') s += `<path d="${hairTop}" fill="${hair}"/><circle cx="80" cy="44" r="12" fill="${hair}"/>`;
  if (c.hairStyle === 'bald') s += `<path d="M50 86 Q44 76 52 66 L56 88 Z M110 86 Q116 76 108 66 L104 88 Z" fill="${hair}"/>`;
  /* 眉 / 眼 */
  s += `<path d="M59 73 q8 -4 15 0 M86 73 q8 -4 15 0" stroke="${hair}" stroke-width="3" fill="none" stroke-linecap="round"/>`;
  for (const cx of [67, 93]) {
    s += `<ellipse cx="${cx}" cy="84" rx="6" ry="5" fill="#fff"/><circle cx="${cx}" cy="84.5" r="3.4" fill="${eye}"/><circle cx="${cx}" cy="84.5" r="1.6" fill="#0e0a08"/><circle cx="${cx + 1.4}" cy="83" r="1.1" fill="#fff"/>`;
    s += `<path d="M${cx - 6} 82 Q${cx} 77 ${cx + 6} 82" stroke="${dark}" stroke-width="1.6" fill="none"/>`;
  }
  s += `<g class="lids" style="animation-delay:${delay}s"><ellipse cx="67" cy="84" rx="6.6" ry="5.6" fill="${skin}"/><ellipse cx="93" cy="84" rx="6.6" ry="5.6" fill="${skin}"/><path d="M61 85 Q67 88 73 85 M87 85 Q93 88 99 85" stroke="${dark}" stroke-width="1.6" fill="none"/></g>`;
  /* 鼻 */
  s += `<path d="M80 86 q-4 10 1 13" stroke="${dark}" stroke-width="2" fill="none" stroke-linecap="round"/>`;
  /* 须 */
  if (c.beard === 'full') s += `<path d="M52 92 Q52 132 80 134 Q108 132 108 92 Q100 114 80 116 Q60 114 52 92 Z" fill="${hair}"/>`;
  if (c.beard === 'goatee') s += `<path d="M70 112 Q80 130 90 112 Q80 118 70 112 Z" fill="${hair}"/>`;
  if (c.beard === 'stubble') s += `<path d="M54 94 Q56 124 80 126 Q104 124 106 94 Q98 112 80 114 Q62 112 54 94 Z" fill="${hair}" opacity=".28"/>`;
  /* 嘴：闭 / 开 两层 */
  let closed;
  if (c.mouth === 'smile') closed = `<path d="M70 105 Q80 113 90 105" stroke="#7a3b30" stroke-width="2.5" fill="none" stroke-linecap="round"/>`;
  else if (c.mouth === 'grin') closed = `<path d="M69 104 Q80 116 91 104 Z" fill="#fff" stroke="#7a3b30" stroke-width="2"/>`;
  else if (c.mouth === 'frown') closed = `<path d="M70 109 Q80 102 90 109" stroke="#7a3b30" stroke-width="2.5" fill="none" stroke-linecap="round"/>`;
  else closed = `<path d="M71 106 L89 106" stroke="#7a3b30" stroke-width="2.5" stroke-linecap="round"/>`;
  s += `<g class="m-closed">${closed}</g>`;
  s += `<g class="m-open"><ellipse cx="80" cy="108" rx="8" ry="6.5" fill="#4a1a1a"/><rect x="73" y="102.5" width="14" height="3.2" fill="#fff"/><ellipse cx="80" cy="112.5" rx="4.5" ry="2.2" fill="#c0504a"/></g>`;
  if (c.mustache) s += `<path d="M66 102 q14 -7 28 0 q-14 4 -28 0 Z" fill="${hair}"/>`;
  /* 帽 */
  if (c.hat === 'tricorn') s += `<path d="M50 74 Q54 42 80 42 Q106 42 110 74 Z" fill="${hc}"/><path d="M22 78 Q80 44 138 78 Q106 66 80 70 Q54 66 22 78 Z" fill="${hc}"/><path d="M52 70 Q80 61 108 70" stroke="${trim}" stroke-width="2" fill="none"/>`;
  if (c.hat === 'bandana') s += `<path d="M50 78 Q80 64 110 78 L110 64 Q80 42 50 64 Z" fill="${hc}"/><path d="M110 70 q14 6 16 20 q-10 -6 -16 -12 Z" fill="${hc}"/><path d="M56 70 Q80 60 104 70" stroke="${shade(hc, 40)}" stroke-width="1.5" fill="none" opacity=".6"/>`;
  if (c.hat === 'turban') s += `<ellipse cx="80" cy="58" rx="35" ry="21" fill="${hc}"/><path d="M48 64 Q80 52 112 64 M50 56 Q80 46 110 56" stroke="${shade(hc, -30)}" stroke-width="2.5" fill="none"/><circle cx="80" cy="54" r="4" fill="#f2c14e"/>`;
  if (c.hat === 'cap') s += `<path d="M50 76 L110 76 L108 58 Q80 48 52 58 Z" fill="${hc}"/><path d="M48 77 L112 77" stroke="${trim}" stroke-width="4"/><path d="M74 62 L86 62 M80 56 L80 68" stroke="${trim}" stroke-width="2"/>`;
  if (c.hat === 'beret') s += `<path d="M46 72 Q50 42 86 44 Q116 46 112 74 Q80 64 46 72 Z" fill="${hc}"/><circle cx="84" cy="44" r="2.5" fill="${shade(hc, 40)}"/>`;
  /* 饰 */
  if (c.acc === 'eyepatch') s += `<ellipse cx="93" cy="84" rx="8.5" ry="7" fill="#15100c"/><path d="M54 72 L100 78" stroke="#15100c" stroke-width="2.2"/>`;
  if (c.acc === 'earring') s += `<circle cx="110" cy="101" r="3.5" fill="none" stroke="#f2c14e" stroke-width="2"/>`;
  if (c.acc === 'scar') s += `<path d="M60 66 L66 90" stroke="#b66a5c" stroke-width="2.2"/><path d="M58 76 L66 74 M60 84 L68 82" stroke="#b66a5c" stroke-width="1.4"/>`;
  if (c.acc === 'glasses') s += `<circle cx="67" cy="84" r="8.5" fill="none" stroke="#c9a54a" stroke-width="2"/><circle cx="93" cy="84" r="8.5" fill="none" stroke="#c9a54a" stroke-width="2"/><path d="M75.5 84 L84.5 84 M58.5 84 L52 80 M101.5 84 L108 80" stroke="#c9a54a" stroke-width="2"/>`;
  if (c.acc === 'feather') s += `<path d="M112 52 q12 -24 24 -16 q-6 10 -22 20 Z" fill="#e9e9e9"/><path d="M114 54 q10 -14 18 -14" stroke="#bbb" stroke-width="1" fill="none"/>`;
  return s + `</svg>`;
}
