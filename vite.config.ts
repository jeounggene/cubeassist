import { copyFileSync } from "node:fs";
import { resolve } from "node:path";
import { defineConfig } from "vitest/config";
import type { Plugin } from "vite";
import react from "@vitejs/plugin-react";

// GitHub Pages serves this project repo from /cubeassist/ and has no SPA
// rewrite, so unknown paths (e.g. a refresh on /cubeassist/timer) 404. Emitting
// a 404.html that mirrors index.html lets the app shell load and route client-
// side. Build-only: writeBundle never fires during dev or vitest.
function spa404Fallback(): Plugin {
  return {
    name: "spa-404-fallback",
    apply: "build",
    writeBundle(options) {
      const dir = options.dir ?? resolve(process.cwd(), "dist");
      copyFileSync(resolve(dir, "index.html"), resolve(dir, "404.html"));
    },
  };
}

export default defineConfig({
  // Project-pages base path. Vite rewrites asset URLs and import.meta.env.BASE_URL
  // accordingly; the router reads BASE_URL for its basename.
  base: "/cubeassist/",
  plugins: [react(), spa404Fallback()],
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./test/setup.ts"],
    css: false,
    // Cross/F2L modules build BFS tables on first use; allow headroom under load.
    testTimeout: 30000,
  },
});
