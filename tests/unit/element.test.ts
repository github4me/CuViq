import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { defineCuviqViewer } from "../../src/define";

const runtimeMock = vi.hoisted(() => ({
  created: vi.fn(),
  load: vi.fn().mockResolvedValue(undefined),
  clear: vi.fn(),
  dispose: vi.fn(),
  resize: vi.fn(),
  setVisible: vi.fn(),
}));

vi.mock("../../src/runtime/viewer-runtime", () => ({
  ViewerRuntime: class {
    constructor() { runtimeMock.created(); }
    load = runtimeMock.load;
    clear = runtimeMock.clear;
    dispose = runtimeMock.dispose;
    resize = runtimeMock.resize;
    setVisible = runtimeMock.setVisible;
  },
}));

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
    vi.clearAllMocks();
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
    expect(viewer.width).toBeNull();
    expect(viewer.height).toBeNull();
    viewer.loading = "eager";
    viewer.src = "/product.glb";
    viewer.poster = "/product.webp";
    viewer.alt = "A product";
    expect(viewer.loading).toBe("eager");
    expect(viewer.src).toBe("/product.glb");
    expect(viewer.poster).toBe("/product.webp");
    expect(viewer.alt).toBe("A product");
  });

  it("applies positive pixel dimensions and preserves defaults when absent", () => {
    const viewer = document.createElement("cuviq-viewer");
    viewer.width = 640;
    viewer.height = 360;
    expect(viewer.getAttribute("width")).toBe("640");
    expect(viewer.getAttribute("height")).toBe("360");
    expect(viewer.style.getPropertyValue("--cuviq-attribute-width")).toBe("640px");
    expect(viewer.style.getPropertyValue("--cuviq-attribute-height")).toBe("360px");

    viewer.removeAttribute("height");
    expect(viewer.height).toBeNull();
    expect(viewer.style.getPropertyValue("--cuviq-attribute-height")).toBe("");
  });

  it("ignores invalid dimension attributes and rejects invalid property values", () => {
    const viewer = document.createElement("cuviq-viewer");
    viewer.setAttribute("width", "-10");
    viewer.setAttribute("height", "not-a-number");
    expect(viewer.width).toBeNull();
    expect(viewer.height).toBeNull();
    expect(viewer.style.getPropertyValue("--cuviq-attribute-width")).toBe("");
    expect(() => { viewer.width = 0; }).toThrow(RangeError);
    expect(() => { viewer.height = Number.POSITIVE_INFINITY; }).toThrow(RangeError);
    expect(() => { viewer.width = Number.NaN; }).toThrow(RangeError);
  });

  it.each(["width", "height"] as const)("resets %s when a framework assigns null or undefined", (dimension) => {
    const viewer = document.createElement("cuviq-viewer");
    for (const value of [null, undefined]) {
      viewer[dimension] = 640;
      viewer[dimension] = value;
      expect(viewer[dimension]).toBeNull();
      expect(viewer.hasAttribute(dimension)).toBe(false);
      expect(viewer.style.getPropertyValue(`--cuviq-attribute-${dimension}`)).toBe("");
    }
  });

  it("loads an explicit source only once when activating an inactive lazy viewer", async () => {
    const viewer = document.createElement("cuviq-viewer");
    viewer.src = "/attribute.glb";
    document.body.append(viewer);
    expect(runtimeMock.created).not.toHaveBeenCalled();

    const file = new File(["model"], "selected.glb");
    await viewer.load(file);

    expect(runtimeMock.created).toHaveBeenCalledTimes(1);
    expect(runtimeMock.load).toHaveBeenCalledExactlyOnceWith(file);
  });

  it("uses the latest source after a detached cached viewer is reconnected", () => {
    const viewer = document.createElement("cuviq-viewer");
    viewer.loading = "eager";
    viewer.src = "/initial.glb";
    document.body.append(viewer);
    viewer.src = "/previous.glb";
    viewer.remove();
    runtimeMock.load.mockClear();

    viewer.src = "/latest.glb";
    expect(runtimeMock.load).not.toHaveBeenCalled();
    document.body.append(viewer);

    expect(runtimeMock.load).toHaveBeenCalledExactlyOnceWith("/latest.glb");
  });

  it("does not reload a source removed while the viewer is detached", () => {
    const viewer = document.createElement("cuviq-viewer");
    viewer.loading = "eager";
    viewer.src = "/initial.glb";
    document.body.append(viewer);
    viewer.src = "/previous.glb";
    viewer.remove();
    runtimeMock.load.mockClear();

    viewer.removeAttribute("src");
    document.body.append(viewer);

    expect(runtimeMock.load).not.toHaveBeenCalled();
    expect(viewer.src).toBe("");
  });

  it("preserves an explicit File source across reconnects until src changes", async () => {
    const viewer = document.createElement("cuviq-viewer");
    viewer.loading = "eager";
    document.body.append(viewer);
    const file = new File(["model"], "selected.glb");
    await viewer.load(file);
    viewer.remove();
    runtimeMock.load.mockClear();

    document.body.append(viewer);
    expect(runtimeMock.load).toHaveBeenCalledExactlyOnceWith(file);
    viewer.remove();
    runtimeMock.load.mockClear();
    viewer.src = "/replacement.glb";
    document.body.append(viewer);
    expect(runtimeMock.load).toHaveBeenCalledExactlyOnceWith("/replacement.glb");
  });

  it.each([false, true])("clears an explicit load without a src attribute (detached: %s)", async (detached) => {
    const viewer = document.createElement("cuviq-viewer");
    viewer.loading = "eager";
    document.body.append(viewer);
    await viewer.load(new File(["model"], "selected.glb"));
    expect(viewer.hasAttribute("src")).toBe(false);
    if (detached) viewer.remove();
    runtimeMock.load.mockClear();
    runtimeMock.clear.mockClear();

    viewer.src = "";

    expect(runtimeMock.clear).toHaveBeenCalledTimes(detached ? 0 : 1);
    if (!detached) expect(viewer.dataset.state).toBe("idle");
    viewer.remove();
    document.body.append(viewer);
    expect(runtimeMock.load).not.toHaveBeenCalled();
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
