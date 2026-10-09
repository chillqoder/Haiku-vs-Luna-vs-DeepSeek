// Враг: модель, физика и ИИ. Поведение задаёт createEnemyAI, параметры — конфиг из enemyTypes.js.
import { Entity } from './Entity.js';
import { createEnemyAI } from '../ai/EnemyAI.js';
import { rand } from '../physics/Physics.js';

const BODY_HEIGHT = 2.4; // высота модели при масштабе 1

export class Enemy extends Entity {
  // def — конфиг врага; aggro — сразу преследует героя (враги из волны)
  constructor(world, def, x, z, { aggro = false } = {}) {
    const s = def.scale;
    super(world, {
      halfW: 0.34 * s,
      halfD: 0.4 * s,
      height: BODY_HEIGHT * s,
      maxHealth: def.hp,
      look: { ...def.look, scale: s },
      shadowSize: s,
    });
    this.def = def;
    this.armor = def.armor;
    this.pos.set(x, 0, z);
    this.spawnX = x;
    this.aggroed = aggro;
    this.laneOffset = rand(-1, 1);
    this.cooldown = rand(0.2, 0.8);
    this.reactCooldown = 0;
    this.aiTimer = 0;
    this.patrolDir = 1;
    this.retreatTime = 0;
    this.move = null;
    this.ai = createEnemyAI(this);
    this.ai.sm.set(aggro ? 'chase' : 'patrol');
  }

  // Видит героя: либо враг из волны, либо герой вошёл в зону агрессии
  canAggro() {
    const hero = this.world.hero;
    if (this.aggroed) return true;
    return Math.abs(hero.pos.x - this.pos.x) < this.def.aggro && Math.abs(hero.pos.z - this.pos.z) < 2.6;
  }

  // Атака начинается, когда герой в зоне удара (range — дистанция, с которой враг держится)
  canStartAttack(dx) {
    return Math.abs(dx) < this.def.range + 0.35;
  }

  // Ход для атаки или null, если сейчас подходящего хода нет
  chooseMove() {
    return this.def.attack;
  }

  // Активная фаза удара: создаёт хитбоксы владельца или снаряд
  performStrike() {
    const m = this.move;
    if (m.projectile) {
      this.world.level.spawnProjectile(this, m);
      return;
    }
    for (const delay of m.hits ?? [0]) {
      this.world.combat.spawnHitbox({
        owner: this,
        team: 'enemy',
        damage: m.damage,
        ox: m.ox,
        oy: m.oy,
        hw: m.hw,
        hh: m.hh,
        hd: m.hd,
        delay,
        duration: 0.12,
        knockX: m.knockX,
        lift: m.lift,
        knockdown: m.knockdown,
        hitstun: m.hitstun,
        sound: m.sound ?? 'punch',
      });
    }
  }

  die() {
    super.die();
    this.world.level.releaseToken(this);
  }

  update(dt) {
    this.tickTimers(dt);
    if (this.dying) {
      this.deathTimer += dt;
      if (this.deathTimer > 1.2) this.pos.y -= dt * 0.8; // уходит в землю перед удалением
    } else {
      this.ai.update(dt);
    }
    this.advanceAction(dt);
    if (!this.grabbedBy) this.integrate(dt);
    this.updateVisuals(dt);
  }
}
