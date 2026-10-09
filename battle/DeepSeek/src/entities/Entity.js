// Base entity: physics, health, hit reactions, animation hookup.

import * as THREE from 'three';
import { Animator } from '../anim/Animator.js';
import { buildCharacter } from '../assets/ModelFactory.js';
import { boxFromFeet, integrate, clampToLane, approach } from '../physics/Physics.js';
import { PHYSICS } from '../core/Constants.js';

export class Entity {
  constructor(opts) {
    this.kind = opts.kind || 'entity';
    this.faction = opts.faction || 'neutral';
    this.model = buildCharacter(opts.character || 'grunt', opts.modelOverrides || {});
    this.root = this.model.root;
    this.animator = new Animator(this.model);

    this.position = new THREE.Vector3(opts.x || 0, opts.y || 0, opts.z || 0);
    this.velocity = new THREE.Vector3(); // vertical + legacy
    this.moveVel = new THREE.Vector3(); // intentional movement (per frame)
    this.knockVel = new THREE.Vector3(); // knockback that decays
    this.facing = opts.facing ?? 1;

    this.maxHealth = opts.health ?? 30;
    this.health = this.maxHealth;
    this.dead = false;
    this.grounded = true;

    this.halfWidth = opts.halfWidth ?? 0.45;
    this.height = opts.height ?? 1.9;
    this.halfDepth = opts.halfDepth ?? 0.42;

    this.time = 0; // local clock used by combat dedup
    this.stunTimer = 0;
    this.invulnTimer = 0;
    this.flashTimer = 0;
    this.downPhase = null; // null | 'fall' | 'lie' | 'getup'
    this.downTimer = 0;
    this.lieDuration = 0.6;
    this.getupTimer = 0;
    this.justGotUp = false;
    this.fadeTimer = 0;
    this.sinkOffset = 0;
    // Brief i-frames after any hit; hero and bosses override this.
    this.hitInvulnTime = 0.12;
    this.widthScale = this.model.root.scale.x || 1;

    this.removed = false;
    this.blocking = false;

    this._emissiveBase = [];
    for (const m of this.model.materials) {
      this._emissiveBase.push(m.emissive ? m.emissive.getHex() : 0x000000);
    }

    this.syncMesh();
  }

  // ---- physics helpers -------------------------------------------------

  hurtBox() {
    const h = this.downPhase === 'fall' || this.downPhase === 'lie' ? 0.55 : this.height;
    return boxFromFeet(this.position, this.halfWidth, h, this.halfDepth);
  }

  bodyBox() {
    const down = this.downPhase === 'fall' || this.downPhase === 'lie';
    return boxFromFeet(this.position, this.halfWidth, down ? 0.5 : this.height, this.halfDepth);
  }

  applyImpulse(x, lift = 0) {
    this.knockVel.x += x;
    if (lift > 0 && this.grounded) this.velocity.y = Math.max(this.velocity.y, lift);
  }

  canBeHit() {
    return !this.dead && this.invulnTimer <= 0;
  }

  isBlocking(attacker) {
    return false;
  }

  // ---- damage ----------------------------------------------------------

  takeDamage(amount, opts = {}) {
    if (this.dead) return { applied: 0, killed: false };
    const dmg = Math.max(0, Math.round(amount));
    this.health = Math.max(0, this.health - dmg);
    this.flashTimer = 0.1;
    this.invulnTimer = Math.max(this.invulnTimer, this.hitInvulnTime);

    const killed = this.health <= 0;
    if (killed) {
      this.die(opts);
    } else if (opts.knockdown || (opts.lift && opts.lift > 3)) {
      this.knockdown(opts.hitStun ?? 0.5);
    } else {
      this.stunTimer = Math.max(this.stunTimer, opts.hitStun ?? 0.3);
      this.stunFrom = opts.attacker;
      if (!opts.blocked) this.onHurtCommitted?.();
    }
    return { applied: dmg, killed };
  }

  knockdown(duration = 0.6) {
    this.downPhase = 'fall';
    this.downTimer = 0.5; // length of the fall animation
    this.lieDuration = Math.max(0.4, duration);
    this.stunTimer = 0;
    this.blocking = false;
    // Downed entities can't be hit while getting up.
    this.invulnTimer = Math.max(this.invulnTimer, 0.5 + this.lieDuration + 0.6);
    this.onKnockdown?.();
  }

  // Sequential down flow: fall -> lie -> getup. Returns true while control is locked.
  updateDownState(dt) {
    if (this.downPhase === 'fall') {
      this.downTimer -= dt;
      if (this.downTimer <= 0) {
        this.downPhase = 'lie';
        this.downTimer = this.lieDuration;
      }
      return true;
    }
    if (this.downPhase === 'lie') {
      this.downTimer -= dt;
      if (this.downTimer <= 0) {
        this.downPhase = 'getup';
        this.getupTimer = 0.55;
        this.invulnTimer = Math.max(this.invulnTimer, 1.0);
        this.animator.play('getup', { restart: true });
      }
      return true;
    }
    if (this.downPhase === 'getup') {
      this.getupTimer -= dt;
      if (this.getupTimer <= 0) {
        this.getupTimer = 0;
        this.downPhase = null;
        this.justGotUp = true;
      }
      return true;
    }
    return false;
  }

  die(opts) {
    this.dead = true;
    this.stunTimer = 0;
    this.downPhase = null;
    this.onDeath?.(opts);
  }

  // ---- frame update ----------------------------------------------------

  updatePhysics(dt) {
    const landed = integrate(this, dt);
    this.grounded = this.position.y <= PHYSICS.groundY + 0.001;
    clampToLane(this);
    if (landed) {
      this.onLand?.();
    }
    return landed;
  }

  updateTimers(dt) {
    this.time += dt;
    if (this.stunTimer > 0) this.stunTimer = Math.max(0, this.stunTimer - dt);
    if (this.invulnTimer > 0) this.invulnTimer = Math.max(0, this.invulnTimer - dt);
    if (this.flashTimer > 0) this.flashTimer = Math.max(0, this.flashTimer - dt);
  }

  syncMesh() {
    this.root.position.copy(this.position);
    if (this.sinkOffset) this.root.position.y -= this.sinkOffset;
    this.root.rotation.y = this.facing > 0 ? 0 : Math.PI;
  }

  applyVisuals() {
    // flash
    const flash = this.flashTimer > 0 ? 0.85 : 0;
    for (let i = 0; i < this.model.materials.length; i++) {
      const m = this.model.materials[i];
      if (!m.emissive) continue;
      if (flash > 0) {
        m.emissive.setRGB(flash, flash, flash);
        m.emissiveIntensity = 1;
      } else {
        m.emissive.setHex(this._emissiveBase[i] || 0x000000);
      }
    }
    // invulnerability blink (only when airborne-invuln, not during special flash)
    if (this.blinkWhenInvulnerable) {
      const blink = this.invulnTimer > 0.5 ? Math.floor(this.time * 14) % 2 === 0 : true;
      this.root.visible = blink || this.fadeTimer > 0;
    }
  }

  update(dt, world) {
    this.updateTimers(dt);
    this.updatePhysics(dt);
    this.animator.update(dt);
    this.applyVisuals();
    this.syncMesh();
  }

  // Called when the entity reaches 0 HP and its death animation elapsed.
  requestRemoval() {
    this.removed = true;
  }
}
