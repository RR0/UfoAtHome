// Whether the stars of the demo skies are still drawn FINE and ROUND, and are all there. A check of
// the picture itself, which no unit test can make (vitest has no WebGL): it renders three skies on a
// real Chromium with a real graphics card and measures what it drew.
//
//   node scripts/perf/star-quality.mjs http://localhost:5182
//
// Serve dist-site first (the `ufoathome-site` launch config, port 5182). Needs a Playwright with its
// Chromium: PLAYWRIGHT_MODULE names the package (not a dependency of this one). Headed, since a
// headless Chromium draws with a software renderer. Exits 1 when a sky falls outside its limits.
//
// The three skies are the three ways a star got wrong:
//  - milkyway: an observer on the ground, the ordinary case — and the one where stars came out as
//    flat blocks with a stair at their rim, the eye's picture being resampled from a smaller render;
//  - chiles-whitted: an observer at 1500 m under a sky scaled 33 times — where the stars once ended up
//    at the origin, and the sky came out practically empty;
//  - reentry at 60 s: heads and TAILS of burning pieces — the tails were ribbons, in the same blocks.
//
// What is measured, on the sky part of the picture (device pixels, a card at devicePixelRatio 2):
// the number of separate stars (connected patches of pixels over 70 of 255), the number of those that
// peak over 200 (the bright ones), and the MEDIAN AREA of the bright ones — a fine star is a few tens
// of pixels, a block is several times that. Limits were set from the renders that were judged right,
// with margin; a limit that trips is a reason to LOOK at the picture (it is written next to the
// numbers), not a verdict.
import { createRequire } from "node:module"
import { inflateSync } from "node:zlib"

const require = createRequire(import.meta.url)
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright")
const origin = process.argv[2] || "http://localhost:5182"

/** Decodes an 8-bit RGB(A) PNG the way Playwright writes one. */
function decode(buffer) {
  let at = 8, idat = [], width, height, channels
  while (at < buffer.length) {
    const length = buffer.readUInt32BE(at), type = buffer.toString("latin1", at + 4, at + 8)
    if (type === "IHDR") { width = buffer.readUInt32BE(at + 8); height = buffer.readUInt32BE(at + 12); channels = buffer[at + 17] === 6 ? 4 : 3 }
    if (type === "IDAT") idat.push(buffer.subarray(at + 8, at + 8 + length))
    at += 12 + length
  }
  const raw = inflateSync(Buffer.concat(idat)), stride = width * channels
  const rows = []
  let previous = Buffer.alloc(stride), pos = 0
  for (let y = 0; y < height; y++) {
    const filter = raw[pos++], line = Buffer.from(raw.subarray(pos, pos + stride)); pos += stride
    for (let x = 0; x < stride; x++) {
      const a = x >= channels ? line[x - channels] : 0, b = previous[x], c = x >= channels ? previous[x - channels] : 0
      if (filter === 1) line[x] += a
      else if (filter === 2) line[x] += b
      else if (filter === 3) line[x] += (a + b) >> 1
      else if (filter === 4) {
        const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c)
        line[x] += pa <= pb && pa <= pc ? a : pb <= pc ? b : c
      }
    }
    rows.push(line); previous = line
  }
  return { width, height, channels, rows }
}

/** Stars as connected patches over 70, with each one's peak and area. */
function stars({ width, height, channels, rows }) {
  const limit = Math.floor(height * 0.62)
  const light = (x, y) => Math.max(rows[y][x * channels], rows[y][x * channels + 1], rows[y][x * channels + 2])
  const seen = new Uint8Array(width * limit)
  const found = []
  for (let y = 0; y < limit; y++) {
    for (let x = 8; x < width - 8; x++) {
      if (seen[y * width + x] || light(x, y) < 70) continue
      const stack = [[x, y]]
      seen[y * width + x] = 1
      let area = 0, peak = 0
      while (stack.length) {
        const [cx, cy] = stack.pop()
        area++; peak = Math.max(peak, light(cx, cy))
        for (const [nx, ny] of [[cx + 1, cy], [cx - 1, cy], [cx, cy + 1], [cx, cy - 1]]) {
          if (ny < 0 || ny >= limit || nx < 8 || nx >= width - 8 || seen[ny * width + nx] || light(nx, ny) < 70) continue
          seen[ny * width + nx] = 1
          stack.push([nx, ny])
        }
      }
      found.push({ area, peak })
    }
  }
  const bright = found.filter(star => star.peak >= 200).map(star => star.area).sort((a, b) => a - b)
  return { stars: found.length, bright: bright.length, medianBrightArea: bright.length ? bright[Math.floor(bright.length / 2)] : 0 }
}

// Limits from the renders judged right on 2026-10-04: milkyway 792 stars / 201 bright / area 7,
// chiles-whitted 90 / 11 / 8, reentry 101 / 43 / 17. The blocky stars of 0.91.0 gave 119 stars on the
// milkyway card, and the sky that lost its stars (0.92.0, Chiles-Whitted) gave none. `maxArea` is the
// ceiling of the median bright star's area, `stars` and `bright` the floors.
const skies = [
  { name: "milkyway", card: "milkyway", min: { stars: 400, bright: 100 }, maxArea: 30 },
  { name: "chiles-whitted", card: "chiles-whitted", page: "/demos/sightings/index_fr.html", min: { stars: 50, bright: 6 }, maxArea: 30 },
  { name: "reentry", player: "/demo-data/sky-test-reentry.json", seek: 60000, min: { stars: 60, bright: 20 }, maxArea: 50 }
]

const browser = await chromium.launch({ headless: process.env.HEADLESS === "1" })
let failed = false
try {
  for (const sky of skies) {
    const page = await browser.newPage({ viewport: { width: 1350, height: 940 }, deviceScaleFactor: 2 })
    let png
    if (sky.player) {
      await page.goto(`${origin}/play/index_fr.html?sighting=${encodeURIComponent(sky.player)}&play=false`)
      await page.waitForTimeout(9000)
      await page.evaluate(t => { document.getElementById("player-stage").scene.ufoElement.currentTime = t }, sky.seek)
      await page.waitForTimeout(2500)
      png = await page.screenshot({ clip: { x: 170, y: 105, width: 1010, height: 570 } })
    } else {
      await page.goto(origin + (sky.page ?? "/demos/sky/index_fr.html"))
      await page.waitForTimeout(3000)
      await page.locator(`#${sky.card}`).scrollIntoViewIfNeeded()
      await page.waitForTimeout(14000)
      png = await page.locator(`#${sky.card} .demo-mount`).screenshot()
    }
    await page.close()
    const measured = stars(decode(png))
    const problems = []
    if (measured.stars < sky.min.stars) problems.push(`only ${measured.stars} stars (at least ${sky.min.stars}): is the sky empty?`)
    if (measured.bright < sky.min.bright) problems.push(`only ${measured.bright} bright stars (at least ${sky.min.bright})`)
    if (measured.medianBrightArea > sky.maxArea) problems.push(`a bright star covers ${measured.medianBrightArea} pixels (at most ${sky.maxArea}): blocks?`)
    console.log(`${problems.length ? "FAIL" : "ok  "} ${sky.name}: ${JSON.stringify(measured)}${problems.length ? "\n     " + problems.join("\n     ") : ""}`)
    if (problems.length) failed = true
  }
} finally {
  await browser.close()
}
process.exit(failed ? 1 : 0)
