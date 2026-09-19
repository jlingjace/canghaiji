#!/usr/bin/env python3
"""把地图设计 JSON 生成 src/data.js，并按 portMap/zoneMap 迁移 src/story.js。
用法: python3 tools/gen_data.py <design.json>"""
import json, sys, re, io, os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
design = json.load(open(sys.argv[1]))

OLD_PORT_NAME = {
 'baifan':'白帆港','tiemao':'铁锚城','wujiao':'雾角','huiyan':'灰岩堡','jingge':'鲸歌湾','yinhu':'银湖港',
 'hupo':'琥珀港','cuiyu':'翠玉港','longgu':'龙骨岛','xiangliao':'香料城','chisha':'赤砂港','shanhu':'珊瑚镇',
 'zhenzhu':'珍珠湾','fengyu':'风语城','yueya':'月牙港','xingjiao':'星礁','heishi':'黑石港','luori':'落日港'}
OLD_ZONE_NAME = {'west':'西洋','north':'北海','east':'东海','south':'南洋','pearl':'珍珠海','gold':'黄金海'}

zones = design['zones']; goods = design['goods']; ports = design['ports']
pmap = {m['old']: m['new'] for m in design['portMap']}
zmap = {m['oldId']: m['newId'] for m in design['zoneMap']}
znew_name = {z['id']: z['name'] for z in zones}
pnew_name = {p['id']: p['name'] for p in ports}
victory = design['victory']['zonesRequired']
rival_home = {r['rival']: r['zone'] for r in design['rivalHomes']}

# 起始港：旧 baifan 映射到的港口
start = pmap.get('baifan') or ports[0]['id']

def js(o): return json.dumps(o, ensure_ascii=False)

out = io.StringIO()
w = out.write
w("/* ========= 静态数据：真实世界地图（经纬度真实，势力与人物为原创虚构） ========= */\n")
w("export const GOODS = [\n")
for g in goods:
    w(f"  {{ id: {js(g['id'])}, name: {js(g['name'])}, base: {g['base']} }},"
      f"{'  // ' + g['note'] if g.get('note') else ''}\n")
w("].map(g => ({ ...g }));\n")
w("export const G = Object.fromEntries(GOODS.map(g => [g.id, g]));\n\n")

w("""export const SHIP_TYPES = {
  sloop: { name: '小帆船', cargo: 60, hp: 100, cannons: 6, speed: 6, crew: 20, price: 2000 },
  schooner: { name: '纵帆船', cargo: 120, hp: 160, cannons: 12, speed: 7, crew: 40, price: 6000 },
  merchant: { name: '大商船', cargo: 260, hp: 220, cannons: 16, speed: 5, crew: 60, price: 14000 },
  galleon: { name: '盖伦帆船', cargo: 320, hp: 320, cannons: 30, speed: 5, crew: 100, price: 32000 },
  frigate: { name: '巡防舰', cargo: 140, hp: 380, cannons: 44, speed: 8, crew: 120, price: 45000 },
};
export const YARD_SHIPS = { 1: ['sloop', 'schooner'], 2: ['sloop', 'schooner', 'merchant'], 3: ['sloop', 'schooner', 'merchant', 'galleon', 'frigate'] };

""")

w("/** 海域：lonRange/latRange 用于在海图上摆放海域名 */\nexport const ZONES = [\n")
for z in zones:
    w(f"  {{ id: {js(z['id'])}, name: {js(z['name'])}, nameEn: {js(z.get('nameEn',''))}, color: {js(z['color'])}, "
      f"lonRange: {js(z['lonRange'])}, latRange: {js(z['latRange'])}, style: {js(z.get('style','iberian'))} }},\n")
w("];\n\n")

w("export const RIVALS = [\n")
for rid, cn, color in [('whale','蓝鲸商会','#4f8fd6'),('redsail','红帆同盟','#d65a5a'),('goldsand','金沙公司','#d6b04f')]:
    w(f"  {{ id: {js(rid)}, name: {js(cn)}, color: {js(color)}, home: {js(rival_home.get(rid, zones[0]['id']))} }},\n")
w("];\n")
w("""export const FACTION_COLOR = { player: '#f2c14e', whale: '#4f8fd6', redsail: '#d65a5a', goldsand: '#d6b04f', pirate: '#9a8a9a', free: '#cfdcea' };
export const FACTION_NAME = { player: '你的商会', whale: '蓝鲸商会', redsail: '红帆同盟', goldsand: '金沙公司' };

""")

