import {
  BoxGeometry,
  CircleGeometry,
  CylinderGeometry,
  Group,
  Mesh,
  MeshStandardMaterial,
} from "three";

const stone = new MeshStandardMaterial({ color: "#9c9a88", flatShading: true, roughness: 1 });
const lightStone = new MeshStandardMaterial({ color: "#c0bda8", flatShading: true, roughness: 1 });
const darkStone = new MeshStandardMaterial({ color: "#6c7473", flatShading: true, roughness: 1 });
const wood = new MeshStandardMaterial({ color: "#78523a", flatShading: true, roughness: 1 });
const darkWood = new MeshStandardMaterial({ color: "#503d30", flatShading: true, roughness: 1 });
const roofMaterials = [
  new MeshStandardMaterial({ color: "#526a6d", flatShading: true, roughness: 1 }),
  new MeshStandardMaterial({ color: "#94764e", flatShading: true, roughness: 1 }),
  new MeshStandardMaterial({ color: "#73564a", flatShading: true, roughness: 1 }),
];
const plasterMaterials = [
  new MeshStandardMaterial({ color: "#e6d4a5", flatShading: true, roughness: 1 }),
  new MeshStandardMaterial({ color: "#dfc99b", flatShading: true, roughness: 1 }),
  new MeshStandardMaterial({ color: "#d8cba8", flatShading: true, roughness: 1 }),
  new MeshStandardMaterial({ color: "#e2cdaa", flatShading: true, roughness: 1 }),
];
const windowMaterial = new MeshStandardMaterial({ color: "#98b7b2", flatShading: true, roughness: 0.65, emissive: "#334b43", emissiveIntensity: 0.22 });

function box(group: Group, material: MeshStandardMaterial, size: [number, number, number], position: [number, number, number]) {
  const mesh = new Mesh(new BoxGeometry(...size), material);
  mesh.position.set(...position);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  group.add(mesh);
  return mesh;
}

function cylinder(group: Group, material: MeshStandardMaterial, top: number, bottom: number, height: number, radial: number, position: [number, number, number]) {
  const mesh = new Mesh(new CylinderGeometry(top, bottom, height, radial), material);
  mesh.position.set(...position);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  group.add(mesh);
  return mesh;
}

export function createCastle(): Group {
  const castle = new Group();
  castle.name = "North keep";
  castle.position.set(0.25, 0.2, 5.0);

  box(castle, darkStone, [4.35, 0.42, 3.2], [0, 0.21, 0]);
  box(castle, stone, [3.15, 0.42, 2.6], [0, 0.57, 0]);
  box(castle, stone, [2.55, 1.85, 2.05], [0, 1.68, 0.08]);

  const towerPositions: [number, number][] = [[-1.25, -0.96], [1.25, -0.96], [-1.25, 1.0], [1.25, 1.0]];
  for (const [x, z] of towerPositions) {
    cylinder(castle, lightStone, 0.39, 0.47, 2.3, 7, [x, 1.73, z]);
    cylinder(castle, darkStone, 0.45, 0.4, 0.16, 7, [x, 2.94, z]);
    for (let i = 0; i < 5; i += 1) {
      const angle = (i / 5) * Math.PI * 2;
      box(castle, lightStone, [0.17, 0.28, 0.17], [x + Math.cos(angle) * 0.34, 3.12, z + Math.sin(angle) * 0.34]);
    }
  }

  for (let i = -2; i <= 2; i += 1) {
    box(castle, lightStone, [0.34, 0.3, 0.3], [i * 0.42, 2.76, -0.76]);
    box(castle, lightStone, [0.34, 0.3, 0.3], [i * 0.42, 2.76, 0.96]);
  }

  // South-facing arched gate and the royal viewing balcony.
  box(castle, darkWood, [0.72, 1.12, 0.12], [0, 1.13, -0.97]);
  box(castle, lightStone, [0.92, 0.18, 0.32], [0, 0.92, -1.25]);
  box(castle, wood, [1.9, 0.15, 0.72], [0, 1.05, -1.48]);
  for (const x of [-0.85, 0.85]) box(castle, wood, [0.12, 0.42, 0.12], [x, 1.32, -1.72]);
  box(castle, wood, [1.82, 0.1, 0.1], [0, 1.48, -1.72]);
  for (let i = -2; i <= 2; i += 1) box(castle, wood, [0.08, 0.3, 0.08], [i * 0.3, 1.27, -1.72]);

  for (const x of [-0.74, 0.74]) {
    const window = box(castle, windowMaterial, [0.38, 0.46, 0.06], [x, 1.82, -0.98]);
    box(castle, wood, [0.06, 0.52, 0.08], [x, 1.82, -1.03]);
    window.castShadow = false;
  }
  const bannerMaterial = new MeshStandardMaterial({ color: "#a74e52", flatShading: true, roughness: 1 });
  box(castle, wood, [0.05, 1.2, 0.05], [1.88, 2.4, 0]);
  box(castle, bannerMaterial, [0.05, 0.62, 0.34], [1.92, 2.73, 0.16]);
  box(castle, wood, [0.05, 1.2, 0.05], [-1.88, 2.4, 0]);
  box(castle, bannerMaterial, [0.05, 0.62, 0.34], [-1.92, 2.73, -0.16]);
  return castle;
}

export interface CottageOptions {
  x: number;
  z: number;
  rotation?: number;
  style?: number;
}

export function createCottage(options: CottageOptions): Group {
  const house = new Group();
  house.name = "Village cottage";
  house.position.set(options.x, 0.2, options.z);
  house.rotation.y = options.rotation ?? 0;
  const style = (options.style ?? 0) % plasterMaterials.length;
  const roof = roofMaterials[(options.style ?? 0) % roofMaterials.length];

  box(house, plasterMaterials[style], [1.45, 0.98, 1.24], [0, 0.55, 0]);
  const roofLeft = box(house, roof, [0.88, 0.14, 1.52], [-0.43, 1.17, 0]);
  roofLeft.rotation.z = -0.54;
  const roofRight = box(house, roof, [0.88, 0.14, 1.52], [0.43, 1.17, 0]);
  roofRight.rotation.z = 0.54;
  box(house, darkWood, [0.12, 0.84, 0.08], [-0.63, 0.57, 0.64]);
  box(house, darkWood, [0.12, 0.84, 0.08], [0.63, 0.57, 0.64]);
  box(house, wood, [0.48, 0.76, 0.12], [0.08, 0.4, 0.64]);
  box(house, darkWood, [0.07, 0.72, 0.08], [0.08, 0.4, 0.72]);
  box(house, wood, [1.48, 0.12, 0.12], [0, 0.99, 0.67]);
  box(house, wood, [1.48, 0.12, 0.12], [0, 0.1, 0.67]);
  for (const x of [-0.78, 0.78]) box(house, darkWood, [0.1, 1.1, 0.1], [x, 0.62, 0.64]);

  for (const x of [-0.45, 0.47]) {
    const window = box(house, windowMaterial, [0.26, 0.3, 0.05], [x, 0.7, 0.64]);
    box(house, wood, [0.045, 0.34, 0.07], [x, 0.7, 0.68]);
    box(house, wood, [0.3, 0.045, 0.07], [x, 0.7, 0.68]);
    window.castShadow = false;
  }

  // A short block chimney, with the smoke puffs animated by Environment.
  box(house, darkStone, [0.32, 0.7, 0.34], [0.45, 1.34, -0.38]);
  box(house, stone, [0.42, 0.12, 0.42], [0.45, 1.72, -0.38]);
  house.userData.smokeOrigin = [options.x + 0.45, 1.8, options.z - 0.38];
  return house;
}
