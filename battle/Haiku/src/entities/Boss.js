// Босс: крупный враг с набором ходов из BOSS_MOVES. Ниже 50% здоровья впадает в ярость:
// быстрее двигается и атакует с меньшим замахом.
import { Enemy } from './Enemy.js';
import { BOSS_MOVES } from './enemyTypes.js';

export class Boss extends Enemy {
  constructor(world, def, x, z) {
    super(world, { ...def }, x, z, { aggro: true }); // копия конфига: ярость не меняет общие данные
    this.isBoss = true;
    this.enraged = false;
  }

  // Босс может начать атаку и издалека (снаряд, рывок)
  canStartAttack(dx) {
    return Math.abs(dx) < 7;
  }

  // Далеко — рывок или снаряд; рядом — удары ближнего боя. Если на этой дистанции хода нет — null
  chooseMove() {
    const hero = this.world.hero;
    const dist = Math.abs(hero.pos.x - this.pos.x);
    const moves = this.def.moves;
    const has = (name) => moves.includes(name);
    const roll = Math.random();
    let name = null;
    if (dist > 2.5) {
      if (dist > 4 && has('charge') && roll < 0.5) name = 'charge';
      else if (has('throw') && roll < 0.7) name = 'throw';
      else if (has('dash') && roll < 0.6) name = 'dash';
      else if (has('charge')) name = 'charge';
      if (!name) return null;
    } else {
      const melee = moves.filter((m) => !BOSS_MOVES[m].projectile && !BOSS_MOVES[m].dash);
      name = melee[Math.floor(Math.random() * melee.length)];
    }
    const move = { ...BOSS_MOVES[name] };
    if (this.enraged) {
      move.windup *= 0.7;
      move.recover *= 0.8;
    }
    return move;
  }

  update(dt) {
    if (!this.enraged && this.alive && this.health < this.maxHealth * 0.5) {
      this.enraged = true;
      this.def.speed *= 1.25;
      this.flashTimer = 0.5;
      this.world.audio.play('roar');
      this.world.fx.emit(this.pos.x, 2, this.pos.z, 30, 0xff5533, { speed: 5, life: 0.6 });
    }
    super.update(dt);
  }
}
