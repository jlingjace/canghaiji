/* ========= 静态数据（全部原创设定） ========= */
export const GOODS = [
  ['grain', '谷物', 20], ['wood', '木材', 30], ['leather', '皮革', 45], ['cotton', '棉花', 55], ['wine', '酒', 60], ['cloth', '布匹', 70],
  ['sugar', '砂糖', 80], ['iron', '铁器', 90], ['tea', '茶叶', 120], ['coffee', '咖啡', 130], ['herb', '药材', 150], ['spice', '香料', 200],
  ['silk', '丝绸', 260], ['porcelain', '瓷器', 300], ['ivory', '象牙', 400], ['gem', '珠宝', 600],
].map(([id, name, base]) => ({ id, name, base }));
export const G = Object.fromEntries(GOODS.map(g => [g.id, g]));

export const SHIP_TYPES = {
  sloop: { name: '小帆船', cargo: 60, hp: 100, cannons: 6, speed: 6, crew: 20, price: 2000 },
  schooner: { name: '纵帆船', cargo: 120, hp: 160, cannons: 12, speed: 7, crew: 40, price: 6000 },
  merchant: { name: '大商船', cargo: 260, hp: 220, cannons: 16, speed: 5, crew: 60, price: 14000 },
  galleon: { name: '盖伦帆船', cargo: 320, hp: 320, cannons: 30, speed: 5, crew: 100, price: 32000 },
  frigate: { name: '巡防舰', cargo: 140, hp: 380, cannons: 44, speed: 8, crew: 120, price: 45000 },
};
export const YARD_SHIPS = { 1: ['sloop', 'schooner'], 2: ['sloop', 'schooner', 'merchant'], 3: ['sloop', 'schooner', 'merchant', 'galleon', 'frigate'] };

export const ZONES = [
  { id: 'west', name: '西洋', color: '#6fb1e6', label: [150, 60] },
  { id: 'north', name: '北海', color: '#9fd0f0', label: [400, 120] },
  { id: 'east', name: '东海', color: '#e69fbd', label: [700, 60] },
  { id: 'south', name: '南洋', color: '#8fd9a8', label: [150, 320] },
  { id: 'pearl', name: '珍珠海', color: '#d6c2f0', label: [430, 290] },
  { id: 'gold', name: '黄金海', color: '#f2c14e', label: [720, 310] },
];
export const RIVALS = [
  { id: 'whale', name: '蓝鲸商会', color: '#4f8fd6', home: 'north' },
  { id: 'redsail', name: '红帆同盟', color: '#d65a5a', home: 'south' },
  { id: 'goldsand', name: '金沙公司', color: '#d6b04f', home: 'gold' },
];
export const FACTION_COLOR = { player: '#f2c14e', whale: '#4f8fd6', redsail: '#d65a5a', goldsand: '#d6b04f' };
export const FACTION_NAME = { player: '你的商会', whale: '蓝鲸商会', redsail: '红帆同盟', goldsand: '金沙公司' };

