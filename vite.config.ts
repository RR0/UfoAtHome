import { defineConfig } from "vite"
import type { Plugin } from "vite"
import { createReadStream, existsSync, statSync } from "node:fs"
import { join } from "node:path"
import pkg from "./package.json"

/**
 * Serves dist-tle/ (built by `npm run build:tle`) at /tle/ on the dev server, where TleArchive looks
 * for it beside the page — the same address the site build copies it to.
 */
const tleArchive: Plugin = {
  name: "tle-archive",
  configureServer(server) {
    server.middlewares.use("/tle", (request, response, next) => {
      const file = join(__dirname, "dist-tle", decodeURIComponent((request.url ?? "").split("?")[0]))
      if (!file.startsWith(join(__dirname, "dist-tle")) || !existsSync(file) || !statSync(file).isFile()) return next()
      response.setHeader("Content-Type", file.endsWith(".json") ? "application/json" : "application/octet-stream")
      createReadStream(file).pipe(response)
    })
  }
}

export default defineConfig({
  base: "./",
  plugins: [tleArchive],
  server: {
    // Honours PORT so a harness that assigns one gets the server it asked for. Left undefined
    // otherwise, which is Vite's own 5173: hardcoding a port here would be the same mistake as
    // hardcoding one in .claude/launch.json, where it stopped a second session from ever running
    // this server at all.
    port: process.env.PORT ? Number(process.env.PORT) : undefined
  },
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version)
  },
  build: {
    target: "es2022"
  },
  test: {
    environment: "jsdom",
    include: ["test/**/*.test.ts"]
  }
})
