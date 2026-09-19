/* 港口委托板：每个港口程序化生成的短期委托（运货 / 采购 / 剿匪 / 快航），
   让 30+ 个港口每一个都有去的理由。委托按「港口 + 时段」用种子生成，只有接下的才写进存档。 */
import { PORTS, GOODS, G, ZONES } from './data.js';
import { S, port, zone, price, log, freeSpace, transferShare, checkWin } from './game.js';
import { seeded, hash, clamp, fmt } from './util.js';
import { projX, projY, greatCircleKm } from './geo.js';

export const PERIOD = 20;                       // 每 20 天刷新一批委托
export const periodOf = day => Math.floor(day / PERIOD);

const KINDS = [
  { id: 'deliver', name: '运货', w: 4 },
  { id: 'procure', name: '采购', w: 3 },
  { id: 'bounty', name: '剿匪', w: 2 },
  { id: 'express', name: '快航', w: 2 },
];
const CLIENTS = ['qian', 'cen', 'hong', 'mu'];
const CLIENT_TXT = {
  deliver: ['货主等着这批货，早到早结账。', '这趟我不亲自跑，谁的船快就交给谁。', '船期紧，别在路上耽搁。'],
  procure: ['本地缺这个缺得厉害，你带来多少我收多少。', '仓里空了，价钱好商量。', '谁先运到，谁拿这笔钱。'],
  bounty: ['那帮挂黑旗的把我的船拦了两回了。', '海面清净了，生意才做得下去。', '赏金是行会凑的，别嫌少。'],
  express: ['这封急信必须按时送到。', '人等着上船，误了时辰就白跑。', '快船的价钱，要的就是快。'],
};

function nearbyPorts(p, n = 6) {
  return PORTS.filter(x => x.id !== p.id)
    .map(x => ({ x, d: Math.hypot(projX(x.lon) - projX(p.lon), projY(x.lat) - projY(p.lat)) }))
    .sort((a, b) => a.d - b.d).slice(0, n).map(o => o.x);
}

/** 某港口在某时段的委托列表（确定性生成，不占存档） */
export function boardFor(pid, period = periodOf(S.day)) {
  const p = port(pid); if (!p) return [];
  const rng = seeded(hash(pid + ':' + period));
  const count = p.tier >= 3 ? 4 : p.tier === 2 ? 3 : 2;
  const near = nearbyPorts(p, 7);
  const out = [];
  for (let i = 0; i < count; i++) {
    const tot = KINDS.reduce((a, k) => a + k.w, 0);
    let x = rng() * tot; const kind = (KINDS.find(k => (x -= k.w) <= 0) || KINDS[0]).id;
    const id = `${pid}-${period}-${i}`;
    const client = CLIENTS[Math.floor(rng() * CLIENTS.length)];
    const flavor = CLIENT_TXT[kind][Math.floor(rng() * 3)];
    if (kind === 'deliver' || kind === 'express') {
      const dest = near[Math.floor(rng() * near.length)];
      const dist = Math.hypot(projX(dest.lon) - projX(p.lon), projY(dest.lat) - projY(p.lat));
      const baseDays = Math.max(2, Math.ceil(dist / 48));
      if (kind === 'express') {
        const due = Math.round(baseDays * (1.15 + rng() * 0.25));
        out.push({ id, kind, from: pid, to: dest.id, days: due, client, flavor,
          reward: Math.round((300 + dist * 1.6) * (1.3 + rng() * 0.5)),
          label: `在 ${due} 天内抵达 ${dest.name}` });
      } else {
        const gd = GOODS[Math.floor(rng() * GOODS.length)];
        const qty = Math.round(clamp(10 + rng() * 40, 8, 60) / 2) * 2;
        const due = Math.round(baseDays * (1.6 + rng() * 0.8));
        out.push({ id, kind, from: pid, to: dest.id, good: gd.id, qty, days: due, client, flavor,
          reward: Math.round((qty * gd.base * 0.35 + dist * 1.2) * (1 + rng() * 0.35)),
          label: `把 ${G[gd.id].name} ×${qty} 运到 ${dest.name}（${due} 天内）` });
      }
    } else if (kind === 'procure') {
      // 只收本港「紧缺」的货：本地行情 ≥1.7 倍基准价，而报酬按基准价的 1.25~1.55 倍计，
      // 所以在本港现买现交必然亏本，只有从产地运来才划算。
      const gd = G[p.demand[Math.floor(rng() * p.demand.length)]];
      const qty = Math.round(clamp(8 + rng() * 30, 6, 45));
      const due = 12 + Math.floor(rng() * 20);
      out.push({ id, kind, from: pid, to: pid, good: gd.id, qty, days: due, client, flavor,
        reward: Math.round(qty * gd.base * (1.25 + rng() * 0.30)),
        label: `为 ${p.name} 采购 ${gd.name} ×${qty}（${due} 天内）` });
    } else {
      const n = 1 + Math.floor(rng() * 2);
      const due = 20 + Math.floor(rng() * 20);
      out.push({ id, kind, from: pid, to: pid, count: n, zone: p.zone, days: due, client, flavor,
        reward: Math.round((900 + rng() * 1400) * n),
        label: `在${zone(p.zone).name}击败 ${n} 支海盗船队（${due} 天内）` });
    }
  }
  return out;
}

