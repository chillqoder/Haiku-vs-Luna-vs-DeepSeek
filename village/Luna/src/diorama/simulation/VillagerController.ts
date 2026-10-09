import type { CharacterActor } from "./CharacterFactory";

export class VillagerController {
  update(actor: CharacterActor, time: number, delta: number, onRipple?: () => void) {
    const offset = actor.config.startOffset ?? 0;
    if (actor.kind === "lumberjack") this.updateLumberjack(actor, time + offset);
    else if (actor.kind === "cook") this.updateCook(actor, time + offset);
    else if (actor.kind === "fisherman") this.updateFisherman(actor, time + offset, onRipple);
    else if (actor.kind === "child") this.updateChild(actor, time + offset);
    else this.updateAmbient(actor, time + offset);
  }

  private updateLumberjack(actor: CharacterActor, time: number) {
    const phase = (time % 4) / 4;
    const lift = phase < 0.42 ? phase / 0.42 : phase < 0.55 ? 1 : phase < 0.7 ? 1 - (phase - 0.55) / 0.15 : 0;
    const strike = phase >= 0.42 && phase < 0.55 ? (phase - 0.42) / 0.13 : phase >= 0.55 && phase < 0.7 ? 1 - (phase - 0.55) / 0.15 : 0;
    actor.rightArm.rotation.z = -0.35 - lift * 0.95 + strike * 0.25;
    actor.leftArm.rotation.z = 0.28 + lift * 0.9 - strike * 0.22;
    actor.rightArm.rotation.x = -0.15 - lift * 0.7 + strike * 1.2;
    actor.leftArm.rotation.x = -0.1 - lift * 0.45 + strike * 0.75;
    actor.torso.rotation.x = strike * 0.18;
    actor.head.rotation.x = strike * 0.08;
    actor.leftLeg.rotation.x = Math.sin(time * Math.PI * 2) * 0.025;
    actor.rightLeg.rotation.x = -actor.leftLeg.rotation.x;
  }

  private updateCook(actor: CharacterActor, time: number) {
    const phase = (time % 5) / 5;
    const stir = phase < 0.66 ? 1 : 0;
    const taste = phase >= 0.66 && phase < 0.84 ? (phase - 0.66) / 0.18 : phase >= 0.84 ? 1 - (phase - 0.84) / 0.16 : 0;
    actor.rightArm.rotation.y = stir * Math.sin(time * 4.1) * 0.35;
    actor.rightArm.rotation.z = -0.18 - taste * 0.45;
    actor.rightArm.rotation.x = -0.35 - taste * 0.52;
    actor.leftArm.rotation.z = 0.18 + Math.sin(time * 1.4) * 0.04;
    actor.torso.rotation.x = Math.sin(time * 2.1) * 0.025;
    actor.head.rotation.x = taste * -0.12 + Math.sin(time * 0.8) * 0.025;
  }

  private updateFisherman(actor: CharacterActor, time: number, onRipple?: () => void) {
    const phase = (time % 8) / 8;
    const tug = phase > 0.45 && phase < 0.6 ? Math.sin(((phase - 0.45) / 0.15) * Math.PI) : 0;
    actor.rightArm.rotation.z = -0.05 - tug * 0.28;
    actor.rightArm.rotation.x = -0.12 - tug * 0.55 + Math.sin(time * 1.4) * 0.035;
    actor.leftArm.rotation.z = 0.08;
    actor.head.rotation.x = 0.08 + Math.sin(time * 0.8) * 0.025;
    actor.torso.rotation.x = -0.04 + tug * 0.08;
    actor.torso.position.y = 0.25 + Math.sin(time * 1.1) * 0.012;
    actor.leftLeg.rotation.x = -1.32;
    actor.rightLeg.rotation.x = -1.32;
    if (phase >= 0.47 && phase < 0.49) onRipple?.();
  }

  private updateChild(actor: CharacterActor, time: number) {
    const circlePhase = time * (Math.PI * 2 / 8) + (actor.config.id === "child-2" ? 0.9 : 0);
    const centerX = 0.15;
    const centerZ = -0.95;
    const radius = 1.2;
    actor.root.position.x = centerX + Math.cos(circlePhase) * radius;
    actor.root.position.z = centerZ + Math.sin(circlePhase) * radius;
    actor.root.rotation.y = Math.atan2(-Math.sin(circlePhase), Math.cos(circlePhase));
    const stride = Math.sin(time * 8.4 + (actor.config.id === "child-2" ? 0.5 : 0)) * 0.78;
    actor.leftLeg.rotation.x = stride;
    actor.rightLeg.rotation.x = -stride;
    actor.leftArm.rotation.x = -stride * 0.72;
    actor.rightArm.rotation.x = stride * 0.72;
    actor.torso.position.y = 1.02 + Math.abs(Math.sin(time * 8.4)) * 0.06;
    actor.head.rotation.y = Math.sin(time * 3) * 0.1;
  }

  private updateAmbient(actor: CharacterActor, time: number) {
    const x = actor.homePosition[0];
    const z = actor.homePosition[2];
    actor.root.position.x = x + Math.sin(time * 0.22) * 0.38;
    actor.root.position.z = z + Math.cos(time * 0.19) * 0.28;
    const dx = Math.cos(time * 0.22) * 0.38 * 0.22;
    const dz = -Math.sin(time * 0.19) * 0.28 * 0.19;
    if (Math.hypot(dx, dz) > 0.025) actor.root.rotation.y = Math.atan2(dx, dz);
    const walk = Math.sin(time * 2.3);
    actor.leftLeg.rotation.x = walk * 0.16;
    actor.rightLeg.rotation.x = -walk * 0.16;
    actor.leftArm.rotation.x = -walk * 0.12;
    actor.rightArm.rotation.x = walk * 0.12;
    actor.head.rotation.y = Math.sin(time * 0.67) * 0.25;
    actor.torso.rotation.z = Math.sin(time * 0.48) * 0.018;
  }
}
