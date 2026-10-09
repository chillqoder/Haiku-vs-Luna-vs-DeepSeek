// Level runtime: builds the environment, parallax layers, props, manages
// wave spawning, the camera-lock battle zones and level completion.

import * as THREE from 'three';
import {
  asphaltTexture, woodTexture, metalTexture, skyTexture,
  buildingTexture, brickTexture, dojoWallTexture, factoryWallTexture,
} from '../assets/Textures.js';
import {
  buildLampPost, buildNeonSign, buildDumpster, buildCone, buildDojoPost,
  buildLantern, buildPipe, buildMachine,
} from '../assets/ModelFactory.js';
import { Obstacle, Pickup } from './Obstacle.js';
import { VIEW_HALF_X } from '../core/Constants.js';

export class Level {
  constructor(def, game) {
    this.def = def;
    this.game = game;
    this.length = def.length;
    this.group = new THREE.Group();
    this.obstacles = [];
    this.pickups = [];
    this.waveIndex = 0;       // next wave to trigger
    this.activeWave = null;   // current wave state
    this.lockX = null;        // camera lock position while wave is active
    this.boss = null;
    this.bossDefeated = false;
    this.cleared = false;
    this.checkpointX = 2;
    this.parallax = [];
    this._waveTimer = 0;
    this._pendingSpawns = [];
    this.time = 0;

    this.build();
  }

  // -----------------------------------------------------------------------

  build() {
    const def = this.def;
    const g = this.group;
    const theme = def.theme;

    // ---- Sky (static, far behind) ----
    const skyTex = theme === 'street'
      ? skyTexture('#05070f', '#141b33', '#2a3157')
      : theme === 'dojo'
        ? skyTexture('#1c1024', '#4a2438', '#8a4a3a')
        : skyTexture('#0c0d10', '#2a1e16', '#4a2e1a');
    const sky = new THREE.Mesh(
      new THREE.PlaneGeometry(this.length + 160, 60),
      new THREE.MeshBasicMaterial({ map: skyTex, fog: false, depthWrite: false })
    );
    sky.position.set(this.length / 2, 18, -58);
    g.add(sky);

    // ---- Ground ----
    const groundTex = theme === 'street'
      ? asphaltTexture(this.length / 6, 3)
      : theme === 'dojo'
        ? woodTexture(this.length / 6, 3)
        : metalTexture(this.length / 6, 3);
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(this.length + 120, 40),
      new THREE.MeshStandardMaterial({ map: groundTex, roughness: 0.92 })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.set(this.length / 2 - 10, 0, -3);
    ground.receiveShadow = true;
    g.add(ground);

    // ---- Back wall ----
    const isStreet = theme === 'street';
    const isDojo = theme === 'dojo';
    const wallTex = isStreet
      ? brickTexture(this.length / 4, 2, '#4a2c38')
      : isDojo
        ? dojoWallTexture(this.length / 8, 1)
        : factoryWallTexture(this.length / 8, 1);
    const wall = new THREE.Mesh(
      new THREE.PlaneGeometry(this.length + 120, 9),
      new THREE.MeshStandardMaterial({ map: wallTex, roughness: 0.95 })
    );
    wall.position.set(this.length / 2 - 10, 4.5, -6.5);
    g.add(wall);

    // ---- Parallax layers ----
    if (isStreet) this.buildStreetParallax();
    else if (isDojo) this.buildDojoParallax();
    else this.buildFoundryParallax();

    // ---- Decorations ----
    this.buildDecorations();

    // ---- Obstacles ----
    for (const o of def.obstacles) {
      const obstacle = new Obstacle(o.type, o.x, o.z, this.game);
      obstacle.mesh.traverse((obj) => {
        if (obj.isMesh) obj.castShadow = true;
      });
      g.add(obstacle.mesh);
      this.obstacles.push(obstacle);
    }
  }

