/**
 * Генератор низкополигональных персонажей: строит иерархии узлов, AnimationClip'ы
 * и экспортирует их в public/models/characters/*.glb.
 *
 * Запуск: npm run assets:characters
 *
 * Рантайм не импортирует этот файл. Он читает готовые GLB по путям из
 * config/simulation-manifest.json, а имена клипов в манифесте должны совпадать
 * с именами из CLIP_SETS ниже.
 */
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import * as THREE from 'three';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';

// GLTFExporter собирает бинарный GLB через FileReader, которого в Node.js нет.
// Blob в Node есть, поэтому достаточно минимальной обёртки над arrayBuffer().
class NodeFileReader {
  result: ArrayBuffer | null = null;
  onloadend: (() => void) | null = null;

  readAsArrayBuffer(blob: Blob): void {
    void blob.arrayBuffer().then((buffer) => {
      this.result = buffer;
      this.onloadend?.();
    });
  }
}

if (typeof globalThis.FileReader === 'undefined') {
  Object.assign(globalThis, { FileReader: NodeFileReader });
}

type Vec3 = [number, number, number];
/** Поза на один кадр: углы Эйлера (рад) и/или позиция для именованных узлов. */
type Pose = Record<string, { rot?: Vec3; pos?: Vec3 }>;

const TAU = Math.PI * 2;
const FPS = 30;
const OUTPUT_DIR = path.resolve(process.cwd(), 'public/models/characters');

// Точки вращения (относительно родителя). Тазовый узел Body — центр, от которого
// строятся торс, голова и руки. Углы рук: 0 — рука опущена, +PI — поднята над головой,
// отрицательные значения — вперёд.
const REST: Record<string, Vec3> = {
  Body: [0, 0.52, 0],
  Head: [0, 0.42, 0],
  ArmL: [0.24, 0.38, 0],
  ArmR: [-0.24, 0.38, 0],
  LegL: [0.1, -0.02, 0],
  LegR: [-0.1, -0.02, 0],
};

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const clamp01 = (t: number) => Math.min(1, Math.max(0, t));
const smooth = (t: number) => {
  const u = clamp01(t);
  return u * u * (3 - 2 * u);
};
const easeIn = (t: number) => {
  const u = clamp01(t);
  return u * u;
};

// ---------- Материалы ----------

class Materials {
  private readonly cache = new Map<string, THREE.MeshStandardMaterial>();

  constructor(private readonly colors: Record<string, string>) {}

  get(name: string): THREE.MeshStandardMaterial {
    let material = this.cache.get(name);
    if (!material) {
      material = new THREE.MeshStandardMaterial({
        name,
        color: this.colors[name] ?? '#ff00ff',
        roughness: 0.85,
        metalness: 0,
        flatShading: true,
      });
      this.cache.set(name, material);
    }
    return material;
  }
}

const VILLAGER_COLORS = {
  Skin: '#efbf98',
  Hair: '#5b3b24',
  Tunic: '#c98a4b',
  Trousers: '#5d4a3a',
  Boots: '#3f2b1f',
  Leather: '#6b4226',
  Hat: '#d9b45c',
  Wood: '#8a5a34',
  Iron: '#8f98a3',
  Red: '#c0392b',
};

const GUARD_COLORS = {
  Skin: '#efbf98',
  Armor: '#b9c2cc',
  Dark: '#363d4a',
  Red: '#c0392b',
  Leather: '#6b4226',
  Boots: '#3f2b1f',
  Shield: '#2f5fa8',
  Gold: '#f1c40f',
  Wood: '#8a5a34',
  Iron: '#8f98a3',
};

const KING_COLORS = {
  Skin: '#efbf98',
  Robe: '#b3202a',
  RobeDark: '#8f1b22',
  Fur: '#f4f1ea',
  Gold: '#f5c542',
  Hair: '#cfd2d8',
  Beard: '#e4e0d4',
  Trousers: '#2f2f4a',
  Boots: '#1d1d22',
};

// ---------- Сборка иерархий ----------

function group(parent: THREE.Object3D, name: string, position: Vec3): THREE.Group {
  const node = new THREE.Group();
  node.name = name;
  node.position.set(...position);
  parent.add(node);
  return node;
}

function add(
  parent: THREE.Object3D,
  name: string,
  geometry: THREE.BufferGeometry,
  material: THREE.Material,
  position: Vec3 = [0, 0, 0],
  rotation: Vec3 = [0, 0, 0],
): THREE.Mesh {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = name;
  mesh.position.set(...position);
  mesh.rotation.set(...rotation);
  parent.add(mesh);
  return mesh;
}

