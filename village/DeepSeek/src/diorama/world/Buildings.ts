import * as THREE from 'three';
import { CASTLE, COTTAGES, WELL } from './layout';
import { PALETTE, flatMat } from './palette';
import { prismGeometry } from '../utils/geometry';
import { mesh, node, type WorldPiece } from './meshUtils';

/**
 * Fortified keep on the rocky northern terrace, village cottages (with
 * chimney smoke anchors) and the village-center well.
 */
export function buildBuildings(): WorldPiece {
  const group = new THREE.Group();
  group.name = 'buildings';
  const smokeSources: THREE.Vector3[] = [];

  const flag = buildCastle(group);
  for (const cottage of COTTAGES) buildCottage(group, cottage, smokeSources);
  buildWell(group);

  return {
    group,
    smokeSources,
    update: (elapsed: number) => {
      flag.rotation.y = 0.14 * Math.sin(elapsed * 1.4);
    },
  };
}

function buildCastle(parent: THREE.Object3D): THREE.Mesh {
  const castle = node(parent, [CASTLE.center[0], 0, CASTLE.center[1]]);
  castle.name = 'castle';
  const [keepWidth, keepHeight, keepDepth] = CASTLE.keepSize;
  const halfWidth = keepWidth / 2;
  const halfDepth = keepDepth / 2;

  mesh(
    new THREE.CylinderGeometry(5.0, 5.9, 1.8, 9),
    flatMat(PALETTE.rock),
    castle,
    [0, CASTLE.terraceTopY - 0.9, 0],
  );

  const keep = mesh(
    new THREE.BoxGeometry(keepWidth, keepHeight, keepDepth),
    flatMat(PALETTE.stone),
    castle,
    [0, CASTLE.terraceTopY + keepHeight / 2, 0],
  );
  keep.name = 'castle-keep';

  const merlonMaterial = flatMat(PALETTE.stoneLight);
  const merlonY = CASTLE.terraceTopY + keepHeight + 0.175;
  for (let i = 0; i < 4; i++) {
    const offset = -1.35 + i * 0.9;
    mesh(new THREE.BoxGeometry(0.5, 0.35, 0.3), merlonMaterial, castle, [offset, merlonY, halfDepth]);
    mesh(new THREE.BoxGeometry(0.5, 0.35, 0.3), merlonMaterial, castle, [offset, merlonY, -halfDepth]);
    mesh(new THREE.BoxGeometry(0.3, 0.35, 0.5), merlonMaterial, castle, [halfWidth, merlonY, offset]);
    mesh(new THREE.BoxGeometry(0.3, 0.35, 0.5), merlonMaterial, castle, [-halfWidth, merlonY, offset]);
  }

  const towerMaterial = flatMat(PALETTE.stoneDark);
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      const towerX = sx * halfWidth;
      const towerZ = sz * halfDepth;
      mesh(new THREE.BoxGeometry(0.7, 3.6, 0.7), towerMaterial, castle, [towerX, CASTLE.terraceTopY + 1.8, towerZ]);
      for (const dx of [-0.35, 0.35]) {
        for (const dz of [-0.35, 0.35]) {
          mesh(
            new THREE.BoxGeometry(0.25, 0.25, 0.25),
            merlonMaterial,
            castle,
            [towerX + dx, CASTLE.terraceTopY + 3.725, towerZ + dz],
          );
        }
      }
    }
  }

  const doorMaterial = flatMat(PALETTE.door);
  mesh(new THREE.BoxGeometry(0.9, 1.3, 0.15), doorMaterial, castle, [0, CASTLE.terraceTopY + 0.65, halfDepth + 0.08]);

  const windowMaterial = flatMat(PALETTE.window, { emissive: PALETTE.window, emissiveIntensity: 0.25 });
  for (const wx of [-0.9, 0, 0.9]) {
    mesh(new THREE.BoxGeometry(0.28, 0.42, 0.08), windowMaterial, castle, [wx, CASTLE.terraceTopY + 2.4, halfDepth + 0.01]);
  }

  mesh(
    new THREE.BoxGeometry(2.4, 0.22, 1.0),
    flatMat(PALETTE.stoneDark),
    castle,
    [0, CASTLE.terraceTopY - 0.11, halfDepth + 0.45],
  );

  const railMaterial = flatMat(PALETTE.woodDark);
  mesh(new THREE.BoxGeometry(2.4, 0.08, 0.08), railMaterial, castle, [0, CASTLE.terraceTopY + 0.85, halfDepth + 0.9]);
  mesh(new THREE.BoxGeometry(0.08, 0.08, 1.0), railMaterial, castle, [1.16, CASTLE.terraceTopY + 0.85, halfDepth + 0.45]);
  mesh(new THREE.BoxGeometry(0.08, 0.08, 1.0), railMaterial, castle, [-1.16, CASTLE.terraceTopY + 0.85, halfDepth + 0.45]);
  for (const postX of [-1.16, -0.58, 0, 0.58, 1.16]) {
    mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.8, 5), railMaterial, castle, [postX, CASTLE.terraceTopY + 0.4, halfDepth + 0.9]);
  }

  const stepMaterial = flatMat(PALETTE.stone);
  for (let i = 0; i < 5; i++) {
    mesh(
      new THREE.BoxGeometry(1.3, 0.36, 0.55),
      stepMaterial,
      castle,
      [0, 3.82 - i * 0.36, 5.0 + i * 0.45],
    );
  }

  mesh(new THREE.CylinderGeometry(0.05, 0.05, 2.4, 6), railMaterial, castle, [0, CASTLE.terraceTopY + keepHeight + 1.2, 0]);
  const flagMaterial = new THREE.MeshStandardMaterial({
    color: PALETTE.roofRed,
    flatShading: true,
    side: THREE.DoubleSide,
    roughness: 0.95,
  });
  const flag = mesh(
    new THREE.PlaneGeometry(1.0, 0.5, 4, 1),
    flagMaterial,
    castle,
    [0.52, CASTLE.terraceTopY + keepHeight + 1.9, 0],
  );
  flag.name = 'castle-flag';
  return flag;
}

