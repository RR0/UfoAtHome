// Every demo recording measured on its own, at the front page's stage size, played: frames per
// second, drawings per frame, main-thread and card time per drawing, sky restatements, the pixel
// ratio the scene settled at, and the top of a CPU profile.
//
//   node scripts/perf/demo-table.mjs                    # every recording of public/demo-data
//   node scripts/perf/demo-table.mjs witness-chiles     # one or more
//
// Same requirements as page-scroll.mjs. ORIGIN names the served site (default localhost:5182),
// LIB the scene module to load (default /lib/rr0-scene.mjs), W and H the stage in CSS pixels
// (1100 × 620), WARM_MS the playback warm-up before measuring (2000; the pixel ratio needs about
// 8000 to settle), DPR pins the pixel ratio instead of letting it adapt, TAG names the output
// file demos-<TAG>.json under OUT_DIR (perf-out/).
import { createRequire } from "node:module"
import { mkdir, writeFile, readdir } from "node:fs/promises"

const require = createRequire(import.meta.url)
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright")
const origin = process.env.ORIGIN || "http://localhost:5182"
const outDir = process.env.OUT_DIR || "perf-out"
const width = Number(process.env.W || 1100), height = Number(process.env.H || 620)
const lib = process.env.LIB || "/lib/rr0-scene.mjs"
let demos = process.argv.slice(2)
if (!demos.length) {
  demos = (await readdir(new URL("../../public/demo-data", import.meta.url))).filter(f => f.endsWith(".json") && !f.startsWith("example") && !f.startsWith("instrument") && f !== "witnesses-manifest.json").map(f => f.replace(".json", ""))
}

