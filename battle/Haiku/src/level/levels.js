// Данные уровней. Волна стартует, когда левый край камеры доходит до точки at,
// и блокирует прокрутку до зачистки. Координаты врагов в волне: dx — смещение от точки появления
// (справа за краем экрана), dz — глубина (полоса). Препятствия: [тип, x, z].
export const LEVELS = [
  {
    title: 'STAGE 1 — NIGHT STREET',
    theme: 'street',
    length: 118,
    heroStart: 2,
    exitX: 115,
    colors: { clear: 0x0a0c1c, fog: 0x14162c, ambient: 0x7f8ab8, sun: 0xdde6ff, sky: 0x8fa6ff, ground: 0x2a2030 },
    obstacles: [
      ['crate', 17, 0.6], ['barrel', 26, -1.2], ['crate', 33, -0.4], ['barrel', 47, 1.2],
      ['crate', 58, 0], ['barrel', 74, -0.8], ['crate', 92, 1.0],
    ],
    ambient: [['agile', 40, 1.6], ['grunt', 72, -1.6]],
    waves: [
      { at: 6, enemies: [['grunt', 0, -1.2], ['grunt', 0.6, 0], ['grunt', 1.2, 1.2]] },
      { at: 26, enemies: [['grunt', 0, -1.4], ['agile', 0.5, 0.6], ['grunt', 1.0, 1.4]] },
      { at: 46, enemies: [['brute', 0, 0], ['grunt', 0.8, -1.4], ['grunt', 1.4, 1.2]] },
      { at: 66, enemies: [['agile', 0, -1.2], ['agile', 0.6, 1.2], ['grunt', 1.2, 0], ['grunt', 1.8, -0.4]] },
      { at: 86, boss: 'crusher' },
    ],
  },
  {
    title: 'STAGE 2 — DOJO',
    theme: 'dojo',
    length: 124,
    heroStart: 2,
    exitX: 121,
    colors: { clear: 0x1a0f0a, fog: 0x2a1a10, ambient: 0xffd9b0, sun: 0xffe2b8, sky: 0xffd2a0, ground: 0x3a2418 },
    obstacles: [
      ['crate', 14, -0.8], ['crate', 22, 0.8], ['barrel', 36, 0], ['crate', 44, -1.2],
      ['barrel', 60, 1.2], ['crate', 70, 0.4], ['barrel', 84, -0.6], ['crate', 104, 0],
    ],
    ambient: [['agile', 30, -1.4], ['agile', 64, 1.4]],
    waves: [
      { at: 6, enemies: [['agile', 0, -1.0], ['grunt', 0.6, 0.8], ['grunt', 1.2, -0.4]] },
      { at: 28, enemies: [['agile', 0, 1.2], ['agile', 0.5, -1.2], ['grunt', 1.2, 0]] },
      { at: 50, enemies: [['brute', 0, -0.4], ['agile', 0.8, 1.2], ['agile', 1.4, -1.2]] },
      { at: 72, enemies: [['grunt', 0, 1.4], ['agile', 0.5, -1.4], ['agile', 1.0, 0.2], ['grunt', 1.6, -0.6]] },
      { at: 92, boss: 'sensei' },
    ],
  },
  {
    title: 'STAGE 3 — INDUSTRIAL DISTRICT',
    theme: 'industrial',
    length: 130,
    heroStart: 2,
    exitX: 127,
    colors: { clear: 0x101216, fog: 0x1c1f26, ambient: 0xa0a6b4, sun: 0xffb36b, sky: 0x9aa4b8, ground: 0x2a2c33 },
    obstacles: [
      ['barrel', 12, 1.0], ['crate', 20, -0.6], ['barrel', 31, -1.0], ['crate', 40, 0.6],
      ['barrel', 52, 0], ['crate', 63, -1.2], ['barrel', 78, 1.4], ['crate', 98, 0],
    ],
    ambient: [['brute', 50, -1.6], ['grunt', 86, 1.4]],
    waves: [
      { at: 6, enemies: [['grunt', 0, -1.0], ['grunt', 0.6, 1.0], ['agile', 1.2, 0]] },
      { at: 26, enemies: [['brute', 0, 0.6], ['grunt', 0.8, -1.2], ['grunt', 1.4, 1.2]] },
      { at: 46, enemies: [['agile', 0, -1.2], ['agile', 0.5, 1.2], ['brute', 1.2, 0]] },
      { at: 66, enemies: [['brute', 0, -1.0], ['brute', 0.8, 1.0], ['grunt', 1.6, 0]] },
      { at: 84, enemies: [['agile', 0, 0], ['grunt', 0.6, -1.4], ['agile', 1.2, 1.4], ['grunt', 1.8, 0.2]] },
      { at: 100, boss: 'foreman' },
    ],
  },
];
