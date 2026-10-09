import { Character } from './Character.js';
import { updateEnemyAI } from '../ai/EnemyAI.js';

const ENEMY_TYPES = {
  grunt: { name: 'Street Runner', hp: 42, speed: 2.05, damage: 9, cooldown: 1.55, color: '#7b3753', trim: '#f27184', scale: 0.96, score: 120 },
  agile: { name: 'Rooftop Scout', hp: 34, speed: 3.2, damage: 7, cooldown: 1.15, color: '#345681', trim: '#82c5ff', scale: 0.91, score: 160 },
  brute: { name: 'Dockyard Bruiser', hp: 86, speed: 1.38, damage: 16, cooldown: 2.1, color: '#69432f', trim: '#e5a052', scale: 1.18, score: 240 },
  boss: { name: 'The Block Captain', hp: 255, speed: 1.9, damage: 21, cooldown: 1.65, color: '#572b42', trim: '#ff786c', scale: 1.34, score: 1600 },
};

export class Enemy extends Character {
  constructor(scene, kind, x, z, bossName = null) {
    const stats = ENEMY_TYPES[kind] ?? ENEMY_TYPES.grunt;
    super(scene, { kind, x, z, bodyColor: stats.color, trimColor: stats.trim, scale: stats.scale, skinColor: '#bd8068' });
    this.type = kind;
    this.title = bossName ?? stats.name;
    this.maxHealth = stats.hp;
    this.health = stats.hp;
    this.speed = stats.speed;
    this.damage = stats.damage;
    this.attackCooldown = 0.6 + Math.random() * 0.7;
    this.attackTimer = 0;
    this.stun = 0;
    this.knockVelocityX = 0;
    this.knockVelocityZ = 0;
    this.dead = false;
    this.reward = stats.score;
    this.grabbed = false;
    this.blockTimer = 0;
    this.didAttack = false;
    this.random = Math.random();
  }

  update(dt, hero) {
    return updateEnemyAI(this, dt, hero);
  }

  cooldownForType() {
    return ({ grunt: 1.6, agile: 1.18, brute: 2.05, boss: 1.62 })[this.type] ?? 1.6;
  }

  takeHit(hit) {
    if (this.dead || this.grabbed) return { blocked: false, defeated: false };
    const blocking = this.blockTimer > 0 || this.motion === 'block' && this.actionTimer > 0;
    const damage = Math.max(2, Math.round(hit.damage * (blocking ? 0.32 : 1)));
    this.health = Math.max(0, this.health - damage);
    const sign = Math.sign(hit.knockback || 1);
    this.knockVelocityX = blocking ? sign * 1.2 : hit.knockback;
    this.knockVelocityZ = hit.laneKnock ?? 0;
    this.stun = blocking ? 0.14 : hit.stun;
    this.setMotion(blocking ? 'block' : 'hit', blocking ? 0.18 : 0.26);
    this.flashTimer = 0.18;
    if (this.health <= 0) {
      this.dead = true;
      this.stun = 0;
      this.setMotion('down', 1);
    }
    return { blocked: blocking, defeated: this.dead, damage };
  }
}
