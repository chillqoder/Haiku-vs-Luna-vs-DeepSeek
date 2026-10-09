import * as THREE from 'three';
import { Random } from '../utils/Random';
import type { WorldMaterials } from './Materials';
import { TERRACE, type Point2, type Point3 } from './Layout';
import { Placement, StaticBatch, triangleGeometry, type Vec3 } from './StaticBatch';

const TAU = Math.PI * 2;

/** Угол поворота, при котором локальная ось +Z здания смотрит из from в to. */
export function yawTowards(from: Point2, to: Point2): number {
  return Math.atan2(to[0] - from[0], to[1] - from[1]);
}

/** Скальная терраса под крепость и валуны у её подножия. */
export function buildTerrace(batch: StaticBatch, m: WorldMaterials, random: Random): void {
  const place = new Placement(batch, [TERRACE.center[0], 0.2, TERRACE.center[1]]);
  place.cylinder(m.rock, [0, 0, 0], TERRACE.radius, TERRACE.bottomRadius, 1.6, 9);
  for (let i = 0; i < 7; i++) {
    const angle = (i / 7) * TAU + random.range(-0.2, 0.2);
    const radius = random.range(5.4, 6.0);
    place.put(
      i % 2 ? m.rockDark : m.rock,
      new THREE.IcosahedronGeometry(random.range(0.35, 0.55), 0),
      [Math.cos(angle) * radius, -0.4, Math.sin(angle) * radius],
      [random.range(0, 3), random.range(0, 3), 0],
    );
  }
}

/**
 * Крепость на террасе: квадратная стена с воротами на юге, четыре башни, донжон
 * и балкон на южном фасаде, с которого наблюдает король (его позиция задана в манифесте).
 */
export function buildCastle(batch: StaticBatch, m: WorldMaterials): void {
  const half = 3.0;
  const wallHeight = 2.2;
  const wall = 0.55;
  const gate = 0.9;
  const place = new Placement(batch, [TERRACE.center[0], TERRACE.top, TERRACE.center[1]]);

  place.box(m.stone, [0, wallHeight / 2, -half], [2 * half + wall, wallHeight, wall]);
  place.box(m.stone, [half, wallHeight / 2, 0], [wall, wallHeight, 2 * half]);
  place.box(m.stone, [-half, wallHeight / 2, 0], [wall, wallHeight, 2 * half]);
  const sideLength = half - gate;
  place.box(m.stone, [-(gate + half) / 2, wallHeight / 2, half], [sideLength, wallHeight, wall]);
  place.box(m.stone, [(gate + half) / 2, wallHeight / 2, half], [sideLength, wallHeight, wall]);
  place.box(m.stoneDark, [0, wallHeight - 0.25, half], [2 * gate, 0.5, wall]);
  place.box(m.woodDark, [0, 0.85, half], [2 * gate - 0.2, 1.7, 0.1]);

  // Зубцы по верху стен
  for (let x = -half + 0.35; x <= half - 0.35; x += 0.7) {
    place.box(m.stone, [x, wallHeight + 0.17, -half], [0.34, 0.34, wall]);
    if (Math.abs(x) > gate + 0.2) place.box(m.stone, [x, wallHeight + 0.17, half], [0.34, 0.34, wall]);
  }
  for (let z = -half + 0.35; z <= half - 0.35; z += 0.7) {
    place.box(m.stone, [half, wallHeight + 0.17, z], [wall, 0.34, 0.34]);
    place.box(m.stone, [-half, wallHeight + 0.17, z], [wall, 0.34, 0.34]);
  }

  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      place.cylinder(m.stone, [sx * half, 1.5, sz * half], 0.85, 0.9, 3.0, 8);
      place.cone(m.roofRed, [sx * half, 3.55, sz * half], 1.0, 1.1, 8);
    }
  }

  // Донжон и балкон на южной стороне
  const keep = 2.2;
  const keepHeight = 4.2;
  place.box(m.stone, [0, keepHeight / 2, 0], [keep, keepHeight, keep]);
  place.cone(m.roofRed, [0, keepHeight + 0.8, 0], 1.75, 1.6, 4, Math.PI / 4);
  place.box(m.window, [keep / 2 + 0.02, 2.0, 0], [0.04, 0.5, 0.36]);
  place.box(m.window, [-keep / 2 - 0.02, 2.0, 0], [0.04, 0.5, 0.36]);
  place.box(m.woodLight, [0, 3.04, 1.45], [2.0, 0.12, 0.7]);
  place.box(m.woodDark, [0, 3.35, 1.78], [2.0, 0.5, 0.06]);
  place.box(m.woodDark, [-1.0, 3.35, 1.45], [0.06, 0.5, 0.7]);
  place.box(m.woodDark, [1.0, 3.35, 1.45], [0.06, 0.5, 0.7]);

  // Знамёна и флаг на крыше
  place.box(m.banner, [keep / 2 + 0.03, 2.8, 0], [0.06, 1.0, 0.6]);
  place.box(m.banner, [-keep / 2 - 0.03, 2.8, 0], [0.06, 1.0, 0.6]);
  place.cylinder(m.woodDark, [0, keepHeight + 2.1, 0], 0.03, 0.03, 1.0, 5);
  place.box(m.banner, [0.28, keepHeight + 2.25, 0], [0.5, 0.3, 0.03]);
}

