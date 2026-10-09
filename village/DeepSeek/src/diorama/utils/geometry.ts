import * as THREE from 'three';

export type Point2 = readonly [number, number];

/** Flat polygon strip along a polyline, used for island paths. */
export function ribbonGeometry(
  points: ReadonlyArray<Point2>,
  width: number,
  y: number,
): THREE.BufferGeometry {
  const half = width / 2;
  const left: THREE.Vector3[] = [];
  const right: THREE.Vector3[] = [];

  for (let i = 0; i < points.length; i++) {
    const previous = points[Math.max(0, i - 1)];
    const next = points[Math.min(points.length - 1, i + 1)];
    let dx = next[0] - previous[0];
    let dz = next[1] - previous[1];
    const length = Math.hypot(dx, dz) || 1;
    dx /= length;
    dz /= length;
    const normalX = -dz * half;
    const normalZ = dx * half;
    const [px, pz] = points[i];
    left.push(new THREE.Vector3(px + normalX, y, pz + normalZ));
    right.push(new THREE.Vector3(px - normalX, y, pz - normalZ));
  }

  const positions: number[] = [];
  for (let i = 0; i < points.length - 1; i++) {
    const a = left[i];
    const b = right[i];
    const c = left[i + 1];
    const d = right[i + 1];
    positions.push(a.x, a.y, a.z, c.x, c.y, c.z, b.x, b.y, b.z);
    positions.push(b.x, b.y, b.z, c.x, c.y, c.z, d.x, d.y, d.z);
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  const normals = new Float32Array(positions.length);
  for (let i = 1; i < normals.length; i += 3) normals[i] = 1;
  geometry.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
  return geometry;
}

/** Triangular prism (house roof), ridge on the Z axis. */
export function prismGeometry(width: number, depth: number, height: number): THREE.BufferGeometry {
  const w = width / 2;
  const d = depth / 2;
  const positions = new Float32Array([
    -w, 0, d, w, 0, d, 0, height, d,
    w, 0, -d, -w, 0, -d, 0, height, -d,
    -w, 0, d, 0, height, d, 0, height, -d,
    -w, 0, d, 0, height, -d, -w, 0, -d,
    w, 0, d, w, 0, -d, 0, height, -d,
    w, 0, d, 0, height, -d, 0, height, d,
  ]);
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.computeVertexNormals();
  return geometry;
}

/** Upward-facing fan from a center vertex to a rim ring. */
export function triangleFan(center: THREE.Vector3, ring: THREE.Vector3[]): THREE.BufferGeometry {
  const positions: number[] = [];
  for (let i = 0; i < ring.length; i++) {
    const a = ring[i];
    const b = ring[(i + 1) % ring.length];
    positions.push(center.x, center.y, center.z, b.x, b.y, b.z, a.x, a.y, a.z);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.computeVertexNormals();
  return geometry;
}

/** Outward-facing band between two rings (island cliff walls). */
export function ringBand(upper: THREE.Vector3[], lower: THREE.Vector3[]): THREE.BufferGeometry {
  const positions: number[] = [];
  const count = upper.length;
  for (let i = 0; i < count; i++) {
    const a = upper[i];
    const b = upper[(i + 1) % count];
    const c = lower[(i + 1) % count];
    const d = lower[i];
    positions.push(a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z);
    positions.push(a.x, a.y, a.z, c.x, c.y, c.z, d.x, d.y, d.z);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.computeVertexNormals();
  return geometry;
}

/** Closing cone from a rim ring down to a single tip vertex. */
export function coneTip(ring: THREE.Vector3[], tip: THREE.Vector3): THREE.BufferGeometry {
  const positions: number[] = [];
  const count = ring.length;
  for (let i = 0; i < count; i++) {
    const a = ring[i];
    const b = ring[(i + 1) % count];
    positions.push(a.x, a.y, a.z, b.x, b.y, b.z, tip.x, tip.y, tip.z);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.computeVertexNormals();
  return geometry;
}