function addLegs(body: THREE.Object3D, trousers: string, boots: string, m: Materials): void {
  for (const side of ['L', 'R'] as const) {
    const pivot = group(body, `Leg${side}`, REST[`Leg${side}`]);
    add(pivot, `Trouser${side}`, new THREE.BoxGeometry(0.14, 0.46, 0.14), m.get(trousers), [0, -0.23, 0]);
    add(pivot, `Boot${side}`, new THREE.BoxGeometry(0.15, 0.1, 0.22), m.get(boots), [0, -0.45, 0.03]);
  }
}

function addPlainArm(body: THREE.Object3D, side: 'L' | 'R', sleeve: string, m: Materials): THREE.Group {
  const pivot = group(body, `Arm${side}`, REST[`Arm${side}`]);
  add(pivot, `Sleeve${side}`, new THREE.BoxGeometry(0.12, 0.42, 0.12), m.get(sleeve), [0, -0.21, 0]);
  add(pivot, `Hand${side}`, new THREE.BoxGeometry(0.13, 0.12, 0.13), m.get('Skin'), [0, -0.45, 0]);
  return pivot;
}

/** Житель: туника, соломенная шляпа, три инструмента в правой руке (видимость решает рантайм). */
function buildVillager(m: Materials): THREE.Group {
  const root = new THREE.Group();
  root.name = 'Villager';

  const body = group(root, 'Body', REST.Body);
  add(body, 'Belt', new THREE.CylinderGeometry(0.205, 0.205, 0.05, 6), m.get('Leather'), [0, 0.04, 0]);
  add(body, 'TorsoMesh', new THREE.CylinderGeometry(0.16, 0.2, 0.42, 6), m.get('Tunic'), [0, 0.21, 0]);

  const head = group(body, 'Head', REST.Head);
  add(head, 'HeadMesh', new THREE.BoxGeometry(0.25, 0.25, 0.24), m.get('Skin'), [0, 0.125, 0]);
  add(head, 'HatBrim', new THREE.CylinderGeometry(0.24, 0.24, 0.03, 8), m.get('Hat'), [0, 0.27, 0]);
  add(head, 'HatCrown', new THREE.CylinderGeometry(0.14, 0.17, 0.16, 7), m.get('Hat'), [0, 0.36, 0]);

  addPlainArm(body, 'L', 'Tunic', m);
  const armR = addPlainArm(body, 'R', 'Tunic', m);
  addLegs(body, 'Trousers', 'Boots', m);

  // Инструменты крепятся к кисти правой руки. Рантайм показывает только нужный.
  const hand: Vec3 = [0, -0.45, 0];

  const axe = group(armR, 'Tool_Axe', hand);
  add(axe, 'AxeHandle', new THREE.CylinderGeometry(0.022, 0.022, 0.42, 5), m.get('Wood'), [0, -0.21, 0]);
  add(axe, 'AxeHead', new THREE.BoxGeometry(0.14, 0.2, 0.05), m.get('Iron'), [0, -0.44, 0.02]);

  const ladle = group(armR, 'Tool_Ladle', hand);
  add(ladle, 'LadleHandle', new THREE.CylinderGeometry(0.018, 0.018, 0.38, 5), m.get('Wood'), [0, -0.19, 0]);
  add(
    ladle,
    'LadleBowl',
    new THREE.SphereGeometry(0.09, 7, 4, 0, TAU, 0, Math.PI / 2),
    m.get('Iron'),
    [0, -0.4, 0],
    [Math.PI, 0, 0],
  );

  const rod = group(armR, 'Tool_Rod', hand);
  add(rod, 'RodShaft', new THREE.CylinderGeometry(0.012, 0.02, 1.3, 5), m.get('Wood'), [0, -0.65, 0]);
  add(rod, 'Bobber', new THREE.SphereGeometry(0.035, 6, 4), m.get('Red'), [0, -1.3, 0]);

  return root;
}

