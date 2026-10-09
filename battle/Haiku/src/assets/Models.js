// Процедурные модели: гуманоид из примитивов с иерархией шарниров.
// Персонаж стоит в профиль: лицом к +X, сгибы — это вращение вокруг оси Z.
import * as THREE from 'three';
import { cached } from './Textures.js';

export const HIP_Y = 1.14; // высота таза над землёй
const THIGH = 0.5;
const SHIN = 0.5;
const FOOT = 0.14;
const TORSO_H = 0.74;
const UPPER = 0.42;
const FORE = 0.4;

const box = (w, h, d) => cached(`box:${w}:${h}:${d}`, () => new THREE.BoxGeometry(w, h, d));
const ball = (r) => cached(`ball:${r}`, () => new THREE.SphereGeometry(r, 14, 10));
const cone = (r, h) => cached(`cone:${r}:${h}`, () => new THREE.ConeGeometry(r, h, 8));

// Материал с множителем яркости: дальние конечности чуть темнее — даёт глубину
function material(color, shade = 1) {
  return new THREE.MeshLambertMaterial({ color: new THREE.Color(color).multiplyScalar(shade) });
}

function part(geometry, mat, x = 0, y = 0, z = 0) {
  const mesh = new THREE.Mesh(geometry, mat);
  mesh.position.set(x, y, z);
  return mesh;
}

