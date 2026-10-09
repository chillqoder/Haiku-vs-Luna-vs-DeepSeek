import * as THREE from 'three';
import { PALETTE, flatMat } from '../world/palette';
import { hashString, mulberry32 } from '../utils/rng';
import type { RigKind } from '../simulation/types';

export interface RigPart {
  obj: THREE.Object3D;
  restPosition: THREE.Vector3;
  restRotation: THREE.Euler;
}

export interface CharacterRig {
  root: THREE.Group;
  torso: THREE.Object3D;
  head: THREE.Object3D;
  armL: THREE.Object3D;
  armR: THREE.Object3D;
  legL: THREE.Object3D;
  legR: THREE.Object3D;
  handL: THREE.Object3D;
  handR: THREE.Object3D;
  tool: THREE.Group;
  parts: RigPart[];
  height: number;
  animatedByClips: boolean;
}

export interface RigOptions {
  kind: RigKind;
  scale?: number;
  seed?: number;
}

export type ToolKind = 'none' | 'axe' | 'spear' | 'rod' | 'ladle';

interface RigStyle {
  tunic: string;
  legs: string;
  skin: string;
  headgear: 'none' | 'crown' | 'helmet' | 'straw' | 'chef';
  tool: ToolKind;
  cape: boolean;
  apron: boolean;
  scale: number;
}

const PEASANT_TUNICS = ['#6fae5a', '#b98a54', '#7c9fb5', '#a86a8a'];
const CHILD_TUNICS = ['#e0a13c', '#7fbf6a'];

const STYLE_BY_KIND: Record<Exclude<RigKind, 'peasant' | 'roamer'>, RigStyle> = {
  king: {
    tunic: '#8e3b5e',
    legs: '#5e2740',
    skin: PALETTE.skin,
    headgear: 'crown',
    tool: 'none',
    cape: true,
    apron: false,
    scale: 1.06,
  },
  guard: {
    tunic: PALETTE.armor,
    legs: '#5f6b78',
    skin: PALETTE.skin,
    headgear: 'helmet',
    tool: 'spear',
    cape: false,
    apron: false,
    scale: 1.02,
  },
  lumberjack: {
    tunic: PALETTE.roofRed,
    legs: '#6b4a2f',
    skin: PALETTE.skin,
    headgear: 'none',
    tool: 'axe',
    cape: false,
    apron: false,
    scale: 1,
  },
  cook: {
    tunic: '#5a7d9a',
    legs: '#7a6a4a',
    skin: PALETTE.skin,
    headgear: 'chef',
    tool: 'ladle',
    cape: false,
    apron: true,
    scale: 0.98,
  },
  fisherman: {
    tunic: '#4f7d8c',
    legs: '#7a6a4a',
    skin: PALETTE.skin,
    headgear: 'straw',
    tool: 'rod',
    cape: false,
    apron: false,
    scale: 1,
  },
  child: {
    tunic: CHILD_TUNICS[0],
    legs: '#7a6a4a',
    skin: PALETTE.skin,
    headgear: 'none',
    tool: 'none',
    cape: false,
    apron: false,
    scale: 0.68,
  },
};

function resolveStyle(options: RigOptions): RigStyle {
  const seed = options.seed ?? hashString(options.kind);
  const rng = mulberry32(seed);
  if (options.kind === 'king' || options.kind === 'guard' || options.kind === 'lumberjack' || options.kind === 'cook' || options.kind === 'fisherman') {
    return STYLE_BY_KIND[options.kind];
  }
  if (options.kind === 'child') {
    const style = STYLE_BY_KIND.child;
    return { ...style, tunic: CHILD_TUNICS[seed % CHILD_TUNICS.length] };
  }
  return {
    tunic: PEASANT_TUNICS[Math.floor(rng() * PEASANT_TUNICS.length)],
    legs: '#7a6a4a',
    skin: PALETTE.skin,
    headgear: 'none',
    tool: 'none',
    cape: false,
    apron: false,
    scale: 1,
  };
}

