// ИИ врагов и боссов: конечный автомат.
// Состояния: patrol (патруль), chase (преследование), windup (замах), strike (удар),
// recover (восстановление), retreat (отступление), block (блок), dodge (уклонение),
// stun (оцепенение), down (лежит), dead.
// Атаковать одновременно может только ограниченное число врагов (токены уровня),
// остальные держат дистанцию и ждут — так бой выглядит групповым, а не «все разом».
import { StateMachine } from '../core/StateMachine.js';
import { LANE_MIN, LANE_MAX, clamp, rand } from '../physics/Physics.js';

const REACT_RANGE = 2.2; // на такой дистанции враг реагирует на атаку героя

export function createEnemyAI(enemy) {
  const sm = new StateMachine(enemy);

  sm.add('patrol', {
    enter() {
      this.aiTimer = rand(1.0, 2.0);
      this.patrolDir = Math.random() < 0.5 ? -1 : 1;
    },
    update(dt, sm) {
      if (this.canAggro()) return sm.set('chase');
      this.cooldown = Math.max(0, this.cooldown - dt);
      this.aiTimer -= dt;
      if (this.aiTimer <= 0) {
        this.aiTimer = rand(1.0, 2.0);
        this.patrolDir = -this.patrolDir;
      }
      // Бродит вокруг точки появления, не уходя слишком далеко
      const drift = this.spawnX - this.pos.x;
      const dir = Math.abs(drift) > 2.2 ? Math.sign(drift) : this.patrolDir;
      this.moveVel.set(dir * this.def.speed * 0.4, 0, 0);
      this.faceTo(this.pos.x + dir);
    },
  });

  sm.add('chase', {
    update(dt, sm) {
      const hero = this.world.hero;
      const dx = hero.pos.x - this.pos.x;
      const dz = hero.pos.z - this.pos.z;
      this.faceTo(hero.pos.x);
      this.cooldown = Math.max(0, this.cooldown - dt);
      this.reactCooldown = Math.max(0, this.reactCooldown - dt);

      // Реакция на атаку героя рядом: блок (брут) или уклонение (быстрый враг)
      if (this.reactCooldown <= 0 && hero.action && hero.action !== 'grab' && Math.abs(dx) < REACT_RANGE) {
        this.reactCooldown = 0.8;
        if (this.def.dodge && Math.random() < 0.45) return sm.set('dodge');
        if (this.def.block && Math.random() < 0.5) return sm.set('block');
      }

      // Держим дистанцию range со своей стороны от героя, на собственной полосе
      const side = dx >= 0 ? -1 : 1;
      const targetX = hero.pos.x + side * this.def.range;
      const targetZ = clamp(hero.pos.z + this.laneOffset, LANE_MIN, LANE_MAX);
      const speed = this.def.speed;
      const vx = clamp((targetX - this.pos.x) * 3, -speed, speed);
      const vz = clamp((targetZ - this.pos.z) * 3, -speed * 0.7, speed * 0.7);
      this.moveVel.set(Math.abs(targetX - this.pos.x) > 0.12 ? vx : 0, 0, vz);

      if (Math.abs(dz) < 0.75 && this.cooldown <= 0 && this.canStartAttack(dx) && this.world.level.acquireToken(this)) {
        const move = this.chooseMove();
        if (move) {
          this.move = move;
          return sm.set('windup');
        }
        this.world.level.releaseToken(this);
      }
    },
  });

  sm.add('windup', {
    enter() {
      this.moveVel.set(0, 0, 0);
      this.setAction('windup', this.move.windup);
    },
    update(dt, sm) {
      this.faceTo(this.world.hero.pos.x);
      this.moveVel.set(0, 0, 0);
      if (sm.time >= this.move.windup) sm.set('strike');
    },
  });

  sm.add('strike', {
    enter() {
      this.setAction(this.move.anim, this.move.strike);
      this.performStrike();
    },
    update(dt, sm) {
      // Рывок (dash) только во время удара: толкает врага вперёд
      this.moveVel.set(this.move.dash ? this.facing * this.move.dash : 0, 0, 0);
      if (sm.time >= this.move.strike) sm.set('recover');
    },
    exit() {
      this.moveVel.set(0, 0, 0);
    },
  });

  sm.add('recover', {
    enter() {
      this.action = null;
      this.moveVel.set(0, 0, 0);
      this.world.level.releaseToken(this);
      const [min, max] = this.def.cooldown;
      this.cooldown = rand(min, max);
    },
    update(dt, sm) {
      this.faceTo(this.world.hero.pos.x);
      if (sm.time < this.move.recover) return;
      const hurt = this.health < this.maxHealth * 0.3;
      if (Math.random() < (hurt ? 0.7 : 0.3)) sm.set('retreat');
      else sm.set('chase');
    },
  });

  sm.add('retreat', {
    enter() {
      this.retreatTime = rand(0.6, 1.0);
    },
    update(dt, sm) {
      const hero = this.world.hero;
      this.faceTo(hero.pos.x);
      const away = -Math.sign(hero.pos.x - this.pos.x || 1);
      this.moveVel.set(away * this.def.speed * 0.9, 0, 0);
      if (sm.time >= this.retreatTime) sm.set('chase');
    },
    exit() {
      this.moveVel.set(0, 0, 0);
    },
  });

  sm.add('block', {
    enter() {
      this.guarding = true;
      this.moveVel.set(0, 0, 0);
      this.setAction('guard', 0.55);
    },
    update(dt, sm) {
      this.faceTo(this.world.hero.pos.x);
      if (sm.time >= 0.55) sm.set('chase');
    },
    exit() {
      this.guarding = false;
      this.action = null;
    },
  });

  sm.add('dodge', {
    enter() {
      const hero = this.world.hero;
      const side = hero.pos.z >= this.pos.z ? -1 : 1; // уходим от героя по глубине
      this.invuln = 0.3;
      this.moveVel.set(0, 0, side * 3.5);
    },
    update(dt, sm) {
      if (sm.time >= 0.28) sm.set('chase');
    },
    exit() {
      this.moveVel.set(0, 0, 0);
    },
  });

  sm.add('stun', {
    enter() {
      this.action = null;
      this.moveVel.set(0, 0, 0);
      this.world.level.releaseToken(this);
      this.cooldown = Math.max(this.cooldown, 0.4);
    },
    update(dt, sm) {
      if (this.hitstun <= 0) sm.set('chase');
    },
  });

  sm.add('down', {
    enter() {
      this.action = null;
      this.moveVel.set(0, 0, 0);
      this.world.level.releaseToken(this);
    },
    update(dt, sm) {
      if (this.alive && !this.down) sm.set('chase');
    },
  });

  return {
    sm,
    update(dt) {
      if (!this.enemy.alive) return;
      if (this.enemy.grabbedBy) return;
      if (this.enemy.down) {
        if (sm.name !== 'down') sm.set('down');
      } else if (this.enemy.hitstun > 0 && !this.enemy.armor) {
        if (sm.name !== 'stun') sm.set('stun');
      }
      sm.update(dt);
    },
    enemy: enemy,
  };
}
