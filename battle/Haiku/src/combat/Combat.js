// Бой: хитбоксы (создаются атакой и следуют за владельцем), применение урона,
// нокбэк, блок, суперброня, счётчик комбо и начисление очков.
import { aabbOverlap } from '../physics/Physics.js';

const COMBO_WINDOW = 2.0; // секунд без попаданий до сброса комбо

export class Combat {
  constructor(world) {
    this.world = world;
    this.hitboxes = [];
    this.combo = 0;
    this.comboTimer = 0;
  }

  // def: { owner, team: 'hero' | 'enemy', damage, ox, oy, oz, hw, hh, hd,
  //        delay, duration, centered, knockX, lift, knockdown, hitstun, sound }
  // delay — задержка до активации, duration — длительность активного окна
  spawnHitbox(def) {
    this.hitboxes.push({ ...def, age: 0, hits: new Set() });
  }

  // Коробка хитбокса в мировых координатах: смещение зеркалится по направлению взгляда владельца
  boxOf(hb) {
    const o = hb.owner;
    const side = hb.centered ? 1 : o.facing;
    return {
      x: o.pos.x + hb.ox * side,
      y: o.pos.y + hb.oy,
      z: o.pos.z + (hb.oz ?? 0),
      hw: hb.hw,
      hh: hb.hh,
      hd: hb.hd,
    };
  }

  update(dt) {
    this.comboTimer -= dt;
    if (this.comboTimer <= 0) this.combo = 0;

    for (let i = this.hitboxes.length - 1; i >= 0; i--) {
      const hb = this.hitboxes[i];
      hb.age += dt;
      const end = hb.delay + hb.duration;
      if (hb.age >= hb.delay && hb.age < end) this.checkHits(hb);
      if (hb.age >= end) this.hitboxes.splice(i, 1);
    }
  }

  checkHits(hb) {
    const { level, hero } = this.world;
    const box = this.boxOf(hb);
    if (hb.team === 'hero') {
      for (const enemy of level.enemies) {
        if (!enemy.alive || hb.hits.has(enemy) || enemy === hb.owner) continue;
        if (!aabbOverlap(box, enemy.box)) continue;
        hb.hits.add(enemy);
        this.damage(enemy, hb.damage, hb);
      }
      for (const obstacle of level.obstacles) {
        if (!obstacle.alive || hb.hits.has(obstacle)) continue;
        if (!aabbOverlap(box, obstacle.box)) continue;
        hb.hits.add(obstacle);
        obstacle.takeHit(this, hb);
      }
    } else if (hero.alive && !hb.hits.has(hero) && aabbOverlap(box, hero.box)) {
      hb.hits.add(hero);
      this.damage(hero, hb.damage, hb);
    }
  }

  // Наносит урон цели. opts — параметры удара (хитбокс или объект с теми же полями).
  // Возвращает true, если удар засчитан.
  damage(target, amount, opts) {
    if (!target.alive || target.invuln > 0 || target.dying) return false;
    const { audio, fx, game, hero } = this.world;
    const source = opts.owner ?? null;
    const srcX = opts.fromX ?? source?.pos.x ?? target.pos.x;
    const fromSide = Math.sign(srcX - target.pos.x);
    const knockDir = fromSide !== 0 ? -fromSide : 1; // отбрасываем от источника
    const midX = (srcX + target.pos.x) / 2;
    const contactY = target.pos.y + 1.2;

    // Блок: удар спереди гасится. Защита есть только у врагов с guarding
    if (target.guarding && fromSide !== 0 && target.facing === fromSide) {
      target.knockVel.x += (opts.knockX ?? 0) * knockDir * 0.3;
      target.invuln = 0.15;
      audio.play('block');
      fx.spark(midX, contactY, target.pos.z, 0x9fd8ff);
      return true;
    }

    let dmg = amount;
    let stun = opts.hitstun ?? 0.25;
    if (target.armor && amount < target.maxHealth * 0.25) stun = 0;
    const kx = (opts.knockX ?? 0) * knockDir * (target.armor ? 0.5 : 1);
    target.health -= dmg;
    target.knockVel.x += kx;
    target.flashTimer = 0.12;
    target.invuln = 0.08;
    fx.spark(midX, contactY, target.pos.z);
    audio.play(target === hero ? 'hurt' : (opts.sound ?? 'hit'));

    if (source === hero) {
      this.combo += 1;
      this.comboTimer = COMBO_WINDOW;
      game.addScore(Math.round(dmg * 10 * (1 + Math.min(this.combo, 20) * 0.05)));
    }

    if (target.health <= 0) {
      this.kill(target, source, opts);
    } else if (opts.lift || opts.knockdown) {
      target.knockDown(opts.lift ?? 4);
    } else if (stun > 0) {
      target.stun(stun);
    }
    return true;
  }

  kill(target, source, opts) {
    const { audio, fx, game, hero } = this.world;
    target.die();
    target.jump(Math.max(opts.lift ?? 0, 4));
    fx.emit(target.pos.x, target.pos.y + 1, target.pos.z, 14, 0xffd27a, { speed: 4, life: 0.5, gravity: -10 });
    if (target === hero) {
      audio.play('death');
      return;
    }
    audio.play('enemyDown');
    if (source === hero) game.addScore(target.def?.points ?? 0);
  }

  // Полный сброс боя: после смерти героя и при переходе на другой уровень
  reset() {
    this.hitboxes.length = 0;
    this.combo = 0;
    this.comboTimer = 0;
  }
}
