// Enemy entity: driven by the AI state machine, supports blocking, dodging,
// being grabbed/thrown, hit stun, knockdowns and death.

import * as THREE from 'three';
import { Entity } from './Entity.js';
import { ENEMY_ATTACKS } from '../combat/CombatSystem.js';
import { ENEMY_ARCHETYPES } from '../core/Constants.js';
import { EnemyAI } from '../ai/EnemyAI.js';
import { approach, randRange } from '../physics/Physics.js';

export class Enemy extends Entity {
  constructor(opts) {
    const archetype = opts.archetype || 'grunt';
    const cfg = ENEMY_ARCHETYPES[archetype] || ENEMY_ARCHETYPES.grunt;

    super({
      kind: 'enemy',
      faction: 'enemy',
      character: opts.character || archetype,
      x: opts.x ?? 0,
      z: opts.z ?? 0,
      facing: opts.facing ?? -1,
      health: Math.round((opts.health ?? cfg.health) * (opts.healthScale ?? 1)),
      halfWidth: archetype === 'brute' ? 0.62 : archetype === 'boss' ? 0.72 : 0.42,
      height: archetype === 'brute' ? 2.3 : archetype === 'boss' ? 2.6 : 1.85,
      halfDepth: archetype === 'brute' ? 0.55 : archetype === 'boss' ? 0.62 : 0.4,
    });

    this.archetype = archetype;
    this.config = cfg;
    this.isBoss = !!opts.isBoss;
    this.bossTitle = opts.bossTitle || cfg.name;
    this.scoreValue = Math.round(cfg.score * (opts.scoreScale ?? 1));
    this.hitStunMult = cfg.hitStunMult;
    this.mass = cfg.mass;

    this.attack = null;
    this.ai = null;
    this.world = opts.world;
    this.thrownHits = null;
    this.thrownBodyDamage = 0;
    this.deathFade = 0;
    this.spawnInvuln = 0;

    this.blinkWhenInvulnerable = false;
  }

  // -----------------------------------------------------------------------

  initAI(world) {
    this.world = world;
    this.ai = new EnemyAI(this, this.config, world);
  }

  canBeHit() {
    if (this.dead) return false;
    if (this.isThrownFlying) return false;
    if (this.invulnTimer > 0) return false;
    return true;
  }

  isBlocking(attacker) {
    if (!this.blocking) return false;
    // Only blocks attacks coming from the front.
    const dir = Math.sign(attacker.position.x - this.position.x) || 1;
    return dir === this.facing;
  }

  canBeGrabbed() {
    if (this.dead || this.isBoss) return false;
    if (this.isThrownFlying || this.grabbedBy) return false;
    if (this.downPhase !== null) return false;
    return true;
  }

  // -----------------------------------------------------------------------
  // grab / throw
  // -----------------------------------------------------------------------

  onGrabbed(hero) {
    this.grabbedBy = hero;
    this.blocking = false;
    this.stunTimer = 0;
    this.attack = null;
    this.velocity.set(0, 0, 0);
    this.knockVel.set(0, 0, 0);
    this.facing = -hero.facing; // face the hero holding him
    this.ai?.releaseToken();
    this.ai?.setState?.('wait');
    this.animator.play('held', { restart: true });
  }

  onReleased() {
    this.grabbedBy = null;
    this.stunTimer = Math.max(this.stunTimer, 0.35);
    this.animator.play('hurt');
  }

  onThrown(thrower, dir, speed, lift, bodyDamage) {
    this.grabbedBy = null;
    this.isThrownFlying = true;
    this.thrownBy = thrower;
    this.thrownHits = new Set();
    this.thrownBodyDamage = bodyDamage;
    this.knockVel.x = dir * speed;
    this.velocity.y = lift;
    this.facing = dir > 0 ? 1 : -1;
    this.grounded = false;
    this.animator.play('thrown', { restart: true });
    this.attack = null;
    this.downPhase = null;
    this.stunTimer = 0;
  }

  onThrownLand() {
    this.isThrownFlying = false;
    this.knockdown(1.1);
    this.takeDamage(4, { attacker: this.thrownBy, hitStun: 0.5, hitPoint: this.position.clone() });
  }

  // -----------------------------------------------------------------------

  startAttack(name) {
    const def = ENEMY_ATTACKS[name];
    if (!def) return false;
    this.attack = { name, def, elapsed: 0, spawned: false };

    const animName = name === 'quickJab' ? 'punch1'
      : name === 'swipe' ? 'punch1'
      : name === 'heavySwing' ? 'heavySwing'
      : name === 'bruteStomp' ? 'kick'
      : name === 'bossSlam' ? 'slam'
      : name === 'bossCharge' ? 'punch3'
      : name === 'bossPunch' ? 'punch3'
      : 'punch1';

    this.animator.play(animName, { restart: true });
    if (def.sound && this.world?.audio) this.world.audio[def.sound]?.();
    return true;
  }

