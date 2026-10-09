// Shared constants and tuning values for the whole game.

export const COLORS = {
  bgTop: 0x0a0d1a,
  bgBottom: 0x1c2340,
  ground: 0x23283a,
  groundLine: 0x3a4258,
  hero: 0x36d1ff,
  heroAccent: 0xff5b4d,
  enemy: 0xff8a3d,
  enemyAlt: 0xb44dff,
  brute: 0xff3d6e,
  agile: 0x8dff57,
  boss: 0xffd23d,
  ui: 0xffffff,
};

export const PHYSICS = {
  gravity: -34,
  laneMin: -2.6,
  laneMax: 2.6,
  worldMinX: -40,
  worldMaxX: 400,
  groundY: 0,
};

export const CAMERA = {
  height: 6.5,
  distance: 15.5,
  lookHeight: 1.6,
  leanAhead: 2.2,
  fov: 42,
  shakeDecay: 7.5,
};

// Half-width of the visible play area (approx, used for spawn/clamp logic).
export const VIEW_HALF_X = 10.5;

export const COMBAT = {
  heroLightDamage: 6,
  heroHeavyDamage: 11,
  heroKickDamage: 9,
  heroSpecialDamage: 18,
  heroHitStun: 0.42,
  heroKnockback: 9,
  heroSpecialCost: 35,
  comboWindow: 0.85,
  maxComboHits: 5,
  invulnTime: 1.1,
  hitStopLight: 0.05,
  hitStopHeavy: 0.11,
  energyGainLight: 7,
  energyGainHeavy: 12,
  energyGainTaken: 9,
};

export const HERO_STATS = {
  maxHealth: 120,
  speed: 6.2,
  depthSpeed: 4.6,
  jumpVelocity: 11.5,
  lives: 3,
};

export const ENEMY_ARCHETYPES = {
  grunt: {
    name: 'Thug',
    health: 26,
    speed: 2.9,
    damage: 6,
    attackRange: 1.7,
    attackCooldown: [1.1, 2.0],
    aggro: 22,
    reactionRange: 26,
    color: 0xff8a3d,
    scale: [1.0, 1.05, 1.0],
    score: 100,
    hitStunMult: 1.0,
    mass: 1.0,
    blockChance: 0.28,
    dodgeChance: 0.05,
    preferredDistance: 1.45,
    needsToken: true,
    attackNames: ['swipe'],
    comboChance: 0.2,
  },
  agile: {
    name: 'Shadow',
    health: 20,
    speed: 4.6,
    damage: 5,
    attackRange: 1.8,
    attackCooldown: [0.6, 1.3],
    aggro: 26,
    reactionRange: 30,
    color: 0x8dff57,
    scale: [0.86, 1.0, 0.86],
    score: 150,
    hitStunMult: 1.25,
    mass: 0.8,
    blockChance: 0.12,
    dodgeChance: 0.45,
    preferredDistance: 1.6,
    needsToken: true,
    attackNames: ['quickJab'],
    comboChance: 0.55,
  },
  brute: {
    name: 'Bruiser',
    health: 70,
    speed: 1.9,
    damage: 13,
    attackRange: 2.0,
    attackCooldown: [1.8, 3.0],
    aggro: 20,
    reactionRange: 24,
    color: 0xff3d6e,
    scale: [1.45, 1.3, 1.45],
    score: 250,
    hitStunMult: 0.45,
    mass: 2.4,
    blockChance: 0.05,
    dodgeChance: 0,
    preferredDistance: 1.8,
    needsToken: true,
    attackNames: ['heavySwing', 'bruteStomp'],
    comboChance: 0,
  },
  boss: {
    name: 'Ring King',
    health: 220,
    speed: 3.2,
    damage: 15,
    attackRange: 2.4,
    attackCooldown: [1.3, 2.0],
    aggro: 40,
    reactionRange: 60,
    color: 0xffd23d,
    scale: [1.7, 1.55, 1.7],
    score: 1000,
    hitStunMult: 0.3,
    mass: 4.0,
    blockChance: 0.2,
    dodgeChance: 0.1,
    preferredDistance: 2.0,
    needsToken: false,
    attackNames: ['bossPunch', 'bossSlam', 'bossCharge'],
    comboChance: 0.35,
  },
};

export const COMBO_FINISHERS = ['Jab', 'Cross', 'Punch', 'Hook', 'Uppercut'];

export const LEVEL_NAMES = ['NEON STREETS', 'DRAGON DOJO', 'IRON FOUNDRY'];

export const GAMEPLAY = {
  energyMax: 100,
  startingEnergy: 0,
  lives: 3,
  scorePerHit: 1,
  continueBonus: 5000,
};
