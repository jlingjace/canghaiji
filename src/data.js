/* ========= 静态数据：真实世界地图（经纬度真实，势力与人物为原创虚构） ========= */
export const GOODS = [
  { id: "grain", name: "谷物", base: 20 },  // 波罗的海黑麦与埃及小麦，运往缺粮的岛屿、要塞与香料群岛。
  { id: "wood", name: "木材", base: 30 },  // 波兰与挪威船材、南洋硬木，输往无林的北非、波斯湾与印度东岸。
  { id: "saltfish", name: "咸鱼", base: 35 },  // 北海鲱鱼与挪威干鳕，既是远航口粮，也是南欧与种植园的日常食品。
  { id: "leather", name: "皮革", base: 45 },  // 北非熟皮、波罗的海生皮与加勒比牛皮，运往南欧制鞋与马具作坊。
  { id: "cotton", name: "棉花", base: 55 },  // 埃及、安纳托利亚与马拉巴尔原棉，供应低地与意大利的织造业。
  { id: "wine", name: "酒", base: 60 },  // 伊比利亚与地中海葡萄酒，随船远销北欧与所有海外据点。
  { id: "oliveoil", name: "橄榄油", base: 65 },  // 安达卢西亚与地中海橄榄油，装在大陶罐里随大西洋船队西运。
  { id: "cloth", name: "布匹", base: 70 },  // 英格兰呢绒、佛兰德细布与科罗曼德棉布，全球通用的交换物。
  { id: "sugar", name: "砂糖", base: 80 },  // 马德拉、圣多美与巴西的甘蔗糖，北欧市场永远吃不饱。
  { id: "iron", name: "铁器", base: 90 },  // 比斯开铁料、佛兰德五金与日本铜铁器，缺矿地区出高价收。
  { id: "tobacco", name: "烟草", base: 110 },  // 古巴与巴西烟叶，经塞维利亚与阿姆斯特丹进入欧洲市场。
  { id: "tea", name: "茶叶", base: 120 },  // 闽粤外销茶，此时在欧洲还是刚刚起步的新奇货。
  { id: "coffee", name: "咖啡", base: 130 },  // 也门摩卡豆经红海北上，是伊斯坦布尔与马赛咖啡馆的命脉。
  { id: "cocoa", name: "可可", base: 140 },  // 新西班牙与新格拉纳达的可可豆，经塞维利亚输入欧洲。
  { id: "herb", name: "药材", base: 150 },  // 阿拉伯乳香没药、波斯药材与印度草药，也是东亚高价收购的舶来药。
  { id: "glass", name: "玻璃", base: 160 },  // 威尼斯玻璃器与镜子，转销黎凡特、西非与印度各口岸。
  { id: "fur", name: "毛皮", base: 180 },  // 北欧与东欧毛皮经波罗的海南下，地中海与奥斯曼市场抢购。
  { id: "spice", name: "香料", base: 200 },  // 马拉巴尔胡椒、班达肉豆蔻与丁香，东方运往欧洲最稳的利润来源。
  { id: "silk", name: "丝绸", base: 260 },  // 华南生丝与黎凡特绸缎，单位体积价值极高，最经得起长途运输。
  { id: "porcelain", name: "瓷器", base: 300 },  // 外销瓷经广州、澳门装船，东非、奥斯曼与欧洲宫廷同样追捧。
  { id: "dye", name: "染料", base: 320 },  // 巴西苏木、墨西哥胭脂虫红与印度靛蓝，北欧染坊的命根子。
  { id: "ivory", name: "象牙", base: 400 },  // 几内亚湾与斯瓦希里海岸象牙，安特卫普与华南的雕作坊都要。
  { id: "gem", name: "珠宝", base: 600 },  // 戈尔康达钻石、波斯湾珍珠与新格拉纳达祖母绿。
  { id: "silver", name: "白银", base: 700 },  // 美洲与日本白银，一路东流，换回丝绸、瓷器与香料。
].map(g => ({ ...g }));
export const G = Object.fromEntries(GOODS.map(g => [g.id, g]));

export const SHIP_TYPES = {
  sloop: { name: '小帆船', cargo: 60, hp: 100, cannons: 6, speed: 6, crew: 20, price: 2000 },
  schooner: { name: '纵帆船', cargo: 120, hp: 160, cannons: 12, speed: 7, crew: 40, price: 6000 },
  merchant: { name: '大商船', cargo: 260, hp: 220, cannons: 16, speed: 5, crew: 60, price: 14000 },
  galleon: { name: '盖伦帆船', cargo: 320, hp: 320, cannons: 30, speed: 5, crew: 100, price: 32000 },
  frigate: { name: '巡防舰', cargo: 140, hp: 380, cannons: 44, speed: 8, crew: 120, price: 45000 },
};
export const YARD_SHIPS = { 1: ['sloop', 'schooner'], 2: ['sloop', 'schooner', 'merchant'], 3: ['sloop', 'schooner', 'merchant', 'galleon', 'frigate'] };