/** Стражник: латный доспех, шлем с гребнем, копьё в правой руке, щит в левой. */
function buildGuard(m: Materials): THREE.Group {
  const root = new THREE.Group();
  root.name = 'Guard';

  const body = group(root, 'Body', REST.Body);
  add(body, 'Cuirass', new THREE.BoxGeometry(0.42, 0.44, 0.28), m.get('Armor'), [0, 0.22, 0]);
  add(body, 'Belt', new THREE.BoxGeometry(0.44, 0.06, 0.3), m.get('Leather'), [0, 0.03, 0]);
  add(body, 'Tassets', new THREE.BoxGeometry(0.42, 0.16, 0.3), m.get('Armor'), [0, -0.08, 0]);

  const head = group(body, 'Head', REST.Head);
  add(head, 'Helmet', new THREE.BoxGeometry(0.3, 0.3, 0.28), m.get('Armor'), [0, 0.15, 0]);
  add(head, 'Visor', new THREE.BoxGeometry(0.24, 0.07, 0.04), m.get('Dark'), [0, 0.13, 0.15]);
  add(head, 'Crest', new THREE.BoxGeometry(0.05, 0.16, 0.22), m.get('Red'), [0, 0.37, 0]);

  const armR = group(body, 'ArmR', REST.ArmR);
  add(armR, 'SleeveR', new THREE.BoxGeometry(0.13, 0.42, 0.13), m.get('Armor'), [0, -0.21, 0]);
  add(armR, 'HandR', new THREE.BoxGeometry(0.14, 0.12, 0.14), m.get('Skin'), [0, -0.45, 0]);
  // Копьё стоит вертикально чуть впереди руки, чтобы не пересекать предплечье.
  const spear = group(armR, 'Spear', [0, 0, 0.12]);
  add(spear, 'SpearShaft', new THREE.CylinderGeometry(0.025, 0.025, 1.5, 5), m.get('Wood'), [0, 0.3, 0]);
  add(spear, 'SpearTip', new THREE.ConeGeometry(0.06, 0.22, 4), m.get('Iron'), [0, 1.16, 0]);

  const armL = group(body, 'ArmL', REST.ArmL);
  add(armL, 'SleeveL', new THREE.BoxGeometry(0.13, 0.42, 0.13), m.get('Armor'), [0, -0.21, 0]);
  add(armL, 'HandL', new THREE.BoxGeometry(0.14, 0.12, 0.14), m.get('Skin'), [0, -0.45, 0]);
  const shield = group(armL, 'Shield', [0, -0.2, 0.14]);
  add(shield, 'ShieldBoard', new THREE.BoxGeometry(0.34, 0.5, 0.05), m.get('Shield'));
  add(shield, 'ShieldBar', new THREE.BoxGeometry(0.05, 0.36, 0.07), m.get('Gold'), [0, 0, 0.03]);
  add(shield, 'ShieldCross', new THREE.BoxGeometry(0.2, 0.05, 0.07), m.get('Gold'), [0, 0.06, 0.03]);

  addLegs(body, 'Armor', 'Boots', m);
  return root;
}

/** Король: красная мантия с меховым воротником, золотая корона и борода. */
function buildKing(m: Materials): THREE.Group {
  const root = new THREE.Group();
  root.name = 'King';

  const body = group(root, 'Body', REST.Body);
  add(body, 'RobeSkirt', new THREE.CylinderGeometry(0.27, 0.33, 0.24, 7), m.get('Robe'), [0, -0.12, 0]);
  add(body, 'RobeTorso', new THREE.CylinderGeometry(0.2, 0.27, 0.42, 7), m.get('Robe'), [0, 0.21, 0]);
  add(body, 'FurCollar', new THREE.CylinderGeometry(0.21, 0.21, 0.06, 7), m.get('Fur'), [0, 0.4, 0]);
  add(body, 'Cape', new THREE.BoxGeometry(0.36, 0.52, 0.04), m.get('RobeDark'), [0, 0.22, -0.18]);

  const head = group(body, 'Head', REST.Head);
  add(head, 'HeadMesh', new THREE.BoxGeometry(0.26, 0.26, 0.25), m.get('Skin'), [0, 0.13, 0]);
  add(head, 'Hair', new THREE.BoxGeometry(0.27, 0.08, 0.26), m.get('Hair'), [0, 0.28, 0]);
  add(head, 'Beard', new THREE.BoxGeometry(0.18, 0.12, 0.06), m.get('Beard'), [0, 0.04, 0.14]);
  add(head, 'CrownRing', new THREE.CylinderGeometry(0.165, 0.18, 0.12, 8, 1, true), m.get('Gold'), [0, 0.33, 0]);
  for (let i = 0; i < 4; i++) {
    const angle = (i * Math.PI) / 2;
    add(
      head,
      `CrownSpike${i}`,
      new THREE.ConeGeometry(0.035, 0.12, 4),
      m.get('Gold'),
      [Math.sin(angle) * 0.16, 0.45, Math.cos(angle) * 0.16],
    );
  }

  addPlainArm(body, 'L', 'Robe', m);
  addPlainArm(body, 'R', 'Robe', m);
  addLegs(body, 'Trousers', 'Boots', m);
  return root;
}