/** Крыша двускатная, конёк вдоль оси Z. Фронтоны выделены отдельно, чтобы красить их штукатуркой. */
function gableRoof(span: number, length: number, rise: number): { slopes: THREE.BufferGeometry; gables: THREE.BufferGeometry } {
  const hs = span / 2;
  const hl = length / 2;
  const a = new THREE.Vector3(-hs, 0, -hl);
  const b = new THREE.Vector3(-hs, 0, hl);
  const c = new THREE.Vector3(0, rise, -hl);
  const d = new THREE.Vector3(0, rise, hl);
  const e = new THREE.Vector3(hs, 0, -hl);
  const f = new THREE.Vector3(hs, 0, hl);
  const inside = new THREE.Vector3(0, rise * 0.3, 0);
  return {
    slopes: triangleGeometry([[a, b, d], [a, d, c], [c, e, f], [c, f, d]], inside),
    gables: triangleGeometry([[a, c, e], [b, f, d]], inside),
  };
}

/** Коттедж из белёного фахверка с крышей и трубой. Возвращает мировую точку выхода дыма. */
export function buildCottage(batch: StaticBatch, m: WorldMaterials, position: Point2, yaw: number, roof: THREE.Material): THREE.Vector3 {
  const width = 2.1;
  const depth = 1.9;
  const wallHeight = 1.5;
  const rise = 0.95;
  const place = new Placement(batch, [position[0], 0, position[1]], yaw);

  place.box(m.plaster, [0, wallHeight / 2, 0], [width, wallHeight, depth]);
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      place.box(m.timber, [sx * (width / 2 + 0.01), wallHeight / 2, sz * (depth / 2 + 0.01)], [0.14, wallHeight, 0.14]);
    }
  }
  place.box(m.timber, [0, wallHeight * 0.62, depth / 2 + 0.02], [width, 0.1, 0.1]);
  place.box(m.timber, [0, wallHeight * 0.62, -depth / 2 - 0.02], [width, 0.1, 0.1]);

  place.box(m.woodDark, [0, 0.42, depth / 2 + 0.03], [0.4, 0.84, 0.06]);
  for (const x of [-0.6, 0.6]) place.box(m.window, [x, 1.0, depth / 2 + 0.03], [0.36, 0.34, 0.05]);
  place.box(m.window, [width / 2 + 0.03, 1.0, 0], [0.05, 0.34, 0.36]);
  place.box(m.window, [-width / 2 - 0.03, 1.0, 0], [0.05, 0.34, 0.36]);

  const roofParts = gableRoof(width + 0.5, depth + 0.5, rise);
  place.put(roof, roofParts.slopes, [0, wallHeight, 0]);
  place.put(m.plaster, roofParts.gables, [0, wallHeight, 0]);

  const chimneyTop = 2.9;
  place.box(m.stone, [0.55, (wallHeight - 0.3 + chimneyTop) / 2, -0.45], [0.36, chimneyTop - wallHeight + 0.3, 0.36]);
  return place.point([0.55, chimneyTop, -0.45]);
}

export function buildWell(batch: StaticBatch, m: WorldMaterials, position: Point2): void {
  const place = new Placement(batch, [position[0], 0, position[1]]);
  place.cylinder(m.stone, [0, 0.38, 0], 0.85, 0.9, 0.75, 10);
  place.cylinder(m.wellWater, [0, 0.77, 0], 0.62, 0.62, 0.04, 10);
  place.box(m.wood, [-0.78, 1.33, 0], [0.12, 1.15, 0.12]);
  place.box(m.wood, [0.78, 1.33, 0], [0.12, 1.15, 0.12]);
  place.cone(m.roofRed, [0, 1.95, 0], 1.05, 0.55, 4, Math.PI / 4);
}

/** Костёр с треножником и котлом. Пламя анимируется отдельно, поэтому здесь только дерево и камень. */
export function buildFirepit(batch: StaticBatch, m: WorldMaterials, position: Point2): THREE.Vector3 {
  const place = new Placement(batch, [position[0], 0, position[1]]);
  for (let i = 0; i < 8; i++) {
    const angle = (i / 8) * TAU;
    place.put(
      i % 2 ? m.stoneDark : m.stone,
      new THREE.IcosahedronGeometry(0.22, 0),
      [Math.cos(angle) * 0.62, 0.12, Math.sin(angle) * 0.62],
      [0, angle, 0],
    );
  }
  place.beam(m.woodDark, [-0.5, 0.1, -0.1], [0.5, 0.1, 0.1], 0.07);
  place.beam(m.woodDark, [-0.1, 0.1, -0.5], [0.1, 0.1, 0.5], 0.07);
  for (let i = 0; i < 3; i++) {
    const angle = (i / 3) * TAU + 0.5;
    place.beam(m.iron, [Math.cos(angle) * 0.62, 0, Math.sin(angle) * 0.62], [0, 1.35, 0], 0.03);
  }
  place.put(m.cauldron, new THREE.SphereGeometry(0.42, 9, 5, 0, TAU, 0, Math.PI / 2), [0, 1.02, 0], [Math.PI, 0, 0]);
  return place.point([0, 1.5, 0]);
}