function buildCottage(
  parent: THREE.Object3D,
  spec: (typeof COTTAGES)[number],
  smokeSources: THREE.Vector3[],
): void {
  const cottage = node(parent, spec.position);
  cottage.rotation.y = spec.rotationY;
  cottage.name = `cottage-${spec.variant}`;

  if (spec.variant === 'tower') {
    buildTowerHouse(cottage);
    return;
  }

  {
    const roofColor = spec.variant === 'straw' ? PALETTE.roofStraw : PALETTE.roofSlate;
    mesh(new THREE.BoxGeometry(2.3, 1.5, 1.9), flatMat(PALETTE.plaster), cottage, [0, 0.75, 0]);
    const timber = flatMat(PALETTE.woodDark);
    for (const sx of [-1.08, 1.08]) {
      for (const sz of [-0.88, 0.88]) {
        mesh(new THREE.BoxGeometry(0.14, 1.5, 0.14), timber, cottage, [sx, 0.75, sz]);
      }
    }
    mesh(new THREE.BoxGeometry(2.42, 0.14, 0.14), timber, cottage, [0, 1.44, 0.88]);
    mesh(new THREE.BoxGeometry(2.42, 0.14, 0.14), timber, cottage, [0, 1.44, -0.88]);
    mesh(prismGeometry(2.8, 2.3, 1.1), flatMat(roofColor), cottage, [0, 1.5, 0]);
    mesh(new THREE.BoxGeometry(0.5, 0.9, 0.08), flatMat(PALETTE.door), cottage, [0, 0.45, 1.0]);
    const windowMaterial = flatMat(PALETTE.window, { emissive: PALETTE.window, emissiveIntensity: 0.25 });
    mesh(new THREE.BoxGeometry(0.34, 0.34, 0.06), windowMaterial, cottage, [0.62, 0.95, 1.0]);
    mesh(new THREE.BoxGeometry(0.34, 0.34, 0.06), windowMaterial, cottage, [-0.62, 0.95, 1.0]);
    mesh(new THREE.BoxGeometry(0.3, 1.0, 0.3), flatMat(PALETTE.stoneDark), cottage, [0.65, 1.95, 0.4]);

    const anchor = new THREE.Object3D();
    anchor.position.set(0.65, 2.6, 0.4);
    cottage.add(anchor);
    smokeSources.push(worldPosition(cottage, anchor));
    return;
  }
}

