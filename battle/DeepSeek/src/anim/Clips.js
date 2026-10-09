// Procedural animation clips. Each clip writes a target pose for the rig.
// The character faces +X in model space; positive Z-rotation swings limbs
// forward, positive Y-rotation is a yaw twist, positive X-rotation rolls.

export function newPose() {
  return {
    body: [0, 0, 0],
    bodyPosY: 0,
    hipsY: 0,
    torso: [0, 0, 0],
    head: [0, 0, 0],
    armA: [0, 0, 0],
    armB: [0, 0, 0],
    foreA: [0, 0, 0],
    foreB: [0, 0, 0],
    legA: [0, 0, 0],
    legB: [0, 0, 0],
    shinA: [0, 0, 0],
    shinB: [0, 0, 0],
  };
}

export function resetPose(p) {
  p.body[0] = p.body[1] = p.body[2] = 0;
  p.bodyPosY = 0;
  p.hipsY = 0;
  p.torso[0] = p.torso[1] = p.torso[2] = 0;
  p.head[0] = p.head[1] = p.head[2] = 0;
  p.armA[0] = p.armA[1] = p.armA[2] = 0;
  p.armB[0] = p.armB[1] = p.armB[2] = 0;
  p.foreA[0] = p.foreA[1] = p.foreA[2] = 0;
  p.foreB[0] = p.foreB[1] = p.foreB[2] = 0;
  p.legA[0] = p.legA[1] = p.legA[2] = 0;
  p.legB[0] = p.legB[1] = p.legB[2] = 0;
  p.shinA[0] = p.shinA[1] = p.shinA[2] = 0;
  p.shinB[0] = p.shinB[1] = p.shinB[2] = 0;
}

const ARRAY_KEYS = [
  'body', 'torso', 'head', 'armA', 'armB', 'foreA', 'foreB', 'legA', 'legB', 'shinA', 'shinB',
];
const SCALAR_KEYS = ['bodyPosY', 'hipsY'];

export function blendPose(from, to, k) {
  for (const key of ARRAY_KEYS) {
    const a = from[key];
    const b = to[key];
    a[0] += (b[0] - a[0]) * k;
    a[1] += (b[1] - a[1]) * k;
    a[2] += (b[2] - a[2]) * k;
  }
  for (const key of SCALAR_KEYS) {
    from[key] += (to[key] - from[key]) * k;
  }
}

// ---- helpers -------------------------------------------------------------

const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
const smooth = (v) => {
  const t = clamp01(v);
  return t * t * (3 - 2 * t);
};
// 0 -> 1 -> 0 window: ramps up over `up`, holds, ramps down over `down`.
function pulse(p, up = 0.3, hold = 0.25, down = 0.35) {
  if (p < up) return smooth(p / up);
  if (p < up + hold) return 1;
  if (p < up + hold + down) return 1 - smooth((p - up - hold) / down);
  return 0;
}

// ---- clips ---------------------------------------------------------------

