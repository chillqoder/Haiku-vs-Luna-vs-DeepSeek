import * as THREE from 'three';

export function stepVertical(entity, dt, gravity = 19) {
  const previousY = entity.group.position.y;
  entity.velocity.y -= gravity * dt;
  if (entity.group.position.y + entity.velocity.y * dt <= 0) {
    entity.group.position.y = 0;
    entity.velocity.y = 0;
    return previousY > 0.05;
  }
  entity.group.position.y += entity.velocity.y * dt;
  return false;
}

export function dampMovement(velocity, input, speed, damping, dt) {
  return THREE.MathUtils.damp(velocity, input * speed, damping, dt);
}

export function inAttackRange(source, target, facing, range, depth, radial = false) {
  const dx = target.group.position.x - source.group.position.x;
  const dz = target.group.position.z - source.group.position.z;
  if (radial) return Math.hypot(dx, dz * 1.25) <= range;
  const forward = dx * facing;
  return forward > -0.35 && forward <= range && Math.abs(dz) <= depth;
}
