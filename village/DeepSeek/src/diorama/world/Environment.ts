import * as THREE from 'three';
import { DOCK, FIRECAMP, FENCES, ISLAND, PROPS, TREES, WOODCUT } from './layout';
import { PALETTE, flatMat } from './palette';
import { mulberry32 } from '../utils/rng';
import { SmokeEmitter } from './Particles';
import { mesh, node, type WorldPiece } from './meshUtils';

/**
 * Nature and workstation props: pine/oak trees, fences, barrels, crates,
 * benches, the pond dock, the woodcutting station and the campfire with
 * cauldron, smoke and flickering light.
 */
export function buildEnvironment(chimneySources: THREE.Vector3[]): WorldPiece {
  const group = new THREE.Group();
  group.name = 'environment';
  const rng = mulberry32(ISLAND.seed + 7);

  for (const tree of TREES) buildTree(group, tree, rng);
  for (const fence of FENCES) buildFence(group, fence.from, fence.to);
  for (const barrel of PROPS.barrels) buildBarrel(group, barrel);
  for (const crate of PROPS.crates) buildCrate(group, crate);
  for (const bench of PROPS.benches) buildBench(group, bench.position, bench.rotationY);

  buildDock(group);
  buildWoodcutting(group);
  const campfire = buildCampfire(group);

  const emitters: SmokeEmitter[] = chimneySources.map(
    (source) => new SmokeEmitter(source, { rise: 0.7, life: 3.6, size: 0.18, opacity: 0.45, spread: 0.25 }),
  );
  for (const emitter of emitters) group.add(emitter.points);
  group.add(campfire.smoke.points);

  return {
    group,
    update: (elapsed: number, dt: number) => {
      for (const emitter of emitters) emitter.update(dt);
      campfire.smoke.update(dt);
      campfire.flame.scale.setScalar(1 + 0.12 * Math.sin(elapsed * 11));
      campfire.core.scale.setScalar(1 + 0.18 * Math.sin(elapsed * 13 + 1.3));
      campfire.light.intensity = 7 + 2.2 * Math.sin(elapsed * 9.4) + 0.8 * Math.sin(elapsed * 23.7);
    },
  };
}

function buildTree(
  parent: THREE.Object3D,
  spec: (typeof TREES)[number],
  rng: () => number,
): void {
  const tree = node(parent, spec.position);
  tree.scale.setScalar(spec.scale);
  tree.rotation.y = rng() * Math.PI * 2;
  tree.name = `tree-${spec.variant}`;

  if (spec.variant === 'oak') {
    mesh(new THREE.CylinderGeometry(0.18, 0.26, 1.1, 6), flatMat(PALETTE.trunk), tree, [0, 0.55, 0]);
    const canopy = mesh(new THREE.IcosahedronGeometry(1.0, 0), flatMat(PALETTE.treeMid), tree, [0, 1.55, 0]);
    canopy.scale.set(1, 0.85, 1);
    mesh(new THREE.IcosahedronGeometry(0.55, 0), flatMat(PALETTE.treeLight), tree, [0.5, 1.25, 0.25]);
    return;
  }

  mesh(new THREE.CylinderGeometry(0.16, 0.22, 0.9, 6), flatMat(PALETTE.trunk), tree, [0, 0.45, 0]);
  const tall = spec.variant === 'pineTall';
  const tiers: [number, number, number, string][] = tall
    ? [
        [1.15, 1.1, 1.0, PALETTE.treeDark],
        [0.9, 0.95, 1.75, PALETTE.pineDark],
        [0.62, 0.8, 2.4, PALETTE.treeMid],
      ]
    : [
        [1.05, 1.0, 0.95, PALETTE.treeDark],
        [0.78, 0.85, 1.6, PALETTE.pineDark],
        [0.5, 0.7, 2.2, PALETTE.treeMid],
      ];
  for (const [radius, height, y, color] of tiers) {
    mesh(new THREE.ConeGeometry(radius, height, 7), flatMat(color), tree, [0, y, 0]);
  }
}

