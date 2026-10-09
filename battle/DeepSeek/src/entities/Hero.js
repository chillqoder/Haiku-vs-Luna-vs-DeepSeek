// The playable hero: movement, combo attacks, kick, jump kick, grab/throw,
// special spin attack, hit reactions and death.

import * as THREE from 'three';
import { Entity } from './Entity.js';
import { HERO_ATTACKS } from '../combat/CombatSystem.js';
import { HERO_STATS, COMBAT } from '../core/Constants.js';
import { approach } from '../physics/Physics.js';

const A = HERO_ATTACKS;

export class Hero extends Entity {
  constructor(opts = {}) {
    super({
      kind: 'hero',
      faction: 'hero',
      character: 'hero',
      health: HERO_STATS.maxHealth,
      x: opts.x ?? 0,
      z: opts.z ?? 0,
      halfWidth: 0.42,
      height: 1.9,
      halfDepth: 0.42,
    });

    this.name = 'RAZE';
    this.energy = 0;
    this.maxEnergy = 100;
    this.lives = HERO_STATS.lives;

    this.moveSpeed = HERO_STATS.speed;
    this.depthSpeed = HERO_STATS.depthSpeed;
    this.jumpVelocity = HERO_STATS.jumpVelocity;
    // Longer i-frames for the player so groups of enemies can't chain-stun.
    this.hitInvulnTime = COMBAT.invulnTime;

    this.attack = null; // {name, def, elapsed, spawned}
    this.queuedAttack = null;
    this.comboIndex = 0;
    this.comboResetTimer = 0;

    this.heldEnemy = null;
    this.grabTimer = 0;

    this.specialActive = false;
    this.airAttacked = false;

    this.blinkWhenInvulnerable = true;

    this.onDeath = () => {
      this.clearAttack();
      this.releaseHeld(false);
      this.animator.play('dead');
    };

    this.isThrownFlying = false;
  }

  // -----------------------------------------------------------------------
  // helpers
  // -----------------------------------------------------------------------

  isControlled() {
    return true;
  }

  isBusy() {
    return this.attack !== null || this.stunTimer > 0 || this.downPhase !== null;
  }

  isAttacking() {
    return this.attack !== null;
  }

  canAct() {
    return !this.dead && !this.isBusy() && this.heldEnemy === null;
  }

  faceNearestEnemy(world, range = 3.5) {
    let best = null;
    let bestD = range;
    for (const e of world.getEnemies()) {
      if (e.dead) continue;
      const dx = e.position.x - this.position.x;
      const dz = Math.abs(e.position.z - this.position.z);
      if (dz > 1.4) continue;
      const d = Math.abs(dx);
      if (d < bestD) {
        bestD = d;
        best = e;
      }
    }
    if (best) this.facing = Math.sign(best.position.x - this.position.x) || this.facing;
  }

  addEnergy(amount) {
    this.energy = Math.min(this.maxEnergy, this.energy + amount);
  }

  // -----------------------------------------------------------------------
  // attacks
  // -----------------------------------------------------------------------

  startAttack(name, world, { force = false } = {}) {
    if (!force && (this.dead || this.stunTimer > 0 || this.downPhase !== null)) return false;
    const def = A[name];
    if (!def) return false;

    this.attack = { name, def, elapsed: 0, spawned: false };
    this.queuedAttack = null;
    this.blocking = false;

    const animName = name === 'punch1' ? 'punch1'
      : name === 'punch2' ? 'punch2'
      : name === 'punch3' ? 'punch3'
      : name === 'kick' ? 'kick'
      : name === 'jumpKick' ? 'jumpKick'
      : name === 'special' ? 'special'
      : name === 'grabPunch' ? 'grabPunch'
      : name === 'throw' ? 'throw'
      : 'punch1';

    this.animator.play(animName, { restart: true, params: { turns: 2 } });

    // The third punch restarts the chain after it lands.
    if (name === 'punch3') this.comboIndex = 0;

    if (name === 'special') {
      this.specialActive = true;
      this.invulnTimer = Math.max(this.invulnTimer, def.windup + def.active + def.recovery);
      this.energy -= COMBAT.heroSpecialCost;
      world.audio.special();
    } else if (def.sound) {
      world.audio[def.sound]?.();
    }
    return true;
  }

  // Start the next hit of the punch chain when the current one finishes.
  chainNext(world) {
    const name = this.queuedAttack;
    this.queuedAttack = null;
    if (name) this.startAttack(name, world);
    else {
      this.attack = null;
      this.comboIndex = 0;
    }
  }

  clearAttack() {
    this.attack = null;
    this.queuedAttack = null;
    this.specialActive = false;
  }

  onAttackFinished(world) {
    if (this.queuedAttack) {
      this.chainNext(world);
    } else {
      this.attack = null;
      this.comboResetTimer = 0.6;
    }
  }

