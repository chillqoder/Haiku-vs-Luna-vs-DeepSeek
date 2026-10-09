import {
  BufferGeometry,
  Color,
  ConeGeometry,
  Float32BufferAttribute,
  Group,
  Mesh,
  MeshStandardMaterial,
  Vector3,
} from "three";

const TOP = 0.2;
const GRASS = ["#79a84d", "#83b653", "#729e47", "#8cbd59", "#6e9745"];
const STONE = ["#777a76", "#858680", "#696d6d", "#92918a", "#62696b", "#777d7a"];

function seeded(seed: number) {
  let value = seed >>> 0;
  return () => {
    value = (value * 1664525 + 1013904223) >>> 0;
    return value / 4294967296;
  };
}

function ringPoints(count: number, radiusX: number, radiusZ: number, irregularity: number, rand: () => number) {
  return Array.from({ length: count }, (_, index) => {
    const angle = (index / count) * Math.PI * 2;
    const scale = 1 + (rand() - 0.5) * irregularity;
    return new Vector3(Math.cos(angle) * radiusX * scale, 0, Math.sin(angle) * radiusZ * scale);
  });
}

function addColoredTriangles(
  group: Group,
  triangles: Vector3[][],
  palette: string[],
  rand: () => number,
  materialOptions: { roughness: number },
) {
  const positions: number[] = [];
  const colors: number[] = [];
  for (const triangle of triangles) {
    const color = new Color(palette[Math.floor(rand() * palette.length)]);
    for (const point of triangle) {
      positions.push(point.x, point.y, point.z);
      colors.push(color.r, color.g, color.b);
    }
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new Float32BufferAttribute(positions, 3));
  geometry.setAttribute("color", new Float32BufferAttribute(colors, 3));
  geometry.computeVertexNormals();
  const material = new MeshStandardMaterial({
    vertexColors: true,
    roughness: materialOptions.roughness,
    flatShading: true,
  });
  const mesh = new Mesh(geometry, material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  group.add(mesh);
}

export function createIsland(): Group {
  const group = new Group();
  group.name = "Floating island";
  const rand = seeded(4021);
  const count = 22;
  const outer = ringPoints(count, 8.45, 6.5, 0.13, rand);
  const inner = ringPoints(count, 4.25, 3.25, 0.1, rand);
  outer.forEach((point, index) => {
    point.y = TOP + Math.sin(index * 1.7) * 0.045;
    inner[index].y = TOP + Math.cos(index * 2.1) * 0.025;
  });

  const topTriangles: Vector3[][] = [];
  const center = new Vector3(0, TOP, 0);
  for (let i = 0; i < count; i += 1) {
    const next = (i + 1) % count;
    topTriangles.push([center, inner[next], inner[i]]);
    topTriangles.push([inner[i], outer[next], outer[i]]);
    topTriangles.push([inner[i], inner[next], outer[next]]);
  }
  addColoredTriangles(group, topTriangles, GRASS, rand, { roughness: 1 });

  const lowerRings = [
    { y: -0.6, scale: 0.96 },
    { y: -1.65, scale: 0.73 },
    { y: -2.9, scale: 0.43 },
  ];
  let previous = outer.map((point) => new Vector3(point.x, point.y - 0.18, point.z));
  for (const [layer, ringSpec] of lowerRings.entries()) {
    const current = outer.map((point, index) => {
      const jitter = (rand() - 0.5) * 0.32;
      return new Vector3(
        point.x * ringSpec.scale + jitter,
        ringSpec.y + (rand() - 0.5) * (layer === 0 ? 0.24 : 0.5),
        point.z * ringSpec.scale + jitter,
      );
    });
    const triangles: Vector3[][] = [];
    for (let i = 0; i < count; i += 1) {
      const next = (i + 1) % count;
      triangles.push([previous[i], previous[next], current[next]], [previous[i], current[next], current[i]]);
    }
    addColoredTriangles(group, triangles, STONE, rand, { roughness: 1 });
    previous = current;
  }

  const tip = new Vector3(0.45, -5.0, -0.25);
  const tipTriangles: Vector3[][] = [];
  for (let i = 0; i < count; i += 1) tipTriangles.push([previous[i], previous[(i + 1) % count], tip]);
  addColoredTriangles(group, tipTriangles, STONE, rand, { roughness: 1 });

  const rockMaterial = new MeshStandardMaterial({ color: "#777b77", flatShading: true, roughness: 1 });
  const rootMaterial = new MeshStandardMaterial({ color: "#6e7954", flatShading: true, roughness: 1 });
  const spires = [
    [-5.8, -1.2, -4.1, 1.5], [5.5, -1.1, 3.5, 1.25], [-6.1, -1.4, 2.7, 1.7],
    [3.7, -1.6, -4.6, 1.4], [-2.6, -1.3, 5.3, 1.1], [1.2, -2.1, -5.0, 1.3],
  ] as const;
  for (const [x, y, z, height] of spires) {
    const rock = new Mesh(new ConeGeometry(0.72, height, 5, 1), rockMaterial);
    rock.position.set(x, y, z);
    rock.rotation.z = (rand() - 0.5) * 0.38;
    rock.rotation.x = (rand() - 0.5) * 0.3;
    rock.castShadow = true;
    group.add(rock);
  }
  for (const [x, z, scale] of [[-2.8, -2.5, 1], [2.1, -2.1, 0.8], [3.2, 2.2, 0.95]] as const) {
    const root = new Mesh(new ConeGeometry(0.26 * scale, 2.6 * scale, 5, 1), rootMaterial);
    root.position.set(x, -2.15, z);
    root.rotation.z = (x > 0 ? 1 : -1) * 0.25;
    root.castShadow = true;
    group.add(root);
  }

  return group;
}
