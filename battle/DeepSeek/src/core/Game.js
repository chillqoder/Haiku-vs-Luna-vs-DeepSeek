// The Game: orchestrates renderer, input, audio, combat, entities and levels.
// Also implements the "world" interface that entities/AI talk to.

import * as THREE from 'three';
import { Renderer } from '../renderer/Renderer.js';
import { Input } from '../input/Input.js';
import { AudioManager } from '../audio/AudioManager.js';
import { ParticleSystem } from '../assets/Particles.js';
import { CombatSystem } from '../combat/CombatSystem.js';
import { AttackTokenManager } from '../ai/EnemyAI.js';
import { HUD } from '../ui/HUD.js';
import { Level } from '../level/Level.js';
import { LEVELS } from '../level/LevelData.js';
import { Hero } from '../entities/Hero.js';
import { Enemy } from '../entities/Enemy.js';
import { Pickup } from '../level/Obstacle.js';
import { StateMachine } from './StateMachine.js';
import { VIEW_HALF_X, COMBAT } from './Constants.js';
import { clamp, resolveObstacle } from '../physics/Physics.js';

export class Game {
  constructor(canvas, uiRoot) {
    this.renderer = new Renderer(canvas);
    this.input = new Input();
    this.audio = new AudioManager();
    this.effects = new ParticleSystem(this.renderer.scene);
    this.combat = new CombatSystem(this);
    this.hud = new HUD(uiRoot, this);

    this.score = 0;
    this.lives = 3;
    this.highScore = this.loadHighScore();

    this.hero = null;
    this.enemies = [];
    this.level = null;
    this.levelIndex = 0;
    this.pickups = [];
    this.attackTokens = new AttackTokenManager(2);
    this.respawnTimer = 0;
    this.deathProcessed = false;
    this.time = 0;

    this.state = new StateMachine('menu', {
      menu: {
        enter: () => {
          this.hud.setScreen('menu');
          this.hud.setMenu('menu', [
            { label: 'START GAME', action: () => this.startGame() },
          ]);
          this.loadLevel(0, { preview: true });
        },
      },
      playing: {
        enter: () => {
          this.hud.setScreen(null);
        },
      },
      paused: {
        enter: () => {
          this.hud.setScreen('pause');
          this.hud.setMenu('pause', [
            { label: 'RESUME', action: () => this.state.set('playing') },
            { label: 'RESTART STAGE', action: () => this.retryStage() },
            { label: 'QUIT TO TITLE', action: () => this.quitToTitle() },
          ]);
        },
      },
      stageclear: {
        enter: () => {
          const next = LEVELS[this.levelIndex + 1];
          this.hud.setScreen('stageclear');
          this.hud.showStageClear(next ? next.name : 'THE END');
          this.audio.levelClear();
        },
      },
      gameover: {
        enter: () => {
          this.hud.setScreen('gameover');
          this.hud.showGameOver(this.score);
          this.audio.gameOver();
          const isNewHigh = this.score > this.highScore;
          if (isNewHigh) {
            this.highScore = this.score;
            this.saveHighScore(this.highScore);
          }
          this.hud.setMenu('gameover', [
            { label: 'RETRY STAGE', action: () => this.retryStage() },
            { label: 'QUIT TO TITLE', action: () => this.quitToTitle() },
          ]);
        },
      },
      victory: {
        enter: () => {
          this.hud.setScreen('victory');
          this.hud.showVictory(this.score);
          this.audio.levelClear();
          if (this.score > this.highScore) {
            this.highScore = this.score;
            this.saveHighScore(this.highScore);
          }
          this.hud.setMenu('victory', [
            { label: 'PLAY AGAIN', action: () => this.startGame() },
            { label: 'QUIT TO TITLE', action: () => this.quitToTitle() },
          ]);
        },
      },
    });

    this._boundResize = () => this.renderer.resize();
    window.addEventListener('resize', this._boundResize);

    this.lastTime = performance.now();
    this._running = false;
  }

