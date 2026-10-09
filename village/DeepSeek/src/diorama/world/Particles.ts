import * as THREE from 'three';
import { PALETTE } from './palette';

export interface SmokeOptions {
  count?: number;
  color?: string;
  size?: number;
  rise?: number;
  spread?: number;
  life?: number;
  opacity?: number;
}

/**
 * Low-poly chimney/fire smoke: a persistent THREE.Points cloud whose
 * particles rise, wobble and recycle, staggered so the plume is continuous
 * from the first frame.
 */
export class SmokeEmitter {
  readonly points: THREE.Points;

  private readonly positions: Float32Array;
  private readonly ages: Float32Array;
  private readonly origin: THREE.Vector3;
  private readonly options: Required<SmokeOptions>;

  constructor(origin: THREE.Vector3, options: SmokeOptions = {}) {
    this.origin = origin.clone();
    this.options = {
      count: options.count ?? 22,
      color: options.color ?? PALETTE.smoke,
      size: options.size ?? 0.22,
      rise: options.rise ?? 0.55,
      spread: options.spread ?? 0.35,
      life: options.life ?? 3.2,
      opacity: options.opacity ?? 0.5,
    };

    const count = this.options.count;
    this.positions = new Float32Array(count * 3);
    this.ages = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      this.ages[i] = (i / count) * this.options.life;
      this.positions[i * 3] = origin.x;
      this.positions[i * 3 + 1] = origin.y;
      this.positions[i * 3 + 2] = origin.z;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    const material = new THREE.PointsMaterial({
      color: this.options.color,
      size: this.options.size,
      transparent: true,
      opacity: this.options.opacity,
      depthWrite: false,
      sizeAttenuation: true,
    });
    this.points = new THREE.Points(geometry, material);
    this.points.frustumCulled = false;
    this.points.name = 'smoke';
    this.update(0);
  }

  update(dt: number): void {
    const { rise, spread, life } = this.options;
    for (let i = 0; i < this.ages.length; i++) {
      let age = this.ages[i] + dt;
      if (age >= life) age -= life;
      this.ages[i] = age;

      const progress = age / life;
      const wobbleX = Math.sin(i * 12.9898 + age * 1.7) * spread;
      const wobbleZ = Math.cos(i * 78.233 + age * 1.3) * spread;
      this.positions[i * 3] = this.origin.x + wobbleX * progress * 3;
      this.positions[i * 3 + 1] = this.origin.y + age * rise;
      this.positions[i * 3 + 2] = this.origin.z + wobbleZ * progress * 3;
    }
    const attribute = this.points.geometry.getAttribute('position');
    attribute.needsUpdate = true;
  }
}
