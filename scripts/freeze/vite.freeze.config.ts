// The dev server, plus what the freezing page (scripts/freeze/index.html) writes its annexes through: a recording's frozen data is taken
// in a browser (the imagery needs a canvas, the relief the IGN's WMS), and a browser cannot write beside the recording itself.
//
//   npx vite --config scripts/freeze/vite.freeze.config.ts
//
// then open /scripts/freeze/index.html. Writes nowhere but public/demo-data, and only file names, no path.
import { defineConfig, mergeConfig, type Plugin } from "vite"
import { readFile, writeFile } from "node:fs/promises"
import { resolve } from "node:path"
import base from "../../vite.config.js"

const folder = resolve(__dirname, "../../public/demo-data")
const fileName = /^[a-z0-9][a-z0-9.-]*\.(json|zip)$/

/** The recording's text with its `frozen` block put in, or replaced, as the last of its own keys: the rest of the file is left as it is. */
function withFrozen(text: string, frozen: unknown): string {
  const json = JSON.parse(text) as Record<string, unknown>
  // As the file is indented: some are by one space.
  const indent = text.match(/^\{\r?\n( +)"/)?.[1] ?? "  "
  if ("frozen" in json) {
    json.frozen = frozen
    return JSON.stringify(json, null, indent) + "\n"
  }
  const end = text.lastIndexOf("}")
  const block = JSON.stringify(frozen, null, indent).replaceAll("\n", `\n${indent}`)
  return `${text.slice(0, end).trimEnd()},\n${indent}"frozen": ${block}\n}${text.endsWith("\n") ? "\n" : ""}`
}

const writer: Plugin = {
  name: "rr0-freeze-writer",
  apply: "serve",
  configureServer(server) {
    server.middlewares.use("/__freeze/", (request, response) => {
      const name = decodeURIComponent((request.url ?? "").replace(/^\//, "").split("?")[0])
      if (request.method !== "PUT" || !fileName.test(name)) {
        response.statusCode = 400
        response.end()
        return
      }
      const chunks: Buffer[] = []
      request.on("data", chunk => chunks.push(chunk))
      request.on("end", async () => {
        try {
          const path = resolve(folder, name)
          const body = Buffer.concat(chunks)
          // A recording's own file takes its `frozen` block only, not the editor's rewrite of it.
          if (request.headers["x-frozen-block"]) {
            await writeFile(path, withFrozen(await readFile(path, "utf8"), JSON.parse(body.toString("utf8"))))
          } else {
            await writeFile(path, body)
          }
          response.statusCode = 204
        } catch (error) {
          response.statusCode = 500
          response.write(String(error))
        }
        response.end()
      })
    })
  }
}

export default mergeConfig(base, defineConfig({ plugins: [writer] }))
