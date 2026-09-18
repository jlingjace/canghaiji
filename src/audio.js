/* 运行时合成的音乐与音效（Web Audio，全部原创，无外部素材） */

const midi = n => 440 * Math.pow(2, (n - 69) / 12);
/* 旋律写法：[音高(midi, 0=休止), 八分音符数] */
const TRACKS = {
  sea: {
    bpm: 104, beat: 6, chords: [[62, 66, 69], [59, 62, 66], [55, 59, 62], [57, 61, 64]], bassType: 'sine', arpType: 'triangle', melType: 'triangle', drums: false,
    melody: [[74, 3], [76, 1], [78, 2], [81, 3], [78, 3], [79, 2], [78, 2], [76, 2], [73, 4], [0, 2],
      [74, 3], [76, 1], [78, 2], [83, 3], [81, 3], [79, 2], [78, 2], [74, 2], [76, 4], [0, 2]],
  },
  port: {
    bpm: 124, beat: 8, chords: [[55, 59, 62], [52, 55, 59], [48, 52, 55], [50, 54, 57]], bassType: 'square', arpType: 'triangle', melType: 'square', drums: 'light',
    melody: [[67, 2], [71, 2], [74, 2], [71, 2], [72, 3], [71, 1], [69, 2], [67, 2], [64, 2], [67, 2], [69, 2], [71, 2], [74, 4], [0, 4],
      [79, 2], [78, 2], [76, 2], [74, 2], [76, 3], [74, 1], [72, 2], [71, 2], [72, 2], [69, 2], [71, 2], [67, 2], [67, 6], [0, 2]],
  },
  battle: {
    bpm: 152, beat: 8, chords: [[57, 60, 64], [53, 57, 60], [50, 53, 57], [52, 56, 59]], bassType: 'square', arpType: 'square', melType: 'square', drums: 'heavy',
    melody: [[69, 1], [69, 1], [72, 2], [71, 1], [69, 1], [67, 2], [65, 2], [64, 2], [65, 1], [67, 1], [69, 2], [62, 1], [62, 1], [65, 2], [64, 2], [62, 2], [64, 4], [0, 2], [64, 1], [64, 1],
      [69, 1], [69, 1], [72, 2], [74, 1], [72, 1], [71, 2], [72, 2], [69, 2], [67, 1], [65, 1], [64, 2], [62, 1], [62, 1], [65, 2], [67, 2], [69, 2], [69, 4], [0, 4]],
  },
};

class AudioEngine {
  constructor() {
    this.ctx = null; this.muted = false; this.pendingBgm = null; this.bgm = null; this.rainGain = null;
    try { this.muted = localStorage.getItem('aot-mute') === '1'; } catch (e) {}
  }
  /** 必须在用户手势后调用 */
  init() {
    if (this.ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain(); this.master.gain.value = this.muted ? 0 : 1; this.master.connect(this.ctx.destination);
    this.musicG = this.ctx.createGain(); this.musicG.gain.value = 0.22; this.musicG.connect(this.master);
    this.sfxG = this.ctx.createGain(); this.sfxG.gain.value = 0.5; this.sfxG.connect(this.master);
    const len = this.ctx.sampleRate * 2; const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate); const d = buf.getChannelData(0); for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1; this.noiseBuf = buf;
    if (this.pendingBgm) { const n = this.pendingBgm; this.pendingBgm = null; this.playBgm(n); }
    if (this.pendingRain != null) this.setRain(this.pendingRain);
  }
  toggleMute() { this.muted = !this.muted; try { localStorage.setItem('aot-mute', this.muted ? '1' : '0'); } catch (e) {} if (this.master) this.master.gain.setTargetAtTime(this.muted ? 0 : 1, this.ctx.currentTime, 0.05); return this.muted; }

