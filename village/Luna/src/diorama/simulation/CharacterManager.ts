import {
  AnimationMixer,
  DoubleSide,
  Group,
  Mesh,
  MeshStandardMaterial,
  RingGeometry,
  Scene,
} from "three";
import { DEFAULT_SIMULATION_MANIFEST } from "../defaultManifest";
import type { SimulationManifest, Vec3Tuple } from "../types";
import { AssetLoader } from "../utils/AssetLoader";
import { disposeObjectTree } from "../utils/dispose";
import { createCharacter, type CharacterActor } from "./CharacterFactory";
import { GuardController } from "./GuardController";
import { KingController } from "./KingController";
import { VillagerController } from "./VillagerController";
import { clone as cloneSkeleton } from "three/addons/utils/SkeletonUtils.js";

interface Ripple {
  mesh: Mesh<RingGeometry, MeshStandardMaterial>;
  age: number;
}

/** Loads the scene manifest and advances one controller per islander. */
export class CharacterManager {
  readonly actors: CharacterActor[] = [];
  private readonly assetLoader = new AssetLoader();
  private readonly kingController = new KingController();
  private readonly guardController = new GuardController();
  private readonly villagerController = new VillagerController();
  private readonly abortController = new AbortController();
  private readonly ripples: Ripple[] = [];
  private rippleCenter: Vec3Tuple;
  private disposed = false;

  constructor(private readonly scene: Scene, rippleCenter: Vec3Tuple) {
    this.rippleCenter = rippleCenter;
  }

  setIslandCenter(center: Vec3Tuple) {
    this.rippleCenter = [center[0] - 4.08, center[1] + 0.37, center[2] + 0.55];
  }

  async initialize(onManifestLoaded?: (manifest: SimulationManifest) => void) {
    let manifest: SimulationManifest = DEFAULT_SIMULATION_MANIFEST;
    try {
      const response = await fetch("/api/simulation-config", { signal: this.abortController.signal, cache: "no-store" });
      if (!response.ok) throw new Error(`Simulation config returned ${response.status}`);
      const candidate = (await response.json()) as SimulationManifest;
      if (!candidate || !Array.isArray(candidate.characters)) throw new Error("Simulation config has no character list");
      manifest = candidate;
    } catch (error) {
      if (this.abortController.signal.aborted) return;
      console.warn("Using the bundled simulation manifest because the API was unavailable.", error);
    }

    onManifestLoaded?.(manifest);

    for (const config of manifest.characters.slice(0, 14)) {
      if (this.disposed) return;
      const actor = createCharacter(this.scene, config);
      this.actors.push(actor);
      if (!config.assetPath) continue;

      try {
        const gltf = await this.assetLoader.loadGLTF(config.assetPath);
        if (this.disposed) return;
        const model = cloneSkeleton(gltf.scene);
        model.name = `${config.name} authored model`;
        actor.root.add(model);
        actor.torso.visible = false;
        actor.head.visible = false;
        actor.leftArm.visible = false;
        actor.rightArm.visible = false;
        actor.leftLeg.visible = false;
        actor.rightLeg.visible = false;
        if (gltf.animations.length > 0) {
          const mixer = new AnimationMixer(model);
          const clip = gltf.animations.find((candidateClip) =>
            candidateClip.name.toLowerCase().includes((config.clip ?? "").toLowerCase()),
          ) ?? gltf.animations[0];
          mixer.clipAction(clip).play();
          actor.mixer = mixer;
        }
      } catch (error) {
        console.warn(`Could not load ${config.assetPath}; keeping the procedural ${config.kind} model.`, error);
      }
    }
  }

  update(time: number, delta: number) {
    if (this.disposed) return;
    for (const actor of this.actors) {
      actor.mixer?.update(delta);
      if (actor.kind === "king") this.kingController.update(actor, time, delta);
      else if (actor.kind === "guard") this.guardController.update(actor, time, delta);
      else {
        const rippleAt = actor.kind === "fisherman" ? () => this.spawnRipple() : undefined;
        this.villagerController.update(actor, time, delta, rippleAt);
      }
    }
    this.updateRipples(delta);
  }

  private spawnRipple() {
    if (this.disposed) return;
    if (this.ripples.length >= 4) this.removeRipple(this.ripples[0]);
    const material = new MeshStandardMaterial({
      color: "#edf6dc",
      emissive: "#cbdcc8",
      emissiveIntensity: 0.24,
      transparent: true,
      opacity: 0.52,
      depthWrite: false,
      side: DoubleSide,
      flatShading: true,
    });
    const mesh = new Mesh(new RingGeometry(0.12, 0.17, 24), material);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(...this.rippleCenter);
    mesh.renderOrder = 2;
    this.scene.add(mesh);
    this.ripples.push({ mesh, age: 0 });
  }

  private updateRipples(delta: number) {
    for (const ripple of [...this.ripples]) {
      ripple.age += delta;
      const phase = Math.min(ripple.age / 1.45, 1);
      ripple.mesh.scale.setScalar(0.55 + phase * 4.8);
      ripple.mesh.material.opacity = (1 - phase) * 0.52;
      if (phase >= 1) this.removeRipple(ripple);
    }
  }

  private removeRipple(ripple: Ripple) {
    this.scene.remove(ripple.mesh);
    ripple.mesh.geometry.dispose();
    ripple.mesh.material.dispose();
    const index = this.ripples.indexOf(ripple);
    if (index >= 0) this.ripples.splice(index, 1);
  }

  dispose() {
    this.disposed = true;
    this.abortController.abort();
    for (const actor of this.actors) {
      actor.mixer?.stopAllAction();
      // Stop actions before the optional GLTF child is disposed with its actor subtree.
      this.scene.remove(actor.root);
      disposeObjectTree(actor.root);
    }
    this.actors.length = 0;
    for (const ripple of [...this.ripples]) this.removeRipple(ripple);
    this.assetLoader.dispose();
  }
}
