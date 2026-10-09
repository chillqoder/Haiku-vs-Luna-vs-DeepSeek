// Уровень: прокрутка камеры, волны врагов с блокировкой камеры, препятствия, аптечки,
// токены атак (ограничение числа одновременных атакующих), чекпоинты и условие завершения.
import * as THREE from 'three';
import { ObjectPool } from '../fx/Pool.js';
import { Enemy } from '../entities/Enemy.js';
import { Boss } from '../entities/Boss.js';
import { Obstacle } from '../entities/Obstacle.js';
import { Projectile } from '../entities/Projectile.js';
import { ENEMY_TYPES, BOSS_TYPES } from '../entities/enemyTypes.js';
import { Background } from './Background.js';
import { VIEW_WIDTH } from '../renderer/Renderer.js';
import { clamp, rand, resolveSolids, separate } from '../physics/Physics.js';
import { asphaltTex, planksTex, gratingTex, signTex, cached } from '../assets/Textures.js';

const MAX_ATTACKERS = 2; // сколько врагов могут атаковать одновременно
const CORPSE_TIME = 2.6; // через сколько секунд погибший враг удаляется со сцены

const pickupGeometry = () => cached('pickupGeo', () => new THREE.OctahedronGeometry(0.25));
const pickupMaterial = () => cached('pickupMat', () => new THREE.MeshBasicMaterial({ color: 0x7dff9a }));

export class Level {
  constructor(world, data) {
    world.level = this;
    this.world = world;
    this.data = data;
    this.length = data.length;
    this.camLeft = 0;
    this.camMaxLeft = Math.max(0, data.length - VIEW_WIDTH);

    this.group = new THREE.Group();
    world.scene.add(this.group);
    this.background = new Background(this.group, data.theme);

    this.enemies = [];
    this.obstacles = [];
    this.pickups = [];
    this.tokens = new Set();
    this.projectilePool = new ObjectPool(() => new Projectile(world, this.group), (p) => p.deactivate());

    this.nextWave = 0;
    this.activeWave = null;
    this.bossDefeated = false;
    this.checkpoint = { camLeft: 0, nextWave: 0 };

    world.renderer.setTheme(data.colors);
    this.buildScenery();
    for (const [kind, x, z] of data.obstacles) {
      this.obstacles.push(new Obstacle(world, this.group, kind, x, z));
    }
    for (const [type, x, z] of data.ambient ?? []) this.spawnEnemy(type, x, z, false);

    world.hero.respawn(data.heroStart, 0);
    world.hero.invuln = 0.5;
    const center = this.camLeft + VIEW_WIDTH / 2;
    this.background.update(center);
    world.renderer.follow(center);
  }

  update(dt) {
    const { hero } = this.world;
    hero.update(dt);
    for (const enemy of this.enemies) enemy.update(dt);
    this.resolveCollisions();
    this.constrainActors();
    this.world.combat.update(dt);
    this.updateProjectiles(dt);
    this.updatePickups(dt);
    this.updateWaves();
    this.updateCamera();
    this.cleanup();
    const center = this.camLeft + VIEW_WIDTH / 2;
    this.background.update(center);
    this.world.renderer.follow(center);
  }

  // Камера следует за героем, но никогда не уходит назад и останавливается на точках волн
  updateCamera() {
    const { hero } = this.world;
    const locked = this.activeWave !== null;
    const next = this.data.waves[this.nextWave];
    const target = clamp(hero.pos.x - VIEW_WIDTH * 0.45, 0, this.camMaxLeft);
    let ceiling = locked ? this.camLeft : this.camMaxLeft;
    if (!locked && next) ceiling = Math.min(ceiling, next.at);
    this.camLeft = Math.max(this.camLeft, Math.min(target, ceiling));
    if (!locked && next && this.camLeft >= next.at - 0.001) this.startWave(next);
  }

  startWave(wave) {
    const state = { boss: !!wave.boss };
    this.activeWave = state;
    this.nextWave += 1;
    const spawnX = this.camLeft + VIEW_WIDTH + 1.5; // за правым краем экрана
    if (wave.boss) {
      const boss = new Boss(this.world, BOSS_TYPES[wave.boss], spawnX + 1, 0);
      boss.wave = state;
      this.enemies.push(boss);
      this.world.audio.play('roar');
    }
    for (const [type, dx, dz] of wave.enemies ?? []) {
      const enemy = this.spawnEnemy(type, spawnX + dx, dz, true);
      enemy.wave = state;
    }
    this.world.game.onWaveStart();
  }

