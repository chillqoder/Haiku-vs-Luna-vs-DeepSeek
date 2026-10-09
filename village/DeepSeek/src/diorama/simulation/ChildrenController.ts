import { CharacterController, dampAngle } from './CharacterBase';

/**
 * Children tag loop: both runners orbit the village well on a shared circle;
 * child B trails child A by `trailAngle` and surges/ebbs for a chasing feel.
 */
export class ChildrenController extends CharacterController {
  private phase = 0;

  update(dt: number, elapsed: number): void {
    this.tickMixer(dt);
    this.resetPose();

    const params = this.entry.params;
    const center = params.center ?? this.entry.position;
    const radius = params.radius ?? 2.6;
    const angularSpeed = params.angularSpeed ?? 0.85;
    const trailAngle = params.trailAngle ?? 0;
    const startAngle = params.startAngle ?? 0;

    const surge = trailAngle > 0 ? 1 + 0.18 * Math.sin(elapsed * 1.1) : 1;
    const angle = startAngle + angularSpeed * elapsed - trailAngle * surge * Math.sign(angularSpeed || 1);

    const x = center[0] + Math.cos(angle) * radius;
    const z = center[2] + Math.sin(angle) * radius;
    this.root.position.x = x;
    this.root.position.z = z;

    const direction = Math.sign(angularSpeed) || 1;
    const dx = -Math.sin(angle) * direction;
    const dz = Math.cos(angle) * direction;
    this.root.rotation.y = dampAngle(this.root.rotation.y, Math.atan2(dx, dz), 12, dt);

    this.phase += dt * 10;
    this.walkCycle(this.phase, 1.3);
    this.root.position.y = center[1] + Math.abs(Math.sin(this.phase)) * 0.05;

    if (!this.usesClips) {
      this.rig.torso.rotation.x += 0.14;
      this.rig.armL.rotation.z += 0.25;
      this.rig.armR.rotation.z += -0.25;
      this.rig.head.rotation.y += 0.12 * Math.sin(elapsed * 1.6);
    }

    this.breathe(elapsed, 0.3);
  }
}
