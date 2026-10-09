import type { Material, Object3D, Texture } from "three";

function disposeMaterial(material: Material) {
  for (const value of Object.values(material)) {
    const candidate = value as Texture | unknown;
    if (candidate && typeof candidate === "object" && "isTexture" in candidate) {
      (candidate as Texture).dispose();
    }
  }
  material.dispose();
}

export function disposeObjectTree(root: Object3D) {
  const geometries = new Set<{ dispose(): void }>();
  const materials = new Set<Material>();
  root.traverse((object) => {
    const renderable = object as Object3D & { geometry?: { dispose(): void }; material?: Material | Material[] };
    if (renderable.geometry) geometries.add(renderable.geometry);
    if (Array.isArray(renderable.material)) renderable.material.forEach((material) => materials.add(material));
    else if (renderable.material) materials.add(renderable.material);
  });
  geometries.forEach((geometry) => geometry.dispose());
  materials.forEach(disposeMaterial);
}
