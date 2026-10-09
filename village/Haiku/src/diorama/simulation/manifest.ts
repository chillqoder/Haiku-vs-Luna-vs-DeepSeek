/**
 * Манифест симуляции: типы и валидация.
 *
 * Модуль не зависит от three.js, поэтому его используют и API-маршрут (сервер),
 * и клиентский CharacterManager. Формат описан в README.md.
 */

export type Vec3 = [number, number, number];

export interface PatrolRoute {
  /** Прямой коридор патруля: стражник ходит между двумя точками туда и обратно. */
  waypoints: [Vec3, Vec3];
  walkSeconds: number;
  pauseSeconds: number;
}

export type VillagerBehavior =
  | { type: 'stationary' }
  | { type: 'roam'; area: string; speed: number; idleSeconds: [number, number] }
  | { type: 'orbit'; center: Vec3; radius: number; lapSeconds: number };

export interface RippleEvents {
  /** Имя узла внутри модели, над которым появляется рябь. */
  anchor: string;
  /** Моменты в секундах внутри клипа, когда возникает рябь. */
  atSeconds: number[];
}

interface CharacterBase {
  id: string;
  role: string;
  model: string;
  scale: number;
  /** Имя материала внутри GLB → цвет #rrggbb для этого экземпляра. */
  tint: Record<string, string>;
  /** Логическое имя проигрываемого состояния → имя AnimationClip в GLB. */
  clips: Record<string, string>;
}

export interface KingConfig extends CharacterBase {
  kind: 'king';
  position: Vec3;
  yawDeg: number;
}

export interface GuardConfig extends CharacterBase {
  kind: 'guard';
  patrol: string;
  /** Сдвиг по фазе цикла патруля, чтобы стражники не шагали синхронно. */
  startSeconds: number;
}

export interface VillagerConfig extends CharacterBase {
  kind: 'villager';
  position: Vec3;
  yawDeg: number;
  /** Узлы инструментов, которые нужно показать; остальные скрываются. */
  tools: string[];
  ripples: RippleEvents | null;
  behavior: VillagerBehavior;
}

export type CharacterConfig = KingConfig | GuardConfig | VillagerConfig;

export interface SimulationManifest {
  version: 1;
  assets: { characters: Record<string, string> };
  areas: Record<string, Vec3[]>;
  patrols: Record<string, PatrolRoute>;
  characters: CharacterConfig[];
}

export class ManifestError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ManifestError';
  }
}

type JsonObject = Record<string, unknown>;

const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;

function fail(where: string, message: string): never {
  throw new ManifestError(`${where}: ${message}`);
}

function asObject(value: unknown, where: string): JsonObject {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    fail(where, 'ожидался объект');
  }
  return value as JsonObject;
}

function asArray(value: unknown, where: string): unknown[] {
  if (!Array.isArray(value)) fail(where, 'ожидался массив');
  return value;
}

function asString(value: unknown, where: string): string {
  if (typeof value !== 'string' || value.length === 0) fail(where, 'ожидалась непустая строка');
  return value;
}

function asNumber(value: unknown, where: string, positive = false): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) fail(where, 'ожидалось число');
  if (positive && value <= 0) fail(where, 'значение должно быть больше нуля');
  return value;
}

function asVec3(value: unknown, where: string): Vec3 {
  const items = asArray(value, where);
  if (items.length !== 3) fail(where, 'ожидались три числа [x, y, z]');
  return [asNumber(items[0], `${where}[0]`), asNumber(items[1], `${where}[1]`), asNumber(items[2], `${where}[2]`)];
}

function asTint(value: unknown, where: string): Record<string, string> {
  const entries = Object.entries(asObject(value, where));
  for (const [material, color] of entries) {
    if (typeof color !== 'string' || !HEX_COLOR.test(color)) {
      fail(`${where}.${material}`, 'ожидался цвет в формате #rrggbb');
    }
  }
  return Object.fromEntries(entries) as Record<string, string>;
}

function asClips(value: unknown, where: string, required: string[]): Record<string, string> {
  const clips = asObject(value, where);
  for (const key of required) {
    if (!(key in clips)) fail(where, `нет обязательного клипа "${key}"`);
  }
  return Object.fromEntries(
    Object.entries(clips).map(([key, clip]) => [key, asString(clip, `${where}.${key}`)]),
  );
}

function asStringList(value: unknown, where: string): string[] {
  if (value === undefined) return [];
  return asArray(value, where).map((item, i) => asString(item, `${where}[${i}]`));
}

function parseRipples(value: unknown, where: string): RippleEvents {
  const data = asObject(value, where);
  return {
    anchor: asString(data.anchor, `${where}.anchor`),
    atSeconds: asArray(data.atSeconds, `${where}.atSeconds`).map((time, i) => asNumber(time, `${where}.atSeconds[${i}]`)),
  };
}

function parsePatrol(value: unknown, where: string): PatrolRoute {
  const data = asObject(value, where);
  const points = asArray(data.waypoints, `${where}.waypoints`);
  if (points.length !== 2) fail(`${where}.waypoints`, 'патрульный коридор задаётся ровно двумя точками');
  return {
    waypoints: [asVec3(points[0], `${where}.waypoints[0]`), asVec3(points[1], `${where}.waypoints[1]`)],
    walkSeconds: asNumber(data.walkSeconds, `${where}.walkSeconds`, true),
    pauseSeconds: asNumber(data.pauseSeconds, `${where}.pauseSeconds`, true),
  };
}

