import { defineConfig } from "vite";

// Relative base so the site works under the GitHub Pages subpath and when opened locally.
export default defineConfig({
  base: "./",
  publicDir: "public",
  build: {
    outDir: "dist",
    target: "es2022",
    sourcemap: false,
    chunkSizeWarningLimit: 1200,
  },
});
