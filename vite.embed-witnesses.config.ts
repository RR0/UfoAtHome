import { defineConfig } from "vite"

export default defineConfig({
  build: {
    outDir: "dist-embed-witnesses",
    emptyOutDir: true,
    copyPublicDir: false,
    target: "es2022",
    lib: {
      entry: "src/embed-witnesses.ts",
      formats: ["es"],
      fileName: () => "rr0-ufo-witnesses.mjs"
    }
  }
})
