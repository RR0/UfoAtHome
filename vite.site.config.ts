import { defineConfig } from "vite"

/**
 * The one piece of ufoathome.org that genuinely needs bundling: the JSON editor of the Player
 * page, which pulls in CodeMirror.
 *
 * Everything else on that site is generated HTML plus the four component bundles copied as they
 * are (see site/build.ts for why it is not a Vite build). This emits into its own directory, which
 * build.ts then copies into `dist-site/lib` alongside them — a fixed filename, not a hashed one,
 * because the page that imports it is written by hand.
 */
export default defineConfig({
  base: "./",
  build: {
    outDir: "dist-site-lib",
    emptyOutDir: true,
    copyPublicDir: false,
    assetsDir: "",
    target: "es2022",
    rollupOptions: {
      input: "site/scripts/jsonEditor.ts",
      // Without this the entry is tree-shaken down to nothing: it only EXPORTS a class (unlike the
      // component bundles, whose entry registers a custom element as a side effect), and the page
      // that imports it does so dynamically, which Rollup cannot see.
      preserveEntrySignatures: "strict",
      output: {
        format: "es",
        entryFileNames: "site-json-editor.mjs"
      }
    }
  }
})
