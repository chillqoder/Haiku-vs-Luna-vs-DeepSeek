import { Clock } from "three";

export class Time {
  private readonly clock = new Clock();
  private started = false;
  delta = 0;
  elapsed = 0;

  tick() {
    if (!this.started) {
      this.clock.start();
      this.started = true;
      this.delta = 0;
      this.elapsed = 0;
      return;
    }

    this.delta = Math.min(this.clock.getDelta(), 0.05);
    this.elapsed = this.clock.elapsedTime;
  }

  dispose() {
    this.clock.stop();
  }
}