  buildStreetParallax() {
    const def = this.def;
    // Far skyline: simple dark slabs
    const farMat = new THREE.MeshLambertMaterial({ color: 0x131a2e });
    for (let x = -30; x < this.length + 60; x += 14) {
      const h = 12 + Math.random() * 16;
      const w = 8 + Math.random() * 8;
      const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, 6), farMat);
      b.position.set(x, h / 2, -34);
      this.group.add(b);
    }
    // Mid buildings with lit windows
    for (let x = -20; x < this.length + 40; x += 11) {
      const h = 7 + Math.random() * 9;
      const w = 6 + Math.random() * 5;
      const tex = buildingTexture(1, 1, Math.random() < 0.7 ? '#ffcf6e' : '#7fd8ff');
      const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, 5), [
        new THREE.MeshLambertMaterial({ color: 0x1a2138 }),
        new THREE.MeshLambertMaterial({ color: 0x1a2138 }),
        new THREE.MeshLambertMaterial({ color: 0x1a2138 }),
        new THREE.MeshLambertMaterial({ color: 0x1a2138 }),
        new THREE.MeshLambertMaterial({ map: tex }),
        new THREE.MeshLambertMaterial({ map: tex }),
      ]);
      b.position.set(x, h / 2, -20 - Math.random() * 4);
      this.group.add(b);
    }
  }

  buildDojoParallax() {
    const def = this.def;
    // Distant temple silhouettes
    const farMat = new THREE.MeshLambertMaterial({ color: 0x1a0f16 });
    for (let x = -30; x < this.length + 60; x += 20) {
      const h = 10 + Math.random() * 8;
      const b = new THREE.Mesh(new THREE.BoxGeometry(12, h, 6), farMat);
      b.position.set(x, h / 2, -32);
      this.group.add(b);
      const roof = new THREE.Mesh(new THREE.ConeGeometry(9, 4, 4), new THREE.MeshLambertMaterial({ color: 0x2a1418 }));
      roof.position.set(x, h + 2, -32);
      roof.rotation.y = Math.PI / 4;
      this.group.add(roof);
    }
    // Mid: paper screens / garden wall
    const midMat = new THREE.MeshLambertMaterial({ color: 0x3a2a34 });
    for (let x = -20; x < this.length + 40; x += 12) {
      const wall = new THREE.Mesh(new THREE.BoxGeometry(10, 6, 4), midMat);
      wall.position.set(x, 3, -18);
      this.group.add(wall);
      const trim = new THREE.Mesh(new THREE.BoxGeometry(10.5, 0.5, 4.5), new THREE.MeshLambertMaterial({ color: 0x5a3a2a }));
      trim.position.set(x, 6, -18);
      this.group.add(trim);
    }
  }

  buildFoundryParallax() {
    const def = this.def;
    const farMat = new THREE.MeshLambertMaterial({ color: 0x14161c });
    for (let x = -30; x < this.length + 60; x += 16) {
      const h = 10 + Math.random() * 12;
      const b = new THREE.Mesh(new THREE.BoxGeometry(10, h, 6), farMat);
      b.position.set(x, h / 2, -34);
      this.group.add(b);
    }
    // Mid: storage tanks
    for (let x = -10; x < this.length + 40; x += 18) {
      const tank = new THREE.Mesh(
        new THREE.CylinderGeometry(4, 4, 10, 12),
        new THREE.MeshLambertMaterial({ color: 0x2a2e36 })
      );
      tank.position.set(x, 5, -20);
      this.group.add(tank);
      const top = new THREE.Mesh(new THREE.SphereGeometry(4, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshLambertMaterial({ color: 0x32363e }));
      top.position.set(x, 10, -20);
      this.group.add(top);
    }
  }

  buildDecorations() {
    const d = this.def.decorations || {};
    const theme = this.def.theme;
    const add = (mesh, x, z = -5.4) => {
      mesh.position.x += x;
      mesh.position.z = z;
      this.group.add(mesh);
    };
    if (theme === 'street') {
      for (const x of d.lamps || []) add(buildLampPost(), x, -5.2);
      for (const x of d.signs || []) add(buildNeonSign(x % 2 ? '#ff2d8a' : '#33e6ff', '#ffd23d', 1), x, -6.0);
      for (const x of d.dumpsters || []) add(buildDumpster(), x, 3.6);
      for (const x of [26, 52, 88, 118]) add(buildCone(), x - 2, 2.6);
    } else if (theme === 'dojo') {
      for (const x of d.posts || []) add(buildDojoPost(), x, -5.6);
      for (const x of d.lanterns || []) {
        const l = buildLantern();
        l.position.y = 3.2;
        add(l, x, -5.8);
      }
    } else {
      for (const x of d.pipes || []) add(buildPipe(3.4), x, -5.6);
      for (const x of d.machines || []) add(buildMachine(), x, 3.8);
    }
  }

  // -----------------------------------------------------------------------
  // waves
  // -----------------------------------------------------------------------

  _viewHalf(worldOrGame) {
    return worldOrGame?.renderer?.viewHalfX || VIEW_HALF_X;
  }

  update(dt, world) {
    this.time += dt;

    // Idle animations for pickups/obstacles
    for (const o of this.obstacles) o.update(dt);
    for (const p of this.pickups) p.update(dt);
    this.pickups = this.pickups.filter((p) => {
      if (p.dead) {
        p.dispose();
        return false;
      }
      return true;
    });

    const hero = world.getHero();
    if (!hero || hero.dead) return;

    // Wave triggering
    if (this.activeWave) {
      this.updateActiveWave(dt, world);
    } else if (this.waveIndex < this.def.waves.length) {
      const wave = this.def.waves[this.waveIndex];
      const vx = this._viewHalf(world);
      if (hero.position.x > wave.triggerX && hero.position.x < wave.triggerX + vx * 2.2) {
        this.triggerWave(wave, world);
      }
    }

    // Level completion: walked past the end after the last wave.
    if (!this.cleared && this.waveIndex >= this.def.waves.length && !this.activeWave) {
      if (hero.position.x >= this.length - 3) {
        this.cleared = true;
        world.onLevelCleared?.();
      }
    }
  }

  triggerWave(wave, world) {
    this.activeWave = {
      def: wave,
      spawned: [],
      done: false,
      timer: 0,
      lockX: wave.lockX,
      pending: wave.spawns.map((s, i) => ({ ...s, delay: i * 0.35 })),
      isBoss: !!wave.boss,
    };
    this.lockX = wave.lockX;
    this.checkpointX = Math.max(this.checkpointX, wave.lockX - 6);
    world.onWaveStart?.(wave, this.activeWave.isBoss);
  }

  updateActiveWave(dt, world) {
    const aw = this.activeWave;
    aw.timer += dt;

    // Spawn pending enemies with small delays.
    const remaining = [];
    for (const p of aw.pending) {
      p.delay -= dt;
      if (p.delay <= 0) {
        const e = this.spawnEnemy(p, world);
        aw.spawned.push(e);
      } else {
        remaining.push(p);
      }
    }
    aw.pending = remaining;

    // Check for completion.
    const alive = aw.spawned.filter((e) => !e.dead && !e.removed);
    if (alive.length === 0 && aw.pending.length === 0 && aw.timer > 0.5) {
      aw.done = true;
      if (aw.isBoss) this.bossDefeated = true;
      // Advance the checkpoint to just past the battle zone.
      if (aw.lockX != null) this.checkpointX = Math.max(this.checkpointX, aw.lockX + 3);
      this.activeWave = null;
      this.lockX = null;
      this.waveIndex += 1;
      world.onWaveCleared?.(aw.isBoss);
    }
  }

  spawnEnemy(spawnDef, world) {
    const side = spawnDef.side || 'right';
    const camX = world.renderer?.camX ?? 0;
    const vx = this._viewHalf(world);
    const x = side === 'right' ? camX + vx + 2.5 : camX - vx - 2.5;
    const z = THREE.MathUtils.clamp((Math.random() - 0.5) * 4.2, -2.2, 2.2);
    return world.spawnEnemy({
      archetype: spawnDef.archetype,
      x,
      z,
      facing: side === 'right' ? -1 : 1,
      isBoss: spawnDef.archetype === 'boss',
      bossTitle: spawnDef.bossTitle,
      healthScale: 1 + this.def.id * 0.18,
      scoreScale: 1 + this.def.id * 0.25,
    });
  }

  // -----------------------------------------------------------------------

  isLocked() {
    return this.lockX !== null;
  }

  // World bounds used by camera + hero clamping.
  heroBounds() {
    const camX = this.game.renderer?.camX ?? 0;
    const vx = this._viewHalf(this.game);
    const minX = Math.max(1.5, camX - vx + 1.2);
    const maxX = this.lockX !== null ? this.lockX : this.length - 2;
    return { minX, maxX };
  }

  cameraBounds() {
    const vx = this._viewHalf(this.game);
    return { min: vx - 2, max: this.length + 6 - vx };
  }

  getProgress() {
    const hero = this.game.getHero();
    return hero ? Math.min(1, Math.max(0, hero.position.x / this.length)) : 0;
  }

  dispose() {
    // Dispose geometry only: some materials (propMaterials) are shared across
    // levels and must not be torn down here.
    this.group.traverse((obj) => {
      if (obj.isMesh) {
        obj.geometry?.dispose();
      }
    });
    this.group.parent?.remove(this.group);
  }
}