  // -----------------------------------------------------------------------
  // grab & throw
  // -----------------------------------------------------------------------

  tryGrab(world) {
    if (this.heldEnemy) return;
    let best = null;
    let bestD = 1.75;
    for (const e of world.getEnemies()) {
      if (e.dead || !e.canBeGrabbed || !e.canBeGrabbed()) continue;
      const dx = e.position.x - this.position.x;
      const dz = Math.abs(e.position.z - this.position.z);
      if (dz > 1.0) continue;
      if (Math.sign(dx) !== this.facing && Math.abs(dx) > 0.55) continue;
      const d = Math.abs(dx);
      if (d < bestD) {
        bestD = d;
        best = e;
      }
    }
    if (!best) {
      // grab whiff: small stumble animation via punch-ish pose is overkill; skip
      return;
    }
    this.heldEnemy = best;
    this.grabTimer = 0;
    best.onGrabbed(this);
    this.animator.play('grab', { restart: true });
    world.audio.grab();
  }

  releaseHeld(playThrowAnim = false) {
    if (!this.heldEnemy) return;
    const e = this.heldEnemy;
    this.heldEnemy = null;
    e.onReleased();
    if (playThrowAnim) this.animator.play('throw', { restart: true });
  }

  throwHeld(world) {
    if (!this.heldEnemy) return false;
    const e = this.heldEnemy;
    const def = A.throw;

    this.heldEnemy = null;
    this.grabTimer = 0;
    this.animator.play('throw', { restart: true });

    const dir = this.facing;
    e.onThrown(this, dir, 12.5, 7.5, def.thrownBodyDamage);
    world.combat.requestHitStop('heavy');
    world.audio.throwWhoosh();
    world.audio.hitHeavy?.();
    world.effects.hitSpark(e.position.clone().setY(1.2), true);
    world.onHeroHit(e, def, e.position.clone(), { applied: def.damage, killed: false });
    return true;
  }

  // -----------------------------------------------------------------------

  onHurtCommitted() {
    this.clearAttack();
    this.releaseHeld(false);
  }

  onKnockdown() {
    this.clearAttack();
    this.releaseHeld(false);
    this.animator.play('knockdown', { restart: true });
  }

  // -----------------------------------------------------------------------
  // main update
  // -----------------------------------------------------------------------

  update(dt, world) {
    this.moveVel.set(0, 0, 0);
    this.updateTimers(dt);

    if (!this.dead) {
      this.updateLogic(dt, world);
    } else {
      this.updateDeath(dt, world);
    }

    this.updatePhysics(dt);
    this.animator.update(dt);
    this.applyVisuals();
    this.syncMesh();
  }

  updateDeath(dt, world) {
    this.fadeTimer += dt;
    if (this.fadeTimer > 1.6) {
      const k = Math.min(1, (this.fadeTimer - 1.6) / 1.2);
      this.sinkOffset = k * 0.8;
      for (const m of this.model.materials) {
        m.transparent = true;
        m.opacity = 1 - k;
      }
      if (k >= 1) this.deadAndGone = true;
    }
  }

  updateLogic(dt, world) {
    const input = world.input;

    // ---- timers ----
    if (this.comboResetTimer > 0) {
      this.comboResetTimer -= dt;
      if (this.comboResetTimer <= 0) this.comboIndex = 0;
    }

    // ---- states that lock control ----
    const down = this.updateDownState(dt);
    if (this.justGotUp) {
      this.justGotUp = false;
      this.comboIndex = 0;
    }
    if (down) {
      this.moveVel.set(0, 0, 0);
      return;
    }

    if (this.stunTimer > 0) {
      // hit stun: can't act
      this.moveVel.set(0, 0, 0);
      this.animator.play('hurt');
      return;
    }

    // ---- attack progression ----
    if (this.attack) {
      this.moveVel.set(0, 0, 0);
      this.updateAttack(dt, world);
      return;
    }

    if (this.heldEnemy) {
      this.moveVel.set(0, 0, 0);
      this.updateHolding(dt, world, input);
      return;
    }

    // ---- movement ----
    const ax = input.axis('left', 'right');
    const az = input.axis('up', 'down');

    // jump
    if (input.justPressed('jump') && this.grounded) {
      this.velocity.y = this.jumpVelocity;
      this.grounded = false;
      this.airAttacked = false;
      this.animator.play('jump', { restart: true });
      world.audio.jump();
    }

    if (this.grounded) {
      this.moveVel.set(ax * this.moveSpeed, 0, az * this.depthSpeed);
      if (ax !== 0) this.facing = ax > 0 ? 1 : -1;

      if (ax !== 0 || az !== 0) {
        const cadence = ax !== 0 ? 1.35 : 1.0;
        this.animator.setSpeedScale(cadence);
        this.animator.play('walk');
        if (Math.random() < 0.12) world.effects.dust(this.position, 1);
      } else {
        this.animator.setSpeedScale(1);
        this.animator.play('idle');
      }
    } else {
      // air control
      this.moveVel.x = approach(this.moveVel.x, ax * this.moveSpeed, 6, dt);
      this.moveVel.z = approach(this.moveVel.z, az * this.depthSpeed, 6, dt);
      if (this.velocity.y < -1) this.animator.play('fall');
    }

    if (ax !== 0) this.facing = ax > 0 ? 1 : -1;

    // ---- actions ----
    if (input.justPressed('punch')) {
      this.attackInput(world, 'punch');
    } else if (input.justPressed('kick')) {
      this.attackInput(world, 'kick');
    } else if (input.justPressed('grab')) {
      this.tryGrab(world);
    } else if (input.justPressed('special')) {
      if (this.energy >= COMBAT.heroSpecialCost) {
        this.faceNearestEnemy(world);
        this.startAttack('special', world);
      } else {
        world.audio.uiMove();
      }
    }
  }

