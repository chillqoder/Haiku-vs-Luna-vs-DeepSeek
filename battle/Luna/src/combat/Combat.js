import * as THREE from 'three';
import { inAttackRange } from '../core/Physics.js';

export class Combat {
  constructor(game) { this.game = game; }

  resolve(action) {
    const { hero, enemies, effects, audio, level } = this.game;
    if (action.type === 'grab') return this.grab();
    if (action.type === 'throw') {
      effects.burst(action.target.group.position, '#ffd77b', 12, 4.5);
      return;
    }
    if (action.type === 'special') effects.ring(hero.group.position, '#65f2e2');
    const candidates = enemies.filter((enemy) => !enemy.dead && !enemy.grabbed);
    let landed = false;
    for (const enemy of candidates) {
      const inRange = inAttackRange(hero, enemy, hero.facing, action.range, action.depth, action.type === 'special');
      if (!inRange || Math.abs(enemy.group.position.y - hero.group.position.y) > 1.5) continue;
      const laneKnock = Math.sign(dz || (Math.random() - 0.5)) * (action.type === 'special' ? 5 : 1.25);
      const result = enemy.takeHit({ ...action, knockback: hero.facing * action.knockback, laneKnock });
      if (result.blocked) audio.play('block');
      else { audio.play(action.type === 'kick' ? 'kick' : 'hit'); effects.burst(enemy.group.position, result.defeated ? '#ffe0a1' : '#8ff6ec', result.defeated ? 16 : 8, result.defeated ? 5 : 3.1); }
      if (result.damage > 0) {
        landed = true;
        hero.comboHits += 1;
        hero.score += result.damage * 5 + (action.combo === 3 ? 35 : 0);
        if (result.defeated) {
          hero.score += enemy.reward;
          audio.play('defeat');
          effects.burst(enemy.group.position, '#ff9870', 22, 5.8);
        }
      }
    }
    const obstacle = level.hitObstacleInFront(hero, action);
    if (obstacle) {
      landed = true;
      effects.burst(obstacle.mesh.position, '#fbc67c', 11, 3.5);
      audio.play(obstacle.destroyed ? 'break' : 'hit');
      if (obstacle.destroyed) hero.score += 70;
    }
    if (landed && action.type !== 'special' && action.type !== 'kick') audio.play('punch');
    if (action.type === 'special' && landed) audio.play('hit');
  }

  grab() {
    const { hero, enemies, audio, effects } = this.game;
    if (hero.throwTarget) return;
    const target = enemies
      .filter((enemy) => !enemy.dead && !enemy.grabbed && Math.abs(enemy.group.position.x - hero.group.position.x) < 1.42 && Math.abs(enemy.group.position.z - hero.group.position.z) < 0.9)
      .sort((a, b) => Math.abs(a.group.position.x - hero.group.position.x) - Math.abs(b.group.position.x - hero.group.position.x))[0];
    if (!target || Math.sign(target.group.position.x - hero.group.position.x) !== hero.facing) return;
    hero.throwTarget = target;
    target.grabbed = true;
    target.health = Math.max(1, target.health - 2);
    hero.setMotion('punch', 0.22);
    audio.play('hit');
    effects.burst(target.group.position, '#ffdc82', 7, 2.8);
  }

  static rangeTo(hero, enemy) {
    return new THREE.Vector2(hero.group.position.x - enemy.group.position.x, hero.group.position.z - enemy.group.position.z).length();
  }
}
