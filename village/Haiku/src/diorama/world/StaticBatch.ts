import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

export type Vec3 = [number, number, number];
export type Triangle = [THREE.Vector3, THREE.Vector3, THREE.Vector3];

const UP = new THREE.Vector3(0, 1, 0);
const UNIT = new THREE.Vector3(1, 1, 1);

/**
 * Копит статическую геометрию по материалам и при build() объединяет её
 * в один меш на материал. Так декор рисуется десятком draw calls, а не сотнями.
 */
export class StaticBatch {
  private readonly buckets = new Map<THREE.Material, THREE.BufferGeometry[]>();

  /** Геометрия изменяется на месте, поэтому передавайте только свежесозданные геометрии. */
  add(geometry: THREE.BufferGeometry, material: THREE.Material, matrix?: THREE.Matrix4): void {
    if (matrix) geometry.applyMatrix4(matrix);
    geometry.deleteAttribute('uv');
    const flat = geometry.index ? geometry.toNonIndexed() : geometry;
    if (flat !== geometry) geometry.dispose();

    const bucket = this.buckets.get(material) ?? [];
    bucket.push(flat);
    this.buckets.set(material, bucket);
  }

  build(parent: THREE.Object3D): void {
    for (const [material, geometries] of this.buckets) {
      const merged = mergeGeometries(geometries, false);
      for (const geometry of geometries) geometry.dispose();
      if (!merged) continue;

      const mesh = new THREE.Mesh(merged, material);
      mesh.name = `static:${material.name}`;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      parent.add(mesh);
    }
    this.buckets.clear();
  }
}

/**
 * Плоско затенённая геометрия из треугольников. Порядок вершин выравнивается так,
 * чтобы нормали смотрели от точки inside (внутри фигуры), иначе грань будет невидима.
 */
export function triangleGeometry(triangles: Triangle[], inside: THREE.Vector3): THREE.BufferGeometry {
  const positions: number[] = [];
  const edgeA = new THREE.Vector3();
  const edgeB = new THREE.Vector3();
  const normal = new THREE.Vector3();
  const offset = new THREE.Vector3();

  for (const [a, b0, c0] of triangles) {
    let b = b0;
    let c = c0;
    edgeA.subVectors(b, a);
    edgeB.subVectors(c, a);
    normal.crossVectors(edgeA, edgeB);
    offset.copy(a).add(b).add(c).multiplyScalar(1 / 3).sub(inside);
    if (normal.dot(offset) < 0) [b, c] = [c, b];
    positions.push(a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z);
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.computeVertexNormals();
  return geometry;
}

/**
 * Локальная система координат здания: все детали задаются относительно origin и yaw,
 * а в батч уходит уже итоговая матрица.
 */
export class Placement {
  private readonly frame: THREE.Matrix4;

  constructor(
    private readonly batch: StaticBatch,
    origin: Vec3,
    yaw = 0,
  ) {
    this.frame = new THREE.Matrix4().compose(
      new THREE.Vector3(...origin),
      new THREE.Quaternion().setFromAxisAngle(UP, yaw),
      UNIT,
    );
  }

  /** Переводит точку из локальных координат здания в мировые. */
  point(local: Vec3): THREE.Vector3 {
    return new THREE.Vector3(...local).applyMatrix4(this.frame);
  }

  put(material: THREE.Material, geometry: THREE.BufferGeometry, position: Vec3 = [0, 0, 0], rotation: Vec3 = [0, 0, 0]): void {
    const local = new THREE.Matrix4().compose(
      new THREE.Vector3(...position),
      new THREE.Quaternion().setFromEuler(new THREE.Euler(...rotation)),
      UNIT,
    );
    this.batch.add(geometry, material, new THREE.Matrix4().multiplyMatrices(this.frame, local));
  }

  box(material: THREE.Material, position: Vec3, size: Vec3, yaw = 0): void {
    this.put(material, new THREE.BoxGeometry(...size), position, [0, yaw, 0]);
  }

  cylinder(
    material: THREE.Material,
    position: Vec3,
    radiusTop: number,
    radiusBottom: number,
    height: number,
    segments: number,
    yaw = 0,
  ): void {
    this.put(material, new THREE.CylinderGeometry(radiusTop, radiusBottom, height, segments), position, [0, yaw, 0]);
  }

  cone(material: THREE.Material, position: Vec3, radius: number, height: number, segments: number, yaw = 0): void {
    this.put(material, new THREE.ConeGeometry(radius, height, segments), position, [0, yaw, 0]);
  }

  /** Цилиндр между двумя локальными точками: балки, опоры, ножки треножника. */
  beam(material: THREE.Material, from: Vec3, to: Vec3, radius: number): void {
    const start = new THREE.Vector3(...from);
    const end = new THREE.Vector3(...to);
    const direction = new THREE.Vector3().subVectors(end, start);
    const length = direction.length();
    const orientation = new THREE.Quaternion().setFromUnitVectors(UP, direction.normalize());
    const local = new THREE.Matrix4().compose(
      new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5),
      orientation,
      UNIT,
    );
    this.batch.add(new THREE.CylinderGeometry(radius, radius, length, 5), material, new THREE.Matrix4().multiplyMatrices(this.frame, local));
  }
}
