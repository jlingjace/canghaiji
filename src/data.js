/* ========= 静态数据：真实世界地图（经纬度真实，势力与人物为原创虚构） ========= */
export const GOODS = [
  { id: "grain", name: "谷物", base: 20 },  // 波罗的海黑麦与埃及小麦，运往缺粮的岛屿、要塞与香料群岛。
  { id: "wood", name: "木材", base: 30 },  // 维斯瓦河船材与南洋硬木，输往无林的北非、波斯湾与印度东岸。
  { id: "saltfish", name: "咸鱼", base: 35 },  // 北海鲱鱼与挪威干鳕，既是远航口粮，也是热带种植区最常见的蛋白来源。
  { id: "leather", name: "皮革", base: 45 },  // 波罗的海生皮、波斯熟皮与加勒比牛皮，运往南欧鞍具作坊与东亚的甲胄工坊。
  { id: "cotton", name: "棉花", base: 55 },  // 埃及、安纳托利亚与马拉巴尔原棉，供应地中海与华南的织造业。
  { id: "wine", name: "酒", base: 60 },  // 伊比利亚与地中海葡萄酒，随船远销北欧与所有海外据点。
  { id: "oliveoil", name: "橄榄油", base: 65 },  // 安达卢西亚与利古里亚榨油，装在大陶罐里随大西洋船队西运。
  { id: "cloth", name: "布匹", base: 70 },  // 英格兰呢绒、佛兰德细布与科罗曼德印花棉布，全球通用的交换物。
  { id: "sugar", name: "砂糖", base: 80 },  // 马德拉、圣多美、巴西与闽南的蔗糖，北欧与日本市场永远吃不饱。
  { id: "iron", name: "铁器", base: 90 },  // 比斯开铁料、英格兰五金与日本铜铁器，缺矿的热带口岸出高价收。
  { id: "tobacco", name: "烟草", base: 110 },  // 古巴与巴伊亚烟叶，经塞维利亚与马赛进入欧洲市场。
  { id: "tea", name: "茶叶", base: 120 },  // 闽粤外销茶，此时在欧洲还是零星带回的新奇货，只有里斯本与阿姆斯特丹肯出价。
  { id: "coffee", name: "咖啡", base: 130 },  // 也门高地豆经摩卡装船，北上伊斯坦布尔，少量在加的斯转口再销北非与地中海。
  { id: "cocoa", name: "可可", base: 140 },  // 新格拉纳达与地峡的可可豆，此时唯一成规模的买家在塞维利亚。
  { id: "herb", name: "药材", base: 150 },  // 阿拉伯乳香没药、波斯药材与南洋香药，东亚与美洲的药铺都高价收购。
  { id: "glass", name: "玻璃", base: 160 },  // 穆拉诺的镜、器与料珠，转销黎凡特、西非与香料群岛，是岛屿贸易最受欢迎的欧洲工艺品。
  { id: "fur", name: "毛皮", base: 170 },  // 内陆河网的貂狐皮经波罗的海与卑尔根装船，地中海与伊比利亚的上层抢购。
  { id: "spice", name: "香料", base: 200 },  // 马拉巴尔胡椒、特尔纳特丁香与班达肉豆蔻，东方运往欧洲最稳的利润来源。
  { id: "dye", name: "染料", base: 230 },  // 巴西苏木与墨西哥胭脂虫红，北欧染坊的命根子，只从美洲出海。
  { id: "silk", name: "丝绸", base: 260 },  // 华南生丝与叙利亚绸缎，单位体积价值极高，最经得起长途运输。
  { id: "porcelain", name: "瓷器", base: 300 },  // 外销瓷经广州、澳门、月港装船，东非富户、奥斯曼宫廷与欧洲同样追捧。
  { id: "ivory", name: "象牙", base: 400 },  // 几内亚湾与斯瓦希里海岸象牙，热那亚的雕作坊与华南的牙雕行都要。
  { id: "silver", name: "白银", base: 480 },  // 美洲与日本两大银源，一路东流，在印度与华南换回棉布、丝绸与瓷器。
  { id: "gem", name: "珠宝", base: 600 },  // 戈尔康达钻石、波斯湾珍珠与新格拉纳达祖母绿，体积小、价值全表最高。
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
  { id: "medsea", name: "地中海", nameEn: "Mediterranean Sea", color: "#2f9fd0", lonRange: [0, 20], latRange: [33, 46], style: "mediterranean" },
  { id: "levant", name: "黎凡特海", nameEn: "Levant & Eastern Mediterranean", color: "#a06fd1", lonRange: [22, 37], latRange: [29, 42], style: "ottoman" },
  { id: "northeu", name: "北海", nameEn: "North Sea & Baltic", color: "#4f6fd0", lonRange: [-5, 22], latRange: [50, 62], style: "northern" },
  { id: "guinea", name: "几内亚湾", nameEn: "Gulf of Guinea", color: "#c4452f", lonRange: [-26, 10], latRange: [-2, 16], style: "westafrican" },
  { id: "indocean", name: "印度洋", nameEn: "Arabian Sea & Indian Coast", color: "#14a88a", lonRange: [36, 84], latRange: [-8, 30], style: "indian" },
  { id: "nanyang", name: "南洋", nameEn: "Malacca & the Spice Islands", color: "#7ec13a", lonRange: [93, 132], latRange: [-8, 16], style: "seasia" },
  { id: "eastasia", name: "东海", nameEn: "East China Sea", color: "#e35d95", lonRange: [110, 132], latRange: [20, 35], style: "eastasia" },
  { id: "caribbean", name: "加勒比海", nameEn: "Caribbean Sea", color: "#f2c94c", lonRange: [-98, -60], latRange: [7, 27], style: "colonial" },
  { id: "brazil", name: "巴西海岸", nameEn: "Brazilian Coast & South Atlantic", color: "#8d6a3f", lonRange: [-46, -32], latRange: [-25, -6], style: "brazil" },
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
  { id: "lisboa", name: "里斯本", nameEn: "Lisboa", lat: 38.71, lon: -9.14, zone: "iberia", tier: 3, yard: 3, produce: ["wine", "oliveoil", "saltfish"], demand: ["spice", "porcelain", "tea"] },  // 特茹河口的远洋起点，绕好望角回来的香料与瓷器在此卸货再分销全欧，王家船厂就设在河岸。
  { id: "sevilla", name: "塞维利亚", nameEn: "Sevilla", lat: 37.39, lon: -5.99, zone: "iberia", tier: 3, yard: 2, produce: ["oliveoil", "iron"], demand: ["silver", "cocoa", "tobacco"] },  // 瓜达尔基维尔河上的内河大港，美洲船队的登记与卸银地，也是橄榄油与铁料的集散地。
  { id: "cadiz", name: "加的斯", nameEn: "Cádiz", lat: 36.53, lon: -6.29, zone: "iberia", tier: 2, yard: 2, produce: ["wine", "saltfish"], demand: ["coffee", "cloth", "fur"] },  // 大西洋口外的编队锚地，船队出航前在此装酒与咸鱼；转口往北非与地中海的咖啡、毛皮也在这里过秤。
  { id: "funchal", name: "丰沙尔", nameEn: "Funchal", lat: 32.65, lon: -16.91, zone: "iberia", tier: 1, yard: 1, produce: ["sugar", "wine"], demand: ["grain", "cloth", "iron"] },  // 马德拉岛上的甘蔗与葡萄园小港，南下船队的第一个补给站，粮食、布匹与铁器全靠外运。
  { id: "venezia", name: "威尼斯", nameEn: "Venezia", lat: 45.44, lon: 12.34, zone: "medsea", tier: 3, yard: 3, produce: ["glass", "cloth"], demand: ["spice", "silk", "gem"] },  // 潟湖上的老牌共和国商港，国营船厂规模惊人；玻璃与织物外销，香料丝绸宝石靠黎凡特与印度洋转口买入。
  { id: "genova", name: "热那亚", nameEn: "Genova", lat: 44.41, lon: 8.93, zone: "medsea", tier: 2, yard: 2, produce: ["wine", "oliveoil"], demand: ["fur", "ivory", "gem"] },  // 利古里亚海的银行与船东之城，奢侈品买手多，象牙雕作与宝石琢磨养活了半条街。
  { id: "marseille", name: "马赛", nameEn: "Marseille", lat: 43.3, lon: 5.37, zone: "medsea", tier: 2, yard: 2, produce: ["wine", "cloth"], demand: ["leather", "cotton", "tobacco"] },  // 法国南岸的黎凡特贸易门户，普罗旺斯酒与织物出海，原棉与皮革在此进城供内陆作坊。
  { id: "istanbul", name: "伊斯坦布尔", nameEn: "Istanbul", lat: 41.01, lon: 28.98, zone: "levant", tier: 3, yard: 3, produce: ["herb", "cotton"], demand: ["grain", "coffee", "porcelain"] },  // 扼守海峡的百万人口都城，帝国船厂常年开工；城里的粮食与咖啡永远供不应求，外销瓷是上层的身份象征。
  { id: "alexandria", name: "亚历山大", nameEn: "Alexandria", lat: 31.2, lon: 29.92, zone: "levant", tier: 2, yard: 2, produce: ["grain", "cotton"], demand: ["wood", "iron", "glass"] },  // 尼罗河三角洲的出海口，粮食与棉花装船北上；埃及无木无铁，这两样历来靠海运。
  { id: "beirut", name: "贝鲁特", nameEn: "Beirut", lat: 33.89, lon: 35.5, zone: "levant", tier: 1, yard: 1, produce: ["silk", "herb"], demand: ["cloth", "glass", "iron"] },  // 黎凡特海岸的小港，内陆商队把叙利亚生丝与药材送到码头，换回布匹、玻璃器与铁货。
  { id: "london", name: "伦敦", nameEn: "London", lat: 51.51, lon: -0.13, zone: "northeu", tier: 3, yard: 3, produce: ["cloth", "iron"], demand: ["wine", "sugar", "silk"] },  // 泰晤士河上的呢绒出口港与船坞区，南方的酒与砂糖、东方的绸缎在此换成英格兰布匹与五金。
  { id: "amsterdam", name: "阿姆斯特丹", nameEn: "Amsterdam", lat: 52.37, lon: 4.9, zone: "northeu", tier: 3, yard: 3, produce: ["saltfish", "cloth"], demand: ["spice", "tea", "dye"] },  // 运河与锯木风车堆起来的集散市场，鲱鱼与细布出海；东方与新大陆的新货在这里第一次被定价。
  { id: "lubeck", name: "吕贝克", nameEn: "Lübeck", lat: 53.87, lon: 10.69, zone: "northeu", tier: 2, yard: 2, produce: ["saltfish", "leather"], demand: ["wine", "sugar", "spice"] },  // 波罗的海西口的老商盟首城，盐渍鲱鱼与皮货走量，南方来的酒、糖、香料在此换手再进内陆。
  { id: "gdansk", name: "格但斯克", nameEn: "Gdańsk", lat: 54.35, lon: 18.65, zone: "northeu", tier: 2, yard: 2, produce: ["grain", "wood", "fur"], demand: ["wine", "cloth", "dye"] },  // 维斯瓦河出海口的粮仓与木材码头，内陆的黑麦、船材与毛皮顺流而下，本地染坊等着美洲来的染料。
  { id: "bergen", name: "卑尔根", nameEn: "Bergen", lat: 60.39, lon: 5.32, zone: "northeu", tier: 1, yard: 1, produce: ["saltfish", "fur"], demand: ["grain", "wine", "cloth"] },  // 挪威西岸的干鳕鱼码头，北方毛皮在此上船；本地不长粮食，全年靠南方运来。
  { id: "caboverde", name: "佛得角", nameEn: "Cabo Verde", lat: 14.92, lon: -23.6, zone: "guinea", tier: 1, yard: 1, produce: ["cotton", "saltfish"], demand: ["grain", "wine", "iron"] },  // 大西洋中的火山群岛，出产土棉布与海盐咸鱼，是横渡南大西洋或南下几内亚前最后一处淡水补给点。
  { id: "elmina", name: "埃尔米纳", nameEn: "Elmina", lat: 5.08, lon: -1.35, zone: "guinea", tier: 2, yard: 1, produce: ["ivory", "cotton"], demand: ["cloth", "iron", "glass"] },  // 黄金海岸的石堡商站，内陆商路带来象牙与土棉布，用金砂结清布匹、铁器与玻璃珠的账。
  { id: "saotome", name: "圣多美", nameEn: "São Tomé", lat: 0.34, lon: 6.73, zone: "guinea", tier: 1, yard: 1, produce: ["sugar", "ivory"], demand: ["cloth", "wine", "grain"] },  // 赤道上的甘蔗岛，糖厂与象牙仓一半是码头；日用品与粮食全部外购，是绕好望角前最后的可靠取水点。
  { id: "mombasa", name: "蒙巴萨", nameEn: "Mombasa", lat: -4.04, lon: 39.67, zone: "indocean", tier: 1, yard: 1, produce: ["ivory", "grain"], demand: ["cloth", "porcelain", "iron"] },  // 斯瓦希里海岸的珊瑚石城，象牙与高粱出口；富户以墙上嵌着外销瓷为体面，也是过好望角后等季风的中继站。
  { id: "mocha", name: "摩卡", nameEn: "Mocha", lat: 13.32, lon: 43.25, zone: "indocean", tier: 2, yard: 1, produce: ["coffee", "herb"], demand: ["cloth", "iron", "grain"] },  // 红海口的咖啡装船港，高地咖啡豆与乳香没药在此上驳船北上；粮食与布匹全靠海运补给。
  { id: "hormuz", name: "霍尔木兹", nameEn: "Hormuz", lat: 27.09, lon: 56.46, zone: "indocean", tier: 2, yard: 2, produce: ["gem", "leather"], demand: ["grain", "wood", "cloth"] },  // 波斯湾口的岩石岛市，海湾珍珠与波斯皮货的集散关卡；岛上寸草不生，连饮水都要用船运。
  { id: "goa", name: "果阿", nameEn: "Goa", lat: 15.5, lon: 73.91, zone: "indocean", tier: 3, yard: 3, produce: ["spice", "herb"], demand: ["silver", "wine", "glass"] },  // 曼多维河上的印度洋总部与柚木船厂，能修造最大级远洋船；整套体系靠运进来的白银运转。
  { id: "calicut", name: "卡利卡特", nameEn: "Calicut", lat: 11.25, lon: 75.78, zone: "indocean", tier: 2, yard: 2, produce: ["spice", "cotton"], demand: ["silver", "iron", "wine"] },  // 马拉巴尔海岸的胡椒老集市港，季风一转便挤满等着装胡椒与棉纱的船，交易以白银现付为惯例。
  { id: "masulipatnam", name: "默苏利珀德姆", nameEn: "Masulipatnam", lat: 16.19, lon: 81.13, zone: "indocean", tier: 2, yard: 1, produce: ["cloth", "gem"], demand: ["silver", "wine", "wood"] },  // 科罗曼德海岸的印花棉布出口港，内陆矿区的钻石也由这里出海，棉布是换南洋香料的硬通货。
  { id: "aceh", name: "亚齐", nameEn: "Aceh", lat: 5.55, lon: 95.32, zone: "nanyang", tier: 2, yard: 1, produce: ["spice", "herb"], demand: ["cloth", "iron", "silver"] },  // 苏门答腊北端的胡椒港，扼守海峡西口，樟脑与安息香也是当地名产。
  { id: "malacca", name: "马六甲", nameEn: "Malacca", lat: 2.19, lon: 102.25, zone: "nanyang", tier: 3, yard: 3, produce: ["spice", "wood"], demand: ["silver", "cloth", "wine"] },  // 海峡咽喉上的转口大港，东西两头的船在这里换货、等季风；河口的硬木船坞是南洋唯一能造大船的地方。
  { id: "manila", name: "马尼拉", nameEn: "Manila", lat: 14.6, lon: 120.98, zone: "nanyang", tier: 2, yard: 2, produce: ["silk", "porcelain", "grain"], demand: ["silver", "cloth", "wine"] },  // 吕宋湾内的白银交易市：华南帆船把生丝与瓷器送到这里囤着，等横渡太平洋而来的白银；本地稻米也能出港。
  { id: "ternate", name: "特尔纳特", nameEn: "Ternate", lat: 0.79, lon: 127.38, zone: "nanyang", tier: 1, yard: 1, produce: ["spice", "herb"], demand: ["grain", "cloth", "glass"] },  // 火山锥下的丁香小岛，除了香料与香药几乎什么都不产，粮食全靠外运，玻璃料珠是通行的支付物。
  { id: "banda", name: "班达", nameEn: "Banda Neira", lat: -4.53, lon: 129.9, zone: "nanyang", tier: 1, yard: 1, produce: ["spice", "wood"], demand: ["cloth", "grain", "glass"] },  // 全世界肉豆蔻的唯一产地，火山小岛不产粮食，一切吃用都等船送来；全图最远、单价最高的采购点。
  { id: "guangzhou", name: "广州", nameEn: "Guangzhou", lat: 23.13, lon: 113.26, zone: "eastasia", tier: 3, yard: 3, produce: ["porcelain", "silk", "tea"], demand: ["silver", "ivory", "gem"] },  // 珠江口的外销总门户，瓷器丝绸茶叶在此装船；白银、象牙与宝石则是内地作坊与市舶抢手的进口货。
  { id: "macau", name: "澳门", nameEn: "Macau", lat: 22.19, lon: 113.54, zone: "eastasia", tier: 2, yard: 1, produce: ["porcelain", "tea"], demand: ["spice", "wood", "herb"] },  // 珠江口外的半岛转口点，往返长崎的丝银船在这里过冬修补，修船用的硬木与南洋香药全靠运进来。
  { id: "yuegang", name: "月港", nameEn: "Yuegang", lat: 24.45, lon: 117.95, zone: "eastasia", tier: 2, yard: 2, produce: ["porcelain", "tea", "sugar"], demand: ["cotton", "herb", "spice"] },  // 漳州海澄的私商出海口，通往吕宋与南洋的帆船多从此起航；闽南蔗糖与外销瓷下海，南洋香料与药材上岸。
  { id: "nagasaki", name: "长崎", nameEn: "Nagasaki", lat: 32.74, lon: 129.87, zone: "eastasia", tier: 2, yard: 2, produce: ["silver", "iron"], demand: ["sugar", "herb", "leather"] },  // 九州西岸的深水湾，银山的白银与铜铁器由此出港；砂糖、舶来药材与做甲胄的兽皮则整船卸下。
  { id: "havana", name: "哈瓦那", nameEn: "Havana", lat: 23.13, lon: -82.38, zone: "caribbean", tier: 3, yard: 3, produce: ["tobacco", "leather"], demand: ["wine", "cloth", "oliveoil"] },  // 加勒比最好的避风湾与皇家船厂，返航船队在此集结补给；本地出烟叶与牛皮，酒油布则整船卸下。
  { id: "veracruz", name: "韦拉克鲁斯", nameEn: "Veracruz", lat: 19.19, lon: -96.14, zone: "caribbean", tier: 2, yard: 2, produce: ["silver", "dye"], demand: ["wine", "oliveoil", "herb"] },  // 墨西哥湾的登陆口，高原来的银锭与胭脂虫红在此上船，酒、橄榄油与舶来药材则整船卸下转内陆。
  { id: "cartagena", name: "卡塔赫纳", nameEn: "Cartagena de Indias", lat: 10.42, lon: -75.55, zone: "caribbean", tier: 3, yard: 2, produce: ["gem", "cocoa"], demand: ["cloth", "iron", "herb"] },  // 大陆海岸的要塞大港，内陆矿区的祖母绿与可可豆在此装船；驻军与高城墙让欧洲日用品和药材在这里格外贵。
  { id: "portobelo", name: "波托韦洛", nameEn: "Portobelo", lat: 9.55, lon: -79.65, zone: "caribbean", tier: 2, yard: 1, produce: ["silver", "cocoa"], demand: ["cloth", "wine", "grain"] },  // 地峡北岸的集市港，南方运来的白银在这里堆成山，平时却连口粮都要靠外运。
  { id: "salvador", name: "萨尔瓦多", nameEn: "Salvador", lat: -12.97, lon: -38.5, zone: "brazil", tier: 2, yard: 2, produce: ["sugar", "tobacco"], demand: ["cloth", "wine", "saltfish"] },  // 全能湾畔的糖业首府，糖厂沿岸排开；干鳕鱼是庄园里最常见的口粮，这里也是南大西洋折返航线的枢纽。
  { id: "recife", name: "累西腓", nameEn: "Recife", lat: -8.05, lon: -34.88, zone: "brazil", tier: 2, yard: 1, produce: ["sugar", "dye"], demand: ["cloth", "oliveoil", "grain"] },  // 礁石护着的糖港，砂糖与苏木染料装船，是离欧洲最近的美洲糖区；面粉与油全靠回程船补给。
  { id: "riodejaneiro", name: "里约热内卢", nameEn: "Rio de Janeiro", lat: -22.91, lon: -43.17, zone: "brazil", tier: 1, yard: 1, produce: ["dye", "wood"], demand: ["cloth", "iron", "saltfish"] },  // 瓜纳巴拉湾里的新兴小港，苏木与硬材砍下就能上船，日用百货与口粮全靠外来，防务薄弱。
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