// ---------- Анимации ----------

/** Периодический шаг: нога и рука в противофазе, таз слегка подпрыгивает. */
function gait(t: number, period: number, legSwing: number, armSwing: number, bob: number): Pose {
  const p = (TAU * t) / period;
  return {
    Body: { pos: [0, REST.Body[1] + (bob * (1 - Math.cos(2 * p))) / 2, 0] },
    LegR: { rot: [legSwing * Math.sin(p), 0, 0] },
    LegL: { rot: [-legSwing * Math.sin(p), 0, 0] },
    ArmR: { rot: [-armSwing * Math.sin(p), 0, 0] },
    ArmL: { rot: [armSwing * Math.sin(p), 0, 0] },
  };
}

function villagerIdle(t: number): Pose {
  const w = (TAU * t) / 3;
  return {
    Body: { pos: [0, REST.Body[1] + 0.008 * Math.sin(w), 0] },
    Head: { rot: [0, 0.3 * Math.sin(w), 0] },
    ArmR: { rot: [0.03 * Math.sin(w + 1), 0, 0] },
    ArmL: { rot: [0.03 * Math.sin(w), 0, 0] },
  };
}

function villagerRun(t: number): Pose {
  const p = (TAU * t) / 0.45;
  return {
    Body: { rot: [0.2, 0, 0], pos: [0, REST.Body[1] + (0.035 * (1 - Math.cos(2 * p))) / 2, 0] },
    LegR: { rot: [0.8 * Math.sin(p), 0, 0] },
    LegL: { rot: [-0.8 * Math.sin(p), 0, 0] },
    ArmR: { rot: [-0.9 - 0.7 * Math.sin(p), 0, 0] },
    ArmL: { rot: [-0.9 + 0.7 * Math.sin(p), 0, 0] },
  };
}

/** 4 с: подъём топора двумя руками, сильный удар, отдача и возврат в покой. */
function lumberjackChop(t: number): Pose {
  let arm: number;
  if (t < 1.0) arm = lerp(-0.35, Math.PI, smooth(t));
  else if (t < 1.25) arm = Math.PI;
  else if (t < 1.5) arm = lerp(Math.PI, -0.95, easeIn((t - 1.25) / 0.25));
  else if (t < 1.9) arm = lerp(-0.95, -0.6, smooth((t - 1.5) / 0.4));
  else if (t < 3.0) arm = lerp(-0.6, -0.35, smooth((t - 1.9) / 1.1));
  else arm = -0.35;

  let lean: number;
  if (t < 1.0) lean = lerp(0, -0.12, smooth(t));
  else if (t < 1.25) lean = -0.12;
  else if (t < 1.5) lean = lerp(-0.12, 0.3, smooth((t - 1.25) / 0.25));
  else if (t < 1.9) lean = lerp(0.3, 0.05, smooth((t - 1.5) / 0.4));
  else if (t < 3.0) lean = lerp(0.05, 0, smooth((t - 1.9) / 1.1));
  else lean = 0;

  return {
    Body: { rot: [lean, 0, 0] },
    ArmR: { rot: [arm, 0, 0] },
    ArmL: { rot: [arm, 0, 0] },
  };
}

