import { defineConfig } from "vite"

/**
 * Builds the standalone, self-registering rr0-ufo-recorder.mjs distributed
 * to rr0.org (or any other page) — a fixed filename (not content-hashed),
 * separate from the default `vite build` which produces the local demo
 * (index.html + hashed assets). Run via `npm run build:embed`.
 *
 * Uses rollupOptions.input (not build.lib) — Vite's library mode silently
 * skips full minification (comments/identifiers survive) and its default
 * asset-URL rewriting for these entries, which made rr0-scene.mjs alone
 * ~3.3x heavier than it needed to be (542KB -> 166KB gzip once fixed) and
 * left its star-catalog asset unemitted entirely. `base: "./"` keeps any
 * emitted `new URL(asset, import.meta.url)` reference portable (relative
 * to wherever the .mjs is actually deployed) instead of domain-root-absolute.
 * `assetsDir: ""` keeps assets flat alongside the .mjs (Vite's default nests
 * them under `assets/`) — rr0.org's own copy step only picks up flat
 * `science/crypto/ufo/*.mjs`/`*.js`/`*.bin`, not a nested directory.
 */
export default defineConfig({
  base: "./",
  build: {
    outDir: "dist-embed",
    emptyOutDir: true,
    copyPublicDir: false, // public/ holds only the local demo's sample JSON, irrelevant to this bundle
    assetsDir: "",
    target: "es2022",
    rollupOptions: {
      input: "src/embed.ts",
      output: {
        format: "es",
        entryFileNames: "rr0-ufo-recorder.mjs"
      }
    }
  }
})