/**
 * Procedural low-poly humanoid factory. Produces a named rig (feet at local
 * origin, character facing +Z) that controllers animate through the shared
 * `parts` rest-pose table. This is the zero-asset fallback for every GLB.
 */
export function buildCharacterRig(options: RigOptions): CharacterRig {
  const style = resolveStyle(options);
  const root = new THREE.Group();
  root.name = `rig:${options.kind}`;
  root.scale.setScalar((style.scale ?? 1) * (options.scale ?? 1));

  const skinMaterial = flatMat(style.skin);
  const tunicMaterial = flatMat(style.tunic);
  const legsMaterial = flatMat(style.legs);
  const shoeMaterial = flatMat('#4a3b2a');
  const handMaterial = flatMat(PALETTE.skinDark);

  const legL = new THREE.Group();
  legL.name = 'legL';
  legL.position.set(-0.12, 0.62, 0);
  root.add(legL);
  mesh(new THREE.BoxGeometry(0.17, 0.6, 0.2), legsMaterial, legL, [0, -0.3, 0]);
  mesh(new THREE.BoxGeometry(0.19, 0.09, 0.28), shoeMaterial, legL, [0, -0.585, 0.04]);

  const legR = new THREE.Group();
  legR.name = 'legR';
  legR.position.set(0.12, 0.62, 0);
  root.add(legR);
  mesh(new THREE.BoxGeometry(0.17, 0.6, 0.2), legsMaterial, legR, [0, -0.3, 0]);
  mesh(new THREE.BoxGeometry(0.19, 0.09, 0.28), shoeMaterial, legR, [0, -0.585, 0.04]);

  const torso = new THREE.Group();
  torso.name = 'torso';
  torso.position.set(0, 0.62, 0);
  root.add(torso);
  mesh(new THREE.BoxGeometry(0.46, 0.5, 0.28), tunicMaterial, torso, [0, 0.27, 0]);
  mesh(new THREE.CylinderGeometry(0.24, 0.36, 0.42, 6), tunicMaterial, torso, [0, 0.0, 0]);
  mesh(new THREE.BoxGeometry(0.48, 0.08, 0.3), flatMat('#5b4632'), torso, [0, 0.06, 0]);

  if (style.cape) {
    const cape = mesh(new THREE.BoxGeometry(0.5, 0.72, 0.06), flatMat('#5e2740'), torso, [0, 0.16, -0.18]);
    cape.rotation.x = -0.1;
  }
  if (style.apron) {
    mesh(new THREE.BoxGeometry(0.36, 0.42, 0.05), flatMat('#f2efe8'), torso, [0, 0.06, 0.16]);
  }
  if (style.tool === 'spear') {
    for (const sx of [-1, 1]) {
      mesh(new THREE.BoxGeometry(0.2, 0.1, 0.24), flatMat(PALETTE.stoneLight), torso, [sx * 0.3, 0.52, 0]);
    }
  }

  const armL = new THREE.Group();
  armL.name = 'armL';
  armL.position.set(-0.3, 0.5, 0);
  torso.add(armL);
  mesh(new THREE.BoxGeometry(0.13, 0.48, 0.16), tunicMaterial, armL, [0, -0.24, 0]);
  mesh(new THREE.BoxGeometry(0.11, 0.11, 0.11), handMaterial, armL, [0, -0.52, 0]);
  const handL = new THREE.Object3D();
  handL.name = 'handL';
  handL.position.set(0, -0.5, 0);
  armL.add(handL);

  const armR = new THREE.Group();
  armR.name = 'armR';
  armR.position.set(0.3, 0.5, 0);
  torso.add(armR);
  mesh(new THREE.BoxGeometry(0.13, 0.48, 0.16), tunicMaterial, armR, [0, -0.24, 0]);
  mesh(new THREE.BoxGeometry(0.11, 0.11, 0.11), handMaterial, armR, [0, -0.52, 0]);
  const handR = new THREE.Object3D();
  handR.name = 'handR';
  handR.position.set(0, -0.5, 0);
  armR.add(handR);

  const head = new THREE.Group();
  head.name = 'head';
  head.position.set(0, 0.62, 0);
  torso.add(head);
  mesh(new THREE.BoxGeometry(0.32, 0.3, 0.3), skinMaterial, head, [0, 0.15, 0]);
  mesh(new THREE.BoxGeometry(0.07, 0.07, 0.07), skinMaterial, head, [0, 0.12, 0.17]);
  const eyeMaterial = flatMat('#2d2a26');
  mesh(new THREE.BoxGeometry(0.045, 0.045, 0.02), eyeMaterial, head, [0.08, 0.19, 0.155]);
  mesh(new THREE.BoxGeometry(0.045, 0.045, 0.02), eyeMaterial, head, [-0.08, 0.19, 0.155]);
  decorateHead(head, style);

  const tool = buildTool(style.tool);
  handR.add(tool);

  const parts: RigPart[] = [torso, head, armL, armR, legL, legR].map((obj) => ({
    obj,
    restPosition: obj.position.clone(),
    restRotation: obj.rotation.clone(),
  }));

  return {
    root,
    torso,
    head,
    armL,
    armR,
    legL,
    legR,
    handL,
    handR,
    tool,
    parts,
    height: 1.62 * root.scale.x,
    animatedByClips: false,
  };
}

