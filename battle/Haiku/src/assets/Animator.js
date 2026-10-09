// Процедурная анимация: позы — наборы углов шарниров. Ключевые позы атак интерполируются
// по нормализованному времени действия, циклические движения (ходьба, дыхание) — по фазе.
import { applyPose } from './Models.js';

const FIELDS = ['hipY', 'lean', 'head', 'sN', 'eN', 'sF', 'eF', 'hN', 'kN', 'hF', 'kF'];

function pose(p = {}) {
  const o = {};
  for (const k of FIELDS) o[k] = p[k] ?? 0;
  return o;
}

function lerpPose(a, b, t) {
  const o = {};
  for (const k of FIELDS) o[k] = a[k] + (b[k] - a[k]) * t;
  return o;
}

// Выборка ключевых кадров: keys = [[t, pose], ...], t от 0 до 1
function sample(keys, t) {
  if (t <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) {
    const [t1, p1] = keys[i];
    if (t <= t1) {
      const [t0, p0] = keys[i - 1];
      return lerpPose(p0, p1, (t - t0) / (t1 - t0 || 1));
    }
  }
  return keys[keys.length - 1][1];
}

const IDLE = pose({ lean: 0.02, sN: 0.12, eN: 0.3, sF: -0.1, eF: 0.35, hN: -0.02, kN: -0.02, hF: 0.02, kF: -0.02 });
const GUARD = pose({ lean: 0.06, sN: 1.0, eN: 1.7, sF: 0.85, eF: 1.8, hN: 0.1, kN: -0.2, hF: -0.18, kF: -0.1 });
const HIT = pose({ lean: -0.35, head: -0.2, sN: -1.1, eN: 0.5, sF: -0.9, eF: 0.6, hN: 0.15, kN: -0.4, hF: -0.1, kF: -0.3 });
const LYING = pose({ sN: 2.2, eN: 0.2, sF: 2.0, eF: 0.2, hN: 0.1, kN: -0.1, hF: -0.05, kF: -0.1 });
const JUMP_UP = pose({ lean: 0.1, sN: 2.3, eN: 0.4, sF: 2.1, eF: 0.4, hN: 0.9, kN: -1.2, hF: 0.6, kF: -1.0 });
const FALL = pose({ lean: -0.05, sN: 1.2, eN: 0.3, sF: 1.0, eF: 0.3, hN: 0.35, kN: -0.15, hF: 0.2, kF: -0.2 });
const WINDUP = pose({ lean: -0.1, sN: -0.5, eN: 1.9, sF: -0.2, eF: 1.9, hN: -0.2, kN: -0.3, hF: 0.2 });

// Ключевые кадры действий (t: 0..1 по длительности действия)
const ACTIONS = {
  punchNear: [
    [0, GUARD],
    [0.3, pose({ lean: -0.05, sN: -0.7, eN: 1.6, sF: 0.8, eF: 1.5 })],
    [0.5, pose({ lean: 0.2, sN: 1.5, eN: 0.05, sF: 0.8, eF: 1.5, hN: 0.3, hF: -0.3 })],
    [1, GUARD],
  ],
  punchFar: [
    [0, GUARD],
    [0.3, pose({ lean: -0.05, sN: 0.9, eN: 1.5, sF: -0.7, eF: 1.6 })],
    [0.5, pose({ lean: 0.2, sN: 0.9, eN: 1.5, sF: 1.5, eF: 0.05, hN: 0.3, hF: -0.3 })],
    [1, GUARD],
  ],
  kick: [
    [0, GUARD],
    [0.3, pose({ lean: -0.15, sN: 0.4, eN: 1.5, sF: 0.5, eF: 1.5, hN: -0.7, kN: -0.9 })],
    [0.55, pose({ lean: 0.25, sN: 0.8, eN: 1.5, sF: 0.5, eF: 1.5, hN: 1.4, kN: -0.05, hF: -0.2, kF: -0.3 })],
    [1, IDLE],
  ],
  slam: [
    [0, pose({ lean: -0.2, sN: 2.8, eN: 0.2, sF: 2.8, eF: 0.2 })],
    [0.55, pose({ lean: 0.35, sN: 0.9, eN: 0.4, sF: 0.9, eF: 0.4 })],
    [1, IDLE],
  ],
  throw: [
    [0, GUARD],
    [0.5, pose({ lean: 0.2, sN: 1.5, eN: 0.2, sF: 1.5, eF: 0.2 })],
    [1, IDLE],
  ],
  grab: [
    [0, GUARD],
    [1, pose({ lean: 0.1, sN: 1.4, eN: 0.6, sF: 1.3, eF: 0.6 })],
  ],
  special: [
    [0, IDLE],
    [1, pose({ lean: 0, sN: 1.5, eN: 0.05, sF: 1.5, eF: 0.05, hN: 0.9, hF: -0.9 })],
  ],
  windup: [[0, GUARD], [1, WINDUP]],
  guard: [[0, GUARD], [1, GUARD]],
};

function walk(ph, amp) {
  const s = Math.sin(ph);
  const c = Math.cos(ph);
  return pose({
    hipY: Math.abs(Math.sin(ph)) * 0.04 * amp,
    lean: 0.04 + 0.03 * amp,
    sN: -0.45 * amp * s,
    eN: 0.45,
    sF: 0.45 * amp * s,
    eF: 0.45,
    hN: 0.5 * amp * s,
    kN: -0.7 * amp * Math.max(0, c),
    hF: -0.5 * amp * s,
    kF: -0.7 * amp * Math.max(0, -c),
  });
}

export class Animator {
  constructor(rig) {
    this.rig = rig;
    this.cur = pose(IDLE);
    this.time = 0;
    this.phase = 0;
  }

  // s: { speed, airborne, vy, stunned, down, action, actionT }
  update(dt, s) {
    this.time += dt;
    this.phase += dt * s.speed * 2.6;
    let target;
    if (s.down) target = LYING;
    else if (s.stunned) target = HIT;
    else if (s.action && ACTIONS[s.action]) target = sample(ACTIONS[s.action], s.actionT);
    else if (s.airborne) target = s.vy > 0 ? JUMP_UP : FALL;
    else if (s.speed > 0.2) target = walk(this.phase, Math.min(1, Math.max(0.35, s.speed / 3.6)));
    else target = this.idle();

    // Действия переходят резко, остальные позы — плавно
    const k = Math.min(1, dt * (s.action ? 30 : 12));
    for (const key of FIELDS) this.cur[key] += (target[key] - this.cur[key]) * k;
    applyPose(this.rig, this.cur);
  }

  idle() {
    const breath = Math.sin(this.time * 2.4);
    return pose({ ...IDLE, hipY: breath * 0.012, sN: IDLE.sN + breath * 0.03 });
  }
}
