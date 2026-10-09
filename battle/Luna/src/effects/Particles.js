import * as THREE from 'three';

export class Particles {
  constructor(scene) { this.scene = scene; this.items = []; }

  burst(position, color = '#fff', count = 10, force = 3) {
    const shared = {
      material: new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 1 }),
      geometry: new THREE.BoxGeometry(0.08, 0.08, 0.08),
      remaining: count,
    };
    for (let i = 0; i < count; i += 1) {
      const mesh = new THREE.Mesh(shared.geometry, shared.material);
      mesh.position.set(position.x, position.y + 1.05 + Math.random() * 0.65, position.z + (Math.random() - 0.5) * 0.35);
      mesh.rotation.set(Math.random() * 6, Math.random() * 6, Math.random() * 6);
      this.scene.add(mesh);
      this.items.push({ mesh, material: shared.material, geometry: shared.geometry, shared, life: 0.35 + Math.random() * 0.35, maxLife: 0.7, velocity: new THREE.Vector3((Math.random() - 0.5) * force, Math.random() * force * 0.82, (Math.random() - 0.5) * force) });
    }
  }

  ring(position, color) {
    const geometry = new THREE.TorusGeometry(1, 0.045, 6, 36);
    const material = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.8 });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(position.x, 0.09, position.z);
    mesh.rotation.x = Math.PI / 2;
    this.scene.add(mesh);
    this.items.push({ mesh, material, geometry, life: 0.5, maxLife: 0.5, velocity: new THREE.Vector3(0, 0, 0), ring: true });
  }

  update(dt) {
    for (let i = this.items.length - 1; i >= 0; i -= 1) {
      const item = this.items[i];
      item.life -= dt;
      if (item.ring) {
        const scale = 1 + (1 - item.life / item.maxLife) * 3.3;
        item.mesh.scale.set(scale, scale, scale);
        item.material.opacity = Math.max(0, item.life / item.maxLife) * 0.8;
      } else {
        item.velocity.y -= 8 * dt;
        item.mesh.position.addScaledVector(item.velocity, dt);
        item.mesh.rotation.x += dt * 8;
        item.mesh.rotation.y += dt * 9;
        item.material.opacity = Math.max(0, item.life / item.maxLife);
      }
      if (item.life <= 0) {
        this.scene.remove(item.mesh);
        if (item.shared) {
          item.shared.remaining -= 1;
          if (item.shared.remaining === 0) {
            item.geometry.dispose();
            item.material.dispose();
          }
        } else {
          item.geometry.dispose();
          item.material.dispose();
        }
        this.items.splice(i, 1);
      }
    }
  }

  clear() {
    const sharedResources = new Set();
    for (const item of this.items) {
      this.scene.remove(item.mesh);
      if (item.shared) sharedResources.add(item.shared);
      else {
        item.geometry.dispose();
        item.material.dispose();
      }
    }
    for (const resource of sharedResources) {
      resource.geometry.dispose();
      resource.material.dispose();
    }
    this.items.length = 0;
  }
}
