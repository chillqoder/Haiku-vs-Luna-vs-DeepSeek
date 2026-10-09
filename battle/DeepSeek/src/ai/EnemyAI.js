// Enemy AI: behavior state machine + attack token manager so only a few
// enemies commit to attacks at once (classic crowd-fighting fairness).

import { ENEMY_ARCHETYPES } from '../core/Constants.js';

export class AttackTokenManager {
  constructor(max) {
    this.max = max;
    this.holders = new Set();
  }

  request(entity) {
    if (this.holders.has(entity)) return true;
    if (this.holders.size < this.max) {
      this.holders.add(entity);
      return true;
    }
    return false;
  }

  release(entity) {
    this.holders.delete(entity);
  }

  reset() {
    this.holders.clear();
  }

  get count() {
    return this.holders.size;
  }
}

const stateNames = [
  'spawn', 'approach', 'strafe', 'retreat', 'attack', 'block', 'dodge', 'wait',
];

export class EnemyAI {
  constructor(enemy, config, world) {
    this.enemy = enemy;
    this.config = config;
    this.world = world;
    this.state = 'spawn';
    this.stateTime = 0;
    this.thinkTimer = Math.random() * 0.3;
    this.attackCooldown = rand(config.attackCooldown);
    this.strafeDir = Math.random() < 0.5 ? -1 : 1;
    this.hasToken = false;
    this.queuedAttack = null;
    this.spawnTarget = null;
    this.bossPhase = 1;
    this.blockTimer = 0;
    this.actionLock = 0;
  }

  get hero() {
    return this.world.getHero();
  }

  setState(name) {
    if (this.state === name) return;
    // Return any held attack token when leaving the attack state.
    if (this.state === 'attack' && name !== 'attack') {
      this.world.attackTokens.release(this.enemy);
      this.hasToken = false;
    }
    this.state = name;
    this.stateTime = 0;
  }

  requestToken() {
    if (!this.config.needsToken) return true;
    const got = this.world.attackTokens.request(this.enemy);
    this.hasToken = got;
    return got;
  }

  releaseToken() {
    this.world.attackTokens.release(this.enemy);
    this.hasToken = false;
  }

  // Distance helpers
  distX(hero) {
    return Math.abs(hero.position.x - this.enemy.position.x);
  }

  distZ(hero) {
    return Math.abs(hero.position.z - this.enemy.position.z);
  }

  update(dt) {
    const e = this.enemy;
    const hero = this.hero;
    this.stateTime += dt;
    if (this.actionLock > 0) this.actionLock -= dt;
    if (this.attackCooldown > 0) this.attackCooldown -= dt;

    if (!hero || hero.dead) {
      e.moveVel.set(0, 0, 0);
      e.animator.play('idle');
      return;
    }

    // Boss phase logic
    if (e.isBoss) {
      const frac = e.health / e.maxHealth;
      const newPhase = frac > 0.66 ? 1 : frac > 0.33 ? 2 : 3;
      if (newPhase !== this.bossPhase) {
        this.bossPhase = newPhase;
        if (newPhase === 2) this.world.onBossPhase?.(e, 2);
        if (newPhase === 3) this.world.onBossPhase?.(e, 3);
      }
    }

    switch (this.state) {
      case 'spawn': this.updateSpawn(dt, hero); break;
      case 'approach': this.updateApproach(dt, hero); break;
      case 'strafe': this.updateStrafe(dt, hero); break;
      case 'retreat': this.updateRetreat(dt, hero); break;
      case 'attack': this.updateAttackState(dt, hero); break;
      case 'block': this.updateBlock(dt, hero); break;
      case 'dodge': this.updateDodge(dt, hero); break;
      default: this.updateWait(dt, hero); break;
    }
  }

  updateSpawn(dt, hero) {
    const e = this.enemy;
    // Walk toward a staging point near the hero.
    if (!this.spawnTarget) {
      this.spawnTarget = {
        x: hero.position.x - Math.sign(hero.position.x - e.position.x || 1) * (this.config.preferredDistance + 0.5),
        z: hero.position.z + (Math.random() - 0.5) * 2.5,
      };
    }
    const dx = this.spawnTarget.x - e.position.x;
    const dz = this.spawnTarget.z - e.position.z;
    const dist = Math.hypot(dx, dz);
    if (dist < 0.4 || this.stateTime > 6) {
      this.spawnTarget = null;
      this.setState('approach');
      return;
    }
    const spd = this.config.speed * 0.85;
    e.moveVel.x = (dx / dist) * spd;
    e.moveVel.z = (dz / dist) * spd;
    if (Math.abs(dx) > 0.15) e.facing = dx > 0 ? 1 : -1;
    e.animator.setSpeedScale(1.1);
    e.animator.play('walk');
  }

