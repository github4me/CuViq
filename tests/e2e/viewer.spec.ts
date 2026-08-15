import { expect, test } from "@playwright/test";

test("loads a GLB in plain HTML and exposes only the canvas", async ({ page }) => {
  await page.goto("/examples/html/");
  const viewer = page.locator("cuviq-viewer");
  await expect(viewer).toHaveAttribute("data-state", "ready");
  await expect(viewer.locator("canvas")).toHaveCount(1);
  await expect(viewer.locator("button, input, [role=button]")).toHaveCount(0);
  await expect(viewer).toHaveAttribute("aria-label", "Blue metallic cube product model");
});

test("loads a hosted GLTF with an external buffer", async ({ page }) => {
  await page.goto("/examples/html/");
  const result = await page.locator("cuviq-viewer").evaluate(async (viewer) => {
    const ready = new Promise<string>((resolve) => viewer.addEventListener("cuviq-ready", (event) => {
      resolve((event as CustomEvent<{ source: string }>).detail.source);
    }, { once: true }));
    viewer.setAttribute("src", "/tests/fixtures/cube.gltf");
    return ready;
  });
  expect(result).toBe("/tests/fixtures/cube.gltf");
});

test("loads a local GLB File through load()", async ({ page }) => {
  await page.goto("/examples/html/");
  const result = await page.locator("cuviq-viewer").evaluate(async (viewer) => {
    let objectUrls = 0;
    const original = URL.createObjectURL;
    URL.createObjectURL = (...args) => {
      objectUrls += 1;
      return original(...args);
    };
    const response = await fetch("/tests/fixtures/cube.glb");
    const file = new File([await response.arrayBuffer()], "local.glb", { type: "model/gltf-binary" });
    await (viewer as HTMLElement & { load(source: File): Promise<void> }).load(file);
    URL.createObjectURL = original;
    return { name: file.name, objectUrls };
  });
  expect(result).toEqual({ name: "local.glb", objectUrls: 0 });
});

test("normalizes HTTP and empty-model failures and then recovers", async ({ page }) => {
  await page.goto("/examples/html/");
  const viewer = page.locator("cuviq-viewer");
  const code404 = await viewer.evaluate(async (element) => {
    const error = new Promise<string>((resolve) => element.addEventListener("cuviq-error", (event) => {
      resolve((event as CustomEvent<{ code: string }>).detail.code);
    }, { once: true }));
    element.setAttribute("src", "/tests/fixtures/absent.glb");
    return error;
  });
  expect(code404).toBe("RESOURCE_MISSING");
  const emptyCode = await viewer.evaluate(async (element) => {
    const error = new Promise<string>((resolve) => element.addEventListener("cuviq-error", (event) => {
      resolve((event as CustomEvent<{ code: string }>).detail.code);
    }, { once: true }));
    element.setAttribute("src", "/tests/fixtures/empty.gltf");
    return error;
  });
  expect(emptyCode).toBe("MODEL_EMPTY");
  const malformedCode = await viewer.evaluate(async (element) => {
    const error = new Promise<string>((resolve) => element.addEventListener("cuviq-error", (event) => {
      resolve((event as CustomEvent<{ code: string }>).detail.code);
    }, { once: true }));
    element.setAttribute("src", "/tests/fixtures/malformed.gltf");
    return error;
  });
  expect(malformedCode).toBe("LOAD_FAILED");
  await viewer.evaluate((element) => element.setAttribute("src", "/tests/fixtures/cube.glb"));
  await expect(viewer).toHaveAttribute("data-state", "ready");
});

test("reports missing dependencies and decoder-required assets", async ({ page }) => {
  await page.goto("/examples/html/");
  const codes = await page.locator("cuviq-viewer").evaluate(async (element) => {
    const nextError = () => new Promise<string>((resolve) => element.addEventListener("cuviq-error", (event) => {
      resolve((event as CustomEvent<{ code: string }>).detail.code);
    }, { once: true }));
    const missing = nextError();
    element.setAttribute("src", "/tests/fixtures/missing-resource.gltf");
    const missingCode = await missing;
    const decoder = nextError();
    element.setAttribute("src", "/tests/fixtures/decoder-required.gltf");
    return [missingCode, await decoder];
  });
  expect(codes).toEqual(["RESOURCE_MISSING", "DECODER_REQUIRED"]);
});

test("latest source wins during rapid replacement", async ({ page }) => {
  await page.goto("/examples/html/");
  const finalSource = await page.locator("cuviq-viewer").evaluate(async (element) => {
    const sources: string[] = [];
    element.addEventListener("cuviq-ready", (event) => sources.push((event as CustomEvent<{ source: string }>).detail.source));
    element.setAttribute("src", "/tests/fixtures/cube.gltf?a");
    element.setAttribute("src", "/tests/fixtures/cube.glb?b");
    element.setAttribute("src", "/tests/fixtures/cube.gltf?c");
    await new Promise<void>((resolve) => element.addEventListener("cuviq-ready", () => resolve(), { once: true }));
    return sources.at(-1);
  });
  expect(finalSource).toBe("/tests/fixtures/cube.gltf?c");
});

