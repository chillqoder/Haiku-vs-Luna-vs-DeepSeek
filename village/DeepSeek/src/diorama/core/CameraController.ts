import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { CAMERA } from '../world/layout';
import type { CameraConfig } from '../simulation/types';

/**
 * Orbit camera locked to the island center: no panning, polar clamp between
 * 15° and 75°, smooth damping. All values are overridable by the runtime
 * simulation config.
 */
export class CameraController {
  readonly camera: THREE.PerspectiveCamera;
  readonly controls: OrbitControls;

  constructor(domElement: HTMLElement, aspect: number) {
    this.camera = new THREE.PerspectiveCamera(45, aspect, 0.1, 400);
    this.camera.position.set(...CAMERA.startPosition);

    this.controls = new OrbitControls(this.camera, domElement);
    this.controls.target.set(...CAMERA.target);
    this.controls.enablePan = false;
    this.controls.enableDamping = true;
    this.controls.dampingFactor = CAMERA.dampingFactor;
    this.controls.minDistance = CAMERA.minDistance;
    this.controls.maxDistance = CAMERA.maxDistance;
    this.controls.minPolarAngle = THREE.MathUtils.degToRad(CAMERA.minPolarDeg);
    this.controls.maxPolarAngle = THREE.MathUtils.degToRad(CAMERA.maxPolarDeg);
    this.controls.update();
  }

  applyConfig(config: CameraConfig): void {
    this.controls.target.set(...config.target);
    this.controls.enablePan = false;
    this.controls.dampingFactor = config.dampingFactor;
    this.controls.minDistance = config.minDistance;
    this.controls.maxDistance = config.maxDistance;
    this.controls.minPolarAngle = THREE.MathUtils.degToRad(config.minPolarDeg);
    this.controls.maxPolarAngle = THREE.MathUtils.degToRad(config.maxPolarDeg);
    this.controls.update();
  }

  setAspect(aspect: number): void {
    this.camera.aspect = aspect;
    this.camera.updateProjectionMatrix();
  }

  update(): void {
    this.controls.update();
  }

  dispose(): void {
    this.controls.dispose();
  }
}
