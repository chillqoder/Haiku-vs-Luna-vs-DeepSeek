export type Vec3Tuple = [number, number, number];

export type CharacterKind =
  | "king"
  | "guard"
  | "lumberjack"
  | "cook"
  | "fisherman"
  | "child"
  | "ambient";

export interface CharacterConfig {
  id: string;
  name: string;
  kind: CharacterKind;
  position: Vec3Tuple;
  facing?: number;
  color?: string;
  accent?: string;
  assetPath?: string;
  clip?: string;
  startOffset?: number;
  patrol?: Vec3Tuple[];
}

export interface SimulationManifest {
  version: number;
  island: {
    center: Vec3Tuple;
    topRadius: [number, number];
  };
  characters: CharacterConfig[];
}

export interface CharacterRig {
  root: import("three").Group;
  torso: import("three").Group;
  head: import("three").Group;
  leftArm: import("three").Group;
  rightArm: import("three").Group;
  leftLeg: import("three").Group;
  rightLeg: import("three").Group;
  prop?: import("three").Group;
  secondProp?: import("three").Group;
  mixer?: import("three").AnimationMixer;
}
