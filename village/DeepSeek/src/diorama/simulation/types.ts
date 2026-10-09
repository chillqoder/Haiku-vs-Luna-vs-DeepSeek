/**
 * Shared simulation contract between the Next.js server (API route /
 * manifest) and the client-side Three.js engine. This module is pure data
 * types only: it must never import Three.js so that server components and
 * route handlers can depend on it safely.
 */

export type RigKind =
  | 'king'
  | 'guard'
  | 'peasant'
  | 'lumberjack'
  | 'cook'
  | 'fisherman'
  | 'child'
  | 'roamer';

export type ControllerKind =
  | 'king'
  | 'guard'
  | 'lumberjack'
  | 'cook'
  | 'fisherman'
  | 'child'
  | 'roamer';

export interface CharacterParams {
  loopSeconds?: number;
  phaseOffset?: number;
  speed?: number;
  inspectSeconds?: number;
  pauseSeconds?: [number, number];
  waypointPath?: string;
  startIndex?: number;
  startForward?: boolean;
  center?: [number, number, number];
  radius?: number;
  angularSpeed?: number;
  trailAngle?: number;
  startAngle?: number;
}

export interface CharacterEntry {
  id: string;
  kind: RigKind;
  controller: ControllerKind;
  model: string | null;
  position: [number, number, number];
  rotationY: number;
  clip: string | null;
  params: CharacterParams;
}

export interface FogConfig {
  color: string;
  near: number;
  far: number;
}

export interface SunConfig {
  position: [number, number, number];
  color: string;
  intensity: number;
}

export interface HemisphereConfig {
  skyColor: string;
  groundColor: string;
  intensity: number;
}

export interface CameraConfig {
  target: [number, number, number];
  minDistance: number;
  maxDistance: number;
  minPolarDeg: number;
  maxPolarDeg: number;
  dampingFactor: number;
}

export interface EnvironmentConfig {
  clearColor: string;
  fog: FogConfig;
  sun: SunConfig;
  hemisphere: HemisphereConfig;
  camera: CameraConfig;
}

export interface AssetsConfig {
  basePath: string;
  dracoPath: string;
  palette: string;
}

export interface SimulationConfig {
  version: number;
  generatedAt: string;
  timeScale: number;
  environment: EnvironmentConfig;
  assets: AssetsConfig;
  waypoints: Record<string, [number, number, number][]>;
  characters: CharacterEntry[];
}

export interface WaterContext {
  x: number;
  y: number;
  z: number;
  radius: number;
  spawnRipple: (x: number, z: number) => void;
}

export interface SimulationContext {
  water?: WaterContext;
}
