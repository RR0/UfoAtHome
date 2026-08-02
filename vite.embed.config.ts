import { defineConfig } from "vite"

/**
 * Builds the standalone, self-registering rr0-ufo-recorder.mjs distributed
 * to rr0.org (or any other page) — a fixed filename (not content-hashed),
 * separate from the default `vite build` which produces the local demo
 * (index.html + hashed assets). Run via `npm run build:embed`.
 */
export default defineConfig({
  build: {
    outDir: "dist-embed",
    emptyOutDir: true,
    copyPublicDir: false, // public/ holds only the local demo's sample JSON, irrelevant to this bundle
    target: "es2022",
    lib: {
      entry: "src/embed.ts",
      formats: ["es"],
      fileName: () => "rr0-ufo-recorder.mjs"
    }
  }
})