/** 5 с: круговое помешивание, пауза на пробу, вытирание лба и возврат к помешиванию. */
function cookStir(t: number): Pose {
  const w = TAU * 1.6;
  const amp = t < 2.5 ? 1 : t < 2.8 ? 1 - smooth((t - 2.5) / 0.3) : t < 4.6 ? 0 : smooth((t - 4.6) / 0.4);

  let base: number;
  if (t < 2.5) base = -1.15;
  else if (t < 3.4) base = lerp(-1.15, -1.9, smooth((t - 2.5) / 0.9));
  else if (t < 4.2) base = -1.9;
  else if (t < 4.6) base = lerp(-1.9, -1.15, smooth((t - 4.2) / 0.4));
  else base = -1.15;

  let leftArm: number;
  if (t < 3.2) leftArm = -0.9;
  else if (t < 3.8) leftArm = lerp(-0.9, -2.3, smooth((t - 3.2) / 0.6));
  else if (t < 4.2) leftArm = -2.3;
  else if (t < 4.8) leftArm = lerp(-2.3, -0.9, smooth((t - 4.2) / 0.6));
  else leftArm = -0.9;
  const wipe = (leftArm + 0.9) / -1.4;

  let headX: number;
  if (t < 2.5) headX = 0;
  else if (t < 2.9) headX = -0.22 * smooth((t - 2.5) / 0.4);
  else if (t < 4.2) headX = -0.22;
  else if (t < 4.6) headX = -0.22 * (1 - smooth((t - 4.2) / 0.4));
  else headX = 0;

  return {
    Body: { rot: [0.08, 0, 0] },
    ArmR: { rot: [base + amp * 0.22 * Math.cos(w * t), 0, amp * 0.22 * Math.sin(w * t)] },
    ArmL: { rot: [leftArm, 0, -0.15 + 0.6 * wipe] },
    Head: { rot: [headX, 0, 0.12 * wipe] },
  };
}

/** 8 с: сидит на пирсе, забрасывает, ждёт и три раза дёргает удочку (ripple-события в манифесте). */
function fishermanCast(t: number): Pose {
  const base = -1.2;

  let arm: number;
  if (t < 0.9) arm = lerp(base, 0.5, smooth(t / 0.9));
  else if (t < 1.3) arm = lerp(0.5, -1.4, easeIn((t - 0.9) / 0.4));
  else if (t < 2.0) arm = lerp(-1.4, base, smooth((t - 1.3) / 0.7));
  else if (t < 4.5) {
    const envelope = smooth((t - 2.0) / 0.4) * (1 - smooth((t - 3.9) / 0.6));
    arm = base + 0.03 * Math.sin((TAU * (t - 2.0)) / 2.5) * envelope;
  } else if (t < 6.75) arm = base + 0.14 * tug(t);
  else arm = base;

  return {
    Body: { rot: [0.08, 0, 0], pos: [0, 0.24 + 0.006 * Math.sin((TAU * t) / 4), 0] },
    LegR: { rot: [-1.45, 0, 0] },
    LegL: { rot: [-1.45, 0, 0] },
    ArmR: { rot: [arm, 0, 0] },
    ArmL: { rot: [-0.9 + 0.08 * tug(t), 0, 0] },
    Head: { rot: [0.12, 0, 0] },
  };
}

/** Три рывка на отрезке 4.5–6.75 с; пики приходятся на 4.875, 5.625 и 6.375 с. */
function tug(t: number): number {
  if (t < 4.5 || t > 6.75) return 0;
  return Math.pow(0.5 - 0.5 * Math.cos((TAU * (t - 4.5)) / 0.75), 3);
}

/** 8 с: король обводит взглядом деревню слева направо, поднимает руку и возвращается. */
function kingObserve(t: number): Pose {
  let yaw: number;
  if (t < 3.0) yaw = lerp(-0.55, 0.55, smooth(t / 3.0));
  else if (t < 6.8) yaw = 0.55;
  else yaw = lerp(0.55, -0.55, smooth((t - 6.8) / 1.2));

  let arm = 0;
  let armZ = 0;
  if (t >= 3.6 && t < 4.5) {
    const u = smooth((t - 3.6) / 0.9);
    arm = lerp(0, -2.7, u);
    armZ = lerp(0, -0.35, u);
  } else if (t >= 4.5 && t < 5.6) {
    arm = -2.7;
    armZ = -0.35;
  } else if (t >= 5.6 && t < 6.8) {
    const u = smooth((t - 5.6) / 1.2);
    arm = lerp(-2.7, 0, u);
    armZ = lerp(-0.35, 0, u);
  }

  return {
    Body: { rot: [0, yaw, 0], pos: [0, REST.Body[1] + 0.006 * Math.sin((TAU * t) / 4), 0] },
    ArmR: { rot: [arm, 0, armZ] },
  };
}

/** Патруль: ходьба с копьём и щитом. */
function guardWalk(t: number): Pose {
  const p = (TAU * t) / 0.9;
  return {
    Body: { pos: [0, REST.Body[1] + (0.015 * (1 - Math.cos(2 * p))) / 2, 0] },
    LegR: { rot: [0.5 * Math.sin(p), 0, 0] },
    LegL: { rot: [-0.5 * Math.sin(p), 0, 0] },
    ArmR: { rot: [-0.25 - 0.1 * Math.sin(p), 0, 0] },
    ArmL: { rot: [0.1 * Math.sin(p), 0, 0] },
  };
}

