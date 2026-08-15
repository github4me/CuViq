import { LoadingManager, Object3D } from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { CuviqError, normalizeLoadError } from "../errors";
import type { CuviqSource } from "../types";

export interface LoadedSource {
  root: Object3D;
}

const GLB_MIME_TYPES = new Set(["model/gltf-binary", "application/octet-stream", ""]);

export function validateSource(source: CuviqSource): void {
  if (typeof source === "string") {
    if (!source.trim()) throw new CuviqError("UNSUPPORTED_SOURCE", "The model URL is empty.", source);
    let url: URL;
    try {
      url = new URL(source, typeof document === "undefined" ? "https://localhost/" : document.baseURI);
    } catch {
      throw new CuviqError("UNSUPPORTED_SOURCE", "The model source is not a valid URL.", source);
    }
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      throw new CuviqError("UNSUPPORTED_SOURCE", "CuViq accepts only HTTP(S) model URLs.", source);
    }
    return;
  }

  if (!(source instanceof Blob)) {
    throw new CuviqError("UNSUPPORTED_SOURCE", "The model source must be a URL, File, or Blob.");
  }
  if (source instanceof File && source.name && !source.name.toLowerCase().endsWith(".glb")) {
    throw new CuviqError("UNSUPPORTED_SOURCE", "Local models must be single-file GLB files.", source);
  }
  if (!GLB_MIME_TYPES.has(source.type.toLowerCase())) {
    throw new CuviqError("UNSUPPORTED_SOURCE", "The local file MIME type is not a binary GLB.", source);
  }
}

export class SourceLoader {
  async load(source: CuviqSource): Promise<LoadedSource> {
    validateSource(source);
    const manager = new LoadingManager();
    const failedResourceUrls = new Set<string>();
    manager.onError = (url) => {
      failedResourceUrls.add(url);
    };
    const loader = new GLTFLoader(manager);
    try {
      const gltf = typeof source === "string"
        ? await loader.loadAsync(source)
        : await loader.parseAsync(await source.arrayBuffer(), "");
      if (failedResourceUrls.size > 0) {
        throw new CuviqError("RESOURCE_MISSING", "The model references a resource that could not be loaded.", source);
      }
      return { root: gltf.scene };
    } catch (error) {
      const normalized = normalizeLoadError(error, source);
      if (normalized.code === "DECODER_REQUIRED") throw normalized;
      const failedNestedResource = failedResourceUrls.size > 0 && (
        typeof source !== "string"
        || [...failedResourceUrls].some((url) => new URL(url, document.baseURI).href !== new URL(source, document.baseURI).href)
      );
      if (failedNestedResource) {
        throw new CuviqError("RESOURCE_MISSING", "The model references a resource that could not be loaded.", source);
      }
      throw normalized;
    }
  }
}
