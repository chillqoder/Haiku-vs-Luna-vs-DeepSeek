import {
  CAMERA,
  CASTLE,
  DOCK,
  FIRECAMP,
  HEMISPHERE,
  PATROL,
  SKY,
  SUN,
  WELL,
  WOODCUT,
} from '../world/layout';
import type {
  CharacterEntry,
  RigKind,
  SimulationConfig,
} from './types';

/**
 * Optional GLB overrides. Drop authored models into `public/models/` and map
 * them here to replace the procedural rigs; anything left `undefined` keeps
 * the built-in low-poly fallback. See `public/models/README.md` for the node
 * and clip naming contract.
 */
const MODEL_FILES: Partial<Record<RigKind, string>> = {};

function yawTowards(
  from: readonly [number, number, number],
  to: readonly [number, number, number],
): number {
  return Math.atan2(to[0] - from[0], to[2] - from[2]);
}

function buildCharacters(): CharacterEntry[] {
  const gateStart = PATROL.gate[0];
  const gateEnd = PATROL.gate[1];
  const perimeter = PATROL.perimeter;
  const roam = PATROL.roam;

  const king: CharacterEntry = {
    id: 'king',
    kind: 'king',
    controller: 'king',
    model: MODEL_FILES.king ?? null,
    position: CASTLE.balcony,
    rotationY: 0,
    clip: 'Observe_Gaze_Turn',
    params: { loopSeconds: 8 },
  };

  const guards: CharacterEntry[] = [
    {
      id: 'guard-gate',
      kind: 'guard',
      controller: 'guard',
      model: MODEL_FILES.guard ?? null,
      position: gateStart,
      rotationY: yawTowards(gateStart, gateEnd),
      clip: 'Patrol_Segment',
      params: { waypointPath: 'guard-gate', startIndex: 0, speed: 1.05, inspectSeconds: 2 },
    },
    {
      id: 'guard-perimeter-a',
      kind: 'guard',
      controller: 'guard',
      model: MODEL_FILES.guard ?? null,
      position: perimeter[0],
      rotationY: yawTowards(perimeter[0], perimeter[1]),
      clip: 'Patrol_Segment',
      params: { waypointPath: 'guard-perimeter', startIndex: 0, startForward: true, speed: 1.25, inspectSeconds: 2 },
    },
    {
      id: 'guard-perimeter-b',
      kind: 'guard',
      controller: 'guard',
      model: MODEL_FILES.guard ?? null,
      position: perimeter[2],
      rotationY: yawTowards(perimeter[2], perimeter[1]),
      clip: 'Patrol_Segment',
      params: { waypointPath: 'guard-perimeter', startIndex: 2, startForward: false, speed: 1.15, inspectSeconds: 2 },
    },
  ];

  const workers: CharacterEntry[] = [
    {
      id: 'lumberjack',
      kind: 'lumberjack',
      controller: 'lumberjack',
      model: MODEL_FILES.lumberjack ?? null,
      position: WOODCUT.worker,
      rotationY: yawTowards(WOODCUT.worker, WOODCUT.stump),
      clip: 'Chop_Lift_Rest',
      params: { loopSeconds: 4 },
    },
    {
      id: 'cook',
      kind: 'cook',
      controller: 'cook',
      model: MODEL_FILES.cook ?? null,
      position: FIRECAMP.cookStand,
      rotationY: yawTowards(FIRECAMP.cookStand, FIRECAMP.fire),
      clip: 'Stir_Taste_Refill',
      params: { loopSeconds: 5 },
    },
    {
      id: 'fisherman',
      kind: 'fisherman',
      controller: 'fisherman',
      model: MODEL_FILES.fisherman ?? null,
      position: DOCK.fisherSeat,
      rotationY: -Math.PI / 2,
      clip: 'Cast_Wait_Reel',
      params: { loopSeconds: 8 },
    },
  ];

  const childRadius = 2.6;
  const children: CharacterEntry[] = [
    {
      id: 'child-a',
      kind: 'child',
      controller: 'child',
      model: MODEL_FILES.child ?? null,
      position: [WELL[0] + childRadius, WELL[1], WELL[2]],
      rotationY: 0,
      clip: 'Chase_1_Chase_2',
      params: {
        center: [WELL[0], WELL[1], WELL[2]],
        radius: childRadius,
        angularSpeed: 0.85,
        trailAngle: 0,
        startAngle: 0,
      },
    },
    {
      id: 'child-b',
      kind: 'child',
      controller: 'child',
      model: MODEL_FILES.child ?? null,
      position: [
        WELL[0] + childRadius * Math.cos(-0.55),
        WELL[1],
        WELL[2] + childRadius * Math.sin(-0.55),
      ],
      rotationY: 0,
      clip: 'Chase_1_Chase_2',
      params: {
        center: [WELL[0], WELL[1], WELL[2]],
        radius: childRadius,
        angularSpeed: 0.85,
        trailAngle: 0.55,
        startAngle: 0,
      },
    },
  ];

  const roamerStarts = [0, 2, 3, 5];
  const roamers: CharacterEntry[] = roamerStarts.map((startIndex, index) => ({
    id: `villager-${index + 1}`,
    kind: 'roamer' as RigKind,
    controller: 'roamer' as const,
    model: MODEL_FILES.roamer ?? null,
    position: roam[startIndex],
    rotationY: yawTowards(roam[startIndex], roam[(startIndex + 1) % roam.length]),
    clip: null,
    params: {
      waypointPath: 'roam-ring',
      startIndex,
      speed: 0.62,
      pauseSeconds: [2, 5],
      phaseOffset: index * 1.7,
    },
  }));

  return [king, ...guards, ...workers, ...children, ...roamers];
}

export function buildSimulationConfig(): SimulationConfig {
  return {
    version: 1,
    generatedAt: new Date().toISOString(),
    timeScale: 1,
    environment: {
      clearColor: SKY.clearColor,
      fog: { color: SKY.fogColor, near: SKY.fogNear, far: SKY.fogFar },
      sun: { position: SUN.position, color: SUN.color, intensity: SUN.intensity },
      hemisphere: {
        skyColor: HEMISPHERE.skyColor,
        groundColor: HEMISPHERE.groundColor,
        intensity: HEMISPHERE.intensity,
      },
      camera: {
        target: CAMERA.target,
        minDistance: CAMERA.minDistance,
        maxDistance: CAMERA.maxDistance,
        minPolarDeg: CAMERA.minPolarDeg,
        maxPolarDeg: CAMERA.maxPolarDeg,
        dampingFactor: CAMERA.dampingFactor,
      },
    },
    assets: {
      basePath: '/models/',
      dracoPath: '/draco/',
      palette: '/models/palette.json',
    },
    waypoints: {
      'guard-gate': PATROL.gate,
      'guard-perimeter': PATROL.perimeter,
      'roam-ring': PATROL.roam,
    },
    characters: buildCharacters(),
  };
}
