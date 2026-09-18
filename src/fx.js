/* 界面特效：打字机对话、光标式菜单、飘字、数字滚动、黑场闪切 */
import { audio } from './audio.js';

/* ---------- 打字机 ---------- */
let tw = null;
export function runTypewriter(root) {
  cancelTypewriter();
  const els = [...root.querySelectorAll('[data-tw]')];
  if (!els.length) { root.classList.add('tw-done'); return; }
  const full = els.map(e => e.textContent);
  els.forEach(e => { e.textContent = ''; });
  els[0].classList.add('typing');
  tw = { root, els, full, i: 0, j: 0, timer: null, bust: root.querySelector('.bust') };
  const step = () => {
    if (!tw) return;
    const e = tw.els[tw.i], f = tw.full[tw.i];
    tw.j++; e.textContent = f.slice(0, tw.j);
    if (tw.bust && tw.j % 3 === 0) tw.bust.classList.toggle('talk');
    if (tw.j % 2 === 0) audio.sfx('type');
    let delay = 26;
    if (/[，。！？；：…—]/.test(f[tw.j - 1])) delay = 150;
    if (tw.j >= f.length) {
      e.classList.remove('typing'); tw.i++; tw.j = 0;
      if (tw.i >= tw.els.length) { finishTypewriter(); return; }
      tw.els[tw.i].classList.add('typing'); delay = 220;
    }
    tw.timer = setTimeout(step, delay);
  };
  tw.timer = setTimeout(step, 140);
  root.addEventListener('click', onRootClick);
}
function onRootClick() { finishTypewriter(); }
export function finishTypewriter() {
  if (!tw) return;
  clearTimeout(tw.timer);
  tw.els.forEach((e, k) => { e.textContent = tw.full[k]; e.classList.remove('typing'); });
  if (tw.bust) tw.bust.classList.remove('talk');
  tw.els.at(-1).insertAdjacentHTML('beforeend', ' <span class="tw-more">▼</span>');
  tw.root.classList.add('tw-done');
  tw.root.removeEventListener('click', onRootClick);
  tw = null;
}
function cancelTypewriter() { if (tw) { clearTimeout(tw.timer); tw.root.removeEventListener('click', onRootClick); tw = null; } }

/* ---------- 光标式菜单 ---------- */
const focusables = root => [...root.querySelectorAll('.btn:not(:disabled),.ccard')];
function setCur(items, el) { items.forEach(x => x.classList.remove('cur')); if (el) { el.classList.add('cur'); el.scrollIntoView({ block: 'nearest' }); } }
export function setMenuCursor(root) {
  const items = focusables(root);
  setCur(items, root.querySelector('.btn.primary:not(:disabled)') || items[0]);
}
export function initMenuKeys(onTab) {
  document.addEventListener('keydown', e => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const modal = document.querySelector('.modal');
    if (!modal) { if (/^[1-4]$/.test(e.key)) onTab(+e.key - 1); return; }
    const items = focusables(modal); if (!items.length) return;
    let i = items.findIndex(x => x.classList.contains('cur'));
    const nav = d => { i = (i + d + items.length) % items.length; setCur(items, items[i]); e.preventDefault(); };
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown' || (e.key === 'Tab' && !e.shiftKey)) nav(1);
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp' || e.key === 'Tab') nav(-1);
    else if (e.key === 'Enter' || e.key === ' ' || e.keyCode === 13 || e.code === 'Enter') {
      e.preventDefault();
      if (!modal.classList.contains('tw-done')) { finishTypewriter(); return; }
      (items[i] || items[0]).click();
    } else if (e.key === 'Escape') {
      const c = modal.querySelector('[data-a="closeModal"],[data-a="avoidRival"]'); if (c) c.click();
    }
  });
  document.addEventListener('mouseover', e => {
    const it = e.target.closest('.modal .btn,.modal .ccard'); if (!it || it.disabled) return;
    setCur(focusables(it.closest('.modal')), it);
  });
}

/* ---------- 飘字 / 数字滚动 / 黑场 ---------- */
export function floatText(anchor, text, cls = '') {
  const r = anchor.getBoundingClientRect();
  const el = document.createElement('div'); el.className = 'float ' + cls; el.textContent = text;
  el.style.left = r.left + r.width / 2 + 'px'; el.style.top = r.top + 'px';
  document.body.appendChild(el); setTimeout(() => el.remove(), 1100);
}
export function tweenNumber(el, from, to, ms = 520) {
  const t0 = performance.now();
  const f = now => {
    const p = Math.min(1, (now - t0) / ms); const v = Math.round(from + (to - from) * (1 - Math.pow(1 - p, 3)));
    if (el.isConnected) el.textContent = v.toLocaleString('zh-CN');
    if (p < 1 && el.isConnected) requestAnimationFrame(f);
  };
  requestAnimationFrame(f);
}
export function flash() {
  const f = document.getElementById('fade'); if (!f) return;
  f.classList.add('on'); setTimeout(() => f.classList.remove('on'), 260);
}
