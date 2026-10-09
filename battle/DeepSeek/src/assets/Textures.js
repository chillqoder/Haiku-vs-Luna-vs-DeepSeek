// Procedural canvas textures - every pixel in this game is generated in code.

import * as THREE from 'three';

function makeCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

function finish(canvas, repeatX = 1, repeatY = 1) {
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeatX, repeatY);
  tex.anisotropy = 4;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function noise(ctx, w, h, count, alpha, light = false) {
  for (let i = 0; i < count; i++) {
    const v = Math.floor(Math.random() * 255);
    ctx.fillStyle = light
      ? `rgba(${v},${v},${v},${alpha})`
      : `rgba(${Math.floor(v * 0.4)},${Math.floor(v * 0.4)},${Math.floor(v * 0.5)},${alpha})`;
    const s = 1 + Math.random() * 2;
    ctx.fillRect(Math.random() * w, Math.random() * h, s, s);
  }
}

export function asphaltTexture(repeatX = 10, repeatY = 3) {
  const c = makeCanvas(256, 256);
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#22242e';
  ctx.fillRect(0, 0, 256, 256);
  noise(ctx, 256, 256, 2600, 0.35, true);
  // cracks
  ctx.strokeStyle = 'rgba(10,10,14,0.5)';
  ctx.lineWidth = 1;
  for (let i = 0; i < 7; i++) {
    ctx.beginPath();
    let x = Math.random() * 256;
    let y = Math.random() * 256;
    ctx.moveTo(x, y);
    for (let j = 0; j < 5; j++) {
      x += (Math.random() - 0.5) * 60;
      y += (Math.random() - 0.5) * 60;
      ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  // lane paint
  ctx.fillStyle = 'rgba(200,190,120,0.25)';
  ctx.fillRect(0, 120, 256, 6);
  return finish(c, repeatX, repeatY);
}

export function woodTexture(repeatX = 10, repeatY = 3) {
  const c = makeCanvas(256, 256);
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#7a4f28';
  ctx.fillRect(0, 0, 256, 256);
  const plank = 32;
  for (let y = 0; y < 256; y += plank) {
    const shade = 100 + Math.random() * 40;
    ctx.fillStyle = `rgb(${shade + 30},${Math.floor(shade * 0.62)},${Math.floor(shade * 0.32)})`;
    ctx.fillRect(0, y, 256, plank - 2);
    ctx.strokeStyle = 'rgba(40,20,8,0.8)';
    ctx.strokeRect(-1, y, 258, plank - 2);
    // grain
    ctx.strokeStyle = 'rgba(60,30,10,0.25)';
    for (let i = 0; i < 5; i++) {
      ctx.beginPath();
      const gy = y + 4 + Math.random() * (plank - 8);
      ctx.moveTo(0, gy);
      ctx.bezierCurveTo(80, gy + 3, 160, gy - 3, 256, gy + 2);
      ctx.stroke();
    }
  }
  return finish(c, repeatX, repeatY);
}

export function metalTexture(repeatX = 10, repeatY = 3) {
  const c = makeCanvas(256, 256);
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#3a3f48';
  ctx.fillRect(0, 0, 256, 256);
  // diamond plate
  ctx.strokeStyle = 'rgba(180,190,200,0.30)';
  ctx.lineWidth = 2;
  for (let y = 0; y < 256; y += 32) {
    for (let x = 0; x < 256; x += 32) {
      ctx.beginPath();
      ctx.moveTo(x + 6, y + 6);
      ctx.lineTo(x + 22, y + 22);
      ctx.moveTo(x + 22, y + 6);
      ctx.lineTo(x + 6, y + 22);
      ctx.stroke();
    }
  }
  noise(ctx, 256, 256, 1200, 0.2, true);
  ctx.strokeStyle = 'rgba(0,0,0,0.5)';
  ctx.strokeRect(0, 0, 256, 256);
  return finish(c, repeatX, repeatY);
}

export function brickTexture(repeatX = 8, repeatY = 2, tint = '#5a3540') {
  const c = makeCanvas(256, 256);
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#1a1418';
  ctx.fillRect(0, 0, 256, 256);
  const bw = 42;
  const bh = 20;
  for (let row = 0; row < 256 / bh; row++) {
    const offset = row % 2 === 0 ? 0 : bw / 2;
    for (let x = -bw; x < 256 + bw; x += bw) {
      ctx.fillStyle = tint;
      const jitter = Math.random() * 18 - 9;
      ctx.fillRect(x + offset + 2, row * bh + 2, bw - 4, bh - 4);
      ctx.fillStyle = `rgba(255,255,255,${0.03 + Math.random() * 0.05})`;
      ctx.fillRect(x + offset + 2, row * bh + 2, bw - 4, 4);
      ctx.fillStyle = `rgba(0,0,0,${0.05 + Math.abs(jitter) * 0.01})`;
      ctx.fillRect(x + offset + 2, row * bh + bh - 8, bw - 4, 4);
    }
  }
  return finish(c, repeatX, repeatY);
}

export function buildingTexture(repeatX = 1, repeatY = 1, lit = '#ffcf6e') {
  const c = makeCanvas(128, 256);
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#141828';
  ctx.fillRect(0, 0, 128, 256);
  const cw = 18;
  const ch = 26;
  for (let y = 12; y < 256 - 20; y += ch) {
    for (let x = 10; x < 128 - 14; x += cw) {
      const on = Math.random() < 0.42;
      ctx.fillStyle = on ? lit : '#0c1020';
      if (on) ctx.globalAlpha = 0.55 + Math.random() * 0.45;
      ctx.fillRect(x, y, 9, 13);
      ctx.globalAlpha = 1;
    }
  }
  return finish(c, repeatX, repeatY);
}

export function dojoWallTexture(repeatX = 6, repeatY = 1) {
  const c = makeCanvas(256, 256);
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#e8dcc0';
  ctx.fillRect(0, 0, 256, 256);
  noise(ctx, 256, 256, 400, 0.08);
  // wood lattice
  ctx.strokeStyle = '#5c3a1c';
  ctx.lineWidth = 8;
  const cell = 64;
  for (let x = 0; x <= 256; x += cell) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, 256);
    ctx.stroke();
  }
  for (let y = 0; y <= 256; y += cell) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(256, y);
    ctx.stroke();
  }
  // inner paper shading
  ctx.strokeStyle = 'rgba(120,90,50,0.35)';
  ctx.lineWidth = 2;
  for (let x = cell / 2; x < 256; x += cell) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, 256);
    ctx.stroke();
  }
  return finish(c, repeatX, repeatY);
}