/** 港口坐标使用 900×560 的逻辑地图空间 */
export const PORTS = [
  { id: 'baifan', name: '白帆港', zone: 'west', x: 120, y: 130, yard: 2, produce: ['grain', 'cloth'], demand: ['spice', 'silk', 'tea'] },
  { id: 'tiemao', name: '铁锚城', zone: 'west', x: 230, y: 200, yard: 3, produce: ['iron', 'wood'], demand: ['porcelain', 'sugar', 'ivory'] },
  { id: 'wujiao', name: '雾角', zone: 'west', x: 95, y: 255, yard: 1, produce: ['wine', 'leather'], demand: ['coffee', 'gem', 'spice'] },
  { id: 'huiyan', name: '灰岩堡', zone: 'north', x: 370, y: 70, yard: 3, produce: ['wood', 'iron'], demand: ['wine', 'silk', 'sugar'] },
  { id: 'jingge', name: '鲸歌湾', zone: 'north', x: 510, y: 55, yard: 1, produce: ['leather', 'herb'], demand: ['grain', 'tea', 'cloth'] },
  { id: 'yinhu', name: '银湖港', zone: 'north', x: 470, y: 175, yard: 2, produce: ['grain', 'iron'], demand: ['porcelain', 'spice', 'coffee'] },
  { id: 'hupo', name: '琥珀港', zone: 'east', x: 660, y: 120, yard: 2, produce: ['silk', 'tea'], demand: ['iron', 'leather', 'gem'] },
  { id: 'cuiyu', name: '翠玉港', zone: 'east', x: 800, y: 95, yard: 3, produce: ['porcelain', 'silk'], demand: ['wood', 'ivory', 'wine'] },
  { id: 'longgu', name: '龙骨岛', zone: 'east', x: 745, y: 225, yard: 1, produce: ['tea', 'herb'], demand: ['iron', 'grain', 'sugar'] },
  { id: 'xiangliao', name: '香料城', zone: 'south', x: 135, y: 420, yard: 2, produce: ['spice', 'sugar'], demand: ['cloth', 'iron', 'porcelain'] },
  { id: 'chisha', name: '赤砂港', zone: 'south', x: 255, y: 355, yard: 1, produce: ['ivory', 'spice'], demand: ['wine', 'grain', 'silk'] },
  { id: 'shanhu', name: '珊瑚镇', zone: 'south', x: 120, y: 505, yard: 1, produce: ['sugar', 'cotton'], demand: ['wood', 'iron', 'herb'] },
  { id: 'zhenzhu', name: '珍珠湾', zone: 'pearl', x: 420, y: 340, yard: 2, produce: ['gem', 'cotton'], demand: ['grain', 'wine', 'porcelain'] },
  { id: 'fengyu', name: '风语城', zone: 'pearl', x: 540, y: 420, yard: 3, produce: ['coffee', 'cloth'], demand: ['silk', 'spice', 'wood'] },
  { id: 'yueya', name: '月牙港', zone: 'pearl', x: 380, y: 470, yard: 1, produce: ['gem', 'herb'], demand: ['iron', 'cloth', 'tea'] },
  { id: 'xingjiao', name: '星礁', zone: 'gold', x: 690, y: 370, yard: 1, produce: ['coffee', 'ivory'], demand: ['iron', 'cloth', 'wine'] },
  { id: 'heishi', name: '黑石港', zone: 'gold', x: 820, y: 305, yard: 3, produce: ['iron', 'gem'], demand: ['tea', 'silk', 'sugar'] },
  { id: 'luori', name: '落日港', zone: 'gold', x: 760, y: 490, yard: 2, produce: ['cotton', 'sugar'], demand: ['porcelain', 'herb', 'spice'] },
];
/** 陆地形状（SVG path，逻辑地图空间），运行时栅格化成像素地块 */
export const LAND = [
  'M0 0 L70 0 Q80 60 60 110 Q30 170 55 230 Q70 280 25 320 L0 330 Z',
  'M290 0 L620 0 Q600 28 520 22 Q440 40 400 25 Q330 45 290 0 Z',
  'M900 0 L900 560 L860 560 Q880 480 865 400 Q840 340 870 270 Q890 200 850 150 Q840 90 870 30 Z',
  'M0 560 L900 560 L900 548 Q700 530 560 545 Q400 555 260 535 Q120 545 0 535 Z',
  'M300 230 Q330 205 360 225 Q380 255 345 270 Q305 272 300 230 Z',
  'M600 240 Q630 225 655 250 Q660 285 625 290 Q595 275 600 240 Z',
  'M200 290 Q225 275 245 292 Q250 315 220 320 Q195 312 200 290 Z',
  'M560 330 Q580 318 600 335 Q605 358 580 362 Q555 352 560 330 Z',
  'M700 150 Q725 140 740 158 Q745 180 720 185 Q698 175 700 150 Z',
];
export const SHIP_NAMES = ['初雪', '海燕', '远星', '破浪', '银鸥', '晨曦', '北辰', '长风', '惊涛', '夜鸢', '沧澜', '青鸟', '逐日', '白鲸', '流火'];

