import * as THREE from 'three';
import type { CharacterRig } from '../characters/CharacterFactory';
import type { CharacterEntry, SimulationContext } from './types';

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function smoothstep(edge0: number, edge1: number, value: number): number {
  if (edge1 === edge0) return value >= edge1 ? 1 : 0;
  const t = Math.min(1, Math.max(0, (value - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

export function dampAngle(current: number, target: number, rate: number, dt: number): number {
  let delta = target - current;
  delta = Math.atan2(Math.sin(delta), Math.cos(delta));
  return current + delta * (1 - Math.exp(-rate * dt));
}

export type WaypointPath = ReadonlyArray<[number, number, number]>;

/**
 * Shared behavior for every NPC: owns the rig, base transform, resolved
 * waypoint path, optional GLTF AnimationMixer, pose reset and common walk /
 * breathing cycles. When a GLB supplies animation clips the procedural limb
 * animation steps aside, but root navigation always runs.
 */
export abstract class CharacterController {
  readonly root: THREE.Group;

  protected readonly rig: CharacterRig;
  protected readonly entry: CharacterEntry;
  protected readonly ctx: SimulationContext;
  protected readonly path: THREE.Vector3[];
  protected readonly baseY: number;

  private mixer: THREE.AnimationMixer | null = null;

  constructor(
    entry: CharacterEntry,
    rig: CharacterRig,
    ctx: SimulationContext,
    path: WaypointPath = [],
  ) {
    this.entry = entry;
    this.rig = rig;
    this.ctx = ctx;
    this.root = rig.root;
    this.root.name = `character:${entry.id}`;
    this.root.position.set(entry.position[0], entry.position[1], entry.position[2]);
    this.root.rotation.y = entry.rotationY;
    this.baseY = entry.position[1];
    this.path = path.map((point) => new THREE.Vector3(point[0], point[1], point[2]));
  }

  attachMixer(mixer: THREE.AnimationMixer): void {
    this.mixer = mixer;
    this.rig.animatedByClips = true;
  }

  protected get usesClips(): boolean {
    return this.rig.animatedByClips;
  }

  protected resetPose(): void {
    if (this.usesClips) return;
    for (const part of this.rig.parts) {
      part.obj.position.copy(part.restPosition);
      part.obj.rotation.copy(part.restRotation);
    }
  }

  protected breathe(elapsed: number, amount = 1): void {
    if (this.usesClips) return;
    this.rig.torso.position.y += 0.008 * amount * Math.sin(elapsed * 1.7);
    this.rig.torso.rotation.z += 0.02 * amount * Math.sin(elapsed * 1.1);
  }

  protected walkCycle(phase: number, intensity = 1): void {
    if (this.usesClips) return;
    const swing = Math.sin(phase);
    this.rig.legL.rotation.x += -0.55 * intensity * swing;
    this.rig.legR.rotation.x += 0.55 * intensity * swing;
    this.rig.armL.rotation.x += 0.4 * intensity * swing;
    this.rig.armR.rotation.x += -0.4 * intensity * swing;
  }

  protected faceTowards(dx: number, dz: number, dt: number, rate = 8): void {
    const target = Math.atan2(dx, dz);
    this.root.rotation.y = dampAngle(this.root.rotation.y, target, rate, dt);
  }

  protected tickMixer(dt: number): void {
    this.mixer?.update(dt);
  }

  abstract update(dt: number, elapsed: number): void;

  dispose(): void {
    this.mixer?.stopAllAction();
    this.mixer?.uncacheRoot(this.rig.root);
    this.mixer = null;
  }
}