// look: { jacket, pants, skin, hair, belt, shoes, gloves, scale, accent,
//         cap, mohawk, spiky, headband, pads, crown, hardhat, scarf, glowEyes }
export function buildHumanoid(look) {
  const root = new THREE.Group(); // точка опоры — на земле
  const body = new THREE.Group(); // масштаб и поворот при падении применяются сюда
  root.add(body);
  body.scale.setScalar(look.scale ?? 1);

  const flash = []; // материалы, которые подсвечиваются при ударе
  const mat = (color, shade = 1) => {
    const m = material(color, shade);
    flash.push(m);
    return m;
  };

  const hips = new THREE.Group();
  hips.position.y = HIP_Y;
  body.add(hips);

  hips.add(part(box(0.46, 0.22, 0.5), mat(look.pants)));

  const torso = new THREE.Group();
  hips.add(torso);
  torso.add(part(box(0.48, TORSO_H, 0.54), mat(look.jacket), 0, TORSO_H / 2 + 0.06, 0));
  torso.add(part(box(0.5, 0.09, 0.56), mat(look.belt ?? 0x333333), 0, 0.1, 0));
  if (look.pads) {
    torso.add(part(box(0.34, 0.14, 0.7), mat(look.pads), 0, TORSO_H - 0.02, 0));
  }
  if (look.scarf) {
    torso.add(part(box(0.2, 0.1, 0.6), mat(look.scarf), -0.16, TORSO_H + 0.04, 0));
  }

  // Голова и аксессуары
  const head = new THREE.Group();
  head.position.y = TORSO_H + 0.06;
  torso.add(head);
  head.add(part(ball(0.2), mat(look.skin), 0, 0.2, 0));
  head.add(part(ball(0.035), material(0x141414), 0.14, 0.24, 0.1));
  if (look.glowEyes) {
    const glow = new THREE.MeshBasicMaterial({ color: look.glowEyes });
    head.add(part(ball(0.045), glow, 0.15, 0.25, 0.09));
    head.add(part(ball(0.045), glow, 0.15, 0.25, -0.09));
  }
  if (look.hair) head.add(part(box(0.36, 0.1, 0.4), mat(look.hair), -0.04, 0.37, 0));
  if (look.headband) head.add(part(box(0.44, 0.07, 0.46), mat(look.headband), 0, 0.27, 0));
  if (look.cap) {
    head.add(part(box(0.44, 0.12, 0.46), mat(look.cap), 0, 0.34, 0));
    head.add(part(box(0.2, 0.04, 0.46), mat(look.cap), 0.22, 0.28, 0));
  }
  if (look.hardhat) {
    head.add(part(cone(0.26, 0.2), mat(look.hardhat), 0, 0.5, 0));
    head.add(part(box(0.5, 0.05, 0.5), mat(look.hardhat), 0, 0.38, 0));
  }
  if (look.mohawk) head.add(part(box(0.08, 0.2, 0.3), mat(look.mohawk), -0.02, 0.4, 0));
  if (look.spiky) {
    for (let i = 0; i < 3; i++) {
      const spike = part(box(0.06, 0.2, 0.08), mat(look.hair), -0.12 + i * 0.1, 0.44, 0);
      spike.rotation.z = -0.35 + i * 0.1;
      head.add(spike);
    }
  }
  if (look.crown) {
    for (let i = -1; i <= 1; i++) {
      head.add(part(cone(0.05, 0.2), mat(look.crown), i * 0.1, 0.45, 0));
    }
  }

  // Руки: плечевой шарнир и локтевой шарнир
  const makeArm = (z, shade) => {
    const shoulder = new THREE.Group();
    shoulder.position.set(0, TORSO_H - 0.04, z);
    torso.add(shoulder);
    shoulder.add(part(box(0.2, UPPER, 0.2), mat(look.jacket, shade), 0, -UPPER / 2, 0));
    const elbow = new THREE.Group();
    elbow.position.y = -UPPER;
    shoulder.add(elbow);
    elbow.add(part(box(0.18, FORE, 0.18), mat(look.skin, shade), 0, -FORE / 2, 0));
    elbow.add(part(ball(0.1), mat(look.gloves ?? look.skin, shade), 0, -FORE, 0));
    return { shoulder, elbow };
  };

  // Ноги: тазобедренный и коленный шарниры
  const makeLeg = (z, shade) => {
    const hip = new THREE.Group();
    hip.position.set(0, 0, z);
    hips.add(hip);
    hip.add(part(box(0.22, THIGH, 0.26), mat(look.pants, shade), 0, -THIGH / 2, 0));
    const knee = new THREE.Group();
    knee.position.y = -THIGH;
    hip.add(knee);
    knee.add(part(box(0.2, SHIN, 0.24), mat(look.pants, shade), 0, -SHIN / 2, 0));
    knee.add(part(box(0.42, FOOT, 0.28), mat(look.shoes ?? 0x1a1a1a, shade), 0.1, -SHIN - FOOT / 2, 0));
    return { hip, knee };
  };

  const farArm = makeArm(-0.3, 0.72);
  const nearArm = makeArm(0.3, 1);
  const farLeg = makeLeg(-0.14, 0.72);
  const nearLeg = makeLeg(0.14, 1);

  const rig = {
    hips,
    torso,
    head,
    armN: nearArm.shoulder,
    elbowN: nearArm.elbow,
    armF: farArm.shoulder,
    elbowF: farArm.elbow,
    legN: nearLeg.hip,
    kneeN: nearLeg.knee,
    legF: farLeg.hip,
    kneeF: farLeg.knee,
  };
  return { root, body, rig, flash };
}

// Применяет позу к шарнирам. Углы в радианах; положительный угол плеча/бедра — движение вперёд (+X).
// lean > 0 — наклон корпуса вперёд, поэтому поворот торса берём с минусом.
export function applyPose(rig, p) {
  rig.hips.position.y = HIP_Y + p.hipY;
  rig.torso.rotation.z = -p.lean;
  rig.head.rotation.z = -p.head;
  rig.armN.rotation.z = p.sN;
  rig.elbowN.rotation.z = p.eN;
  rig.armF.rotation.z = p.sF;
  rig.elbowF.rotation.z = p.eF;
  rig.legN.rotation.z = p.hN;
  rig.kneeN.rotation.z = p.kN;
  rig.legF.rotation.z = p.hF;
  rig.kneeF.rotation.z = p.kF;
}