  // -----------------------------------------------------------------------
  // world interface used by entities, AI and the level
  // -----------------------------------------------------------------------

  loadHighScore() {
    try {
      return Number(localStorage.getItem('neonfist_high') || 0) || 0;
    } catch {
      return 0;
    }
  }

  saveHighScore(score) {
    try {
      localStorage.setItem('neonfist_high', String(score));
    } catch {
      /* storage unavailable */
    }
  }

  getHero() {
    return this.hero;
  }

  getEnemies() {
    return this.enemies;
  }

  getActiveBoss() {
    for (const e of this.enemies) {
      if (e.isBoss && !e.dead && !e.removed) return e;
    }
    return null;
  }

  getLives() {
    return this.lives;
  }

  getTargetsFor(faction) {
    if (faction === 'hero') {
      const out = [];
      for (const e of this.enemies) if (!e.dead && !e.removed) out.push(e);
      if (this.level) {
        for (const o of this.level.obstacles) if (!o.dead) out.push(o);
      }
      return out;
    }
    if (faction === 'enemy') {
      return this.hero && !this.hero.dead ? [this.hero] : [];
    }
    return [];
  }

  spawnEnemy(opts) {
    const e = new Enemy(opts);
    e.position.set(opts.x, 0, opts.z);
    e.syncMesh();
    e.spawnInvuln = 1.1;
    this.renderer.scene.add(e.root);
    e.initAI(this);
    this.enemies.push(e);
    return e;
  }

  spawnPickup(x, z, type) {
    const p = new Pickup(type, x, z);
    this.renderer.scene.add(p.mesh);
    this.pickups.push(p);
  }

  addScore(n) {
    this.score += n;
  }

  onWaveStart(wave, isBoss) {
    if (isBoss) {
      const title = wave.spawns.find((s) => s.bossTitle)?.bossTitle || 'BOSS';
      this.hud.showBanner(title, 'BOSS FIGHT', 2.6, 'danger');
      this.audio.bossRoar();
      this.renderer.addShake(0.35, 0.6);
    } else {
      this.hud.showBanner('FIGHT!', '', 1.1);
    }
    this.audio.uiConfirm();
  }

  onWaveCleared(isBoss) {
    if (isBoss) {
      this.hud.showBanner('BOSS DEFEATED', '', 2.0, '');
      this.addScore(1500);
    } else {
      this.hud.showBanner('WAVE CLEAR', '', 1.2);
      this.addScore(200);
    }
  }

  onLevelCleared() {
    this.addScore(2500 + this.lives * 1000);
    this.state.set('stageclear');
  }

  onBossPhase(boss, phase) {
    this.hud.showBanner(phase === 2 ? 'ENRAGED!' : 'DESPERATE!', '', 1.2, 'danger');
    this.renderer.addShake(0.3, 0.4);
    this.audio.bossRoar();
  }

  // ---- combat callbacks --------------------------------------------------

  onHeroHit(target, def, point, result) {
    const heavy = def.stop === 'heavy';
    this.effects.hitSpark(point, heavy);
    if (heavy) {
      this.audio.hitHeavy();
      this.renderer.addShake(0.32, 0.28);
    } else {
      this.audio.hitLight();
      this.renderer.addShake(0.14, 0.18);
    }

    const combo = this.combat.combo;
    const mult = 1 + Math.min(combo, 20) * 0.05;
    this.addScore(Math.round(def.damage * mult));
    this.hero.addEnergy(heavy ? COMBAT.energyGainHeavy : COMBAT.energyGainLight);

    if (result && result.killed) {
      this.handleEnemyKilled(target, def);
    }
  }

