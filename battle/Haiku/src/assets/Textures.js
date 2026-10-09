// Процедурные текстуры (CanvasTexture). Внешних изображений нет: всё рисуется кодом.
import * as THREE from 'three';

const cache = new Map();

// Кэш ресурсов: создаём один раз, дальше переиспользуем
export function cached(key, factory) {
  if (!cache.has(key)) cache.set(key, factory());
  return cache.get(key);
}

// Детерминированный генератор случайных чисел (mulberry32): текстуры одинаковы при каждом запуске
export function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function canvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

function texture(c, repX = 1, repY = 1) {
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repX, repY);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

// Россыпь пятен поверх текстуры: даёт фактуру бетону, металлу и дереву
function speckle(ctx, w, h, rnd, count, color, rMin, rMax, alpha) {
  ctx.fillStyle = color;
  ctx.globalAlpha = alpha;
  for (let i = 0; i < count; i++) {
    ctx.beginPath();
    ctx.arc(rnd() * w, rnd() * h, rMin + rnd() * (rMax - rMin), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

export function asphaltTex() {
  return cached('asphalt', () => {
    const c = canvas(256, 256);
    const ctx = c.getContext('2d');
    const rnd = rng(7);
    ctx.fillStyle = '#2b2e37';
    ctx.fillRect(0, 0, 256, 256);
    speckle(ctx, 256, 256, rnd, 900, '#15171c', 0.6, 2.2, 0.5);
    speckle(ctx, 256, 256, rnd, 500, '#4a4f5c', 0.5, 1.6, 0.35);
    ctx.strokeStyle = '#1a1c22';
    ctx.lineWidth = 1.5;
    ctx.globalAlpha = 0.6;
    ctx.beginPath();
    ctx.moveTo(20, 40);
    ctx.lineTo(70, 110);
    ctx.lineTo(60, 150);
    ctx.stroke();
    ctx.globalAlpha = 1;
    return texture(c, 4, 1);
  });
}

export function planksTex() {
  return cached('planks', () => {
    const c = canvas(256, 256);
    const ctx = c.getContext('2d');
    const rnd = rng(11);
    const plank = 64;
    for (let i = 0; i < 4; i++) {
      const shade = 0.85 + rnd() * 0.3;
      const y0 = i * plank;
      ctx.fillStyle = `rgb(${Math.round(150 * shade)},${Math.round(98 * shade)},${Math.round(56 * shade)})`;
      ctx.fillRect(0, y0, 256, plank);
      ctx.strokeStyle = 'rgba(40,20,10,0.55)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, y0);
      ctx.lineTo(256, y0);
      ctx.stroke();
      ctx.strokeStyle = 'rgba(60,35,20,0.25)';
      ctx.lineWidth = 1;
      for (let k = 0; k < 6; k++) {
        const y = y0 + rnd() * plank;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.bezierCurveTo(80, y + rnd() * 6 - 3, 170, y + rnd() * 6 - 3, 256, y);
        ctx.stroke();
      }
      ctx.fillStyle = 'rgba(30,15,8,0.6)';
      ctx.fillRect(rnd() * 200, y0, 2, plank);
    }
    return texture(c, 3, 1);
  });
}

export function gratingTex() {
  return cached('grating', () => {
    const c = canvas(256, 256);
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#3a3f47';
    ctx.fillRect(0, 0, 256, 256);
    ctx.strokeStyle = '#2a2e35';
    ctx.lineWidth = 6;
    for (let i = 0; i <= 256; i += 64) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, 256);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, i);
      ctx.lineTo(256, i);
      ctx.stroke();
    }
    ctx.fillStyle = '#50565f';
    for (let i = 0; i < 256; i += 64) ctx.fillRect(i - 2, 0, 2, 256);
    return texture(c, 5, 1);
  });
}

export function crateTex() {
  return cached('crate', () => {
    const c = canvas(128, 128);
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#8a5a2b';
    ctx.fillRect(0, 0, 128, 128);
    ctx.strokeStyle = '#4a2c12';
    ctx.lineWidth = 8;
    ctx.strokeRect(4, 4, 120, 120);
    ctx.beginPath();
    ctx.moveTo(4, 4);
    ctx.lineTo(124, 124);
    ctx.moveTo(124, 4);
    ctx.lineTo(4, 124);
    ctx.stroke();
    ctx.fillStyle = '#3a2210';
    ctx.fillRect(56, 56, 16, 16);
    return texture(c);
  });
}

