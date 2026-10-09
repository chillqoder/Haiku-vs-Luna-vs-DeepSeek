// Герой: управление, комбо из трёх ударов, удар ногой, спин-кик (special), захват и бросок,
// здоровье. Жизни и счёт ведёт Game — герой только знает, жив он или нет.
import { Entity } from './Entity.js';

const WALK_SPEED = 3.6;
const LANE_SPEED = 2.4;
const JUMP_SPEED = 10;
const SPECIAL_COOLDOWN = 3.5;
const GRAB_RANGE = 1.1;
const GRAB_TIME = 3.0;
const BUFFER_TIME = 0.15; // нажатие «запоминается» на это время — удобнее для комбо

// Описания ударов: time — длительность анимации, delay/active — окно активного хитбокса
const PUNCH_1 = {
  anim: 'punchNear', time: 0.32, delay: 0.09, active: 0.12,
  damage: 8, ox: 0.72, oy: 1.2, hw: 0.5, hh: 0.4, hd: 0.6, knockX: 1.2, hitstun: 0.22, sound: 'punch',
};
const PUNCH_2 = {
  anim: 'punchFar', time: 0.34, delay: 0.1, active: 0.12,
  damage: 10, ox: 0.72, oy: 1.25, hw: 0.5, hh: 0.4, hd: 0.6, knockX: 1.6, hitstun: 0.25, sound: 'punch',
};
const FINISHER = {
  anim: 'kick', time: 0.46, delay: 0.2, active: 0.14,
  damage: 16, ox: 0.85, oy: 0.85, hw: 0.55, hh: 0.42, hd: 0.6, knockX: 4, lift: 3.5, knockdown: true, hitstun: 0.5, sound: 'heavy',
};
const KICK = {
  anim: 'kick', time: 0.42, delay: 0.18, active: 0.14,
  damage: 12, ox: 0.85, oy: 0.8, hw: 0.55, hh: 0.4, hd: 0.6, knockX: 2.8, hitstun: 0.35, sound: 'kick',
};
const SPECIAL = {
  anim: 'special', time: 0.8, delay: 0.05, active: 0.5,
  damage: 14, ox: 0, oy: 1.1, hw: 1.8, hh: 1.2, hd: 1.3, centered: true,
  knockX: 2.5, lift: 2, knockdown: true, hitstun: 0.4, sound: 'kick',
};
const THROW = { damage: 16, knockX: 7, lift: 5, knockdown: true };

export class Hero extends Entity {
  constructor(world) {
    super(world, {
      halfW: 0.34,
      halfD: 0.4,
      height: 2.4,
      maxHealth: 100,
      shadowSize: 1.1,
      look: {
        jacket: 0x1fb6c8, pants: 0x1d2b4a, skin: 0xe0b48c, hair: 0x1b1b2e, spiky: true,
        headband: 0xe63946, scarf: 0xe63946, belt: 0xff8c1a, gloves: 0xf5f5f5, shoes: 0x2a1a10,
      },
    });
    this.comboStep = 0;
    this.comboTimer = 0;
    this.attackBuffer = 0;
    this.kickBuffer = 0;
    this.specialBuffer = 0;
    this.jumpBuffer = 0;
    this.specialCooldown = 0;
    this.specialMax = SPECIAL_COOLDOWN;
    this.spinTimer = 0;
    this.spinAngle = 0;
    this.grabTarget = null;
    this.grabTimer = 0;
    this.blinkTimer = 0;
  }

  get specialReady() {
    return this.specialCooldown <= 0;
  }

  // Возрождение в точке чекпоинта: полное здоровье и короткая неуязвимость
  respawn(x, z) {
    this.releaseGrab();
    this.pos.set(x, 0, z);
    this.vel.set(0, 0, 0);
    this.moveVel.set(0, 0, 0);
    this.knockVel.set(0, 0, 0);
    this.health = this.maxHealth;
    this.alive = true;
    this.dying = false;
    this.deathTimer = 0;
    this.down = false;
    this.downTimer = 0;
    this.lie = 0;
    this.hitstun = 0;
    this.invuln = 2;
    this.action = null;
    this.spin = 0;
    this.spinTimer = 0;
    this.onGround = true;
    this.facing = 1;
    this.flashTimer = 0;
  }

