import * as THREE from 'three';
import { Random } from '../utils/Random';
import type { WorldMaterials } from './Materials';
import { ISLAND, POND } from './Layout';
import { StaticBatch, triangleGeometry, type Triangle } from './StaticBatch';

const TAU = Math.PI * 2;
const TOP_RINGS = 26;
const SEGMENTS = 56;
/** Треугольники ниже этой высоты окрашиваются в камень, выше — в траву. */
const GRASS_LINE = -0.4;

/** Профиль подбрюшья (радиус, высота) от края острова к вершине. */
const UNDERSIDE_PROFILE: ReadonlyArray<{ radius: number; y: number }> = [
  { radius: 11.8, y: -2.2 },
  { radius: 10.2, y: -4.0 },
  { radius: 8.2, y: -5.8 },
  { radius: 6.0, y: -7.4 },
  { radius: 3.6, y: -8.8 },
  { radius: 1.6, y: -9.9 },
];
const APEX = new THREE.Vector3(0.3, -10.8, -0.2);
const CENTER_INSIDE = new THREE.Vector3(0, -4, 0);

/**
 * Высота поверхности острова: слегка холмистая трава, углубление под пруд,
 * скос к краю. Тем же функционалом пользуются другие модули мира.
 */
export function terrainHeight(x: number, z: number): number {
  let height = 0.05 * Math.sin(x * 0.7 + 0.4) * Math.cos(z * 0.6 - 0.9);
  height += pondHollow(x, z);
  const r = Math.hypot(x, z);
  if (r > ISLAND.topRadius) {
    const edge = THREE.MathUtils.clamp((r - ISLAND.topRadius) / (ISLAND.edgeRadius - ISLAND.topRadius), 0, 1);
    height -= 0.9 * edge;
  }
  return height;
}

function pondHollow(x: number, z: number): number {
  const d = Math.hypot(x - POND.center[0], z - POND.center[1]) / POND.radius;
  return -0.5 * (1 - THREE.MathUtils.smoothstep(d, 0.65, 1.25));
}

/**
 * Строит остров: поверхность с углублением под пруд, подбрюшье, скальные шпили и корни.
 * Поверхность и подбрюшье — одна сетка колец, которую делим на траву и камень.
 */
export function buildIsland(batch: StaticBatch, materials: WorldMaterials): void {
  const random = new Random(7);
  const topRings = buildTopRings(random);
  const rim = topRings[topRings.length - 1];
  const rings = [...topRings, ...buildUndersideRings(rim, random).slice(1)];

  const triangles = stitchRings(rings);
  const grass: Triangle[] = [];
  const rock: Triangle[] = [];
  for (const triangle of triangles) {
    const centroidY = (triangle[0].y + triangle[1].y + triangle[2].y) / 3;
    (centroidY > GRASS_LINE ? grass : rock).push(triangle);
  }

  batch.add(triangleGeometry(grass, CENTER_INSIDE), materials.grass);
  batch.add(triangleGeometry(rock, CENTER_INSIDE), materials.rock);

  const water = new THREE.CircleGeometry(POND.radius + 0.1, 24);
  water.rotateX(-Math.PI / 2);
  water.translate(POND.center[0], ISLAND.waterLevel, POND.center[1]);
  batch.add(water, materials.water);

  addRockSpires(batch, materials, random);
  addRoots(batch, materials, random);
}

function buildTopRings(random: Random): THREE.Vector3[][] {
  const rings: THREE.Vector3[][] = [[new THREE.Vector3(0, terrainHeight(0, 0), 0)]];
  for (let i = 1; i <= TOP_RINGS; i++) {
    const radius = ISLAND.edgeRadius * (i / TOP_RINGS);
    const ring: THREE.Vector3[] = [];
    for (let s = 0; s < SEGMENTS; s++) {
      const angle = (s / SEGMENTS) * TAU;
      // Неровный край: лёгкое смещение внешнего кольца делает силуэт острова органичным.
      const jitter = i === TOP_RINGS ? 1 + random.range(-0.015, 0.015) : 1;
      const x = Math.cos(angle) * radius * jitter;
      const z = Math.sin(angle) * radius * jitter;
      ring.push(new THREE.Vector3(x, terrainHeight(x, z), z));
    }
    rings.push(ring);
  }
  return rings;
}

function buildUndersideRings(rim: THREE.Vector3[], random: Random): THREE.Vector3[][] {
  const rings: THREE.Vector3[][] = [rim];
  for (const { radius, y } of UNDERSIDE_PROFILE) {
    const ring: THREE.Vector3[] = [];
    for (let s = 0; s < SEGMENTS; s++) {
      const angle = (s / SEGMENTS) * TAU;
      const r = radius * (1 + random.range(-0.08, 0.08));
      ring.push(new THREE.Vector3(Math.cos(angle) * r, y + random.range(-0.3, 0.3), Math.sin(angle) * r));
    }
    rings.push(ring);
  }
  rings.push([APEX.clone()]);
  return rings;
}

/** Соединяет соседние кольца: quad делится на два треугольника, вершина — веером. */
function stitchRings(rings: THREE.Vector3[][]): Triangle[] {
  const triangles: Triangle[] = [];
  for (let k = 0; k < rings.length - 1; k++) {
    const a = rings[k];
    const b = rings[k + 1];
    if (a.length === 1) {
      for (let s = 0; s < b.length; s++) triangles.push([a[0], b[s], b[(s + 1) % b.length]]);
    } else if (b.length === 1) {
      for (let s = 0; s < a.length; s++) triangles.push([a[s], b[0], a[(s + 1) % a.length]]);
    } else {
      for (let s = 0; s < a.length; s++) {
        const next = (s + 1) % a.length;
        triangles.push([a[s], b[s], b[next]], [a[s], b[next], a[next]]);
      }
    }
  }
  return triangles;
}

function addRockSpires(batch: StaticBatch, materials: WorldMaterials, random: Random): void {
  for (let i = 0; i < 9; i++) {
    const angle = random.range(0, TAU);
    const radius = random.range(4.5, 9.2);
    const cone = new THREE.ConeGeometry(random.range(0.45, 0.9), random.range(1.8, 3.6), 5 + Math.floor(random.range(0, 2)));
    const matrix = new THREE.Matrix4().compose(
      new THREE.Vector3(Math.cos(angle) * radius, random.range(-8.2, -6.4), Math.sin(angle) * radius),
      new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.PI, random.range(0, TAU), 0)),
      new THREE.Vector3(1, 1, 1),
    );
    batch.add(cone, i % 2 ? materials.rockDark : materials.rock, matrix);
  }
}

/** Оголённые корни, уходящие вниз от края подбрюшья. */
function addRoots(batch: StaticBatch, materials: WorldMaterials, random: Random): void {
  for (let i = 0; i < 7; i++) {
    const angle = random.range(0, TAU);
    const start = new THREE.Vector3(Math.cos(angle) * 10.6, -2.8, Math.sin(angle) * 10.6);
    const length = random.range(2.6, 3.6);
    const end = new THREE.Vector3(Math.cos(angle) * 11.6, -2.8 - length, Math.sin(angle) * 11.6);
    const direction = new THREE.Vector3().subVectors(end, start);
    const height = direction.length();
    const matrix = new THREE.Matrix4().compose(
      new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5),
      new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize()),
      new THREE.Vector3(1, 1, 1),
    );
    // radiusTop смотрит на конец корня (тонкий), radiusBottom — на край острова (толстый).
    batch.add(new THREE.CylinderGeometry(0.05, 0.22, height, 5), materials.rockDark, matrix);
  }
}
