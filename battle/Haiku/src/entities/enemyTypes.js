// Данные врагов и боссов. Атака описывается «ходом» (move):
// windup — замах (игрок его видит и может уклониться), strike — активное окно удара,
// recover — восстановление. Все тайминги в секундах, размеры в единицах мира.

export const ENEMY_TYPES = {
  grunt: {
    name: 'Grunt',
    points: 100,
    hp: 30,
    speed: 2.1,
    scale: 1,
    range: 0.9,
    aggro: 6.5,
    cooldown: [0.9, 1.6],
    dodge: false,
    block: false,
    armor: false,
    look: { jacket: 0x5b6b3a, pants: 0x2b2d33, skin: 0xd9a77e, hair: 0x2a1e16, cap: 0x3a3f2e, belt: 0x222222, shoes: 0x111111 },
    attack: {
      anim: 'punchNear', windup: 0.45, strike: 0.14, recover: 0.45, dash: 1.2,
      damage: 8, ox: 0.75, oy: 1.25, hw: 0.5, hh: 0.4, hd: 0.6, knockX: 2.5, hitstun: 0.3,
    },
  },

  agile: {
    name: 'Agile',
    points: 150,
    hp: 34,
    speed: 3.6,
    scale: 0.95,
    range: 1.0,
    aggro: 7.5,
    cooldown: [0.5, 1.0],
    dodge: true,
    block: false,
    armor: false,
    look: { jacket: 0xe07a2a, pants: 0x1a1a1f, skin: 0xc98e66, mohawk: 0x2e1c10, scarf: 0xf2c53d, belt: 0x333333, shoes: 0x101010 },
    attack: {
      anim: 'kick', windup: 0.22, strike: 0.12, recover: 0.3, dash: 2.0,
      damage: 7, ox: 0.85, oy: 0.9, hw: 0.5, hh: 0.4, hd: 0.6, knockX: 1.8, hitstun: 0.2,
    },
  },

  brute: {
    name: 'Brute',
    points: 250,
    hp: 90,
    speed: 1.5,
    scale: 1.25,
    range: 1.2,
    aggro: 6,
    cooldown: [1.6, 2.4],
    dodge: false,
    block: true,
    armor: true,
    look: { jacket: 0x6a2a4a, pants: 0x3a2a44, skin: 0xb07a55, hair: 0x111111, pads: 0x9aa0a8, belt: 0x8b0000, shoes: 0x0d0d0d },
    attack: {
      anim: 'slam', windup: 0.9, strike: 0.2, recover: 0.7, dash: 1.5,
      damage: 20, ox: 1.0, oy: 1.1, hw: 0.6, hh: 0.5, hd: 0.7, knockX: 4.5, knockdown: true, hitstun: 0.5, sound: 'heavy',
    },
  },
};

// Удары босса. hits — задержки отдельных хитбоксов (несколько задержек = серия ударов)
export const BOSS_MOVES = {
  slam: {
    anim: 'slam', windup: 1.0, strike: 0.25, recover: 0.8,
    damage: 22, ox: 1.6, oy: 0.8, hw: 1.2, hh: 0.9, hd: 1.0, knockX: 5, lift: 5, knockdown: true, hitstun: 0.6, sound: 'heavy',
  },
  charge: {
    anim: 'slam', windup: 0.8, strike: 0.55, recover: 0.7, dash: 8,
    damage: 18, ox: 0.9, oy: 1.2, hw: 0.9, hh: 0.8, hd: 0.9, knockX: 6, lift: 3, knockdown: true, hitstun: 0.5, sound: 'heavy',
  },
  combo: {
    anim: 'punchNear', windup: 0.3, strike: 0.14, recover: 0.5, hits: [0, 0.25],
    damage: 9, ox: 0.9, oy: 1.4, hw: 0.6, hh: 0.5, hd: 0.7, knockX: 2, hitstun: 0.3,
  },
  dash: {
    anim: 'kick', windup: 0.35, strike: 0.5, recover: 0.4, dash: 9,
    damage: 13, ox: 0.9, oy: 0.9, hw: 0.7, hh: 0.5, hd: 0.7, knockX: 3, hitstun: 0.3,
  },
  kick: {
    anim: 'kick', windup: 0.25, strike: 0.2, recover: 0.5,
    damage: 14, ox: 1.0, oy: 0.9, hw: 0.7, hh: 0.5, hd: 0.7, knockX: 4, lift: 3, knockdown: true, hitstun: 0.4,
  },
  throw: {
    anim: 'throw', windup: 0.7, strike: 0.15, recover: 0.6, projectile: true, damage: 12,
  },
};

export const BOSS_TYPES = {
  crusher: {
    name: 'CRUSHER',
    points: 2000,
    hp: 260,
    speed: 2.2,
    scale: 1.5,
    range: 1.6,
    aggro: 99,
    cooldown: [0.8, 1.4],
    dodge: false,
    block: false,
    armor: true,
    boss: true,
    moves: ['slam', 'charge', 'combo'],
    look: { jacket: 0x3d1d1d, pants: 0x222222, skin: 0xa0734f, pads: 0x6e747d, belt: 0xff3b3b, shoes: 0x0d0d0d, crown: 0xff3b3b, glowEyes: 0xff5533 },
  },
  sensei: {
    name: 'SENSEI',
    points: 2000,
    hp: 240,
    speed: 3.2,
    scale: 1.35,
    range: 1.1,
    aggro: 99,
    cooldown: [0.6, 1.1],
    dodge: false,
    block: false,
    armor: true,
    boss: true,
    moves: ['dash', 'combo', 'kick'],
    look: { jacket: 0xf2efe6, pants: 0x2a2a2a, skin: 0xc49068, hair: 0xdedede, belt: 0xb3122e, shoes: 0x111111 },
  },
  foreman: {
    name: 'FOREMAN',
    points: 2000,
    hp: 280,
    speed: 2.4,
    scale: 1.4,
    range: 3.2,
    aggro: 99,
    cooldown: [0.9, 1.5],
    dodge: false,
    block: false,
    armor: true,
    boss: true,
    moves: ['throw', 'slam', 'charge'],
    look: { jacket: 0xe89b22, pants: 0x3c4a5a, skin: 0xb8835b, hardhat: 0xffd21f, belt: 0x444444, gloves: 0x888888, shoes: 0x222222 },
  },
};