  handleEnemyKilled(target, def) {
    if (!target || target.faction !== 'enemy') return;
    this.audio.ko();
    this.effects.koBurst(new THREE.Vector3(target.position.x, 1.2, target.position.z), 0xffd23d);
    this.addScore(target.scoreValue || 100);
    // Small chance for a coin drop.
    if (Math.random() < 0.18) this.spawnPickup(target.position.x, target.position.z, 'coin');
    if (target.isBoss) {
      this.renderer.addShake(0.6, 0.7);
    }
  }

  onEnemyHitHero(attacker, def, point, result) {
    const heavy = def.stop === 'heavy';
    this.effects.hitSpark(point, heavy);
    this.audio.hurt();
    this.renderer.addShake(heavy ? 0.4 : 0.22, 0.3);
    this.hud.flashDamage();
    if (this.hero) this.hero.addEnergy(COMBAT.energyGainTaken);
    if (result && result.killed) {
      // Hero death flow happens in updatePlaying once the fade completes.
    }
  }

  onBlock(attacker, target, point) {
    this.effects.blockSpark(point);
    this.audio.block();
    if (attacker === this.hero) this.addScore(5);
  }

  onThrownBodyHit(thrower, target, result) {
    if (thrower === this.hero) this.addScore(75);
    if (result && result.killed) this.handleEnemyKilled(target, null);
  }

  // -----------------------------------------------------------------------
  // flow
  // -----------------------------------------------------------------------

  startGame() {
    this.score = 0;
    this.lives = 3;
    this.loadLevel(0);
    this.state.set('playing');
  }

  quitToTitle() {
    this.score = 0;
    this.state.set('menu');
  }

  retryStage() {
    this.lives = 3;
    this.loadLevel(this.levelIndex);
    this.state.set('playing');
  }

  loadLevel(index, { preview = false } = {}) {
    // Cleanup previous
    if (this.level) {
      this.level.dispose();
      this.level = null;
    }
    for (const e of this.enemies) {
      this.renderer.scene.remove(e.root);
      this.disposeObject(e.root);
    }
    this.enemies = [];
    for (const p of this.pickups) {
      p.dispose();
    }
    this.pickups = [];
    this.combat.clear();
    this.effects.clear();
    this.respawnTimer = 0;
    this.deathProcessed = false;

    this.levelIndex = index;
    const def = LEVELS[index];
    this.level = new Level(def, this);
    this.renderer.scene.add(this.level.group);

    this.renderer.setTheme({
      background: def.background,
      fog: def.fog,
      hemi: def.hemi,
      hemiGround: def.hemiGround,
      sun: def.sun,
    });

    const startX = preview ? 5 : 3;
    if (!this.hero) {
      this.hero = new Hero({ x: startX, z: 0.4 });
      this.renderer.scene.add(this.hero.root);
      this.hero.revive(startX, 0.4);
    } else {
      this.hero.revive(startX, 0.4);
    }
    this.hero.lives = this.lives;

    this.attackTokens = new AttackTokenManager(def.id >= 2 ? 3 : 2);

    // Snap the camera.
    const cb = this.level.cameraBounds();
    this.renderer.follow(startX, 0, cb, 0, true);

    if (!preview) {
      this.hud.showBanner(def.name, def.subtitle, 2.8);
    }
  }

  disposeObject(root) {
    root.traverse((obj) => {
      if (obj.isMesh) {
        obj.geometry?.dispose();
        if (Array.isArray(obj.material)) obj.material.forEach((m) => m.dispose());
        else obj.material?.dispose();
      }
    });
  }

  resetCurrentWave() {
    if (!this.level || !this.level.activeWave) return;
    for (const e of this.level.activeWave.spawned) {
      if (!e.dead && !e.removed) {
        e.requestRemoval();
        this.attackTokens.release(e);
      }
    }
    this.level.activeWave = null;
    this.level.lockX = null;
  }

  // -----------------------------------------------------------------------
  // main loop
  // -----------------------------------------------------------------------