function decorateHead(head: THREE.Group, style: RigStyle): void {
  if (style.headgear === 'crown') {
    mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.1, 8), flatMat(PALETTE.gold), head, [0, 0.33, 0]);
    for (let i = 0; i < 4; i++) {
      const angle = (i / 4) * Math.PI * 2;
      mesh(new THREE.ConeGeometry(0.035, 0.12, 4), flatMat(PALETTE.gold), head, [
        Math.cos(angle) * 0.14,
        0.42,
        Math.sin(angle) * 0.14,
      ]);
    }
    return;
  }
  if (style.headgear === 'helmet') {
    mesh(new THREE.CylinderGeometry(0.19, 0.2, 0.16, 8), flatMat(PALETTE.stoneLight), head, [0, 0.31, 0]);
    mesh(new THREE.CylinderGeometry(0.225, 0.225, 0.035, 8), flatMat(PALETTE.steel), head, [0, 0.24, 0]);
    const plume = mesh(new THREE.ConeGeometry(0.05, 0.2, 5), flatMat(PALETTE.plume), head, [0, 0.45, 0]);
    plume.rotation.x = 0.5;
    return;
  }
  if (style.headgear === 'straw') {
    mesh(new THREE.ConeGeometry(0.3, 0.16, 8), flatMat('#d9b96a'), head, [0, 0.33, 0]);
    mesh(new THREE.CylinderGeometry(0.36, 0.36, 0.025, 8), flatMat('#d9b96a'), head, [0, 0.3, 0]);
    return;
  }
  if (style.headgear === 'chef') {
    mesh(new THREE.CylinderGeometry(0.16, 0.17, 0.16, 8), flatMat('#f2efe8'), head, [0, 0.33, 0]);
  }
}

