import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { defineCuviqViewer } from "../../src/define";

class InactiveIntersectionObserver {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
  takeRecords(): IntersectionObserverEntry[] { return []; }
  readonly root = null;
  readonly rootMargin = "240px 0px";
  readonly thresholds = [0];
}

describe("CuviqViewerElement", () => {
  beforeEach(() => {
    vi.stubGlobal("IntersectionObserver", InactiveIntersectionObserver);
    defineCuviqViewer();
  });

  afterEach(() => {
    document.body.replaceChildren();
    vi.unstubAllGlobals();
  });

  it("parses defaults and reflects public properties", () => {
    const viewer = document.createElement("cuviq-viewer");
    expect(viewer.loading).toBe("lazy");
    viewer.loading = "eager";
    viewer.src = "/product.glb";
    viewer.poster = "/product.webp";
    viewer.alt = "A product";
    expect(viewer.loading).toBe("eager");
    expect(viewer.src).toBe("/product.glb");
    expect(viewer.poster).toBe("/product.webp");
    expect(viewer.alt).toBe("A product");
  });

  it("renders poster and accessible fallback without initializing while lazy", () => {
    const viewer = document.createElement("cuviq-viewer");
    viewer.src = "/product.glb";
    viewer.poster = "/product.webp";
    viewer.alt = "Offset metal product";
    document.body.append(viewer);
    expect(viewer.getAttribute("role")).toBe("img");
    expect(viewer.getAttribute("aria-label")).toBe("Offset metal product");
    expect(viewer.dataset.state).toBe("waiting");
    expect(viewer.shadowRoot?.querySelector("canvas")).toBeNull();
    expect(viewer.shadowRoot?.querySelector("img")?.getAttribute("src")).toBe("/product.webp");
  });
});