await mkdir(outDir, { recursive: true })
const browser = await chromium.launch({ headless: process.env.HEADLESS === "1", args: ["--window-size=1300,900"] })
const rows = []
try {
  for (const demo of demos) {
    const page = await browser.newPage({ viewport: { width: 1200, height: 800 }, deviceScaleFactor: 2 })
    const errors = []
    page.on("pageerror", error => errors.push(error.message))
    await page.route("**/perf-harness*", route => route.fulfill({ contentType: "text/html", body: `
      <body style="margin:0;background:#888"><rr0-scene id="s" style="display:block;width:${width}px;height:${height}px"></rr0-scene>
      <script type="module">
        import "${lib}";
        await customElements.whenDefined("rr0-scene");
        const scene = document.getElementById("s"); window.scene = scene;
        const t0 = performance.now();
        await scene.loadFromSrc("/demo-data/${demo}.json");
        window.loadMs = Math.round(performance.now() - t0); const dpr = Number(new URL(location.href).searchParams.get("dpr") || 0); if (dpr) { scene.sceneRenderer.renderer.setPixelRatio(dpr); scene.resizeToStage(); } window.ready = true;
      </script>` }))
    const t0 = Date.now()
    await page.goto(`${origin}/perf-harness?dpr=${process.env.DPR || 0}&warm=${process.env.WARM_MS || 2000}`)
    try {
      await page.waitForFunction(() => window.ready, undefined, { timeout: 60000 })
    } catch (e) {
      rows.push({ demo, error: "load timeout", errors })
      await page.close()
      continue
    }
    await page.waitForTimeout(4000)
    const cdp = await page.context().newCDPSession(page)
    await cdp.send("Profiler.enable")
    await cdp.send("Profiler.setSamplingInterval", { interval: 500 })
    const measured = await page.evaluate(async ({ profileMs }) => {
      const scene = window.scene
      const r = scene.sceneRenderer
      const gl = r.renderer.getContext()
      const ext = gl.getExtension("EXT_disjoint_timer_query_webgl2")
      const counters = { renderOnce: 0, renderOnceMs: 0, render: 0, gpuMs: 0, gpuSamples: 0, astro: 0, astroMs: 0 }
      const pending = []
      const origOnce = r.renderOnce
      r.renderOnce = function (...a) {
        const t = performance.now()
        let q
        if (ext && pending.length < 8) { q = gl.createQuery(); gl.beginQuery(ext.TIME_ELAPSED_EXT, q) }
        const result = origOnce.apply(this, a)
        if (q) { gl.endQuery(ext.TIME_ELAPSED_EXT); pending.push(q) }
        counters.renderOnce++; counters.renderOnceMs += performance.now() - t
        return result
      }
      const origRender = r.render
      r.render = function (...a) { counters.render++; return origRender.apply(this, a) }
      const origAstro = r.setAstronomy
      r.setAstronomy = function (...a) { const t = performance.now(); const x = origAstro.apply(this, a); counters.astro++; counters.astroMs += performance.now() - t; return x }
      const poll = () => {
        for (let i = 0; i < pending.length; i++) {
          const q = pending[i]
          if (gl.getQueryParameter(q, gl.QUERY_RESULT_AVAILABLE)) {
            if (!gl.getParameter(ext.GPU_DISJOINT_EXT)) { counters.gpuMs += gl.getQueryParameter(q, gl.QUERY_RESULT) / 1e6; counters.gpuSamples++ }
            gl.deleteQuery(q); pending.splice(i, 1); i--
          }
        }
      }
      const ufo = scene.ufoElement
      ufo.autoReplayEnabled = true
      ufo.play()
      await new Promise(res => setTimeout(res, Number(new URL(location.href).searchParams.get('warm') || 2000)))
      for (const k of Object.keys(counters)) counters[k] = 0
      const deltas = []; let last = performance.now(); const start = last
      window.__profileStart = true
      await new Promise(res => {
        const tick = now => { deltas.push(now - last); last = now; poll(); if (now - start < profileMs) requestAnimationFrame(tick); else res() }
        requestAnimationFrame(tick)
      })
      const elapsed = performance.now() - start
      const sorted = [...deltas].sort((a, b) => a - b)
      const p = q => Math.round(sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * q))])
      const info = r.renderer.info
      const c = r.renderer.domElement
      let objects = 0, meshes = 0, points = 0, instanced = 0
      r.scene.traverse(o => { objects++; if (o.isInstancedMesh) instanced++; else if (o.isMesh) meshes++; else if (o.isPoints) points++ })
      const objectsByName = {}
      for (const [id, g] of r.decorGroups ?? []) { let n = 0; g.traverse(() => n++); objectsByName[id] = n }
      return {
        loadMs: window.loadMs, state: ufo.playbackState, elapsed: Math.round(elapsed), frames: deltas.length,
        fps: Math.round(deltas.length / elapsed * 1000), p50: p(0.5), p95: p(0.95), max: p(1),
        rendersPerFrame: Math.round(counters.render / deltas.length * 100) / 100,
        renderOncePerFrame: Math.round(counters.renderOnce / deltas.length * 100) / 100,
        cpuMsPerRenderOnce: Math.round(counters.renderOnceMs / Math.max(1, counters.renderOnce) * 100) / 100,
        gpuMsPerRenderOnce: counters.gpuSamples ? Math.round(counters.gpuMs / counters.gpuSamples * 100) / 100 : null, gpuSamples: counters.gpuSamples,
        astroPerFrame: Math.round(counters.astro / deltas.length * 100) / 100, astroMs: Math.round(counters.astroMs / Math.max(1, counters.astro) * 100) / 100,
        calls: info.render.calls, triangles: info.render.triangles, pointsDrawn: info.render.points, programs: info.programs.length, geometries: info.memory.geometries, textures: info.memory.textures,
        canvas: [c.width, c.height], pixelRatio: r.renderer.getPixelRatio(), timesGpu: r.resolution?.timesGpu, objects, meshes, instanced, pointsObjects: points, decor: objectsByName,
        exposure: r.exposureInstants, cloudRendering: r.cloudRendering, layered: !!r.layeredClouds, dof: !!r.depthOfField || !!r.dofPass, equidistant: !!r.equidistantPass
      }
    }, { profileMs: 3000 }).catch(e => ({ error: e.message }))
    // Profile 3 s separately (evaluate and profiler cannot overlap cleanly above).
    await cdp.send("Profiler.start")
    await page.waitForTimeout(3000)
    const { profile } = await cdp.send("Profiler.stop")
    const nodes = new Map(profile.nodes.map(node => [node.id, node]))
    const self = new Map(); let total = 0
    profile.samples.forEach((id, index) => {
      const { callFrame } = nodes.get(id)
      const key = `${callFrame.functionName || "(anon)"}:${callFrame.lineNumber + 1}:${callFrame.columnNumber + 1}`
      const ms = profile.timeDeltas[index] / 1000; total += ms
      self.set(key, (self.get(key) || 0) + ms)
    })
    const top = [...self].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([k, v]) => `${k}=${Math.round(v)}`)
    rows.push({ demo, ...measured, errors: errors.slice(0, 3), cpuTotalMs: Math.round(total), top, wallS: Math.round((Date.now() - t0) / 1000) })
    console.log(JSON.stringify(rows.at(-1)))
    await page.close()
  }
} finally {
  await browser.close()
}
await writeFile(`${outDir}/demos-${process.env.TAG || "before"}.json`, JSON.stringify(rows, null, 2))
