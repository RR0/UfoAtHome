import { createRequire } from "node:module"
import { writeFile } from "node:fs/promises"

// Uses an existing Playwright installation; it is not a runtime dependency of the package.
const require = createRequire(import.meta.url)
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright")
const origin = process.env.PROFILE_ORIGIN || "http://127.0.0.1:5173"
const recording = process.argv[2] || "witness-valensole"
if (!/^[a-z0-9-]+$/.test(recording)) throw new Error("Expected a demo file name without extension")
const output = process.argv[3] || `/tmp/ufo-${recording}`
const browser = await chromium.launch({
  ...(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {}),
  headless: true
})
try {
  const page = await browser.newPage({ viewport: { width: 1000, height: 800 } })
  const errors = []
  page.on("pageerror", error => errors.push(error.message))
  await page.route("**/perf-harness", route => route.fulfill({ contentType: "text/html", body: `
    <body style="margin:0"><rr0-scene style="display:block;width:1000px;height:600px"></rr0-scene>
    <script type="module">
      import {registerScene} from "/src/component/SceneElement.ts";
      registerScene(); window.scene=document.querySelector("rr0-scene");
      await scene.loadFromSrc("/demo-data/${recording}.json"); window.ready=true;
    </script>` }))
  await page.goto(`${origin}/perf-harness`)
  await page.waitForFunction(() => window.ready, undefined, { timeout: 60000 })
  await page.waitForTimeout(5000)
  await page.evaluate(() => scene.ufoElement.play())
  await page.waitForTimeout(6000)
  await page.evaluate(() => {
    window.measure = { frames: 0, renders: 0, anchors: 0, anchorMs: 0 }
    const renderer = scene.sceneRenderer
    for (const [name, key] of [["renderOnce", "renders"], ["updateDecorAnchoring", "anchors"]]) {
      const original = renderer[name]
      renderer[name] = function (...args) {
        const start = performance.now()
        const result = original.apply(this, args)
        measure[key]++
        if (key === "anchors") measure.anchorMs += performance.now() - start
        return result
      }
    }
    const tick = () => { measure.frames++; requestAnimationFrame(tick) }
    requestAnimationFrame(tick)
  })
  const cdp = await page.context().newCDPSession(page)
  await cdp.send("Profiler.enable")
  await cdp.send("Profiler.start")
  await page.waitForTimeout(8000)
  const { profile } = await cdp.send("Profiler.stop")
  const nodes = new Map(profile.nodes.map(node => [node.id, node]))
  const selfMs = new Map()
  profile.samples.forEach((id, index) => {
    const { callFrame } = nodes.get(id)
    const key = `${callFrame.functionName} ${callFrame.url}:${callFrame.lineNumber + 1}`
    selfMs.set(key, (selfMs.get(key) || 0) + profile.timeDeltas[index] / 1000)
  })
  const counters = await page.evaluate(() => ({
    ...measure, terrainLoaded: !!scene.sceneRenderer.terrainMesh,
    programs: scene.sceneRenderer.renderer.info.programs.length
  }))
  const report = { recording, counters, errors, topSelfMs: [...selfMs].sort((a, b) => b[1] - a[1]).slice(0, 30) }
  await writeFile(`${output}.cpuprofile`, JSON.stringify(profile))
  await writeFile(`${output}.json`, JSON.stringify(report, null, 2))
  await page.screenshot({ path: `${output}.png` })
  console.log(JSON.stringify(report, null, 2))
  if (errors.length) process.exitCode = 1
} finally {
  await browser.close()
}
