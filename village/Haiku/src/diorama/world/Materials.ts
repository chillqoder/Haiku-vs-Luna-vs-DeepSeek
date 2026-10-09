import * as THREE from 'three';

/** Палитра острова. Все материалы плоско затенённые (flatShading), как того требует стиль. */
export function createWorldMaterials() {
  const make = (name: string, color: string, options: THREE.MeshStandardMaterialParameters = {}) =>
    new THREE.MeshStandardMaterial({
      name,
      color,
      roughness: 0.9,
      metalness: 0,
      flatShading: true,
      ...options,
    });

  return {
    grass: make('grass', '#7cc957'),
    rock: make('rock', '#8e949e'),
    rockDark: make('rockDark', '#646b76'),
    sand: make('sand', '#e7cf98'),
    water: make('water', '#35b8e8', { roughness: 0.25, metalness: 0.1 }),
    wellWater: make('wellWater', '#2e8fcf', { roughness: 0.3 }),
    wood: make('wood', '#9b6a3c'),
    woodDark: make('woodDark', '#6b4526'),
    woodLight: make('woodLight', '#d7a86e'),
    plaster: make('plaster', '#f4ecdc'),
    timber: make('timber', '#5b4029'),
    window: make('window', '#bfe9ff', { emissive: '#7fd0ff', emissiveIntensity: 0.25 }),
    slate: make('slate', '#4e6b8e'),
    straw: make('straw', '#d9ab4a'),
    roofRed: make('roofRed', '#b8382e'),
    stone: make('stone', '#c3c7cf'),
    stoneDark: make('stoneDark', '#8b909a'),
    iron: make('iron', '#6f7782'),
    cauldron: make('cauldron', '#3c3f45'),
    gold: make('gold', '#f2c14e'),
    banner: make('banner', '#d23a32'),
    flame: make('flame', '#ff8a1f', { emissive: '#ff5a00', emissiveIntensity: 0.9 }),
    flameCore: make('flameCore', '#ffd23f', { emissive: '#ffb000', emissiveIntensity: 1.1 }),
    smoke: make('smoke', '#e9edf2'),
    cloud: make('cloud', '#ffffff', { roughness: 1 }),
    pine: make('pine', '#3f9a57'),
    pineDark: make('pineDark', '#2f7d4a'),
    oak: make('oak', '#6cc24a'),
    bush: make('bush', '#55b444'),
    trunk: make('trunk', '#7a5230'),
    flowerRed: make('flowerRed', '#e74c3c'),
    flowerYellow: make('flowerYellow', '#f1c40f'),
    flowerPink: make('flowerPink', '#ff7eb6'),
    flowerWhite: make('flowerWhite', '#fff7e6'),
  };
}

export type WorldMaterials = ReturnType<typeof createWorldMaterials>;