  updateApproach(dt, hero) {
    const e = this.enemy;
    const dx = hero.position.x - e.position.x;
    const dz = hero.position.z - e.position.z;
    const adx = Math.abs(dx);
    const adz = Math.abs(dz);
    const dist = Math.hypot(dx, dz);

    // Always roughly face the hero while engaging.
    if (adx > 0.05) e.facing = dx > 0 ? 1 : -1;

    // Reaction: block or dodge when the hero attacks nearby.
    this.think();
    if (this.state !== 'approach') return;

    if (this.actionLock > 0) {
      e.moveVel.set(0, 0, 0);
      return;
    }

    const preferred = this.config.preferredDistance;

    if (adhocShouldAttack(this, adx, adz, dist)) {
      if (this.requestToken()) {
        this.startAttack();
        return;
      }
    }

    // Movement: close in on the preferred ring around the hero.
    let mx = 0;
    let mz = 0;
    if (adx > preferred + 0.25) mx = Math.sign(dx);
    else if (adx < preferred - 0.4) mx = -Math.sign(dx);

    if (adz > 0.55) mz = Math.sign(dz) * 0.85;

    if (mx === 0 && mz === 0) {
      // In range but waiting for a token/cooldown: shuffle sideways.
      e.animator.play('idle');
      if (this.stateTime > 0.6 + Math.random() * 0.5) {
        this.strafeDir = Math.random() < 0.5 ? -1 : 1;
        this.setState('strafe');
      }
      return;
    }

    const spd = this.config.speed;
    const len = Math.hypot(mx, mz) || 1;
    e.moveVel.x = (mx / len) * spd;
    e.moveVel.z = (mz / len) * spd * 0.9;
    e.animator.setSpeedScale(1.15);
    e.animator.play('walk');
  }

  updateStrafe(dt, hero) {
    const e = this.enemy;
    const dx = hero.position.x - e.position.x;
    const dz = hero.position.z - e.position.z;
    const adx = Math.abs(dx);
    if (adx > 0.05) e.facing = dx > 0 ? 1 : -1;

    this.think();
    if (this.state !== 'strafe') return;
    if (this.actionLock > 0) {
      e.moveVel.set(0, 0, 0);
      return;
    }

    if (adhocShouldAttack(this, adx, Math.abs(dz), Math.hypot(dx, dz))) {
      if (this.requestToken()) {
        this.startAttack();
        return;
      }
    }

    const duration = 0.8 + Math.random() * 0.7;
    if (this.stateTime > duration) {
      this.setState('approach');
      return;
    }

    // Circle around the hero at a mid distance.
    const targetZ = hero.position.z + (dz >= 0 ? 1.6 : -1.6);
    const mz = Math.sign(targetZ - e.position.z);
    const mx = adx < 1.4 ? -Math.sign(dx) : adx > 2.6 ? Math.sign(dx) : 0;
    const spd = this.config.speed * 0.7;
    e.moveVel.x = mx * spd;
    e.moveVel.z = mz * spd * 0.8;
    if (mx === 0 && mz === 0) e.moveVel.x = this.strafeDir * spd * 0.6;
    e.animator.setSpeedScale(1.0);
    e.animator.play('walk');
  }

  updateRetreat(dt, hero) {
    const e = this.enemy;
    const dx = hero.position.x - e.position.x;
    if (Math.abs(dx) > 0.05) e.facing = dx > 0 ? 1 : -1;
    const away = -Math.sign(dx || 1);
    e.moveVel.x = away * this.config.speed * 0.8;
    e.moveVel.z = this.strafeDir * this.config.speed * 0.3;
    e.animator.play('walk');
    if (this.stateTime > 0.6 + Math.random() * 0.4) this.setState('approach');
  }

  updateWait(dt, hero) {
    this.enemy.moveVel.set(0, 0, 0);
    this.enemy.animator.play('idle');
    if (this.queuedAttack) {
      this.queuedAttack = null;
      // Token was already reserved in finishAttack().
      this.startAttack();
      return;
    }
    if (this.stateTime > 0.4) this.setState('approach');
  }

  updateBlock(dt, hero) {
    const e = this.enemy;
    e.moveVel.set(0, 0, 0);
    e.blocking = true;
    e.animator.play('guard');
    const dx = hero.position.x - e.position.x;
    if (Math.abs(dx) > 0.05) e.facing = dx > 0 ? 1 : -1;
    if (this.stateTime > this.blockTimer) {
      e.blocking = false;
      this.setState('approach');
      // Chance to counterattack right after a block.
      if (Math.random() < 0.35 && this.requestToken()) this.startAttack();
    }
  }

