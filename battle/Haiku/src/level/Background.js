// Фон: параллакс-слои. Небо неподвижно относительно камеры, дальние силуэты движутся медленнее
// ближних — это даёт глубину в 2.5D. Смещение достигается сдвигом UV-текстуры.
import * as THREE from 'three';
import { gradientTex, skylineTex, shojiTex, factoryTex } from '../assets/Textures.js';

// k — доля скорости камеры, с которой слой смещается относительно неё (0 — небо, 0.35 — ближний)
const THEMES = {
  street: [
    { z: -26, w: 90, h: 40, y: 14, k: 0, repeat: 1, tex: () => gradientTex('skyNight', '#0b0f2a', '#2b1f4a') },
    {
      z: -18, w: 50, h: 22, y: 5, k: 0.12, repeat: 2,
      tex: () => skylineTex('skyFar', { body: '#1a1f3d', windowOn: '#2a3a6e', windowOff: '#171c34', seed: 5, minH: 0.4, maxH: 0.95 }),
    },
    {
      z: -10, w: 44, h: 14, y: 2.5, k: 0.35, repeat: 2,
      tex: () => skylineTex('skyNear', { body: '#2a2440', windowOn: '#ffcf6b', windowOff: '#241f36', seed: 9, minH: 0.3, maxH: 0.8 }),
    },
  ],
  dojo: [
    { z: -26, w: 90, h: 40, y: 14, k: 0, repeat: 1, tex: () => gradientTex('skyDojo', '#f7b977', '#f6e3c4') },
    {
      z: -18, w: 50, h: 22, y: 5, k: 0.12, repeat: 2,
      tex: () => skylineTex('hillsFar', { body: '#6b8a6a', windowOn: '#6b8a6a', windowOff: '#5d7a5c', seed: 17, minH: 0.25, maxH: 0.55 }),
    },
    { z: -10, w: 44, h: 14, y: 2.5, k: 0.35, repeat: 2, tex: () => shojiTex() },
  ],
  industrial: [
    { z: -26, w: 90, h: 40, y: 14, k: 0, repeat: 1, tex: () => gradientTex('skyIndustrial', '#3a3d46', '#8a7a6a') },
    { z: -18, w: 50, h: 22, y: 5, k: 0.12, repeat: 2, tex: () => factoryTex() },
    {
      z: -10, w: 44, h: 14, y: 2.5, k: 0.35, repeat: 2,
      tex: () => skylineTex('factoryNear', { body: '#2d2f36', windowOn: '#ff9a3c', windowOff: '#25272e', seed: 13, minH: 0.2, maxH: 0.6 }),
    },
  ],
};

export class Background {
  constructor(group, themeId) {
    this.layers = THEMES[themeId].map((layer) => {
      const map = layer.tex();
      map.repeat.set(layer.repeat, 1);
      const material = new THREE.MeshBasicMaterial({ map, transparent: true, depthWrite: false, fog: false });
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(layer.w, layer.h), material);
      mesh.position.set(0, layer.y, layer.z);
      group.add(mesh);
      return { mesh, map, k: layer.k, repeat: layer.repeat, w: layer.w };
    });
  }

  // centerX — центр видимой части уровня. Плоскость следует за камерой, а текстура едет со своей скоростью.
  update(centerX) {
    for (const layer of this.layers) {
      layer.mesh.position.x = centerX;
      layer.map.offset.x = (centerX * layer.k * layer.repeat) / layer.w;
    }
  }
}
