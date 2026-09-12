// How a page of the built site behaves under a reader's scroll, on a real Chromium with a real
// graphics card: frame intervals, long tasks, the scenes' loads, and a CPU profile of the scroll.
//
//   node scripts/perf/page-scroll.mjs http://localhost:5182/demos/ demos 14
//
// Serve dist-site first (python3 -m http.server 5182 --directory dist-site). Needs a Playwright
// installation and its Chromium: PLAYWRIGHT_MODULE names the package to use (a bare "playwright"
// resolves from node_modules; it is not a dependency of this package). Headed by default, since a
// headless Chromium draws with a software renderer and measures nothing about the card;
// HEADLESS=1 forces it anyway. Writes <label>.json, <label>-scroll.cpuprofile and <label>.png
// under OUT_DIR (default perf-out/), and prints a summary.
import { createRequire } from "node:module"
import { mkdir, writeFile } from "node:fs/promises"

const require = createRequire(import.meta.url)
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright")
const url = process.argv[2] || "http://localhost:5182/"
const label = process.argv[3] || "page"
const scrollSeconds = Number(process.argv[4] || 12)
const outDir = process.env.OUT_DIR || "perf-out"

await mkdir(outDir, { recursive: true })
const browser = await chromium.launch({ headless: process.env.HEADLESS === "1", args: ["--window-size=1460,1000"] })
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 })
  const errors = []
  page.on("pageerror", error => errors.push(error.message))
  const console_ = []
  page.on("console", m => { if (m.type() === "error" || m.type() === "warning" || /Context/.test(m.text())) console_.push(m.text().slice(0, 200)) })
  await page.goto(url, { waitUntil: "load" })
  await page.waitForTimeout(Number(process.env.SETTLE_MS || 7000))

  const gpu = await page.evaluate(() => {
    const c = document.createElement("canvas"); const gl = c.getContext("webgl2"); if (!gl) return "none"
    const ext = gl.getExtension("WEBGL_debug_renderer_info")
    return ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : "unknown"
  })

  await page.evaluate(() => {
    window.__m = { deltas: [], longTasks: [], loads: [] }
    const po = new PerformanceObserver(list => { for (const e of list.getEntries()) __m.longTasks.push([Math.round(e.startTime), Math.round(e.duration)]) })
    po.observe({ type: "longtask" })
    let last = performance.now()
    const tick = now => { __m.deltas.push([Math.round(now), Math.round(now - last)]); last = now; requestAnimationFrame(tick) }
    requestAnimationFrame(tick)
    const Scene = customElements.get("rr0-scene")
    if (Scene && !Scene.prototype.__patched) {
      Scene.prototype.__patched = true
      const orig = Scene.prototype.loadFromSrc
      Scene.prototype.loadFromSrc = async function (src) {
        const t = performance.now()
        try { return await orig.call(this, src) } finally { __m.loads.push([String(src).replace("/demo-data/", ""), Math.round(t), Math.round(performance.now() - t)]) }
      }
    }
  })

  const cdp = await page.context().newCDPSession(page)
  await cdp.send("Profiler.enable")
  await cdp.send("Profiler.setSamplingInterval", { interval: 500 })

  // Phase 1: at rest.
  const restStart = await page.evaluate(() => performance.now())
  await cdp.send("Profiler.start")
  await page.waitForTimeout(3000)
  const rest = await cdp.send("Profiler.stop")
  const restEnd = await page.evaluate(() => performance.now())

  // Phase 2: wheel-scrolling like a reader, top to bottom.
  const docHeight = await page.evaluate(() => document.documentElement.scrollHeight)
  const steps = Math.round(scrollSeconds * 10)
  const perStep = Math.max(40, Math.ceil((docHeight - 900) / steps))
  const scrollStart = await page.evaluate(() => performance.now())
  await cdp.send("Profiler.start")
  for (let i = 0; i < steps; i++) {
    await cdp.send("Input.dispatchMouseEvent", { type: "mouseWheel", x: 700, y: 500, deltaX: 0, deltaY: perStep })
    await page.waitForTimeout(100)
  }
  const scroll = await cdp.send("Profiler.stop")
  const scrollEnd = await page.evaluate(() => performance.now())

  const m = await page.evaluate(() => window.__m)
  const pageState = await page.evaluate(() => ({
    bundles: performance.getEntriesByType("resource").filter(e => /rr0-.*\.mjs/.test(e.name)).map(e => e.name.replace(location.origin, "")),
    heroState: document.getElementById("hero-stage")?.scene?.ufoElement?.playbackState,
    scenes: document.querySelectorAll("rr0-scene, rr0-sighting").length,
    lostContexts: [...document.querySelectorAll("rr0-scene")].filter(s => s.sceneRenderer?.renderer.getContext().isContextLost()).length,
    consoleContextLost: undefined
  }))
  const stats = (from, to) => {
    const d = m.deltas.filter(([t]) => t >= from && t <= to).map(([, d]) => d).sort((a, b) => a - b)
    const p = q => d[Math.min(d.length - 1, Math.floor(d.length * q))]
    return { frames: d.length, fps: Math.round(d.length / ((to - from) / 1000)), p50: p(0.5), p95: p(0.95), max: d.at(-1), over33: d.filter(x => x > 33).length, over100: d.filter(x => x > 100).length, longTasks: m.longTasks.filter(([t]) => t >= from && t <= to) }
  }
  const top = ({ profile }, n = 25) => {
    const nodes = new Map(profile.nodes.map(node => [node.id, node]))
    const self = new Map(); let total = 0
    profile.samples.forEach((id, index) => {
      const { callFrame } = nodes.get(id)
      const key = `${callFrame.functionName || "(anon)"} ${callFrame.url.split("/").pop()}:${callFrame.lineNumber + 1}:${callFrame.columnNumber + 1}`
      const ms = profile.timeDeltas[index] / 1000
      total += ms
      self.set(key, (self.get(key) || 0) + ms)
    })
    return { totalMs: Math.round(total), top: [...self].sort((a, b) => b[1] - a[1]).slice(0, n).map(([k, v]) => [k, Math.round(v)]) }
  }
  const report = {
    label, url, gpu, errors, console: console_.slice(0, 10), docHeight, scrollY: await page.evaluate(() => scrollY), pageState, contextMessages: console_.filter(c => /Context/.test(c)).length,
    scenes: await page.evaluate(() => document.querySelectorAll("rr0-scene, rr0-sighting").length),
    rest: { ...stats(restStart, restEnd), profile: top(rest) },
    scroll: { ...stats(scrollStart, scrollEnd), profile: top(scroll) },
    loads: m.loads
  }
  await writeFile(`${outDir}/${label}.json`, JSON.stringify(report, null, 2))
  await writeFile(`${outDir}/${label}-scroll.cpuprofile`, JSON.stringify(scroll.profile))
  await page.screenshot({ path: `${outDir}/${label}.png` })
  const { profile: _p, ...restSummary } = report.rest
  const { profile: _q, ...scrollSummary } = report.scroll
  console.log(JSON.stringify({ label, gpu, errors, scenes: report.scenes, pageState, contextMessages: report.contextMessages, console: report.console.filter(c => !/toHalfFloat/.test(c)).slice(0, 6), rest: restSummary, scroll: scrollSummary, loads: m.loads, restTop: report.rest.profile.top.slice(0, 12), scrollTop: report.scroll.profile.top.slice(0, 20), restTotal: report.rest.profile.totalMs, scrollTotal: report.scroll.profile.totalMs }, null, 1))
} finally {
  await browser.close()
}
