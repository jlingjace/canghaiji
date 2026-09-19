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
 * 每张图自带对齐线，因为动态层（路人、货堆、停泊的船、浪花、建筑热区）要坐在画上。
 * 下面这批数值不是照抄构图提示词的理论值，而是逐张目测量出来的——实际生成结果
 * 与提示词里写的「街面 71-84%、水面 84-100%」普遍差 6~10 个百分点，照抄会让行人
 * 走进建筑里、浪花画到石墙中间。
 *
 *   top    —— 画面里最高的那个前景屋顶再往上留 2~4% 余量；名牌与热区上沿
 *   ground —— 建筑石基与铺装广场的接缝；热区下沿，也是行人行走带的上沿
 *   walk   —— 平整广场的下沿。再往下是码头石岸的**垂直立面**，
 *             行人走到那里会看起来贴在墙上，所以行人与货堆都只到这条线
 *   sea    —— 石岸与水面的真实分界（不是水里倒影的边缘）；停泊的船与浪花按它摆
 *   spots  —— 四栋建筑从左到右的横向范围，占图宽的比例，
 *             顺序对应 货栈 / 酒馆 / 港务府 / 造船厂
 *
 * 背景按「覆盖画布 + 底部对齐」摆放，所以这些比例在任何窗口尺寸下都成立。
 */
const plate = (key, o) => ({
  src: `/art/ports/${key}.jpg`,
  top: o.top, ground: o.ground, sea: o.sea,
  // 没单独量的，按已量四张的经验取街面带上部约 35% 作为可行走区
  walk: o.walk ?? Math.round((o.ground + (o.sea - o.ground) * 0.35) * 1000) / 1000,
  spots: o.spots,
});

export const PORT_BG_ART = {
  iberian: plate('iberian', {                    // 伊比利亚海岸
    top: 0.352, ground: 0.696, sea: 0.826,
    spots: [[0.028, 0.276], [0.291, 0.480], [0.492, 0.757], [0.762, 0.980]] }),
  mediterranean: plate('mediterranean', {        // 地中海
    top: 0.200, ground: 0.640, sea: 0.776,
    spots: [[0.044, 0.294], [0.299, 0.522], [0.525, 0.779], [0.781, 0.976]] }),
  ottoman: plate('ottoman', {                    // 黎凡特海
    top: 0.188, ground: 0.649, sea: 0.773,
    spots: [[0.045, 0.292], [0.319, 0.500], [0.522, 0.726], [0.729, 0.964]] }),
  northern: plate('northern', {                  // 北海
    top: 0.145, ground: 0.648, sea: 0.772,
    spots: [[0.035, 0.290], [0.305, 0.490], [0.501, 0.716], [0.722, 0.965]] }),
  westafrican: plate('westafrican', {            // 几内亚湾
    top: 0.232, ground: 0.632, sea: 0.763,
    spots: [[0.007, 0.307], [0.307, 0.521], [0.521, 0.778], [0.778, 0.992]] }),
  indian: plate('indian', {                      // 印度洋（广场只到 0.682，下面是石墙立面）
    top: 0.274, ground: 0.634, sea: 0.762, walk: 0.680,
    spots: [[0.003, 0.338], [0.338, 0.502], [0.508, 0.800], [0.808, 0.978]] }),
  seasia: plate('seasia', {                      // 南洋
    top: 0.262, ground: 0.649, sea: 0.764,
    spots: [[0.004, 0.336], [0.338, 0.494], [0.496, 0.790], [0.798, 0.978]] }),
  eastasia: plate('eastasia', {                  // 东海（广场只到 0.698）
    top: 0.245, ground: 0.651, sea: 0.762, walk: 0.698,
    spots: [[0.012, 0.347], [0.347, 0.496], [0.496, 0.806], [0.806, 0.976]] }),
  colonial: plate('colonial', {                  // 加勒比海（广场只到 0.664）
    top: 0.268, ground: 0.630, sea: 0.762, walk: 0.664,
    spots: [[0.010, 0.346], [0.348, 0.480], [0.495, 0.771], [0.771, 0.966]] }),
  brazil: plate('brazil', {                      // 巴西海岸（广场只到 0.666）
    top: 0.260, ground: 0.631, sea: 0.757, walk: 0.666,
    spots: [[0.011, 0.345], [0.345, 0.489], [0.489, 0.776], [0.778, 0.964]] }),
};
