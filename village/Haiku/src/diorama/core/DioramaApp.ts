import * as THREE from 'three';
import { Environment } from '../world/Environment';
import { CharacterManager } from '../simulation/CharacterManager';
import { AssetLoader } from '../utils/AssetLoader';
import { Time } from '../utils/Time';
import { CameraController } from './CameraController';
import { Lighting } from './Lighting';

export type DioramaStatus = { state: 'loading' } | { state: 'ready'; characters: number } | { state: 'error'; message: string };

export interface DioramaOptions {
  onStatus?: (status: DioramaStatus) => void;
}

/**
 * Фасад 3D-движка: рендерер, сцена, камера, цикл requestAnimationFrame и освобождение ресурсов.
 * Один экземпляр на один смонтированный контейнер. Сначала вызывается start(), в конце dispose().
 */
export class DioramaApp {
  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene = new THREE.Scene();
  private readonly camera: THREE.PerspectiveCamera;
  private readonly cameraController: CameraController;
  private readonly lighting: Lighting;
  private readonly environment: Environment;
  private readonly assets = new AssetLoader();
  private readonly characters: CharacterManager;
  private readonly characterRoot = new THREE.Group();
  private readonly time = new Time();
  private readonly resizeObserver: ResizeObserver;
  private readonly abort = new AbortController();
  private frameId = 0;
  private disposed = false;

  constructor(
    private readonly container: HTMLElement,
    private readonly options: DioramaOptions = {},
  ) {
    const { width, height } = this.measure();

    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(width, height);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    container.appendChild(this.renderer.domElement);

    this.camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 400);
    this.camera.position.set(0, 15.5, 24.5);

    this.scene.background = new THREE.Color('#9fd8f5');
    this.scene.fog = new THREE.Fog('#bfe6fa', 45, 110);

    this.lighting = new Lighting(this.scene);
    this.environment = new Environment(this.scene);
    this.scene.add(this.characterRoot);

    this.characters = new CharacterManager(this.assets, this.characterRoot, { ripples: this.environment.ripples });
    this.cameraController = new CameraController(this.camera, this.renderer.domElement);

    this.resizeObserver = new ResizeObserver(() => this.handleResize());
    this.resizeObserver.observe(container);
  }

  /** Запускает цикл кадров и асинхронную загрузку персонажей. */
  start(): void {
    this.options.onStatus?.({ state: 'loading' });
    this.characters
      .load(this.abort.signal)
      .then((characters) => {
        if (!this.abort.signal.aborted) this.options.onStatus?.({ state: 'ready', characters });
      })
      .catch((error: unknown) => {
        if (this.abort.signal.aborted) return;
        console.error(error);
        this.options.onStatus?.({ state: 'error', message: error instanceof Error ? error.message : 'Неизвестная ошибка' });
      });
    this.tick();
  }

  /** Останавливает цикл, отменяет загрузку и освобождает GPU-ресурсы. Повторный вызов безопасен. */
  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;

    cancelAnimationFrame(this.frameId);
    this.abort.abort();
    this.resizeObserver.disconnect();
    this.characters.dispose();
    this.environment.dispose();
    this.cameraController.dispose();
    this.lighting.dispose();
    this.assets.dispose();
    this.time.dispose();
    this.renderer.dispose();
    this.renderer.forceContextLoss();
    this.renderer.domElement.remove();
  }

  private readonly tick = (): void => {
    this.frameId = requestAnimationFrame(this.tick);
    const { delta, elapsed } = this.time.tick();
    this.cameraController.update();
    this.environment.update(delta, elapsed);
    this.characters.update(delta);
    this.renderer.render(this.scene, this.camera);
  };

  private handleResize(): void {
    const { width, height } = this.measure();
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  private measure(): { width: number; height: number } {
    const rect = this.container.getBoundingClientRect();
    return {
      width: Math.max(1, Math.floor(rect.width)),
      height: Math.max(1, Math.floor(rect.height)),
    };
  }
}
