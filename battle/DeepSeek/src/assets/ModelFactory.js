// Procedural 3D models: humanoid characters and environment props.
// Everything is built from primitives - no external assets.

import * as THREE from 'three';
import { crateTexture, hazardTexture, neonSignTexture } from './Textures.js';

const matCache = new Map();

function mat(color, { rough = 0.82, metal = 0.05, emissive = null, emissiveIntensity = 1 } = {}) {
  const key = `${color}_${rough}_${metal}_${emissive}_${emissiveIntensity}`;
  if (matCache.has(key)) return matCache.get(key);
  const m = new THREE.MeshStandardMaterial({
    color,
    roughness: rough,
    metalness: metal,
    emissive: emissive === null ? 0x000000 : emissive,
    emissiveIntensity,
  });
  matCache.set(key, m);
  return m;
}

function box(parent, w, h, d, material, x = 0, y = 0, z = 0) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = false;
  parent.add(mesh);
  return mesh;
}

function sphere(parent, r, material, x = 0, y = 0, z = 0, seg = 10) {
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(r, seg, seg), material);
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  parent.add(mesh);
  return mesh;
}

function cylinder(parent, rt, rb, h, material, x = 0, y = 0, z = 0, seg = 10) {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), material);
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  parent.add(mesh);
  return mesh;
}

// ---------------------------------------------------------------------------
// Humanoid builder. The character faces +X, feet at y = 0, ~1.95 units tall
// before `scale` is applied on the root.
// ---------------------------------------------------------------------------

