import * as THREE from 'three';
import { Random } from '../utils/Random';

const SPAWN_INTERVAL = 0.55;
const WIND = 0.12;

interface Puff {
  active: boolean;
  age: number;
  lifetime: number;
  position: THREE.Vector3;
  velocity: THREE.Vector3;
}

/**
 * Дым из труб и костра: InstancedMesh низкополигональных сфер, которые поднимаются,
 * растут и растворяются (уменьшаются до нуля). Один draw call на все клубы.
 */
export class SmokeSystem {
  readonly mesh: THREE.InstancedMesh;
  private readonly puffs: Puff[] = [];
  private readonly random = new Random(99);
  private readonly matrix = new THREE.Matrix4();
  private readonly hidden = new THREE.Matrix4().makeScale(0, 0, 0);
  private readonly identity = new THREE.Quaternion();
  private readonly scale = new THREE.Vector3();
  private timer = 0;

  constructor(material: THREE.Material, private readonly emitters: readonly THREE.Vector3[], capacity = 96) {
    this.mesh = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 0), material, capacity);
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.mesh.frustumCulled = false;
    for (let i = 0; i < capacity; i++) {
      this.puffs.push({ active: false, age: 0, lifetime: 1, position: new THREE.Vector3(), velocity: new THREE.Vector3() });
      this.mesh.setMatrixAt(i, this.hidden);
    }
  }

  update(dt: number): void {
    this.timer += dt;
    while (this.timer >= SPAWN_INTERVAL) {
      this.timer -= SPAWN_INTERVAL;
      for (const emitter of this.emitters) this.spawn(emitter);
    }

    for (let i = 0; i < this.puffs.length; i++) {
      const puff = this.puffs[i];
      if (puff.active) {
        puff.age += dt;
        if (puff.age >= puff.lifetime) {
          puff.active = false;
        } else {
          puff.position.addScaledVector(puff.velocity, dt);
          puff.position.x += WIND * dt;
          const progress = puff.age / puff.lifetime;
          this.scale.setScalar(0.15 + 0.5 * progress);
          this.matrix.compose(puff.position, this.identity, this.scale);
          this.mesh.setMatrixAt(i, this.matrix);
          continue;
        }
      }
      this.mesh.setMatrixAt(i, this.hidden);
    }
    this.mesh.instanceMatrix.needsUpdate = true;
  }

  private spawn(emitter: THREE.Vector3): void {
    const puff = this.puffs.find((candidate) => !candidate.active);
    if (!puff) return;
    puff.active = true;
    puff.age = 0;
    puff.lifetime = this.random.range(2.6, 3.4);
    puff.position.set(
      emitter.x + this.random.range(-0.05, 0.05),
      emitter.y,
      emitter.z + this.random.range(-0.05, 0.05),
    );
    puff.velocity.set(this.random.range(-0.03, 0.03), this.random.range(0.55, 0.75), this.random.range(-0.03, 0.03));
  }
}
