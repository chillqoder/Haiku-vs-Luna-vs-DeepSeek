import * as THREE from 'three';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { GLTFLoader, type GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { disposeObject } from './dispose';

/**
 * Кэшированный конвейер GLTF/GLB с поддержкой Draco.
 * Каждый URL скачивается один раз, экземпляры персонажей делят геометрии.
 */
export class AssetLoader {
  private readonly gltfLoader = new GLTFLoader();
  private readonly dracoLoader = new DRACOLoader();
  private readonly cache = new Map<string, Promise<GLTF>>();

  constructor(decoderPath = '/draco/gltf/') {
    this.dracoLoader.setDecoderPath(decoderPath);
    this.gltfLoader.setDRACOLoader(this.dracoLoader);
  }

  loadGLTF(url: string): Promise<GLTF> {
    const cached = this.cache.get(url);
    if (cached) return cached;

    const pending = this.gltfLoader
      .loadAsync(url)
      .then((gltf) => {
        applyFlatShading(gltf.scene);
        return gltf;
      })
      .catch((error: unknown) => {
        this.cache.delete(url);
        throw error;
      });

    this.cache.set(url, pending);
    return pending;
  }

  dispose(): void {
    for (const pending of this.cache.values()) {
      void pending.then((gltf) => disposeObject(gltf.scene), () => undefined);
    }
    this.cache.clear();
    this.dracoLoader.dispose();
  }
}

/** Низкополигональный стиль: плоское затенение для всех материалов загруженной модели. */
function applyFlatShading(root: THREE.Object3D): void {
  root.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    const materials = Array.isArray(object.material) ? object.material : [object.material];
    for (const material of materials) {
      if (material instanceof THREE.MeshStandardMaterial) {
        material.flatShading = true;
        material.needsUpdate = true;
      }
    }
  });
}