export function buildHumanoid({
  palette = {},
  scale = 1,
  bulk = 1,
  headgear = 'hair',
  shoulderPads = false,
  belt = false,
} = {}) {
  const P = {
    skin: 0xc98a5b,
    skinDark: 0xa86a3f,
    shirt: 0x4a5b8c,
    shirtDark: 0x36446b,
    pants: 0x2b2f3d,
    shoes: 0x1a1a22,
    hair: 0x2a1f1a,
    accent: 0xff5b4d,
    ...palette,
  };

  const mSkin = mat(P.skin);
  const mSkinDark = mat(P.skinDark);
  const mShirt = mat(P.shirt);
  const mShirtDark = mat(P.shirtDark);
  const mPants = mat(P.pants);
  const mShoes = mat(P.shoes);
  const mHair = mat(P.hair);
  const mAccent = mat(P.accent);
  const mDark = mat(0x121218);
  const materials = [mSkin, mSkinDark, mShirt, mShirtDark, mPants, mShoes, mHair, mAccent, mDark];

  const root = new THREE.Group();
  const body = new THREE.Group(); // used for knockdown / spin rotations
  root.add(body);

  const hipY = 0.92;
  const hips = new THREE.Group();
  hips.position.y = hipY;
  body.add(hips);

  // pelvis
  box(hips, 0.3 * bulk, 0.26, 0.4 * bulk, mPants, 0, -0.02, 0);

  // torso
  const torso = new THREE.Group();
  hips.add(torso);
  box(torso, 0.3 * bulk, 0.56, 0.44 * bulk, mShirt, 0.01, 0.3, 0);
  // chest accent plate (front is +X)
  box(torso, 0.08, 0.34, 0.24 * bulk, mShirtDark, 0.16, 0.32, 0);
  if (belt) {
    box(torso, 0.3 * bulk, 0.1, 0.44 * bulk, mAccent, 0, 0.0, 0);
    box(torso, 0.08, 0.1, 0.1, mat(0xffd23d, { metal: 0.6, rough: 0.3 }), 0.15, 0.0, 0);
  }

  // head
  const head = new THREE.Group();
  head.position.set(0, 0.62, 0);
  torso.add(head);
  box(head, 0.28, 0.3, 0.26, mSkin, 0.02, 0.14, 0);
  // eyes
  box(head, 0.02, 0.05, 0.05, mDark, 0.16, 0.16, 0.07);
  box(head, 0.02, 0.05, 0.05, mDark, 0.16, 0.16, -0.07);
  // brow
  box(head, 0.03, 0.03, 0.22, mHair, 0.15, 0.22, 0);

  if (headgear === 'hair') {
    box(head, 0.3, 0.1, 0.28, mHair, 0, 0.3, 0);
    box(head, 0.06, 0.16, 0.26, mHair, -0.11, 0.2, 0);
  } else if (headgear === 'headband') {
    box(head, 0.3, 0.06, 0.28, mAccent, 0, 0.24, 0);
    // ribbons
    const rib = box(head, 0.3, 0.04, 0.05, mAccent, -0.24, 0.22, 0.05);
    rib.rotation.z = 0.35;
    const rib2 = box(head, 0.3, 0.04, 0.05, mAccent, -0.22, 0.16, 0.06);
    rib2.rotation.z = -0.2;
    box(head, 0.28, 0.08, 0.26, mHair, -0.02, 0.3, 0);
  } else if (headgear === 'cap') {
    box(head, 0.3, 0.08, 0.28, mAccent, 0, 0.28, 0);
    box(head, 0.14, 0.03, 0.26, mAccent, 0.22, 0.27, 0);
  } else if (headgear === 'hood') {
    box(head, 0.32, 0.26, 0.3, mHair, -0.01, 0.22, 0);
    box(head, 0.24, 0.24, 0.18, mDark, 0.05, 0.12, 0);
    box(head, 0.04, 0.06, 0.06, mat(0x8dff57, { emissive: 0x33aa22, emissiveIntensity: 0.7 }), 0.15, 0.15, 0.07);
    box(head, 0.04, 0.06, 0.06, mat(0x8dff57, { emissive: 0x33aa22, emissiveIntensity: 0.7 }), 0.15, 0.15, -0.07);
  } else if (headgear === 'bald') {
    box(head, 0.29, 0.05, 0.27, mSkinDark, 0, 0.29, 0);
  }

  // arms: A = near side (+Z), B = far side (-Z)
  function makeArm(side, sign) {
    const shoulder = new THREE.Group();
    shoulder.position.set(0, 0.5, 0.3 * bulk * sign);
    torso.add(shoulder);
    if (shoulderPads) {
      box(shoulder, 0.24, 0.14, 0.2, mShirtDark, 0, 0.06, 0.04 * sign);
    }
    box(shoulder, 0.15, 0.34, 0.15, side === 'A' ? mShirt : mShirt, 0, -0.16, 0);
    const fore = new THREE.Group();
    fore.position.y = -0.34;
    shoulder.add(fore);
    box(fore, 0.13, 0.3, 0.13, mSkin, 0, -0.14, 0);
    const fist = sphere(fore, 0.1, mSkin, 0, -0.31, 0);
    return { shoulder, fore, fist };
  }
  const armA = makeArm('A', +1);
  const armB = makeArm('B', -1);

  // legs
  function makeLeg(sign) {
    const hip = new THREE.Group();
    hip.position.set(0, -0.12, 0.12 * (bulk > 1.2 ? bulk : 1) * sign);
    hips.add(hip);
    box(hip, 0.17, 0.42, 0.17, mPants, 0, -0.21, 0);
    const shin = new THREE.Group();
    shin.position.y = -0.42;
    hip.add(shin);
    box(shin, 0.15, 0.36, 0.15, mPants, 0, -0.18, 0);
    box(shin, 0.16, 0.12, 0.26, mShoes, 0.05, -0.4, 0);
    return { hip, shin };
  }
  const legA = makeLeg(+1);
  const legB = makeLeg(-1);

  root.scale.setScalar(scale);

  return {
    root,
    body,
    hipY,
    materials,
    joints: {
      hips,
      torso,
      head,
      armA: armA.shoulder,
      foreA: armA.fore,
      fistA: armA.fist,
      armB: armB.shoulder,
      foreB: armB.fore,
      fistB: armB.fist,
      legA: legA.hip,
      shinA: legA.shin,
      legB: legB.hip,
      shinB: legB.shin,
    },
  };
}

