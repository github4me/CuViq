import { describe, expect, it } from "vitest";
import { validateSource } from "../../src/runtime/source-loader";

describe("source validation", () => {
  it("accepts relative and absolute HTTP(S) URLs", () => {
    expect(() => validateSource("/models/product.glb")).not.toThrow();
    expect(() => validateSource("https://cdn.example.test/product.gltf")).not.toThrow();
  });

  it("rejects non-network URL schemes", () => {
    expect(() => validateSource("data:model/gltf-binary;base64,AAAA")).toThrow(/HTTP\(S\)/);
  });

  it("accepts binary GLB files and blobs", () => {
    expect(() => validateSource(new File([new Uint8Array()], "part.glb", { type: "model/gltf-binary" }))).not.toThrow();
    expect(() => validateSource(new Blob([new Uint8Array()], { type: "application/octet-stream" }))).not.toThrow();
  });

  it("rejects local GLTF and incompatible MIME types", () => {
    expect(() => validateSource(new File(["{}"], "part.gltf", { type: "model/gltf+json" }))).toThrow(/single-file GLB/);
    expect(() => validateSource(new Blob(["{}"], { type: "application/json" }))).toThrow(/MIME/);
  });
});
