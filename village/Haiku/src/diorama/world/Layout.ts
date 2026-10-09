/**
 * Раскладка острова в мировых координатах (1 единица ≈ 1 м, условно).
 * Ось X — восток, ось Z — юг, отрицательное Z — север: крепость на севере, деревня на юге.
 * Координаты персонажей и патрулей задаются в config/simulation-manifest.json в тех же единицах.
 */
export type Point2 = readonly [number, number];
export type Point3 = readonly [number, number, number];

export const ISLAND = {
  /** Радиус плоской вершины; дальше поверхность скашивается к краю. */
  topRadius: 11.2,
  edgeRadius: 12.6,
  waterLevel: -0.26,
} as const;

export const TERRACE = {
  center: [0, -7.8] as Point2,
  radius: 5.0,
  bottomRadius: 5.6,
  /** Высота верхней площадки террасы над островом. */
  top: 1.0,
};

export const POND = {
  center: [-5.6, 0.6] as Point2,
  radius: 2.5,
  bankRadius: 3.4,
};

export const PIER = {
  from: [-2.6, 0.6] as Point2,
  to: [-4.7, 0.6] as Point2,
  deckY: 0.14,
};

export const WELL = { center: [0, 4] as Point2, radius: 0.85 };

export const FIREPIT = { center: [3.3, 2.9] as Point2 };

export const CHOPPING_BLOCK = { position: [8.2, 0.2] as Point2 };

export const WOODPILE = { position: [9.6, 0.2] as Point2 };

export const COTTAGES: readonly Point2[] = [
  [-8.4, -4.0],
  [-7.0, -6.8],
  [-3.6, 7.6],
  [-7.2, 6.0],
];

export const BENCHES: readonly Point2[] = [
  [-1.2, 6.9],
  [4.9, 4.9],
  [-2.9, 4.4],
];

export const BARRELS: readonly Point2[] = [
  [2.1, 0.9],
  [2.9, 0.3],
  [-6.1, 4.6],
];

export const EAST_FENCE: readonly [Point2, Point2] = [
  [10.0, -1.8],
  [10.0, 2.8],
];

export const TREES: readonly { kind: 'pine' | 'oak'; position: Point2 }[] = [
  { kind: 'pine', position: [-10.2, -0.8] },
  { kind: 'oak', position: [-1.8, -1.5] },
  { kind: 'oak', position: [5.6, -5.0] },
  { kind: 'pine', position: [4.8, 6.6] },
  { kind: 'oak', position: [-0.6, 10.2] },
  { kind: 'pine', position: [1.4, 10.0] },
];

/** Каменные дорожки: точки [x, y, z], y — высота поверхности под дорожкой. */
export const PATHS: readonly (readonly Point3[])[] = [
  // Ворота крепости → пандус с террасы → колодец
  [
    [0, 1.03, -4.6],
    [0, 1.03, -3.0],
    [0, 0.03, -1.2],
    [0, 0.03, 1.8],
    [0, 0.03, 3.0],
  ],
  // Колодец → пирс
  [
    [0, 0.03, 1.8],
    [-1.5, 0.03, 1.2],
    [-2.4, 0.03, 0.8],
    [-2.6, 0.17, 0.6],
  ],
  // Колодец → костёр → лесоповал
  [
    [0.9, 0.03, 3.9],
    [2.6, 0.03, 4.6],
    [4.6, 0.03, 3.6],
    [6.4, 0.03, 1.6],
    [7.3, 0.03, 0.6],
  ],
];
