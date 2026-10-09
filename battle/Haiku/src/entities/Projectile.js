// Снаряд (болт босса). Объекты берутся из пула уровня и возвращаются в него после попадания или по таймеру.
import * as THREE from 'three';
import { aabbOverlap } from '../physics/Physics.js';
import { cached } from '../assets/Textures.js';

const boltGeometry = () => cached('boltGeo', () => {
  const g = new THREE.CylinderGeometry(0.08, 0.08, 0.8, 6);
  g.rotateZ(Math.PI / 2); // ось болта вдоль X
  return g;
});
const boltMaterial = () => cached('boltMat', () => new THREE.MeshLambertMaterial({ color: 0xc0c8d4, emissive: 0x332200 }));

export class Projectile {
  constructor(world, group) {
    this.world = world;
    this.mesh = new THREE.Mesh(boltGeometry(), boltMaterial());
    this.mesh.visible = false;
    group.add(this.mesh);
    this.pos = new THREE.Vector3();
    this.vx = 0;
    this.damage = 0;
    this.owner = null;
    this.life = 0;
  }

  launch(owner, dir, damage, speed) {
    this.owner = owner;
    this.damage = damage;
    this.vx = dir * speed;
    this.pos.set(owner.pos.x + dir * 0.9, owner.pos.y + 1.5, owner.pos.z);
    this.life = 4;
    this.mesh.position.copy(this.pos);
    this.mesh.visible = true;
  }

  deactivate() {
    this.mesh.visible = false;
    this.life = 0;
  }

  // Возвращает false, когда снаряд нужно вернуть в пул
  update(dt) {
    this.life -= dt;
    this.pos.x += this.vx * dt;
    this.mesh.position.copy(this.pos);

    const box = { x: this.pos.x, y: this.pos.y, z: this.pos.z, hw: 0.3, hh: 0.12, hd: 0.2 };
    const { hero, combat, fx } = this.world;
    if (hero.alive && aabbOverlap(box, hero.box)) {
      combat.damage(hero, this.damage, { owner: this.owner, knockX: 2.5, hitstun: 0.3 });
      fx.spark(this.pos.x, this.pos.y, this.pos.z, 0xffcc66);
      this.life = 0;
    }
    for (const obstacle of this.world.level.obstacles) {
      if (!obstacle.alive || !obstacle.solid || this.pos.y >= obstacle.top) continue;
      if (!aabbOverlap(box, obstacle.box)) continue;
      fx.spark(this.pos.x, this.pos.y, this.pos.z, 0xffcc66);
      this.life = 0;
      break;
    }
    if (this.life <= 0) this.deactivate();
    return this.life > 0;
  }
}