  // Волна зачищена: камера разблокируется, точка сохранения переносится сюда
  updateWaves() {
    const wave = this.activeWave;
    if (!wave) return;
    if (this.enemies.some((e) => e.wave === wave && !e.dying)) return;
    this.activeWave = null;
    this.checkpoint = { camLeft: this.camLeft, nextWave: this.nextWave };
    if (wave.boss) this.bossDefeated = true;
    this.world.game.onWaveCleared(wave.boss);
  }

  // Уровень пройден: все волны зачищены, а герой дошёл до выхода
  isComplete() {
    return !this.activeWave && this.nextWave >= this.data.waves.length && this.world.hero.pos.x >= this.data.exitX;
  }

  // После гибели героя: убираем врагов волн и снаряды, возвращаем героя к последней точке сохранения
  restoreCheckpoint() {
    for (const enemy of this.enemies) {
      if (enemy.wave) enemy.dispose();
    }
    this.enemies = this.enemies.filter((e) => !e.wave);
    for (const p of this.projectilePool.active.slice()) this.projectilePool.release(p);
    this.tokens.clear();
    this.activeWave = null;
    this.camLeft = this.checkpoint.camLeft;
    this.nextWave = this.checkpoint.nextWave;
    this.world.combat.reset();
    this.world.hero.respawn(this.camLeft + 2.5, 0);
    this.world.renderer.follow(this.camLeft + VIEW_WIDTH / 2);
  }

  constrainActors() {
    const { hero } = this.world;
    hero.pos.x = clamp(hero.pos.x, Math.max(0, this.camLeft + 0.6), Math.min(this.length - 0.6, this.camLeft + VIEW_WIDTH - 0.6));
    for (const enemy of this.enemies) {
      if (!enemy.grabbedBy) enemy.pos.x = clamp(enemy.pos.x, this.camLeft - 2, this.length);
    }
  }

  resolveCollisions() {
    const solids = this.obstacles.filter((o) => o.alive);
    const actors = [this.world.hero, ...this.enemies].filter((a) => a.alive && !a.grabbedBy);
    for (const actor of actors) resolveSolids(actor, solids);
    for (let i = 0; i < actors.length; i++) {
      for (let j = i + 1; j < actors.length; j++) separate(actors[i], actors[j]);
    }
  }

  // Токены атак: одновременно атакуют не больше MAX_ATTACKERS врагов; босс атакует всегда
  acquireToken(enemy) {
    if (enemy.isBoss || this.tokens.has(enemy)) return true;
    if (this.tokens.size >= MAX_ATTACKERS) return false;
    this.tokens.add(enemy);
    return true;
  }

  releaseToken(enemy) {
    this.tokens.delete(enemy);
  }

  spawnEnemy(type, x, z, aggro) {
    const enemy = new Enemy(this.world, ENEMY_TYPES[type], x, z, { aggro });
    this.enemies.push(enemy);
    return enemy;
  }

  spawnProjectile(owner, move) {
    const { hero } = this.world;
    const dir = Math.sign(hero.pos.x - owner.pos.x) || owner.facing;
    this.projectilePool.acquire().launch(owner, dir, move.damage, 8);
  }

  updateProjectiles(dt) {
    for (const p of this.projectilePool.active.slice()) {
      if (!p.update(dt)) this.projectilePool.release(p);
    }
  }

  spawnPickup(x, z) {
    const mesh = new THREE.Mesh(pickupGeometry(), pickupMaterial());
    mesh.position.set(x, 0.6, z);
    this.group.add(mesh);
    this.pickups.push({ mesh, x, z, alive: true, bob: rand(0, 6) });
  }

  updatePickups(dt) {
    const { hero, audio, fx } = this.world;
    for (const p of this.pickups) {
      if (!p.alive) continue;
      p.bob += dt;
      p.mesh.position.y = 0.6 + Math.sin(p.bob * 3) * 0.1;
      p.mesh.rotation.y += dt * 2;
      if (hero.alive && Math.abs(hero.pos.x - p.x) < 0.9 && Math.abs(hero.pos.z - p.z) < 0.9) {
        p.alive = false;
        p.mesh.visible = false;
        hero.heal(20);
        audio.play('pickup');
        fx.emit(p.x, 0.8, p.z, 14, 0x7dff9a, { speed: 3, life: 0.5, up: 1 });
      }
    }
  }

