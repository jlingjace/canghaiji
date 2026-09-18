/* 天气图层：雨丝、暗调、闪电（覆盖在海图 / 港口场景之上） */
import { Container, Graphics } from 'pixi.js';
import { audio } from './audio.js';

export class WeatherLayer {
  constructor(app) {
    this.app = app; this.root = new Container(); this.root.eventMode = 'none';
    this.tint = new Graphics(); this.root.addChild(this.tint);
    this.rain = new Graphics(); this.root.addChild(this.rain);
    this.flash = new Graphics(); this.flash.alpha = 0; this.root.addChild(this.flash);
    this.drops = []; this.size = ''; this.level = 0; this.flashT = 0; this.shake = 0;
  }
  ensure(n) {
    const vw = this.app.screen.width, vh = this.app.screen.height, size = `${vw}x${vh}`;
    if (size !== this.size) {
      this.size = size; this.drops = [];
      this.tint.clear().rect(0, 0, vw, vh).fill(0x0a1a2c); this.flash.clear().rect(0, 0, vw, vh).fill(0xffffff);
    }
    while (this.drops.length < n) this.drops.push({ x: Math.random() * (vw + 200) - 100, y: Math.random() * vh, l: 10 + Math.random() * 14, s: 520 + Math.random() * 300 });
    if (this.drops.length > n) this.drops.length = n;
  }
  /** type: 'clear' | 'rain' | 'storm' */
  tick(dt, type) {
    const target = type === 'storm' ? 1 : type === 'rain' ? 0.5 : 0;
    this.level += (target - this.level) * Math.min(1, dt * 1.5);
    audio.setRain(this.level);
    const vw = this.app.screen.width, vh = this.app.screen.height;
    if (this.level < 0.02) { this.root.visible = false; this.shake = 0; return; }
    this.root.visible = true;
    this.ensure(Math.round(this.level * 260));
    this.tint.alpha = 0.35 * this.level;
    this.rain.clear();
    const wind = type === 'storm' ? 0.55 : 0.25;
    for (const d of this.drops) {
      d.y += d.s * dt * (0.7 + this.level * 0.5); d.x -= d.s * wind * dt;
      if (d.y > vh) { d.y = -20; d.x = Math.random() * (vw + 200) - 60; }
      if (d.x < -40) d.x += vw + 100;
      this.rain.moveTo(d.x, d.y).lineTo(d.x - d.l * wind, d.y - d.l);
    }
    this.rain.stroke({ width: 1, color: 0xcfe8f5, alpha: 0.35 + this.level * 0.25 });
    // 闪电（仅风暴）
    if (this.flash.alpha > 0) this.flash.alpha = Math.max(0, this.flash.alpha - dt * 3);
    if (type === 'storm') {
      this.flashT -= dt;
      if (this.flashT <= 0) { this.flashT = 3 + Math.random() * 6; this.flash.alpha = 0.75; audio.sfx('thunder'); this.shake = 0.5; }
      if (this.shake > 0) this.shake -= dt;
    }
  }
  /** 返回当前屏幕抖动偏移（风暴雷击时） */
  shakeOffset() { if (this.shake <= 0) return [0, 0]; const f = this.shake * 8; return [(Math.random() - 0.5) * f, (Math.random() - 0.5) * f]; }
}
