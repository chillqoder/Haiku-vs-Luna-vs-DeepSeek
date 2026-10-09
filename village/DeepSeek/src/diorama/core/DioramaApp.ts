import * as THREE from 'three';
import { CameraController } from './CameraController';
import { Lighting } from './Lighting';
import { World } from '../world/World';
import { CharacterManager } from '../simulation/CharacterManager';
import { Time } from '../utils/Time';
import type { SimulationConfig } from '../simulation/types';

export type AppStatus = 'booting' | 'loading' | 'ready' | 'error';

export interface DioramaAppOptions {
  container: HTMLElement;
  configUrl?: string;
  onStatus?: (status: AppStatus) => void;
}

/**
 * Central facade: owns the renderer, scene graph, render loop and disposal.
 * Construction never throws on missing WebGL — the error surfaces through
 * the status callback so the UI can degrade gracefully.
 */
export class DioramaApp {
  private readonly container: HTMLElement;
  private readonly configUrl: string;
  private readonly onStatus?: (status: AppStatus) => void;
  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene = new THREE.Scene();
  private readonly cameraController: CameraController;
  private readonly lighting: Lighting;
  private readonly world: World;
  private readonly characters: CharacterManager;
  private readonly time = new Time();
  private readonly resizeObserver: ResizeObserver;
  private raf = 0;
  private disposed = false;
  private started = false;
  private elapsed = 0;

  constructor(options: DioramaAppOptions) {
    this.container = options.container;
    this.configUrl = options.configUrl ?? '/api/simulation-config';
    this.onStatus = options.onStatus;

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance',
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(this.width(), this.height());
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.domElement.classList.add('diorama-canvas');
    this.container.appendChild(this.renderer.domElement);

    this.scene.background = new THREE.Color('#b6dcff');
    this.scene.fog = new THREE.Fog('#cfe6fb', 60, 150);

    this.cameraController = new CameraController(this.renderer.domElement, this.aspect());
    this.lighting = new Lighting(this.scene);

    this.world = new World();
    this.scene.add(this.world.group);

    this.characters = new CharacterManager(this.scene, this.world.context);

    this.resizeObserver = new ResizeObserver(() => this.handleResize());
    this.resizeObserver.observe(this.container);

    this.onStatus?.('booting');
  }

  async start(): Promise<void> {
    if (this.started || this.disposed) return;
    this.started = true;
    this.raf = requestAnimationFrame(this.tick);
    await this.loadSimulation();
  }

  private async loadSimulation(): Promise<void> {
    this.onStatus?.('loading');
    try {
      const config = await this.characters.load(this.configUrl);
      this.applyConfig(config);
      this.onStatus?.('ready');
    } catch (error) {
      console.error('[diorama] failed to load simulation config', error);
      this.onStatus?.('error');
    }
  }

  private applyConfig(config: SimulationConfig): void {
    this.scene.background = new THREE.Color(config.environment.clearColor);
    this.scene.fog = new THREE.Fog(
      config.environment.fog.color,
      config.environment.fog.near,
      config.environment.fog.far,
    );
    this.lighting.applyConfig(config.environment);
    this.cameraController.applyConfig(config.environment.camera);
  }

  private readonly tick = (): void => {
    if (this.disposed) return;
    const dt = this.time.update();
    this.elapsed += dt;

    this.world.update(this.elapsed, dt);
    this.characters.update(dt, this.elapsed);
    this.cameraController.update();

    this.renderer.render(this.scene, this.cameraController.camera);
    this.raf = requestAnimationFrame(this.tick);
  };

  private handleResize(): void {
    if (this.disposed) return;
    if (!this.width() || !this.height()) return;
    this.renderer.setSize(this.width(), this.height());
    this.cameraController.setAspect(this.aspect());
  }

  private width(): number {
    return this.container.clientWidth || 1;
  }

  private height(): number {
    return this.container.clientHeight || 1;
  }

  private aspect(): number {
    return this.width() / this.height();
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;

    cancelAnimationFrame(this.raf);
    this.resizeObserver.disconnect();
    this.characters.dispose();
    this.cameraController.dispose();
    this.time.dispose();
    disposeSceneResources(this.scene);
    this.renderer.dispose();
    this.renderer.forceContextLoss();

    if (this.renderer.domElement.parentElement === this.container) {
      this.container.removeChild(this.renderer.domElement);
    }
  }
}

function disposeSceneResources(scene: THREE.Scene): void {
  const geometries = new Set<THREE.BufferGeometry>();
  const materials = new Set<THREE.Material>();
  const textures = new Set<THREE.Texture>();

  scene.traverse((object) => {
    const mesh = object as THREE.Mesh;
    if (mesh.geometry instanceof THREE.BufferGeometry) geometries.add(mesh.geometry);
    const meshMaterials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    for (const material of meshMaterials) {
      if (material instanceof THREE.Material) materials.add(material);
    }
  });

  for (const material of materials) {
    for (const value of Object.values(material)) {
      if (value instanceof THREE.Texture) textures.add(value);
    }
    material.dispose();
  }
  for (const texture of textures) texture.dispose();
  for (const geometry of geometries) geometry.dispose();
}
