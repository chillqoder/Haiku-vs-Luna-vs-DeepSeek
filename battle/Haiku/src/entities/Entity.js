// Базовая сущность: позиция, физика (гравитация, прыжки, нокбэк), здоровье, таймеры,
// лежание на земле и визуальная модель. Герой, враги и босс наследуют этот класс.
import * as THREE from 'three';
import { GRAVITY, LANE_MIN, LANE_MAX, clamp } from '../physics/Physics.js';
import { buildHumanoid } from '../assets/Models.js';
import { Animator } from '../assets/Animator.js';
import { cached } from '../assets/Textures.js';

const shadowGeometry = () => cached('shadowCircle', () => new THREE.CircleGeometry(0.6, 16));

export class Entity {
  // world — общий контекст игры (scene, audio, fx, combat, input, level, hero)
  constructor(world, opts) {
    this.world = world;
    this.halfW = opts.halfW ?? 0.34;
    this.halfD = opts.halfD ?? 0.4;
    this.height = opts.height ?? 2.2;
    this.maxHealth = opts.maxHealth ?? 100;
    this.health = this.maxHealth;

    this.pos = new THREE.Vector3();
    this.vel = new THREE.Vector3();      // y — прыжки и подбрасывание
    this.moveVel = new THREE.Vector3();  // скорость от контроллера (игрок или ИИ)
    this.knockVel = new THREE.Vector3(); // скорость от ударов, затухает со временем
    this.facing = 1;
    this.onGround = true;

    this.alive = true;
    this.dying = false;
    this.deathTimer = 0;
    this.hitstun = 0;     // секунды оцепенения после удара
    this.invuln = 0;      // кадры неуязвимости (секунды)
    this.down = false;    // лежит на земле
    this.downTimer = 0;
    this.lie = 0;         // 0 — стоит, 1 — лежит (плавный переход)
    this.flashTimer = 0;  // подсветка при ударе
    this.guarding = false;
    this.armor = false;   // суперброня: лёгкие удары не отбрасывают
    this.grabbedBy = null;
    this.spin = 0;        // поворот тела вокруг вертикальной оси (спин-кик)
    this.shadowSize = opts.shadowSize ?? 1;

    this.action = null;   // имя текущего действия для анимации
    this.actionT = 0;     // прогресс действия 0..1
    this.actionTime = 0;
    this.actionDur = 0;

    this.model = buildHumanoid(opts.look);
    this.anim = new Animator(this.model.rig);
    world.scene.add(this.model.root);

    this.shadow = new THREE.Mesh(
      shadowGeometry(),
      new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.35, depthWrite: false }),
    );
    this.shadow.rotation.x = -Math.PI / 2;
    world.scene.add(this.shadow);
  }

  // Коробка для коллизий: центр по высоте и полуразмеры
  get box() {
    return { x: this.pos.x, y: this.pos.y + this.height / 2, z: this.pos.z, hw: this.halfW, hh: this.height / 2, hd: this.halfD };
  }

  faceTo(x) {
    if (Math.abs(x - this.pos.x) > 0.05) this.facing = Math.sign(x - this.pos.x);
  }

  // Интеграция движения: горизонталь (контроллер + нокбэк), вертикаль (гравитация)
  integrate(dt) {
    this.pos.x += (this.moveVel.x + this.knockVel.x) * dt;
    this.pos.z = clamp(this.pos.z + this.moveVel.z * dt, LANE_MIN, LANE_MAX);
    this.knockVel.x *= Math.exp(-dt * 7);
    if (Math.abs(this.knockVel.x) < 0.01) this.knockVel.x = 0;

    if (!this.onGround || this.vel.y > 0) {
      this.onGround = false;
      this.vel.y += GRAVITY * dt;
      this.pos.y += this.vel.y * dt;
      if (this.pos.y <= 0) {
        const impact = -this.vel.y;
        this.pos.y = 0;
        this.vel.y = 0;
        this.onGround = true;
        if (impact > 4) this.onLand(impact);
      }
    }
  }

  onLand() {
    this.world.fx.dust(this.pos.x, this.pos.z);
    this.world.audio.play('land');
  }

  jump(speed) {
    this.vel.y = speed;
    this.onGround = false;
  }

  stun(seconds) {
    this.hitstun = Math.max(this.hitstun, seconds);
  }

  // Подбрасывание и падение: сущность лежит, пока не истечёт downTimer на земле
  knockDown(lift = 5) {
    this.down = true;
    this.downTimer = 0.9;
    this.action = null;
    this.jump(lift);
  }

  die() {
    if (!this.alive) return;
    this.alive = false;
    this.dying = true;
    this.health = 0;
    this.down = true;
    this.downTimer = 999;
    this.guarding = false;
  }

  setAction(name, duration) {
    this.action = name;
    this.actionDur = duration;
    this.actionTime = 0;
    this.actionT = 0;
  }

  advanceAction(dt) {
    if (!this.action) return;
    this.actionTime += dt;
    this.actionT = Math.min(1, this.actionTime / this.actionDur);
    if (this.actionTime >= this.actionDur) this.action = null;
  }

  tickTimers(dt) {
    this.hitstun = Math.max(0, this.hitstun - dt);
    this.invuln = Math.max(0, this.invuln - dt);
    this.flashTimer = Math.max(0, this.flashTimer - dt);
    if (this.alive && this.down && this.onGround) {
      this.downTimer -= dt;
      if (this.downTimer <= 0) {
        this.down = false;
        this.invuln = Math.max(this.invuln, 0.6); // короткая неуязвимость после подъёма
      }
    }
  }

  // Общий визуал: позиция, падение, подсветка, тень и анимация
  updateVisuals(dt) {
    const { root, body, flash } = this.model;
    root.position.copy(this.pos);
    this.lie += ((this.down ? 1 : 0) - this.lie) * Math.min(1, dt * 10);
    root.rotation.set(0, this.facing > 0 ? 0 : Math.PI, this.lie * Math.PI / 2);
    body.rotation.y = this.spin;

    const glow = this.flashTimer > 0 ? 0.6 : 0;
    for (const m of flash) m.emissive.setRGB(glow, glow * 0.4, glow * 0.2);

    const s = Math.max(0.3, 1 - this.pos.y * 0.25) * this.shadowSize;
    this.shadow.position.set(this.pos.x, 0.01, this.pos.z);
    this.shadow.scale.set(s * (1 + this.lie), s, 1);

    this.anim.update(dt, {
      speed: Math.hypot(this.moveVel.x, this.moveVel.z),
      airborne: !this.onGround,
      vy: this.vel.y,
      stunned: this.hitstun > 0 && !this.armor,
      down: this.down,
      action: this.action,
      actionT: this.actionT,
    });
  }

  dispose() {
    this.world.scene.remove(this.model.root, this.shadow);
    this.model.root.traverse((o) => o.material?.dispose());
    this.shadow.material.dispose();
  }
}
