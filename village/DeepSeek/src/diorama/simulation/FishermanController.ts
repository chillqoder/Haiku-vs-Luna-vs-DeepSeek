import * as THREE from 'three';
import { CharacterController, lerp, smoothstep } from './CharacterBase';

/**
 * Fishing loop (default 8 s): seated cast, long wait with gentle rod tugs
 * that spawn expanding ripple rings on the pond, then a slow reel-in.
 */
export class FishermanController extends CharacterController {
  private readonly loopSeconds: number;
  private readonly tipPosition = new THREE.Vector3();
  private lastTug = 0;
  private previousPhase = 0;
  private tugBounce = 0;

  constructor(...args: ConstructorParameters<typeof CharacterController>) {
    super(...args);
    this.loopSeconds = this.entry.params.loopSeconds ?? 8;
  }

  update(dt: number, elapsed: number): void {
    this.tickMixer(dt);
    this.resetPose();

    const loop = this.loopSeconds;
    const phase = ((elapsed + (this.entry.params.phaseOffset ?? 0)) % loop + loop) % loop;
    if (phase < this.previousPhase) this.lastTug = 0;
    this.previousPhase = phase;

    let armX = -1.35;

    if (phase < 0.9) {
      armX = lerp(-0.75, -1.75, smoothstep(0, 0.9, phase));
    } else if (phase < 6) {
      armX = -1.35 + 0.05 * Math.sin(phase * 2.1);
      const tugIndex = Math.floor(phase / 1.5);
      if (tugIndex !== this.lastTug && tugIndex > 0) {
        this.lastTug = tugIndex;
        this.tugBounce = 0.35;
        this.spawnRipple();
      }
    } else if (phase < 7.2) {
      armX = lerp(-1.35, -0.55, smoothstep(6, 7.2, phase));
      if (this.lastTug < 4) {
        this.lastTug = 4;
        this.spawnRipple();
      }
    } else {
      armX = lerp(-0.55, -0.75, smoothstep(7.2, loop, phase));
    }

    this.tugBounce = Math.max(0, this.tugBounce - dt * 1.5);

    if (!this.usesClips) {
      this.rig.legL.rotation.x += -1.45;
      this.rig.legR.rotation.x += -1.45;
      this.rig.torso.rotation.x += -0.1;
      this.rig.armR.rotation.x += armX - this.tugBounce * 0.25;
      this.rig.armR.rotation.z += -0.15;
      this.rig.armL.rotation.x += -0.55;
      this.rig.head.rotation.x += 0.1;
    }

    this.breathe(elapsed, 0.4);
  }

  private spawnRipple(): void {
    const water = this.ctx.water;
    if (!water) return;
    const tip = this.rig.tool.userData.tip;
    if (tip instanceof THREE.Object3D) {
      tip.getWorldPosition(this.tipPosition);
      water.spawnRipple(this.tipPosition.x, this.tipPosition.z);
      return;
    }
    const forwardX = Math.sin(this.root.rotation.y);
    const forwardZ = Math.cos(this.root.rotation.y);
    water.spawnRipple(this.root.position.x + forwardX * 1.4, this.root.position.z + forwardZ * 1.4);
  }
}
