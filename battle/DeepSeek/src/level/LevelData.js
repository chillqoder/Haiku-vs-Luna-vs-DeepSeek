// Level definitions for the three stages.

export const LEVELS = [
  {
    id: 0,
    name: 'NEON STREETS',
    subtitle: 'The city never sleeps. Neither do its thugs.',
    theme: 'street',
    length: 150,
    groundTexture: 'asphalt',
    fog: { color: 0x0a0d1a, near: 30, far: 80 },
    background: 0x0a0d1a,
    hemi: 0x8899cc,
    hemiGround: 0x223044,
    sun: 0xbcc8ff,
    decorations: { lamps: [10, 34, 58, 82, 106, 130], signs: [20, 48, 90, 122], dumpsters: [15, 72, 118] },
    obstacles: [
      { type: 'crate', x: 12, z: 1.9 },
      { type: 'barrel', x: 40, z: -1.7 },
      { type: 'crate', x: 56, z: -1.9 },
      { type: 'barrel', x: 76, z: 1.8 },
      { type: 'crate', x: 94, z: -1.8 },
      { type: 'barrel', x: 112, z: 1.7 },
      { type: 'crate', x: 126, z: 1.9 },
    ],
    waves: [
      {
        triggerX: 22, lockX: 30,
        spawns: [
          { archetype: 'grunt', side: 'right' },
          { archetype: 'grunt', side: 'right' },
          { archetype: 'agile', side: 'left' },
        ],
      },
      {
        triggerX: 60, lockX: 68,
        spawns: [
          { archetype: 'grunt', side: 'right' },
          { archetype: 'grunt', side: 'left' },
          { archetype: 'agile', side: 'right' },
          { archetype: 'agile', side: 'left' },
        ],
      },
      {
        triggerX: 98, lockX: 106,
        spawns: [
          { archetype: 'brute', side: 'right' },
          { archetype: 'grunt', side: 'left' },
          { archetype: 'grunt', side: 'right' },
          { archetype: 'agile', side: 'left' },
        ],
      },
      {
        triggerX: 136, lockX: 141, boss: true,
        spawns: [
          { archetype: 'boss', side: 'right', bossTitle: 'THE JUNKYARD KING' },
        ],
      },
    ],
  },
  {
    id: 1,
    name: 'DRAGON DOJO',
    subtitle: 'Silence the shadows of the old school.',
    theme: 'dojo',
    length: 160,
    groundTexture: 'wood',
    fog: { color: 0x1a1420, near: 28, far: 75 },
    background: 0x160f1c,
    hemi: 0xd8b890,
    hemiGround: 0x3a2a20,
    sun: 0xffe0b0,
    decorations: { lanterns: [8, 30, 52, 74, 96, 118, 140], posts: [18, 44, 70, 96, 122, 148] },
    obstacles: [
      { type: 'dummy', x: 14, z: -1.8 },
      { type: 'crate', x: 36, z: 1.9 },
      { type: 'dummy', x: 58, z: 1.8 },
      { type: 'crate', x: 78, z: -1.8 },
      { type: 'dummy', x: 102, z: -1.9 },
      { type: 'crate', x: 124, z: 1.8 },
      { type: 'dummy', x: 142, z: 1.8 },
    ],
    waves: [
      {
        triggerX: 24, lockX: 32,
        spawns: [
          { archetype: 'agile', side: 'right' },
          { archetype: 'agile', side: 'left' },
          { archetype: 'grunt', side: 'right' },
        ],
      },
      {
        triggerX: 64, lockX: 72,
        spawns: [
          { archetype: 'agile', side: 'right' },
          { archetype: 'agile', side: 'left' },
          { archetype: 'grunt', side: 'left' },
          { archetype: 'grunt', side: 'right' },
        ],
      },
      {
        triggerX: 104, lockX: 112,
        spawns: [
          { archetype: 'brute', side: 'right' },
          { archetype: 'agile', side: 'left' },
          { archetype: 'agile', side: 'right' },
          { archetype: 'grunt', side: 'left' },
        ],
      },
      {
        triggerX: 146, lockX: 151, boss: true,
        spawns: [
          { archetype: 'boss', side: 'right', bossTitle: 'MASTER ONYX' },
          { archetype: 'agile', side: 'left' },
          { archetype: 'agile', side: 'left' },
        ],
      },
    ],
  },
  {
    id: 2,
    name: 'IRON FOUNDRY',
    subtitle: 'The last shift. Shut it down.',
    theme: 'foundry',
    length: 170,
    groundTexture: 'metal',
    fog: { color: 0x14161a, near: 26, far: 70 },
    background: 0x101216,
    hemi: 0x99a0aa,
    hemiGround: 0x2a2620,
    sun: 0xffd0a0,
    decorations: { pipes: [12, 36, 60, 84, 108, 132, 156], machines: [26, 50, 76, 102, 128, 152] },
    obstacles: [
      { type: 'barrel', x: 14, z: 1.8 },
      { type: 'crate', x: 38, z: -1.8 },
      { type: 'barrel', x: 60, z: -1.9 },
      { type: 'crate', x: 82, z: 1.9 },
      { type: 'barrel', x: 106, z: 1.8 },
      { type: 'crate', x: 130, z: -1.8 },
      { type: 'barrel', x: 150, z: -1.8 },
    ],
    waves: [
      {
        triggerX: 22, lockX: 30,
        spawns: [
          { archetype: 'grunt', side: 'right' },
          { archetype: 'grunt', side: 'left' },
          { archetype: 'agile', side: 'right' },
        ],
      },
      {
        triggerX: 58, lockX: 66,
        spawns: [
          { archetype: 'brute', side: 'right' },
          { archetype: 'grunt', side: 'left' },
          { archetype: 'grunt', side: 'right' },
        ],
      },
      {
        triggerX: 96, lockX: 104,
        spawns: [
          { archetype: 'brute', side: 'right' },
          { archetype: 'brute', side: 'left' },
          { archetype: 'agile', side: 'right' },
          { archetype: 'agile', side: 'left' },
        ],
      },
      {
        triggerX: 136, lockX: 144,
        spawns: [
          { archetype: 'brute', side: 'right' },
          { archetype: 'grunt', side: 'left' },
          { archetype: 'agile', side: 'right' },
          { archetype: 'agile', side: 'left' },
          { archetype: 'grunt', side: 'right' },
        ],
      },
      {
        triggerX: 158, lockX: 163, boss: true,
        spawns: [
          { archetype: 'boss', side: 'right', bossTitle: 'THE FOUNDRY COLOSSUS' },
          { archetype: 'brute', side: 'left' },
        ],
      },
    ],
  },
];
