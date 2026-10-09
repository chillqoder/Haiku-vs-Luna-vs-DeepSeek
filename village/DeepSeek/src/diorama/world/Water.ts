import * as THREE from 'three';
import { POND } from './layout';
import { PALETTE } from './palette';

interface Ripple {
  mesh: THREE.Mesh;
  material: THREE.MeshBasicMaterial;
  age: number;
  life: number;
  active: boolean;
}

/**
 * Pond surface plus a pooled ring-ripple system. Ripples are spawned by the
 * fisherman controller through the shared simulation context.
 */
export class Water {
  readonly group = new THREE.Group();
  readonly surfaceY = POND.surfaceY;

  private readonly centerX = POND.center[0];
  private readonly centerZ = POND.center[1];
  private readonly radius = POND.radius;
  private readonly ripples: Ripple[] = [];
  private cursor = 0;

  constructor() {
    this.group.name = 'water';

    const basin = new THREE.Mesh(
      new THREE.CircleGeometry(this.radius - 0.15, 22),
      new THREE.MeshStandardMaterial({
        color: PALETTE.water,
        flatShading: true,
        transparent: true,
        opacity: 0.88,
        roughness: 0.35,
        metalness: 0,
      }),
    );
    basin.rotation.x = -Math.PI / 2;
    basin.position.set(this.centerX, this.surfaceY, this.centerZ);
    basin.receiveShadow = true;
    this.group.add(basin);

    const depths = new THREE.Mesh(
      new THREE.CircleGeometry(this.radius - 0.9, 18),
      new THREE.MeshStandardMaterial({
        color: PALETTE.waterDeep,
        flatShading: true,
        roughness: 0.4,
      }),
    );
    depths.rotation.x = -Math.PI / 2;
    depths.position.set(this.centerX, this.surfaceY - 0.006, this.centerZ);
    this.group.add(depths);

    for (let i = 0; i < 10; i++) {
      const material = new THREE.MeshBasicMaterial({
        color: PALETTE.ripple,
        transparent: true,
        opacity: 0,
        depthWrite: false,
        side: THREE.DoubleSide,
      });
      const ring = new THREE.Mesh(new THREE.RingGeometry(0.42, 0.5, 18), material);
      ring.rotation.x = -Math.PI / 2;
      ring.position.y = this.surfaceY + 0.02;
      ring.visible = false;
      this.group.add(ring);
      this.ripples.push({ mesh: ring, material, age: 0, life: 2.2, active: false });
    }
  }

  spawnRipple(x: number, z: number): void {
    let targetX = x;
    let targetZ = z;
    const dx = x - this.centerX;
    const dz = z - this.centerZ;
    const distance = Math.hypot(dx, dz);
    const maxDistance = this.radius - 0.45;
    if (distance > maxDistance) {
      const scale = maxDistance / (distance || 1);
      targetX = this.centerX + dx * scale;
      targetZ = this.centerZ + dz * scale;
    }

    const ripple = this.ripples[this.cursor];
    this.cursor = (this.cursor + 1) % this.ripples.length;
    ripple.active = true;
    ripple.age = 0;
    ripple.mesh.visible = true;
    ripple.mesh.scale.setScalar(1);
    ripple.mesh.position.set(targetX, this.surfaceY + 0.02, targetZ);
  }

  update(_elapsed: number, dt: number): void {
    for (const ripple of this.ripples) {
      if (!ripple.active) continue;
      ripple.age += dt;
      const progress = ripple.age / ripple.life;
      if (progress >= 1) {
        ripple.active = false;
        ripple.mesh.visible = false;
        ripple.material.opacity = 0;
        continue;
      }
      const scale = 0.4 + progress * 2.6;
      ripple.mesh.scale.set(scale, scale, scale);
      ripple.material.opacity = (1 - progress) * 0.55;
    }
  }
}
