import * as THREE from 'three';
import { Input } from './Input.js';
import { AudioFX } from './Audio.js';
import { Renderer } from './Renderer.js';
import { Hero } from '../entities/Hero.js';
import { Enemy } from '../entities/Enemy.js';
import { Level, LEVELS } from '../world/Level.js';
import { Combat } from '../combat/Combat.js';
import { Particles } from '../effects/Particles.js';
import { inAttackRange } from './Physics.js';

export class Game {
  constructor(canvas, ui) {
    this.canvas = canvas;
    this.ui = ui;
    this.state = 'menu';
    this.view = new Renderer(canvas);
    this.scene = this.view.scene;
    this.camera = this.view.camera;
    this.renderer = this.view.renderer;

    this.level = new Level(this.scene);
    this.particles = new Particles(this.scene);
    this.hero = new Hero(this.scene);
    this.enemies = [];
    this.audio = new AudioFX();
    this.input = new Input(() => this.togglePause());
    this.combat = new Combat(this);
    this.levelIndex = 0;
    this.waveIndex = 0;
    this.score = 0;
    this.gateX = null;
    this.respawnTimer = 0;
    this.laneTipShown = false;
    this.clock = new THREE.Clock();
    this.lastUiTime = 0;
    this.animationFrame = 0;
    this.resize = this.resize.bind(this);
    window.addEventListener('resize', this.resize);
    this.resize();
    this.level.load(0);
    this.updateCamera(0.016, true);
  }

  run() {
    const frame = () => {
      this.animationFrame = requestAnimationFrame(frame);
      const dt = Math.min(this.clock.getDelta(), 0.034);
      if (this.state === 'playing') this.update(dt);
      else this.updateAmbient(dt);
      this.view.render();
    };
    frame();
  }

  startRun() {
    this.audio.unlock();
    this.clearEnemies();
    this.particles.clear();
    this.levelIndex = 0;
    this.waveIndex = 0;
    this.score = 0;
    this.gateX = null;
    this.respawnTimer = 0;
    this.laneTipShown = false;
    this.level.load(this.levelIndex);
    this.hero.lives = 3;
    this.hero.score = 0;
    this.hero.reset(4, 0, true);
    this.state = 'playing';
    this.updateCamera(0.016, true);
    this.ui.showScreen('playing');
    this.ui.toast('DISTRICT 01 — THE RAINLINE', 2100);
    this.updateUI(true);
    this.clock.getDelta();
  }

  resume() {
    if (this.state !== 'paused') return;
    this.state = 'playing';
    this.ui.showScreen('playing');
    this.clock.getDelta();
  }

  togglePause() {
    if (this.state === 'playing') {
      this.state = 'paused';
      this.ui.showScreen('paused');
    } else if (this.state === 'paused') this.resume();
  }

  update(dt) {
    this.input.update();
    if (this.hero.isDead) {
      this.respawnTimer -= dt;
      this.hero.updateAnimation(dt, 0);
      if (this.respawnTimer <= 0) this.handleHeroDown();
      this.particles.update(dt);
      this.updateCamera(dt);
      this.input.finishFrame();
      this.updateUI();
      return;
    }

    const actions = this.hero.update(dt, this.input, this.level, this.audio);
    this.score = this.hero.score;
    if (this.gateX !== null && this.hero.group.position.x > this.gateX) {
      this.hero.group.position.x = this.gateX;
      this.hero.velocity.x = Math.min(0, this.hero.velocity.x);
    }
    for (const action of actions) this.combat.resolve(action);
    for (const enemy of this.enemies) {
      const enemyAttack = enemy.update(dt, this.hero);
      if (enemyAttack) {
        const dx = this.hero.group.position.x - enemy.group.position.x;
        const inReach = dx * enemy.facing > -0.2 && inAttackRange(enemy, this.hero, enemy.facing, enemyAttack.range, enemyAttack.depth);
        if (inReach && this.hero.takeDamage(enemyAttack.damage, enemyAttack.knockback, enemyAttack.laneKnock, this.audio)) {
          this.particles.burst(this.hero.group.position, '#ff9d86', 10, 3.7);
          if (this.hero.isDead) this.respawnTimer = 1.15;
        }
      }
    }
    this.removeDefeatedEnemies();
    this.updateWaves();
    this.particles.update(dt);
    this.level.updateBackdrop(this.camera.position.x);
    this.updateCamera(dt);
    if (this.hero.group.position.x > 6 && this.levelIndex === 0 && !this.laneTipShown) {
      this.laneTipShown = true;
      this.ui.toast('WATCH YOUR LANE — UP / DOWN', 1900);
    }
    this.input.finishFrame();
    this.updateUI();
  }

