/*
 * 手绘素材清单。
 * 只列已经有图的条目；没有列到的角色 / 场景仍然走 portraits.js、port.js 里的程序化画法，
 * 所以这个文件可以一条一条加，任何时候都能跑。
 *
 * 图片放在 public/ 下，以 / 开头引用，dev 与 build 路径一致。
 * 规格：立绘 4:5、480×600 JPEG（约 60KB）；正面受光在左上，与 art.js 的光照方向一致。
 */
export const PORTRAIT_ART = {
  lin:  '/art/portraits/lin.jpg',    // 林远舟 · 商会少东
  shen: '/art/portraits/shen.jpg',   // 沈鹭 · 领航员
  tie:  '/art/portraits/tie.jpg',    // 哈迪·铁山 · 前私掠船长
  ahai: '/art/portraits/ahai.jpg',   // 阿海 · 大副
  qian: '/art/portraits/qian.jpg',   // 老钱 · 货栈掌柜
  mu:   '/art/portraits/mu.jpg',     // 木叔 · 船匠
  hong: '/art/portraits/hong.jpg',   // 红姨 · 酒馆老板娘
  cen:  '/art/portraits/cen.jpg',    // 岑港务长
  barro:'/art/portraits/barro.jpg',  // 独眼巴罗 · 海盗头目
  alice:'/art/portraits/alice.jpg',  // 艾丽丝·蓝 · 蓝鲸商会代表
  hector:'/art/portraits/hector.jpg',// 赫克托 · 红帆同盟船长
  salim:'/art/portraits/salim.jpg',  // 萨利姆 · 金沙公司使节
};

/**
 * 港口背景板：按海域风格共用一张，而不是 40 个港口各一张。
 *
 * 每张图自带对齐线，因为动态层（路人、停泊的船、浪花、建筑热区）要坐在画上：
 *   ground —— 街面基线（建筑落地、路人行走的最上沿），占图高的比例
 *   sea    —— 码头边缘与水面的交界，占图高的比例
 *   top    —— 建筑顶部大致高度，占图高的比例，决定热区上沿与名牌位置
 *   spots  —— 四栋建筑的横向范围 [起, 止]，占图宽的比例，
 *             顺序固定为 货栈 / 酒馆 / 港务府 / 造船厂
 * 背景按「覆盖画布 + 底部对齐」摆放，所以这些比例在任何窗口尺寸下都成立。
 *
 * 十张图是用同一套构图提示词生成的（建筑中心固定在图宽 20/40/60/80%，
 * 街面 71-84%、码头与水面 84-100%），所以 top 与 spots 可以共用一套默认值，
 * 只有水线各图略有出入，用 tools/measure_bg.py 量出来后单独写在下面。
 */
const PLATE = { top: 0.50, spots: [[0.04, 0.30], [0.31, 0.51], [0.52, 0.73], [0.74, 0.98]] };
/** sea = 水线；街面基线固定取水线上方 0.10，正好是一条能走人的码头 */
const plate = (key, sea, over) => ({ ...PLATE, src: `/art/ports/${key}.jpg`, sea, ground: Math.round((sea - 0.10) * 1000) / 1000, ...over });

export const PORT_BG_ART = {
  iberian:       plate('iberian', 0.81),        // 伊比利亚海岸
  mediterranean: plate('mediterranean', 0.79),  // 地中海
  ottoman:       plate('ottoman', 0.80),        // 黎凡特海
  northern:      plate('northern', 0.86),       // 北海
  westafrican:   plate('westafrican', 0.86),    // 几内亚湾
  indian:        plate('indian', 0.86),         // 印度洋
  seasia:        plate('seasia', 0.79),         // 南洋
  eastasia:      plate('eastasia', 0.78),       // 东海
  colonial:      plate('colonial', 0.78),       // 加勒比海
  brazil:        plate('brazil', 0.78),         // 巴西海岸
};