// ---------------------------------------------------------------------------
// Character presets
// ---------------------------------------------------------------------------

export const CHARACTER_PRESETS = {
  hero: {
    palette: {
      skin: 0xd99a66,
      shirt: 0x2fb8e8,
      shirtDark: 0x1a7ba8,
      pants: 0x24304a,
      shoes: 0xe8e4d8,
      hair: 0x30231a,
      accent: 0xff4d3d,
    },
    scale: 1.0,
    bulk: 1.0,
    headgear: 'headband',
  },
  grunt: {
    palette: {
      skin: 0xb87a4d,
      shirt: 0xd96f2b,
      shirtDark: 0x9a4c18,
      pants: 0x3a3630,
      shoes: 0x202020,
      hair: 0x1c1c1c,
      accent: 0xffd23d,
    },
    scale: 0.98,
    bulk: 1.05,
    headgear: 'cap',
  },
  agile: {
    palette: {
      skin: 0xc08a63,
      shirt: 0x2f4d2f,
      shirtDark: 0x1d3320,
      pants: 0x1d3320,
      shoes: 0x101510,
      hair: 0x183018,
      accent: 0x8dff57,
    },
    scale: 0.9,
    bulk: 0.86,
    headgear: 'hood',
  },
  brute: {
    palette: {
      skin: 0xc9895c,
      shirt: 0xa8304d,
      shirtDark: 0x6e1f33,
      pants: 0x2c2430,
      shoes: 0x1a1a1a,
      hair: 0x4a2a1a,
      accent: 0xffd23d,
    },
    scale: 1.16,
    bulk: 1.45,
    headgear: 'bald',
    shoulderPads: true,
    belt: true,
  },
  boss: {
    palette: {
      skin: 0xcf8f5a,
      shirt: 0x8c1f2f,
      shirtDark: 0x5c1220,
      pants: 0x241c28,
      shoes: 0x28200a,
      hair: 0x101010,
      accent: 0xffd23d,
    },
    scale: 1.34,
    bulk: 1.6,
    headgear: 'crown',
    shoulderPads: true,
    belt: true,
  },
};

export function buildCharacter(kind, overrides = {}) {
  const preset = CHARACTER_PRESETS[kind] || CHARACTER_PRESETS.grunt;
  const opts = {
    palette: { ...preset.palette, ...(overrides.palette || {}) },
    scale: overrides.scale ?? preset.scale,
    bulk: overrides.bulk ?? preset.bulk,
    headgear: overrides.headgear ?? preset.headgear,
    shoulderPads: overrides.shoulderPads ?? preset.shoulderPads,
    belt: overrides.belt ?? preset.belt,
  };
  const model = buildHumanoid(opts);

  // crown for the boss (headgear 'crown' is not handled above, add here)
  if (opts.headgear === 'crown') {
    const h = model.joints.head;
    const gold = mat(0xffd23d, { metal: 0.7, rough: 0.3 });
    model.materials.push(gold);
    box(h, 0.3, 0.08, 0.28, gold, 0, 0.3, 0);
    for (const dz of [-0.1, 0, 0.1]) {
      const spike = box(h, 0.06, 0.14, 0.06, gold, 0, 0.4, dz);
      spike.rotation.x = dz * 0.5;
    }
  }

  // Give every character its own material instances so hit flashes and fades
  // never leak across entities that share cached materials.
  const cloneMap = new Map();
  const cloned = [];
  model.root.traverse((obj) => {
    if (!obj.isMesh) return;
    let m = cloneMap.get(obj.material);
    if (!m) {
      m = obj.material.clone();
      cloneMap.set(obj.material, m);
      cloned.push(m);
    }
    obj.material = m;
  });
  model.materials = cloned;

  return model;
}

// ---------------------------------------------------------------------------
// Environment props
// ---------------------------------------------------------------------------

