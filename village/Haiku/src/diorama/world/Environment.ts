import * as THREE from 'three';
import { Random } from '../utils/Random';
import { disposeObject } from '../utils/dispose';
import {
  buildBarrel,
  buildBench,
  buildChoppingBlock,
  buildCastle,
  buildCottage,
  buildFence,
  buildFirepit,
  buildPath,
  buildPier,
  buildTerrace,
  buildWell,
  buildWoodpile,
  yawTowards,
} from './Buildings';
import { CloudField, addBush, addFlower, addOak, addPine } from './Nature';
import { buildIsland } from './Island';
import {
  BARRELS,
  BENCHES,
  CHOPPING_BLOCK,
  COTTAGES,
  EAST_FENCE,
  FIREPIT,
  PATHS,
  PIER,
  POND,
  TERRACE,
  TREES,
  WELL,
  WOODPILE,
  type Point2,
  type Point3,
} from './Layout';
import { createWorldMaterials, type WorldMaterials } from './Materials';
import { RippleSystem } from './Ripples';
import { SmokeSystem } from './Smoke';
import { StaticBatch } from './StaticBatch';

const TAU = Math.PI * 2;
/** Растительность и декор не выходят за этот радиус: патрули идут по краю и не должны цепляться за кусты. */
const VEGETATION_RADIUS = 9.0;

interface Blocker {
  x: number;
  z: number;
  radius: number;
}

/**
 * Весь статический мир острова: рельеф, крепость, деревня, растительность, облака, дым, пламя и рябь.
 * Статика объединяется батчером, анимированные части (дым, рябь, пламя, облака) живут отдельно.
 */
export class Environment {
  readonly ripples = new RippleSystem();
  private readonly materials: WorldMaterials = createWorldMaterials();
  private readonly root = new THREE.Group();
  private readonly flames: THREE.Group[] = [];
  private readonly smoke: SmokeSystem;
  private readonly clouds: CloudField;

  constructor(scene: THREE.Scene) {
    const m = this.materials;
    const random = new Random(2024);
    const batch = new StaticBatch();
    const blockers: Blocker[] = [];
    const smokeSources: THREE.Vector3[] = [];

    buildIsland(batch, m);
    buildTerrace(batch, m, random);
    buildCastle(batch, m);
    for (const path of PATHS) buildPath(batch, m, path);

    COTTAGES.forEach((position, index) => {
      const roof = index % 2 ? m.straw : m.slate;
      smokeSources.push(buildCottage(batch, m, position, yawTowards(position, WELL.center), roof));
      blockers.push({ x: position[0], z: position[1], radius: 2.3 });
    });

    buildWell(batch, m, WELL.center);
    blockers.push({ x: WELL.center[0], z: WELL.center[1], radius: 1.4 });
    smokeSources.push(buildFirepit(batch, m, FIREPIT.center));
    blockers.push({ x: FIREPIT.center[0], z: FIREPIT.center[1], radius: 1.3 });

    buildChoppingBlock(batch, m, CHOPPING_BLOCK.position);
    blockers.push({ x: CHOPPING_BLOCK.position[0], z: CHOPPING_BLOCK.position[1], radius: 1.0 });
    buildWoodpile(batch, m, WOODPILE.position);
    blockers.push({ x: WOODPILE.position[0], z: WOODPILE.position[1], radius: 1.2 });

    buildPier(batch, m, PIER.from, PIER.to, PIER.deckY);
    buildFence(batch, m, EAST_FENCE[0], EAST_FENCE[1]);

    for (const position of BENCHES) {
      buildBench(batch, m, position, yawTowards(position, WELL.center));
      blockers.push({ x: position[0], z: position[1], radius: 0.9 });
    }
    for (const position of BARRELS) {
      buildBarrel(batch, m, position);
      blockers.push({ x: position[0], z: position[1], radius: 0.6 });
    }
    for (const tree of TREES) {
      const scale = random.range(0.95, 1.2);
      const yaw = random.range(0, TAU);
      if (tree.kind === 'pine') addPine(batch, m, tree.position, scale, yaw);
      else addOak(batch, m, tree.position, scale, yaw);
      blockers.push({ x: tree.position[0], z: tree.position[1], radius: 1.2 });
    }

    scatterVegetation(batch, m, random, blockers);
    batch.build(this.root);
    scene.add(this.root);

    this.createFlames(FIREPIT.center);
    this.smoke = new SmokeSystem(m.smoke, smokeSources);
    this.clouds = new CloudField(m.cloud, random);
    scene.add(this.smoke.mesh, this.ripples.group, this.clouds.group);
  }

