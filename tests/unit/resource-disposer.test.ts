import { BoxGeometry, Mesh, MeshBasicMaterial, Texture } from "three";
import { describe, expect, it, vi } from "vitest";
import { disposeObjectResources } from "../../src/runtime/resource-disposer";

describe("disposeObjectResources", () => {
  it("disposes shared resources exactly once", () => {
    const geometry = new BoxGeometry();
    const texture = new Texture();
    const material = new MeshBasicMaterial({ map: texture });
    const root = new Mesh();
    root.add(new Mesh(geometry, material), new Mesh(geometry, material));
    const geometryDispose = vi.spyOn(geometry, "dispose");
    const materialDispose = vi.spyOn(material, "dispose");
    const textureDispose = vi.spyOn(texture, "dispose");
    disposeObjectResources(root);
    expect(geometryDispose).toHaveBeenCalledTimes(1);
    expect(materialDispose).toHaveBeenCalledTimes(1);
    expect(textureDispose).toHaveBeenCalledTimes(1);
  });
});
