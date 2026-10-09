import {
  ACESFilmicToneMapping,
  PCFSoftShadowMap,
  PerspectiveCamera,
  Scene,
  SRGBColorSpace,
  WebGLRenderer,
} from "three";
import { CameraController } from "./CameraController";
import { addLighting } from "./Lighting";
import { createIsland } from "../world/Island";
import { createEnvironment, type EnvironmentController } from "../world/Environment";
import { CharacterManager } from "../simulation/CharacterManager";
import { Time } from "../utils/Time";
import { disposeObjectTree } from "../utils/dispose";
import type { SimulationManifest } from "../types";

export class DioramaApp {
  readonly scene = new Scene();
  readonly camera = new PerspectiveCamera(39, 1, 0.1, 100);
  readonly renderer: WebGLRenderer;
  readonly cameraController: CameraController;
  private readonly time = new Time();
  private readonly environment: EnvironmentController;
  private readonly characters: CharacterManager;
  private readonly island = createIsland();
  private readonly resizeObserver: ResizeObserver;
  private frameHandle = 0;
  private simulationTime = 0;
  private paused = false;
  private disposed = false;

  constructor(private readonly container: HTMLElement) {
    this.renderer = new WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
    this.renderer.setSize(container.clientWidth || window.innerWidth, container.clientHeight || window.innerHeight, false);
    this.renderer.outputColorSpace = SRGBColorSpace;
    this.renderer.toneMapping = ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = PCFSoftShadowMap;
    this.renderer.domElement.setAttribute("aria-label", "Interactive 3D floating island village");
    this.renderer.domElement.setAttribute("role", "img");
    container.appendChild(this.renderer.domElement);

    this.cameraController = new CameraController(this.camera, this.renderer.domElement);
    addLighting(this.scene);
    this.scene.add(this.island);
    this.environment = createEnvironment(this.scene);
    this.characters = new CharacterManager(this.scene, [-4.08, 0.37, 0.55]);

    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(container);
    this.resize();
  }

  start() {
    if (this.disposed || this.frameHandle) return;
    void this.characters.initialize((manifest: SimulationManifest) => {
      this.island.position.set(...manifest.island.center);
      this.island.scale.set(manifest.island.topRadius[0] / 8.45, 1, manifest.island.topRadius[1] / 6.5);
      this.environment.group.position.set(...manifest.island.center);
      this.characters.setIslandCenter(manifest.island.center);
    });
    this.frameHandle = requestAnimationFrame(this.renderFrame);
  }

  setPaused(paused: boolean) {
    this.paused = paused;
  }

  resetCamera() {
    this.cameraController.reset();
  }

  private readonly renderFrame = () => {
    if (this.disposed) return;
    this.frameHandle = requestAnimationFrame(this.renderFrame);
    this.time.tick();
    this.cameraController.update();
    if (!this.paused) {
      this.simulationTime += this.time.delta;
      this.environment.update(this.simulationTime);
      this.characters.update(this.simulationTime, this.time.delta);
    }
    this.renderer.render(this.scene, this.camera);
  };

  private resize() {
    if (this.disposed) return;
    const width = Math.max(this.container.clientWidth, 1);
    const height = Math.max(this.container.clientHeight, 1);
    const aspect = width / height;
    const horizontalView = (34 * Math.PI) / 180;
    const verticalView = 2 * Math.atan(Math.tan(horizontalView / 2) / Math.min(aspect, 1));
    this.camera.fov = Math.max(39, Math.min(72, (verticalView * 180) / Math.PI));
    this.camera.aspect = aspect;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height, false);
  }

  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    cancelAnimationFrame(this.frameHandle);
    this.resizeObserver.disconnect();
    this.cameraController.dispose();
    this.characters.dispose();
    this.time.dispose();
    disposeObjectTree(this.scene);
    this.scene.clear();
    this.renderer.renderLists.dispose();
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }
}
