import { CharacterController } from './CharacterBase';
import { hashString, mulberry32 } from '../utils/rng';

/**
 * Ambient villager: loops the roam ring at a leisurely pace, pausing at
 * waypoints with idle sway before picking up the next leg.
 */
export class VillagerController extends CharacterController {
  private state: 'walk' | 'pause' = 'walk';
  private index = 0;
  private pauseTimer = 0;
  private phase = 0;
  private readonly rng: () => number;
  private readonly speed: number;
  private readonly pauseRange: [number, number];

  constructor(...args: ConstructorParameters<typeof CharacterController>) {
    super(...args);
    const params = this.entry.params;
    this.speed = params.speed ?? 0.65;
    this.pauseRange = params.pauseSeconds ?? [2, 4];
    this.rng = mulberry32(hashString(this.entry.id));
    this.index = Math.min(Math.max(params.startIndex ?? 0, 0), Math.max(0, this.path.length - 1));
    if (this.path.length > 0) {
      const target = this.path[this.index];
      this.root.position.set(target.x, target.y, target.z);
    }
  }

  update(dt: number, elapsed: number): void {
    this.tickMixer(dt);
    this.resetPose();

    if (this.path.length < 2) {
      this.idle(elapsed);
      return;
    }

    if (this.state === 'walk') {
      const target = this.path[this.index];
      const dx = target.x - this.root.position.x;
      const dz = target.z - this.root.position.z;
      const distance = Math.hypot(dx, dz);

      if (distance < 0.12) {
        this.state = 'pause';
        this.pauseTimer = this.pauseRange[0] + this.rng() * (this.pauseRange[1] - this.pauseRange[0]);
        this.index = (this.index + 1) % this.path.length;
      } else {
        const step = Math.min(distance, this.speed * dt);
        this.root.position.x += (dx / distance) * step;
        this.root.position.z += (dz / distance) * step;
        this.faceTowards(dx, dz, dt, 4.5);
        this.phase += dt * this.speed * 7;
      }
    } else {
      this.pauseTimer -= dt;
      if (this.pauseTimer <= 0) this.state = 'walk';
    }

    if (this.state === 'walk') {
      this.walkCycle(this.phase, 0.85);
      this.root.position.y = this.baseY + Math.abs(Math.sin(this.phase)) * 0.03;
    } else {
      this.root.position.y = this.baseY;
    }

    this.breathe(elapsed, 1);
    if (!this.usesClips) {
      this.rig.head.rotation.y += 0.35 * Math.sin(elapsed * 0.9);
      this.rig.torso.rotation.y += 0.08 * Math.sin(elapsed * 0.6);
    }
  }

  private idle(elapsed: number): void {
    this.root.position.y = this.baseY;
    this.breathe(elapsed, 1);
  }
}
