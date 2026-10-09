import * as THREE from 'three';
import { Random } from '../utils/Random';
import type { WorldMaterials } from './Materials';
import type { Point2 } from './Layout';
import { Placement, type StaticBatch } from './StaticBatch';

const TAU = Math.PI * 2;

export function addPine(batch: StaticBatch, m: WorldMaterials, position: Point2, scale: number, yaw: number): void {
  const place = new Placement(batch, [position[0], 0, position[1]], yaw);
  place.cylinder(m.trunk, [0, 0.35 * scale, 0], 0.12 * scale, 0.16 * scale, 0.7 * scale, 5);
  place.cone(m.pineDark, [0, 1.1 * scale, 0], 0.9 * scale, 1.1 * scale, 7);
  place.cone(m.pine, [0, 1.7 * scale, 0], 0.7 * scale, 0.95 * scale, 7);
  place.cone(m.pineDark, [0, 2.25 * scale, 0], 0.5 * scale, 0.8 * scale, 7);
}

export function addOak(batch: StaticBatch, m: WorldMaterials, position: Point2, scale: number, yaw: number): void {
  const place = new Placement(batch, [position[0], 0, position[1]], yaw);
  place.cylinder(m.trunk, [0, 0.45 * scale, 0], 0.14 * scale, 0.18 * scale, 0.9 * scale, 5);
  place.put(m.oak, new THREE.IcosahedronGeometry(0.85 * scale, 0), [0, 1.45 * scale, 0]);
  place.put(m.oak, new THREE.IcosahedronGeometry(0.55 * scale, 0), [0.45 * scale, 1.05 * scale, 0.2 * scale]);
  place.put(m.oak, new THREE.IcosahedronGeometry(0.5 * scale, 0), [-0.42 * scale, 1.2 * scale, -0.25 * scale]);
}

export function addBush(batch: StaticBatch, m: WorldMaterials, position: Point2, radius: number): void {
  const place = new Placement(batch, [position[0], 0, position[1]]);
  place.put(m.bush, new THREE.IcosahedronGeometry(radius, 0), [0, radius * 0.6, 0]);
}

export function addFlower(batch: StaticBatch, material: THREE.Material, position: Point2): void {
  const place = new Placement(batch, [position[0], 0, position[1]]);
  place.put(material, new THREE.IcosahedronGeometry(0.09, 0), [0, 0.09, 0]);
}

/**
 * Облака из низкополигональных комков. Кружат по орбите под островом, не пересекая его,
 * поэтому анимация не требует проверок коллизий.
 */
export class CloudField {
  readonly group = new THREE.Group();
  private readonly clouds: Array<{ object: THREE.Group; angle: number; radius: number; height: number; speed: number }> = [];

  constructor(material: THREE.Material, random: Random) {
    for (let i = 0; i < 7; i++) {
      const cloud = new THREE.Group();
      const puffCount = 4 + Math.floor(random.range(0, 3));
      for (let p = 0; p < puffCount; p++) {
        const puff = new THREE.Mesh(new THREE.IcosahedronGeometry(random.range(1.1, 1.9), 0), material);
        puff.position.set((p - puffCount / 2) * 1.4 + random.range(-0.4, 0.4), random.range(-0.2, 0.5), random.range(-0.8, 0.8));
        puff.scale.y = 0.7;
        cloud.add(puff);
      }
      this.clouds.push({
        object: cloud,
        angle: (i / 7) * TAU + random.range(-0.2, 0.2),
        radius: random.range(18, 26),
        height: random.range(-11, -5),
        speed: random.range(0.012, 0.03),
      });
      this.group.add(cloud);
    }
    this.update(0);
  }

  update(dt: number): void {
    for (const cloud of this.clouds) {
      cloud.angle += cloud.speed * dt;
      cloud.object.position.set(Math.cos(cloud.angle) * cloud.radius, cloud.height, Math.sin(cloud.angle) * cloud.radius);
      cloud.object.rotation.y = -cloud.angle;
    }
  }
}
