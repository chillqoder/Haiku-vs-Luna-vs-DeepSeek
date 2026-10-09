// Звук: все эффекты синтезируются на лету через Web Audio API (OscillatorNode, GainNode, BiquadFilter).
// Музыки нет — только звуковые эффекты.

const MASTER_VOLUME = 0.6;

// Набор эффектов: каждый описан через тоны и шумовые всплески
const SOUNDS = {
  punch: (a) => {
    a.noiseBurst({ dur: 0.07, filter: 'bandpass', f0: 900, q: 0.8, vol: 0.6 });
    a.tone({ type: 'sine', f0: 180, f1: 90, dur: 0.09, vol: 0.35 });
  },
  heavy: (a) => {
    a.noiseBurst({ dur: 0.14, filter: 'lowpass', f0: 700, f1: 200, vol: 0.8 });
    a.tone({ type: 'square', f0: 140, f1: 60, dur: 0.16, vol: 0.25 });
  },
  kick: (a) => {
    a.noiseBurst({ dur: 0.12, filter: 'bandpass', f0: 500, q: 0.7, vol: 0.55 });
    a.tone({ type: 'sine', f0: 120, f1: 50, dur: 0.14, vol: 0.5 });
  },
  hit: (a) => {
    a.tone({ type: 'square', f0: 260, f1: 110, dur: 0.09, vol: 0.2 });
    a.noiseBurst({ dur: 0.05, filter: 'highpass', f0: 2000, vol: 0.25 });
  },
  hurt: (a) => {
    a.tone({ type: 'sawtooth', f0: 200, f1: 80, dur: 0.2, vol: 0.25 });
  },
  block: (a) => {
    a.tone({ type: 'triangle', f0: 1200, f1: 700, dur: 0.06, vol: 0.3 });
    a.noiseBurst({ dur: 0.03, filter: 'highpass', f0: 3000, vol: 0.3 });
  },
  jump: (a) => {
    a.tone({ type: 'sine', f0: 260, f1: 620, dur: 0.18, vol: 0.25 });
  },
  land: (a) => {
    a.tone({ type: 'sine', f0: 140, f1: 60, dur: 0.1, vol: 0.3 });
    a.noiseBurst({ dur: 0.05, filter: 'lowpass', f0: 400, vol: 0.25 });
  },
  swoosh: (a) => {
    a.noiseBurst({ dur: 0.18, filter: 'bandpass', f0: 600, f1: 2200, q: 1.2, vol: 0.25 });
  },
  special: (a) => {
    a.tone({ type: 'sawtooth', f0: 300, f1: 900, dur: 0.35, vol: 0.18 });
    a.noiseBurst({ dur: 0.3, filter: 'bandpass', f0: 500, f1: 2500, q: 1, vol: 0.3 });
  },
  enemyDown: (a) => {
    a.tone({ type: 'square', f0: 380, f1: 90, dur: 0.45, vol: 0.16 });
    a.noiseBurst({ dur: 0.2, filter: 'lowpass', f0: 800, f1: 150, vol: 0.2 });
  },
  boom: (a) => {
    a.noiseBurst({ dur: 0.6, filter: 'lowpass', f0: 900, f1: 80, vol: 0.9 });
    a.tone({ type: 'sine', f0: 80, f1: 30, dur: 0.5, vol: 0.5 });
  },
  crate: (a) => {
    a.noiseBurst({ dur: 0.18, filter: 'bandpass', f0: 1200, q: 2, vol: 0.6 });
  },
  pickup: (a) => {
    [523, 659, 784].forEach((f, i) => a.tone({ type: 'triangle', f0: f, dur: 0.08, vol: 0.2, at: i * 0.06 }));
  },
  select: (a) => {
    a.tone({ type: 'square', f0: 660, dur: 0.05, vol: 0.12 });
  },
  death: (a) => {
    a.tone({ type: 'sawtooth', f0: 300, f1: 60, dur: 0.8, vol: 0.25 });
  },
  roar: (a) => {
    a.noiseBurst({ dur: 0.8, filter: 'bandpass', f0: 180, q: 1.5, vol: 0.6 });
    a.tone({ type: 'sawtooth', f0: 90, f1: 60, dur: 0.8, vol: 0.2 });
  },
  shot: (a) => {
    a.tone({ type: 'sine', f0: 900, f1: 400, dur: 0.12, vol: 0.15 });
  },
};

export class Audio {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.noise = null;
    this.muted = false;
    this.lastPlayed = new Map();
  }

  // Контекст создаётся только после жеста пользователя (так требуют политики браузеров)
  resume() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      this.ctx = new AudioCtx();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.muted ? 0 : MASTER_VOLUME;
      const compressor = this.ctx.createDynamicsCompressor();
      this.master.connect(compressor);
      compressor.connect(this.ctx.destination);
      this.noise = this.makeNoiseBuffer();
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
  }

  makeNoiseBuffer() {
    const length = this.ctx.sampleRate;
    const buffer = this.ctx.createBuffer(1, length, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;
    return buffer;
  }

  toggleMute() {
    this.muted = !this.muted;
    if (this.master) this.master.gain.value = this.muted ? 0 : MASTER_VOLUME;
    return this.muted;
  }

  play(name) {
    if (!this.ctx || this.muted) return;
    const now = this.ctx.currentTime;
    // Не более одного звука одного типа в 30 мс — защита от «каши» из одинаковых звуков
    if (now - (this.lastPlayed.get(name) ?? -1) < 0.03) return;
    this.lastPlayed.set(name, now);
    SOUNDS[name]?.(this);
  }

  // Тон с частотной разверткой и экспоненциальным затуханием
  tone({ type = 'sine', f0, f1 = f0, dur, vol = 0.3, at = 0 }) {
    const t = this.ctx.currentTime + at;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(f0, t);
    osc.frequency.exponentialRampToValueAtTime(Math.max(f1, 1), t + dur);
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
    osc.connect(gain);
    gain.connect(this.master);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }

  // Шумовой всплеск через фильтр; частота фильтра может сдвигаться во времени
  noiseBurst({ dur, filter = 'lowpass', f0, f1 = f0, q = 1, vol = 0.4, at = 0 }) {
    const t = this.ctx.currentTime + at;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noise;
    const biquad = this.ctx.createBiquadFilter();
    biquad.type = filter;
    biquad.frequency.setValueAtTime(f0, t);
    biquad.frequency.exponentialRampToValueAtTime(Math.max(f1, 20), t + dur);
    biquad.Q.value = q;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
    src.connect(biquad);
    biquad.connect(gain);
    gain.connect(this.master);
    src.start(t, Math.random() * 0.5, dur + 0.05);
  }
}