function buildFence(
  parent: THREE.Object3D,
  from: [number, number],
  to: [number, number],
): void {
  const dx = to[0] - from[0];
  const dz = to[1] - from[1];
  const length = Math.hypot(dx, dz);
  const angle = Math.atan2(-dz, dx);
  const material = flatMat(PALETTE.wood);

  const posts = Math.max(2, Math.round(length / 1.1) + 1);
  for (let i = 0; i < posts; i++) {
    const t = i / (posts - 1);
    mesh(
      new THREE.CylinderGeometry(0.06, 0.07, 0.9, 5),
      material,
      parent,
      [from[0] + dx * t, ISLAND.topY + 0.45, from[1] + dz * t],
    );
  }

  for (const railY of [0.55, 0.85]) {
    const rail = mesh(new THREE.BoxGeometry(length, 0.07, 0.07), material, parent, [
      (from[0] + to[0]) / 2,
      ISLAND.topY + railY,
      (from[1] + to[1]) / 2,
    ]);
    rail.rotation.y = angle;
  }
}

function buildBarrel(parent: THREE.Object3D, position: [number, number, number]): void {
  const barrel = node(parent, position);
  mesh(new THREE.CylinderGeometry(0.3, 0.26, 0.7, 8), flatMat(PALETTE.wood), barrel, [0, 0.35, 0]);
  mesh(new THREE.CylinderGeometry(0.31, 0.31, 0.06, 8), flatMat(PALETTE.stoneDark), barrel, [0, 0.18, 0]);
  mesh(new THREE.CylinderGeometry(0.31, 0.31, 0.06, 8), flatMat(PALETTE.stoneDark), barrel, [0, 0.52, 0]);
}

function buildCrate(parent: THREE.Object3D, position: [number, number, number]): void {
  mesh(new THREE.BoxGeometry(0.6, 0.6, 0.6), flatMat(PALETTE.woodLight), parent, [
    position[0],
    position[1] + 0.3,
    position[2],
  ]);
}

function buildBench(
  parent: THREE.Object3D,
  position: [number, number, number],
  rotationY: number,
): void {
  const bench = node(parent, position);
  bench.rotation.y = rotationY;
  const material = flatMat(PALETTE.wood);
  mesh(new THREE.BoxGeometry(1.2, 0.08, 0.32), material, bench, [0, 0.42, 0]);
  mesh(new THREE.BoxGeometry(0.1, 0.42, 0.28), material, bench, [-0.45, 0.21, 0]);
  mesh(new THREE.BoxGeometry(0.1, 0.42, 0.28), material, bench, [0.45, 0.21, 0]);
  const back = mesh(new THREE.BoxGeometry(1.2, 0.5, 0.07), material, bench, [0, 0.72, -0.14]);
  back.rotation.x = -0.12;
}

function buildDock(parent: THREE.Object3D): void {
  const midX = (DOCK.start[0] + DOCK.end[0]) / 2;
  const deckLength = Math.abs(DOCK.end[0] - DOCK.start[0]) + 0.3;
  mesh(
    new THREE.BoxGeometry(deckLength, 0.12, 1.1),
    flatMat(PALETTE.wood),
    parent,
    [midX, DOCK.deckTopY - 0.06, DOCK.start[2]],
  );
  const postMaterial = flatMat(PALETTE.woodDark);
  for (const x of [DOCK.start[0] - 0.2, DOCK.end[0] + 0.05]) {
    for (const z of [DOCK.start[2] - 0.44, DOCK.start[2] + 0.44]) {
      mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.9, 6), postMaterial, parent, [x, 1.85, z]);
    }
  }
}

