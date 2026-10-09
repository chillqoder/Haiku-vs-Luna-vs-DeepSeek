import * as THREE from 'three';

export function makeBrickTexture(base, mortar, seed = 1) {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, 256, 128);
  for (let row = 0; row < 8; row += 1) {
    const offset = row % 2 ? 16 : 0;
    for (let col = -1; col < 8; col += 1) {
      const x = col * 32 + offset;
      const shade = ((row * 17 + col * 11 + seed * 13) % 5) - 2;
      ctx.fillStyle = `rgba(255,255,255,${0.025 + Math.abs(shade) * 0.006})`;
      ctx.fillRect(x + 1, row * 16 + 1, 30, 14);
      ctx.fillStyle = mortar;
      ctx.fillRect(x, row * 16, 31, 1.5);
      ctx.fillRect(x, row * 16, 1.5, 16);
    }
  }
  for (let i = 0; i < 280; i += 1) {
    ctx.fillStyle = `rgba(3,8,14,${Math.random() * 0.12})`;
    ctx.fillRect(Math.random() * 256, Math.random() * 128, 1, 1);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(4, 2);
  return texture;
}