  update(dt: number, elapsed: number): void {
    this.smoke.update(dt);
    this.ripples.update(dt);
    this.clouds.update(dt);
    for (const flame of this.flames) {
      const phase = flame.userData.phase as number;
      const flicker = 0.5 * Math.sin(elapsed * 9 + phase) + 0.5 * Math.sin(elapsed * 13.7 + phase * 2);
      flame.scale.set(1 + 0.08 * flicker, 1 + 0.18 * flicker, 1 + 0.08 * flicker);
    }
  }

  dispose(): void {
    this.root.removeFromParent();
    this.smoke.mesh.removeFromParent();
    this.ripples.group.removeFromParent();
    this.clouds.group.removeFromParent();
    disposeObject(this.root);
    disposeObject(this.smoke.mesh);
    disposeObject(this.ripples.group);
    disposeObject(this.clouds.group);
    for (const material of Object.values(this.materials)) material.dispose();
  }

  /** Три языка пламени, каждый со внешним оранжевым и внутренним жёлтым конусом. */
  private createFlames(center: Point2): void {
    for (let i = 0; i < 3; i++) {
      const angle = (i / 3) * TAU;
      const group = new THREE.Group();
      group.position.set(center[0] + Math.cos(angle) * 0.16, 0.22, center[1] + Math.sin(angle) * 0.16);
      const outer = new THREE.Mesh(new THREE.ConeGeometry(0.17, 0.6, 5), this.materials.flame);
      outer.position.y = 0.28;
      const core = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.36, 5), this.materials.flameCore);
      core.position.y = 0.16;
      group.add(outer, core);
      group.userData.phase = i * 2.1;
      this.root.add(group);
      this.flames.push(group);
    }
  }
}

function scatterVegetation(batch: StaticBatch, m: WorldMaterials, random: Random, blockers: Blocker[]): void {
  for (const spot of scatter(random, 22, blockers, 0.5)) {
    addBush(batch, m, spot, random.range(0.35, 0.5));
  }
  const flowers = [m.flowerRed, m.flowerYellow, m.flowerPink, m.flowerWhite];
  for (const spot of scatter(random, 40, blockers, 0.2)) {
    addFlower(batch, flowers[Math.floor(random.next() * flowers.length)], spot);
  }
}

/** Случайные точки, которые не попадают на пруд, террасу, здания, дорожки и край острова. */
function scatter(random: Random, count: number, blockers: Blocker[], clearance: number): Point2[] {
  const spots: Point2[] = [];
  for (let attempt = 0; attempt < 800 && spots.length < count; attempt++) {
    const x = random.range(-VEGETATION_RADIUS, VEGETATION_RADIUS);
    const z = random.range(-VEGETATION_RADIUS, VEGETATION_RADIUS);
    if (isFreeSpot(x, z, blockers, clearance)) spots.push([x, z]);
  }
  return spots;
}

function isFreeSpot(x: number, z: number, blockers: Blocker[], clearance: number): boolean {
  if (Math.hypot(x, z) > VEGETATION_RADIUS) return false;
  if (Math.hypot(x - POND.center[0], z - POND.center[1]) < POND.bankRadius + clearance) return false;
  if (Math.hypot(x - TERRACE.center[0], z - TERRACE.center[1]) < TERRACE.radius + clearance) return false;
  if (blockers.some((blocker) => Math.hypot(x - blocker.x, z - blocker.z) < blocker.radius + clearance)) return false;
  return PATHS.every((path) => distanceToPolyline(x, z, path) > 0.6 + clearance);
}

function distanceToPolyline(x: number, z: number, points: readonly Point3[]): number {
  let best = Infinity;
  for (let i = 0; i < points.length - 1; i++) {
    const [ax, , az] = points[i];
    const [bx, , bz] = points[i + 1];
    const dx = bx - ax;
    const dz = bz - az;
    const lengthSquared = dx * dx + dz * dz || 1;
    const t = THREE.MathUtils.clamp(((x - ax) * dx + (z - az) * dz) / lengthSquared, 0, 1);
    best = Math.min(best, Math.hypot(x - (ax + dx * t), z - (az + dz * t)));
  }
  return best;
}