/** Tools hang along the hand's local -Y (arm direction) from the grip. */
export function buildTool(kind: ToolKind): THREE.Group {
  const tool = new THREE.Group();
  tool.name = 'tool';
  if (kind === 'none') return tool;

  const woodMaterial = flatMat(PALETTE.wood);

  if (kind === 'axe') {
    mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.72, 6), woodMaterial, tool, [0, -0.3, 0]);
    const head = mesh(new THREE.BoxGeometry(0.3, 0.14, 0.06), flatMat(PALETTE.steel), tool, [0.08, -0.63, 0]);
    head.rotation.z = 0.12;
    return tool;
  }

  if (kind === 'spear') {
    mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.9, 6), woodMaterial, tool, [0, -0.2, 0]);
    mesh(new THREE.ConeGeometry(0.06, 0.28, 6), flatMat(PALETTE.steel), tool, [0, 0.82, 0]);
    return tool;
  }

  if (kind === 'rod') {
    const rod = mesh(new THREE.CylinderGeometry(0.018, 0.012, 1.25, 5), woodMaterial, tool, [0, -0.55, 0]);
    rod.rotation.z = 0.1;
    const tip = new THREE.Object3D();
    tip.name = 'tip';
    tip.position.set(0.07, -1.18, 0);
    tool.add(tip);
    tool.userData.tip = tip;
    const line = mesh(new THREE.CylinderGeometry(0.006, 0.006, 1.4, 4), flatMat('#d8d8d8'), tool, [0.07, -1.9, 0]);
    line.castShadow = false;
    return tool;
  }

  mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.65, 5), woodMaterial, tool, [0, -0.3, 0]);
  mesh(new THREE.SphereGeometry(0.09, 6, 5), flatMat('#4a4a4a'), tool, [0, -0.66, 0]);
  return tool;
}

/**
 * Adapter for authored GLBs: looks up the documented node names and fills in
 * proxy objects (or an empty tool group) for anything missing so controllers
 * never have to null-check rig parts.
 */
export function rigFromGltfScene(scene: THREE.Group): CharacterRig {
  const bag: { found: THREE.Object3D | null } = { found: null };
  const findByName = (names: string[]): THREE.Object3D | null => {
    bag.found = null;
    scene.traverse((object) => {
      if (bag.found) return;
      const normalized = object.name.toLowerCase().replace(/[^a-z]/g, '');
      if (names.includes(normalized)) bag.found = object;
    });
    return bag.found;
  };

  const root = new THREE.Group();
  root.name = scene.name || 'rig:gltf';
  root.add(scene);

  const torso = findByName(['torso', 'body', 'spine', 'chest']) ?? proxy(root, [0, 0.62, 0]);
  const head = findByName(['head']) ?? proxy(torso, [0, 0.62, 0]);
  const armL = findByName(['arml', 'leftarm']) ?? proxy(torso, [-0.3, 0.5, 0]);
  const armR = findByName(['armr', 'rightarm']) ?? proxy(torso, [0.3, 0.5, 0]);
  const legL = findByName(['legl', 'leftleg']) ?? proxy(root, [-0.12, 0.62, 0]);
  const legR = findByName(['legr', 'rightleg']) ?? proxy(root, [0.12, 0.62, 0]);
  const handL = findByName(['handl', 'lefthand']) ?? proxy(armL, [0, -0.5, 0]);
  const handR = findByName(['handr', 'righthand']) ?? proxy(armR, [0, -0.5, 0]);
  const tool = (findByName(['tool']) as THREE.Group | null) ?? proxyGroup(handR);

  const parts: RigPart[] = [torso, head, armL, armR, legL, legR].map((obj) => ({
    obj,
    restPosition: obj.position.clone(),
    restRotation: obj.rotation.clone(),
  }));

  return {
    root,
    torso,
    head,
    armL,
    armR,
    legL,
    legR,
    handL,
    handR,
    tool,
    parts,
    height: 1.7,
    animatedByClips: false,
  };
}

function proxy(parent: THREE.Object3D, position: [number, number, number]): THREE.Object3D {
  const holder = new THREE.Object3D();
  holder.position.set(position[0], position[1], position[2]);
  parent.add(holder);
  return holder;
}

function proxyGroup(parent: THREE.Object3D): THREE.Group {
  const holder = new THREE.Group();
  parent.add(holder);
  return holder;
}

function mesh(
  geometry: THREE.BufferGeometry,
  material: THREE.Material,
  parent: THREE.Object3D,
  position: [number, number, number],
): THREE.Mesh {
  const instance = new THREE.Mesh(geometry, material);
  instance.position.set(position[0], position[1], position[2]);
  instance.castShadow = true;
  instance.receiveShadow = true;
  parent.add(instance);
  return instance;
}
