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
    include: ["test/**/*.test.ts"],
    setupFiles: ["test/setup.ts"],
    // Only bounds how long a FAILING test takes. The suite runs every file at once, and under that
    // load an editor test that takes one second alone has taken more than five, the default.
    testTimeout: 30_000,
    // The same for the hooks, whose default (10 s) a test that blocks the worker carries over: the schema's first validation of a
    // recording with thousands of keyframes takes 13 s of V8 compiling ajv's validator (see SightingJsonSchema.test.ts).
    hookTimeout: 30_000,
    // Without V8's Maglev: a recording with thousands of keyframes (Mount Rainier's readings) made it compile ajv's whole schema
    // validator on the spot, 13 s alone and 34 s under the suite's load, past any timeout (see SightingJsonSchema.test.ts); 0.8 s without.
    poolOptions: { forks: { execArgv: ["--no-maglev"] }, threads: { execArgv: ["--no-maglev"] } }
  }
})
