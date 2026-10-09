export class AudioFX {
  constructor() {
    this.context = null;
    this.noiseBuffer = null;
    this.muted = false;
  }

  unlock() {
    if (!this.context) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) return;
      this.context = new AudioContextClass();
      const buffer = this.context.createBuffer(1, this.context.sampleRate * 0.25, this.context.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < data.length; i += 1) data[i] = Math.random() * 2 - 1;
      this.noiseBuffer = buffer;
    }
    if (this.context.state === 'suspended') this.context.resume();
  }

  tone(startHz, endHz, duration, type = 'sine', volume = 0.12, delay = 0) {
    if (!this.context || this.muted) return;
    const now = this.context.currentTime + delay;
    const oscillator = this.context.createOscillator();
    const gain = this.context.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(startHz, now);
    oscillator.frequency.exponentialRampToValueAtTime(Math.max(20, endHz), now + duration);
    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
    oscillator.connect(gain).connect(this.context.destination);
    oscillator.start(now);
    oscillator.stop(now + duration + 0.015);
  }

  noise(duration = 0.09, volume = 0.1, filterHz = 1500) {
    if (!this.context || !this.noiseBuffer || this.muted) return;
    const now = this.context.currentTime;
    const source = this.context.createBufferSource();
    const filter = this.context.createBiquadFilter();
    const gain = this.context.createGain();
    source.buffer = this.noiseBuffer;
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(filterHz, now);
    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
    source.connect(filter).connect(gain).connect(this.context.destination);
    source.start(now, Math.random() * 0.1, duration);
  }

  play(name) {
    this.unlock();
    switch (name) {
      case 'punch': this.noise(0.07, 0.09, 1700); this.tone(115, 55, 0.09, 'triangle', 0.11); break;
      case 'kick': this.noise(0.12, 0.13, 1200); this.tone(100, 42, 0.14, 'sawtooth', 0.08); break;
      case 'hit': this.noise(0.1, 0.17, 850); this.tone(90, 38, 0.16, 'square', 0.06); break;
      case 'jump': this.tone(190, 520, 0.17, 'sine', 0.08); break;
      case 'land': this.noise(0.11, 0.07, 500); break;
      case 'special': this.tone(180, 720, 0.35, 'sawtooth', 0.08); this.tone(620, 110, 0.32, 'triangle', 0.07, 0.12); this.noise(0.28, 0.1, 2400); break;
      case 'break': this.noise(0.22, 0.16, 900); this.tone(140, 55, 0.2, 'square', 0.05); break;
      case 'defeat': this.tone(240, 80, 0.28, 'triangle', 0.1); break;
      case 'throw': this.tone(310, 90, 0.2, 'sawtooth', 0.1); break;
      case 'block': this.tone(800, 240, 0.09, 'square', 0.06); break;
      default: break;
    }
  }
}
