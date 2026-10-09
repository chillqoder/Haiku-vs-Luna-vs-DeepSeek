import { Quaternion, Vector3 } from "three";
import type { CharacterActor } from "./CharacterFactory";

const smooth = (value: number) => value * value * (3 - 2 * value);

export class KingController {
  update(actor: CharacterActor, time: number, delta: number) {
    const phase = ((time + (actor.config.startOffset ?? 0)) % 8) / 8;
    const survey = phase < 0.42 ? phase / 0.42 : phase < 0.54 ? 1 - (phase - 0.42) / 0.12 : 0;
    actor.head.rotation.y = Math.sin(survey * Math.PI) * 0.48 - 0.22;
    actor.head.rotation.x = Math.sin(time * 0.75) * 0.035;

    const gesture = phase >= 0.54 && phase < 0.77 ? (phase - 0.54) / 0.23 : phase >= 0.77 ? 1 - Math.min((phase - 0.77) / 0.23, 1) : 0;
    const lift = smooth(Math.max(0, Math.min(gesture, 1)));
    actor.rightArm.rotation.z = -0.18 - lift * 0.42;
    actor.rightArm.rotation.x = -lift * 1.12;
    actor.leftArm.rotation.z = 0.12;
    actor.torso.rotation.y = Math.sin(time * (Math.PI * 2 / 8)) * 0.035;
    actor.leftLeg.rotation.x = Math.sin(time * 0.8) * 0.012;
    actor.rightLeg.rotation.x = -actor.leftLeg.rotation.x;

    const desired = new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), actor.config.facing ?? Math.PI);
    actor.root.quaternion.slerp(desired, Math.min(delta * 2, 1));
  }
}