function buildTowerHouse(cottage: THREE.Object3D): void {
  mesh(new THREE.BoxGeometry(2.6, 2.4, 2.6), flatMat(PALETTE.stone), cottage, [0, 1.2, 0]);
  const merlonMaterial = flatMat(PALETTE.stoneLight);
  for (const sx of [-0.95, -0.3, 0.35, 1.0]) {
    mesh(new THREE.BoxGeometry(0.35, 0.35, 0.35), merlonMaterial, cottage, [sx, 2.575, 1.15]);
    mesh(new THREE.BoxGeometry(0.35, 0.35, 0.35), merlonMaterial, cottage, [sx, 2.575, -1.15]);
  }
  for (const sz of [-0.4, 0.4]) {
    mesh(new THREE.BoxGeometry(0.35, 0.35, 0.35), merlonMaterial, cottage, [1.15, 2.575, sz]);
    mesh(new THREE.BoxGeometry(0.35, 0.35, 0.35), merlonMaterial, cottage, [-1.15, 2.575, sz]);
  }
  mesh(new THREE.CylinderGeometry(0.8, 0.86, 3.4, 8), flatMat(PALETTE.stoneDark), cottage, [1.3, 1.7, -1.3]);
  mesh(new THREE.ConeGeometry(1.0, 0.9, 8), flatMat(PALETTE.roofRed), cottage, [1.3, 3.85, -1.3]);
  mesh(new THREE.BoxGeometry(0.5, 0.9, 0.12), flatMat(PALETTE.door), cottage, [0, 0.6, 1.31]);
  const windowMaterial = flatMat(PALETTE.window, { emissive: PALETTE.window, emissiveIntensity: 0.25 });
  mesh(new THREE.BoxGeometry(0.3, 0.4, 0.08), windowMaterial, cottage, [-0.7, 1.5, 1.31]);
  mesh(new THREE.BoxGeometry(0.3, 0.4, 0.08), windowMaterial, cottage, [0.7, 1.5, 1.31]);
}

function buildWell(parent: THREE.Object3D): void {
  const well = node(parent, WELL);
  well.name = 'well';
  mesh(new THREE.CylinderGeometry(0.7, 0.76, 0.85, 8), flatMat(PALETTE.stone), well, [0, 0.43, 0]);
  mesh(new THREE.CylinderGeometry(0.52, 0.52, 0.08, 8), flatMat('#1e2a33'), well, [0, 0.87, 0]);
  const timber = flatMat(PALETTE.woodDark);
  mesh(new THREE.CylinderGeometry(0.06, 0.07, 1.3, 5), timber, well, [-0.62, 1.3, 0]);
  mesh(new THREE.CylinderGeometry(0.06, 0.07, 1.3, 5), timber, well, [0.62, 1.3, 0]);
  mesh(prismGeometry(1.6, 1.2, 0.55), flatMat(PALETTE.roofStraw), well, [0, 1.95, 0]);
  const crossbar = mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.2, 5), timber, well, [0, 1.72, 0]);
  crossbar.rotation.z = Math.PI / 2;
  mesh(new THREE.CylinderGeometry(0.12, 0.1, 0.18, 6), timber, well, [0, 1.5, 0]);
}

function worldPosition(parent: THREE.Object3D, child: THREE.Object3D): THREE.Vector3 {
  parent.updateMatrixWorld(true);
  const position = new THREE.Vector3();
  child.getWorldPosition(position);
  return position;
}