const propMaterials = {
  wood: new THREE.MeshStandardMaterial({ map: crateTexture(), roughness: 0.9 }),
  metal: mat(0x555f6e, { metal: 0.6, rough: 0.4 }),
  darkMetal: mat(0x333a44, { metal: 0.5, rough: 0.5 }),
  hazard: new THREE.MeshStandardMaterial({ map: hazardTexture(), roughness: 0.8 }),
  rust: mat(0x8a4a2a, { rough: 0.9 }),
  red: mat(0xb03030, { rough: 0.7 }),
  concrete: mat(0x6a6f78, { rough: 0.95 }),
};

export function buildCrate() {
  const g = new THREE.Group();
  box(g, 1.2, 1.2, 1.2, propMaterials.wood, 0, 0.6, 0);
  return g;
}

export function buildBarrel(color = 0x2f6e3a) {
  const g = new THREE.Group();
  const m = mat(color, { metal: 0.4, rough: 0.6 });
  cylinder(g, 0.42, 0.42, 1.05, m, 0, 0.53, 0);
  cylinder(g, 0.45, 0.45, 0.08, propMaterials.darkMetal, 0, 0.3, 0);
  cylinder(g, 0.45, 0.45, 0.08, propMaterials.darkMetal, 0, 0.78, 0);
  return g;
}

export function buildCone() {
  const g = new THREE.Group();
  box(g, 0.5, 0.06, 0.5, propMaterials.red, 0, 0.03, 0);
  const cone = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.6, 12), propMaterials.red);
  cone.position.y = 0.33;
  cone.castShadow = true;
  g.add(cone);
  box(g, 0.26, 0.06, 0.26, mat(0xf0f0f0), 0, 0.3, 0);
  return g;
}

export function buildDumpster() {
  const g = new THREE.Group();
  box(g, 1.9, 1.1, 1.1, mat(0x3a6e52, { metal: 0.5, rough: 0.5 }), 0, 0.65, 0);
  const lid = box(g, 1.9, 0.1, 1.1, mat(0x2d5843, { metal: 0.5, rough: 0.5 }), 0, 1.24, 0);
  lid.rotation.x = -0.12;
  box(g, 0.1, 0.3, 1.0, propMaterials.darkMetal, 0.95, 0.5, 0);
  box(g, 0.1, 0.3, 1.0, propMaterials.darkMetal, -0.95, 0.5, 0);
  return g;
}

export function buildLampPost(color = 0x2a2f3a) {
  const g = new THREE.Group();
  cylinder(g, 0.07, 0.1, 4.4, mat(color, { metal: 0.6, rough: 0.4 }), 0, 2.2, 0);
  const arm = cylinder(g, 0.05, 0.05, 1.0, mat(color, { metal: 0.6, rough: 0.4 }), 0.45, 4.35, 0);
  arm.rotation.z = Math.PI / 2;
  const headMesh = box(g, 0.5, 0.18, 0.3, mat(0xfff2c0, { emissive: 0xffd98a, emissiveIntensity: 0.9 }), 1.0, 4.28, 0);
  // glow sphere
  sphere(g, 0.16, mat(0xfff8d0, { emissive: 0xffe9a0, emissiveIntensity: 1.4 }), 1.0, 4.14, 0, 8);
  return g;
}

export function buildNeonSign(colorA = '#ff2d8a', colorB = '#33e6ff', side = 1) {
  const g = new THREE.Group();
  const tex = neonSignTexture(colorA, colorB);
  const signMat = new THREE.MeshBasicMaterial({ map: tex });
  // Panel is wide along X and thin along Z so it faces the camera (+Z).
  const panel = new THREE.Mesh(new THREE.BoxGeometry(1.2, 2.3, 0.16), propMaterials.darkMetal);
  panel.position.y = 4.6;
  panel.castShadow = true;
  g.add(panel);
  const face = new THREE.Mesh(new THREE.PlaneGeometry(1.14, 2.24), signMat);
  face.position.set(0, 4.6, 0.09);
  g.add(face);
  // support bracket
  cylinder(g, 0.05, 0.05, 1.2, propMaterials.darkMetal, 0, 6.2, 0);
  return g;
}