export function factoryWallTexture(repeatX = 6, repeatY = 1) {
  const c = makeCanvas(256, 256);
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#2c3138';
  ctx.fillRect(0, 0, 256, 256);
  noise(ctx, 256, 256, 900, 0.2, true);
  // metal panels
  ctx.strokeStyle = 'rgba(0,0,0,0.55)';
  ctx.lineWidth = 3;
  for (let y = 0; y <= 256; y += 64) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(256, y);
    ctx.stroke();
  }
  // rivets
  ctx.fillStyle = 'rgba(200,210,220,0.4)';
  for (let y = 12; y < 256; y += 32) {
    for (let x = 12; x < 256; x += 32) {
      ctx.beginPath();
      ctx.arc(x, y, 2, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  // rust streaks
  for (let i = 0; i < 10; i++) {
    ctx.fillStyle = `rgba(140,70,30,${0.06 + Math.random() * 0.12})`;
    const x = Math.random() * 256;
    ctx.fillRect(x, Math.random() * 180, 4 + Math.random() * 8, 40 + Math.random() * 70);
  }
  return finish(c, repeatX, repeatY);
}

export function crateTexture(repeatX = 1, repeatY = 1) {
  const c = makeCanvas(128, 128);
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#8a5a2e';
  ctx.fillRect(0, 0, 128, 128);
  ctx.fillStyle = '#7a4c22';
  for (let y = 0; y < 128; y += 26) ctx.fillRect(0, y, 128, 22);
  ctx.strokeStyle = '#4a2c10';
  ctx.lineWidth = 10;
  ctx.strokeRect(4, 4, 120, 120);
  ctx.beginPath();
  ctx.moveTo(8, 8);
  ctx.lineTo(120, 120);
  ctx.moveTo(120, 8);
  ctx.lineTo(8, 120);
  ctx.lineWidth = 7;
  ctx.stroke();
  noise(ctx, 128, 128, 260, 0.18);
  return finish(c, repeatX, repeatY);
}

export function hazardTexture(repeatX = 1, repeatY = 1) {
  const c = makeCanvas(128, 128);
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#e8b800';
  ctx.fillRect(0, 0, 128, 128);
  ctx.fillStyle = '#1a1a1a';
  ctx.save();
  ctx.translate(64, 64);
  ctx.rotate(-Math.PI / 4);
  for (let x = -128; x < 128; x += 32) ctx.fillRect(x, -128, 16, 256);
  ctx.restore();
  return finish(c, repeatX, repeatY);
}

export function skyTexture(top = '#0a0d1a', mid = '#232a4d', bottom = '#3a3f66') {
  const c = makeCanvas(4, 256);
  const ctx = c.getContext('2d');
  const grad = ctx.createLinearGradient(0, 0, 0, 256);
  grad.addColorStop(0, top);
  grad.addColorStop(0.55, mid);
  grad.addColorStop(1, bottom);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 4, 256);
  // stars in the upper part
  ctx.fillStyle = 'rgba(255,255,255,0.8)';
  for (let i = 0; i < 40; i++) {
    const y = Math.random() * 110;
    ctx.globalAlpha = 0.2 + Math.random() * 0.7;
    ctx.fillRect(Math.random() * 4, y, 1, 1);
  }
  ctx.globalAlpha = 1;
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  return tex;
}

export function neonSignTexture(colorA = '#ff2d8a', colorB = '#33e6ff') {
  const c = makeCanvas(64, 128);
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#0a0a12';
  ctx.fillRect(0, 0, 64, 128);
  const grad = ctx.createLinearGradient(0, 0, 0, 128);
  grad.addColorStop(0, colorA);
  grad.addColorStop(1, colorB);
  ctx.fillStyle = grad;
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 3;
  // abstract glyph blocks
  for (let i = 0; i < 3; i++) {
    const y = 18 + i * 36;
    ctx.strokeRect(14, y, 36, 22);
    ctx.fillRect(20, y + 5, 24, 4);
  }
  ctx.strokeStyle = grad;
  ctx.lineWidth = 2;
  ctx.strokeRect(2, 2, 60, 124);
  return finish(c, 1, 1);
}

export function particleTexture() {
  const c = makeCanvas(64, 64);
  const ctx = c.getContext('2d');
  const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.35, 'rgba(255,255,255,0.8)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 64, 64);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function sparkTexture() {
  const c = makeCanvas(64, 64);
  const ctx = c.getContext('2d');
  ctx.translate(32, 32);
  ctx.fillStyle = 'rgba(255,255,255,1)';
  for (let i = 0; i < 4; i++) {
    ctx.rotate(Math.PI / 4);
    ctx.fillRect(-2, -28, 4, 24);
  }
  ctx.beginPath();
  ctx.arc(0, 0, 7, 0, Math.PI * 2);
  ctx.fill();
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function drumstickTexture() {
  const c = makeCanvas(64, 64);
  const ctx = c.getContext('2d');
  ctx.clearRect(0, 0, 64, 64);
  ctx.fillStyle = '#c98a3d';
  ctx.beginPath();
  ctx.ellipse(42, 28, 16, 13, 0.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#e8e0d0';
  ctx.fillRect(10, 34, 30, 8);
  ctx.beginPath();
  ctx.arc(10, 38, 7, 0, Math.PI * 2);
  ctx.fill();
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