  // Удаляем тела погибших врагов по истечении времени
  cleanup() {
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const enemy = this.enemies[i];
      if (enemy.dying && enemy.deathTimer > CORPSE_TIME) {
        enemy.dispose();
        this.enemies.splice(i, 1);
      }
    }
  }

  get boss() {
    return this.enemies.find((e) => e.isBoss && e.alive) ?? null;
  }

  buildScenery() {
    const { theme, length } = this.data;
    const span = length + 60;
    const groundTex = { street: asphaltTex, dojo: planksTex, industrial: gratingTex }[theme]();
    groundTex.repeat.set(span / 6, 10);
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(span, 60),
      new THREE.MeshLambertMaterial({ map: groundTex }),
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.set(length / 2, 0, -4);
    this.group.add(ground);

    // Бордюры по краям полосы
    const curbColor = { street: 0x6b6f7a, dojo: 0x4a2c1a, industrial: 0xd9b331 }[theme];
    for (const z of [-2.5, 2.5]) {
      const curb = new THREE.Mesh(
        new THREE.BoxGeometry(span, 0.14, 0.3),
        new THREE.MeshLambertMaterial({ color: curbColor }),
      );
      curb.position.set(length / 2, 0.07, z);
      this.group.add(curb);
    }

    const dark = new THREE.MeshLambertMaterial({ color: 0x2a2d36 });
    if (theme === 'street') {
      for (let x = 4; x < length; x += 14) {
        const pole = new THREE.Mesh(new THREE.BoxGeometry(0.12, 4, 0.12), dark);
        pole.position.set(x, 2, -2.9);
        const lamp = new THREE.Mesh(
          new THREE.SphereGeometry(0.22, 10, 8),
          new THREE.MeshBasicMaterial({ color: 0xffe6a0 }),
        );
        lamp.position.set(x, 4.1, -2.9);
        this.group.add(pole, lamp);
      }
      for (let x = 11; x < length; x += 28) {
        const sign = new THREE.Mesh(
          new THREE.PlaneGeometry(2.6, 0.7),
          new THREE.MeshBasicMaterial({ map: signTex(`neon${x}`, 'BAR', '#120a1f', '#ff4fd8') }),
        );
        sign.position.set(x, 3.4, -3.3);
        this.group.add(sign);
      }
    } else if (theme === 'dojo') {
      for (let x = 6; x < length; x += 16) {
        const pillar = new THREE.Mesh(
          new THREE.CylinderGeometry(0.25, 0.25, 5, 12),
          new THREE.MeshLambertMaterial({ color: 0x8b2a1e }),
        );
        pillar.position.set(x, 2.5, -3.2);
        const lantern = new THREE.Mesh(
          new THREE.SphereGeometry(0.28, 10, 8),
          new THREE.MeshBasicMaterial({ color: 0xffb347 }),
        );
        lantern.position.set(x, 4.2, -2.6);
        this.group.add(pillar, lantern);
      }
    } else {
      const pipe = new THREE.Mesh(
        new THREE.CylinderGeometry(0.18, 0.18, length + 40, 8),
        new THREE.MeshLambertMaterial({ color: 0x596170 }),
      );
      pipe.rotation.z = Math.PI / 2;
      pipe.position.set(length / 2, 3.6, -3.4);
      this.group.add(pipe);
      for (let x = 8; x < length; x += 18) {
        const post = new THREE.Mesh(new THREE.BoxGeometry(0.4, 3.6, 0.4), dark);
        post.position.set(x, 1.8, -3.4);
        this.group.add(post);
      }
    }

    // Знак выхода в конце уровня
    const exit = new THREE.Mesh(
      new THREE.PlaneGeometry(2.2, 0.55),
      new THREE.MeshBasicMaterial({ map: signTex('exit', 'EXIT →', '#1d7a3a', '#eaffea') }),
    );
    exit.position.set(this.data.exitX, 2.6, -2.2);
    this.group.add(exit);
  }

  dispose() {
    for (const enemy of this.enemies) enemy.dispose();
    this.enemies = [];
    this.world.scene.remove(this.group);
    this.group.traverse((o) => o.material?.dispose());
  }
}
