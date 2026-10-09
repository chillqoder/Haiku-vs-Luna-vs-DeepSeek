import type { AnimationClip } from 'three';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import type { Group } from 'three';

export interface CharacterAsset {
  scene: Group;
  animations: AnimationClip[];
}

/**
 * Cached GLTF pipeline with Draco support. Every load is best-effort: when a
 * model file is missing the promise resolves to `null` and the caller falls
 * back to the procedural low-poly mesh factory, so the diorama always runs
 * with zero external assets.
 */
export class AssetLoader {
  private gltfLoader: GLTFLoader | null = null;
  private dracoLoader: DRACOLoader | null = null;
  private readonly cache = new Map<string, Promise<CharacterAsset | null>>();

  constructor(
    private readonly basePath = '/models/',
    private readonly dracoPath = '/draco/',
  ) {}

  load(file: string): Promise<CharacterAsset | null> {
    const url = file.startsWith('/') || file.startsWith('http') ? file : this.basePath + file;
    let pending = this.cache.get(url);
    if (!pending) {
      pending = this.loadInternal(url);
      this.cache.set(url, pending);
    }
    return pending;
  }

  private async loadInternal(url: string): Promise<CharacterAsset | null> {
    try {
      const loader = this.getGltfLoader();
      const gltf = await loader.loadAsync(url);
      return { scene: gltf.scene, animations: gltf.animations };
    } catch (error) {
      console.info(
        `[asset-loader] "${url}" unavailable, using procedural mesh fallback.`,
        error instanceof Error ? error.message : error,
      );
      return null;
    }
  }

  private getGltfLoader(): GLTFLoader {
    if (!this.gltfLoader) {
      this.gltfLoader = new GLTFLoader();
      if (!this.dracoLoader) {
        this.dracoLoader = new DRACOLoader();
        this.dracoLoader.setDecoderPath(this.dracoPath);
      }
      this.gltfLoader.setDRACOLoader(this.dracoLoader);
    }
    return this.gltfLoader;
  }

  dispose(): void {
    this.cache.clear();
    this.dracoLoader?.dispose();
    this.gltfLoader = null;
    this.dracoLoader = null;
  }
}
