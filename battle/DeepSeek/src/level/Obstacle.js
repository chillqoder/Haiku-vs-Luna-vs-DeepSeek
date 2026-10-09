// Destructible / solid props: crates, barrels, training dummies.

import * as THREE from 'three';
import {
  buildCrate, buildBarrel, buildDojoDummy,
} from '../assets/ModelFactory.js';
import { boxFromFeet } from '../physics/Physics.js';

export class Obstacle {
  constructor(type, x, z, world) {
    this.type = type;
    this.world = world;
    this.position = new THREE.Vector3(x, 0, z);
    this.velocity = new THREE.Vector3();
    this.faction = 'obstacle';
    this.dead = false;
    this.hitOnce = null;

    if (type === 'crate') {
      this.mesh = buildCrate();
      this.health = 12;
      this.halfWidth = 0.65;
      this.height = 1.25;
      this.halfDepth = 0.65;
      this.dropChance = 0.55;
    } else if (type === 'barrel') {
      this.mesh = buildBarrel(0x2f6e3a);
      this.health = 16;
      this.halfWidth = 0.48;
      this.height = 1.1;
      this.halfDepth = 0.48;
      this.dropChance = 0.45;
    } else {
      // training dummy
      this.mesh = buildDojoDummy();
      this.health = 24;
      this.halfWidth = 0.42;
      this.height = 1.8;
      this.halfDepth = 0.42;
      this.dropChance = 0.35;
    }

    this.mesh.position.copy(this.position);
    this.hitShake = 0;
    this.maxHealth = this.health;
  }

  hurtBox() {
    if (this.dead) {
      return { minX: 1e9, maxX: -1e9, minY: 1e9, maxY: -1e9, minZ: 1e9, maxZ: -1e9 };
    }
    return boxFromFeet(this.position, this.halfWidth, this.height, this.halfDepth);
  }

  bodyBox() {
    return this.hurtBox();
  }

  canBeHit() {
    return !this.dead;
  }

  takeDamage(amount, opts = {}) {
    if (this.dead) return { applied: 0, killed: false };
    this.health -= amount;
    this.hitShake = 0.16;
    const killed = this.health <= 0;
    if (killed) this.destroy(opts);
    return { applied: amount, killed };
  }

  destroy(opts = {}) {
    this.dead = true;
    const world = this.world;
    if (world) {
      const p = new THREE.Vector3(this.position.x, this.height * 0.5, this.position.z);
      const color = this.type === 'dummy' ? 0x8a6a3a : this.type === 'barrel' ? 0x4a7a4a : 0x8a5a2e;
      world.effects.debris(p, color);
      world.effects.dust(this.position, 10);
      world.audio.crateBreak();
      world.renderer?.addShake(0.25, 0.25);
      // Chance to drop food.
      if (Math.random() < this.dropChance) {
        world.spawnPickup(this.position.x + 0.4, this.position.z, 'food');
      }
      // Award points.
      world.addScore?.(20);
    }
  }

  update(dt) {
    if (this.dead) return;
    if (this.hitShake > 0) {
      this.hitShake -= dt;
      const s = 1 + Math.max(0, this.hitShake) * 0.5;
      this.mesh.scale.set(s, 1 / s, s);
      if (this.hitShake <= 0) this.mesh.scale.set(1, 1, 1);
    }
  }

  dispose() {
    this.mesh.parent?.remove(this.mesh);
  }
}

// ---------------------------------------------------------------------------

export class Pickup {
  constructor(type, x, z) {
    this.type = type; // 'food' | 'coin'
    this.position = new THREE.Vector3(x, 0.5, z);
    this.dead = false;
    this.time = Math.random() * 5;
    this.life = 20;

    const geo = type === 'food'
      ? new THREE.BoxGeometry(0.4, 0.3, 0.3)
      : new THREE.CylinderGeometry(0.28, 0.28, 0.08, 16);
    const mat = type === 'food'
      ? new THREE.MeshStandardMaterial({ color: 0x9a6a3a, roughness: 0.8 })
      : new THREE.MeshStandardMaterial({ color: 0xffd23d, metalness: 0.8, roughness: 0.25, emissive: 0x664400, emissiveIntensity: 0.4 });
    this.mesh = new THREE.Mesh(geo, mat);
    this.mesh.castShadow = true;
    this.mesh.position.copy(this.position);
  }

  update(dt) {
    this.time += dt;
    this.life -= dt;
    if (this.life <= 0) {
      this.dead = true;
      return;
    }
    this.mesh.position.y = 0.5 + Math.sin(this.time * 3) * 0.15;
    this.mesh.rotation.y += dt * 2;
    // blink before expiring
    this.mesh.visible = this.life > 4 || Math.floor(this.life * 6) % 2 === 0;
  }

  dispose() {
    this.mesh.parent?.remove(this.mesh);
  }
}
