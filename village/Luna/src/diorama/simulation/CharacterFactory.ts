import {
  BoxGeometry,
  ConeGeometry,
  CylinderGeometry,
  Group,
  Mesh,
  MeshStandardMaterial,
  SphereGeometry,
  type Scene,
} from "three";
import type { CharacterConfig, CharacterRig } from "../types";

export interface CharacterActor extends CharacterRig {
  config: CharacterConfig;
  kind: CharacterConfig["kind"];
  gait: number;
  homePosition: [number, number, number];
  accessory?: Group;
}

function material(color: string, roughness = 1, metalness = 0) {
  return new MeshStandardMaterial({ color, roughness, metalness, flatShading: true });
}

function addBox(parent: Group, mat: MeshStandardMaterial, size: [number, number, number], position: [number, number, number]) {
  const mesh = new Mesh(new BoxGeometry(...size), mat);
  mesh.position.set(...position);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

function addCylinder(parent: Group, mat: MeshStandardMaterial, top: number, bottom: number, height: number, sides: number, position: [number, number, number]) {
  const mesh = new Mesh(new CylinderGeometry(top, bottom, height, sides), mat);
  mesh.position.set(...position);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

function addSphere(parent: Group, mat: MeshStandardMaterial, radius: number, position: [number, number, number], widthSegments = 6, heightSegments = 5) {
  const mesh = new Mesh(new SphereGeometry(radius, widthSegments, heightSegments), mat);
  mesh.position.set(...position);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

function buildAxe(parent: Group) {
  const prop = new Group();
  const handle = material("#785239");
  const iron = material("#899396", 0.7, 0.15);
  addCylinder(prop, handle, 0.035, 0.04, 0.9, 5, [0, -0.21, 0]);
  addBox(prop, iron, [0.38, 0.23, 0.13], [0.15, 0.17, 0]);
  prop.position.set(0.02, -0.53, 0.07);
  parent.add(prop);
  return prop;
}

function buildLadle(parent: Group) {
  const prop = new Group();
  addCylinder(prop, material("#795840"), 0.025, 0.03, 0.55, 5, [0, -0.19, 0]);
  addSphere(prop, material("#9a7950"), 0.12, [0, 0.12, 0], 5, 4);
  prop.position.set(0.02, -0.53, 0.06);
  parent.add(prop);
  return prop;
}

function buildFishingRod(parent: Group) {
  const prop = new Group();
  const rod = addCylinder(prop, material("#785239"), 0.022, 0.035, 1.8, 5, [0, 0.37, 0]);
  rod.rotation.z = -0.18;
  const line = addCylinder(prop, material("#c9d6c2", 0.7), 0.008, 0.008, 0.74, 4, [-0.03, 0.96, 0.02]);
  line.rotation.z = 0.12;
  prop.position.set(0.01, -0.52, 0.04);
  parent.add(prop);
  return prop;
}

function buildSpear(parent: Group) {
  const prop = new Group();
  addCylinder(prop, material("#73563c"), 0.025, 0.035, 1.65, 5, [0, -0.04, 0]);
  const point = new Mesh(new CylinderGeometry(0, 0.1, 0.3, 5), material("#b8c3bf", 0.45, 0.25));
  point.position.set(0, 0.92, 0);
  point.castShadow = true;
  prop.add(point);
  prop.position.set(0.04, -0.3, 0.03);
  parent.add(prop);
  return prop;
}

function buildCrown(head: Group) {
  const gold = material("#e9bd49", 0.58, 0.14);
  addCylinder(head, gold, 0.25, 0.25, 0.12, 6, [0, 0.25, 0]);
  for (let i = 0; i < 5; i += 1) {
    const tooth = new Mesh(new ConeGeometry(0.055, 0.18, 4), gold);
    const angle = (i / 5) * Math.PI * 2;
    tooth.position.set(Math.cos(angle) * 0.19, 0.38, Math.sin(angle) * 0.19);
    tooth.castShadow = true;
    head.add(tooth);
  }
  addSphere(head, material("#c95954", 0.45), 0.06, [0, 0.26, 0.24], 5, 4);
}

export function createCharacter(scene: Scene, config: CharacterConfig): CharacterActor {
  const root = new Group();
  root.name = config.name;
  root.position.set(...config.position);
  root.rotation.y = config.facing ?? 0;
  root.scale.setScalar(config.kind === "child" ? 0.83 : config.kind === "guard" ? 1.04 : 1);

  const coatColor = config.color ?? "#82915f";
  const accentColor = config.accent ?? "#bc814c";
  const coat = material(coatColor);
  const accent = material(accentColor);
  const skin = material(config.kind === "guard" ? "#bd9473" : "#dbad83");
  const hair = material(config.kind === "king" ? "#70503c" : "#674733");
  const boot = material("#554135");
  const armor = material(config.accent ?? "#aab6b7", 0.62, 0.12);

  const torso = new Group();
  torso.position.y = 1.02;
  root.add(torso);
  const isGuard = config.kind === "guard";
  const isKing = config.kind === "king";
  const isChild = config.kind === "child";
  addBox(torso, isGuard ? armor : coat, [isGuard ? 0.55 : 0.48, 0.62, 0.34], [0, 0.02, 0]);
  addBox(torso, isGuard ? armor : accent, [isGuard ? 0.58 : 0.6, isKing ? 0.63 : 0.42, isGuard ? 0.4 : 0.39], [0, -0.39, 0]);
  if (isKing) {
    addBox(torso, material("#e0bc4c"), [0.14, 0.37, 0.06], [0, 0.17, 0.2]);
    addBox(torso, material("#e0bc4c"), [0.3, 0.09, 0.06], [0, -0.46, 0.21]);
  }
  if (isGuard) {
    addBox(torso, material("#7e8787", 0.55, 0.2), [0.27, 0.09, 0.06], [0, 0.07, 0.19]);
    addBox(torso, material("#c5c9c2", 0.55, 0.18), [0.07, 0.4, 0.05], [0, 0.02, 0.2]);
  }

  const head = new Group();
  head.position.set(0, 0.48, 0.02);
  torso.add(head);
  addBox(head, skin, [0.32, 0.34, 0.31], [0, 0, 0.015]);
  addBox(head, hair, [0.35, 0.12, 0.34], [0, 0.16, -0.005]);
  addBox(head, material("#f3eee0"), [0.045, 0.045, 0.035], [-0.075, 0.015, 0.18]);
  addBox(head, material("#f3eee0"), [0.045, 0.045, 0.035], [0.075, 0.015, 0.18]);
  addBox(head, material("#544138"), [0.022, 0.03, 0.02], [-0.075, 0.015, 0.2]);
  addBox(head, material("#544138"), [0.022, 0.03, 0.02], [0.075, 0.015, 0.2]);
  if (isKing) buildCrown(head);
  else if (isGuard) {
    const helm = addCylinder(head, armor, 0.22, 0.25, 0.28, 6, [0, 0.2, 0]);
    helm.position.y = 0.22;
    addBox(head, armor, [0.32, 0.06, 0.1], [0, 0.11, 0.16]);
  } else if (!isChild) {
    addBox(head, accent, [0.42, 0.08, 0.38], [0, 0.21, 0]);
    addBox(head, accent, [0.31, 0.13, 0.29], [0, 0.29, 0]);
  }

  const leftArm = new Group();
  leftArm.position.set(-0.31, 0.28, 0);
  torso.add(leftArm);
  const rightArm = new Group();
  rightArm.position.set(0.31, 0.28, 0);
  torso.add(rightArm);
  for (const [arm, side] of [[leftArm, -1], [rightArm, 1]] as const) {
    addCylinder(arm, isGuard ? armor : accent, 0.105, 0.09, 0.5, 5, [0, -0.22, 0]);
    addBox(arm, skin, [0.16, 0.14, 0.15], [0, -0.49, 0.025]);
    if (isGuard) {
      const shield = side < 0 ? new Group() : null;
      if (shield) {
        addBox(shield, material("#7c543c"), [0.34, 0.46, 0.12], [0, -0.49, 0.08]);
        addBox(shield, armor, [0.08, 0.34, 0.04], [0, -0.49, 0.15]);
        leftArm.add(shield);
      }
    }
  }

  const leftLeg = new Group();
  leftLeg.position.set(-0.16, 0.68, 0);
  root.add(leftLeg);
  const rightLeg = new Group();
  rightLeg.position.set(0.16, 0.68, 0);
  root.add(rightLeg);
  for (const leg of [leftLeg, rightLeg]) {
    addCylinder(leg, isGuard ? armor : coat, 0.105, 0.13, 0.52, 5, [0, -0.25, 0]);
    addBox(leg, boot, [0.18, 0.14, 0.27], [0, -0.52, 0.045]);
  }
  if (config.kind === "fisherman") {
    torso.position.y = 0.25;
    leftLeg.rotation.x = -1.32;
    rightLeg.rotation.x = -1.32;
    leftLeg.position.y = 0.2;
    rightLeg.position.y = 0.2;
  }

  let prop: Group | undefined;
  let secondProp: Group | undefined;
  if (config.kind === "lumberjack") prop = buildAxe(rightArm);
  if (config.kind === "cook") prop = buildLadle(rightArm);
  if (config.kind === "fisherman") prop = buildFishingRod(rightArm);
  if (config.kind === "guard") {
    prop = buildSpear(rightArm);
    secondProp = new Group();
    leftArm.add(secondProp);
  }

  if (config.kind === "fisherman") {
    const stool = new Group();
    const stoolMaterial = material("#80583d");
    addBox(stool, stoolMaterial, [0.62, 0.11, 0.55], [0, 0.41, 0]);
    for (const x of [-0.21, 0.21]) for (const z of [-0.18, 0.18]) addBox(stool, stoolMaterial, [0.08, 0.42, 0.08], [x, 0.2, z]);
    stool.position.set(0, -0.2, -0.05);
    root.add(stool);
  }

  const actor: CharacterActor = {
    config,
    kind: config.kind,
    root,
    torso,
    head,
    leftArm,
    rightArm,
    leftLeg,
    rightLeg,
    prop,
    secondProp,
    gait: 0,
    homePosition: [...config.position],
  };
  scene.add(root);
  return actor;
}
