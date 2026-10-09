import * as THREE from 'three';
import { Character } from './Character.js';
import { dampMovement, stepVertical } from '../core/Physics.js';

export class Hero extends Character {
  constructor(scene) {
    super(scene, { kind: 'hero', x: 4, z: 0, bodyColor: '#16344a', trimColor: '#53e2d3', skinColor: '#d99878' });
    this.maxHealth = 120;
    this.health = this.maxHealth;
    this.lives = 3;
    this.velocity = new THREE.Vector3();
    this.invulnerable = 0;
    this.attackCooldown = 0;
    this.specialCooldown = 0;
    this.combo = 0;
    this.comboTimer = 0;
    this.comboHits = 0;
    this.score = 0;
    this.throwTarget = null;
    this.isDead = false;
  }

  reset(x = 4, z = 0, refill = true) {
    this.group.position.set(x, 0, z);
    this.velocity.set(0, 0, 0);
    this.health = refill ? this.maxHealth : Math.min(this.maxHealth, this.health + 35);
    this.invulnerable = 1.8;
    this.isDead = false;
    this.throwTarget = null;
    this.combo = 0;
    this.comboTimer = 0;
    this.motion = 'idle';
    this.actionTimer = 0;
    this.attackCooldown = 0;
    this.specialCooldown = 0;
  }

  update(dt, input, level, audio) {
    this.invulnerable = Math.max(0, this.invulnerable - dt);
    this.attackCooldown = Math.max(0, this.attackCooldown - dt);
    this.specialCooldown = Math.max(0, this.specialCooldown - dt);
    this.comboTimer = Math.max(0, this.comboTimer - dt);
    if (!this.comboTimer) { this.combo = 0; this.comboHits = 0; }

    if (this.throwTarget) {
      this.throwTarget.group.position.set(this.group.position.x + this.facing * 0.86, this.group.position.y, this.group.position.z);
      this.throwTarget.setMotion('hit', 0.25);
      if (input.pressed('grab')) {
        const target = this.throwTarget;
        this.throwTarget = null;
        target.grabbed = false;
        target.takeHit({ damage: 26, knockback: this.facing * 8.5, laneKnock: (target.group.position.z - this.group.position.z) * 1.2, stun: 1.1 });
        audio.play('throw');
        return [{ type: 'throw', target }];
      }
    }

    const moveX = Number(input.down('right')) - Number(input.down('left'));
    const moveZ = Number(input.down('down')) - Number(input.down('up'));
    if (moveX) this.setFacing(moveX);
    const maxX = level.length - 2.1;
    const accel = this.group.position.y > 0 ? 0.78 : 1;
    this.velocity.x = dampMovement(this.velocity.x, moveX, 5.25, 12 * accel, dt);
    this.velocity.z = dampMovement(this.velocity.z, moveZ, 4.1, 13, dt);
    this.group.position.x = THREE.MathUtils.clamp(this.group.position.x + this.velocity.x * dt, 0, maxX);
    this.group.position.z = THREE.MathUtils.clamp(this.group.position.z + this.velocity.z * dt, -3.4, 3.4);
    if (stepVertical(this, dt)) audio.play('land');

    level.resolveHeroObstacles(this, dt);
    const grounded = this.group.position.y <= 0.001;
    const actions = [];
    if (grounded && input.pressed('jump')) {
      this.velocity.y = 8.6;
      this.setMotion('jump', 0.24);
      audio.play('jump');
    }
    if (this.attackCooldown <= 0 && input.pressed('punch')) {
      const continuingCombo = this.comboTimer > 0;
      this.combo = continuingCombo ? (this.combo % 3) + 1 : 1;
      if (!continuingCombo) this.comboHits = 0;
      this.comboTimer = 1.1;
      this.attackCooldown = 0.31;
      this.setMotion('punch', 0.22);
      actions.push({ type: 'punch', combo: this.combo, damage: [11, 16, 24][this.combo - 1], range: [1.25, 1.5, 1.72][this.combo - 1], depth: 0.95, knockback: [3.4, 4.7, 7.2][this.combo - 1], stun: 0.33 + this.combo * 0.1 });
    }
    if (this.attackCooldown <= 0 && input.pressed('kick')) {
      this.attackCooldown = 0.65;
      this.comboTimer = Math.max(this.comboTimer, 0.45);
      this.setMotion('kick', 0.38);
      actions.push({ type: 'kick', damage: 19, range: 2.02, depth: 1.15, knockback: 6.5, stun: 0.68 });
    }
    if (input.pressed('special') && this.specialCooldown <= 0) {
      this.specialCooldown = 7.5;
      this.attackCooldown = 0.72;
      this.setMotion('special', 0.55);
      actions.push({ type: 'special', damage: 32, range: 4.15, depth: 3.2, knockback: 9.2, stun: 0.95 });
      audio.play('special');
    }
    if (input.pressed('grab')) actions.push({ type: 'grab' });
    const speed = Math.hypot(this.velocity.x, this.velocity.z);
    if (this.group.position.y > 0.05 && this.actionTimer <= 0) this.motion = 'jump';
    else if (speed > 0.18 && this.actionTimer <= 0) this.motion = 'walk';
    else if (this.actionTimer <= 0) this.motion = 'idle';
    this.updateAnimation(dt, speed);
    return actions;
  }

  takeDamage(amount, knockback, laneKnock, audio) {
    if (this.invulnerable > 0 || this.isDead) return false;
    this.health = Math.max(0, this.health - amount);
    this.invulnerable = 0.9;
    this.velocity.x = knockback;
    this.velocity.z = laneKnock;
    this.setMotion(this.health <= 0 ? 'down' : 'hit', this.health <= 0 ? 1 : 0.34);
    this.flashTimer = 0.22;
    if (this.health <= 0) this.isDead = true;
    audio.play('hit');
    return true;
  }
}