function buildWoodcutting(parent: THREE.Object3D): void {
  const station = node(parent, WOODCUT.stump);
  station.name = 'woodcutting';
  mesh(new THREE.CylinderGeometry(0.36, 0.42, 0.55, 8), flatMat(PALETTE.wood), station, [0, 0.275, 0]);
  mesh(new THREE.BoxGeometry(0.46, 0.34, 0.4), flatMat(PALETTE.woodLight), station, [0, 0.72, 0]);
  const log = mesh(new THREE.CylinderGeometry(0.14, 0.14, 1.2, 6), flatMat(PALETTE.wood), station, [0.1, 0.14, 1.0]);
  log.rotation.z = Math.PI / 2;
  const log2 = mesh(new THREE.CylinderGeometry(0.13, 0.13, 1.0, 6), flatMat(PALETTE.woodDark), station, [0.15, 0.4, 1.05]);
  log2.rotation.z = Math.PI / 2;
}

function buildCampfire(parent: THREE.Object3D): {
  flame: THREE.Mesh;
  core: THREE.Mesh;
  light: THREE.PointLight;
  smoke: SmokeEmitter;
} {
  const camp = node(parent, FIRECAMP.fire);
  camp.name = 'campfire';

  const stoneMaterial = flatMat(PALETTE.stoneDark);
  for (let i = 0; i < 8; i++) {
    const angle = (i / 8) * Math.PI * 2;
    const stone = mesh(new THREE.BoxGeometry(0.22, 0.16, 0.22), stoneMaterial, camp, [
      Math.cos(angle) * 0.55,
      0.08,
      Math.sin(angle) * 0.55,
    ]);
    stone.rotation.y = angle;
  }

  const logMaterial = flatMat(PALETTE.woodDark);
  for (let i = 0; i < 3; i++) {
    const log = mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.8, 5), logMaterial, camp, [0, 0.12, 0]);
    log.rotation.z = Math.PI / 2;
    log.rotation.y = (i / 3) * Math.PI;
  }

  const tripodMaterial = flatMat(PALETTE.wood);
  for (let i = 0; i < 3; i++) {
    const angle = (i / 3) * Math.PI * 2;
    const leg = mesh(new THREE.CylinderGeometry(0.035, 0.035, 1.3, 5), tripodMaterial, camp, [
      Math.cos(angle) * 0.45,
      0.55,
      Math.sin(angle) * 0.45,
    ]);
    leg.rotation.z = Math.cos(angle) * 0.35;
    leg.rotation.x = -Math.sin(angle) * 0.35;
  }

  mesh(new THREE.CylinderGeometry(0.3, 0.24, 0.3, 8), flatMat('#3a3a3a'), camp, [0, 0.65, 0]);
  mesh(new THREE.TorusGeometry(0.3, 0.035, 6, 14), flatMat('#2f2f2f'), camp, [0, 0.8, 0]).rotation.x = Math.PI / 2;

  const flame = mesh(
    new THREE.ConeGeometry(0.18, 0.5, 6),
    flatMat(PALETTE.fire, { emissive: PALETTE.fire, emissiveIntensity: 1.6 }),
    camp,
    [0, 0.3, 0],
  );
  flame.castShadow = false;
  const core = mesh(
    new THREE.ConeGeometry(0.1, 0.3, 6),
    flatMat(PALETTE.fireCore, { emissive: PALETTE.fireCore, emissiveIntensity: 2.2 }),
    camp,
    [0, 0.26, 0],
  );
  core.castShadow = false;

  const light = new THREE.PointLight(PALETTE.fire, 8, 8, 1.8);
  light.position.set(0, 0.9, 0);
  camp.add(light);

  const smoke = new SmokeEmitter(new THREE.Vector3(FIRECAMP.fire[0], FIRECAMP.fire[1] + 1.05, FIRECAMP.fire[2]), {
    rise: 0.65,
    life: 3.0,
    size: 0.16,
    opacity: 0.35,
    spread: 0.2,
  });

  return { flame, core, light, smoke };
}