  updateWaves() {
    const waves = LEVELS[this.levelIndex].waves;
    if (this.enemies.length > 0) return;
    if (this.gateX !== null && this.waveIndex > 0) {
      const previous = waves[this.waveIndex - 1];
      this.gateX = null;
      if (previous.boss) {
        this.completeLevel();
        return;
      }
    }
    if (this.waveIndex < waves.length) {
      const wave = waves[this.waveIndex];
      if (this.hero.group.position.x >= wave.x - 12) {
        this.spawnWave(wave);
        this.waveIndex += 1;
        this.gateX = wave.x + 13;
        this.ui.toast(wave.boss ? `${LEVELS[this.levelIndex].boss.toUpperCase()} ENTERS THE BLOCK` : 'THE CREW MOVES IN', 1800);
      }
    }
  }

  spawnWave(wave) {
    const config = LEVELS[this.levelIndex];
    wave.types.forEach((type, index) => {
      const spread = (index - (wave.types.length - 1) / 2) * 1.25;
      const x = Math.min(config.length - 4, wave.x + 5 + Math.abs(spread) * 0.3);
      const z = spread;
      this.enemies.push(new Enemy(this.scene, type, x, z, wave.boss ? config.boss : null));
    });
  }

  removeDefeatedEnemies() {
    for (let i = this.enemies.length - 1; i >= 0; i -= 1) {
      const enemy = this.enemies[i];
      if (enemy.dead && enemy.actionTimer <= 0) {
        enemy.dispose();
        this.enemies.splice(i, 1);
      }
    }
  }

  clearEnemies() {
    for (const enemy of this.enemies) enemy.dispose();
    this.enemies.length = 0;
  }

  completeLevel() {
    if (this.levelIndex >= LEVELS.length - 1) {
      this.state = 'victory';
      this.ui.finalScore(this.score);
      this.ui.showScreen('victory');
      return;
    }
    this.levelIndex += 1;
    this.waveIndex = 0;
    this.level.load(this.levelIndex);
    this.hero.reset(4, 0, false);
    this.gateX = null;
    this.laneTipShown = false;
    this.ui.toast(`CHECKPOINT — ${LEVELS[this.levelIndex].name}`, 2400);
  }

  handleHeroDown() {
    this.hero.lives -= 1;
    if (this.hero.lives <= 0) {
      this.state = 'gameover';
      this.ui.showScreen('gameover');
      return;
    }
    this.clearEnemies();
    this.waveIndex = 0;
    this.gateX = null;
    this.hero.reset(4, 0, true);
    this.ui.toast(`CHECKPOINT RESTART · ${this.hero.lives} LIVES LEFT`, 2100);
  }

  updateCamera(dt, immediate = false) {
    const targetX = this.hero.group.position.x + 1.8;
    const desired = new THREE.Vector3(targetX, 6.5, 21.5);
    if (immediate) this.camera.position.copy(desired);
    else this.camera.position.lerp(desired, 1 - Math.exp(-3.8 * dt));
    this.camera.lookAt(targetX, 1.7, 0);
    this.camera.updateProjectionMatrix();
  }

  updateAmbient(dt) {
    if (this.state === 'menu') {
      this.hero.group.position.x = 4 + Math.sin(performance.now() * 0.00055) * 0.12;
      this.hero.updateAnimation(dt, 0.08);
      this.level.updateBackdrop(this.camera.position.x);
      this.updateCamera(dt);
    } else if (this.state === 'paused') this.hero.updateAnimation(dt, 0);
  }

  updateUI(force = false) {
    const now = performance.now();
    if (!force && now - this.lastUiTime < 70) return;
    this.lastUiTime = now;
    const boss = this.enemies.find((enemy) => enemy.type === 'boss' && !enemy.dead) ?? null;
    const activeEnemies = this.enemies.some((enemy) => !enemy.dead);
    this.ui.update({ hero: this.hero, score: this.score, level: LEVELS[this.levelIndex], combo: this.hero.comboHits, boss, specialCooldown: this.hero.specialCooldown, enemies: activeEnemies });
  }

  resize() {
    const width = window.innerWidth;
    const height = window.innerHeight;
    this.view.resize(width, height);
  }
}
