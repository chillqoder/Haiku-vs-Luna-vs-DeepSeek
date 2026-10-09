import { CharacterController, lerp, smoothstep } from './CharacterBase';

/**
 * Royal loop (default 8 s): surveys the land left-to-right, raises a hand in
 * a royal gesture toward the village, then returns to idle rest.
 */
export class KingController extends CharacterController {
  private readonly loopSeconds: number;

  constructor(...args: ConstructorParameters<typeof CharacterController>) {
    super(...args);
    this.loopSeconds = this.entry.params.loopSeconds ?? 8;
  }

  update(dt: number, elapsed: number): void {
    this.tickMixer(dt);
    this.resetPose();

    const loop = this.loopSeconds;
    const phase = ((elapsed + (this.entry.params.phaseOffset ?? 0)) % loop + loop) % loop;

    let headYaw = 0;
    let armLift = 0;
    let wave = 0;

    if (phase < 3.2) {
      headYaw = lerp(-0.65, 0.65, smoothstep(0, 3.2, phase));
    } else if (phase < 4.2) {
      headYaw = 0.65;
    } else if (phase < 5.4) {
      headYaw = lerp(0.65, 0, smoothstep(4.2, 5.4, phase));
      armLift = smoothstep(4.2, 5.4, phase);
    } else if (phase < 6.6) {
      headYaw = -0.1;
      armLift = 1;
      wave = Math.sin((phase - 5.4) * 9) * 0.25;
    } else {
      const settle = smoothstep(6.6, 8, phase);
      headYaw = lerp(-0.1, 0, settle);
      armLift = 1 - settle;
    }

    if (!this.usesClips) {
      this.rig.head.rotation.y = headYaw;
      this.rig.head.rotation.x = 0.05 * Math.sin(phase * 0.8);
      this.rig.armR.rotation.x += -2.45 * armLift;
      this.rig.armR.rotation.z += 0.35 * armLift + wave;
      this.rig.armL.rotation.z += -0.12 * armLift;
    }

    this.breathe(elapsed, 0.6);
  }
}
