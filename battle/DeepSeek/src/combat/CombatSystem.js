// Combat: attack definitions, active hitboxes, damage resolution, combos.

import { aabbOverlap, attackBox } from '../physics/Physics.js';
import { COMBAT } from '../core/Constants.js';

// Attack definitions. Timing is in seconds from attack start.
// windup -> active -> recovery. `damage`, `range`, `depth`, `height*`.

export const HERO_ATTACKS = {
  punch1: {
    damage: COMBAT.heroLightDamage,
    windup: 0.05, active: 0.09, recovery: 0.12,
    range: 1.65, depth: 0.75, heightMin: 0.7, heightMax: 1.9,
    knockback: 2.6, lift: 0, hitStun: 0.28, sound: 'punch', stop: 'light',
    priority: 1, lunge: 2.2,
  },
  punch2: {
    damage: COMBAT.heroLightDamage + 1,
    windup: 0.05, active: 0.09, recovery: 0.12,
    range: 1.7, depth: 0.75, heightMin: 0.7, heightMax: 1.9,
    knockback: 2.8, lift: 0, hitStun: 0.3, sound: 'punch', stop: 'light',
    priority: 1, lunge: 2.2,
  },
  punch3: {
    damage: COMBAT.heroHeavyDamage,
    windup: 0.1, active: 0.1, recovery: 0.2,
    range: 1.8, depth: 0.85, heightMin: 0.7, heightMax: 1.95,
    knockback: 7.5, lift: 5.5, hitStun: 0.5, sound: 'hitHeavy', stop: 'heavy',
    knockdown: true, priority: 2, lunge: 2.8,
  },
  kick: {
    damage: COMBAT.heroKickDamage,
    windup: 0.12, active: 0.1, recovery: 0.22,
    range: 2.05, depth: 0.8, heightMin: 0.6, heightMax: 1.9,
    knockback: 5.5, lift: 1.6, hitStun: 0.42, sound: 'kick', stop: 'light',
    priority: 2, lunge: 2.6,
  },
  jumpKick: {
    damage: COMBAT.heroKickDamage + 2,
    windup: 0.06, active: 0.14, recovery: 0.16,
    range: 1.9, depth: 0.8, heightMin: 0.2, heightMax: 1.6,
    knockback: 6.5, lift: 2.5, hitStun: 0.45, sound: 'kick', stop: 'light',
    knockdown: true, priority: 2, air: true,
  },
  special: {
    damage: COMBAT.heroSpecialDamage,
    windup: 0.08, active: 0.3, recovery: 0.24,
    range: 2.5, depth: 2.6, heightMin: 0.3, heightMax: 2.0,
    knockback: 9, lift: 6, hitStun: 0.6, sound: 'special', stop: 'heavy',
    knockdown: true, multiHit: true, hitInterval: 0.12, priority: 3,
    radial: true,
  },
  grabPunch: {
    damage: 8,
    windup: 0.08, active: 0.08, recovery: 0.14,
    range: 1.3, depth: 1.4, heightMin: 0.3, heightMax: 1.9,
    knockback: 1.5, lift: 0, hitStun: 0.3, sound: 'punch', stop: 'light',
    priority: 1, grabOnly: true,
  },
  throw: {
    damage: 14,
    windup: 0.1, active: 0.15, recovery: 0.25,
    range: 2.2, depth: 1.6, heightMin: 0.2, heightMax: 1.9,
    knockback: 13, lift: 7, hitStun: 0.7, sound: 'hitHeavy', stop: 'heavy',
    knockdown: true, priority: 3, throwMove: true,
    // Enemies hit by the flying body take this much:
    thrownBodyDamage: 10,
  },
};