  heal(amount) {
    this.health = Math.min(this.maxHealth, this.health + amount);
  }

  die() {
    super.die();
    this.releaseGrab();
    this.action = null;
    this.spinTimer = 0;
    this.spin = 0;
  }

  update(dt) {
    const { input, acceptInput } = this.world;
    const active = acceptInput && !this.dying;
    this.tickTimers(dt);
    this.blinkTimer += dt;
    this.specialCooldown = Math.max(0, this.specialCooldown - dt);
    this.comboTimer = Math.max(0, this.comboTimer - dt);
    if (this.comboTimer <= 0) this.comboStep = 0;
    this.attackBuffer = Math.max(0, this.attackBuffer - dt);
    this.kickBuffer = Math.max(0, this.kickBuffer - dt);
    this.specialBuffer = Math.max(0, this.specialBuffer - dt);
    this.jumpBuffer = Math.max(0, this.jumpBuffer - dt);

    if (active) {
      if (input.wasPressed('attack')) this.attackBuffer = BUFFER_TIME;
      if (input.wasPressed('kick')) this.kickBuffer = BUFFER_TIME;
      if (input.wasPressed('special')) this.specialBuffer = BUFFER_TIME;
      if (input.wasPressed('jump')) this.jumpBuffer = BUFFER_TIME;
      if (input.wasPressed('grab')) this.toggleGrab();
    }

    const canAct = active && this.hitstun <= 0 && !this.down;
    if (canAct) this.handleActions();

    // Движение: во время действия герой стоит на месте, с захватом — идёт медленнее
    if (canAct && (!this.action || this.grabTarget)) {
      const speedMul = this.grabTarget ? 0.6 : 1;
      this.moveVel.x = input.axisX() * WALK_SPEED * speedMul;
      this.moveVel.z = input.axisLane() * LANE_SPEED * speedMul;
      if (Math.abs(input.axisX()) > 0.1) this.facing = input.axisX() > 0 ? 1 : -1;
    } else {
      this.moveVel.set(0, 0, 0);
    }

    if (this.spinTimer > 0) {
      this.spinTimer -= dt;
      this.spinAngle += dt * 12;
      this.spin = this.spinAngle;
      this.invuln = Math.max(this.invuln, 0.1); // во время спина героя не бьют
      if (this.spinTimer <= 0) {
        this.spin = 0;
        this.spinAngle = 0;
      }
    }

    if (this.hitstun > 0) this.releaseGrab();
    if (this.grabTarget) {
      this.grabTimer -= dt;
      if (this.grabTimer <= 0 || !this.grabTarget.alive) this.releaseGrab();
    }

    this.advanceAction(dt);
    this.integrate(dt);
    if (this.grabTarget) this.holdGrabbed();
    this.updateVisuals(dt);
    this.model.root.visible = this.invuln <= 0 || Math.floor(this.blinkTimer * 12) % 2 === 0;
  }

  // Без движения герой разворачивается к ближайшему врагу, чтобы удар не ушёл в пустоту
  faceNearbyEnemy() {
    if (Math.abs(this.world.input.axisX()) > 0.1) return;
    let best = null;
    let bestDist = 1.4;
    for (const enemy of this.world.level.enemies) {
      if (!enemy.alive || enemy.dying || enemy.grabbedBy) continue;
      const dist = Math.abs(enemy.pos.x - this.pos.x);
      if (dist < bestDist && Math.abs(enemy.pos.z - this.pos.z) < 0.9) {
        best = enemy;
        bestDist = dist;
      }
    }
    if (best && Math.abs(best.pos.x - this.pos.x) > 0.05) this.facing = Math.sign(best.pos.x - this.pos.x);
  }

