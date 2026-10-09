import { CharacterController, lerp, smoothstep } from './CharacterBase';

/**
 * Woodcutting loop (default 4 s): idle, two-handed axe raise, forceful chop
 * with impact recoil, then reset.
 */
export class LumberjackController extends CharacterController {
  private readonly loopSeconds: number;

  constructor(...args: ConstructorParameters<typeof CharacterController>) {
    super(...args);
    this.loopSeconds = this.entry.params.loopSeconds ?? 4;
  }

  update(dt: number, elapsed: number): void {
    this.tickMixer(dt);
    this.resetPose();

    const loop = this.loopSeconds;
    const phase = ((elapsed + (this.entry.params.phaseOffset ?? 0)) % loop + loop) % loop;

    let arm = 0;
    let lean = 0;

    if (phase < 0.9) {
      arm = 0;
    } else if (phase < 1.7) {
      const t = smoothstep(0.9, 1.7, phase);
      arm = t * 2.55;
      lean = -0.14 * t;
    } else if (phase < 2.05) {
      const t = smoothstep(1.7, 2.05, phase);
      arm = lerp(2.55, -0.95, t);
      lean = lerp(-0.14, 0.3, t);
    } else if (phase < 2.6) {
      const recoil = 1 - (phase - 2.05) / 0.55;
      arm = -0.95 + 0.1 * recoil * Math.sin((phase - 2.05) * 20);
      lean = 0.3;
    } else {
      const t = smoothstep(2.6, loop, phase);
      arm = lerp(-0.95, 0, t);
      lean = lerp(0.3, 0, t);
    }

    if (!this.usesClips) {
      this.rig.armL.rotation.x += arm;
      this.rig.armR.rotation.x += arm;
      this.rig.armL.rotation.z += arm > 0.2 ? 0.12 : 0;
      this.rig.armR.rotation.z += arm > 0.2 ? -0.12 : 0;
      this.rig.torso.rotation.x += lean;
      this.rig.head.rotation.x += phase > 1.7 && phase < 2.6 ? 0.18 : 0;
      this.rig.legL.rotation.x += -0.18;
      this.rig.legR.rotation.x += 0.18;
    }

    this.breathe(elapsed, 0.5);
  }
}