  attackInput(world, type) {
    if (!this.grounded) {
      if (!this.airAttacked) {
        this.airAttacked = true;
        this.faceNearestEnemy(world);
        this.startAttack('jumpKick', world);
      }
      return;
    }
    this.faceNearestEnemy(world);
    if (type === 'punch') {
      const next = this.comboIndex === 0 ? 'punch1' : this.comboIndex === 1 ? 'punch2' : 'punch3';
      this.comboIndex = Math.min(2, this.comboIndex + 1);
      this.startAttack(next, world);
    } else {
      this.startAttack('kick', world);
    }
  }

  updateAttack(dt, world) {
    const atk = this.attack;
    atk.elapsed += dt;
    const def = atk.def;

    // spawn the hitbox once, during the active window
    if (!atk.spawned && atk.elapsed >= def.windup) {
      atk.spawned = true;
      if (!def.throwMove) {
        world.combat.spawnHitbox({
          owner: this,
          def,
          duration: def.active,
          multiHit: !!def.multiHit,
          hitInterval: def.hitInterval ?? 0.15,
        });
      }
    }

    // small forward lunge while the strike window is open
    if (def.lunge && atk.elapsed < def.windup + def.active) {
      this.moveVel.x = this.facing * def.lunge;
    }

    const total = def.windup + def.active + def.recovery;
    if (atk.elapsed >= total) {
      this.onAttackFinished(world);
    } else {
      // allow combo queueing during the attack
      const input = world.input;
      if (input.justPressed('punch') && !this.queuedAttack && !def.air) {
        if (atk.name === 'punch1') {
          this.queuedAttack = 'punch2';
          this.comboIndex = Math.min(2, this.comboIndex + 1);
        } else if (atk.name === 'punch2') {
          this.queuedAttack = 'punch3';
          this.comboIndex = Math.min(2, this.comboIndex + 1);
        }
      } else if (input.justPressed('kick') && !this.queuedAttack && !def.air && atk.name.startsWith('punch')) {
        this.queuedAttack = 'kick';
      }
    }
  }

  updateHolding(dt, world, input) {
    const e = this.heldEnemy;
    if (!e || e.dead) {
      this.releaseHeld(false);
      return;
    }
    this.grabTimer += dt;

    // position the held enemy in front
    const targetX = this.position.x + this.facing * 0.95;
    const targetZ = this.position.z;
    e.position.x = approach(e.position.x, targetX, 18, dt);
    e.position.z = approach(e.position.z, targetZ, 18, dt);
    e.position.y = 0.12;
    e.velocity.set(0, 0, 0);

    // enemy struggles free
    if (this.grabTimer > 2.8) {
      this.releaseHeld(false);
      e.applyImpulse(-this.facing * 2, 0);
      return;
    }

    if (input.justPressed('punch')) {
      this.startAttack('grabPunch', world);
      return;
    }
    if (input.justPressed('kick') || input.justPressed('grab')) {
      this.throwHeld(world);
      return;
    }
    if (input.justPressed('special') && this.energy >= COMBAT.heroSpecialCost) {
      this.releaseHeld(false);
      this.startAttack('special', world);
    }
  }

  onLand() {
    this.animator.play('land', { restart: true });
  }

  canBeGrabbed() {
    return false;
  }

  revive(x, z) {
    this.dead = false;
    this.deadAndGone = false;
    this.health = this.maxHealth;
    this.energy = 0;
    this.position.set(x, 0, z);
    this.velocity.set(0, 0, 0);
    this.clearAttack();
    this.releaseHeld(false);
    this.stunTimer = 0;
    this.downPhase = null;
    this.downTimer = 0;
    this.getupTimer = 0;
    this.invulnTimer = 1.5;
    this.fadeTimer = 0;
    this.sinkOffset = 0;
    this.root.visible = true;
    for (const m of this.model.materials) {
      m.transparent = false;
      m.opacity = 1;
    }
    this.animator.play('idle', { restart: true });
  }
}