/** Остановка на два секунды: стражник осматривает территорию (поворот корпуса делает код). */
function guardInspect(t: number): Pose {
  return {
    Head: { rot: [0, 0.55 * Math.sin((TAU * t) / 2), 0] },
    ArmR: { rot: [-0.25, 0, 0] },
    ArmL: { rot: [0.05, 0, 0] },
  };
}

interface ClipDefinition {
  name: string;
  duration: number;
  pose: (t: number) => Pose;
}

/** Строит AnimationClip из поз. Последний кадр совпадает с первым, поэтому клип зацикливается. */
function buildClip(definition: ClipDefinition): THREE.AnimationClip {
  const { name, duration, pose } = definition;
  const count = Math.round(duration * FPS);
  const times: number[] = [];
  const frames: Pose[] = [];
  for (let i = 0; i <= count; i++) {
    const t = (i / count) * duration;
    times.push(t);
    frames.push(pose(t));
  }

  const rotated = new Set<string>();
  const moved = new Set<string>();
  for (const frame of frames) {
    for (const [node, value] of Object.entries(frame)) {
      if (value.rot) rotated.add(node);
      if (value.pos) moved.add(node);
    }
  }

  const tracks: THREE.KeyframeTrack[] = [];
  for (const node of rotated) {
    const values: number[] = [];
    for (const frame of frames) {
      const r = frame[node]?.rot ?? [0, 0, 0];
      const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(r[0], r[1], r[2]));
      values.push(q.x, q.y, q.z, q.w);
    }
    tracks.push(new THREE.QuaternionKeyframeTrack(`${node}.quaternion`, times, values));
  }
  for (const node of moved) {
    const values: number[] = [];
    for (const frame of frames) {
      const p = frame[node]?.pos ?? REST[node];
      values.push(p[0], p[1], p[2]);
    }
    tracks.push(new THREE.VectorKeyframeTrack(`${node}.position`, times, values));
  }

  return new THREE.AnimationClip(name, duration, tracks);
}

// Имена клипов используются в config/simulation-manifest.json.
const CLIP_SETS = {
  villager: [
    { name: 'villager_idle', duration: 3.0, pose: villagerIdle },
    { name: 'villager_walk', duration: 0.9, pose: (t: number) => gait(t, 0.9, 0.5, 0.4, 0.02) },
    { name: 'villager_run', duration: 0.45, pose: villagerRun },
    { name: 'lumberjack_chop', duration: 4.0, pose: lumberjackChop },
    { name: 'cook_stir', duration: 5.0, pose: cookStir },
    { name: 'fisherman_cast', duration: 8.0, pose: fishermanCast },
  ],
  guard: [
    { name: 'guard_walk', duration: 0.9, pose: guardWalk },
    { name: 'guard_inspect', duration: 2.0, pose: guardInspect },
  ],
  king: [{ name: 'king_observe', duration: 8.0, pose: kingObserve }],
} satisfies Record<string, ClipDefinition[]>;

// ---------- Экспорт ----------

async function exportCharacter(root: THREE.Object3D, clips: ClipDefinition[], fileName: string): Promise<void> {
  const exporter = new GLTFExporter();
  const animations = clips.map(buildClip);
  // trs: true обязателен, иначе узлы с анимацией экспортируются матрицами, а GLTF такого не допускает.
  const glb = (await exporter.parseAsync(root, {
    binary: true,
    animations,
    trs: true,
    onlyVisible: false,
  })) as ArrayBuffer;

  const target = path.join(OUTPUT_DIR, fileName);
  await writeFile(target, Buffer.from(glb));
  const names = animations.map((clip) => `${clip.name} (${clip.duration.toFixed(2)} s)`).join(', ');
  console.log(`✔ ${path.relative(process.cwd(), target)} — ${Buffer.byteLength(glb)} байт; клипы: ${names}`);
}

async function main(): Promise<void> {
  await mkdir(OUTPUT_DIR, { recursive: true });

  await exportCharacter(buildKing(new Materials(KING_COLORS)), CLIP_SETS.king, 'king.glb');
  await exportCharacter(buildGuard(new Materials(GUARD_COLORS)), CLIP_SETS.guard, 'guard.glb');
  await exportCharacter(buildVillager(new Materials(VILLAGER_COLORS)), CLIP_SETS.villager, 'villager.glb');
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
