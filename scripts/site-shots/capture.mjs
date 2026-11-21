// Takes the screenshots that illustrate ufoathome.org's pages (see site/Shots.ts for where each one goes).
//
//   node scripts/site-shots/capture.mjs [--lang en,fr] [name ...]
//
// Serves nothing: point SITE at a running copy of dist-site (default http://localhost:3000). The editor needs
// WebGL, which a headless Chromium does not give, so it runs headed, which in turn means outside the sandbox.
// Name a Playwright with PLAYWRIGHT_MODULE if the project has none of its own. One WebP per shot and language,
// written to site/shots/<name>_<lang>.webp, because the interface the picture shows is in the reader's language.
import { createRequire } from "node:module"
import { execFileSync } from "node:child_process"
import { mkdirSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { SHOTS } from "./shots.mjs"

const require = createRequire(import.meta.url)
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "/Users/javarome/project/@javarome/thesteps2/node_modules/playwright")
const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..")
const out = join(root, "site", "shots")
const site = process.env.SITE || "http://localhost:3000"
const args = process.argv.slice(2)
const langArg = args.indexOf("--lang")
const languages = langArg >= 0 ? args.splice(langArg, 2)[1].split(",") : ["en", "fr", "es", "it"]
const wanted = args
const LOCALES = { en: "en-US", fr: "fr-FR", es: "es-ES", it: "it-IT" }
const HIGHLIGHT = "#e8590c"
mkdirSync(out, { recursive: true })

/** A locator's box in PAGE coordinates (Playwright's are relative to the viewport, which scrolling moves). */
async function pageBox(locator) {
  const b = await locator.first().boundingBox({ timeout: 5000 })
  if (!b) throw new Error("no box for " + locator)
  const [x, y] = await locator.page().evaluate(() => [scrollX, scrollY])
  return { x: b.x + x, y: b.y + y, width: b.width, height: b.height }
}

/** The union of what the locators cover, in page coordinates, grown by `pad`. */
async function boxOf(locators, pad) {
  let box
  for (const locator of locators) {
    const b = await pageBox(locator)
    box = box
      ? { x: Math.min(box.x, b.x), y: Math.min(box.y, b.y), r: Math.max(box.r, b.x + b.width), b: Math.max(box.b, b.y + b.height) }
      : { x: b.x, y: b.y, r: b.x + b.width, b: b.y + b.height }
  }
  const x = Math.max(0, box.x - pad)
  const y = Math.max(0, box.y - pad)
  return { x, y, width: box.r + pad - x, height: box.b + pad - y }
}

/** Outlines something on the page, the way a margin note would circle it. */
async function highlight(page, locator) {
  const b = await pageBox(locator)
  await page.evaluate(({ x, y, w, h, color }) => {
    const box = document.createElement("div")
    box.className = "shot-highlight"
    box.style.cssText = `position:absolute;left:${x - 4}px;top:${y - 4}px;width:${w + 8}px;height:${h + 8}px;`
      + `border:3px solid ${color};border-radius:8px;box-shadow:0 0 0 2px rgba(255,255,255,.7);pointer-events:none;z-index:99999`
    document.body.appendChild(box)
  }, { x: b.x, y: b.y, w: b.width, h: b.height, color: HIGHLIGHT })
}

/**
 * The installed Chrome, in `language` down to its native fields: a date field draws its placeholder in the system's language whatever the
 * page's, which only macOS's own arguments override, and Playwright refuses those, hence a launcher (see the articles' captures).
 */
const launch = (language) => {
  const locale = LOCALES[language]
  const launcher = join(tmpdir(), `chrome-${language}.sh`)
  writeFileSync(launcher, `#!/bin/sh\nexec "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" -AppleLanguages "(${locale})" -AppleLocale ${locale.replace("-", "_")} "$@"\n`, { mode: 0o755 })
  return chromium.launch({ headless: false, executablePath: launcher, args: [`--lang=${locale}`] })
}

let browser
try {
  for (const language of languages) {
    await browser?.close()
    browser = await launch(language)
    const context = await browser.newContext({ locale: LOCALES[language], viewport: { width: 640, height: 900 }, deviceScaleFactor: 2 })
    for (const shot of SHOTS) {
      if (wanted.length && !wanted.includes(shot.name)) continue
      const page = await context.newPage()
      const problems = []
      page.on("pageerror", error => problems.push(error.message))
      try {
        const suffix = language === "en" ? "index.html" : `index_${language}.html`
        // A file is given by its whole address: the player and the editor take no other (a path of this site makes a link that works
        // here only), and the files of the demos are this site's.
        const query = (shot.query ?? "").replace(/([?&]file=)\//g, `$1${site}/`)
        await page.goto(`${site}${shot.page}${suffix}${query}`, { waitUntil: "load" })
        // The sticky header would land in the middle of a full-page capture.
        await page.addStyleTag({ content: "header, .site-header, .site-nav, .page-outline { position: static !important }" })
        await page.waitForTimeout(shot.settle ?? 6000)
        const tools = { page, language, boxOf, highlight }
        const done = await shot.take(tools)
        const png = join(out, `${shot.name}_${language}.png`)
        const clip = done.clip ?? await boxOf(done.region, done.pad ?? 6)
        // A highlight is drawn in page coordinates, so the page is captured whole, then clipped.
        await page.screenshot({ path: png, fullPage: true, clip })
        const webp = png.replace(/\.png$/, ".webp")
        execFileSync("cwebp", ["-quiet", "-q", "82", "-resize", String(Math.min(1400, Math.round(clip.width * 2))), "0", png, "-o", webp])
        rmSync(png)
        console.log(`${shot.name}_${language}  ${Math.round(clip.width)}x${Math.round(clip.height)}`, problems.length ? "ERRORS: " + problems.join(" | ") : "")
      } catch (error) {
        console.log(`${shot.name}_${language}  FAILED ${error.message.split("\n")[0]}`)
      }
      await page.close()
    }
    await context.close()
  }
} finally {
  await browser?.close()
}