export const ENEMY_ATTACKS = {
  swipe: {
    damage: 5,
    windup: 0.28, active: 0.1, recovery: 0.26,
    range: 1.65, depth: 0.7, heightMin: 0.7, heightMax: 1.9,
    knockback: 2.4, lift: 0, hitStun: 0.34, sound: 'punch', stop: 'light',
    priority: 1,
  },
  quickJab: {
    damage: 4,
    windup: 0.14, active: 0.08, recovery: 0.16,
    range: 1.6, depth: 0.7, heightMin: 0.7, heightMax: 1.9,
    knockback: 2.2, lift: 0, hitStun: 0.3, sound: 'punch', stop: 'light',
    priority: 1,
  },
  heavySwing: {
    damage: 13,
    windup: 0.4, active: 0.12, recovery: 0.34,
    range: 2.0, depth: 0.9, heightMin: 0.6, heightMax: 2.0,
    knockback: 8, lift: 5.5, hitStun: 0.55, sound: 'hitHeavy', stop: 'heavy',
    knockdown: true, priority: 3,
  },
  bruteStomp: {
    damage: 11,
    windup: 0.45, active: 0.12, recovery: 0.4,
    range: 2.2, depth: 1.3, heightMin: 0.0, heightMax: 1.6,
    knockback: 7, lift: 4, hitStun: 0.5, sound: 'kick', stop: 'heavy',
    knockdown: false, priority: 3,
  },
  bossSlam: {
    damage: 16,
    windup: 0.5, active: 0.12, recovery: 0.42,
    range: 2.8, depth: 2.4, heightMin: 0.0, heightMax: 2.1,
    knockback: 10, lift: 6.5, hitStun: 0.6, sound: 'slam', stop: 'heavy',
    knockdown: true, priority: 4, shockwave: true,
  },
  bossPunch: {
    damage: 10,
    windup: 0.3, active: 0.1, recovery: 0.24,
    range: 2.3, depth: 0.9, heightMin: 0.6, heightMax: 2.0,
    knockback: 6, lift: 2, hitStun: 0.45, sound: 'hitHeavy', stop: 'heavy',
    priority: 3,
  },
  bossCharge: {
    damage: 14,
    windup: 0.35, active: 0.28, recovery: 0.3,
    range: 3.0, depth: 1.0, heightMin: 0.4, heightMax: 2.0,
    knockback: 11, lift: 5, hitStun: 0.55, sound: 'hitHeavy', stop: 'heavy',
    knockdown: true, priority: 4, lunge: 9,
  },
};

// ---------------------------------------------------------------------------

let nextId = 1;

export class ActiveHitbox {
  constructor({ owner, def, duration, offset = null, onHit = null, faction = null, multiHit = false, hitInterval = 0.15 }) {
    this.id = nextId++;
    this.owner = owner;
    this.def = def;
    this.faction = faction ?? owner.faction;
    this.timeLeft = duration;
    this.duration = duration;
    this.offset = offset; // optional fixed box override {x,y,z} offsets
    this.hitOnce = new Map(); // entity -> last hit time
    this.onHit = onHit;
    this.multiHit = multiHit;
    this.hitInterval = hitInterval;
    this.dead = false;
  }
}

export class CombatSystem {
  constructor(game) {
    this.game = game;
    this.hitboxes = [];
    this.hitStopTimer = 0;
    this.hitStopScale = 1;
    this.combo = 0;
    this.comboTimer = 0;
    this.comboMaxTimer = COMBAT.comboWindow;
    this.finisherNames = [];
    this.onComboChange = null;
  }

  clear() {
    this.hitboxes = [];
    this.hitStopTimer = 0;
    this.hitStopScale = 1;
    this.combo = 0;
    this.comboTimer = 0;
  }

  spawnHitbox(opts) {
    const hb = new ActiveHitbox(opts);
    this.hitboxes.push(hb);
    return hb;
  }

  // Register a combo hit (hero landed a hit).
  registerHit() {
    this.combo += 1;
    this.comboTimer = this.comboMaxTimer;
    if (this.onComboChange) this.onComboChange(this.combo);
  }

  resetCombo() {
    if (this.combo !== 0) {
      this.combo = 0;
      if (this.onComboChange) this.onComboChange(0);
    }
  }

  requestHitStop(kind) {
    const t = kind === 'heavy' ? COMBAT.hitStopHeavy : COMBAT.hitStopLight;
    if (t > this.hitStopTimer) {
      this.hitStopTimer = t;
      this.hitStopScale = 0.08;
    }
  }

  get isHitStopped() {
    return this.hitStopTimer > 0;
  }

