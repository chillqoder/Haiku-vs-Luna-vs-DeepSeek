import { Clock } from 'three';

/**
 * Delta-time wrapper around THREE.Clock. Deltas are clamped so a background
 * tab (or a long GC pause) can never teleport NPC waypoint interpolation.
 */
export class Time {
  private readonly clock = new Clock(false);
  private started = false;

  update(): number {
    if (!this.started) {
      this.clock.start();
      this.started = true;
      return 0;
    }
    return Math.min(this.clock.getDelta(), 0.05);
  }

  dispose(): void {
    this.clock.stop();
  }
}
