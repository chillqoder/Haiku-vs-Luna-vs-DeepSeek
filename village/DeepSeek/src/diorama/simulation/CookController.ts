import { CharacterController, lerp, smoothstep } from './CharacterBase';

/**
 * Cook loop (default 5 s): circular ladle stir over the cauldron, a taste
 * check, a brow wipe, then back to stirring.
 */
export class CookController extends CharacterController {
  private readonly loopSeconds: number;

  constructor(...args: ConstructorParameters<typeof CharacterController>) {
    super(...args);
    this.loopSeconds = this.entry.params.loopSeconds ?? 5;
  }

  update(dt: number, elapsed: number): void {
    this.tickMixer(dt);
    this.resetPose();

    const loop = this.loopSeconds;
    const phase = ((elapsed + (this.entry.params.phaseOffset ?? 0)) % loop + loop) % loop;
    const omega = 2.8;

    let armX = -1.05;
    let armZ = -0.1;
    let headTilt = 0;

    if (phase < 2.6) {
      const blend = smoothstep(0, 0.4, phase);
      armX = (-1.05 + 0.16 * Math.cos(omega * phase)) * blend;
      armZ = (-0.1 + 0.24 * Math.sin(omega * phase)) * blend;
    } else if (phase < 3.4) {
      const t = smoothstep(2.6, 3.0, phase);
      armX = lerp(-1.05, -2.05, t);
      armZ = lerp(-0.1, -0.35, t);
      headTilt = 0.18 * t;
    } else if (phase < 4.1) {
      const t = smoothstep(3.4, 3.7, phase);
      armX = lerp(-2.05, -2.45, t);
      armZ = lerp(-0.35, 0.45, t);
      headTilt = lerp(0.18, -0.05, t);
    } else {
      const t = smoothstep(4.1, loop, phase);
      armX = lerp(-2.45, -1.05 + 0.16, t);
      armZ = lerp(0.45, -0.1, t);
      headTilt = lerp(-0.05, 0, t);
    }

    if (!this.usesClips) {
      this.rig.armR.rotation.x += armX;
      this.rig.armR.rotation.z += armZ;
      this.rig.armL.rotation.x += -0.25;
      this.rig.torso.rotation.x += 0.12;
      this.rig.torso.rotation.y += 0.08 * Math.sin(omega * phase * 0.5);
      this.rig.head.rotation.x += headTilt;
    }

    this.breathe(elapsed, 0.6);
  }
}