// Взрывоопасная бочка: красный металл с предупреждающей полосой
export function barrelTex() {
  return cached('barrel', () => {
    const c = canvas(128, 128);
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#b8262b';
    ctx.fillRect(0, 0, 128, 128);
    ctx.fillStyle = '#2a2a2a';
    ctx.fillRect(0, 22, 128, 10);
    ctx.fillRect(0, 96, 128, 10);
    ctx.fillStyle = '#ffd13a';
    for (let x = -20; x < 140; x += 24) {
      ctx.beginPath();
      ctx.moveTo(x, 52);
      ctx.lineTo(x + 12, 52);
      ctx.lineTo(x + 24, 76);
      ctx.lineTo(x + 12, 76);
      ctx.closePath();
      ctx.fill();
    }
    return texture(c);
  });
}

export function gradientTex(key, top, bottom) {
  return cached(key, () => {
    const c = canvas(4, 512);
    const ctx = c.getContext('2d');
    const g = ctx.createLinearGradient(0, 0, 0, 512);
    g.addColorStop(0, top);
    g.addColorStop(1, bottom);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 4, 512);
    return texture(c);
  });
}

// Силуэты зданий с окнами на прозрачном фоне; тайлится по горизонтали
export function skylineTex(key, { body, windowOn, windowOff, seed = 3, minH = 0.35, maxH = 0.9 }) {
  return cached(key, () => {
    const W = 1024;
    const H = 256;
    const c = canvas(W, H);
    const ctx = c.getContext('2d');
    const rnd = rng(seed);
    let x = 0;
    while (x < W) {
      const bw = 50 + rnd() * 90;
      const bh = H * (minH + rnd() * (maxH - minH));
      ctx.fillStyle = body;
      ctx.fillRect(x, H - bh, bw, bh);
      for (let wy = H - bh + 10; wy < H - 12; wy += 16) {
        for (let wx = x + 8; wx < x + bw - 10; wx += 13) {
          ctx.fillStyle = rnd() < 0.35 ? windowOn : windowOff;
          ctx.fillRect(wx, wy, 6, 8);
        }
      }
      x += bw + 4 + rnd() * 10;
    }
    return texture(c, 2, 1);
  });
}

// Сёдзи: бумажные перегородки с деревянной решёткой (фон додзё)
export function shojiTex() {
  return cached('shoji', () => {
    const W = 1024;
    const H = 512;
    const c = canvas(W, H);
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#c9a57a';
    ctx.fillRect(0, 0, W, H);
    const cell = 128;
    ctx.fillStyle = '#e9dcc0';
    for (let x = 0; x < W; x += cell) {
      for (let y = 0; y < H; y += cell) ctx.fillRect(x + 10, y + 10, cell - 20, cell - 20);
    }
    ctx.strokeStyle = '#7a5530';
    ctx.lineWidth = 6;
    for (let x = 0; x <= W; x += cell) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, H);
      ctx.stroke();
    }
    for (let y = 0; y <= H; y += cell) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(W, y);
      ctx.stroke();
    }
    return texture(c, 2, 1);
  });
}

// Силуэты цеха: трубы, корпус, шестерни и дым (прозрачный фон)
export function factoryTex() {
  return cached('factory', () => {
    const W = 1024;
    const H = 256;
    const c = canvas(W, H);
    const ctx = c.getContext('2d');
    const rnd = rng(21);
    ctx.fillStyle = '#2a2d33';
    for (let x = 0; x < W; x += 140) {
      const h = 120 + rnd() * 110;
      ctx.fillRect(x + 20, H - h, 28, h);
      ctx.fillRect(x + 14, H - h - 8, 40, 10);
    }
    ctx.fillRect(0, H - 70, W, 70);
    ctx.fillStyle = '#353a42';
    for (let x = 60; x < W; x += 220) {
      ctx.beginPath();
      ctx.arc(x, H - 90, 34, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = 'rgba(180,180,190,0.18)';
    for (let i = 0; i < 40; i++) {
      ctx.beginPath();
      ctx.arc(rnd() * W, rnd() * H * 0.5, 10 + rnd() * 26, 0, Math.PI * 2);
      ctx.fill();
    }
    return texture(c, 2, 1);
  });
}

// Мягкое световое пятно: спрайт для частиц и ламп
export function glowTex() {
  return cached('glow', () => {
    const c = canvas(64, 64);
    const ctx = c.getContext('2d');
    const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.35, 'rgba(255,255,255,0.6)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 64, 64);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  });
}

// Табличка с надписью (вывеска, знак выхода)
export function signTex(key, text, bg, fg) {
  return cached(key, () => {
    const c = canvas(512, 128);
    const ctx = c.getContext('2d');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, 512, 128);
    ctx.strokeStyle = fg;
    ctx.lineWidth = 8;
    ctx.strokeRect(8, 8, 496, 112);
    ctx.fillStyle = fg;
    ctx.font = 'bold 64px Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 256, 68);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  });
}
