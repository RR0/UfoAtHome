import { defineConfig } from "vite"

/**
 * Builds the standalone, self-registering rr0-ufo.mjs — the
 * lightweight, playback-only bundle for site pages that just need to
 * *play* a sighting (the common case). See vite.embed.config.ts for the
 * heavier authoring bundle (rr0-ufo-recorder.mjs). Run via `npm run
 * build:embed-ufo`.
 */
export default defineConfig({
  build: {
    outDir: "dist-embed-ufo",
    emptyOutDir: true,
    copyPublicDir: false, // public/ holds only the local demo's sample JSON, irrelevant to this bundle
    target: "es2022",
    lib: {
      entry: "src/embed-ufo.ts",
      formats: ["es"],
      fileName: () => "rr0-ufo.mjs"
    }
  }
})