export function buildDojoDummy() {
  const g = new THREE.Group();
  cylinder(g, 0.35, 0.42, 0.25, propMaterials.wood, 0, 0.12, 0);
  cylinder(g, 0.3, 0.3, 1.1, mat(0x6e4a26, { rough: 0.9 }), 0, 0.75, 0);
  const cross = cylinder(g, 0.09, 0.09, 1.5, mat(0x6e4a26, { rough: 0.9 }), 0, 1.15, 0);
  cross.rotation.z = Math.PI / 2;
  sphere(g, 0.24, mat(0x5a3a1a, { rough: 0.95 }), 0, 1.55, 0, 8);
  box(g, 0.5, 0.08, 0.3, propMaterials.red, 0, 1.0, 0.31);
  return g;
}

export function buildDojoPost() {
  const g = new THREE.Group();
  cylinder(g, 0.24, 0.28, 3.6, propMaterials.wood, 0, 1.8, 0);
  cylinder(g, 0.34, 0.34, 0.2, mat(0x4a2c14), 0, 3.55, 0);
  cylinder(g, 0.34, 0.34, 0.2, mat(0x4a2c14), 0, 0.12, 0);
  return g;
}

export function buildLantern() {
  const g = new THREE.Group();
  const body = sphere(g, 0.3, mat(0xff6a4d, { emissive: 0xff3d20, emissiveIntensity: 0.75 }), 0, 0, 0, 8);
  body.scale.y = 1.25;
  cylinder(g, 0.1, 0.1, 0.08, propMaterials.darkMetal, 0, 0.38, 0);
  cylinder(g, 0.1, 0.1, 0.08, propMaterials.darkMetal, 0, -0.38, 0);
  return g;
}

export function buildPipe(height = 3.2) {
  const g = new THREE.Group();
  cylinder(g, 0.22, 0.22, height, mat(0x6a6f5a, { metal: 0.55, rough: 0.5 }), 0, height / 2, 0);
  cylinder(g, 0.28, 0.28, 0.24, mat(0x4a4f3d, { metal: 0.55, rough: 0.5 }), 0, height * 0.3, 0);
  cylinder(g, 0.28, 0.28, 0.24, mat(0x4a4f3d, { metal: 0.55, rough: 0.5 }), 0, height * 0.7, 0);
  return g;
}

export function buildMachine() {
  const g = new THREE.Group();
  box(g, 2.6, 2.0, 1.6, mat(0x4a5058, { metal: 0.5, rough: 0.55 }), 0, 1.0, 0);
  box(g, 2.2, 0.5, 1.2, propMaterials.darkMetal, 0, 2.2, 0);
  box(g, 0.5, 0.7, 0.3, mat(0x20e8a0, { emissive: 0x0faa70, emissiveIntensity: 0.7 }), 0.7, 1.4, 0.82);
  box(g, 0.5, 0.3, 0.3, mat(0xff4d3d, { emissive: 0xaa2010, emissiveIntensity: 0.6 }), -0.4, 1.7, 0.82);
  cylinder(g, 0.3, 0.3, 1.1, propMaterials.darkMetal, -1.0, 2.6, 0, 10);
  cylinder(g, 0.22, 0.22, 0.9, mat(0x6a6f5a, { metal: 0.55, rough: 0.5 }), 0.9, 2.7, 0, 10);
  return g;
}

export function buildWallPanels(count, spacing, height, z, depth, material) {
  const g = new THREE.Group();
  for (let i = 0; i < count; i++) {
    const panel = new THREE.Mesh(new THREE.BoxGeometry(spacing * 0.98, height, depth), material);
    panel.position.set(i * spacing, height / 2, z);
    panel.receiveShadow = true;
    g.add(panel);
  }
  return g;
}
