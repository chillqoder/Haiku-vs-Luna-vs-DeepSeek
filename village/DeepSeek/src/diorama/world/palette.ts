import * as THREE from 'three';

export const PALETTE = {
  sky: '#b6dcff',
  fog: '#cfe6fb',
  grass: '#6cc24a',
  grassEdge: '#57a83c',
  dirt: '#8a7a5e',
  rock: '#6f6a63',
  rockDark: '#5d5952',
  path: '#d9c98f',
  plaza: '#c8c1b2',
  shore: '#cdbd8c',
  water: '#3fa7dd',
  waterDeep: '#2f86b6',
  ripple: '#dff3ff',
  stone: '#9aa0a6',
  stoneDark: '#7f858c',
  stoneLight: '#b9c2cc',
  wood: '#8a6240',
  woodDark: '#6b4a2f',
  woodLight: '#c9a05e',
  trunk: '#6b4a2f',
  plaster: '#efe3c8',
  roofSlate: '#7d6b5f',
  roofStraw: '#c9a55a',
  roofRed: '#b5533c',
  window: '#f4d06f',
  door: '#4a3626',
  skin: '#f0c8a0',
  skinDark: '#d9a97f',
  treeDark: '#3f7d3f',
  treeMid: '#4f8f45',
  treeLight: '#5fa354',
  pineDark: '#356b36',
  fire: '#ff8c32',
  fireCore: '#ffd166',
  smoke: '#c9c9c9',
  steel: '#c9ced6',
  armor: '#8d99a6',
  gold: '#f2c14e',
  plume: '#d1554f',
} as const;

export interface MaterialOptions {
  metalness?: number;
  roughness?: number;
  emissive?: string;
  emissiveIntensity?: number;
  transparent?: boolean;
  opacity?: number;
}

const materialCache = new Map<string, THREE.MeshStandardMaterial>();

/**
 * Cached flat-shaded standard material. Every mesh in the diorama renders
 * with `flatShading: true`; sharing instances keeps draw state and GPU
 * memory low.
 */
export function flatMat(
  color: THREE.ColorRepresentation,
  options: MaterialOptions = {},
): THREE.MeshStandardMaterial {
  const key = [
    color,
    options.metalness ?? 0,
    options.roughness ?? 0.95,
    options.emissive ?? '',
    options.emissiveIntensity ?? 1,
    options.transparent ?? false,
    options.opacity ?? 1,
  ].join('|');

  let material = materialCache.get(key);
  if (!material) {
    material = new THREE.MeshStandardMaterial({
      color,
      flatShading: true,
      metalness: options.metalness ?? 0,
      roughness: options.roughness ?? 0.95,
      emissive: options.emissive ?? '#000000',
      emissiveIntensity: options.emissiveIntensity ?? 1,
      transparent: options.transparent ?? false,
      opacity: options.opacity ?? 1,
    });
    materialCache.set(key, material);
  }
  return material;
}

export function disposeMaterialCache(): void {
  for (const material of materialCache.values()) material.dispose();
  materialCache.clear();
}
