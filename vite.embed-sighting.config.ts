import { defineConfig } from "vite"
import pkg from "./package.json"

// See vite.embed.config.ts's own comment for why rollupOptions.input (not
// build.lib) + base: "./" + assetsDir: "" are used across all embed configs.
export default defineConfig({
  base: "./",
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version)
  },
  build: {
    outDir: "dist-embed-sighting",
    emptyOutDir: true,
    copyPublicDir: false,
    assetsDir: "",
    target: "es2022",
    rollupOptions: {
      input: "src/embed-sighting.ts",
      output: {
        format: "es",
        entryFileNames: "rr0-sighting.mjs"
      }
    }
  }
})
