import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "tests/e2e",
  timeout: 30_000,
  fullyParallel: true,
  // Each test creates a WebGL context. Bound GPU contention and Vite cold-start
  // work so the release gate is reliable on development machines and CI.
  workers: 2,
  use: {
    baseURL: "http://127.0.0.1:4173",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
  ],
  webServer: {
    command: "npm run build && npx vite --host 127.0.0.1 --port 4173",
    url: "http://127.0.0.1:4173/examples/html/",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