/** Пирс из досок на сваях, уходящий в пруд. */
export function buildPier(batch: StaticBatch, m: WorldMaterials, from: Point2, to: Point2, deckY: number): void {
  const length = Math.hypot(to[0] - from[0], to[1] - from[1]);
  const place = new Placement(batch, [(from[0] + to[0]) / 2, 0, (from[1] + to[1]) / 2], yawTowards(from, to));
  place.box(m.woodLight, [0, deckY, 0], [0.95, 0.06, length]);
  for (let z = -length / 2 + 0.15; z < length / 2; z += 0.3) {
    place.box(m.woodDark, [0, deckY + 0.035, z], [0.97, 0.01, 0.03]);
  }
  for (const z of [-length / 2 + 0.25, 0, length / 2 - 0.25]) {
    for (const x of [-0.36, 0.36]) {
      place.cylinder(m.woodDark, [x, deckY - 0.6, z], 0.06, 0.06, 1.2, 5);
    }
  }
}

export function buildBench(batch: StaticBatch, m: WorldMaterials, position: Point2, yaw: number): void {
  const place = new Placement(batch, [position[0], 0, position[1]], yaw);
  place.box(m.wood, [0, 0.42, 0], [1.2, 0.08, 0.36]);
  place.box(m.woodDark, [-0.5, 0.21, 0], [0.1, 0.42, 0.3]);
  place.box(m.woodDark, [0.5, 0.21, 0], [0.1, 0.42, 0.3]);
}

export function buildBarrel(batch: StaticBatch, m: WorldMaterials, position: Point2): void {
  const place = new Placement(batch, [position[0], 0, position[1]]);
  place.cylinder(m.woodDark, [0, 0.35, 0], 0.3, 0.27, 0.7, 9);
  place.cylinder(m.iron, [0, 0.15, 0], 0.31, 0.31, 0.05, 9);
  place.cylinder(m.iron, [0, 0.55, 0], 0.31, 0.31, 0.05, 9);
}

export function buildChoppingBlock(batch: StaticBatch, m: WorldMaterials, position: Point2): void {
  const place = new Placement(batch, [position[0], 0, position[1]]);
  place.cylinder(m.wood, [0, 0.25, 0], 0.42, 0.42, 0.5, 8);
  place.cylinder(m.woodLight, [0, 0.51, 0], 0.4, 0.4, 0.02, 8);
}

/** Поленница из шести брёвен, лежащих вдоль оси Z. */
export function buildWoodpile(batch: StaticBatch, m: WorldMaterials, position: Point2): void {
  const place = new Placement(batch, [position[0], 0, position[1]]);
  const logs: Vec3[] = [
    [-0.45, 0.19, 0],
    [0, 0.19, 0],
    [0.45, 0.19, 0],
    [-0.22, 0.53, 0],
    [0.22, 0.53, 0],
    [0, 0.87, 0],
  ];
  for (const log of logs) {
    place.put(m.wood, new THREE.CylinderGeometry(0.19, 0.19, 1.3, 7), log, [Math.PI / 2, 0, 0]);
  }
}

export function buildFence(batch: StaticBatch, m: WorldMaterials, from: Point2, to: Point2): void {
  const length = Math.hypot(to[0] - from[0], to[1] - from[1]);
  const place = new Placement(batch, [from[0], 0, from[1]], yawTowards(from, to));
  for (let d = 0; d <= length + 1e-6; d += 1.2) {
    place.box(m.woodLight, [0, 0.42, d], [0.1, 0.84, 0.1]);
  }
  place.box(m.wood, [0, 0.34, length / 2], [0.06, 0.07, length]);
  place.box(m.wood, [0, 0.64, length / 2], [0.06, 0.07, length]);
}

/** Каменная дорожка: сегменты-бруски, ориентированные вдоль линии (включая уклон). */
export function buildPath(batch: StaticBatch, m: WorldMaterials, points: readonly Point3[], width = 0.55): void {
  for (let i = 0; i < points.length - 1; i++) {
    const a = new THREE.Vector3(...points[i]);
    const b = new THREE.Vector3(...points[i + 1]);
    const direction = new THREE.Vector3().subVectors(b, a);
    const length = direction.length();
    const matrix = new THREE.Matrix4().compose(
      new THREE.Vector3().addVectors(a, b).multiplyScalar(0.5),
      new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), direction.normalize()),
      new THREE.Vector3(1, 1, 1),
    );
    batch.add(new THREE.BoxGeometry(width, 0.05, length), m.sand, matrix);
  }
}
