import { defineConfig } from "vite";

export default defineConfig({
  build: {
    lib: {
      entry: {
        index: "src/index.ts",
        auto: "src/auto.ts",
      },
      formats: ["es"],
      fileName: (_format, name) => `${name}.js`,
    },
    rollupOptions: {
      external: [/^three(?:\/.*)?$/],
    },
    sourcemap: true,
    minify: "esbuild",
  },
});
