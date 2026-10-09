// Procedurally synthesized sound effects via the Web Audio API.
// No music, no audio files - only oscillators, noise and filters.

export class AudioManager {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.enabled = true;
    this.volume = 0.4;
    this._noiseBuffer = null;
    this._lastPlay = new Map();
  }

  unlock() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) {
      this.enabled = false;
      return;
    }
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = this.volume;
    this.master.connect(this.ctx.destination);
    this._noiseBuffer = this._makeNoiseBuffer(1.5);
  }

  setEnabled(on) {
    this.enabled = on;
    if (this.master) this.master.gain.value = on ? this.volume : 0;
  }

  _makeNoiseBuffer(seconds) {
    const rate = this.ctx.sampleRate;
    const len = Math.floor(rate * seconds);
    const buf = this.ctx.createBuffer(1, len, rate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    return buf;
  }

  _guard(name, minInterval = 0) {
    if (!this.ctx || !this.enabled) return false;
    if (minInterval > 0) {
      const now = this.ctx.currentTime;
      const last = this._lastPlay.get(name) || -Infinity;
      if (now - last < minInterval) return false;
      this._lastPlay.set(name, now);
    }
    return true;
  }

  _tone({ type = 'square', freq = 200, freqEnd = null, dur = 0.1, gain = 0.3, attack = 0.004, delay = 0 }) {
    const t0 = this.ctx.currentTime + delay;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (freqEnd !== null) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(20, freqEnd), t0 + dur);
    }
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(gain, t0 + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g);
    g.connect(this.master);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  _noise({ dur = 0.1, filter = 'lowpass', freq = 1200, freqEnd = null, q = 1, gain = 0.4, delay = 0, type = null }) {
    const t0 = this.ctx.currentTime + delay;
    const src = this.ctx.createBufferSource();
    src.buffer = this._noiseBuffer;
    src.loop = true;
    const f = this.ctx.createBiquadFilter();
    f.type = type || filter;
    f.frequency.setValueAtTime(freq, t0);
    if (freqEnd !== null) f.frequency.exponentialRampToValueAtTime(Math.max(40, freqEnd), t0 + dur);
    f.Q.value = q;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(gain, t0 + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(f);
    f.connect(g);
    g.connect(this.master);
    src.start(t0);
    src.stop(t0 + dur + 0.02);
  }

  // ---- Game sounds ----

  punch() {
    if (!this._guard('punch', 0.03)) return;
    this._noise({ dur: 0.07, filter: 'lowpass', freq: 1100, freqEnd: 300, gain: 0.35 });
    this._tone({ type: 'sine', freq: 220, freqEnd: 70, dur: 0.07, gain: 0.2 });
  }

  kick() {
    if (!this._guard('kick', 0.03)) return;
    this._noise({ dur: 0.1, filter: 'lowpass', freq: 800, freqEnd: 180, gain: 0.45 });
    this._tone({ type: 'sine', freq: 160, freqEnd: 55, dur: 0.1, gain: 0.28 });
  }

  hitLight() {
    if (!this._guard('hitLight', 0.02)) return;
    this._tone({ type: 'square', freq: 320, freqEnd: 140, dur: 0.06, gain: 0.16 });
    this._noise({ dur: 0.05, filter: 'highpass', freq: 900, gain: 0.18 });
  }

  hitHeavy() {
    if (!this._guard('hitHeavy', 0.03)) return;
    this._tone({ type: 'square', freq: 190, freqEnd: 70, dur: 0.16, gain: 0.26 });
    this._noise({ dur: 0.14, filter: 'lowpass', freq: 900, freqEnd: 250, gain: 0.35 });
  }

  block() {
    if (!this._guard('block', 0.03)) return;
    this._tone({ type: 'triangle', freq: 900, freqEnd: 500, dur: 0.08, gain: 0.2 });
    this._noise({ dur: 0.06, filter: 'highpass', freq: 2000, gain: 0.15 });
  }

  jump() {
    if (!this._guard('jump', 0.05)) return;
    this._tone({ type: 'sine', freq: 260, freqEnd: 640, dur: 0.16, gain: 0.18 });
  }

  land() {
    if (!this._guard('land', 0.05)) return;
    this._noise({ dur: 0.1, filter: 'lowpass', freq: 500, freqEnd: 120, gain: 0.3 });
    this._tone({ type: 'sine', freq: 120, freqEnd: 45, dur: 0.1, gain: 0.2 });
  }

  grab() {
    if (!this._guard('grab', 0.05)) return;
    this._noise({ dur: 0.08, filter: 'bandpass', freq: 600, q: 3, gain: 0.3 });
  }

  throwWhoosh() {
    if (!this._guard('throw', 0.05)) return;
    this._noise({ dur: 0.28, filter: 'bandpass', freq: 1800, freqEnd: 300, q: 1.2, gain: 0.3 });
  }

  special() {
    if (!this._guard('special', 0.1)) return;
    this._tone({ type: 'sawtooth', freq: 180, freqEnd: 900, dur: 0.22, gain: 0.2 });
    this._tone({ type: 'sawtooth', freq: 900, freqEnd: 160, dur: 0.2, gain: 0.18, delay: 0.22 });
    this._noise({ dur: 0.4, filter: 'bandpass', freq: 500, freqEnd: 2000, q: 1, gain: 0.25 });
  }

  ko() {
    if (!this._guard('ko', 0.05)) return;
    this._tone({ type: 'sawtooth', freq: 400, freqEnd: 60, dur: 0.4, gain: 0.24 });
    this._noise({ dur: 0.35, filter: 'lowpass', freq: 700, freqEnd: 100, gain: 0.35 });
  }

  hurt() {
    if (!this._guard('hurt', 0.08)) return;
    this._tone({ type: 'square', freq: 240, freqEnd: 90, dur: 0.12, gain: 0.22 });
  }

  pickup() {
    if (!this._guard('pickup', 0.05)) return;
    this._tone({ type: 'sine', freq: 620, dur: 0.08, gain: 0.2 });
    this._tone({ type: 'sine', freq: 930, dur: 0.12, gain: 0.2, delay: 0.08 });
  }

  crateBreak() {
    if (!this._guard('crate', 0.05)) return;
    this._noise({ dur: 0.22, filter: 'lowpass', freq: 1400, freqEnd: 200, gain: 0.4 });
    this._tone({ type: 'square', freq: 150, freqEnd: 60, dur: 0.15, gain: 0.2 });
  }

  uiMove() {
    if (!this._guard('uiMove', 0.04)) return;
    this._tone({ type: 'square', freq: 500, dur: 0.05, gain: 0.12 });
  }

  uiConfirm() {
    if (!this._guard('uiConfirm', 0.05)) return;
    this._tone({ type: 'square', freq: 520, dur: 0.07, gain: 0.15 });
    this._tone({ type: 'square', freq: 780, dur: 0.1, gain: 0.15, delay: 0.07 });
  }

  bossRoar() {
    if (!this._guard('boss', 0.5)) return;
    this._tone({ type: 'sawtooth', freq: 90, freqEnd: 45, dur: 0.7, gain: 0.3 });
    this._noise({ dur: 0.7, filter: 'lowpass', freq: 400, freqEnd: 120, gain: 0.35 });
  }

  levelClear() {
    if (!this._guard('clear', 0.5)) return;
    const notes = [523, 659, 784, 1046];
    notes.forEach((f, i) => this._tone({ type: 'square', freq: f, dur: 0.14, gain: 0.16, delay: i * 0.12 }));
  }

  gameOver() {
    if (!this._guard('over', 0.5)) return;
    const notes = [392, 330, 262, 196];
    notes.forEach((f, i) => this._tone({ type: 'triangle', freq: f, dur: 0.3, gain: 0.2, delay: i * 0.22 }));
  }

  dash() {
    if (!this._guard('dash', 0.1)) return;
    this._noise({ dur: 0.25, filter: 'bandpass', freq: 400, freqEnd: 1600, q: 1.4, gain: 0.25 });
  }

  slam() {
    if (!this._guard('slam', 0.1)) return;
    this._tone({ type: 'sine', freq: 110, freqEnd: 40, dur: 0.3, gain: 0.3 });
    this._noise({ dur: 0.3, filter: 'lowpass', freq: 600, freqEnd: 100, gain: 0.4 });
  }
}
