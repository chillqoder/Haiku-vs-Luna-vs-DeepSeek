import {
  BoxGeometry,
  BufferGeometry,
  CatmullRomCurve3,
  CircleGeometry,
  ConeGeometry,
  CylinderGeometry,
  DodecahedronGeometry,
  Float32BufferAttribute,
  Group,
  Mesh,
  MeshStandardMaterial,
  Scene,
  SphereGeometry,
  Vector3,
} from "three";
import { createCastle, createCottage } from "./Buildings";

const wood = new MeshStandardMaterial({ color: "#80563a", flatShading: true, roughness: 1 });
const paleWood = new MeshStandardMaterial({ color: "#b88754", flatShading: true, roughness: 1 });
const darkWood = new MeshStandardMaterial({ color: "#4d392c", flatShading: true, roughness: 1 });
const stone = new MeshStandardMaterial({ color: "#888b81", flatShading: true, roughness: 1 });
const lightStone = new MeshStandardMaterial({ color: "#b6b19b", flatShading: true, roughness: 1 });
const grassGreen = ["#547f48", "#648d4e", "#749551", "#5d834b"].map((color) =>
  new MeshStandardMaterial({ color, flatShading: true, roughness: 1 }),
);
const waterMaterial = new MeshStandardMaterial({
  color: "#75aeb4",
  flatShading: true,
  roughness: 0.25,
  metalness: 0.04,
});

