// Рендерер: WebGL-рендерер, перспективная камера с горизонтальным следованием за героем, свет.
import * as THREE from 'three';

const VIEW_WIDTH = 20;  // сколько единиц мира видно по горизонтали (на глубине героя)
const CAM_DIST = 17;    // расстояние камеры до плоскости героя (z = 0)
const CAM_HEIGHT = 4.2;

export class Renderer {
  constructor(container) {
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(40, 1, 0.1, 300);

    this.ambient = new THREE.AmbientLight(0xffffff, 0.6);
    this.sun = new THREE.DirectionalLight(0xffffff, 1.1);
    this.sun.position.set(-6, 12, 14);
    this.hemi = new THREE.HemisphereLight(0x8fb4ff, 0x222233, 0.5);
    this.scene.add(this.ambient, this.sun, this.hemi);

    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.renderer.setSize(w, h);
    this.camera.aspect = w / h;
    this.updateFov();
  }

  // Подбираем вертикальный FOV так, чтобы по горизонту всегда было VIEW_WIDTH единиц,
  // независимо от размера окна.
  updateFov() {
    const aspect = Math.max(this.camera.aspect, 0.5);
    const halfHeight = VIEW_WIDTH / 2 / aspect;
    this.camera.fov = THREE.MathUtils.radToDeg(2 * Math.atan(halfHeight / CAM_DIST));
    this.camera.updateProjectionMatrix();
  }

  // Камера смотрит на центр видимой части уровня и чуть сверху — даёт лёгкую перспективу
  follow(centerX) {
    this.camera.position.set(centerX, CAM_HEIGHT, CAM_DIST);
    this.camera.lookAt(centerX, 1.6, 0);
  }

  setTheme(theme) {
    this.renderer.setClearColor(theme.clear);
    this.scene.fog = new THREE.Fog(theme.fog, 30, 95);
    this.ambient.color.set(theme.ambient);
    this.sun.color.set(theme.sun);
    this.hemi.color.set(theme.sky);
    this.hemi.groundColor.set(theme.ground);
  }

  render() {
    this.renderer.render(this.scene, this.camera);
  }
}

export { VIEW_WIDTH };
