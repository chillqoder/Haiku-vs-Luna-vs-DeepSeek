import { Quaternion, Vector3 } from "three";
import type { Vec3Tuple } from "../types";
import type { CharacterActor } from "./CharacterFactory";

const UP = new Vector3(0, 1, 0);

function pointOnRoute(points: Vec3Tuple[], progress: number) {
  const route = points.length > 1 ? points : [[0, 0, 0], [0, 0, 0]] as Vec3Tuple[];
  const lengths: number[] = [];
  let total = 0;
  for (let i = 0; i < route.length - 1; i += 1) {
    const a = new Vector3(...route[i]);
    const b = new Vector3(...route[i + 1]);
    const length = a.distanceTo(b);
    lengths.push(length);
    total += length;
  }
  let distance = Math.max(0, Math.min(1, progress)) * total;
  for (let i = 0; i < lengths.length; i += 1) {
    if (distance <= lengths[i] || i === lengths.length - 1) {
      const amount = lengths[i] > 0 ? distance / lengths[i] : 0;
      const start = route[i];
      const end = route[i + 1];
      const position = new Vector3(...start).lerp(new Vector3(...end), amount);
      const direction = new Vector3(end[0] - start[0], 0, end[2] - start[2]).normalize();
      return { position, direction };
    }
    distance -= lengths[i];
  }
  return { position: new Vector3(...route[0]), direction: new Vector3(0, 0, 1) };
}

export class GuardController {
  update(actor: CharacterActor, time: number, delta: number) {
    const route = actor.config.patrol ?? [actor.homePosition, actor.homePosition];
    const phase = ((time + (actor.config.startOffset ?? 0)) % 30 + 30) % 30;
    const outbound = phase < 12;
    const returning = phase >= 15 && phase < 27;
    let progress = 0;
    let walking = false;
    let direction = new Vector3(0, 0, 1);

    if (outbound) {
      progress = phase / 12;
      walking = true;
    } else if (phase >= 15 && phase < 27) {
      progress = 1 - (phase - 15) / 12;
      walking = true;
    } else {
      progress = phase < 15 ? 1 : 0;
    }

    const point = pointOnRoute(route, progress);
    direction.copy(point.direction);
    if (returning || phase >= 27) direction.negate();
    if (phase >= 14 && phase < 15) direction.copy(point.direction).applyAxisAngle(UP, Math.PI * (phase - 14));
    if (phase >= 29) direction.copy(point.direction).negate().applyAxisAngle(UP, Math.PI * (phase - 29));
    if (walking) {
      actor.root.position.copy(point.position);
    }
    const yaw = Math.atan2(direction.x, direction.z);
    const targetRotation = new Quaternion().setFromAxisAngle(UP, yaw);
    actor.root.quaternion.slerp(targetRotation, Math.min(delta * 4.5, 1));

    const stride = walking ? Math.sin(time * 7.4 + (actor.config.startOffset ?? 0)) * 0.42 : 0;
    actor.leftLeg.rotation.x = stride;
    actor.rightLeg.rotation.x = -stride;
    actor.leftArm.rotation.x = -stride * 0.42;
    actor.rightArm.rotation.x = stride * 0.42;
    actor.leftArm.rotation.z = 0.08;
    actor.rightArm.rotation.z = -0.08;
    actor.torso.position.y = 1.02 + (walking ? Math.abs(stride) * 0.025 : Math.sin(time * 1.3) * 0.008);
    actor.head.rotation.y = walking ? 0 : Math.sin(time * 0.8 + (actor.config.startOffset ?? 0)) * 0.06;
  }
}