w(f"export const START_PORT = {js(start)};\n")
w(f"/** 胜利条件：主导的海域数量（共 {len(zones)} 个海域） */\nexport const VICTORY_ZONES = {victory};\n\n")

w("/** 港口：lat/lon 为真实经纬度；tier 规模 1–3；yard 造船厂等级 1–3 */\nexport const PORTS = [\n")
for p in ports:
    w(f"  {{ id: {js(p['id'])}, name: {js(p['name'])}, nameEn: {js(p.get('nameEn',''))}, "
      f"lat: {p['lat']}, lon: {p['lon']}, zone: {js(p['zone'])}, tier: {p['tier']}, yard: {p['yard']}, "
      f"produce: {js(p['produce'])}, demand: {js(p['demand'])} }},"
      f"{'  // ' + p['note'] if p.get('note') else ''}\n")
w("];\n\n")
w("export const SHIP_NAMES = ['初雪', '海燕', '远星', '破浪', '银鸥', '晨曦', '北辰', '长风', '惊涛', '夜鸢', '沧澜', '青鸟', '逐日', '白鲸', '流火'];\n\n")

# 人物与台词原样保留
old = open(os.path.join(ROOT,'src','data.js')).read()
chars = old[old.index('/* ========= 人物（全部原创角色） ========= */'):]
w(chars)
open(os.path.join(ROOT,'src','data.js'),'w').write(out.getvalue())
print('data.js ports=%d zones=%d goods=%d start=%s victory=%d' % (len(ports),len(zones),len(goods),start,victory))

# ---------- 迁移 story.js ----------
sp = os.path.join(ROOT,'src','story.js')
orig = os.path.join(ROOT,'tools','story.orig.json')
head = '''/* 剧情与任务数据（原创，由多智能体设计工作流合成；港口/海域已迁移到真实世界地图）。
   字段说明见 quests.js；who 可用 'captain' 指代玩家船长，文本中 {captain} 会被替换。 */
'''
story = json.load(open(orig))

def mp(pid):
    return pmap.get(pid, pid) if pid in pmap else pid
def mz(zid):
    return zmap.get(zid, zid) if zid in zmap else zid

def fix_quest(q):
    if q.get('port'): q['port'] = mp(q['port'])
    if q.get('turnIn'): q['turnIn'] = mp(q['turnIn'])
    pr = q.get('prereq') or {}
    if pr.get('share',{}).get('zone'): pr['share']['zone'] = mz(pr['share']['zone'])
    for o in q['objectives']:
        if o.get('port'): o['port'] = mp(o['port'])
        if o.get('zone'): o['zone'] = mz(o['zone'])
    r = q.get('reward') or {}
    if r.get('shareZone'): r['shareZone'] = mz(r['shareZone'])

TEXT_MAP = {}
for oid, oname in OLD_PORT_NAME.items():
    TEXT_MAP[oname] = pnew_name.get(pmap.get(oid,''), oname)
for oid, oname in OLD_ZONE_NAME.items():
    TEXT_MAP[oname] = znew_name.get(zmap.get(oid,''), oname)

def fix_text(t):
    for k, v in sorted(TEXT_MAP.items(), key=lambda kv: -len(kv[0])):
        t = t.replace(k, v)
    return t

for q in story['main'] + story['side']:
    fix_quest(q)
    for pg in q['intro'] + q['outro']: pg['text'] = fix_text(pg['text'])
    q['title'] = fix_text(q['title'])
    for o in q['objectives']: o['label'] = fix_text(o['label'])
for pg in story['prologue']: pg['text'] = fix_text(pg['text'])
story['premise'] = fix_text(story['premise'])
for c in story.get('newChars', []): c['role'] = fix_text(c['role'])
# 终章的「主导海域数」按新海域总数调整
for q in story['main']:
    for o in q['objectives']:
        if o['kind'] == 'dominate':
            o['count'] = max(3, round(victory * 0.7))
            o['label'] = f"主导 {o['count']} 个海域"

open(sp,'w').write(head + 'export const STORY = ' + json.dumps(story, ensure_ascii=False, indent=2) + ';\n')
print('story.js migrated; sample:', story['main'][0]['objectives'])
