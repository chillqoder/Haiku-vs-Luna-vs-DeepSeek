import * as THREE from 'three';
import { HEMISPHERE, SUN } from '../world/layout';
import type { EnvironmentConfig } from '../simulation/types';

/**
 * Warm directional sunlight (PCFSoftShadowMap, tuned frustum) plus a
 * hemisphere fill that lifts the island's shadowed underside.
 */
export class Lighting {
  readonly sun: THREE.DirectionalLight;
  readonly hemisphere: THREE.HemisphereLight;

  constructor(scene: THREE.Scene) {
    this.sun = new THREE.DirectionalLight(SUN.color, SUN.intensity);
    this.sun.position.set(...SUN.position);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    this.sun.shadow.camera.left = -22;
    this.sun.shadow.camera.right = 22;
    this.sun.shadow.camera.top = 22;
    this.sun.shadow.camera.bottom = -22;
    this.sun.shadow.camera.near = 1;
    this.sun.shadow.camera.far = 90;
    this.sun.shadow.bias = -0.0006;
    this.sun.shadow.normalBias = 0.03;
    scene.add(this.sun);
    scene.add(this.sun.target);

    this.hemisphere = new THREE.HemisphereLight(
      HEMISPHERE.skyColor,
      HEMISPHERE.groundColor,
      HEMISPHERE.intensity,
    );
    this.hemisphere.position.set(0, 24, 0);
    scene.add(this.hemisphere);
  }

  applyConfig(config: EnvironmentConfig): void {
    this.sun.position.set(...config.sun.position);
    this.sun.color.set(config.sun.color);
    this.sun.intensity = config.sun.intensity;
    this.hemisphere.color.set(config.hemisphere.skyColor);
    this.hemisphere.groundColor.set(config.hemisphere.groundColor);
    this.hemisphere.intensity = config.hemisphere.intensity;
  }
}
