import * as THREE from 'three';
import { ISLAND, PATHS, POND, WELL } from './layout';
import { PALETTE, flatMat } from './palette';
import { coneTip, ribbonGeometry, ringBand, triangleFan } from '../utils/geometry';
import { mulberry32 } from '../utils/rng';
import { mesh, type WorldPiece } from './meshUtils';

/**
 * Floating island terrain: jittered polygonal grass plateau, layered cliff
 * walls tapering to a jagged underside, hanging rock spires, sky rubble,
 * surface paths, plaza and pond shore inlay.
 */
export function buildIsland(): WorldPiece {
  const group = new THREE.Group();
  group.name = 'island';

  const rng = mulberry32(ISLAND.seed);
  const segments = 14;

  const rim: THREE.Vector3[] = [];
  for (let i = 0; i < segments; i++) {
    const angle = (i / segments) * Math.PI * 2;
    const radius = ISLAND.radius - 0.9 + rng() * 1.8;
    rim.push(
      new THREE.Vector3(
        Math.cos(angle) * radius,
        ISLAND.topY + (rng() - 0.5) * 0.14,
        Math.sin(angle) * radius,
      ),
    );
  }

  const top = mesh(
    triangleFan(new THREE.Vector3(0, ISLAND.topY + 0.1, 0), rim),
    flatMat(PALETTE.grass),
    group,
  );
  top.name = 'island-top';

  const makeRing = (y: number, radiusScale: number, jitter: number): THREE.Vector3[] =>
    rim.map((_vertex, i) => {
      const angle = (i / segments) * Math.PI * 2;
      const radius = ISLAND.radius * radiusScale + (rng() - 0.5) * jitter;
      return new THREE.Vector3(
        Math.cos(angle) * radius,
        y + (rng() - 0.5) * jitter * 0.6,
        Math.sin(angle) * radius,
      );
    });

  const soilRing = makeRing(0.4, 0.8, 1.2);
  const rockRing = makeRing(-1.7, 0.55, 1.0);
  const lowerRing = makeRing(-3.9, 0.28, 0.8);

  mesh(ringBand(rim, soilRing), flatMat(PALETTE.dirt), group);
  mesh(ringBand(soilRing, rockRing), flatMat(PALETTE.rock), group);
  mesh(ringBand(rockRing, lowerRing), flatMat(PALETTE.rockDark), group);
  mesh(
    coneTip(lowerRing, new THREE.Vector3(0.3, -6.3, -0.2)),
    flatMat(PALETTE.rockDark),
    group,
  );

  for (let i = 0; i < 6; i++) {
    const angle = rng() * Math.PI * 2;
    const radius = 2.5 + rng() * 5.5;
    const height = 1.4 + rng() * 1.8;
    const spire = mesh(
      new THREE.ConeGeometry(0.45 + rng() * 0.5, height, 5),
      flatMat(PALETTE.rock),
      group,
      [Math.cos(angle) * radius, -1.2 - height / 2, Math.sin(angle) * radius],
    );
    spire.rotation.z = (rng() - 0.5) * 0.4;
  }

  for (let i = 0; i < 4; i++) {
    const angle = rng() * Math.PI * 2;
    const radius = 2 + rng() * 4;
    const chunk = mesh(
      new THREE.IcosahedronGeometry(0.35 + rng() * 0.4, 0),
      flatMat(PALETTE.rockDark),
      group,
      [Math.cos(angle) * radius, -4.5 - rng() * 3, Math.sin(angle) * radius],
    );
    chunk.rotation.set(rng() * 3, rng() * 3, rng() * 3);
  }

  const pathMaterial = flatMat(PALETTE.path);
  for (const path of PATHS) {
    mesh(ribbonGeometry(path, 1.5, ISLAND.topY + 0.03), pathMaterial, group);
  }

  const plaza = mesh(
    new THREE.CircleGeometry(2.3, 14),
    flatMat(PALETTE.plaza),
    group,
    [WELL[0], ISLAND.topY + 0.04, WELL[2]],
  );
  plaza.rotation.x = -Math.PI / 2;

  const shore = mesh(
    new THREE.RingGeometry(2.85, 3.5, 20),
    flatMat(PALETTE.shore),
    group,
    [POND.center[0], ISLAND.topY + 0.05, POND.center[1]],
  );
  shore.rotation.x = -Math.PI / 2;

  return { group };
}
