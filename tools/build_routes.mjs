/* 把 40 个港口两两之间的真实绕行航程算出来存成 tools/routes.json，
   给 node 端的试玩脚本用（nav.js 依赖 canvas，在 node 里跑不了，所以离线预计算）。
   需要在浏览器里跑：把 dev server 打开后执行 window.__dumpRoutes()。
   这里保留的是 node 侧的读取与校验。 */
import { readFileSync } from 'node:fs';
export function loadRoutes() {
  const raw = JSON.parse(readFileSync(new URL('./routes.json', import.meta.url), 'utf8'));
  return {
    units(a, b) { return a === b ? 0 : (raw[a + '|' + b] ?? raw[b + '|' + a] ?? null); },
    pairs: Object.keys(raw).length,
  };
}
