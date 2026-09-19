// Where a still frame's graphics time goes: each recording loaded, played a moment and paused, then
// drawn repeatedly at a pinned pixel ratio with one part of the scene switched off at a time. The
// card's time per drawing (EXT_disjoint_timer_query_webgl2) is reported for the full scene and for
// each part removed, so the difference is what that part costs.
//
//   node scripts/perf/gpu-breakdown.mjs witness-valensole witness-socorro
//
// Same requirements as page-scroll.mjs (headed Chrome outside the sandbox, PLAYWRIGHT_MODULE).
// ORIGIN (default localhost:5182), W × H the stage in CSS pixels (1100 × 620), DPR the pinned
// ratio (2), DRAWS the drawings timed per configuration (40), AT the instant drawn in seconds (3),
// LIST=1 only lists the scene's parts, SHOT=1 also saves the frame as <demo>-<TAG>.png.
import { createRequire } from "node:module"
import { mkdir, writeFile } from "node:fs/promises"

const require = createRequire(import.meta.url)
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright")
const origin = process.env.ORIGIN || "http://localhost:5182"
const outDir = process.env.OUT_DIR || "perf-out"
const width = Number(process.env.W || 1100), height = Number(process.env.H || 620)
const dpr = Number(process.env.DPR || 2), draws = Number(process.env.DRAWS || 40)
const demos = process.argv.slice(2).length ? process.argv.slice(2) : ["witness-valensole"]

await mkdir(outDir, { recursive: true })
const browser = await chromium.launch({ headless: false, args: ["--window-size=1300,900"] })
const results = []
try {
  for (const demo of demos) {
    const page = await browser.newPage({ viewport: { width: 1200, height: 800 }, deviceScaleFactor: dpr })
    const errors = []
    page.on("pageerror", error => errors.push(error.message))
    await page.route("**/perf-harness*", route => route.fulfill({ contentType: "text/html", body: `
      <body style="margin:0;background:#888"><rr0-scene id="s" style="display:block;width:${width}px;height:${height}px"></rr0-scene>
      <script type="module">
        import "/lib/rr0-scene.mjs";
        await customElements.whenDefined("rr0-scene");
        const scene = document.getElementById("s"); window.scene = scene;
        await scene.loadFromSrc("/demo-data/${demo}.json");
        window.ready = true;
      </script>` }))
    await page.goto(`${origin}/perf-harness`)
    await page.waitForFunction(() => window.ready, undefined, { timeout: 60000 })
    await page.waitForTimeout(4000)
    const measured = await page.evaluate(async ({ draws, list, at }) => {
      const scene = window.scene, r = scene.sceneRenderer, three = r.renderer
      scene.ufoElement.play()
      await new Promise(res => setTimeout(res, 2500))
      scene.ufoElement.pause()
      // One instant for every run, so two revisions are timed, and pictured, on the same frame.
      scene.ufoElement.currentTime = at
      await new Promise(res => setTimeout(res, 1500))
      const gl = three.getContext()
      const ext = gl.getExtension("EXT_disjoint_timer_query_webgl2")
      if (!ext) return { error: "no GPU timer" }
      const frame = () => new Promise(res => requestAnimationFrame(res))
      const timeDraws = async () => {
        for (let i = 0; i < 8; i++) { r.renderOnce(); await frame() }
        const queries = []
        for (let i = 0; i < draws; i++) {
          const q = gl.createQuery(); gl.beginQuery(ext.TIME_ELAPSED_EXT, q)
          r.renderOnce()
          gl.endQuery(ext.TIME_ELAPSED_EXT); queries.push(q)
          await frame()
        }
        const ms = []
        for (const q of queries) {
          while (!gl.getQueryParameter(q, gl.QUERY_RESULT_AVAILABLE)) await frame()
          if (!gl.getParameter(ext.GPU_DISJOINT_EXT)) ms.push(gl.getQueryParameter(q, gl.QUERY_RESULT) / 1e6)
          gl.deleteQuery(q)
        }
        ms.sort((a, b) => a - b)
        return Math.round(ms[Math.floor(ms.length / 2)] * 100) / 100
      }
      // Minified class names say nothing: a part is named by three's own type, its name if it has
      // one, and for a mesh its material's — which in this scene is usually a ShaderMaterial whose
      // uniforms are what tell it apart.
      const materialOf = o => { const m = Array.isArray(o.material) ? o.material[0] : o.material; return m ? (m.type === "ShaderMaterial" ? "Shader[" + Object.keys(m.uniforms).slice(0, 2).join(",") + "]" : m.type) : "" }
      const label = o => o.name || (o.isMesh || o.isPoints ? `${o.type}:${materialOf(o)}` : o.isGroup && o.children.length > 3 ? `Group(${o.children.length})` : o.type)
      const parts = new Map()
      // The sky's group holds the dome, the stars, the clouds and the bodies: each is a part of its own.
      const roots = r.scene.children.flatMap(child => child === r.celestialGroup ? child.children.map(c => Object.assign(c, { __sky: true })) : [child])
      for (const child of roots) {
        const key = (child.__sky ? "sky/" : "") + label(child)
        if (!parts.has(key)) parts.set(key, [])
        parts.get(key).push(child)
      }
      const canvas = three.domElement
      const info = { canvas: [canvas.width, canvas.height], pixelRatio: three.getPixelRatio(), fov: r.camera.fov,
        projection: r.projectionKind, cloudRendering: r.cloudRendering,
        parts: [...parts].map(([k, v]) => `${k}×${v.length}`) }
      if (list) return info
      const rows = { full: await timeDraws() }
      for (const [key, objects] of parts) {
        const before = objects.map(o => o.visible)
        objects.forEach(o => { o.visible = false })
        rows[`-${key}`] = await timeDraws()
        objects.forEach((o, i) => { o.visible = before[i] })
      }
      const shadows = three.shadowMap.autoUpdate
      three.shadowMap.autoUpdate = false
      rows["-shadow map update"] = await timeDraws()
      three.shadowMap.autoUpdate = shadows
      rows.fullAgain = await timeDraws()
      return { ...info, gpuMs: rows }
    }, { draws, list: process.env.LIST === "1", at: Number(process.env.AT || 3) })
    if (process.env.SHOT === "1") {
      await page.evaluate(() => window.scene.sceneRenderer.renderOnce())
      await page.locator("#s").screenshot({ path: `${outDir}/${demo}-${process.env.TAG || "now"}.png` })
    }
    results.push({ demo, ...measured, errors: errors.slice(0, 3) })
    console.log(JSON.stringify(results.at(-1), null, 1))
    await page.close()
  }
} finally {
  await browser.close()
}
await writeFile(`${outDir}/gpu-breakdown-${process.env.TAG || "now"}.json`, JSON.stringify(results, null, 2))