  updateDodge(dt, hero) {
    const e = this.enemy;
    const dx = hero.position.x - e.position.x;
    if (this.stateTime < 0.28) {
      // hop away and sideways
      e.moveVel.x = -Math.sign(dx || 1) * this.config.speed * 1.25;
      e.moveVel.z = this.strafeDir * this.config.speed * 0.8;
      if (e.grounded && this.stateTime < 0.05) {
        e.velocity.y = 6.5;
        e.grounded = false;
      }
      e.animator.play('jump', { restart: this.stateTime < 0.02 });
    } else {
      e.moveVel.set(0, 0, 0);
      e.animator.play('fall');
      if (this.stateTime > 0.5) this.setState('approach');
    }
  }

  updateAttackState(dt, hero) {
    const e = this.enemy;
    e.moveVel.set(0, 0, 0);
    if (!e.attack) {
      this.finishAttack();
      return;
    }
    // face the hero at the start of the attack
    if (e.attack.elapsed < 0.12) {
      const dx = hero.position.x - e.position.x;
      if (Math.abs(dx) > 0.05) e.facing = dx > 0 ? 1 : -1;
    }
  }

  startAttack(forcedName = null) {
    const e = this.enemy;
    const names = this.config.attackNames;
    let name = forcedName || names[Math.floor(Math.random() * names.length)];
    if (e.isBoss) {
      // Weighted selection by range for the boss.
      const hero = this.hero;
      const dist = Math.hypot(hero.position.x - e.position.x, hero.position.z - e.position.z);
      if (dist > 3.4) name = 'bossCharge';
      else if (dist < 1.9 && Math.random() < 0.55) name = 'bossSlam';
      else name = Math.random() < 0.5 ? 'bossPunch' : 'bossCharge';
    }
    e.startAttack(name);
    this.setState('attack');
  }

  finishAttack() {
    const e = this.enemy;
    this.releaseToken();
    this.attackCooldown = rand(this.config.attackCooldown) * (e.isBoss ? (1 - (this.bossPhase - 1) * 0.18) : 1);

    // Occasionally chain a follow-up attack.
    if (Math.random() < this.config.comboChance) {
      this.queuedAttack = true;
      this.setState('wait'); // releases any token still held by 'attack'
      if (!this.requestToken()) {
        this.queuedAttack = false;
        this.setState('approach');
      }
      return;
    }

    // Brutes and boss sometimes step back after heavy attacks.
    if ((e.isBoss && Math.random() < 0.25) || (e.archetype === 'brute' && Math.random() < 0.3)) {
      this.setState('retreat');
    } else {
      this.setState('approach');
    }
  }

  // Reaction check: decide to block or dodge based on hero's current attack.
  think() {
    const e = this.enemy;
    const hero = this.hero;
    if (e.isBoss && hero.attack) {
      // bosses block less, dodge smarter
    }
    if (!hero || !hero.attack) return;
    const dx = Math.abs(hero.position.x - e.position.x);
    const dz = Math.abs(hero.position.z - e.position.z);
    if (dx > 2.6 || dz > 1.2) return;
    const def = hero.attack.def;
    if (def.air) return; // can't block jump attacks
    if (e.attack) return; // already commited
    if (this.state === 'attack' || this.state === 'block' || this.state === 'dodge') return;

    // Face the incoming attack.
    e.facing = Math.sign(hero.position.x - e.position.x) || e.facing;

    const roll = Math.random();
    if (roll < this.config.dodgeChance) {
      e.invulnTimer = Math.max(e.invulnTimer, 0.4);
      this.setState('dodge');
      this.world.audio?.uiMove?.();
      return;
    }
    if (roll < this.config.dodgeChance + this.config.blockChance) {
      this.blockTimer = 0.55 + Math.random() * 0.35;
      this.setState('block');
      return;
    }
  }
}

function adhocShouldAttack(ai, adx, adz, dist) {
  const e = ai.enemy;
  const cfg = ai.config;
  if (ai.actionLock > 0) return false;
  if (ai.attackCooldown > 0) return false;
  if (e.stunTimer > 0 || e.downPhase !== null) return false;
  const zOk = adz < 0.75;
  const xOk = adx < cfg.attackRange + 0.35;
  if (!zOk || !xOk) return false;
  // Extra hesitation for non-boss enemies
  if (!e.isBoss && Math.random() < 0.35) return false;
  return true;
}

function rand(range) {
  if (!range) return 1;
  if (typeof range === 'number') return range;
  return range[0] + Math.random() * (range[1] - range[0]);
}
