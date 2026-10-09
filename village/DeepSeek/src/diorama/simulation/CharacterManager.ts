import * as THREE from 'three';
import { AssetLoader } from '../utils/AssetLoader';
import { buildCharacterRig, rigFromGltfScene, type CharacterRig } from '../characters/CharacterFactory';
import { hashString } from '../utils/rng';
import { CharacterController, type WaypointPath } from './CharacterBase';
import { KingController } from './KingController';
import { GuardController } from './GuardController';
import { LumberjackController } from './LumberjackController';
import { CookController } from './CookController';
import { FishermanController } from './FishermanController';
import { ChildrenController } from './ChildrenController';
import { VillagerController } from './VillagerController';
import type {
  CharacterEntry,
  ControllerKind,
  SimulationConfig,
  SimulationContext,
} from './types';

type ControllerConstructor = new (
  entry: CharacterEntry,
  rig: CharacterRig,
  ctx: SimulationContext,
  path: WaypointPath,
) => CharacterController;

const CONTROLLERS: Record<ControllerKind, ControllerConstructor> = {
  king: KingController,
  guard: GuardController,
  lumberjack: LumberjackController,
  cook: CookController,
  fisherman: FishermanController,
  child: ChildrenController,
  roamer: VillagerController,
};

/**
 * Fetches the scene manifest from the Next.js API route, instantiates one
 * specialized controller per NPC entry, and drives them from the render
 * loop. Every entry prefers its GLB (when configured) and transparently
 * falls back to the procedural rig otherwise.
 */
export class CharacterManager {
  private readonly group = new THREE.Group();
  private readonly loader: AssetLoader;
  private controllers: CharacterController[] = [];
  private timeScale = 1;
  private elapsed = 0;

  constructor(
    private readonly scene: THREE.Scene,
    private readonly context: SimulationContext,
  ) {
    this.group.name = 'characters';
    this.scene.add(this.group);
    this.loader = new AssetLoader();
  }

  async load(configUrl: string): Promise<SimulationConfig> {
    const response = await fetch(configUrl, { cache: 'no-store' });
    if (!response.ok) {
      throw new Error(`simulation-config request failed with ${response.status}`);
    }
    const config = (await response.json()) as SimulationConfig;
    this.timeScale = config.timeScale || 1;

    this.clearControllers();
    for (const entry of config.characters) {
      const rig = await this.createRig(entry);
      const path = entry.params.waypointPath
        ? config.waypoints[entry.params.waypointPath] ?? []
        : [];
      const ControllerClass = CONTROLLERS[entry.controller] ?? VillagerController;
      const controller = new ControllerClass(entry, rig, this.context, path);
      const mixer = rig.root.userData.mixer;
      if (mixer instanceof THREE.AnimationMixer) controller.attachMixer(mixer);
      this.controllers.push(controller);
      this.group.add(rig.root);
    }

    return config;
  }

  update(dt: number, _elapsed: number): void {
    const scaled = dt * this.timeScale;
    this.elapsed += scaled;
    for (const controller of this.controllers) {
      controller.update(scaled, this.elapsed);
    }
  }

  dispose(): void {
    this.clearControllers();
    this.loader.dispose();
    if (this.group.parent === this.scene) this.scene.remove(this.group);
  }

  private async createRig(entry: CharacterEntry): Promise<CharacterRig> {
    if (entry.model) {
      const asset = await this.loader.load(entry.model);
      if (asset) {
        const rig = rigFromGltfScene(asset.scene);
        if (asset.animations.length > 0) {
          const clip =
            (entry.clip ? THREE.AnimationClip.findByName(asset.animations, entry.clip) : null) ??
            asset.animations[0];
          const mixer = new THREE.AnimationMixer(rig.root);
          mixer.clipAction(clip).play();
          rig.root.userData.mixer = mixer;
        }
        return rig;
      }
    }
    return buildCharacterRig({ kind: entry.kind, seed: hashString(entry.id) });
  }

  private clearControllers(): void {
    for (const controller of this.controllers) {
      controller.dispose();
      const mixer = controller.root.userData.mixer;
      if (mixer instanceof THREE.AnimationMixer) mixer.stopAllAction();
    }
    this.controllers = [];
    this.group.clear();
    this.elapsed = 0;
  }
}
