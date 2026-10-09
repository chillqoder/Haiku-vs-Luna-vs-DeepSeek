// GPU-light particle system built on THREE.Points with a pooled buffer.

import * as THREE from 'three';
import { particleTexture } from './Textures.js';

const MAX = 600;

export class ParticleSystem {
  constructor(scene) {
    this.scene = scene;
    this.count = 0;

    const geo = new THREE.BufferGeometry();
    this.positions = new Float32Array(MAX * 3);
    this.colors = new Float32Array(MAX * 3);
    this.sizes = new Float32Array(MAX);
    this.alphas = new Float32Array(MAX);
    for (let i = 0; i < MAX; i++) {
      this.positions[i * 3 + 1] = -999;
    }
    geo.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    geo.setAttribute('aColor', new THREE.BufferAttribute(this.colors, 3));
    geo.setAttribute('aSize', new THREE.BufferAttribute(this.sizes, 1));
    geo.setAttribute('aAlpha', new THREE.BufferAttribute(this.alphas, 1));

    this.material = new THREE.ShaderMaterial({
      uniforms: {
        uMap: { value: particleTexture() },
        uScale: { value: 420 },
      },
      vertexShader: `
        uniform float uScale;
        attribute vec3 aColor;
        attribute float aSize;
        attribute float aAlpha;
        varying vec3 vColor;
        varying float vAlpha;
        void main() {
          vColor = aColor;
          vAlpha = aAlpha;
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = aSize * (uScale / -mv.z);
          gl_Position = projectionMatrix * mv;
        }
      `,
      fragmentShader: `
        uniform sampler2D uMap;
        varying vec3 vColor;
        varying float vAlpha;
        void main() {
          vec4 tex = texture2D(uMap, gl_PointCoord);
          gl_FragColor = vec4(vColor, tex.a * vAlpha);
          if (gl_FragColor.a < 0.01) discard;
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    this.points = new THREE.Points(geo, this.material);
    this.points.frustumCulled = false;
    scene.add(this.points);

    this.particles = []; // {pos, vel, life, maxLife, size, color, gravity, fade}
  }

  spawnMany(opts) {
    const {
      position,
      count = 10,
      color = 0xffee88,
      size = 0.35,
      speed = 4,
      spread = 1,
      upward = 0.5,
      life = 0.5,
      gravity = -14,
      direction = null,
      sizeJitter = 0.3,
    } = opts;

    for (let i = 0; i < count; i++) {
      if (this.particles.length >= MAX) break;
      const dir = direction
        ? new THREE.Vector3(
            direction.x + (Math.random() - 0.5) * spread,
            direction.y + (Math.random() - 0.5) * spread + upward,
            direction.z + (Math.random() - 0.5) * spread
          ).normalize()
        : new THREE.Vector3(
            (Math.random() - 0.5) * 2,
            Math.random() * upward * 2 + 0.2,
            (Math.random() - 0.5) * 2
          ).normalize();
      const spd = speed * (0.5 + Math.random());
      this.particles.push({
        pos: new THREE.Vector3(
          position.x + (Math.random() - 0.5) * 0.3,
          position.y + (Math.random() - 0.5) * 0.3,
          position.z + (Math.random() - 0.5) * 0.3
        ),
        vel: dir.multiplyScalar(spd),
        life: life * (0.6 + Math.random() * 0.7),
        maxLife: life,
        size: size * (1 - sizeJitter / 2 + Math.random() * sizeJitter),
        color: new THREE.Color(color),
        gravity,
      });
    }
  }

  hitSpark(pos, heavy = false) {
    this.spawnMany({
      position: pos,
      count: heavy ? 22 : 12,
      color: heavy ? 0xffdd55 : 0xfff3b0,
      size: heavy ? 0.55 : 0.38,
      speed: heavy ? 9 : 6,
      upward: 0.7,
      life: heavy ? 0.45 : 0.3,
      gravity: -20,
    });
  }

  blockSpark(pos) {
    this.spawnMany({
      position: pos,
      count: 8,
      color: 0x9fd8ff,
      size: 0.3,
      speed: 5,
      upward: 0.8,
      life: 0.25,
      gravity: -10,
    });
  }

  dust(pos, count = 8) {
    this.spawnMany({
      position: { x: pos.x, y: 0.08, z: pos.z },
      count,
      color: 0x9a9488,
      size: 0.5,
      speed: 2.2,
      upward: 0.6,
      life: 0.5,
      gravity: -2,
    });
  }

  debris(pos, color = 0x8a5a2e) {
    this.spawnMany({
      position: pos,
      count: 16,
      color,
      size: 0.4,
      speed: 7,
      upward: 0.9,
      life: 0.8,
      gravity: -24,
    });
  }

  koBurst(pos, color = 0xffd23d) {
    this.spawnMany({
      position: pos,
      count: 30,
      color,
      size: 0.5,
      speed: 10,
      upward: 1.0,
      life: 0.7,
      gravity: -18,
    });
  }

  shockwave(pos, color = 0xffaa44) {
    this.spawnMany({
      position: { x: pos.x, y: 0.15, z: pos.z },
      count: 36,
      color,
      size: 0.6,
      speed: 12,
      spread: 0.12,
      upward: 0.12,
      life: 0.6,
      gravity: -4,
    });
  }

  update(dt) {
    let visible = 0;
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dt;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
        continue;
      }
      p.vel.y += p.gravity * dt;
      p.pos.addScaledVector(p.vel, dt);
      if (p.pos.y < 0.03) {
        p.pos.y = 0.03;
        p.vel.y *= -0.3;
        p.vel.x *= 0.7;
        p.vel.z *= 0.7;
      }
    }

    const n = Math.min(this.particles.length, MAX);
    for (let i = 0; i < n; i++) {
      const p = this.particles[i];
      const t = Math.max(0, p.life / p.maxLife);
      this.positions[i * 3] = p.pos.x;
      this.positions[i * 3 + 1] = p.pos.y;
      this.positions[i * 3 + 2] = p.pos.z;
      this.colors[i * 3] = p.color.r;
      this.colors[i * 3 + 1] = p.color.g;
      this.colors[i * 3 + 2] = p.color.b;
      this.sizes[i] = p.size * (0.5 + t * 0.5);
      this.alphas[i] = t;
      visible = i + 1;
    }
    // Hide the rest
    for (let i = visible; i < MAX; i++) {
      this.positions[i * 3 + 1] = -999;
      this.alphas[i] = 0;
    }

    const geo = this.points.geometry;
    geo.attributes.position.needsUpdate = true;
    geo.attributes.aColor.needsUpdate = true;
    geo.attributes.aSize.needsUpdate = true;
    geo.attributes.aAlpha.needsUpdate = true;
    geo.setDrawRange(0, MAX);
  }

  clear() {
    this.particles = [];
    for (let i = 0; i < MAX; i++) {
      this.positions[i * 3 + 1] = -999;
      this.alphas[i] = 0;
    }
  }
}
