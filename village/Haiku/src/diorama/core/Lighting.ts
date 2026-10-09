import * as THREE from 'three';

/**
 * Тёплое солнце с мягкими тенями и небесный полусферный свет.
 * PCFSoftShadowMap удалён в three.js: мягкость теней задаём через shadow.radius при PCFShadowMap.
 */
export class Lighting {
  readonly sun: THREE.DirectionalLight;
  readonly hemisphere: THREE.HemisphereLight;

  constructor(scene: THREE.Scene) {
    this.hemisphere = new THREE.HemisphereLight(0xd6f0ff, 0x6f8f3c, 1.1);

    this.sun = new THREE.DirectionalLight(0xffe2b8, 2.6);
    this.sun.position.set(12, 22, 16);
    this.sun.target.position.set(0, 0, 0);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    this.sun.shadow.bias = -0.0006;
    this.sun.shadow.normalBias = 0.03;
    this.sun.shadow.radius = 3;

    // Ортографическая камера теней покрывает весь остров с запасом.
    const shadowCamera = this.sun.shadow.camera;
    shadowCamera.left = -17;
    shadowCamera.right = 17;
    shadowCamera.top = 17;
    shadowCamera.bottom = -17;
    shadowCamera.near = 1;
    shadowCamera.far = 70;
    shadowCamera.updateProjectionMatrix();

    scene.add(this.hemisphere, this.sun, this.sun.target);
  }

  dispose(): void {
    this.sun.shadow.map?.dispose();
  }
}
