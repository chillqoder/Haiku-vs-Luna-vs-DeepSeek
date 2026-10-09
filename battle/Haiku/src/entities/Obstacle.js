// Препятствия: ящики (ломаются и роняют аптечку) и взрывные бочки (взрываются по площади).
// Пока сущность ниже верхней грани препятствия, оно её блокирует (см. resolveSolids).
import * as THREE from 'three';
import { barrelTex, crateTex, cached } from '../assets/Textures.js';

const KINDS = {
  crate: { w: 1.0, h: 1.0, hp: 3 },
  barrel: { w: 0.84, h: 1.1, hp: 1 },
};

const crateGeometry = () => cached('crateGeo', () => new THREE.BoxGeometry(1, 1, 1));
const barrelGeometry = () => cached('barrelGeo', () => new THREE.CylinderGeometry(0.42, 0.42, 1.1, 14));

export class Obstacle {
  constructor(world, group, kind, x, z) {
    const k = KINDS[kind];
    this.world = world;
    this.kind = kind;
    this.halfW = k.w / 2;
    this.halfD = k.w / 2;
    this.top = k.h;
    this.hp = k.hp;
    this.alive = true;
    this.solid = true;
    this.mesh = new THREE.Mesh(
      kind === 'crate' ? crateGeometry() : barrelGeometry(),
      new THREE.MeshLambertMaterial({ map: kind === 'crate' ? crateTex() : barrelTex() }),
    );
    this.mesh.position.set(x, k.h / 2, z);
    group.add(this.mesh);
  }

  get box() {
    const p = this.mesh.position;
    return { x: p.x, y: this.top / 2, z: p.z, hw: this.halfW, hh: this.top / 2, hd: this.halfD };
  }

  takeHit(combat, hb) {
    if (!this.alive) return;
    if (this.kind === 'barrel') {
      this.explode(combat, hb.owner);
      return;
    }
    const { fx, audio } = this.world;
    const p = this.mesh.position;
    this.hp -= 1;
    if (this.hp > 0) {
      fx.emit(p.x, 1, p.z, 6, 0xb07a40, { speed: 3, life: 0.4, gravity: -14 });
      audio.play('hit');
      return;
    }
    this.alive = false;
    this.solid = false;
    this.mesh.visible = false;
    audio.play('crate');
    fx.emit(p.x, 0.6, p.z, 16, 0x9b6a3a, { speed: 4, life: 0.6, gravity: -12, up: 1 });
    this.world.level.spawnPickup(p.x, p.z);
  }

  // Взрыв: урон по площади врагам рядом и меньше — герою, если тот стоит близко
  explode(combat, owner) {
    this.alive = false;
    this.solid = false;
    this.mesh.visible = false;
    const { fx, audio, hero, level } = this.world;
    const p = this.mesh.position;
    audio.play('boom');
    fx.emit(p.x, 0.8, p.z, 45, 0xff8a2a, { speed: 6, life: 0.7, gravity: -6, up: 2 });
    fx.emit(p.x, 1.0, p.z, 25, 0x666666, { speed: 2, life: 1.0, gravity: 1.5, up: 1.5 });
    for (const enemy of level.enemies) {
      if (!enemy.alive || Math.abs(enemy.pos.x - p.x) > 2.4 || Math.abs(enemy.pos.z - p.z) > 1.4) continue;
      combat.damage(enemy, 40, { owner, fromX: p.x, knockX: 4, lift: 4, knockdown: true, sound: 'boom' });
    }
    if (hero.alive && Math.abs(hero.pos.x - p.x) < 1.8 && Math.abs(hero.pos.z - p.z) < 1.2) {
      combat.damage(hero, 15, { fromX: p.x, knockX: 3, lift: 3, knockdown: true, sound: 'hurt' });
    }
  }
}