  onHurtCommitted() {
    // Getting hurt interrupts whatever the enemy was doing.
    this.attack = null;
    this.blocking = false;
    // Always hand the attack token back so it can't leak.
    if (this.ai) {
      this.ai.queuedAttack = null;
      this.ai.releaseToken();
      if (this.ai.state === 'attack' || this.ai.state === 'wait' || this.ai.state === 'block' || this.ai.state === 'dodge') {
        this.ai.setState('approach');
      }
    }
    if (this.grabbedBy) {
      const hero = this.grabbedBy;
      if (hero.heldEnemy === this) hero.heldEnemy = null;
      this.grabbedBy = null;
    }
  }

  onKnockdown() {
    this.onHurtCommitted();
    this.animator.play('knockdown', { restart: true });
  }

  onDeath() {
    this.onHurtCommitted();
    this.animator.play('dead', { restart: true });
    this.deathFade = 0;
  }

  onLand() {
    if (this.isThrownFlying) {
      this.onThrownLand();
    } else {
      this.animator.play('land', { restart: true });
    }
  }

  // -----------------------------------------------------------------------
  // update
  // -----------------------------------------------------------------------

  update(dt, world) {
    this.moveVel.set(0, 0, 0);
    this.updateTimers(dt);
    this.root.visible = true;

    if (this.spawnInvuln > 0) this.spawnInvuln -= dt;

    if (this.dead) {
      this.updateDeath(dt);
    } else if (this.isThrownFlying) {
      this.updateThrownFlight(dt, world);
    } else if (this.grabbedBy) {
      // Held by the hero: the hero fully controls position, so skip physics.
      this.animator.play('held');
      this.animator.update(dt);
      this.applyVisuals();
      this.syncMesh();
      return;
    } else {
      this.updateAlive(dt, world);
    }

    this.updatePhysics(dt);
    this.animator.update(dt);
    this.applyVisuals();
    this.syncMesh();
  }

  updateDeath(dt) {
    this.deathFade += dt;
    if (this.deathFade > 1.1) {
      const k = Math.min(1, (this.deathFade - 1.1) / 1.0);
      this.sinkOffset = k * 1.2;
      for (const m of this.model.materials) {
        m.transparent = true;
        m.opacity = 1 - k;
      }
      if (k >= 1) this.requestRemoval();
    }
  }

  updateThrownFlight(dt, world) {
    // Collide with other enemies while flying.
    const myBox = this.bodyBox();
    for (const other of world.getEnemies()) {
      if (other === this || other.dead || other.isThrownFlying) continue;
      if (this.thrownHits.has(other)) continue;
      const ob = other.bodyBox();
      if (
        myBox.minX <= ob.maxX && myBox.maxX >= ob.minX &&
        myBox.minY <= ob.maxY && myBox.maxY >= ob.minY &&
        myBox.minZ <= ob.maxZ && myBox.maxZ >= ob.minZ
      ) {
        this.thrownHits.add(other);
        const dir = Math.sign(other.position.x - this.position.x) || this.facing;
        const result = other.takeDamage(this.thrownBodyDamage, {
          attacker: this.thrownBy,
          knockback: 9,
          lift: 5,
          hitStun: 0.5,
          knockdown: true,
          hitPoint: new THREE.Vector3(this.position.x, 1.2, this.position.z),
        });
        other.applyImpulse(dir * 9, 5);
        world.effects.hitSpark(new THREE.Vector3(this.position.x, 1.2, this.position.z), true);
        world.audio.hitHeavy();
        world.onThrownBodyHit?.(this.thrownBy, other, result);
      }
    }
  }

  updateAlive(dt, world) {
    // Invulnerability blink during spawn
    if (this.spawnInvuln > 0) {
      this.root.visible = Math.floor(this.time * 12) % 2 === 0;
    } else {
      this.root.visible = true;
    }

    // Knockdown -> lying -> getup chain
    const down = this.updateDownState(dt);
    if (this.justGotUp) {
      this.justGotUp = false;
      this.ai?.setState('approach');
      this.ai?.releaseToken();
    }
    if (down) {
      this.moveVel.set(0, 0, 0);
      return;
    }

    if (this.stunTimer > 0) {
      this.moveVel.set(0, 0, 0);
      this.animator.play('hurt');
      return;
    }

    // Attack progression
    if (this.attack) {
      const atk = this.attack;
      atk.elapsed += dt;
      const def = atk.def;

      if (def.lunge && atk.elapsed < def.windup + def.active) {
        this.moveVel.x = this.facing * def.lunge;
      } else {
        this.moveVel.x = 0;
      }

      if (!atk.spawned && atk.elapsed >= def.windup) {
        atk.spawned = true;
        world.combat.spawnHitbox({
          owner: this,
          def,
          duration: def.active,
          multiHit: !!def.multiHit,
          hitInterval: def.hitInterval ?? 0.15,
        });
        if (def.shockwave) {
          world.effects.shockwave(this.position, 0xffcc66);
          world.renderer?.addShake(0.55, 0.45);
          world.audio.slam?.();
        }
      }

      const total = def.windup + def.active + def.recovery;
      if (atk.elapsed >= total) {
        this.attack = null;
        this.ai?.finishAttack();
      }
      this.moveVel.z = 0;
      return;
    }

    // Let the AI drive.
    this.ai?.update(dt);
  }
}
