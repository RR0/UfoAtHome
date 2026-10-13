/**
 * The small server behind a live call (see call-conductor.html): it redraws the Saint-Lô recording from the numbers a witness gives while he talks, and keeps
 * the notes of the call on disk.
 *
 *   node scripts/call-live-server.mjs [port]      (port 54480 by default)
 *
 * - GET  /health                  -> { ok: true }
 * - POST /recording  { params }   -> { parts, stats }: the recording redrawn by scripts/data/cases/saint-lo/build_saint_lo.py with LIVE_PARAMS = params,
 *                                    without its decor, its sources and its image (the player keeps its own), and what the generator says of the result
 * - POST /save { name, state, markdown, parts? } -> writes under scripts/data/cases/saint-lo/call-2026-10-13/
 *
 * Local only: it answers any page of this machine (CORS open) and listens on 127.0.0.1. Nothing it writes leaves the machine.
 */
import { execFile } from "node:child_process"
import { mkdir, readFile, rm, writeFile } from "node:fs/promises"
import http from "node:http"
import { tmpdir } from "node:os"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { promisify } from "node:util"

const run = promisify(execFile)
const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..")
const generator = path.join(root, "scripts", "data", "cases", "saint-lo", "build_saint_lo.py")
const callDir = path.join(root, "scripts", "data", "cases", "saint-lo", "call-2026-10-13")
const port = Number(process.argv[2] ?? 54480)

class CallLiveServer {
  /** One generation at a time: the generator is single-threaded and a newer answer replaces an older one. */
  queue = Promise.resolve()
  serial = 0

  start() {
    http.createServer((request, response) => void this.handle(request, response)).listen(port, "127.0.0.1", () => console.log(`call-live-server on http://127.0.0.1:${port}`))
  }

  async handle(request, response) {
    const headers = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "content-type", "Access-Control-Allow-Methods": "GET, POST, OPTIONS", "Content-Type": "application/json; charset=utf-8" }
    if (request.method === "OPTIONS") return response.writeHead(204, headers).end()
    try {
      if (request.method === "GET" && request.url === "/health") return response.writeHead(200, headers).end(JSON.stringify({ ok: true }))
      const body = JSON.parse(await this.body(request) || "{}")
      if (request.method === "POST" && request.url === "/recording") return response.writeHead(200, headers).end(JSON.stringify(await this.recording(body.params ?? {})))
      if (request.method === "POST" && request.url === "/save") return response.writeHead(200, headers).end(JSON.stringify(await this.save(body)))
      response.writeHead(404, headers).end(JSON.stringify({ error: "not found" }))
    } catch (error) {
      response.writeHead(500, headers).end(JSON.stringify({ error: String(error?.stderr || error?.message || error).slice(0, 2000) }))
    }
  }

  body(request) {
    return new Promise((resolve, reject) => {
      const chunks = []
      request.on("data", chunk => chunks.push(chunk))
      request.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")))
      request.on("error", reject)
    })
  }

  recording(params) {
    const job = this.queue.then(async () => {
      const out = path.join(tmpdir(), `call-live-${process.pid}-${++this.serial}.json`)
      const started = Date.now()
      try {
        const { stdout } = await run("python3", [generator], { cwd: root, env: { ...process.env, LIVE_PARAMS: JSON.stringify(params), OUT_NAME: out }, maxBuffer: 16 * 1024 * 1024 })
        const full = JSON.parse(await readFile(out, "utf8"))
        const { decor, sources, image, ...parts } = full
        const found = /slow speed ([\d.]+) deg\/s, last turn ([\d.]+) deg, spiral starts at az (\d+) alt (\d+)/.exec(stdout)
        return { parts, stats: { ms: Date.now() - started, ...(found ? { downSpeed: Number(found[1]), lastTurnDeg: Number(found[2]), spiralAz: Number(found[3]), spiralAlt: Number(found[4]) } : {}) } }
      } finally {
        await rm(out, { force: true })
      }
    })
    this.queue = job.catch(() => undefined)
    return job
  }

  async save({ name = "notes", state, markdown, parts }) {
    const safe = String(name).replace(/[^a-z0-9._-]+/gi, "-").slice(0, 60)
    await mkdir(callDir, { recursive: true })
    if (state !== undefined) await writeFile(path.join(callDir, `${safe}.state.json`), JSON.stringify(state, null, 1) + "\n", "utf8")
    if (markdown !== undefined) await writeFile(path.join(callDir, `${safe}.md`), markdown, "utf8")
    if (parts !== undefined) await writeFile(path.join(callDir, `${safe}.recording-parts.json`), JSON.stringify(parts, null, 1) + "\n", "utf8")
    return { saved: path.relative(root, callDir), name: safe }
  }
}

new CallLiveServer().start()
