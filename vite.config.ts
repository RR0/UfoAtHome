import { defineConfig } from "vite"
import pkg from "./package.json"

export default defineConfig({
  base: "./",
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