/** 海域：lonRange/latRange 用于在海图上摆放海域名 */
export const ZONES = [
  { id: "iberia", name: "伊比利亚海岸", nameEn: "Iberian Atlantic", color: "#e08a3c", lonRange: [-18, -5], latRange: [28, 44], style: "iberian" },
  { id: "medsea", name: "地中海", nameEn: "Mediterranean Sea", color: "#2f9fd0", lonRange: [0, 20], latRange: [33, 45], style: "mediterranean" },
  { id: "levant", name: "黎凡特海", nameEn: "Levant & Eastern Mediterranean", color: "#a06fd1", lonRange: [22, 37], latRange: [30, 42], style: "ottoman" },
  { id: "northeu", name: "北海", nameEn: "North Sea & Baltic", color: "#4f6fd0", lonRange: [-5, 26], latRange: [50, 62], style: "northern" },
  { id: "guinea", name: "几内亚湾", nameEn: "Gulf of Guinea", color: "#c4452f", lonRange: [-26, 10], latRange: [-5, 16], style: "westafrican" },
  { id: "indocean", name: "印度洋", nameEn: "Arabian Sea & Indian Coast", color: "#14a88a", lonRange: [38, 85], latRange: [-8, 26], style: "indian" },
  { id: "nanyang", name: "南洋", nameEn: "Malacca & the Spice Islands", color: "#7ec13a", lonRange: [95, 132], latRange: [-8, 16], style: "seasia" },
  { id: "eastasia", name: "东海", nameEn: "East China Sea", color: "#e35d95", lonRange: [110, 132], latRange: [20, 36], style: "eastasia" },
  { id: "caribbean", name: "加勒比海", nameEn: "Caribbean Sea", color: "#f2c94c", lonRange: [-92, -62], latRange: [8, 26], style: "colonial" },
  { id: "brazil", name: "巴西海岸", nameEn: "Brazilian Coast & South Atlantic", color: "#8d6a3f", lonRange: [-48, -30], latRange: [-25, -2], style: "brazil" },
];

export const RIVALS = [
  { id: "whale", name: "蓝鲸商会", color: "#4f8fd6", home: "northeu" },
  { id: "redsail", name: "红帆同盟", color: "#d65a5a", home: "nanyang" },
  { id: "goldsand", name: "金沙公司", color: "#d6b04f", home: "caribbean" },
];
export const FACTION_COLOR = { player: '#f2c14e', whale: '#4f8fd6', redsail: '#d65a5a', goldsand: '#d6b04f', pirate: '#9a8a9a', free: '#cfdcea' };
export const FACTION_NAME = { player: '你的商会', whale: '蓝鲸商会', redsail: '红帆同盟', goldsand: '金沙公司' };

export const START_PORT = "lisboa";
/** 胜利条件：主导的海域数量（共 10 个海域） */
export const VICTORY_ZONES = 6;

