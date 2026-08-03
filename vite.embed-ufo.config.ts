import { defineConfig } from "vite"

/**
 * Builds the standalone, self-registering rr0-ufo.mjs — the
 * lightweight, playback-only bundle for site pages that just need to
 * *play* a sighting (the common case). See vite.embed.config.ts for the
 * heavier authoring bundle (rr0-ufo-recorder.mjs). Run via `npm run
 * build:embed-ufo`.
 *
 * See vite.embed.config.ts's own comment for why rollupOptions.input (not
 * build.lib) + base: "./" + assetsDir: "" are used here too, for
 * consistency, even though this particular bundle is small enough that the
 * lib-mode minification gap barely matters in practice.
 */
export default defineConfig({
  base: "./",
  build: {
    outDir: "dist-embed-ufo",
    emptyOutDir: true,
    copyPublicDir: false, // public/ holds only the local demo's sample JSON, irrelevant to this bundle
    assetsDir: "",
    target: "es2022",
    rollupOptions: {
      input: "src/embed-ufo.ts",
      output: {
        format: "es",
        entryFileNames: "rr0-ufo.mjs"
      }
    }
  }
})
