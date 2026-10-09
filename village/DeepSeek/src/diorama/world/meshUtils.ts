import * as THREE from 'three';

export interface WorldPiece {
  group: THREE.Group;
  update?: (elapsed: number, dt: number) => void;
  smokeSources?: THREE.Vector3[];
}

export function mesh(
  geometry: THREE.BufferGeometry,
  material: THREE.Material,
  parent: THREE.Object3D,
  position?: [number, number, number],
): THREE.Mesh {
  const instance = new THREE.Mesh(geometry, material);
  if (position) instance.position.set(position[0], position[1], position[2]);
  instance.castShadow = true;
  instance.receiveShadow = true;
  parent.add(instance);
  return instance;
}

export function node(parent: THREE.Object3D, position?: [number, number, number]): THREE.Group {
  const group = new THREE.Group();
  if (position) group.position.set(position[0], position[1], position[2]);
  parent.add(group);
  return group;
}