function addBox(parent: Group, material: MeshStandardMaterial, size: [number, number, number], position: [number, number, number], rotationY = 0) {
  const mesh = new Mesh(new BoxGeometry(...size), material);
  mesh.position.set(...position);
  mesh.rotation.y = rotationY;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

function addCylinder(parent: Group, material: MeshStandardMaterial, radiusTop: number, radiusBottom: number, height: number, sides: number, position: [number, number, number]) {
  const mesh = new Mesh(new CylinderGeometry(radiusTop, radiusBottom, height, sides), material);
  mesh.position.set(...position);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

function createPath(points: [number, number][], width: number, material: MeshStandardMaterial) {
  const group = new Group();
  const vectorPoints = points.map(([x, z]) => new Vector3(x, 0.245, z));
  const path = new CatmullRomCurve3(vectorPoints);
  const segments = Math.max(40, points.length * 18);
  const positions: number[] = [];
  const indices: number[] = [];
  for (let i = 0; i <= segments; i += 1) {
    const t = i / segments;
    const point = path.getPoint(t);
    const tangent = path.getTangent(t).setY(0).normalize();
    const offsetX = -tangent.z * width * 0.5;
    const offsetZ = tangent.x * width * 0.5;
    positions.push(point.x + offsetX, point.y, point.z + offsetZ);
    positions.push(point.x - offsetX, point.y + 0.008, point.z - offsetZ);
    if (i < segments) {
      const a = i * 2;
      indices.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
    }
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  const mesh = new Mesh(geometry, material);
  mesh.receiveShadow = true;
  group.add(mesh);
  return group;
}

function createTree(x: number, z: number, scale: number, oak = false) {
  const tree = new Group();
  tree.position.set(x, 0.2, z);
  tree.scale.setScalar(scale);
  const trunk = addCylinder(tree, wood, 0.14, 0.22, 1.0, 5, [0, 0.5, 0]);
  trunk.rotation.z = (x % 2 === 0 ? 1 : -1) * 0.055;
  if (oak) {
    for (const [lx, ly, lz, size] of [[0, 1.35, 0, 1], [-0.31, 1.42, 0.12, 0.7], [0.31, 1.46, -0.1, 0.74]] as const) {
      const canopy = new Mesh(new DodecahedronGeometry(size * 0.57, 0), grassGreen[Math.abs(Math.floor(x * 11 + z * 7 + ly)) % grassGreen.length]);
      canopy.position.set(lx, ly, lz);
      canopy.castShadow = true;
      canopy.receiveShadow = true;
      tree.add(canopy);
    }
  } else {
    for (let level = 0; level < 3; level += 1) {
      const canopy = new Mesh(new ConeGeometry(0.74 - level * 0.13, 1.02, 6, 1), grassGreen[(level + Math.abs(Math.floor(x * 5))) % grassGreen.length]);
      canopy.position.set(0, 1.1 + level * 0.5, 0);
      canopy.castShadow = true;
      canopy.receiveShadow = true;
      tree.add(canopy);
    }
  }
  return tree;
}

function addStoneCluster(parent: Group, x: number, z: number, count: number, radius = 0.35) {
  for (let i = 0; i < count; i += 1) {
    const rock = new Mesh(new DodecahedronGeometry(0.13 + (i % 3) * 0.045, 0), i % 2 ? stone : lightStone);
    rock.position.set(x + Math.sin(i * 2.4) * radius, 0.3 + (i % 2) * 0.04, z + Math.cos(i * 2.4) * radius);
    rock.rotation.set(i * 0.31, i * 0.47, i * 0.19);
    rock.castShadow = true;
    parent.add(rock);
  }
}

function createPond(world: Group) {
  const centerX = -4.55;
  const centerZ = 0.55;
  const shore = new Mesh(new CylinderGeometry(1.58, 1.7, 0.13, 15), lightStone);
  shore.position.set(centerX, 0.27, centerZ);
  shore.castShadow = true;
  shore.receiveShadow = true;
  world.add(shore);
  const water = new Mesh(new CircleGeometry(1.38, 18), waterMaterial);
  water.rotation.x = -Math.PI / 2;
  water.position.set(centerX, 0.345, centerZ);
  water.receiveShadow = true;
  world.add(water);
  for (let i = 0; i < 10; i += 1) {
    const angle = (i / 10) * Math.PI * 2;
    const rock = new Mesh(new DodecahedronGeometry(0.24 + (i % 3) * 0.04, 0), i % 2 ? stone : lightStone);
    rock.scale.set(1.1, 0.55, 0.86);
    rock.position.set(centerX + Math.cos(angle) * 1.48, 0.31, centerZ + Math.sin(angle) * 1.42);
    rock.rotation.y = angle;
    rock.castShadow = true;
    world.add(rock);
  }

  // A short plank pier reaches into the pond's eastern edge.
  for (let i = 0; i < 4; i += 1) addBox(world, paleWood, [0.38, 0.1, 0.58], [-3.22 - i * 0.36, 0.4, centerZ], -0.1);
  for (const x of [-3.15, -4.25]) {
    for (const z of [0.24, 0.86]) addBox(world, wood, [0.12, 0.42, 0.12], [x, 0.23, z]);
  }
  return { centerX, centerZ };
}

function createWell(world: Group) {
  const x = 0.25;
  const z = -1.15;
  addCylinder(world, stone, 0.56, 0.62, 0.5, 8, [x, 0.46, z]);
  const dark = new MeshStandardMaterial({ color: "#455455", flatShading: true, roughness: 0.75 });
  addCylinder(world, dark, 0.36, 0.36, 0.025, 12, [x, 0.72, z]);
  for (const side of [-1, 1]) {
    addBox(world, wood, [0.1, 1.08, 0.12], [x + side * 0.49, 0.92, z]);
  }
  addBox(world, wood, [1.15, 0.12, 0.14], [x, 1.47, z]);
  const roof = new Mesh(new ConeGeometry(0.78, 0.48, 4), new MeshStandardMaterial({ color: "#7f6145", flatShading: true, roughness: 1 }));
  roof.position.set(x, 1.78, z);
  roof.rotation.y = Math.PI / 4;
  roof.castShadow = true;
  world.add(roof);
  const spindle = addCylinder(world, paleWood, 0.07, 0.07, 0.9, 5, [x, 1.15, z]);
  spindle.rotation.z = Math.PI / 2;
}

function createWoodcutterYard(world: Group) {
  const x = 4.45;
  const z = 1.6;
  const stump = addCylinder(world, wood, 0.34, 0.42, 0.52, 7, [x + 0.55, 0.46, z - 0.45]);
  stump.rotation.z = 0.04;
  const cut = new Mesh(new CylinderGeometry(0.27, 0.3, 0.025, 7), paleWood);
  cut.position.set(x + 0.55, 0.73, z - 0.45);
  world.add(cut);
  for (let i = 0; i < 3; i += 1) {
    const log = addCylinder(world, wood, 0.12, 0.14, 0.95, 6, [x + 0.95 + i * 0.08, 0.33 + i * 0.12, z + 0.3]);
    log.rotation.z = Math.PI / 2;
  }
  for (let i = 0; i < 2; i += 1) {
    const log = addCylinder(world, paleWood, 0.12, 0.12, 0.85, 6, [x + 0.9, 0.32 + i * 0.17, z + 0.34]);
    log.rotation.z = Math.PI / 2;
  }
  // A small lean-to wood rack.
  for (const dx of [-0.35, 0.55]) addBox(world, darkWood, [0.09, 0.9, 0.09], [x + dx, 0.65, z + 0.8]);
  addBox(world, wood, [1.05, 0.1, 0.12], [x + 0.1, 1.08, z + 0.8]);
}

function createCampfire(world: Group) {
  const x = -1.25;
  const z = -3.45;
  const fireRing = new Group();
  fireRing.position.set(x, 0, z);
  for (let i = 0; i < 8; i += 1) {
    const angle = (i / 8) * Math.PI * 2;
    const rock = new Mesh(new DodecahedronGeometry(0.21, 0), i % 2 ? stone : lightStone);
    rock.position.set(Math.cos(angle) * 0.48, 0.31, Math.sin(angle) * 0.4);
    rock.scale.set(1.3, 0.62, 0.9);
    rock.castShadow = true;
    fireRing.add(rock);
  }
  addBox(fireRing, darkWood, [0.85, 0.14, 0.15], [0, 0.36, 0], 0.6);
  addBox(fireRing, wood, [0.72, 0.14, 0.15], [0, 0.4, 0], -0.63);
  const orange = new MeshStandardMaterial({ color: "#ed8842", emissive: "#bc431e", emissiveIntensity: 0.5, flatShading: true, roughness: 1 });
  const yellow = new MeshStandardMaterial({ color: "#f4c567", emissive: "#e47b25", emissiveIntensity: 0.42, flatShading: true, roughness: 1 });
  const flame = new Mesh(new ConeGeometry(0.34, 0.8, 5), orange);
  flame.position.set(0, 0.77, 0);
  flame.castShadow = true;
  fireRing.add(flame);
  const smallFlame = new Mesh(new ConeGeometry(0.2, 0.55, 5), yellow);
  smallFlame.position.set(0.12, 0.67, -0.12);
  fireRing.add(smallFlame);
  world.add(fireRing);

  // Three-legged tripod and dark iron cauldron.
  const iron = new MeshStandardMaterial({ color: "#394547", flatShading: true, roughness: 0.7 });
  for (let i = 0; i < 3; i += 1) {
    const leg = new Mesh(new CylinderGeometry(0.035, 0.055, 1.35, 5), iron);
    const angle = (i / 3) * Math.PI * 2;
    leg.position.set(x + Math.cos(angle) * 0.48, 0.9, z + Math.sin(angle) * 0.4);
    leg.rotation.z = Math.cos(angle) * 0.32;
    leg.rotation.x = Math.sin(angle) * 0.32;
    leg.castShadow = true;
    world.add(leg);
  }
  addCylinder(world, iron, 0.44, 0.36, 0.42, 9, [x, 1.04, z]);
  const glow = new MeshStandardMaterial({ color: "#f6c765", emissive: "#f4a13d", emissiveIntensity: 0.4, flatShading: true });
  const potSurface = new Mesh(new CircleGeometry(0.36, 9), glow);
  potSurface.rotation.x = -Math.PI / 2;
  potSurface.position.set(x, 1.26, z);
  world.add(potSurface);
  return { flame, smallFlame };
}

function createFence(world: Group) {
  const fenceMaterial = new MeshStandardMaterial({ color: "#95704c", flatShading: true, roughness: 1 });
  const points: [number, number][] = [[4.1, 2.65], [5.55, 2.65], [5.55, 0.9]];
  for (const [x, z] of points) {
    const post = new Mesh(new BoxGeometry(0.14, 0.72, 0.14), fenceMaterial);
    post.position.set(x, 0.56, z);
    post.castShadow = true;
    world.add(post);
  }
  for (let i = 0; i < 3; i += 1) {
    const rail = new Mesh(new BoxGeometry(0.72, 0.08, 0.08), fenceMaterial);
    rail.position.set(4.47 + i * 0.43, 0.5, 2.65);
    rail.castShadow = true;
    world.add(rail);
  }
  const crossRail = new Mesh(new BoxGeometry(0.08, 0.08, 0.86), fenceMaterial);
  crossRail.position.set(5.55, 0.5, 2.2);
  crossRail.castShadow = true;
  world.add(crossRail);
}

export interface EnvironmentController {
  group: Group;
  update(time: number): void;
  pondCenter: [number, number, number];
}

export function createEnvironment(scene: Scene): EnvironmentController {
  const world = new Group();
  world.name = "Village settlement";
  scene.add(world);

  world.add(createCastle());
  const cottages = [
    createCottage({ x: -2.85, z: -3.0, rotation: -0.18, style: 0 }),
    createCottage({ x: 2.8, z: -2.75, rotation: 0.15, style: 1 }),
    createCottage({ x: 3.25, z: -0.35, rotation: -0.05, style: 2 }),
    createCottage({ x: -2.15, z: 2.32, rotation: 0.18, style: 3 }),
  ];
  cottages.forEach((house) => world.add(house));

  const pathMaterial = new MeshStandardMaterial({ color: "#d5c89e", flatShading: true, roughness: 1 });
  world.add(createPath([[-0.8, -5.1], [-1.7, -3.5], [-1.35, -2.05], [-0.5, -1.15], [0.35, -0.25], [0.2, 1.15], [0.55, 2.45], [0.25, 3.7]], 0.45, pathMaterial));
  world.add(createPath([[-0.65, -1.1], [-2.3, -0.78], [-3.25, -0.1], [-3.65, 0.55]], 0.32, pathMaterial));
  world.add(createPath([[0.15, -0.9], [1.55, -0.55], [2.75, 0.1], [3.15, 1.1], [3.45, 1.9]], 0.34, pathMaterial));
  world.add(createPath([[-0.9, -2.2], [-1.8, -2.3], [-2.4, -2.15]], 0.25, pathMaterial));

  const pond = createPond(world);
  createWell(world);
  createWoodcutterYard(world);
  const fire = createCampfire(world);
  createFence(world);

  const treeSpecs: [number, number, number, boolean][] = [
    [-6.45, 3.95, 0.9, false], [-6.2, -3.35, 0.82, true], [-5.65, -4.7, 0.65, false],
    [6.0, 4.15, 0.83, true], [6.3, -2.95, 0.95, false], [1.65, -5.0, 0.76, true],
    [5.9, 0.15, 0.7, false], [-1.45, 4.7, 0.72, false],
  ];
  treeSpecs.forEach(([x, z, scale, oak]) => world.add(createTree(x, z, scale, oak)));

  addStoneCluster(world, -5.8, 1.7, 5, 0.26);
  addStoneCluster(world, 4.0, -4.45, 4, 0.24);
  addStoneCluster(world, 1.45, 1.9, 3, 0.18);

  // Bench near the square, barrels beside the eastern cottages.
  const bench = new Group();
  addBox(bench, paleWood, [1.0, 0.14, 0.32], [0, 0.64, 0]);
  for (const x of [-0.36, 0.36]) addBox(bench, wood, [0.1, 0.58, 0.1], [x, 0.35, 0]);
  addBox(bench, wood, [1.0, 0.12, 0.1], [0, 0.95, -0.12]);
  bench.position.set(1.35, 0.2, -2.3);
  world.add(bench);
  for (const [x, z] of [[3.95, -1.25], [4.18, -1.1]] as const) {
    const barrel = new Mesh(new CylinderGeometry(0.25, 0.27, 0.62, 7), wood);
    barrel.position.set(x, 0.51, z);
    barrel.castShadow = true;
    barrel.receiveShadow = true;
    world.add(barrel);
    for (const y of [0.27, 0.74]) {
      const band = new Mesh(new CylinderGeometry(0.275, 0.275, 0.06, 7), darkWood);
      band.position.set(x, y, z);
      world.add(band);
    }
  }

  const smokeMaterial = new MeshStandardMaterial({ color: "#edece1", flatShading: true, roughness: 1, transparent: true, opacity: 0.25, depthWrite: false });
  const smokePuffs: { mesh: Mesh; offset: number; origin: [number, number, number] }[] = [];
  for (const cottage of cottages) {
    const origin = cottage.userData.smokeOrigin as [number, number, number] | undefined;
    if (!origin) continue;
    for (let i = 0; i < 3; i += 1) {
      const puff = new Mesh(new SphereGeometry(0.19 + i * 0.025, 5, 4), smokeMaterial.clone());
      puff.position.set(origin[0], origin[1], origin[2]);
      puff.castShadow = false;
      smokePuffs.push({ mesh: puff, offset: i / 3, origin });
      world.add(puff);
    }
  }

  const sunColor = new MeshStandardMaterial({ color: "#fff1c8", emissive: "#ff9a3d", emissiveIntensity: 0.16, flatShading: true });
  const fireLight = new Mesh(new SphereGeometry(0.17, 5, 4), sunColor);
  fireLight.position.set(-1.25, 0.85, -3.45);
  world.add(fireLight);

  const update = (time: number) => {
    fire.flame.scale.y = 0.88 + Math.sin(time * 11) * 0.13;
    fire.smallFlame.scale.y = 0.84 + Math.cos(time * 13) * 0.16;
    fireLight.scale.setScalar(0.9 + Math.sin(time * 8) * 0.08);
    for (const { mesh, offset, origin } of smokePuffs) {
      const phase = ((time * 0.22 + offset) % 1 + 1) % 1;
      mesh.position.set(origin[0] + Math.sin(time * 0.8 + offset * 5) * 0.1, origin[1] + phase * 0.85, origin[2]);
      mesh.scale.setScalar(0.72 + phase * 0.9);
      const material = mesh.material as MeshStandardMaterial;
      material.opacity = (1 - phase) * 0.26;
    }
  };

  return { group: world, update, pondCenter: [pond.centerX, 0.37, pond.centerZ] };
}
