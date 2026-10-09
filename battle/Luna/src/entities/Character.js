import * as THREE from 'three';

const box = (w, h, d, material, x, y, z) => {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
};
const sphere = (r, material, x, y, z, scale = [1, 1, 1]) => {
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(r, 14, 10), material);
  mesh.position.set(x, y, z);
  mesh.scale.set(...scale);
  mesh.castShadow = true;
  return mesh;
};
const capsuleLimb = (length, radius, material) => {
  const group = new THREE.Group();
  const limb = new THREE.Mesh(new THREE.CylinderGeometry(radius * 0.86, radius, length, 9), material);
  limb.position.y = -length / 2;
  limb.castShadow = true;
  group.add(limb);
  group.add(sphere(radius, material, 0, -length, 0));
  return group;
};

export class Character {
  constructor(scene, options = {}) {
    this.scene = scene;
    this.group = new THREE.Group();
    this.group.position.set(options.x ?? 0, 0, options.z ?? 0);
    this.scene.add(this.group);
    this.kind = options.kind ?? 'hero';
    this.bodyColor = options.bodyColor ?? '#1d3b58';
    this.trimColor = options.trimColor ?? '#5de6d3';
    this.skinColor = options.skinColor ?? '#e2a17c';
    this.scale = options.scale ?? 1;
    this.facing = options.facing ?? 1;
    this.walkPhase = Math.random() * Math.PI * 2;
    this.motion = 'idle';
    this.actionTimer = 0;
    this.flashTimer = 0;
    this.parts = {};
    this.materials = [];
    this.buildModel();
    this.group.scale.set(this.scale * this.facing, this.scale, this.scale);
  }

  material(color, roughness = 0.73, metalness = 0.04) {
    const mat = new THREE.MeshStandardMaterial({ color, roughness, metalness });
    this.materials.push({ material: mat, color: new THREE.Color(color) });
    return mat;
  }

  buildModel() {
    const shirt = this.material(this.bodyColor);
    const trim = this.material(this.trimColor, 0.47, 0.12);
    const skin = this.material(this.skinColor);
    const dark = this.material('#19202c');
    const hair = this.material(this.kind === 'hero' ? '#101a2d' : '#241e28');
    const metal = this.material(this.kind === 'brute' || this.kind === 'boss' ? '#b47a44' : '#8996a8', 0.35, 0.5);
    const eye = this.material('#f8f0d9', 0.3);
    const faceDetail = this.material('#333142');
    const model = new THREE.Group();
    this.group.add(model);
    this.model = model;

    model.add(box(0.58, 0.34, 0.37, dark, 0, 0.88, 0));
    const torso = new THREE.Group();
    torso.position.set(0, 1.48, 0);
    model.add(torso);
    torso.add(box(0.72, 0.83, 0.43, shirt, 0, 0, 0));
    torso.add(box(0.74, 0.12, 0.45, trim, 0, -0.3, 0.015));
    torso.add(box(0.19, 0.82, 0.035, trim, -0.25, 0.02, 0.23));
    torso.add(box(0.19, 0.82, 0.035, trim, 0.25, 0.02, 0.23));
    if (this.kind === 'hero') {
      torso.add(box(0.66, 0.13, 0.48, dark, 0, 0.36, 0));
      torso.add(sphere(0.18, trim, -0.19, 0.02, 0.25, [1, 0.72, 0.5]));
      torso.add(sphere(0.12, trim, 0.19, -0.06, 0.26, [1, 0.72, 0.5]));
    }
    this.parts.torso = torso;

    const head = new THREE.Group();
    head.position.set(0, 2.14, 0);
    model.add(head);
    head.add(sphere(0.37, skin, 0, 0.05, 0, [0.87, 1.02, 0.84]));
    head.add(sphere(0.38, hair, 0, 0.24, -0.04, [0.94, 0.66, 0.88]));
    head.add(box(0.47, 0.13, 0.5, hair, 0, 0.13, 0.12));
    head.add(box(0.15, 0.11, 0.15, skin, 0.31, -0.01, 0.03));
    head.add(sphere(0.045, eye, 0.13, 0.12, 0.292, [1.1, 0.7, 0.5]));
    head.add(sphere(0.045, eye, -0.13, 0.12, 0.292, [1.1, 0.7, 0.5]));
    head.add(box(0.28, 0.045, 0.045, faceDetail, 0, -0.13, 0.29));
    if (this.kind === 'agile') head.add(box(0.68, 0.12, 0.5, trim, 0, 0.18, 0.06));
    if (this.kind === 'brute' || this.kind === 'boss') {
      head.add(box(0.22, 0.12, 0.18, metal, -0.41, 0.14, 0));
      head.add(box(0.22, 0.12, 0.18, metal, 0.41, 0.14, 0));
      if (this.kind === 'boss') head.add(box(0.82, 0.15, 0.42, trim, 0, 0.46, 0.01));
    }
    this.parts.head = head;

    const leftArm = new THREE.Group();
    leftArm.position.set(-0.39, 1.75, 0);
    const rightArm = new THREE.Group();
    rightArm.position.set(0.39, 1.75, 0);
    model.add(leftArm, rightArm);
    for (const arm of [leftArm, rightArm]) {
      arm.add(capsuleLimb(0.43, 0.15, shirt));
      const elbow = new THREE.Group();
      elbow.position.y = -0.42;
      arm.add(elbow);
      elbow.add(capsuleLimb(0.38, 0.115, skin));
      elbow.add(sphere(0.17, trim, 0, -0.4, 0.06, [1, 0.84, 1]));
      arm.userData.elbow = elbow;
    }
    this.parts.leftArm = leftArm;
    this.parts.rightArm = rightArm;

    const leftLeg = new THREE.Group();
    leftLeg.position.set(-0.2, 0.88, 0);
    const rightLeg = new THREE.Group();
    rightLeg.position.set(0.2, 0.88, 0);
    model.add(leftLeg, rightLeg);
    for (const leg of [leftLeg, rightLeg]) {
      leg.add(capsuleLimb(0.42, 0.16, dark));
      const knee = new THREE.Group();
      knee.position.y = -0.42;
      leg.add(knee);
      knee.add(capsuleLimb(0.38, 0.13, shirt));
      knee.add(box(0.29, 0.14, 0.43, trim, 0.04, -0.36, 0.08));
      leg.userData.knee = knee;
    }
    this.parts.leftLeg = leftLeg;
    this.parts.rightLeg = rightLeg;
    if (this.kind === 'hero') {
      const scarf = new THREE.Mesh(new THREE.ConeGeometry(0.22, 1.18, 5), trim);
      scarf.position.set(-0.57, 1.82, -0.16);
      scarf.rotation.z = Math.PI / 2.15;
      scarf.rotation.x = -0.35;
      model.add(scarf);
      this.parts.scarf = scarf;
    }
  }

