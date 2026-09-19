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

/** 港口背景按海域风格共用一张，而不是 40 个港口各一张 */
export const PORT_BG_ART = {
  // iberian: '/art/ports/iberian.jpg',
};
