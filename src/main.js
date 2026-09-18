import './style.css';
import * as game from './game.js';
import { newGame, hasSave, load } from './game.js';
import { WorldMap } from './map.js';
import { initUI, render, chooseCaptain, toast, ACTIONS, TABS } from './ui.js';
import { initMenuKeys } from './fx.js';

const map = new WorldMap();
let fresh = false;
if (!(hasSave() && load(true))) { newGame(); fresh = true; }
await map.init(document.getElementById('mapwrap'));
initUI(map);
initMenuKeys(i => { game.S.tab = TABS[i][0]; render(); });
render();
if (fresh) chooseCaptain(); else toast('已载入上次存档');

// 开发调试句柄
window.aot = { game, map, ACTIONS, render };
