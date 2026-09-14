// Runs checks/atmosphere.html on a real Chromium with a real graphics card and prints what it found:
// how far the GPU tables stand from the CPU reference, and each sky view from the Monte Carlo
// reference sky.
//
//   node scripts/checks/atmosphere-gpu.mjs            # dev server at http://localhost:3000
//   ORIGIN=http://localhost:51029 node scripts/checks/atmosphere-gpu.mjs
//
// Needs a Playwright installation and its Chromium: PLAYWRIGHT_MODULE names the package (a bare
// "playwright" resolves from node_modules; it is not a dependency of this package). Headed, since a
// headless Chromium draws with a software renderer. The page waits asynchronously for tables shared
// between scenes, so it takes a minute or two.
import { createRequire } from "node:module"

const require = createRequire(import.meta.url)
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright")
const origin = process.env.ORIGIN || "http://localhost:3000"

const browser = await chromium.launch({ headless: process.env.HEADLESS === "1" })
try {
  const page = await browser.newPage()
  await page.goto(`${origin}/checks/atmosphere.html`)
  await page.waitForFunction(() => window.__atmosphereCheck?.done || window.__atmosphereCheck?.error, null, { timeout: 600_000, polling: 2000 })
  const check = await page.evaluate(() => window.__atmosphereCheck)
  if (check.error) throw new Error(check.error)
  console.log(`transmittance, worst relative error: ${(check.transmittanceWorstRelative * 100).toFixed(2)} %`)
  console.log(`multiple scattering, worst relative error: ${(Math.max(...check.multiple.map(m => m.relative)) * 100).toFixed(2)} %`)
  for (const view of check.skyView) {
    const chroma = Math.max(Math.abs(view.dx), Math.abs(view.dy))
    console.log(`${view.name}: ${view.deltaMag >= 0 ? "+" : ""}${view.deltaMag.toFixed(2)} mag, chromaticity ${chroma.toFixed(3)} (Monte Carlo ±${(view.mcError * 100).toFixed(1)} %)`)
  }
  if (check.cost) console.log(`cost: ${JSON.stringify(check.cost)}`)
} finally {
  await browser.close()
}
