/**
 * Single source of truth for the diorama world layout. Pure data only (no
 * Three.js imports) so both the server manifest and the client world
 * builders can consume identical coordinates.
 */

export type Vec2 = [number, number];
export type Vec3 = [number, number, number];

export const ISLAND = {
  seed: 1337,
  radius: 14,
  topY: 2.2,
};

export const POND = {
  center: [-7.2, 0.4] as Vec2,
  radius: 3.1,
  surfaceY: 2.23,
};

export const CASTLE = {
  center: [0, -8.4] as Vec2,
  terraceTopY: 4.0,
  keepSize: [3.4, 3.2, 3.4] as Vec3,
  balcony: [0, 4.0, -6.3] as Vec3,
};

export const WELL = [0, 2.2, 2.8] as Vec3;

export const FIRECAMP = {
  fire: [2.5, 2.2, 4.3] as Vec3,
  cookStand: [1.55, 2.2, 4.55] as Vec3,
};

export const WOODCUT = {
  stump: [6.2, 2.2, 1.6] as Vec3,
  worker: [5.4, 2.2, 1.6] as Vec3,
};

export const DOCK = {
  start: [-4.0, 2.2, 0.4] as Vec3,
  end: [-6.3, 2.2, 0.4] as Vec3,
  deckTopY: 2.38,
  fisherSeat: [-6.05, 2.38, 0.4] as Vec3,
};

export interface CottageSpec {
  position: Vec3;
  rotationY: number;
  variant: 'plaster' | 'straw' | 'tower';
}

export const COTTAGES: CottageSpec[] = [
  { position: [-4.3, 2.2, 5.0], rotationY: 0.45, variant: 'plaster' },
  { position: [3.5, 2.2, 5.6], rotationY: -0.35, variant: 'straw' },
  { position: [6.9, 2.2, -2.2], rotationY: 2.55, variant: 'plaster' },
  { position: [-5.2, 2.2, -3.6], rotationY: 0.9, variant: 'tower' },
];

export interface TreeSpec {
  position: Vec3;
  variant: 'pine' | 'pineTall' | 'oak';
  scale: number;
}

export const TREES: TreeSpec[] = [
  { position: [-11.4, 2.2, 3.2], variant: 'pine', scale: 1.1 },
  { position: [-9.8, 2.2, 7.2], variant: 'oak', scale: 1.0 },
  { position: [-5.0, 2.2, 10.8], variant: 'pineTall', scale: 1.15 },
  { position: [1.6, 2.2, 11.8], variant: 'pine', scale: 0.95 },
  { position: [7.2, 2.2, 9.4], variant: 'oak', scale: 1.05 },
  { position: [11.2, 2.2, 4.8], variant: 'pine', scale: 1.2 },
  { position: [12.4, 2.2, -1.6], variant: 'pineTall', scale: 1.0 },
  { position: [8.8, 2.2, -7.8], variant: 'pine', scale: 1.1 },
  { position: [6.2, 2.2, -10.4], variant: 'oak', scale: 0.9 },
  { position: [-6.0, 2.2, -10.6], variant: 'pine', scale: 1.05 },
  { position: [-2.4, 2.2, -2.0], variant: 'oak', scale: 0.85 },
  { position: [3.4, 2.2, -3.0], variant: 'pine', scale: 0.9 },
];

export const FENCES: { from: Vec2; to: Vec2 }[] = [
  { from: [-3.35, -1.2], to: [-3.35, 2.0] },
  { from: [5.4, -0.4], to: [8.2, -0.1] },
  { from: [8.2, -0.1], to: [8.6, 2.6] },
];

export interface BenchSpec {
  position: Vec3;
  rotationY: number;
}

export const PROPS = {
  barrels: [
    [3.2, 2.2, 3.9],
    [-3.4, 2.2, 4.4],
    [7.5, 2.2, -0.8],
  ] as Vec3[],
  crates: [
    [-2.7, 2.2, -2.4],
    [2.8, 2.2, -2.2],
  ] as Vec3[],
  benches: [
    { position: [2.2, 2.2, 1.05], rotationY: -0.9 },
    { position: [-2.2, 2.2, 4.55], rotationY: 2.24 },
    { position: [-3.6, 2.2, 2.0], rotationY: -1.99 },
  ] as BenchSpec[],
};

export const PATHS: Vec2[][] = [
  [
    [0, -1.4],
    [0, 2.8],
  ],
  [
    [0, 2.8],
    [-2.6, 2.6],
    [-3.9, 1.6],
    [-4.1, 0.6],
  ],
  [
    [0, 2.8],
    [3.2, 2.4],
    [4.8, 1.8],
  ],
];

export const PATROL = {
  gate: [
    [-1.7, 2.2, -1.9],
    [1.7, 2.2, -1.9],
  ] as Vec3[],
  perimeter: [
    [4.6, 2.2, -4.2],
    [8.2, 2.2, -1.0],
    [8.6, 2.2, 3.0],
    [4.6, 2.2, 6.4],
    [0.6, 2.2, 7.2],
  ] as Vec3[],
  roam: [
    [5.0, 2.2, 2.0],
    [4.4, 2.2, -1.6],
    [2.2, 2.2, -2.4],
    [-2.9, 2.2, -0.8],
    [-3.6, 2.2, 2.4],
    [-0.8, 2.2, 4.6],
  ] as Vec3[],
};

export const CAMERA = {
  target: [0, 0, 0] as Vec3,
  startPosition: [17, 13, 18] as Vec3,
  minDistance: 16,
  maxDistance: 48,
  minPolarDeg: 15,
  maxPolarDeg: 75,
  dampingFactor: 0.05,
};

export const SUN = {
  position: [14, 24, 10] as Vec3,
  color: '#ffe6bd',
  intensity: 2.4,
};

export const HEMISPHERE = {
  skyColor: '#cfe6ff',
  groundColor: '#7d8f5e',
  intensity: 0.8,
};

export const SKY = {
  clearColor: '#b6dcff',
  fogColor: '#cfe6fb',
  fogNear: 60,
  fogFar: 150,
};
