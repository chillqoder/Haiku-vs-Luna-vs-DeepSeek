import * as THREE from 'three';

export class Renderer {
  constructor(canvas) {
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.Fog('#17243c', 35, 110);
    this.camera = new THREE.PerspectiveCamera(43, 1, 0.1, 160);
    this.camera.position.set(0, 7, 22);
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.65));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.16;

    this.scene.add(new THREE.HemisphereLight('#c2e6ff', '#293044', 2.1));
    const key = new THREE.DirectionalLight('#ffe1bd', 2.8);
    key.position.set(-8, 13, 10);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    key.shadow.camera.left = -15;
    key.shadow.camera.right = 15;
    key.shadow.camera.top = 14;
    key.shadow.camera.bottom = -8;
    this.scene.add(key);
    const rim = new THREE.DirectionalLight('#70d9f5', 1.25);
    rim.position.set(5, 8, -7);
    this.scene.add(rim);
  }

  resize(width, height) {
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height, false);
  }

  render() { this.renderer.render(this.scene, this.camera); }
}