/** 港口：lat/lon 为真实经纬度；tier 规模 1–3；yard 造船厂等级 1–3 */
export const PORTS = [
  { id: "lisboa", name: "里斯本", nameEn: "Lisboa", lat: 38.71, lon: -9.14, zone: "iberia", tier: 3, yard: 3, produce: ["wine", "oliveoil", "saltfish"], demand: ["spice", "porcelain", "silk", "coffee"] },  // 特茹河口的远洋起点，印度航线的香料在此卸货，王家船厂就设在河岸。
  { id: "sevilla", name: "塞维利亚", nameEn: "Sevilla", lat: 37.39, lon: -5.99, zone: "iberia", tier: 3, yard: 2, produce: ["oliveoil", "iron"], demand: ["silver", "cocoa", "tobacco"] },  // 瓜达尔基维尔河上的内河大港，美洲船队的登记与卸银地，也是橄榄油与铁料的集散地。
  { id: "funchal", name: "丰沙尔", nameEn: "Funchal", lat: 32.65, lon: -16.91, zone: "iberia", tier: 1, yard: 1, produce: ["sugar", "wine"], demand: ["grain", "cloth", "iron"] },  // 马德拉岛上的甘蔗与葡萄园小港，南下船队的第一个补给站，粮食与铁器全靠外运。
  { id: "venezia", name: "威尼斯", nameEn: "Venezia", lat: 45.44, lon: 12.34, zone: "medsea", tier: 3, yard: 3, produce: ["glass", "cloth"], demand: ["spice", "silk", "dye"] },  // 潟湖上的老牌共和国商港，国营船厂规模惊人，玻璃与织物外销，香料丝绸靠黎凡特转口买入。
  { id: "genova", name: "热那亚", nameEn: "Genova", lat: 44.41, lon: 8.93, zone: "medsea", tier: 2, yard: 2, produce: ["wine", "oliveoil"], demand: ["fur", "gem", "saltfish"] },  // 利古里亚海的银行与船东之城，奢侈品买手多，斋期咸鱼消耗巨大。
  { id: "marseille", name: "马赛", nameEn: "Marseille", lat: 43.3, lon: 5.37, zone: "medsea", tier: 2, yard: 2, produce: ["wine", "cloth"], demand: ["coffee", "cocoa", "leather"] },  // 法国南岸的黎凡特贸易门户，普罗旺斯酒与织物出海，咖啡与皮革在此进城。
  { id: "tunis", name: "突尼斯", nameEn: "Tunis", lat: 36.8, lon: 10.18, zone: "medsea", tier: 1, yard: 1, produce: ["oliveoil", "leather"], demand: ["cloth", "iron", "wood"] },  // 北非海岸的中转小港，橄榄油与熟皮出口，木材和金属器完全依赖海运。
  { id: "istanbul", name: "伊斯坦布尔", nameEn: "Istanbul", lat: 41.01, lon: 28.98, zone: "levant", tier: 3, yard: 3, produce: ["herb", "cotton"], demand: ["grain", "coffee", "porcelain"] },  // 扼守海峡的百万人口都城，帝国船厂常年开工；城里的粮食、咖啡与瓷器永远供不应求。
  { id: "alexandria", name: "亚历山大", nameEn: "Alexandria", lat: 31.2, lon: 29.92, zone: "levant", tier: 2, yard: 2, produce: ["grain", "cotton"], demand: ["wood", "iron", "fur"] },  // 尼罗河三角洲的出海口，粮食与棉花装船北上，本地不产木材与铁，历来靠进口。
  { id: "beirut", name: "贝鲁特", nameEn: "Beirut", lat: 33.89, lon: 35.5, zone: "levant", tier: 1, yard: 1, produce: ["silk", "herb"], demand: ["cloth", "glass", "iron"] },  // 黎凡特海岸的小港，内陆商队把叙利亚生丝与药材送到码头，换回布匹、玻璃器与铁货。
  { id: "london", name: "伦敦", nameEn: "London", lat: 51.51, lon: -0.13, zone: "northeu", tier: 3, yard: 3, produce: ["cloth", "iron"], demand: ["wine", "sugar", "dye"] },  // 泰晤士河上的呢绒出口港与船坞区，南方的酒、糖和染料在此换成英格兰布匹。
  { id: "amsterdam", name: "阿姆斯特丹", nameEn: "Amsterdam", lat: 52.37, lon: 4.9, zone: "northeu", tier: 3, yard: 3, produce: ["saltfish", "cloth"], demand: ["spice", "tea", "tobacco"] },  // 运河与锯木风车堆起来的集散市场，鲱鱼与细布出海，东方与新大陆的新货在此定价。
  { id: "antwerpen", name: "安特卫普", nameEn: "Antwerpen", lat: 51.22, lon: 4.4, zone: "northeu", tier: 2, yard: 2, produce: ["cloth", "iron"], demand: ["dye", "cotton", "ivory"] },  // 斯海尔德河上的金融与手工业重镇，染坊与象牙雕作坊养活半座城。
  { id: "lubeck", name: "吕贝克", nameEn: "Lübeck", lat: 53.87, lon: 10.69, zone: "northeu", tier: 2, yard: 2, produce: ["saltfish", "leather"], demand: ["wine", "sugar", "spice"] },  // 波罗的海西口的老商盟首城，盐渍鲱鱼与皮货走量，南方的酒糖香料在此换手。
  { id: "gdansk", name: "格但斯克", nameEn: "Gdańsk", lat: 54.35, lon: 18.65, zone: "northeu", tier: 2, yard: 2, produce: ["grain", "wood", "fur"], demand: ["wine", "cloth", "sugar"] },  // 维斯瓦河出海口的粮仓与木材码头，内陆的黑麦、船材与毛皮顺流而下。
  { id: "bergen", name: "卑尔根", nameEn: "Bergen", lat: 60.39, lon: 5.32, zone: "northeu", tier: 1, yard: 1, produce: ["saltfish", "fur"], demand: ["grain", "wine", "cloth"] },  // 挪威西岸的干鳕鱼码头，北方毛皮在此上船；本地不长粮食，全年靠南方运来。
  { id: "caboverde", name: "佛得角", nameEn: "Cabo Verde", lat: 14.92, lon: -23.6, zone: "guinea", tier: 1, yard: 1, produce: ["cotton", "saltfish"], demand: ["grain", "wine", "iron"] },  // 大西洋中的火山群岛，出产土棉布与海盐咸鱼，是横渡前最后一处淡水补给点。
  { id: "elmina", name: "埃尔米纳", nameEn: "Elmina", lat: 5.08, lon: -1.35, zone: "guinea", tier: 2, yard: 1, produce: ["ivory", "spice"], demand: ["cloth", "iron", "glass"] },  // 黄金海岸的石堡商站，内陆商路带来象牙与麦拉盖塔胡椒，换走布匹、铁器与玻璃。
  { id: "saotome", name: "圣多美", nameEn: "São Tomé", lat: 0.34, lon: 6.73, zone: "guinea", tier: 1, yard: 1, produce: ["sugar", "ivory"], demand: ["cloth", "wine", "grain"] },  // 赤道上的甘蔗岛，糖厂与象牙仓一半是码头，日用品与粮食全部外购。
  { id: "mombasa", name: "蒙巴萨", nameEn: "Mombasa", lat: -4.04, lon: 39.67, zone: "indocean", tier: 1, yard: 1, produce: ["ivory", "grain"], demand: ["cloth", "porcelain", "iron"] },  // 斯瓦希里海岸的珊瑚石城，象牙与高粱出口，富户以收藏外销瓷为体面。
  { id: "mocha", name: "摩卡", nameEn: "Mocha", lat: 13.32, lon: 43.25, zone: "indocean", tier: 2, yard: 1, produce: ["coffee", "herb"], demand: ["cloth", "iron", "grain"] },  // 红海口的咖啡装船港，高地咖啡豆与乳香没药在此上驳船，粮食布匹靠海运补给。
  { id: "hormuz", name: "霍尔木兹", nameEn: "Hormuz", lat: 27.09, lon: 56.46, zone: "indocean", tier: 2, yard: 2, produce: ["gem", "leather"], demand: ["grain", "wood", "cloth"] },  // 波斯湾口的岩石岛市，珍珠与波斯皮货集散；岛上寸草不生，连饮水都要用船运。
  { id: "goa", name: "果阿", nameEn: "Goa", lat: 15.5, lon: 73.91, zone: "indocean", tier: 3, yard: 3, produce: ["spice", "herb"], demand: ["silver", "wine", "glass"] },  // 曼多维河上的印度洋总部与船厂，整套体系靠运进来的白银运转。
  { id: "calicut", name: "卡利卡特", nameEn: "Calicut", lat: 11.25, lon: 75.78, zone: "indocean", tier: 2, yard: 2, produce: ["spice", "cotton"], demand: ["silver", "iron", "wine"] },  // 马拉巴尔海岸的胡椒老港，季风一转便挤满等着装胡椒与棉纱的船。
  { id: "masulipatnam", name: "默苏利珀德姆", nameEn: "Masulipatnam", lat: 16.19, lon: 81.13, zone: "indocean", tier: 2, yard: 1, produce: ["cloth", "gem"], demand: ["silver", "spice", "wood"] },  // 科罗曼德海岸的印花棉布出口港，内陆矿区的钻石也由这里出海。
  { id: "aceh", name: "亚齐", nameEn: "Aceh", lat: 5.55, lon: 95.32, zone: "nanyang", tier: 2, yard: 1, produce: ["spice", "herb"], demand: ["cloth", "iron", "silver"] },  // 苏门答腊北端的胡椒港，扼守海峡西口，樟脑与安息香也是当地名产。
  { id: "malacca", name: "马六甲", nameEn: "Malacca", lat: 2.19, lon: 102.25, zone: "nanyang", tier: 3, yard: 2, produce: ["spice", "wood"], demand: ["silver", "cloth", "wine"] },  // 海峡咽喉上的转口大港，东西两头的船在这里换货、等季风。
  { id: "manila", name: "马尼拉", nameEn: "Manila", lat: 14.6, lon: 120.98, zone: "nanyang", tier: 2, yard: 2, produce: ["grain", "gem"], demand: ["silver", "cloth", "wine"] },  // 吕宋湾内的白银交易市，本地稻米与苏禄珍珠出港，湾边的硬木船坞能造大船。
  { id: "banda", name: "班达", nameEn: "Banda Neira", lat: -4.53, lon: 129.9, zone: "nanyang", tier: 1, yard: 1, produce: ["spice", "wood"], demand: ["cloth", "grain", "iron"] },  // 全世界肉豆蔻的唯一产地，火山小岛不产粮食，一切吃用都等船送来。
  { id: "guangzhou", name: "广州", nameEn: "Guangzhou", lat: 23.13, lon: 113.26, zone: "eastasia", tier: 3, yard: 3, produce: ["porcelain", "silk", "tea"], demand: ["spice", "ivory", "gem"] },  // 珠江口的外销总门户，瓷器丝绸茶叶在此装船；胡椒、象牙与宝石则是内地作坊抢手的进口货。
  { id: "quanzhou", name: "泉州", nameEn: "Quanzhou", lat: 24.87, lon: 118.68, zone: "eastasia", tier: 2, yard: 2, produce: ["silk", "tea"], demand: ["spice", "herb", "cotton"] },  // 闽南的老海港与造船地，生丝与茶叶下海，南洋香料与药材上岸。
  { id: "macau", name: "澳门", nameEn: "Macau", lat: 22.19, lon: 113.54, zone: "eastasia", tier: 2, yard: 1, produce: ["porcelain", "tea"], demand: ["spice", "ivory", "wine"] },  // 珠江口外的半岛转口点，往返长崎的丝银船都在这里过冬修补。
  { id: "nagasaki", name: "长崎", nameEn: "Nagasaki", lat: 32.74, lon: 129.87, zone: "eastasia", tier: 2, yard: 2, produce: ["silver", "iron"], demand: ["silk", "porcelain", "herb"] },  // 九州西岸的深水湾，银山的白银与铜铁器由此出港，换回生丝、瓷器与舶来药材。
  { id: "havana", name: "哈瓦那", nameEn: "Havana", lat: 23.13, lon: -82.38, zone: "caribbean", tier: 3, yard: 3, produce: ["tobacco", "leather"], demand: ["wine", "cloth", "oliveoil", "herb"] },  // 加勒比最好的避风湾与船厂，返航船队在此集结补给，本地出烟叶与牛皮。
  { id: "cartagena", name: "卡塔赫纳", nameEn: "Cartagena de Indias", lat: 10.42, lon: -75.55, zone: "caribbean", tier: 3, yard: 2, produce: ["gem", "cocoa"], demand: ["cloth", "wine", "iron"] },  // 大陆海岸的要塞大港，内陆矿区的祖母绿与可可豆在此装船。
  { id: "portobelo", name: "波托韦洛", nameEn: "Portobelo", lat: 9.55, lon: -79.65, zone: "caribbean", tier: 2, yard: 1, produce: ["silver", "cocoa"], demand: ["cloth", "wine", "grain"] },  // 地峡北岸的集市港，南方运来的白银在这里堆成山，平时却连口粮都要外运。
  { id: "veracruz", name: "韦拉克鲁斯", nameEn: "Veracruz", lat: 19.19, lon: -96.14, zone: "caribbean", tier: 2, yard: 2, produce: ["silver", "dye"], demand: ["wine", "oliveoil", "iron"] },  // 墨西哥湾的登陆口，高原来的银锭与胭脂虫红在此上船，酒与橄榄油则整船卸下。
  { id: "salvador", name: "萨尔瓦多", nameEn: "Salvador", lat: -12.97, lon: -38.5, zone: "brazil", tier: 2, yard: 2, produce: ["sugar", "tobacco"], demand: ["cloth", "wine", "saltfish"] },  // 全能湾畔的糖业首府，糖厂沿岸排开，干鳕鱼是庄园里最常见的口粮。
  { id: "recife", name: "累西腓", nameEn: "Recife", lat: -8.05, lon: -34.88, zone: "brazil", tier: 2, yard: 1, produce: ["sugar", "dye"], demand: ["cloth", "iron", "grain"] },  // 礁石护着的糖港，砂糖与苏木染料装船，铁器与面粉靠回程船补给。
  { id: "riodejaneiro", name: "里约热内卢", nameEn: "Rio de Janeiro", lat: -22.91, lon: -43.17, zone: "brazil", tier: 1, yard: 1, produce: ["dye", "wood"], demand: ["cloth", "iron", "wine"] },  // 瓜纳巴拉湾里的新兴小港，苏木与硬木砍下就能上船，日用百货全靠外来。
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
