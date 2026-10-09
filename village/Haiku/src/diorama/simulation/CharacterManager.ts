import * as THREE from 'three';
import type { GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import type { AssetLoader } from '../utils/AssetLoader';
import { CharacterController, type CharacterContext } from './CharacterController';
import { GuardController } from './GuardController';
import { KingController } from './KingController';
import { parseSimulationManifest, type CharacterConfig, type SimulationManifest } from './manifest';
import { VillagerController } from './VillagerController';

const DEFAULT_ENDPOINT = '/api/simulation-config';
const DEG_TO_RAD = Math.PI / 180;

/**
 * Загружает манифест, собирает персонажей из GLB по конфигурации и ведёт
 * их контроллеры: каждый кадр вызывает update() у всех.
 */
export class CharacterManager {
  private readonly controllers: CharacterController[] = [];
  private readonly instances: THREE.Object3D[] = [];
  private readonly ownedMaterials: THREE.Material[] = [];

  constructor(
    private readonly assets: AssetLoader,
    private readonly parent: THREE.Object3D,
    private readonly context: CharacterContext,
    private readonly endpoint = DEFAULT_ENDPOINT,
  ) {}

  /** Возвращает число созданных персонажей. Если signal отменён, ничего не добавляет. */
  async load(signal: AbortSignal): Promise<number> {
    const manifest = await this.fetchManifest(signal);

    const models = new Map<string, GLTF>();
    await Promise.all(
      Object.entries(manifest.assets.characters).map(async ([key, url]) => {
        models.set(key, await this.assets.loadGLTF(url));
      }),
    );
    if (signal.aborted) return 0;

    for (const config of manifest.characters) {
      const gltf = models.get(config.model);
      if (!gltf) throw new Error(`Модель "${config.model}" не загружена`);
      this.spawn(config, gltf, manifest);
    }
    return this.controllers.length;
  }

  update(dt: number): void {
    for (const controller of this.controllers) {
      controller.update(dt);
    }
  }

  dispose(): void {
    for (const controller of this.controllers) controller.dispose();
    for (const instance of this.instances) instance.removeFromParent();
    for (const material of this.ownedMaterials) material.dispose();
    this.controllers.length = 0;
    this.instances.length = 0;
    this.ownedMaterials.length = 0;
  }

  private async fetchManifest(signal: AbortSignal): Promise<SimulationManifest> {
    const response = await fetch(this.endpoint, { cache: 'no-store', signal });
    if (!response.ok) throw new Error(`Манифест недоступен (HTTP ${response.status})`);
    return parseSimulationManifest(await response.json());
  }

  private spawn(config: CharacterConfig, gltf: GLTF, manifest: SimulationManifest): void {
    // Геометрия общая для всех экземпляров модели, материалы клонируются под цвета из tint.
    const instance = gltf.scene.clone(true);
    instance.name = config.id;
    instance.scale.setScalar(config.scale);
    this.prepareMaterials(instance, config.tint);

    if (config.kind !== 'guard') {
      instance.position.set(...config.position);
      instance.rotation.y = config.yawDeg * DEG_TO_RAD;
    }
    this.parent.add(instance);
    this.instances.push(instance);

    switch (config.kind) {
      case 'king':
        this.controllers.push(new KingController(config.id, instance, gltf.animations, config.clips.loop));
        break;
      case 'guard': {
        const route = manifest.patrols[config.patrol];
        const clips = { walk: config.clips.walk, inspect: config.clips.inspect };
        this.controllers.push(new GuardController(config.id, instance, gltf.animations, route, config.startSeconds, clips));
        break;
      }
      case 'villager': {
        const area = config.behavior.type === 'roam' ? manifest.areas[config.behavior.area] : [];
        this.controllers.push(new VillagerController(config, instance, gltf.animations, this.context, area));
        break;
      }
    }
  }

  private prepareMaterials(root: THREE.Object3D, tint: Record<string, string>): void {
    const clones = new Map<THREE.Material, THREE.MeshStandardMaterial>();
    root.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return;
      object.castShadow = true;
      object.receiveShadow = true;

      const source = object.material as THREE.MeshStandardMaterial;
      let clone = clones.get(source);
      if (!clone) {
        clone = source.clone();
        const color = tint[source.name];
        if (color) clone.color.set(color);
        clones.set(source, clone);
        this.ownedMaterials.push(clone);
      }
      object.material = clone;
    });
  }
}
