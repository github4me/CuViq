import { defineConfig } from "vite";

export default defineConfig({
  build: {
    outDir: "dist/browser",
    emptyOutDir: false,
    lib: {
      entry: "src/auto.ts",
      name: "CuViq",
      formats: ["es"],
      fileName: () => "cuviq.js",
    },
    sourcemap: true,
    minify: "esbuild",
  },
});
