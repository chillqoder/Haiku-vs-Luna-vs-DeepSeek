import type * as THREE from 'three';

/** Освобождает геометрии и материалы всего поддерева. Повторный вызов безопасен. */
export function disposeObject(root: THREE.Object3D): void {
  root.traverse((object) => {
    const drawable = object as { geometry?: THREE.BufferGeometry; material?: THREE.Material | THREE.Material[] };
    drawable.geometry?.dispose();
    if (Array.isArray(drawable.material)) {
      drawable.material.forEach((material) => material.dispose());
    } else {
      drawable.material?.dispose();
    }
  });
}
