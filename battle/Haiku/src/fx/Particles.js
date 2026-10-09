// Частицы (искры, пыль, взрывы): один Points-объект и кольцевой пул фиксированного размера.
// На кадр не создаётся ни одного объекта — все буферы выделяются один раз.
import * as THREE from 'three';
import { glowTex } from '../assets/Textures.js';

const CAPACITY = 700;

export class Particles {
  constructor(scene) {
    this.pos = new Float32Array(CAPACITY * 3);
    this.vel = new Float32Array(CAPACITY * 3);
    this.col = new Float32Array(CAPACITY * 3);
    this.base = new Float32Array(CAPACITY * 3);
    this.life = new Float32Array(CAPACITY);
    this.maxLife = new Float32Array(CAPACITY);
    this.gravity = new Float32Array(CAPACITY);
    this.next = 0;

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(this.pos, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(this.col, 3));
    const material = new THREE.PointsMaterial({
      size: 0.22,
      map: glowTex(),
      vertexColors: true,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending, // тёмный цвет при аддитивном смешивании невидим — удобно для затухания
    });
    this.points = new THREE.Points(geometry, material);
    this.points.frustumCulled = false;
    scene.add(this.points);
  }

  emit(x, y, z, count, color, { speed = 3, life = 0.4, gravity = 0, up = 0 } = {}) {
    const c = new THREE.Color(color);
    for (let n = 0; n < count; n++) {
      const i = this.next;
      const j = i * 3;
      this.next = (this.next + 1) % CAPACITY;
      const angle = Math.random() * Math.PI * 2;
      const s = speed * (0.4 + Math.random() * 0.6);
      this.pos[j] = x;
      this.pos[j + 1] = y;
      this.pos[j + 2] = z;
      this.vel[j] = Math.cos(angle) * s;
      this.vel[j + 1] = Math.sin(angle) * s + up;
      this.vel[j + 2] = (Math.random() - 0.5) * s * 0.5;
      this.base[j] = c.r;
      this.base[j + 1] = c.g;
      this.base[j + 2] = c.b;
      this.life[i] = life * (0.7 + Math.random() * 0.6);
      this.maxLife[i] = this.life[i];
      this.gravity[i] = gravity;
    }
  }

  // Искры удара: яркая вспышка в точке контакта
  spark(x, y, z, color = 0xffe08a) {
    this.emit(x, y, z, 10, color, { speed: 4, life: 0.25, gravity: -12 });
  }

  // Пыль у ног при приземлении и рывках
  dust(x, z) {
    this.emit(x, 0.1, z, 8, 0xcfc6b4, { speed: 1.4, life: 0.45, up: 1.2 });
  }

  update(dt) {
    const { pos, vel, col, life } = this;
    for (let i = 0; i < CAPACITY; i++) {
      if (life[i] <= 0) continue;
      const j = i * 3;
      life[i] -= dt;
      vel[j + 1] += this.gravity[i] * dt;
      pos[j] += vel[j] * dt;
      pos[j + 1] += vel[j + 1] * dt;
      pos[j + 2] += vel[j + 2] * dt;
      if (life[i] <= 0) {
        col[j] = col[j + 1] = col[j + 2] = 0;
        pos[j + 1] = -100;
        continue;
      }
      const f = life[i] / this.maxLife[i];
      col[j] = this.base[j] * f;
      col[j + 1] = this.base[j + 1] * f;
      col[j + 2] = this.base[j + 2] * f;
    }
    this.points.geometry.attributes.position.needsUpdate = true;
    this.points.geometry.attributes.color.needsUpdate = true;
  }
}
