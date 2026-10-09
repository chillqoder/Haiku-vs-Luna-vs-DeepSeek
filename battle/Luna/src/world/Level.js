import * as THREE from 'three';
import { makeBrickTexture } from '../assets/ProceduralTextures.js';

const LEVELS = [
  {
    name: 'THE RAINLINE', code: 'DISTRICT 01', sky: '#17243c', fog: '#1a2841', ground: '#263746', accent: '#5ce4dc', building: '#344963',
    length: 82, boss: 'MARA VEX',
    waves: [
      { x: 18, types: ['grunt', 'grunt', 'agile'] },
      { x: 39, types: ['brute', 'grunt', 'agile'] },
      { x: 62, types: ['boss'], boss: true },
    ],
    obstacles: [{ x: 29, type: 'crate' }, { x: 50, type: 'barrel' }],
  },
  {
    name: 'EMBER DOJO', code: 'DISTRICT 02', sky: '#402d37', fog: '#3b2934', ground: '#44363c', accent: '#ffba76', building: '#735048',
    length: 84, boss: 'MASTER KAI',
    waves: [
      { x: 17, types: ['agile', 'agile', 'grunt'] },
      { x: 39, types: ['brute', 'grunt', 'grunt'] },
      { x: 63, types: ['boss'], boss: true },
    ],
    obstacles: [{ x: 27, type: 'crate' }, { x: 47, type: 'barrel' }, { x: 55, type: 'crate' }],
  },
  {
    name: 'IRON HARBOR', code: 'DISTRICT 03', sky: '#152e40', fog: '#183646', ground: '#34424a', accent: '#8ed6ff', building: '#315767',
    length: 88, boss: 'THE WARDEN',
    waves: [
      { x: 18, types: ['grunt', 'brute', 'agile'] },
      { x: 41, types: ['brute', 'brute', 'agile'] },
      { x: 66, types: ['boss'], boss: true },
    ],
    obstacles: [{ x: 30, type: 'barrel' }, { x: 52, type: 'crate' }, { x: 59, type: 'barrel' }],
  },
];

export class Level {
  constructor(scene) {
    this.scene = scene;
    this.group = null;
    this.definition = null;
    this.obstacles = [];
    this.buildingTexture = null;
    this.backdropLayers = [];
  }

  get length() { return this.definition?.length ?? 0; }

  load(index) {
    this.clear();
    this.definition = LEVELS[index];
    this.group = new THREE.Group();
    this.scene.add(this.group);
    const config = this.definition;
    this.scene.background = new THREE.Color(config.sky);
    this.scene.fog = new THREE.Fog(config.fog, 32, 104);
    this.buildingTexture = makeBrickTexture(config.building, '#192533', index + 1);
    this.buildFloor(config);
    this.buildBackdrop(config);
    this.buildStreetProps(config);
    this.buildObstacles(config);
    return config;
  }

