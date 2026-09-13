import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { BoxGeometry, BufferGeometry, Mesh, MeshBasicMaterial, PerspectiveCamera, Scene, Vector3 } from "three";
import type { LoadedSource } from "../../src/runtime/source-loader";

const doubles = vi.hoisted(() => ({ load: vi.fn() }));

vi.mock("../../src/runtime/scene-controller", () => ({
  SceneController: class {
    scene = new Scene();
    camera = new PerspectiveCamera(35, 1, 0.01, 1000);
    renderer = { domElement: document.createElement("canvas") };
    dispose() {}
    render() {}
    resize() { return true; }
  },
}));

vi.mock("../../src/runtime/interaction-controller", () => ({
  InteractionController: class {
    controls = { target: new Vector3(), update() {}, minDistance: 0, maxDistance: 0 };
    update() { return false; }
    dispose() {}
  },
}));

vi.mock("../../src/runtime/source-loader", () => ({
  SourceLoader: class { load = doubles.load; },
}));

import { ViewerRuntime } from "../../src/runtime/viewer-runtime";

function deferredSource() {
  let resolve!: (source: LoadedSource) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<LoadedSource>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

function model() {
  const root = new Mesh(new BoxGeometry(1, 1, 1), new MeshBasicMaterial());
  const disposeGeometry = vi.spyOn(root.geometry, "dispose");
  const disposeMaterial = vi.spyOn(root.material, "dispose");
  return { root, disposeGeometry, disposeMaterial };
}

async function flushPromises() {
  for (let index = 0; index < 5; index += 1) await Promise.resolve();
}

describe("ViewerRuntime load lifecycle", () => {
  const frames = new Map<number, FrameRequestCallback>();
  let nextFrame = 0;
  let runtime: ViewerRuntime;
  let callbacks: { onStateChange: ReturnType<typeof vi.fn>; onReady: ReturnType<typeof vi.fn>; onError: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    doubles.load.mockReset();
    frames.clear();
    nextFrame = 0;
    vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
      frames.set(++nextFrame, callback);
      return nextFrame;
    });
    vi.stubGlobal("cancelAnimationFrame", (id: number) => frames.delete(id));
    callbacks = { onStateChange: vi.fn(), onReady: vi.fn(), onError: vi.fn() };
    runtime = new ViewerRuntime(document.createElement("div"), callbacks);
  });

  afterEach(() => {
    runtime.dispose();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  function renderFrame() {
    const pending = [...frames.values()];
    frames.clear();
    for (const callback of pending) callback(0);
  }

  it("resolves a successful load only after its first frame", async () => {
    doubles.load.mockResolvedValueOnce(model());
    const settled = vi.fn();
    const pending = runtime.load("/model.glb").then(settled);
    await flushPromises();
    expect(settled).not.toHaveBeenCalled();
    expect(callbacks.onReady).not.toHaveBeenCalled();
    renderFrame();
    await pending;
    expect(settled).toHaveBeenCalledOnce();
    expect(callbacks.onReady).toHaveBeenCalledExactlyOnceWith({ source: "/model.glb" });
  });

  it("settles disposal after parsing without waiting for a cancelled frame", async () => {
    const loaded = model();
    doubles.load.mockResolvedValueOnce(loaded);
    const settled = vi.fn();
    void runtime.load("/model.glb").then(settled);
    await flushPromises();
    runtime.dispose();
    await flushPromises();
    expect(settled).toHaveBeenCalledOnce();
    expect(frames.size).toBe(0);
    expect(loaded.disposeGeometry).toHaveBeenCalledOnce();
    expect(loaded.disposeMaterial).toHaveBeenCalledOnce();
    expect(callbacks.onReady).not.toHaveBeenCalled();
    expect(callbacks.onError).not.toHaveBeenCalled();
  });

  it("settles clear while suspended and does not emit a ready event on resumption", async () => {
    const loaded = model();
    runtime.setVisible(false);
    doubles.load.mockResolvedValueOnce(loaded);
    const settled = vi.fn();
    void runtime.load("/model.glb").then(settled);
    await flushPromises();
    runtime.clear();
    await flushPromises();
    expect(settled).toHaveBeenCalledOnce();
    expect(loaded.disposeGeometry).toHaveBeenCalledOnce();
    runtime.setVisible(true);
    renderFrame();
    expect(callbacks.onReady).not.toHaveBeenCalled();
    expect(callbacks.onError).not.toHaveBeenCalled();
  });

  it("settles a replaced load while suspended and renders only its replacement", async () => {
    const first = model();
    runtime.setVisible(false);
    doubles.load.mockResolvedValueOnce(first).mockResolvedValueOnce(model());
    const firstSettled = vi.fn();
    const nextSettled = vi.fn();
    void runtime.load("/first.glb").then(firstSettled);
    await flushPromises();
    const next = runtime.load("/next.glb").then(nextSettled);
    await flushPromises();
    expect(firstSettled).toHaveBeenCalledOnce();
    expect(nextSettled).not.toHaveBeenCalled();
    expect(first.disposeGeometry).toHaveBeenCalledOnce();
    runtime.setVisible(true);
    renderFrame();
    await next;
    expect(callbacks.onReady).toHaveBeenCalledExactlyOnceWith({ source: "/next.glb" });
  });

  it.each(["clear", "dispose"] as const)("settles %s before parsing completes and disposes the late result", async (action) => {
    const source = deferredSource();
    const late = model();
    doubles.load.mockReturnValueOnce(source.promise);
    const settled = vi.fn();
    void runtime.load("/model.glb").then(settled);
    runtime[action]();
    await flushPromises();
    expect(settled).toHaveBeenCalledOnce();
    source.resolve(late);
    await flushPromises();
    renderFrame();
    expect(late.disposeGeometry).toHaveBeenCalledOnce();
    expect(late.disposeMaterial).toHaveBeenCalledOnce();
    expect(callbacks.onReady).not.toHaveBeenCalled();
    expect(callbacks.onError).not.toHaveBeenCalled();
  });

  it("disposes a replaced parser result without affecting the current model", async () => {
    const source = deferredSource();
    const late = model();
    const current = model();
    doubles.load.mockReturnValueOnce(source.promise).mockResolvedValueOnce(current);
    const firstSettled = vi.fn();
    void runtime.load("/first.glb").then(firstSettled);
    const next = runtime.load("/next.glb");
    await flushPromises();
    expect(firstSettled).toHaveBeenCalledOnce();
    source.resolve(late);
    await flushPromises();
    renderFrame();
    await next;
    expect(late.disposeGeometry).toHaveBeenCalledOnce();
    expect(current.disposeGeometry).not.toHaveBeenCalled();
    expect(callbacks.onReady).toHaveBeenCalledExactlyOnceWith({ source: "/next.glb" });
  });

  it("ignores a parser rejection after cancellation", async () => {
    const source = deferredSource();
    doubles.load.mockReturnValueOnce(source.promise);
    const settled = vi.fn();
    void runtime.load("/model.glb").then(settled);
    runtime.clear();
    await flushPromises();
    expect(settled).toHaveBeenCalledOnce();
    source.reject(new Error("failed to fetch"));
    await flushPromises();
    expect(callbacks.onError).not.toHaveBeenCalled();
    expect(callbacks.onReady).not.toHaveBeenCalled();
  });

  it("still rejects an active loader failure and reports its error", async () => {
    doubles.load.mockRejectedValueOnce(new Error("failed to fetch"));
    await expect(runtime.load("/model.glb")).rejects.toMatchObject({ code: "CORS_ERROR" });
    expect(callbacks.onError).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ code: "CORS_ERROR" }));
    expect(callbacks.onReady).not.toHaveBeenCalled();
  });

  it("disposes parsed resources if camera fitting rejects an empty model", async () => {
    const root = new Mesh(new BufferGeometry(), new MeshBasicMaterial());
    const disposeGeometry = vi.spyOn(root.geometry, "dispose");
    const disposeMaterial = vi.spyOn(root.material, "dispose");
    doubles.load.mockResolvedValueOnce({ root });
    await expect(runtime.load("/empty.glb")).rejects.toMatchObject({ code: "MODEL_EMPTY" });
    expect(disposeGeometry).toHaveBeenCalledOnce();
    expect(disposeMaterial).toHaveBeenCalledOnce();
    expect(callbacks.onReady).not.toHaveBeenCalled();
    runtime.dispose();
    expect(disposeGeometry).toHaveBeenCalledOnce();
  });

  it("rejects a new load on a disposed runtime", async () => {
    runtime.dispose();
    await expect(runtime.load("/model.glb")).rejects.toMatchObject({ code: "LOAD_FAILED" });
    expect(doubles.load).not.toHaveBeenCalled();
  });
});
