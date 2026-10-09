// Физика: гравитация, AABB-пересечения, выталкивание из препятствий и разведение сущностей.

export const GRAVITY = -34;
export const GROUND_Y = 0;
export const LANE_MIN = -2.2; // пределы глубины (ось Z): «полосы» улицы
export const LANE_MAX = 2.2;

export function clamp(v, min, max) {
  return v < min ? min : v > max ? max : v;
}

export function rand(min, max) {
  return min + Math.random() * (max - min);
}

// Коробка: { x, y, z, hw, hh, hd } — центр и полуразмеры
export function aabbOverlap(a, b) {
  return Math.abs(a.x - b.x) < a.hw + b.hw &&
    Math.abs(a.y - b.y) < a.hh + b.hh &&
    Math.abs(a.z - b.z) < a.hd + b.hd;
}

// Выталкивает сущность из твёрдых препятствий по оси с наименьшим проникновением.
// Препятствие блокирует только сущность, которая находится ниже его верхней грани.
export function resolveSolids(ent, solids) {
  for (const s of solids) {
    if (!s.solid || ent.pos.y >= s.top - 0.12) continue;
    const eb = ent.box;
    const sb = s.box;
    if (!aabbOverlap(eb, sb)) continue;
    const dx = eb.x - sb.x;
    const dz = eb.z - sb.z;
    const penX = eb.hw + sb.hw - Math.abs(dx);
    const penZ = eb.hd + sb.hd - Math.abs(dz);
    if (penX < penZ) {
      const dir = dx !== 0 ? Math.sign(dx) : (ent.moveVel.x >= 0 ? -1 : 1);
      ent.pos.x += dir * penX;
    } else {
      const dir = dz !== 0 ? Math.sign(dz) : 1;
      ent.pos.z += dir * penZ;
    }
  }
  ent.pos.z = clamp(ent.pos.z, LANE_MIN, LANE_MAX);
}

// Разводит две сущности по X, чтобы они не стояли друг в друге.
export function separate(a, b) {
  if (Math.abs(a.pos.y - b.pos.y) > 0.9) return;
  if (Math.abs(a.pos.z - b.pos.z) >= a.halfD + b.halfD) return;
  const dx = a.pos.x - b.pos.x;
  const pen = a.halfW + b.halfW - Math.abs(dx);
  if (pen <= 0) return;
  const push = (dx !== 0 ? Math.sign(dx) : (Math.random() < 0.5 ? -1 : 1)) * pen * 0.5;
  a.pos.x += push;
  b.pos.x -= push;
}
