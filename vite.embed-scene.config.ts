import { defineConfig } from "vite"

/**
 * Builds the standalone, self-registering rr0-scene.mjs — the 3D-decor
 * bundle (pulls in Three.js), separate from the lightweight
 * rr0-ufo.mjs so pages that only need playback never pay for it.
 * Run via `npm run build:embed-scene`.
 */
export default defineConfig({
  build: {
    outDir: "dist-embed-scene",
    emptyOutDir: true,
    copyPublicDir: false,
    target: "es2022",
    lib: {
      entry: "src/embed-scene.ts",
      formats: ["es"],
      fileName: () => "rr0-scene.mjs"
    }
  }
})