  // Приоритеты: спин > бросок > удар/комбо > ногой > прыжок
  handleActions() {
    if (this.attackBuffer > 0 || this.kickBuffer > 0 || this.specialBuffer > 0) this.faceNearbyEnemy();
    if (this.specialBuffer > 0 && this.specialReady && !this.grabTarget) {
      this.specialBuffer = 0;
      this.startSpecial();
      return;
    }
    if (this.grabTarget && this.attackBuffer > 0) {
      this.attackBuffer = 0;
      this.throwGrabbed();
      return;
    }
    if (this.attackBuffer > 0 && !this.grabTarget && (!this.action || this.actionT > 0.55)) {
      this.attackBuffer = 0;
      this.startPunch();
    }
    if (this.kickBuffer > 0 && !this.action) {
      this.kickBuffer = 0;
      this.comboTimer = 0;
      this.performMove(KICK);
    }
    if (this.jumpBuffer > 0 && this.onGround && !this.action && !this.grabTarget) {
      this.jumpBuffer = 0;
      this.jump(JUMP_SPEED);
      this.world.audio.play('jump');
    }
  }

  // Комбо: удар левой, удар правой, финальный удар ногой с падением противника
  startPunch() {
    const step = this.comboTimer > 0 ? (this.comboStep % 3) + 1 : 1;
    this.comboStep = step;
    const move = step === 1 ? PUNCH_1 : step === 2 ? PUNCH_2 : FINISHER;
    this.performMove(move);
    this.comboTimer = step === 3 ? 0 : move.time + 0.5;
  }

  performMove(move) {
    this.setAction(move.anim, move.time);
    this.knockVel.x += this.facing * 0.8; // небольшой выпад вперёд
    this.world.audio.play('swoosh');
    this.world.combat.spawnHitbox({
      owner: this,
      team: 'hero',
      damage: move.damage,
      ox: move.ox,
      oy: move.oy,
      hw: move.hw,
      hh: move.hh,
      hd: move.hd,
      centered: move.centered,
      delay: move.delay,
      duration: move.active,
      knockX: move.knockX,
      lift: move.lift,
      knockdown: move.knockdown,
      hitstun: move.hitstun,
      sound: move.sound,
    });
  }

  // Спин-кик: прыжок и вращение с круговым хитбоксом; герой неуязвим на время спина
  startSpecial() {
    this.specialCooldown = this.specialMax;
    this.spinTimer = SPECIAL.time;
    this.spinAngle = 0;
    if (this.onGround) this.jump(6);
    this.performMove(SPECIAL);
    this.world.audio.play('special');
    this.world.fx.emit(this.pos.x, 1.2, this.pos.z, 24, 0x7ff0ff, { speed: 5, life: 0.45 });
  }

  toggleGrab() {
    if (this.grabTarget) this.releaseGrab();
    else this.grabNearest();
  }

  // Захват: ближайший враг перед героем на той же полосе (боссов не хватаем)
  grabNearest() {
    let best = null;
    let bestDist = GRAB_RANGE;
    for (const enemy of this.world.level.enemies) {
      if (!enemy.alive || enemy.down || enemy.isBoss || enemy.grabbedBy) continue;
      const dx = (enemy.pos.x - this.pos.x) * this.facing;
      if (dx < -0.2 || dx > GRAB_RANGE) continue;
      if (Math.abs(enemy.pos.z - this.pos.z) > 0.8) continue;
      if (Math.abs(dx) < bestDist) {
        best = enemy;
        bestDist = Math.abs(dx);
      }
    }
    if (!best) return;
    this.grabTarget = best;
    best.grabbedBy = this;
    best.action = null;
    best.moveVel.set(0, 0, 0);
    best.knockVel.x = 0;
    this.grabTimer = GRAB_TIME;
    this.setAction('grab', 0.3);
    this.world.audio.play('select');
  }

  releaseGrab() {
    if (!this.grabTarget) return;
    this.grabTarget.grabbedBy = null;
    this.grabTarget.stun(0.3);
    this.grabTarget = null;
  }

  // Бросок: противник летит вперёд и сбивается с ног
  throwGrabbed() {
    const target = this.grabTarget;
    this.releaseGrab();
    this.setAction('throw', 0.35);
    this.world.audio.play('heavy');
    this.world.combat.damage(target, THROW.damage, {
      owner: this,
      knockX: THROW.knockX,
      lift: THROW.lift,
      knockdown: THROW.knockdown,
      sound: 'heavy',
    });
  }

  // Пойманный враг следует за героем перед ним
  holdGrabbed() {
    const t = this.grabTarget;
    t.pos.set(this.pos.x + this.facing * 0.8, 0, this.pos.z);
    t.onGround = true;
    t.vel.y = 0;
  }
}