/* ========= 人物（全部原创角色） ========= */
export const CHARS = {
  lin: { name: '林远舟', title: '商会少东', skin: '#f1c9a5', hair: '#2a1a12', hairStyle: 'short', clothes: '#2a8a8a', bg: '#1f4d6a', mouth: 'smile', outfit: 'coat', inner: '#f3ead6', trim: '#d9b56a', eyes: '#3a2416', bonus: '贸易专精：所有港口买入价 −5%', intro: '从父亲手里接过账本和一艘旧船。他相信每一条航线都是一门生意。' },
  shen: { name: '沈鹭', title: '领航员', skin: '#e9bd98', hair: '#3b2418', hairStyle: 'bun', hat: 'cap', hatColor: '#22375a', clothes: '#26426b', bg: '#3d2f5a', mouth: 'neutral', acc: 'earring', outfit: 'uniform', inner: '#e8eef7', trim: '#f2c14e', eyes: '#2f5f4f', bonus: '航海专精：船队航速 +1', intro: '能凭星辰与洋流辨向的天才领航员，想证明自己也能统领一支船队。' },
  tie: { name: '哈迪·铁山', title: '前私掠船长', skin: '#b97a52', hair: '#1c1410', hairStyle: 'short', hat: 'tricorn', hatColor: '#1b1b22', clothes: '#8a2a2a', bg: '#4a2a1e', beard: 'full', mouth: 'grin', acc: 'scar', outfit: 'coat', inner: '#d9d1bf', trim: '#f2c14e', strap: true, eyes: '#1c1410', bonus: '战斗专精：炮击伤害 +20%', intro: '厌倦了替别人打仗的老海狼，这次决定为自己的旗帜而战。' },
  ahai: { name: '阿海', title: '大副', skin: '#c98c62', hair: '#3a2a1c', hairStyle: 'short', hat: 'bandana', hatColor: '#c0392b', clothes: '#4a5a6a', bg: '#1a3a4a', beard: 'stubble', mouth: 'neutral', outfit: 'vest', eyes: '#2a1a12' },
  qian: { name: '老钱', title: '货栈掌柜', skin: '#f0cfa8', hair: '#666666', hairStyle: 'bald', clothes: '#3f6b3a', bg: '#3a4a2a', mustache: true, mouth: 'smile', acc: 'glasses', outfit: 'robe', inner: '#efe6d2', trim: '#8a6a3a', eyes: '#3a2416' },
  mu: { name: '木叔', title: '船匠', skin: '#d9a878', hair: '#8a8a8a', hairStyle: 'bald', clothes: '#6b4a2a', bg: '#4a3a2a', beard: 'full', mouth: 'neutral', outfit: 'apron', eyes: '#2a1a12' },
  hong: { name: '红姨', title: '酒馆老板娘', skin: '#f3d1b0', hair: '#8a2f2a', hairStyle: 'bun', clothes: '#6a2a5a', bg: '#4a1a3a', mouth: 'smile', acc: 'earring', outfit: 'dress', trim: '#d9b56a', eyes: '#4a2a1a' },
  cen: { name: '岑港务长', title: '港务长', skin: '#e8c39e', hair: '#2a2a2a', hairStyle: 'short', hat: 'cap', hatColor: '#1a2a4a', clothes: '#1f3a6a', bg: '#2a3a5a', mustache: true, mouth: 'neutral', outfit: 'uniform', inner: '#e8eef7', trim: '#c9a54a', eyes: '#2a1a12' },
  barro: { name: '独眼巴罗', title: '海盗头目', skin: '#b4805a', hair: '#1a1a1a', hairStyle: 'long', hat: 'bandana', hatColor: '#1a1a1a', clothes: '#3a3a3a', bg: '#2a1a1a', beard: 'goatee', mouth: 'grin', acc: 'eyepatch', outfit: 'vest', strap: true, trim: '#8a6a3a', eyes: '#1c1410' },
  alice: { name: '艾丽丝·蓝', title: '蓝鲸商会代表', skin: '#f6dcc2', hair: '#d9b56a', hairStyle: 'long', hat: 'beret', hatColor: '#2a5aa8', clothes: '#4f8fd6', bg: '#1a3a6a', mouth: 'neutral', outfit: 'coat', inner: '#ffffff', trim: '#e8eef7', eyes: '#3a6fb0' },
  hector: { name: '赫克托', title: '红帆同盟船长', skin: '#d9a878', hair: '#1c1410', hairStyle: 'short', hat: 'tricorn', hatColor: '#7a1a1a', trim: '#f2c14e', clothes: '#d65a5a', bg: '#5a1a1a', mustache: true, mouth: 'frown', acc: 'feather', outfit: 'uniform', inner: '#f3ead6', eyes: '#2a1a12' },
  salim: { name: '萨利姆', title: '金沙公司使节', skin: '#a86a48', hair: '#1a1410', hairStyle: 'short', hat: 'turban', hatColor: '#d6b04f', clothes: '#8a6a2a', bg: '#5a4a1a', beard: 'full', mouth: 'smile', acc: 'earring', outfit: 'robe', inner: '#f3ead6', trim: '#d6b04f', eyes: '#2a1a12' },
};
export const CAPTAIN_KEYS = ['lin', 'shen', 'tie'];
export const RIVAL_REP = { whale: 'alice', redsail: 'hector', goldsand: 'salim' };
export const LINES = {
  market: ['{port}的{prod}便宜得很，装满船再走吧。', '听说{dem}在这儿能卖出好价钱，你带了吗？', '行情天天变，做生意讲的就是个快。', '大船队一进港，价格就得抖三抖。', '别一次买太多，价钱会被你自己抬上去的。'],
  yard: ['船体我给你敲得比新的还结实。', '要出远洋，炮位可不能空着。', '再大的船，也得有人手才能开出港。', '龙骨、桅杆、帆——哪样都得花钱。'],
  tavern: ['喝一杯？水手们的嘴里都是情报。', '要招人的话，港口里闲着的汉子多得是。', '别在海上省口粮，饿肚子的船员会跳船的。', '昨晚有几个{rival}的水手在这儿吹牛。'],
  invest: ['{zone}的份额，是靠银子和船炮说话的。', '投在{port}的每一枚金币，港口都会记得。', '主导了海域，港口的门就会朝你敞开。', '{rival}最近在这片海域动作不小。'],
};
