import { defineConfig } from "vite";

// Relative base so the site works under the GitHub Pages subpath and when opened locally.
export default defineConfig({
  base: "./",
  publicDir: "public",
  worker: { format: "es" },
  // Only the app is source; research/ holds thousands of archived pages that must not be scanned or watched.
  optimizeDeps: { entries: ["index.html"] },
  server: { watch: { ignored: ["**/research/**", "**/data/**", "**/.venv/**"] } },
  build: {
    outDir: "dist",
    target: "es2022",
    sourcemap: false,
    chunkSizeWarningLimit: 1200,
  },
});
