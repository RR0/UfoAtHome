import { defineConfig } from "vite"

/**
 * The two pieces of ufoathome.org that genuinely need bundling, both CodeMirror: the JSON editor
 * of the Player page, and the read-only HTML view of the snippet on the Share page.
 *
 * Two entries and not one, so that neither page pays for the other's language: JSON's grammar is
 * small, HTML's drags in CSS and JavaScript with it. What they DO share — the editor core — Rollup
 * hoists into a chunk of its own, which is why chunkFileNames exists below.
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
      input: ["site/scripts/jsonEditor.ts", "site/scripts/htmlView.ts"],
      // Without this the entry is tree-shaken down to nothing: it only EXPORTS a class (unlike the
      // component bundles, whose entry registers a custom element as a side effect), and the page
      // that imports it does so dynamically, which Rollup cannot see.
      preserveEntrySignatures: "strict",
      output: {
        format: "es",
        // Fixed names, not hashed ones: the pages that import these are written by hand. The
        // chunks between them are another matter — nothing names those but Rollup.
        entryFileNames: chunk => (chunk.name === "jsonEditor" ? "site-json-editor.mjs" : "site-html-view.mjs"),
        chunkFileNames: "site-code-[hash].mjs"
      }
    }
  }
})
