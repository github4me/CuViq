import { Material, Object3D, Skeleton, Texture } from "three";

function isTexture(value: unknown): value is Texture {
  return value instanceof Texture || Boolean(value && typeof value === "object" && "isTexture" in value);
}

function disposeTexture(texture: Texture, seen: Set<Texture>): void {
  if (seen.has(texture)) return;
  seen.add(texture);
  const image = texture.source?.data as { close?: () => void } | undefined;
  texture.dispose();
  if (image && typeof image.close === "function") {
    try {
      image.close();
    } catch {
      // Some browser-owned or shared image resources cannot be closed.
    }
  }
}

function findTextures(value: unknown, seenObjects: Set<object>, visit: (texture: Texture) => void): void {
  if (isTexture(value)) {
    visit(value);
    return;
  }
  if (!value || typeof value !== "object" || seenObjects.has(value)) return;
  seenObjects.add(value);
  if (Array.isArray(value)) {
    for (const item of value) findTextures(item, seenObjects, visit);
    return;
  }
  for (const item of Object.values(value as Record<string, unknown>)) {
    findTextures(item, seenObjects, visit);
  }
}

export function disposeObjectResources(root: Object3D): void {
  const geometries = new Set<{ dispose(): void }>();
  const materials = new Set<Material>();
  const textures = new Set<Texture>();
  const skeletons = new Set<Skeleton>();

  root.traverse((object) => {
    const candidate = object as Object3D & {
      geometry?: { dispose(): void };
      material?: Material | Material[];
      skeleton?: Skeleton;
    };
    if (candidate.geometry) geometries.add(candidate.geometry);
    if (candidate.skeleton) skeletons.add(candidate.skeleton);
    if (candidate.material) {
      const values = Array.isArray(candidate.material) ? candidate.material : [candidate.material];
      for (const material of values) materials.add(material);
    }
  });

  for (const material of materials) {
    findTextures(material, new Set(), (texture) => disposeTexture(texture, textures));
    material.dispose();
  }
  for (const geometry of geometries) geometry.dispose();
  for (const skeleton of skeletons) skeleton.dispose();
}
