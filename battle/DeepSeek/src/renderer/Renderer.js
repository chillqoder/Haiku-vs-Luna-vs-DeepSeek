// Three.js renderer, camera rig, lights, screen shake and post-ish effects.

import * as THREE from 'three';
import { CAMERA } from '../core/Constants.js';

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.webgl = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    this.webgl.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.webgl.shadowMap.enabled = true;
    this.webgl.shadowMap.type = THREE.PCFSoftShadowMap;
    this.webgl.toneMapping = THREE.ACESFilmicToneMapping;
    this.webgl.toneMappingExposure = 1.05;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0a0d1a);
    this.scene.fog = new THREE.Fog(0x0a0d1a, 34, 85);

    this.camera = new THREE.PerspectiveCamera(CAMERA.fov, 16 / 9, 0.1, 240);
    this.camX = 0;
    this.targetX = 0;
    this.lean = 0;

    // --- Lights ---
    this.hemi = new THREE.HemisphereLight(0x8899cc, 0x223044, 0.85);
    this.scene.add(this.hemi);

    this.dirLight = new THREE.DirectionalLight(0xffffff, 1.35);
    this.dirLight.position.set(10, 18, 9);
    this.dirLight.castShadow = true;
    this.dirLight.shadow.mapSize.set(1024, 1024);
    this.dirLight.shadow.camera.near = 1;
    this.dirLight.shadow.camera.far = 60;
    this.dirLight.shadow.camera.left = -22;
    this.dirLight.shadow.camera.right = 22;
    this.dirLight.shadow.camera.top = 22;
    this.dirLight.shadow.camera.bottom = -22;
    this.dirLight.shadow.bias = -0.002;
    this.scene.add(this.dirLight);
    this.scene.add(this.dirLight.target);

    this.fillLight = new THREE.DirectionalLight(0x6688ff, 0.35);
    this.fillLight.position.set(-8, 6, -10);
    this.scene.add(this.fillLight);

    // --- Shake ---
    this.shakeAmount = 0;
    this.shakeTime = 0;
    this.shakeDur = 0.001;
    this._shakeOffset = new THREE.Vector3();

    // flash overlay (DOM-free: handled by HUD)

    this.resize();
  }

  setTheme(theme) {
    if (!theme) return;
    if (theme.background !== undefined) this.scene.background = new THREE.Color(theme.background);
    if (theme.fog) this.scene.fog = new THREE.Fog(theme.fog.color, theme.fog.near, theme.fog.far);
    if (theme.hemi) this.hemi.color = new THREE.Color(theme.hemi);
    if (theme.hemiGround) this.hemi.groundColor = new THREE.Color(theme.hemiGround);
    if (theme.sun !== undefined) this.dirLight.color = new THREE.Color(theme.sun);
  }

  follow(targetX, dt, bounds, lean = 0, snap = false) {
    this.lean = lean;
    let x = targetX + lean;
    if (bounds) {
      x = Math.max(bounds.min + 0, Math.min(x, bounds.max));
    }
    if (snap) {
      this.camX = x;
    } else {
      this.camX += (x - this.camX) * Math.min(1, dt * 5.5);
    }
    this.targetX = x;
  }

  addShake(amount, duration = 0.3) {
    if (amount > this.shakeAmount) {
      this.shakeAmount = amount;
      this.shakeDur = duration;
      this.shakeTime = duration;
    }
  }

  update(dt) {
    // Shake decay
    let sx = 0, sy = 0;
    if (this.shakeTime > 0) {
      this.shakeTime -= dt;
      const k = Math.max(0, this.shakeTime / this.shakeDur);
      const amp = this.shakeAmount * k * k;
      sx = (Math.random() * 2 - 1) * amp;
      sy = (Math.random() * 2 - 1) * amp * 0.7;
      if (this.shakeTime <= 0) this.shakeAmount = 0;
    }

    const cx = this.camX;
    this.camera.position.set(cx + sx, CAMERA.height + sy, CAMERA.distance);
    this.camera.lookAt(cx + this.lean * 0.55 + sx * 0.3, CAMERA.lookHeight + sy * 0.5, 0);

    // Move sun with the camera so shadows stay crisp near the action.
    this.dirLight.position.set(cx + 10, 18, 9);
    this.dirLight.target.position.set(cx, 0, 0);
    this.dirLight.target.updateMatrixWorld();

    this.webgl.render(this.scene, this.camera);
  }

  resize() {
    const w = this.canvas.clientWidth || window.innerWidth;
    const h = this.canvas.clientHeight || window.innerHeight;
    this.webgl.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();

    // Approximate half-width of the visible play area at the action plane.
    const dist = Math.hypot(CAMERA.distance, CAMERA.height - CAMERA.lookHeight);
    const halfH = Math.tan(((CAMERA.fov * Math.PI) / 180) / 2) * dist;
    this.viewHalfX = halfH * this.camera.aspect;
  }
}
