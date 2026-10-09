// Simple AABB collision helpers, gravity integration and lane clamping.

import { PHYSICS } from '../core/Constants.js';

// Build an axis-aligned box from a "feet" position, width/height/depth.
export function boxFromFeet(pos, halfWidth, height, halfDepth) {
  return {
    minX: pos.x - halfWidth,
    maxX: pos.x + halfWidth,
    minY: pos.y,
    maxY: pos.y + height,
    minZ: pos.z - halfDepth,
    maxZ: pos.z + halfDepth,
  };
}

export function aabbOverlap(a, b) {
  return (
    a.minX <= b.maxX &&
    a.maxX >= b.minX &&
    a.minY <= b.maxY &&
    a.maxY >= b.minY &&
    a.minZ <= b.maxZ &&
    a.maxZ >= b.minZ
  );
}

// A box placed in front of an actor based on facing (+1 right / -1 left).
// `radial` attacks (spin moves) cover both sides.
export function attackBox(owner, def) {
  const facing = owner.facing;
  let minX;
  let maxX;
  if (def.radial) {
    minX = owner.position.x - def.range;
    maxX = owner.position.x + def.range;
  } else {
    const near = owner.position.x + facing * 0.25;
    const far = owner.position.x + facing * def.range;
    minX = Math.min(near, far);
    maxX = Math.max(near, far);
  }
  const halfD = def.depth;
  const yMin = owner.position.y + (def.heightMin ?? 0.7);
  const yMax = owner.position.y + (def.heightMax ?? 1.9);
  return {
    minX,
    maxX,
    minY: yMin,
    maxY: yMax,
    minZ: owner.position.z - halfD,
    maxZ: owner.position.z + halfD,
  };
}

export function circleBoxOverlap(cx, cz, radius, y, height, box) {
  const nx = Math.max(box.minX, Math.min(cx, box.maxX));
  const nz = Math.max(box.minZ, Math.min(cz, box.maxZ));
  const dx = cx - nx;
  const dz = cz - nz;
  if (dx * dx + dz * dz > radius * radius) return false;
  return y < box.maxY && y + height > box.minY;
}

// Integrate physics. Intentional movement (moveVel) is set by controllers
// every frame; knockback (knockVel) decays on its own. Gravity acts on
// velocity.y. Returns true if the entity landed this frame.
export function integrate(entity, dt) {
  const wasAirborne = entity.position.y > PHYSICS.groundY + 0.001;

  entity.velocity.y += PHYSICS.gravity * dt;

  entity.position.x += (entity.moveVel.x + entity.knockVel.x) * dt;
  entity.position.y += entity.velocity.y * dt;
  entity.position.z += (entity.moveVel.z + entity.knockVel.z) * dt;

  // Knockback decays: strong friction on the ground, mild drag in the air.
  const rate = entity.position.y > PHYSICS.groundY + 0.001 ? 1.2 : 9;
  entity.knockVel.x = approach(entity.knockVel.x, 0, rate, dt);
  entity.knockVel.z = approach(entity.knockVel.z, 0, rate, dt);

  let landed = false;
  if (entity.position.y <= PHYSICS.groundY) {
    entity.position.y = PHYSICS.groundY;
    if (entity.velocity.y < 0) landed = wasAirborne;
    entity.velocity.y = 0;
  }
  return landed;
}

export function clampToLane(entity, min = PHYSICS.laneMin, max = PHYSICS.laneMax) {
  if (entity.position.z < min) {
    entity.position.z = min;
    if (entity.velocity.z < 0) entity.velocity.z = 0;
  }
  if (entity.position.z > max) {
    entity.position.z = max;
    if (entity.velocity.z > 0) entity.velocity.z = 0;
  }
}

// Push an entity out of a static AABB (obstacles) along the shallowest axis.
export function resolveObstacle(entity, box, radius = 0.45) {
  const closestX = Math.max(box.minX, Math.min(entity.position.x, box.maxX));
  const closestZ = Math.max(box.minZ, Math.min(entity.position.z, box.maxZ));
  const dx = entity.position.x - closestX;
  const dz = entity.position.z - closestZ;
  const distSq = dx * dx + dz * dz;
  if (distSq >= radius * radius) return false;

  const dist = Math.sqrt(distSq) || 0.0001;
  const push = radius - dist;
  if (distSq < 0.000001) {
    // Deep inside: push along smallest penetration axis.
    const left = Math.abs(entity.position.x - box.minX);
    const right = Math.abs(box.maxX - entity.position.x);
    const back = Math.abs(entity.position.z - box.minZ);
    const front = Math.abs(box.maxZ - entity.position.z);
    const m = Math.min(left, right, back, front);
    if (m === left) entity.position.x = box.minX - radius;
    else if (m === right) entity.position.x = box.maxX + radius;
    else if (m === back) entity.position.z = box.minZ - radius;
    else entity.position.z = box.maxZ + radius;
    return true;
  }
  entity.position.x += (dx / dist) * push;
  entity.position.z += (dz / dist) * push;
  return true;
}

export function clamp(v, min, max) {
  return v < min ? min : v > max ? max : v;
}

export function lerp(a, b, t) {
  return a + (b - a) * t;
}

// Frame-rate independent approach.
export function approach(current, target, rate, dt) {
  return lerp(current, target, 1 - Math.exp(-rate * dt));
}

export function randRange(min, max) {
  return min + Math.random() * (max - min);
}

export function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}
