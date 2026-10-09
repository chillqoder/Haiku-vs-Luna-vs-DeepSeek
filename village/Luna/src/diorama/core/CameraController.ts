import { PerspectiveCamera, Vector3 } from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

export class CameraController {
  readonly camera: PerspectiveCamera;
  readonly controls: OrbitControls;
  private readonly homePosition = new Vector3(15.5, 18.5, 20.5);
  private readonly homeTarget = new Vector3(0, -0.05, 0);

  constructor(camera: PerspectiveCamera, element: HTMLElement) {
    this.camera = camera;
    this.camera.position.copy(this.homePosition);
    this.controls = new OrbitControls(camera, element);
    this.controls.target.copy(this.homeTarget);
    this.controls.enablePan = false;
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.minPolarAngle = (15 * Math.PI) / 180;
    this.controls.maxPolarAngle = (75 * Math.PI) / 180;
    this.controls.minDistance = 16;
    this.controls.maxDistance = 34;
    this.controls.rotateSpeed = 0.62;
    this.controls.zoomSpeed = 0.8;
    this.controls.update();
  }

  update() {
    this.controls.update();
  }

  reset() {
    this.camera.position.copy(this.homePosition);
    this.controls.target.copy(this.homeTarget);
    this.controls.update();
  }

  dispose() {
    this.controls.dispose();
  }
}