  /* ---------- 基础发声 ---------- */
  tone(freq, t, dur, type = 'square', gain = 0.2, dest = this.sfxG, slide = 0) {
    const o = this.ctx.createOscillator(), g = this.ctx.createGain(); o.type = type; o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, freq + slide), t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(gain, t + 0.006); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(dest); o.start(t); o.stop(t + dur + 0.02);
  }
  noise(t, dur, gain = 0.3, freq = 1200, type = 'lowpass', dest = this.sfxG, q = 0.7) {
    const s = this.ctx.createBufferSource(); s.buffer = this.noiseBuf; s.loop = true;
    const f = this.ctx.createBiquadFilter(); f.type = type; f.frequency.setValueAtTime(freq, t); f.Q.value = q;
    const g = this.ctx.createGain(); g.gain.setValueAtTime(gain, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(dest); s.start(t); s.stop(t + dur + 0.02);
  }

  /* ---------- 音效 ---------- */
  sfx(name) {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime, G = this.sfxG;
    switch (name) {
      case 'click': this.tone(880, t, 0.05, 'square', 0.08); break;
      case 'open': this.tone(660, t, 0.06, 'square', 0.08); this.tone(990, t + 0.06, 0.08, 'square', 0.08); break;
      case 'type': this.tone(1400 + Math.random() * 300, t, 0.025, 'square', 0.03); break;
      case 'coin': this.tone(1318, t, 0.08, 'square', 0.12); this.tone(1760, t + 0.08, 0.16, 'square', 0.12); break;
      case 'pay': this.tone(520, t, 0.08, 'triangle', 0.1); this.tone(390, t + 0.08, 0.14, 'triangle', 0.1); break;
      case 'cannon': this.noise(t, 0.35, 0.6, 600, 'lowpass'); this.tone(90, t, 0.3, 'sine', 0.5, G, -60); break;
      case 'hit': this.noise(t, 0.18, 0.5, 2500, 'bandpass', G, 1.2); this.noise(t + 0.05, 0.3, 0.3, 400, 'lowpass'); this.tone(180, t, 0.12, 'square', 0.15, G, -100); break;
      case 'board': for (let i = 0; i < 3; i++) { this.noise(t + i * 0.12, 0.08, 0.35, 5000, 'highpass'); this.tone(2200 + i * 300, t + i * 0.12, 0.06, 'square', 0.08); } break;
      case 'sink': this.tone(320, t, 1.0, 'sine', 0.25, G, -250); for (let i = 0; i < 5; i++) this.tone(900 + Math.random() * 600, t + 0.2 + i * 0.16, 0.06, 'sine', 0.08); break;
      case 'sail': this.noise(t, 0.7, 0.25, 900, 'bandpass', G, 0.5); break;
      case 'bell': for (let i = 0; i < 2; i++) { this.tone(1046, t + i * 0.45, 0.9, 'sine', 0.18); this.tone(2093, t + i * 0.45, 0.5, 'sine', 0.06); } break;
      case 'thunder': this.noise(t, 1.6, 0.7, 180, 'lowpass'); this.noise(t + 0.1, 0.5, 0.3, 700, 'lowpass'); break;
      case 'win': [67, 71, 74, 79].forEach((n, i) => this.tone(midi(n), t + i * 0.11, 0.3, 'square', 0.14)); break;
      case 'lose': [62, 60, 57, 55].forEach((n, i) => this.tone(midi(n), t + i * 0.22, 0.4, 'triangle', 0.14)); break;
      case 'alarm': this.tone(440, t, 0.15, 'square', 0.12); this.tone(440, t + 0.2, 0.15, 'square', 0.12); break;
    }
  }

  /* ---------- 雨声环境 ---------- */
  setRain(level) {
    if (!this.ctx) { this.pendingRain = level; return; }
    if (!this.rainGain) {
      const s = this.ctx.createBufferSource(); s.buffer = this.noiseBuf; s.loop = true;
      const f = this.ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 2200;
      this.rainGain = this.ctx.createGain(); this.rainGain.gain.value = 0; s.connect(f); f.connect(this.rainGain); this.rainGain.connect(this.master); s.start();
    }
    this.rainGain.gain.setTargetAtTime(level * 0.16, this.ctx.currentTime, 0.8);
  }

  /* ---------- 音乐 ---------- */
  playBgm(name) {
    if (!this.ctx) { this.pendingBgm = name; return; }
    if (this.bgm && this.bgm.name === name) return;
    this.stopBgm();
    if (!name) return;
    const tr = TRACKS[name]; const eighth = 60 / tr.bpm / 2;
    const onsets = []; let pos = 0; for (const [n, l] of tr.melody) { if (n) onsets[pos] = { n, l }; pos += l; }
    const loopLen = pos;
    const g = this.ctx.createGain(); g.gain.value = 0; g.connect(this.musicG); g.gain.setTargetAtTime(1, this.ctx.currentTime, 0.4);
    this.bgm = { name, tr, eighth, onsets, loopLen, pos: 0, next: this.ctx.currentTime + 0.1, gain: g, timer: null };
    this.bgm.timer = setInterval(() => this.schedule(), 90);
  }
  stopBgm() {
    if (!this.bgm) return; const b = this.bgm; this.bgm = null; clearInterval(b.timer);
    b.gain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.25); setTimeout(() => b.gain.disconnect(), 1200);
  }
  schedule() {
    const b = this.bgm; if (!b) return; const now = this.ctx.currentTime;
    while (b.next < now + 0.4) {
      const t = b.next, i = b.pos, tr = b.tr, bar = Math.floor(i / tr.beat) % tr.chords.length, ch = tr.chords[bar], inBar = i % tr.beat;
      // 琶音
      const arp = [ch[0], ch[1], ch[2], ch[0] + 12, ch[2], ch[1], ch[0] + 12, ch[1]][inBar % 8];
      this.tone(midi(arp), t, b.eighth * 0.9, tr.arpType, tr.drums === 'heavy' ? 0.05 : 0.07, b.gain);
      // 低音
      if (tr.beat === 6 ? inBar === 0 || inBar === 3 : inBar % 2 === 0) this.tone(midi(ch[0] - 24 + (inBar >= tr.beat / 2 && tr.drums ? 7 : 0)), t, b.eighth * (tr.beat === 6 ? 2.6 : 1.6), tr.bassType, 0.14, b.gain);
      // 旋律
      const m = b.onsets[i]; if (m) this.tone(midi(m.n), t, b.eighth * m.l * 0.92, tr.melType, 0.11, b.gain);
      // 鼓
      if (tr.drums) {
        if (inBar % 4 === 0) this.tone(120, t, 0.1, 'sine', 0.3, b.gain, -80);
        if (tr.drums === 'heavy' && inBar % 4 === 2) this.noise(t, 0.12, 0.25, 1800, 'bandpass', b.gain, 0.8);
        if (inBar % 2 === 1) this.noise(t, 0.04, tr.drums === 'heavy' ? 0.12 : 0.06, 7000, 'highpass', b.gain);
      }
      b.pos = (i + 1) % b.loopLen; b.next += b.eighth;
    }
  }
}
export const audio = new AudioEngine();