  setFacing(direction) {
    if (!direction) return;
    this.facing = direction < 0 ? -1 : 1;
    this.group.scale.x = this.scale * this.facing;
    this.group.scale.y = this.scale;
    this.group.scale.z = this.scale;
  }

  setMotion(motion, actionTimer = 0) {
    this.motion = motion;
    this.actionTimer = Math.max(this.actionTimer, actionTimer);
  }

  updateAnimation(dt, speed = 0) {
    this.walkPhase += dt * (4.5 + speed * 1.2);
    this.actionTimer = Math.max(0, this.actionTimer - dt);
    this.flashTimer = Math.max(0, this.flashTimer - dt);
    const t = this.walkPhase;
    const wave = Math.sin(t);
    const moving = Math.min(1, speed / 4.5);
    const { leftArm, rightArm, leftLeg, rightLeg, torso, head, scarf } = this.parts;
    leftLeg.rotation.z = wave * 0.48 * moving;
    rightLeg.rotation.z = -wave * 0.48 * moving;
    leftLeg.userData.knee.rotation.z = Math.max(0, -wave) * 0.52 * moving;
    rightLeg.userData.knee.rotation.z = Math.max(0, wave) * 0.52 * moving;
    leftArm.rotation.z = -wave * 0.3 * moving - 0.08;
    rightArm.rotation.z = wave * 0.3 * moving - 0.08;
    leftArm.userData.elbow.rotation.z = 0;
    rightArm.userData.elbow.rotation.z = 0;
    torso.rotation.z = -wave * 0.035 * moving;
    torso.rotation.y = 0;
    head.rotation.z = Math.sin(t * 0.5) * 0.025;
    if (scarf) { scarf.rotation.z = Math.PI / 2.15 + Math.sin(t * 1.7) * 0.08; scarf.rotation.x = -0.35 + Math.sin(t * 1.5) * 0.12; }
    if (this.actionTimer > 0) {
      if (this.motion === 'punch') {
        rightArm.rotation.z = -1.65;
        rightArm.userData.elbow.rotation.z = -0.08;
        leftArm.rotation.z = 0.58;
      } else if (this.motion === 'kick') {
        rightLeg.rotation.z = -1.15;
        leftArm.rotation.z = 0.72;
        rightArm.rotation.z = -1;
      } else if (this.motion === 'special') {
        leftArm.rotation.z = Math.sin(t * 17) * 1.7;
        rightArm.rotation.z = -Math.sin(t * 17) * 1.7;
        leftLeg.rotation.z = Math.cos(t * 17) * 0.7;
        rightLeg.rotation.z = -Math.cos(t * 17) * 0.7;
        torso.rotation.y = Math.sin(t * 17) * 0.35;
      } else if (this.motion === 'hit') {
        torso.rotation.z = -0.32;
        head.rotation.z = -0.15;
      } else if (this.motion === 'block') {
        leftArm.rotation.z = 1.6;
        rightArm.rotation.z = -1.6;
      } else if (this.motion === 'down') {
        torso.rotation.z = -1.2;
      }
    }
    if (this.motion === 'jump' && this.actionTimer <= 0) {
      leftArm.rotation.z = 1.05;
      rightArm.rotation.z = -1.05;
      leftLeg.rotation.z = 0.42;
      rightLeg.rotation.z = -0.42;
    }
    const flash = this.flashTimer > 0;
    for (const entry of this.materials) {
      if (flash) entry.material.emissive.set('#ffc56e');
      else entry.material.emissive.set('#000000');
    }
  }

  dispose() {
    this.scene.remove(this.group);
    this.group.traverse((child) => {
      if (child.geometry) child.geometry.dispose();
    });
    for (const entry of this.materials) entry.material.dispose();
  }
}
