import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

/**
 * Орбитальная камера вокруг центра острова (0, 0, 0).
 * Горизонтальный обзор полный (360°), вертикальный угол ограничен 15°–75° от оси Y,
 * панорамирование отключено, демпфирование 0.05.
 */
export class CameraController {
  private readonly controls: OrbitControls;

  constructor(camera: THREE.PerspectiveCamera, domElement: HTMLElement) {
    this.controls = new OrbitControls(camera, domElement);
    this.controls.target.set(0, 0, 0);
    this.controls.enablePan = false;
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.minPolarAngle = THREE.MathUtils.degToRad(15);
    this.controls.maxPolarAngle = THREE.MathUtils.degToRad(75);
    this.controls.minDistance = 16;
    this.controls.maxDistance = 42;
    this.controls.update();
  }

  /** Вызывается каждый кадр: нужен для демпфирования. */
  update(): void {
    this.controls.update();
  }

  dispose(): void {
    this.controls.dispose();
  }
}
