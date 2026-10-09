import { CharacterController, smoothstep } from './CharacterBase';

type GuardState = 'walk' | 'inspect' | 'turn';

/**
 * Patrol logic: ping-pong waypoint interpolation, a pause to inspect at each
 * leg, and a 180° quaternion-style slerp turn before walking back.
 */
export class GuardController extends CharacterController {
  private state: GuardState = 'walk';
  private index: number;
  private direction: 1 | -1;
  private phase = 0;
  private timer = 0;
  private turnFrom = 0;
  private turnTo = 0;

  private readonly speed: number;
  private readonly inspectSeconds: number;

  constructor(...args: ConstructorParameters<typeof CharacterController>) {
    super(...args);
    const params = this.entry.params;
    this.speed = params.speed ?? 1.1;
    this.inspectSeconds = params.inspectSeconds ?? 2;
    this.index = Math.min(Math.max(params.startIndex ?? 0, 0), Math.max(0, this.path.length - 1));
    this.direction = params.startForward === false ? -1 : 1;
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

    switch (this.state) {
      case 'walk':
        this.walk(dt);
        break;
      case 'inspect':
        this.timer -= dt;
        if (this.timer <= 0) {
          this.state = 'turn';
          this.timer = 0;
          this.turnFrom = this.root.rotation.y;
          this.turnTo = this.turnFrom + Math.PI;
        }
        break;
      case 'turn':
        this.timer = Math.min(1, this.timer + dt / 0.9);
        this.root.rotation.y = this.turnFrom + (this.turnTo - this.turnFrom) * smoothstep(0, 1, this.timer);
        if (this.timer >= 1) {
          this.direction = this.direction === 1 ? -1 : 1;
          this.index = Math.min(Math.max(this.index + this.direction, 0), this.path.length - 1);
          this.state = 'walk';
        }
        break;
    }

    this.pose(elapsed);
  }

  private walk(dt: number): void {
    const target = this.path[this.index];
    const dx = target.x - this.root.position.x;
    const dz = target.z - this.root.position.z;
    const distance = Math.hypot(dx, dz);

    if (distance < 0.12) {
      const atEnd = this.index === this.path.length - 1 && this.direction === 1;
      const atStart = this.index === 0 && this.direction === -1;
      if (atEnd || atStart) {
        this.state = 'inspect';
        this.timer = this.inspectSeconds;
      } else {
        this.index += this.direction;
      }
      return;
    }

    const step = Math.min(distance, this.speed * dt);
    this.root.position.x += (dx / distance) * step;
    this.root.position.z += (dz / distance) * step;
    this.faceTowards(dx, dz, dt, 10);
    this.phase += dt * this.speed * 7.2;
  }

  private pose(elapsed: number): void {
    if (this.state === 'walk') {
      this.walkCycle(this.phase);
      this.root.position.y = this.baseY + Math.abs(Math.sin(this.phase)) * 0.035;
    } else {
      this.root.position.y = this.baseY;
    }

    if (!this.usesClips) {
      this.rig.armR.rotation.x = -0.3;
      if (this.state === 'inspect') {
        this.rig.head.rotation.y = 0.55 * Math.sin(elapsed * 2.2);
      }
    }

    this.breathe(elapsed * 0.6, 0.4);
  }

  private idle(elapsed: number): void {
    this.root.position.y = this.baseY;
    if (!this.usesClips) {
      this.rig.head.rotation.y = 0.3 * Math.sin(elapsed * 0.7);
    }
    this.breathe(elapsed, 0.4);
  }
}