  // Real-time timers (hit-stop countdown, combo timeout).
  tickTimers(dt) {
    if (this.hitStopTimer > 0) {
      this.hitStopTimer -= dt;
      if (this.hitStopTimer <= 0) {
        this.hitStopTimer = 0;
        this.hitStopScale = 1;
      }
    }

    if (this.comboTimer > 0) {
      this.comboTimer -= dt;
      if (this.comboTimer <= 0) this.resetCombo();
    }
  }

  // World-time update: advance hitbox lifetimes and resolve collisions.
  updateHitboxes(dt, world) {
    for (const hb of this.hitboxes) {
      if (hb.dead) continue;
      hb.timeLeft -= dt;
      if (hb.timeLeft <= 0) {
        hb.dead = true;
        continue;
      }
        const box = hb.offset
          ? {
              minX: hb.owner.position.x + hb.offset.x - 0.6,
              maxX: hb.owner.position.x + hb.offset.x + 0.6,
              minY: hb.owner.position.y + hb.offset.y,
              maxY: hb.owner.position.y + hb.offset.y + 1.6,
              minZ: hb.owner.position.z + hb.offset.z - 0.6,
              maxZ: hb.owner.position.z + hb.offset.z + 0.6,
            }
          : attackBox(hb.owner, hb.def);

        // Multi-hit attacks can re-hit each target after hitInterval.
        if (hb.multiHit) {
          for (const [t, last] of [...hb.hitOnce.entries()]) {
            if (hb.owner.time - last >= hb.hitInterval) hb.hitOnce.delete(t);
          }
        }

        const targets = world.getTargetsFor(hb.faction);
      for (const t of targets) {
        if (!t || t.dead || !t.canBeHit) continue;
        if (!t.canBeHit()) continue;
        if (t === hb.owner) continue;
        if (hb.hitOnce.has(t) && !hb.multiHit) continue;
        const hurtBox = t.hurtBox();
        if (!aabbOverlap(box, hurtBox)) continue;

        hb.hitOnce.set(t, hb.owner.time);
        this.resolveHit(hb, t, hurtBox, box);
      }
    }

    this.hitboxes = this.hitboxes.filter((h) => !h.dead);
  }

  resolveHit(hb, target, hurtBox, box) {
    const def = hb.def;
    const attacker = hb.owner;
    const isHero = hb.faction === 'hero';

    // Blocking check: enemies (and hero, if implemented) negate most damage when facing attacker.
    const blocked = target.isBlocking && target.isBlocking(attacker);

    const contactPoint = {
      x: (Math.max(box.minX, hurtBox.minX) + Math.min(box.maxX, hurtBox.maxX)) / 2,
      y: (Math.max(box.minY, hurtBox.minY) + Math.min(box.maxY, hurtBox.maxY)) / 2,
      z: (Math.max(box.minZ, hurtBox.minZ) + Math.min(box.maxZ, hurtBox.maxZ)) / 2,
    };

    if (blocked) {
      const chip = Math.max(1, Math.round(def.damage * 0.15));
      target.takeDamage(chip, {
        attacker,
        blocked: true,
        knockback: def.knockback * 0.35,
        lift: 0,
        hitStun: 0.18,
        hitPoint: contactPoint,
      });
      this.game.onBlock(attacker, target, contactPoint);
      return;
    }

    const result = target.takeDamage(def.damage, {
      attacker,
      knockback: def.knockback,
      lift: def.lift,
      hitStun: def.hitStun,
      knockdown: def.knockdown,
      hitPoint: contactPoint,
    });

    // Knockback direction: away from attacker.
    const dir = Math.sign(target.position.x - attacker.position.x) || attacker.facing;
    if (target.applyImpulse) target.applyImpulse(dir * def.knockback, def.lift);

    if (isHero) {
      this.registerHit();
      this.requestHitStop(def.stop);
      this.game.onHeroHit(target, def, contactPoint, result);
    } else {
      this.requestHitStop(def.stop === 'heavy' ? 'light' : 'light');
      this.resetCombo();
      this.game.onEnemyHitHero(attacker, def, contactPoint, result);
    }

    if (hb.onHit) hb.onHit(target, contactPoint, def);
  }
}