  start() {
    this._running = true;
    const loop = (t) => {
      if (!this._running) return;
      const dt = Math.min((t - this.lastTime) / 1000, 1 / 30) || 0.016;
      this.lastTime = t;
      this.update(dt);
      this.renderer.update(dt);
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }

  update(dt) {
    this.time += dt;
    this.input.update();

    switch (this.state.current) {
      case 'menu':
        this.updateMenu(dt);
        break;
      case 'playing':
        this.updatePlaying(dt);
        break;
      case 'paused':
        this.hud.navigateMenu(dt, this.input);
        if (this.input.justPressed('pause')) this.state.set('playing');
        break;
      case 'stageclear':
        this.updateIdleWorld(dt);
        if (this.input.justPressed('confirm', 'jump')) this.advanceStage();
        break;
      case 'gameover':
      case 'victory':
        this.updateIdleWorld(dt);
        this.hud.navigateMenu(dt, this.input);
        break;
      default:
        break;
    }

    this.hud.update(dt);
    this.input.endFrame();
  }

  updateMenu(dt) {
    // Gentle idle animation for the hero on the title screen.
    if (this.hero && this.level) {
      this.hero.animator.play('idle');
      this.hero.animator.update(dt);
      this.hero.syncMesh();
      const cb = this.level.cameraBounds();
      this.renderer.follow(this.hero.position.x + 3, dt, cb, 1.2);
    }
    this.effects.update(dt);
    this.hud.navigateMenu(dt, this.input);
  }

  updateIdleWorld(dt) {
    // Keep particles and camera alive on overlay screens.
    this.effects.update(dt);
    if (this.hero && !this.hero.dead) {
      this.hero.animator.update(dt);
      this.hero.syncMesh();
    }
    for (const e of this.enemies) {
      if (!e.dead) {
        e.animator.update(dt);
        e.syncMesh();
      }
    }
  }

  advanceStage() {
    if (this.levelIndex + 1 < LEVELS.length) {
      this.loadLevel(this.levelIndex + 1);
      this.state.set('playing');
    } else {
      this.state.set('victory');
    }
  }

  // -----------------------------------------------------------------------

  updatePlaying(dt) {
    if (this.input.justPressed('pause')) {
      this.state.set('paused');
      return;
    }

    this.combat.tickTimers(dt);
    const wdt = dt * (this.combat.isHitStopped ? this.combat.hitStopScale : 1);

    // Respawn timer
    if (this.respawnTimer > 0) {
      this.respawnTimer -= dt;
      if (this.respawnTimer <= 0) {
        this.respawnHero();
      }
    }

    // Entities
    this.hero.update(wdt, this);
    for (const e of this.enemies) {
      e.update(wdt, this);
    }

    // Combat resolution
    this.combat.updateHitboxes(wdt, this);

    // Level (waves, obstacles, completion)
    this.level.update(wdt, this);

    // Pickups
    this.updatePickups(dt);

    // Physical world adjustments
    this.separateEntities();
    this.resolveObstacles();
    this.clampHero();
    this.cleanupEnemies();

    // Camera
    const cb = this.level.cameraBounds();
    if (this.level.isLocked()) {
      this.renderer.follow(this.level.lockX, dt, cb, 0);
    } else {
      const lean = this.hero.facing * 1.6;
      this.renderer.follow(this.hero.position.x, dt, cb, lean);
    }

    // Effects on real time
    this.effects.update(dt);

    // Death handling
    if (this.hero.deadAndGone && !this.deathProcessed) {
      this.deathProcessed = true;
      this.onHeroDefeated();
    }
  }

  updatePickups(dt) {
    const hero = this.hero;
    for (const p of this.pickups) {
      if (p.dead) {
        p.dispose();
        continue;
      }
      const dx = p.position.x - hero.position.x;
      const dz = p.position.z - hero.position.z;
      if (!hero.dead && dx * dx + dz * dz < 0.9) {
        p.dead = true;
        if (p.type === 'food') {
          hero.health = Math.min(hero.maxHealth, hero.health + 22);
          this.hud.showBanner('+22 HP', '', 0.6);
        } else {
          this.addScore(250);
          this.hud.showBanner('+250', '', 0.6);
        }
        this.effects.spawnMany({
          position: new THREE.Vector3(p.position.x, 1.0, p.position.z),
          count: 10,
          color: p.type === 'food' ? 0x9aff6a : 0xffd23d,
          size: 0.35,
          speed: 4,
          upward: 0.8,
          life: 0.4,
          gravity: -8,
        });
        this.audio.pickup();
      }
    }
    this.pickups = this.pickups.filter((p) => !p.dead);
  }

  separateEntities() {
    const list = [];
    if (!this.hero.dead) list.push(this.hero);
    for (const e of this.enemies) {
      if (!e.dead && !e.removed && !e.isThrownFlying && !e.grabbedBy) list.push(e);
    }
    for (let i = 0; i < list.length; i++) {
      for (let j = i + 1; j < list.length; j++) {
        const a = list[i];
        const b = list[j];
        if (a.downPhase !== null || b.downPhase !== null) continue;
        if (a.position.y > 0.4 || b.position.y > 0.4) continue;
        const dx = b.position.x - a.position.x;
        const dz = b.position.z - a.position.z;
        const minX = (a.halfWidth + b.halfWidth) * 0.62;
        const minZ = (a.halfDepth + b.halfDepth) * 0.62;
        if (Math.abs(dx) < minX && Math.abs(dz) < minZ) {
          const overlapX = minX - Math.abs(dx);
          const dir = dx === 0 ? (i % 2 ? 1 : -1) : Math.sign(dx);
          const massSum = (a.mass || 1) + (b.mass || 1);
          a.position.x -= dir * overlapX * 0.5 * ((b.mass || 1) / massSum) * 1.0;
          b.position.x += dir * overlapX * 0.5 * ((a.mass || 1) / massSum) * 1.0;
        }
      }
    }
  }

  resolveObstacles() {
    if (!this.level) return;
    const entities = [this.hero, ...this.enemies];
    for (const o of this.level.obstacles) {
      if (o.dead) continue;
      const box = o.hurtBox();
      for (const e of entities) {
        if (!e || e.dead || e.removed) continue;
        if (e.isThrownFlying) continue;
        if (e.position.y >= o.height - 0.15) continue;
        const radius = Math.max(e.halfWidth, e.halfDepth) + 0.06;
        resolveObstacle(e, box, radius);
      }
    }
  }

  clampHero() {
    const hero = this.hero;
    const camX = this.renderer.camX;
    const vx = this.renderer.viewHalfX || VIEW_HALF_X;
    const left = Math.max(1.2, camX - vx + 0.9);
    const right = this.level.isLocked()
      ? camX + vx - 0.9
      : this.level.length - 2;
    hero.position.x = clamp(hero.position.x, left, right);
  }

  cleanupEnemies() {
    const alive = [];
    for (const e of this.enemies) {
      if (e.removed) {
        this.renderer.scene.remove(e.root);
        this.disposeObject(e.root);
        this.attackTokens.release(e);
      } else {
        alive.push(e);
      }
    }
    this.enemies = alive;
  }

  onHeroDefeated() {
    this.resetCurrentWave();
    this.lives -= 1;
    if (this.lives <= 0) {
      this.lives = 0;
      this.state.set('gameover');
      return;
    }
    this.respawnTimer = 1.2;
    this.hud.showBanner('READY?', '', 1.0);
  }

  respawnHero() {
    const x = this.level.checkpointX;
    this.hero.revive(x, 0.4);
    this.deathProcessed = false;
    const cb = this.level.cameraBounds();
    this.renderer.follow(x, 0, cb, 0, true);
    this.hud.showBanner('GO!', '', 0.8);
  }
}
