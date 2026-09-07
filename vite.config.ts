import { defineConfig } from "vite"
import pkg from "./package.json"

export default defineConfig({
  base: "./",
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
