import { expect, test } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { createServer } from "vite";

test("the documented React example hydrates and renders without mismatches", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });

  // Render the very same example on the server and hydrate it in a real browser.
  // Let the consumer's JSX transform run: Playwright's own TSX transform is
  // intended for component-test descriptors, not React server rendering.
  const server = await createServer({
    configFile: false,
    optimizeDeps: { noDiscovery: true, include: [] },
    server: { middlewareMode: true },
    appType: "custom",
  });
  let markup: string;
  try {
    const ssr = await server.ssrLoadModule("/tests/fixtures/react-ssr-render.jsx") as { render(): string };
    markup = ssr.render();
  } finally {
    await server.close();
  }
  expect(markup).toContain("<cuviq-viewer");
  expect(markup).not.toContain("data-state");
  // Keep a real HTML entry so Vite discovers this fixture's dependencies before
  // parallel tests start. Only replace the server markup in the served response.
  const template = await readFile(new URL("../fixtures/react-hydration.html", import.meta.url), "utf8");
  await page.route("**/tests/fixtures/react-hydration.html", (route) => route.fulfill({
    contentType: "text/html",
    body: template.replace("<!--server-markup-->", markup),
  }));
  await page.route("**/models/product.glb", async (route) => {
    const response = await route.fetch({ url: new URL("/tests/fixtures/cube.glb", route.request().url()).href });
    await route.fulfill({ response });
  });
  await page.route("**/images/product.webp", (route) => route.fulfill({
    contentType: "image/svg+xml",
    body: '<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"></svg>',
  }));
  const readyMessages: string[] = [];
  page.on("console", (message) => {
    if (message.text().startsWith("Loaded ")) readyMessages.push(message.text());
  });

  await page.goto("/tests/fixtures/react-hydration.html");
  const viewer = page.locator("cuviq-viewer");
  // The effect imports the package asynchronously. Cold Vite dependencies and
  // concurrent WebGL contexts can outlast the ordinary 5-second DOM budget.
  await expect(viewer).toHaveAttribute("data-state", "ready", { timeout: 15_000 });
  await expect(viewer.locator("canvas")).toHaveCount(1);
  await expect.poll(() => readyMessages).toEqual(["Loaded /models/product.glb"]);
  expect(errors).toEqual([]);
});

test("React can reset existing dimensions with undefined, null, or omitted props", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  await page.goto("/tests/fixtures/react-dimensions.html");
  const viewer = page.locator("cuviq-viewer");
  // Include cold package loading and the first WebGL frame, as above. Subsequent
  // property updates retain the default short assertion timeout.
  await expect(viewer).toHaveAttribute("data-state", "ready", { timeout: 15_000 });

  for (const reset of ["Reset to undefined", "Reset to null", "Omit dimensions"]) {
    await page.getByRole("button", { name: "Set dimensions", exact: true }).click();
    await expect(viewer).toHaveAttribute("width", "480");
    await expect(viewer).toHaveAttribute("height", "320");
    await page.getByRole("button", { name: reset, exact: true }).click();
    await expect(viewer).not.toHaveAttribute("width");
    await expect(viewer).not.toHaveAttribute("height");
    await expect(viewer).toHaveAttribute("data-state", "ready");
  }
  expect(errors).toEqual([]);
});