function parseBehavior(value: unknown, where: string, areas: Record<string, Vec3[]>): VillagerBehavior {
  const data = asObject(value, where);
  switch (data.type) {
    case 'stationary':
      return { type: 'stationary' };
    case 'roam': {
      const area = asString(data.area, `${where}.area`);
      if (!(area in areas)) fail(`${where}.area`, `неизвестная зона "${area}"`);
      const idle = asArray(data.idleSeconds, `${where}.idleSeconds`);
      if (idle.length !== 2) fail(`${where}.idleSeconds`, 'ожидались два числа [min, max]');
      const idleMin = asNumber(idle[0], `${where}.idleSeconds[0]`);
      const idleMax = asNumber(idle[1], `${where}.idleSeconds[1]`);
      if (idleMax < idleMin) fail(`${where}.idleSeconds`, 'max должен быть не меньше min');
      return {
        type: 'roam',
        area,
        speed: asNumber(data.speed, `${where}.speed`, true),
        idleSeconds: [idleMin, idleMax],
      };
    }
    case 'orbit':
      return {
        type: 'orbit',
        center: asVec3(data.center, `${where}.center`),
        radius: asNumber(data.radius, `${where}.radius`, true),
        lapSeconds: asNumber(data.lapSeconds, `${where}.lapSeconds`, true),
      };
    default:
      return fail(`${where}.type`, 'ожидалось stationary | roam | orbit');
  }
}

interface ParseContext {
  models: Set<string>;
  areas: Record<string, Vec3[]>;
  patrols: Record<string, PatrolRoute>;
}

function parseCharacter(value: unknown, index: number, context: ParseContext): CharacterConfig {
  const where = `characters[${index}]`;
  const data = asObject(value, where);
  const id = asString(data.id, `${where}.id`);
  const model = asString(data.model, `${where}.model`);
  if (!context.models.has(model)) fail(`${where}.model`, `модель "${model}" не объявлена в assets.characters`);

  const base = {
    id,
    role: asString(data.role, `${where}.role`),
    model,
    scale: data.scale === undefined ? 1 : asNumber(data.scale, `${where}.scale`, true),
    tint: data.tint === undefined ? {} : asTint(data.tint, `${where}.tint`),
  };

  switch (data.kind) {
    case 'king':
      return {
        ...base,
        kind: 'king',
        position: asVec3(data.position, `${where}.position`),
        yawDeg: asNumber(data.yawDeg, `${where}.yawDeg`),
        clips: asClips(data.clips, `${where}.clips`, ['loop']),
      };
    case 'guard': {
      const patrol = asString(data.patrol, `${where}.patrol`);
      if (!(patrol in context.patrols)) fail(`${where}.patrol`, `неизвестный патруль "${patrol}"`);
      return {
        ...base,
        kind: 'guard',
        patrol,
        startSeconds: data.startSeconds === undefined ? 0 : asNumber(data.startSeconds, `${where}.startSeconds`),
        clips: asClips(data.clips, `${where}.clips`, ['walk', 'inspect']),
      };
    }
    case 'villager': {
      const behavior = parseBehavior(data.behavior, `${where}.behavior`, context.areas);
      const required = behavior.type === 'roam' ? ['idle', 'walk'] : ['loop'];
      return {
        ...base,
        kind: 'villager',
        position: asVec3(data.position, `${where}.position`),
        yawDeg: asNumber(data.yawDeg, `${where}.yawDeg`),
        tools: asStringList(data.tools, `${where}.tools`),
        // null допустим: сервер сериализует отсутствующий ripples именно как null, и клиент разбирает тот же JSON повторно.
        ripples: data.ripples === undefined || data.ripples === null ? null : parseRipples(data.ripples, `${where}.ripples`),
        behavior,
        clips: asClips(data.clips, `${where}.clips`, required),
      };
    }
    default:
      return fail(`${where}.kind`, 'ожидалось king | guard | villager');
  }
}

/** Проверяет JSON из config/simulation-manifest.json и возвращает типизированный манифест. */
export function parseSimulationManifest(input: unknown): SimulationManifest {
  const root = asObject(input, 'manifest');
  if (root.version !== 1) fail('version', 'поддерживается только версия 1');

  const assets = asObject(root.assets, 'assets');
  const characterModels: Record<string, string> = {};
  for (const [key, url] of Object.entries(asObject(assets.characters, 'assets.characters'))) {
    characterModels[key] = asString(url, `assets.characters.${key}`);
  }
  const models = new Set(Object.keys(characterModels));

  const areas: Record<string, Vec3[]> = {};
  for (const [name, points] of Object.entries(asObject(root.areas ?? {}, 'areas'))) {
    const list = asArray(points, `areas.${name}`).map((point, i) => asVec3(point, `areas.${name}[${i}]`));
    if (list.length < 2) fail(`areas.${name}`, 'зона должна содержать минимум две точки');
    areas[name] = list;
  }

  const patrols: Record<string, PatrolRoute> = {};
  for (const [name, route] of Object.entries(asObject(root.patrols ?? {}, 'patrols'))) {
    patrols[name] = parsePatrol(route, `patrols.${name}`);
  }

  const context: ParseContext = { models, areas, patrols };
  const characters = asArray(root.characters, 'characters').map((item, index) => parseCharacter(item, index, context));

  const ids = new Set<string>();
  for (const character of characters) {
    if (ids.has(character.id)) fail(`characters.${character.id}`, 'идентификаторы персонажей должны быть уникальными');
    ids.add(character.id);
  }

  return {
    version: 1,
    assets: { characters: characterModels },
    areas,
    patrols,
    characters,
  };
}
