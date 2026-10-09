import { Color, DirectionalLight, Fog, HemisphereLight, Scene } from "three";

export function addLighting(scene: Scene) {
  scene.background = new Color("#b9d9e8");
  scene.fog = new Fog("#b9d9e8", 30, 62);

  const hemisphere = new HemisphereLight("#eff5ef", "#65705d", 2.05);
  hemisphere.position.set(0, 25, 0);
  scene.add(hemisphere);

  const sun = new DirectionalLight("#fff0ce", 4.1);
  sun.position.set(-9, 18, 11);
  sun.target.position.set(0, 0, 0);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -15;
  sun.shadow.camera.right = 15;
  sun.shadow.camera.top = 17;
  sun.shadow.camera.bottom = -15;
  sun.shadow.camera.near = 1;
  sun.shadow.camera.far = 42;
  sun.shadow.bias = -0.00018;
  sun.shadow.normalBias = 0.025;
  sun.shadow.radius = 2.1;
  scene.add(sun, sun.target);
}