  buildFloor(config) {
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(config.length + 25, 12), new THREE.MeshStandardMaterial({ color: config.ground, roughness: 0.94 }));
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(config.length / 2, -0.17, 0);
    floor.receiveShadow = true;
    this.group.add(floor);
    const pavement = new THREE.Mesh(new THREE.BoxGeometry(config.length + 25, 0.23, 9), new THREE.MeshStandardMaterial({ color: '#454751', roughness: 0.88 }));
    pavement.position.set(config.length / 2, -0.18, 0);
    pavement.receiveShadow = true;
    this.group.add(pavement);
    const stripeMaterial = new THREE.MeshBasicMaterial({ color: config.accent, transparent: true, opacity: 0.24 });
    for (let x = -5; x < config.length + 20; x += 5) {
      const stripe = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.012, 0.06), stripeMaterial);
      stripe.position.set(x, -0.055, 2.9);
      this.group.add(stripe);
    }
  }

  buildBackdrop(config) {
    const far = new THREE.Group();
    const near = new THREE.Group();
    this.group.add(far, near);
    this.backdropLayers = [{ group: far, factor: 0.14 }, { group: near, factor: 0.34 }];
    const farMat = new THREE.MeshStandardMaterial({ color: '#17263a', roughness: 1, flatShading: true });
    const midMat = new THREE.MeshStandardMaterial({ color: config.building, roughness: 0.92, map: this.buildingTexture, flatShading: true });
    const windowMat = new THREE.MeshBasicMaterial({ color: config.accent, transparent: true, opacity: 0.24 });
    for (let x = -12; x < config.length + 28; x += 9 + Math.random() * 4) {
      const width = 6 + Math.random() * 3;
      const height = 6 + Math.random() * 8;
      const farBuilding = new THREE.Mesh(new THREE.BoxGeometry(width * 1.55, height * 1.3, 2.6), farMat);
      farBuilding.position.set(x, height * 0.58, -10.5);
      far.add(farBuilding);
      const nearBuilding = new THREE.Mesh(new THREE.BoxGeometry(width, height, 1.25), midMat);
      nearBuilding.position.set(x + 2.1, height / 2, -7.9);
      near.add(nearBuilding);
      const windows = new THREE.Group();
      near.add(windows);
      for (let wy = 1.1; wy < height - 0.8; wy += 1.42) {
        for (let wx = -width / 2 + 0.72; wx < width / 2 - 0.3; wx += 1.25) {
          if (Math.random() < 0.7) continue;
          const window = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.49), windowMat);
          window.position.set(x + 2.1 + wx, wy, -7.22);
          windows.add(window);
        }
      }
      if (Math.random() > 0.55) {
        const sign = new THREE.Mesh(new THREE.BoxGeometry(width * 0.58, 0.44, 0.16), new THREE.MeshStandardMaterial({ color: config.accent, emissive: config.accent, emissiveIntensity: 0.34, roughness: 0.4 }));
        sign.position.set(x + 2.1, Math.min(height - 1.15, 3.6), -7.03);
        near.add(sign);
      }
    }
    if (config.name === 'EMBER DOJO') this.buildLanterns(config, near);
    if (config.name === 'IRON HARBOR') this.buildCranes(config, far);
  }

  buildLanterns(config, parent) {
    const lampMat = new THREE.MeshBasicMaterial({ color: '#ff9d5a' });
    for (let x = 5; x < config.length; x += 12) {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.06, 4.3, 6), new THREE.MeshStandardMaterial({ color: '#3b2c2c' }));
      post.position.set(x, 2.15, -5.7); parent.add(post);
      const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.78, 0.6), lampMat);
      lamp.position.set(x, 4.17, -5.7); parent.add(lamp);
      const glow = new THREE.PointLight('#ff985b', 8, 8, 2);
      glow.position.set(x, 3.9, -4.9); parent.add(glow);
    }
  }

  buildCranes(config, parent) {
    const craneMat = new THREE.MeshStandardMaterial({ color: '#526876', metalness: 0.55, roughness: 0.58 });
    for (let x = 4; x < config.length; x += 24) {
      const tower = new THREE.Mesh(new THREE.BoxGeometry(0.48, 15, 0.45), craneMat);
      tower.position.set(x, 7.4, -13); parent.add(tower);
      const arm = new THREE.Mesh(new THREE.BoxGeometry(12, 0.4, 0.4), craneMat);
      arm.position.set(x + 5.4, 14.6, -13); parent.add(arm);
      const cable = new THREE.Mesh(new THREE.BoxGeometry(0.04, 3.2, 0.04), craneMat);
      cable.position.set(x + 8.5, 12.8, -13); parent.add(cable);
    }
  }

  buildStreetProps(config) {
    const lampMat = new THREE.MeshStandardMaterial({ color: '#253143', metalness: 0.55, roughness: 0.55 });
    const glowMat = new THREE.MeshBasicMaterial({ color: config.accent });
    for (let x = 8; x < config.length; x += 17) {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.1, 5.1, 7), lampMat);
      pole.position.set(x, 2.5, -3.95); this.group.add(pole);
      const arm = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.08, 0.12), lampMat);
      arm.position.set(x + 0.39, 4.95, -3.95); this.group.add(arm);
      const light = new THREE.Mesh(new THREE.BoxGeometry(0.43, 0.15, 0.2), glowMat);
      light.position.set(x + 0.72, 4.87, -3.9); this.group.add(light);
    }
    const curb = new THREE.Mesh(new THREE.BoxGeometry(config.length + 18, 0.24, 0.27), new THREE.MeshStandardMaterial({ color: '#a8a49a', roughness: 0.84 }));
    curb.position.set(config.length / 2, -0.01, 4.48);
    this.group.add(curb);
  }

  buildObstacles(config) {
    for (const [index, spec] of config.obstacles.entries()) {
      const isBarrel = spec.type === 'barrel';
      const material = new THREE.MeshStandardMaterial({ color: isBarrel ? (index % 2 ? '#b34e42' : '#397d85') : '#906744', roughness: 0.79, metalness: isBarrel ? 0.24 : 0.03 });
      const geometry = isBarrel ? new THREE.CylinderGeometry(0.43, 0.43, 0.85, 12) : new THREE.BoxGeometry(0.9, 0.86, 0.85);
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(spec.x, 0.43, index % 2 === 0 ? 1.8 : -1.9);
      mesh.castShadow = true; mesh.receiveShadow = true;
      this.group.add(mesh);
      const band = isBarrel ? new THREE.Mesh(new THREE.TorusGeometry(0.44, 0.045, 6, 12), new THREE.MeshStandardMaterial({ color: '#c6c1b1', metalness: 0.55, roughness: 0.5 })) : null;
      if (band) { band.rotation.x = Math.PI / 2; band.position.copy(mesh.position); band.position.y -= 0.17; this.group.add(band); }
      const stripe = !isBarrel ? new THREE.Mesh(new THREE.BoxGeometry(0.94, 0.12, 0.88), new THREE.MeshStandardMaterial({ color: '#c49a63' })) : null;
      if (stripe) { stripe.position.copy(mesh.position); stripe.position.y += 0.07; this.group.add(stripe); }
      this.obstacles.push({ mesh, type: spec.type, health: isBarrel ? 32 : 42, maxHealth: isBarrel ? 32 : 42, band, stripe, destroyed: false, x: spec.x, z: mesh.position.z });
    }
  }

  updateBackdrop(cameraX) {
    for (const layer of this.backdropLayers) layer.group.position.x = cameraX * layer.factor;
  }

  resolveHeroObstacles(hero, dt) {
    for (const obstacle of this.obstacles) {
      if (obstacle.destroyed) continue;
      const dx = hero.group.position.x - obstacle.x;
      const dz = hero.group.position.z - obstacle.z;
      if (Math.abs(dx) < 0.82 && Math.abs(dz) < 0.78 && hero.group.position.y < 0.8) {
        hero.group.position.x -= Math.sign(dx || hero.facing) * Math.min(Math.abs(dx) < 0.58 ? 0.9 : 0.5, Math.abs(hero.velocity.x * dt) + 0.025);
        hero.velocity.x *= 0.35;
      }
    }
  }

  hitObstacleInFront(hero, action) {
    for (const obstacle of this.obstacles) {
      if (obstacle.destroyed) continue;
      const dx = obstacle.x - hero.group.position.x;
      const dz = obstacle.z - hero.group.position.z;
      if (dx * hero.facing > -0.25 && dx * hero.facing < action.range + 0.5 && Math.abs(dz) < Math.max(1, action.depth)) {
        obstacle.health -= action.damage;
        if (obstacle.health <= 0) {
          obstacle.destroyed = true;
          this.group.remove(obstacle.mesh);
          if (obstacle.band) this.group.remove(obstacle.band);
          if (obstacle.stripe) this.group.remove(obstacle.stripe);
          obstacle.mesh.geometry.dispose(); obstacle.mesh.material.dispose();
          obstacle.band?.geometry.dispose(); obstacle.band?.material.dispose();
          obstacle.stripe?.geometry.dispose(); obstacle.stripe?.material.dispose();
        }
        return { mesh: obstacle.mesh, destroyed: obstacle.destroyed };
      }
    }
    return null;
  }

  clear() {
    if (this.group) {
      this.group.traverse((child) => {
        if (child.geometry) child.geometry.dispose();
        if (child.material) {
          const materials = Array.isArray(child.material) ? child.material : [child.material];
          for (const material of materials) material.dispose();
        }
      });
      this.scene.remove(this.group);
    }
    this.buildingTexture?.dispose();
    this.group = null;
    this.obstacles = [];
    this.backdropLayers = [];
  }
}

export { LEVELS };
