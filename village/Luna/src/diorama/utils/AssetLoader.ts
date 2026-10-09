import { DRACOLoader } from "three/addons/loaders/DRACOLoader.js";
import { GLTFLoader, type GLTF } from "three/addons/loaders/GLTFLoader.js";

/** Cached GLTF/Draco pipeline for optional authored character and prop assets. */
export class AssetLoader {
  private readonly draco = new DRACOLoader();
  private readonly gltf = new GLTFLoader();
  private readonly cache = new Map<string, Promise<GLTF>>();

  constructor() {
    this.draco.setDecoderPath("/draco/");
    this.gltf.setDRACOLoader(this.draco);
  }

  loadGLTF(path: string): Promise<GLTF> {
    const cached = this.cache.get(path);
    if (cached) return cached;

    const pending = this.gltf.loadAsync(path).catch((error: unknown) => {
      this.cache.delete(path);
      throw error;
    });
    this.cache.set(path, pending);
    return pending;
  }

  dispose() {
    this.cache.clear();
    this.draco.dispose();
  }
}
