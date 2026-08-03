import { defineConfig } from "vite"

// See vite.embed.config.ts's own comment for why rollupOptions.input (not
// build.lib) + base: "./" are used across all embed configs.
export default defineConfig({
  base: "./",
  build: {
    outDir: "dist-embed-witnesses",
    emptyOutDir: true,
    copyPublicDir: false,
    target: "es2022",
    rollupOptions: {
      input: "src/embed-witnesses.ts",
      output: {
        format: "es",
        entryFileNames: "rr0-ufo-witnesses.mjs"
      }
    }
  }
})
