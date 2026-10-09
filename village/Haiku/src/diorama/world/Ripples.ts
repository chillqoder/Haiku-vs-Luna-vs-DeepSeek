import * as THREE from 'three';
import { ISLAND } from './Layout';

const LIFETIME = 1.6;
const MIN_SCALE = 0.4;
const MAX_SCALE = 2.4;

interface Ripple {
  mesh: THREE.Mesh;
  material: THREE.MeshBasicMaterial;
  age: number;
  active: boolean;
}

/**
 * Низкополигональные кольца на поверхности пруда: расходятся, светлеют и гаснут.
 * Пул фиксированного размера, переиспользуется без аллокаций во время работы.
 */
export class RippleSystem {
  readonly group = new THREE.Group();
  private readonly ripples: Ripple[] = [];

  constructor(capacity = 12) {
    const geometry = new THREE.RingGeometry(0.4, 0.5, 12);
    geometry.rotateX(-Math.PI / 2);
    for (let i = 0; i < capacity; i++) {
      const material = new THREE.MeshBasicMaterial({
        color: '#e8faff',
        transparent: true,
        opacity: 0,
        depthWrite: false,
      });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.visible = false;
      mesh.renderOrder = 1;
      this.group.add(mesh);
      this.ripples.push({ mesh, material, age: 0, active: false });
    }
  }

  spawn(x: number, z: number): void {
    const free = this.ripples.find((ripple) => !ripple.active);
    const ripple = free ?? this.ripples.reduce((oldest, candidate) => (candidate.age > oldest.age ? candidate : oldest));
    ripple.active = true;
    ripple.age = 0;
    ripple.mesh.position.set(x, ISLAND.waterLevel + 0.02, z);
    ripple.mesh.visible = true;
  }

  update(dt: number): void {
    for (const ripple of this.ripples) {
      if (!ripple.active) continue;
      ripple.age += dt;
      const progress = ripple.age / LIFETIME;
      if (progress >= 1) {
        ripple.active = false;
        ripple.mesh.visible = false;
        continue;
      }
      ripple.mesh.scale.setScalar(THREE.MathUtils.lerp(MIN_SCALE, MAX_SCALE, progress));
      ripple.material.opacity = 0.75 * (1 - progress);
    }
  }
}