export function ensureContracts() { if (!S.ct) S.ct = { active: [], done: 0, failed: 0 }; return S.ct; }
export const activeContracts = () => (S.ct ? S.ct.active : []);
export const isTaken = id => activeContracts().some(c => c.id === id);

export function accept(c) {
  ensureContracts();
  if (S.ct.active.length >= 5) return '同时最多接 5 个委托。';
  if (c.kind === 'deliver' && freeSpace() < c.qty) return `货舱空间不足：这批托运货需要 ${c.qty} 格，当前空舱 ${freeSpace()} 格。`;
  const rec = { ...c, dueDay: S.day + c.days, prog: 0 };
  if (c.kind === 'deliver') {
    S.cargo[c.good] = (S.cargo[c.good] || 0) + c.qty;     // 委托方把货装上船（托运货，不能变卖）
    rec.loaded = true;
  }
  S.ct.active.push(rec);
  log(`接下委托：${c.label}，报酬 ${fmt(c.reward)} 金币。`, 'gold');
  return null;
}
/** 主动放弃委托：立刻按违约处理 */
export function abandon(id) {
  ensureContracts();
  const c = S.ct.active.find(x => x.id === id);
  if (!c) return '没有这个委托。';
  finish(c, false, true);
  return null;
}

function finish(c, ok, quit = false) {
  ensureContracts();
  S.ct.active = S.ct.active.filter(x => x.id !== c.id);
  if (ok) {
    S.ct.done++; S.gold += c.reward;
    const zid = port(c.to).zone;
    transferShare(zid, 'player', 0.6); checkWin();
    log(`完成委托「${c.label}」，获得 ${fmt(c.reward)} 金币，${zone(zid).name}份额 +0.6。`, 'gold');
  } else {
    S.ct.failed++;
    // 托运货是货主的：违约时收回实物，短少的部分照价赔偿，另付违约金
    let fine = Math.round(c.reward * 0.4);
    if (c.kind === 'deliver' && c.loaded) {
      const take = Math.min(S.cargo[c.good] || 0, c.qty);
      if (take > 0) { S.cargo[c.good] -= take; if (S.cargo[c.good] <= 0) delete S.cargo[c.good]; }
      fine += Math.round((c.qty - take) * G[c.good].base * 1.2);
    }
    S.gold -= fine;
    log(`${quit ? '放弃' : '未能按期完成'}委托「${c.label}」：赔付 ${fmt(fine)} 金币违约金。`, 'bad');
  }
  return ok;
}

/** 每次抵港 / 战斗胜利 / 过天时调用 */
export function contractEvent(type, d = {}) {
  ensureContracts();
  const done = [];
  for (const c of [...S.ct.active]) {
    if (S.day > c.dueDay) { finish(c, false); continue; }   // 过期：每天都会检查一次，不必等到靠港
    if (type === 'arrive') {
      if ((c.kind === 'deliver') && d.pid === c.to && (S.cargo[c.good] || 0) >= c.qty) {
        S.cargo[c.good] -= c.qty; if (S.cargo[c.good] <= 0) delete S.cargo[c.good];
        done.push(c);
      } else if (c.kind === 'express' && d.pid === c.to) done.push(c);
      else if (c.kind === 'procure' && d.pid === c.to && (S.cargo[c.good] || 0) >= c.qty) {
        S.cargo[c.good] -= c.qty; if (S.cargo[c.good] <= 0) delete S.cargo[c.good];
        done.push(c);
      }
    } else if (type === 'battleWin' && c.kind === 'bounty' && d.kind === 'pirate') {
      c.prog = (c.prog || 0) + 1;
      if (c.prog >= c.count) done.push(c);
    }
  }
  for (const c of done) finish(c, true);
  return done;
}

export function progressText(c) {
  if (c.kind === 'bounty') return `${c.prog || 0}/${c.count} 支`;
  if (c.kind === 'deliver' || c.kind === 'procure') return `${Math.min(S.cargo[c.good] || 0, c.qty)}/${c.qty} 件`;
  return '';
}
export const daysLeft = c => c.dueDay - S.day;