export const CLIPS = {
  idle: {
    duration: 2.6,
    loop: true,
    blendRate: 10,
    fn(p, pr, time) {
      const breathe = Math.sin(time * 2.4);
      p.torso[2] = -0.05 + breathe * 0.015;
      p.bodyPosY = breathe * 0.012;
      p.armA[2] = 0.16 + breathe * 0.03;
      p.armB[2] = 0.16 - breathe * 0.03;
      p.foreA[2] = 0.22;
      p.foreB[2] = 0.22;
      p.head[2] = 0.02;
      p.legA[2] = 0.05;
      p.legB[2] = -0.05;
      p.shinA[2] = -0.06;
      p.shinB[2] = -0.06;
    },
  },

  walk: {
    duration: 1.0,
    loop: true,
    blendRate: 16,
    fn(p, pr, time, params) {
      const phase = time * Math.PI * 2 * 1.35;
      const swing = Math.sin(phase);
      const counter = Math.sin(phase + Math.PI);
      p.legA[2] = swing * 0.62;
      p.legB[2] = counter * 0.62;
      p.shinA[2] = -0.2 - Math.max(0, -swing) * 0.75;
      p.shinB[2] = -0.2 - Math.max(0, -counter) * 0.75;
      p.armA[2] = 0.14 + counter * 0.5;
      p.armB[2] = 0.14 + swing * 0.5;
      p.foreA[2] = 0.35 + Math.max(0, counter) * 0.35;
      p.foreB[2] = 0.35 + Math.max(0, swing) * 0.35;
      p.torso[2] = -0.1;
      p.torso[1] = swing * 0.08;
      p.head[1] = -swing * 0.05;
      p.bodyPosY = Math.abs(Math.sin(phase)) * 0.045 - 0.02;
    },
  },

  run: {
    duration: 0.6,
    loop: true,
    blendRate: 18,
    fn(p, pr, time) {
      const phase = time * Math.PI * 2 * 1.6;
      const swing = Math.sin(phase);
      const counter = Math.sin(phase + Math.PI);
      p.legA[2] = swing * 0.95;
      p.legB[2] = counter * 0.95;
      p.shinA[2] = -0.35 - Math.max(0, -swing) * 1.1;
      p.shinB[2] = -0.35 - Math.max(0, -counter) * 1.1;
      p.armA[2] = 0.35 + counter * 0.8;
      p.armB[2] = 0.35 + swing * 0.8;
      p.foreA[2] = 1.15;
      p.foreB[2] = 1.15;
      p.torso[2] = -0.24;
      p.torso[1] = swing * 0.1;
      p.bodyPosY = Math.abs(Math.sin(phase)) * 0.08 - 0.03;
    },
  },

  jump: {
    duration: 0.35,
    loop: false,
    blendRate: 14,
    fn(p, pr) {
      const t = smooth(pr);
      p.legA[2] = 0.5 * t;
      p.legB[2] = -0.45 * t;
      p.shinA[2] = -0.9 * t;
      p.shinB[2] = -1.2 * t;
      p.armA[2] = -0.7 * t + 0.16;
      p.armB[2] = -0.7 * t + 0.16;
      p.armA[0] = -0.35 * t;
      p.armB[0] = 0.35 * t;
      p.foreA[2] = 0.6;
      p.foreB[2] = 0.6;
      p.torso[2] = -0.12;
      p.bodyPosY = 0.04;
    },
  },

  fall: {
    duration: 0.5,
    loop: false,
    blendRate: 12,
    fn(p, pr) {
      p.legA[2] = 0.55;
      p.legB[2] = -0.5;
      p.shinA[2] = -0.7;
      p.shinB[2] = -0.9;
      p.armA[2] = -0.2;
      p.armB[2] = -0.2;
      p.armA[0] = -0.75;
      p.armB[0] = 0.75;
      p.foreA[2] = 0.4;
      p.foreB[2] = 0.4;
      p.torso[2] = 0.05;
    },
  },

  land: {
    duration: 0.22,
    loop: false,
    blendRate: 22,
    fn(p, pr) {
      const t = Math.sin(clamp01(pr) * Math.PI);
      p.hipsY = -0.28 * t;
      p.legA[2] = 0.45 * t + 0.05;
      p.legB[2] = -0.45 * t - 0.05;
      p.shinA[2] = -0.9 * t - 0.06;
      p.shinB[2] = -0.9 * t - 0.06;
      p.torso[2] = -0.3 * t;
      p.armA[2] = 0.5 * t + 0.16;
      p.armB[2] = 0.5 * t + 0.16;
      p.foreA[2] = 0.5;
      p.foreB[2] = 0.5;
    },
  },

  punch1: {
    duration: 0.26,
    loop: false,
    blendRate: 26,
    fn(p, pr) {
      const ext = pulse(pr, 0.28, 0.22, 0.5);
      p.armA[2] = 0.2 + ext * 1.35;
      p.foreA[2] = 1.2 * (1 - ext) + 0.05;
      p.armB[2] = 0.35 - ext * 0.25;
      p.foreB[2] = 1.5;
      p.torso[1] = 0.28 * ext;
      p.head[1] = -0.12 * ext;
      p.torso[2] = -0.08;
      p.legA[2] = 0.12;
      p.legB[2] = -0.12;
      p.bodyPosY = -0.02 * ext;
    },
  },

  punch2: {
    duration: 0.26,
    loop: false,
    blendRate: 26,
    fn(p, pr) {
      const ext = pulse(pr, 0.28, 0.22, 0.5);
      p.armB[2] = 0.2 + ext * 1.35;
      p.foreB[2] = 1.2 * (1 - ext) + 0.05;
      p.armA[2] = 0.35 - ext * 0.25;
      p.foreA[2] = 1.5;
      p.torso[1] = -0.28 * ext;
      p.head[1] = 0.12 * ext;
      p.torso[2] = -0.08;
      p.legA[2] = 0.12;
      p.legB[2] = -0.12;
      p.bodyPosY = -0.02 * ext;
    },
  },

  punch3: {
    duration: 0.4,
    loop: false,
    blendRate: 24,
    fn(p, pr) {
      const ext = pulse(pr, 0.35, 0.25, 0.4);
      p.armA[2] = 0.3 + ext * 1.25;
      p.armA[1] = -1.1 + ext * 1.9;
      p.foreA[2] = 0.9 * (1 - ext) + 0.1;
      p.armB[2] = 0.5 - ext * 0.4;
      p.foreB[2] = 1.6;
      p.torso[1] = -0.45 + ext * 1.05;
      p.head[1] = -0.2 + ext * 0.45;
      p.torso[2] = -0.14;
      p.legA[2] = 0.22;
      p.legB[2] = -0.22;
      p.bodyPosY = -0.05 * ext;
    },
  },

  kick: {
    duration: 0.44,
    loop: false,
    blendRate: 24,
    fn(p, pr) {
      const ext = pulse(pr, 0.32, 0.22, 0.46);
      p.legB[2] = -0.1 + ext * 1.5;
      p.shinB[2] = -1.4 * (1 - ext) - 0.05;
      p.legA[2] = 0.05 - ext * 0.1;
      p.shinA[2] = -0.1 - ext * 0.15;
      p.body[2] = 0.22 * ext;
      p.torso[2] = 0.18 * ext - 0.05;
      p.torso[1] = -0.2 * ext;
      p.armA[2] = -0.5 * ext + 0.16;
      p.armB[2] = 0.7 * ext + 0.16;
      p.armA[0] = -0.4 * ext;
      p.foreA[2] = 0.6;
      p.foreB[2] = 0.6;
      p.head[2] = -0.1 * ext;
    },
  },

  jumpKick: {
    duration: 0.4,
    loop: false,
    blendRate: 22,
    fn(p, pr) {
      const ext = pulse(pr, 0.25, 0.4, 0.35);
      p.legB[2] = -0.2 + ext * 1.55;
      p.shinB[2] = -0.9 * (1 - ext);
      p.legA[2] = 0.75;
      p.shinA[2] = -1.3;
      p.body[2] = 0.25 * ext;
      p.torso[2] = 0.15;
      p.armA[2] = -0.6;
      p.armB[2] = -0.6;
      p.armA[0] = -0.5;
      p.armB[0] = 0.5;
      p.foreA[2] = 0.5;
      p.foreB[2] = 0.5;
    },
  },

  special: {
    duration: 0.62,
    loop: false,
    blendRate: 30,
    fn(p, pr, time, params) {
      const turns = params.turns ?? 2;
      p.body[1] = clamp01(pr) * Math.PI * 2 * turns;
      p.armA[0] = -1.35;
      p.armB[0] = 1.35;
      p.armA[2] = 0.1;
      p.armB[2] = 0.1;
      p.foreA[2] = 0.05;
      p.foreB[2] = 0.05;
      p.legA[2] = 0.35;
      p.legB[2] = -0.35;
      p.legA[0] = -0.4;
      p.legB[0] = 0.4;
      p.shinA[2] = -0.3;
      p.shinB[2] = -0.3;
      p.torso[2] = -0.1;
      p.bodyPosY = 0.06;
    },
  },

  hurt: {
    duration: 0.28,
    loop: false,
    blendRate: 24,
    fn(p, pr) {
      const t = pulse(pr, 0.15, 0.4, 0.45);
      p.body[2] = 0.28 * t;
      p.torso[2] = 0.35 * t - 0.05;
      p.head[2] = 0.25 * t;
      p.armA[2] = -0.5 * t + 0.16;
      p.armB[2] = -0.5 * t + 0.16;
      p.armA[0] = -0.5 * t;
      p.armB[0] = 0.5 * t;
      p.foreA[2] = 0.9 * t + 0.2;
      p.foreB[2] = 0.9 * t + 0.2;
      p.bodyPosY = -0.04 * t;
      p.legA[2] = 0.15 * t;
      p.legB[2] = -0.15 * t;
    },
  },

  knockdown: {
    duration: 0.5,
    loop: false,
    blendRate: 20,
    fn(p, pr) {
      const t = smooth(clamp01(pr));
      p.body[2] = 1.42 * t;
      p.bodyPosY = 0.34 * t;
      p.hipsY = -0.15 * t;
      p.torso[2] = 0.25 * t;
      p.head[2] = -0.3 * t;
      p.armA[2] = -1.2 * t + 0.16;
      p.armB[2] = -0.9 * t + 0.16;
      p.armA[0] = -1.2 * t;
      p.armB[0] = 0.9 * t;
      p.legA[2] = 0.8 * t;
      p.legB[2] = -0.4 * t;
      p.shinA[2] = -1.1 * t - 0.06;
      p.shinB[2] = -0.7 * t - 0.06;
    },
  },

  dead: {
    duration: 0.3,
    loop: false,
    blendRate: 18,
    fn(p, pr) {
      const t = smooth(clamp01(pr));
      p.body[2] = 1.5 * t;
      p.bodyPosY = 0.36 * t;
      p.hipsY = -0.15 * t;
      p.torso[2] = 0.2 * t;
      p.head[2] = -0.35 * t;
      p.armA[2] = -1.4 * t + 0.16;
      p.armB[2] = -1.1 * t + 0.16;
      p.armA[0] = -1.3 * t;
      p.armB[0] = 1.0 * t;
      p.legA[2] = 0.9 * t;
      p.legB[2] = -0.5 * t;
      p.shinA[2] = -1.2 * t - 0.06;
      p.shinB[2] = -0.8 * t - 0.06;
    },
  },

  getup: {
    duration: 0.55,
    loop: false,
    blendRate: 18,
    fn(p, pr) {
      const t = 1 - smooth(clamp01(pr));
      p.body[2] = 1.42 * t;
      p.bodyPosY = 0.34 * t;
      p.hipsY = -0.15 * t;
      p.torso[2] = 0.25 * t;
      p.head[2] = -0.3 * t;
      p.armA[2] = -1.2 * t + 0.16;
      p.armB[2] = -0.9 * t + 0.16;
      p.armA[0] = -1.2 * t;
      p.armB[0] = 0.9 * t;
      p.legA[2] = 0.8 * t;
      p.legB[2] = -0.4 * t;
      p.shinA[2] = -1.1 * t - 0.06;
      p.shinB[2] = -0.7 * t - 0.06;
      p.bodyPosY = 0.34 * t;
    },
  },

  guard: {
    duration: 1.0,
    loop: true,
    blendRate: 20,
    fn(p) {
      p.armA[2] = 1.25;
      p.armB[2] = 1.25;
      p.foreA[2] = -1.75;
      p.foreB[2] = -1.75;
      p.armA[0] = -0.3;
      p.armB[0] = 0.3;
      p.torso[2] = -0.18;
      p.head[2] = -0.08;
      p.hipsY = -0.1;
      p.legA[2] = 0.2;
      p.legB[2] = -0.2;
      p.shinA[2] = -0.35;
      p.shinB[2] = -0.35;
    },
  },

  grab: {
    duration: 1.0,
    loop: true,
    blendRate: 18,
    fn(p) {
      p.armA[2] = 1.35;
      p.armB[2] = 1.35;
      p.foreA[2] = -0.15;
      p.foreB[2] = -0.15;
      p.torso[2] = -0.12;
      p.legA[2] = 0.15;
      p.legB[2] = -0.15;
    },
  },

  grabPunch: {
    duration: 0.3,
    loop: false,
    blendRate: 24,
    fn(p, pr) {
      const ext = pulse(pr, 0.3, 0.2, 0.5);
      p.legA[2] = 0.2 + ext * 1.25;
      p.shinA[2] = -1.5 * (1 - ext) - 0.2;
      p.armA[2] = 1.35;
      p.armB[2] = 1.35;
      p.foreA[2] = -0.2;
      p.foreB[2] = -0.2;
      p.torso[2] = -0.2 - ext * 0.15;
      p.bodyPosY = 0.03 * ext;
    },
  },

  throw: {
    duration: 0.4,
    loop: false,
    blendRate: 22,
    fn(p, pr) {
      const up = smooth(clamp01(pr / 0.45));
      const down = smooth(clamp01((pr - 0.45) / 0.35));
      const rz = 1.3 + up * 1.5 - down * 2.6;
      p.armA[2] = rz;
      p.armB[2] = rz;
      p.foreA[2] = 0.3 - down * 0.3;
      p.foreB[2] = 0.3 - down * 0.3;
      p.torso[2] = -0.15 - up * 0.2 + down * 0.45;
      p.head[2] = down * -0.2;
      p.hipsY = -0.05 * down;
      p.legA[2] = 0.2 + down * 0.2;
      p.legB[2] = -0.2 - down * 0.2;
    },
  },

  held: {
    duration: 1.0,
    loop: true,
    blendRate: 16,
    fn(p, pr, time) {
      const wiggle = Math.sin(time * 9) * 0.08;
      p.armA[2] = 2.9 + wiggle;
      p.armB[2] = 2.9 - wiggle;
      p.foreA[2] = -0.4;
      p.foreB[2] = -0.4;
      p.body[2] = 0.12;
      p.torso[2] = 0.15;
      p.head[2] = -0.15;
      p.legA[2] = 0.25 + wiggle;
      p.legB[2] = -0.25 + wiggle;
      p.shinA[2] = -0.6;
      p.shinB[2] = -0.6;
      p.bodyPosY = 0.02;
    },
  },

  thrown: {
    duration: 0.6,
    loop: true,
    blendRate: 10,
    fn(p, pr, time) {
      p.body[1] = time * Math.PI * 2 * 2.2;
      p.body[2] = 0.9;
      p.bodyPosY = 0.3;
      p.armA[2] = -1.2;
      p.armB[2] = -1.2;
      p.armA[0] = -1.0;
      p.armB[0] = 1.0;
      p.legA[2] = 0.7;
      p.legB[2] = -0.7;
      p.shinA[2] = -0.8;
      p.shinB[2] = -0.8;
    },
  },

  heavySwing: {
    duration: 0.62,
    loop: false,
    blendRate: 18,
    fn(p, pr) {
      const wind = smooth(clamp01(pr / 0.4));
      const strike = smooth(clamp01((pr - 0.42) / 0.28));
      p.armB[2] = 2.9 * wind - strike * 2.4;
      p.armB[1] = -0.5 * wind;
      p.foreB[2] = 0.9 - strike * 0.85;
      p.armA[2] = 0.16 + wind * 0.3;
      p.foreA[2] = 1.4;
      p.torso[1] = -0.6 * wind + strike * 1.3;
      p.torso[2] = -0.1 + strike * 0.35;
      p.head[1] = -0.2 * wind + strike * 0.4;
      p.legA[2] = 0.25;
      p.legB[2] = -0.25;
      p.bodyPosY = wind * 0.06 - strike * 0.12;
    },
  },

  slam: {
    duration: 0.78,
    loop: false,
    blendRate: 16,
    fn(p, pr) {
      const up = smooth(clamp01(pr / 0.45));
      const down = smooth(clamp01((pr - 0.5) / 0.2));
      p.armA[2] = 0.16 + up * 2.9 - down * 3.0;
      p.armB[2] = 0.16 + up * 2.9 - down * 3.0;
      p.foreA[2] = 0.4 - down * 0.4;
      p.foreB[2] = 0.4 - down * 0.4;
      p.armA[0] = -up * 0.3;
      p.armB[0] = up * 0.3;
      p.torso[2] = -0.1 - up * 0.25 + down * 0.5;
      p.head[2] = up * -0.2 + down * 0.3;
      p.hipsY = -0.35 * down;
      p.legA[2] = 0.3 + down * 0.25;
      p.legB[2] = -0.3 - down * 0.25;
      p.shinA[2] = -0.3 - down * 0.7;
      p.shinB[2] = -0.3 - down * 0.7;
      p.bodyPosY = up * 0.18 - down * 0.1;
    },
  },
};
