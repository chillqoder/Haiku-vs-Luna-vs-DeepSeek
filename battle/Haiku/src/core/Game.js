// Игра: главный цикл (requestAnimationFrame + delta time), общий контекст мира (world),
// сессия (счёт, жизни, уровень), переходы между уровнями и управление состояниями.
import { Renderer } from '../renderer/Renderer.js';
import { Input } from '../input/Input.js';
import { Audio } from '../audio/Audio.js';
import { Particles } from '../fx/Particles.js';
import { Combat } from '../combat/Combat.js';
import { Hero } from '../entities/Hero.js';
import { Level } from '../level/Level.js';
import { LEVELS } from '../level/levels.js';
import { HUD } from '../ui/HUD.js';
import { Screens } from '../ui/Screens.js';
import { StateMachine } from './StateMachine.js';
import { createStates } from './states.js';

const BEST_KEY = 'alley-riot-best';
const START_LIVES = 3;

function loadBest() {
  try {
    return Number(localStorage.getItem(BEST_KEY)) || 0;
  } catch {
    return 0; // приватный режим или заблокированное хранилище — рекорд просто не сохранится
  }
}

function storeBest(value) {
  try {
    localStorage.setItem(BEST_KEY, String(value));
  } catch {
    // см. loadBest
  }
}

export class Game {
  constructor(container) {
    this.renderer = new Renderer(container);
    this.input = new Input();
    this.audio = new Audio();
    this.fx = new Particles(this.renderer.scene);
    this.hud = new HUD(document.getElementById('hud'));
    this.screens = new Screens(document.getElementById('overlay'));

    // Общий контекст, который получают все сущности и уровень
    this.world = {
      game: this,
      scene: this.renderer.scene,
      renderer: this.renderer,
      input: this.input,
      audio: this.audio,
      fx: this.fx,
      level: null,
      hero: null,
      combat: null,
      acceptInput: false,
    };
    this.world.combat = new Combat(this.world);
    this.world.hero = new Hero(this.world);

    this.session = { levelIndex: 0, score: 0, lives: START_LIVES, best: loadBest() };
    this.stateTimer = 0;
    this.states = new StateMachine(this);
    createStates(this.states);
    this.last = 0;
  }

  get level() {
    return this.world.level;
  }

  get hero() {
    return this.world.hero;
  }

  get combat() {
    return this.world.combat;
  }

  start() {
    // Браузер разрешает звук только после жеста пользователя
    const unlockAudio = () => this.audio.resume();
    window.addEventListener('keydown', unlockAudio);
    window.addEventListener('pointerdown', unlockAudio);

    this.states.set('title');
    this.last = performance.now();
    const frame = (now) => {
      const dt = Math.min(0.05, (now - this.last) / 1000); // не больше 50 мс за кадр
      this.last = now;
      this.update(dt);
      requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  }

  update(dt) {
    this.input.update();
    if (this.input.wasPressed('mute')) this.audio.toggleMute();
    this.states.update(dt);
    this.fx.update(dt);
    if (this.level) this.hud.update(this, dt);
    this.renderer.render();
    this.input.endFrame();
  }

  updateWorld(dt) {
    this.level.update(dt);
  }

  startNewGame() {
    this.session = { levelIndex: 0, score: 0, lives: START_LIVES, best: this.session.best };
    this.loadLevel(0);
    this.states.set('intro', { title: LEVELS[0].title, sub: 'Get ready', seconds: 2.4 });
  }

  // Уровень создаётся заново: старый удаляется со сцены вместе с врагами и препятствиями
  loadLevel(index) {
    this.world.combat.reset();
    this.world.level?.dispose();
    this.session.levelIndex = index;
    this.world.level = new Level(this.world, LEVELS[index]);
    this.hud.setTitle(LEVELS[index].title);
  }

  // Гибель героя: минус жизнь, затем либо возрождение у чекпоинта, либо game over
  onHeroDeath(sm) {
    this.session.lives -= 1;
    if (this.session.lives <= 0) return sm.set('gameover');
    this.level.restoreCheckpoint();
    return sm.set('intro', { title: 'LIFE LOST', sub: `${this.session.lives} left`, seconds: 1.8 });
  }

  addScore(points) {
    this.session.score += points;
    this.session.best = Math.max(this.session.best, this.session.score);
  }

  saveBest() {
    storeBest(this.session.best);
  }

  // Колбэки от уровня
  onWaveStart() {
    this.hud.flash('FIGHT!', '', 0.9);
  }

  onWaveCleared(isBoss) {
    if (isBoss) this.hud.flash('BOSS DOWN', 'Head to the exit →', 2.4);
    else this.hud.flash('AREA CLEAR', 'Checkpoint saved', 1.4);
  }
}