test("delays lazy initialization until near the viewport", async ({ page }) => {
  await page.goto("/examples/html/lazy.html");
  const viewer = page.locator("cuviq-viewer");
  await expect(viewer.locator("canvas")).toHaveCount(0);
  await viewer.evaluate((element) => element.scrollIntoView({ block: "center" }));
  await expect(viewer).toHaveAttribute("data-state", "ready", { timeout: 15_000 });
  await expect(viewer.locator("canvas")).toHaveCount(1);
});

test("supports mouse rotation and wheel zoom without exposing pan controls", async ({ page }) => {
  await page.goto("/examples/html/");
  const viewer = page.locator("cuviq-viewer");
  await expect(viewer).toHaveAttribute("data-state", "ready");
  const box = await viewer.boundingBox();
  if (!box) throw new Error("Viewer has no bounds");
  await page.mouse.move(box.x + box.width * 0.4, box.y + box.height * 0.5);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.7, box.y + box.height * 0.45, { steps: 5 });
  await page.mouse.up();
  await page.mouse.wheel(0, -200);
  await expect(viewer).toHaveAttribute("data-state", "ready");
  await expect(viewer.locator("canvas")).toHaveCSS("touch-action", "pan-y");
});

test("enters context-lost state and reloads after restoration", async ({ page }) => {
  await page.goto("/examples/html/");
  const viewer = page.locator("cuviq-viewer");
  await expect(viewer).toHaveAttribute("data-state", "ready");
  await viewer.locator("canvas").dispatchEvent("webglcontextlost");
  await expect(viewer).toHaveAttribute("data-state", "context-lost");
  await viewer.locator("canvas").dispatchEvent("webglcontextrestored");
  await expect(viewer).toHaveAttribute("data-state", "ready");
});

test("stops scheduling frames after controls settle", async ({ page }) => {
  await page.addInitScript(() => {
    const original = window.requestAnimationFrame.bind(window);
    (window as Window & { __cuviqFrameCount?: number }).__cuviqFrameCount = 0;
    window.requestAnimationFrame = (callback) => original((time) => {
      (window as Window & { __cuviqFrameCount?: number }).__cuviqFrameCount! += 1;
      callback(time);
    });
  });
  await page.goto("/examples/html/");
  await expect(page.locator("cuviq-viewer")).toHaveAttribute("data-state", "ready");
  await page.waitForTimeout(300);
  const before = await page.evaluate(() => (window as Window & { __cuviqFrameCount?: number }).__cuviqFrameCount ?? 0);
  await page.waitForTimeout(300);
  const after = await page.evaluate(() => (window as Window & { __cuviqFrameCount?: number }).__cuviqFrameCount ?? 0);
  expect(after).toBe(before);
});

test("keeps the default viewport square across the supported width range", async ({ page }) => {
  await page.goto("/examples/html/");
  const viewer = page.locator("cuviq-viewer");
  await expect(viewer).toHaveAttribute("data-state", "ready");
  for (const width of [280, 420, 720]) {
    await viewer.evaluate((element, value) => {
      element.style.width = `${value}px`;
    }, width);
    await expect.poll(async () => viewer.evaluate((element) => {
      const rect = element.getBoundingClientRect();
      return Math.abs(rect.width - rect.height);
    })).toBeLessThan(1);
  }
});

test("supports multiple instances and cleans canvases on disconnect", async ({ page }) => {
  await page.goto("/examples/html/");
  const result = await page.evaluate(async () => {
    const container = document.createElement("div");
    Object.assign(container.style, { position: "fixed", inset: "0", display: "flex", gap: "8px", zIndex: "10", background: "white" });
    document.body.append(container);
    const viewers = Array.from({ length: 2 }, () => {
      const viewer = document.createElement("cuviq-viewer");
      viewer.setAttribute("loading", "eager");
      viewer.setAttribute("alt", "Test product");
      viewer.style.width = "280px";
      container.append(viewer);
      return viewer;
    });
    await Promise.all(viewers.map(async (viewer) => {
      const file = new Blob([await (await fetch("/tests/fixtures/cube.glb")).arrayBuffer()], { type: "model/gltf-binary" });
      await (viewer as HTMLElement & { load(source: Blob): Promise<void> }).load(file);
    }));
    const liveCanvases = document.querySelectorAll("cuviq-viewer").length;
    for (const viewer of viewers) viewer.remove();
    container.remove();
    await new Promise((resolve) => setTimeout(resolve, 0));
    const detachedCanvases = viewers.reduce((count, viewer) => count + (viewer.shadowRoot?.querySelectorAll("canvas").length ?? 0), 0);
    return { liveCanvases, detachedCanvases };
  });
  expect(result).toEqual({ liveCanvases: 3, detachedCanvases: 0 });
});
