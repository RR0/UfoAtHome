// What a cold load of a page costs the main thread, the way Lighthouse sees it: CPU slowed 4x, a
// desktop viewport, nothing scrolled. Prints the long tasks, the Total Blocking Time they add up
// to (each task's excess over 50 ms, counted after First Contentful Paint), and what was fetched.
//
//   node scripts/perf/page-load.mjs http://localhost:5182/demos/sightings/index_fr.html
//
// Same arrangement as page-scroll.mjs: serve dist-site, name a Playwright with PLAYWRIGHT_MODULE,
// run headed and outside the sandbox. CPU_RATE (default 4) and WAIT_MS (default 15000) can be set.
import { createRequire } from "node:module"

const require = createRequire(import.meta.url)
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright")
const url = process.argv[2] || "http://localhost:5182/demos/sightings/index_fr.html"
const rate = Number(process.env.CPU_RATE || 4)
const wait = Number(process.env.WAIT_MS || 25000)

const browser = await chromium.launch({ headless: process.env.HEADLESS === "1", args: ["--window-size=1400,1000"] })
try {
  const context = await browser.newContext({ viewport: { width: 1350, height: 940 } })
  const page = await context.newPage()
  const cdp = await context.newCDPSession(page)
  await cdp.send("Emulation.setCPUThrottlingRate", { rate })
  const problems = []
  page.on("pageerror", error => problems.push(`pageerror: ${error.message}`))
  page.on("console", message => { if (message.type() === "error") problems.push(`console: ${message.text().slice(0, 160)}`) })
  const workers = []
  page.on("worker", worker => workers.push(worker.url().slice(0, 40)))
  const requests = []
  page.on("response", async response => {
    const length = Number(response.headers()["content-length"] || 0)
    requests.push([response.url().replace(/^https?:\/\/[^/]+/, ""), length])
  })
  // NO_WORKER=1 takes Worker away, which sends the halo tracing back to the page's own thread: the
  // "before" of a comparison, from the same build.
  if (process.env.NO_WORKER) await page.addInitScript(() => { window.Worker = undefined })
  await page.addInitScript(() => {
    window.__long = []
    new PerformanceObserver(list => { for (const e of list.getEntries()) __long.push([Math.round(e.startTime), Math.round(e.duration)]) })
      .observe({ type: "longtask", buffered: true })
  })
  if (process.env.PROFILE) {
    await cdp.send("Profiler.enable")
    await cdp.send("Profiler.setSamplingInterval", { interval: 1000 })
    await cdp.send("Profiler.start")
  }
  await page.goto(url, { waitUntil: "load" })
  await page.waitForTimeout(wait)
  // SCREENSHOT=path writes what the page looks like once settled — the same page loaded with and
  // without NO_WORKER should come out identical, since the tracing is deterministic.
  if (process.env.SCREENSHOT) await page.screenshot({ path: process.env.SCREENSHOT, fullPage: false })
  const result = await page.evaluate(() => {
    const fcp = performance.getEntriesByName("first-contentful-paint")[0]?.startTime ?? 0
    const tasks = __long.filter(([start]) => start >= fcp)
    return {
      fcp: Math.round(fcp),
      tasks,
      tbt: tasks.reduce((sum, [, duration]) => sum + Math.max(0, duration - 50), 0),
      busy: tasks.reduce((sum, [, duration]) => sum + duration, 0),
      settledAt: tasks.length ? tasks[tasks.length - 1][0] + tasks[tasks.length - 1][1] : 0,
      mounted: document.querySelectorAll("rr0-scene").length,
      canvases: document.querySelectorAll("canvas").length
    }
  })
  if (process.env.PROFILE) {
    const { profile } = await cdp.send("Profiler.stop")
    const self = new Map()
    const byId = new Map(profile.nodes.map(node => [node.id, node]))
    const dt = profile.timeDeltas
    // FROM_MS=8000 keeps only the samples taken after that long into the profile: what is still
    // running once the load should be over.
    if (process.env.FROM_MS) {
      let clock = 0
      profile.samples.forEach((_, i) => { clock += dt[i] / 1000; if (clock < Number(process.env.FROM_MS)) dt[i] = 0 })
    }
    profile.samples.forEach((id, i) => {
      const { callFrame } = byId.get(id)
      const key = `${callFrame.functionName || "(anon)"} ${callFrame.url.split("/").pop()}:${callFrame.lineNumber}`
      self.set(key, (self.get(key) ?? 0) + (dt[i] ?? 0) / 1000)
    })
    if (process.env.INCLUSIVE) {
      const parent = new Map()
      for (const node of profile.nodes) for (const child of node.children ?? []) parent.set(child, node.id)
      const total = new Map()
      profile.samples.forEach((id, i) => {
        const seen = new Set()
        for (let at = id; at !== undefined; at = parent.get(at)) {
          const { callFrame } = byId.get(at)
          const key = `${callFrame.functionName || "(anon)"} ${callFrame.url.split("/").pop()}:${callFrame.lineNumber}`
          if (seen.has(key)) continue
          seen.add(key)
          total.set(key, (total.get(key) ?? 0) + (dt[i] ?? 0) / 1000)
        }
      })
      console.log("INCLUSIVE\n" + [...total].sort((a, b) => b[1] - a[1]).slice(0, Number(process.env.INCLUSIVE)).map(([k, v]) => `${Math.round(v)} ms  ${k}`).join("\n") + "\nSELF")
    }
    console.log([...self].sort((a, b) => b[1] - a[1]).slice(0, Number(process.env.PROFILE)).map(([k, v]) => `${Math.round(v)} ms  ${k}`).join("\n"))
  }
  const byKind = {}
  for (const [path] of requests) {
    const kind = /roads\/index/.test(path) ? "roads/index" : /models\/index/.test(path) ? "models/index"
      : /\.(glb|gltf)/.test(path) ? "models" : /\.json/.test(path) ? "json" : /\.(js|mjs)/.test(path) ? "js" : "other"
    byKind[kind] = (byKind[kind] ?? 0) + 1
  }
  if (process.env.VERBOSE) {
    console.log(JSON.stringify(result.tasks))
    const groups = {}
    for (const [path] of requests) {
      const key = path.replace(/[0-9]+/g, "N").split("?")[0].replace(/\/[^/]*$/, "")
      groups[key] = (groups[key] ?? 0) + 1
    }
    console.log(groups)
  }
  console.log(JSON.stringify({ problems, workers }))
  console.log(JSON.stringify({ rate, ...result, tasks: result.tasks.length, longest: Math.max(0, ...result.tasks.map(t => t[1])), requests: requests.length, byKind }, null, 1))
} finally {
  await browser.close()
}
