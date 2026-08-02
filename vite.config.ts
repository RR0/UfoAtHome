import { defineConfig } from "vite"

export default defineConfig({
  base: "./",
  build: {
    target: "es2022"
  },
  test: {
    environment: "jsdom",
    include: ["test/**/*.test.ts"]
  }
})
