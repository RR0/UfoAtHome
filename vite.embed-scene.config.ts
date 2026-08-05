import { defineConfig } from "vite"
import pkg from "./package.json"

/**
 * Builds the standalone, self-registering rr0-scene.mjs — the 3D-decor
 * bundle (pulls in Three.js), separate from the lightweight
 * rr0-ufo.mjs so pages that only need playback never pay for it.
 * Run via `npm run build:embed-scene`.
 *
 * Uses rollupOptions.input (not build.lib) — Vite's library mode silently
 * skips full minification here (comments/identifiers survive intact) and
 * its default asset-URL handling, which together made this bundle ~3.3x
 * heavier than it needed to be (542KB -> 166KB gzip once fixed) and left
 * the star-catalog binary asset unemitted entirely (a real, previously
 * undiscovered bug — the published rr0-scene.mjs never actually shipped
 * with stars). `base: "./"` keeps the emitted `new URL(asset,
 * import.meta.url)` reference portable (relative to wherever the .mjs is
 * actually deployed) instead of domain-root-absolute. `assetsDir: ""` keeps
 * emitted assets flat alongside the .mjs (Vite's default nests them under
 * an `assets/` subfolder) — rr0.org's own copy step (build.ts's `copies`
 * globs) only picks up flat `science/crypto/ufo/*.mjs`/`*.js`/`*.bin`, not
 * a nested directory, so a non-flat layout here would 404 once deployed.
 */
export default defineConfig({
  base: "./",
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version)
  },
  build: {
    outDir: "dist-embed-scene",
    emptyOutDir: true,
    copyPublicDir: false,
    assetsDir: "",
    target: "es2022",
    rollupOptions: {
      input: "src/embed-scene.ts",
      output: {
        format: "es",
        entryFileNames: "rr0-scene.mjs"
      }
    }
  }
})
