/**
 * Photographs the recordings this project publishes, for the card a shared link to each one shows
 * (see netlify/edge-functions/play-share-card.ts): the scene as the player draws it, stopped at one
 * instant, written as a JPEG beside the recording.
 *
 * A real frame of the simulation and not an illustration, because that is what the link is to. By
 * default the first one (second 0); for a recording whose first moment shows an empty sky, the instant is the recording's own
 * `summaryTime` (seconds), chosen by looking (`--sheet` writes a few instants of each recording to look at).
 *
 * Run with (outside the sandbox: Chrome needs its own sockets):
 *   PLAYWRIGHT_MODULE=/path/to/node_modules/playwright-core npx tsx scripts/share-cards/ShareCards.ts
 *   ... --sheet [name...]     writes the contact sheets to $TMPDIR/share-sheets instead
 *   ... [name...]             only the named recordings (observer-cussac, ...)
 *   SHARE_CARDS_GL=software    draws with SwiftShader instead of the graphics card: its ground is a black disc edged with white, only for a machine with none
 *   ... --link [name...]      writes the `image` fields from the photographs already taken, without photographing
 *
 * The last step of making a recording: once photographed, its `image` is written into it (see `link`), so that
 * regenerating a recording from its source data and running this again leaves it as it was. A case needs none: the
 * edge function takes the picture of its first account.
 *
 * Not part of the site build: Netlify has no Chrome, and a card is a picture to commit, not to derive
 * on every deploy.
 */
import { createRequire } from "node:module"
import { mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { createServer } from "vite"

class ShareCards {

  /** Where the photographs are served from: absolute, so that the copies of a recording on rr0.org say the same. */
  static readonly ORIGIN = "https://ufoathome.org"
  static readonly SIZE = { width: 1200, height: 675 }
  static readonly CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
  /** A frame needs the scene to be whole (the loader gone) and a moment for the last textures to be drawn. */
  static readonly SETTLE_MS = 2000
  static readonly TIMEOUT_MS = 120_000
  /** How long the relief and imagery under the observer are waited for, once the first frame is shown. */
  static readonly GROUND_MS = 60_000
  /** What a JPEG of the card's size weighs under which it holds nothing but black (a real night scene weighs more), and how many more looks it is given. */
  static readonly BLACK_FRAME_BYTES = 8 * 1024
  static readonly BLACK_FRAME_RETRIES = 15

  private readonly root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..")
  private readonly demoData = path.join(this.root, "public", "demo-data")

  /** The accounts a case replays (not the readings of it), and the sky and instrument demos: what a card, and the player's poster, is a picture of. */
  recordings(names: string[]): string[] {
    const all = readdirSync(this.demoData).filter(file => /^(observer|sky-test|instrument)-.*\.json$/.test(file)).map(file => file.replace(/\.json$/, ""))
    return names.length > 0 ? all.filter(name => names.includes(name)) : all
  }

  /** The instant the recording asks to be photographed at, in seconds, if it says. */
  private summaryTime(name: string): number | undefined {
    const time = JSON.parse(readFileSync(path.join(this.demoData, `${name}.json`), "utf8")).summaryTime
    return typeof time === "number" ? time : undefined
  }

  /** The first and last instants the recording states, in seconds: its keyframes, since a stated duration may come wrapped in its provenance. */
  private span(name: string): { start: number, end: number } {
    const json = JSON.parse(readFileSync(path.join(this.demoData, `${name}.json`), "utf8"))
    const times = (json.timeline?.keyframes ?? []).map((keyframe: { t: number }) => keyframe.t / 1000)
    // A sky that is set once and left to run states its length, not keyframes.
    const length = typeof json.durationSeconds === "number" ? json.durationSeconds : 0
    return times.length > 0 ? { start: Math.min(...times), end: Math.max(length, ...times) } : { start: 0, end: Math.max(length, 10) }
  }

  async run(args: string[]): Promise<void> {
    const sheet = args.includes("--sheet")
    const names = this.recordings(args.filter(arg => !arg.startsWith("--")))
    if (args.includes("--link")) {
      names.forEach(name => this.link(name))
      return
    }
    const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE || "playwright-core")
    const server = await createServer({ root: this.root, server: { port: 0, host: "127.0.0.1" }, logLevel: "error" })
    await server.listen()
    const origin = `http://127.0.0.1:${(server.httpServer!.address() as { port: number }).port}`
    const browser = await chromium.launch({
      executablePath: ShareCards.CHROME,
      headless: true,
      args: process.env.SHARE_CARDS_GL === "software" ? ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] : ["--use-angle=metal", "--ignore-gpu-blocklist"]
    })
    try {
      const out = sheet ? path.join(tmpdir(), "share-sheets") : path.join(this.demoData, "share")
      mkdirSync(out, { recursive: true })
      for (const name of names) {
        const { start, end } = this.span(name)
        const instants = sheet ? [0, 0.25, 0.5, 0.75].map(fraction => Math.round((start + fraction * (end - start)) * 10) / 10) : [this.summaryTime(name) ?? 0]
        for (const seconds of instants) {
          const file = path.join(out, sheet ? `${name}@${seconds}.jpg` : `${name.replace(/^observer-/, "")}.jpg`)
          await this.photograph(browser, origin, name, seconds, file)
          if (!sheet) this.link(name)
          console.log(`${path.relative(this.root, file)} (${Math.round(statSync(file).size / 1024)} KB)`)
        }
      }
    } finally {
      await browser.close()
      await server.close()
    }
  }

  /** Writes (or replaces) the recording's top-level `image`, in the file's own layout so that nothing else moves. */
  private link(name: string): void {
    const file = path.join(this.demoData, `${name}.json`)
    const image = `${ShareCards.ORIGIN}/demo-data/share/${name.replace(/^observer-/, "")}.jpg`
    const text = readFileSync(file, "utf8")
    const layout = /^( *)"version":( ?)/m.exec(text)
    if (!layout && /^\{ ?"version"/.test(text)) {
      // A recording written on one line: the field goes after its id, on that line.
      const inline = /"id": ?"[^"]*",/
      const existingInline = /"image": ?"[^"]*", ?/
      const withField = existingInline.test(text)
        ? text.replace(existingInline, `"image": ${JSON.stringify(image)}, `)
        : text.replace(inline, match => `${match} "image": ${JSON.stringify(image)},`)
      JSON.parse(withField)
      writeFileSync(file, withField)
      console.log(`${name}.json: ${image}`)
      return
    }
    if (!layout) throw new Error(`${name}.json has no top-level "version" to read its layout from`)
    const [, indent, space] = layout
    const field = `${indent}"image":${space}${JSON.stringify(image)},\n`
    const existing = new RegExp(`^${indent}"image":${space}"[^"]*",\\n`, "m")
    const id = new RegExp(`^${indent}"id":${space}"[^"]*",\\n`, "m")
    const written = existing.test(text) ? text.replace(existing, field) : text.replace(id, match => match + field)
    if (written === text && !text.includes(field)) throw new Error(`${name}.json has no top-level "id" to put its image after`)
    JSON.parse(written)
    writeFileSync(file, written)
    console.log(`${name}.json: ${image}`)
  }

  private async photograph(browser: any, origin: string, name: string, seconds: number, file: string): Promise<void> {
    const page = await browser.newPage({ viewport: ShareCards.SIZE, deviceScaleFactor: 1 })
    try {
      await page.goto(`${origin}/scripts/share-cards/capture.html?src=${encodeURIComponent(`/demo-data/${name}.json`)}&t=${seconds}`)
      await page.waitForFunction(() => {
        const stage = (window as any).__stage
        const loader = stage?.scene?.shadowRoot?.getElementById("scene-loader")
        return loader && loader.hidden === true
      }, null, { timeout: ShareCards.TIMEOUT_MS, polling: 500 })
      // The ground of a recording with a place is asked for over the network, after the loader has gone: waited for, or the horizon is a black disc
      // edged with white. A recording without a place never has one, and gives up after the time it was promised.
      await page.waitForFunction(() => Boolean((window as any).__stage.scene.sceneRenderer.terrainMesh), null, { timeout: ShareCards.GROUND_MS, polling: 500 })
        .catch(() => undefined)
      await page.waitForTimeout(ShareCards.SETTLE_MS)
      const frame = await page.evaluate(() => {
        const box = (window as any).__stage.scene.shadowRoot.getElementById("frame").getBoundingClientRect()
        return { x: box.x, y: box.y, width: box.width, height: box.height }
      })
      // A scene whose ground and scenery are asked for over the network is still black once its loader has gone for a first time (the loader is not
      // shown before it starts waiting, and a hidden one says nothing): looked at again until there is a picture, a black frame being a few kilobytes.
      let shot = await page.screenshot({ type: "jpeg", quality: 85, clip: frame })
      for (let attempt = 0; shot.length < ShareCards.BLACK_FRAME_BYTES && attempt < ShareCards.BLACK_FRAME_RETRIES; attempt++) {
        await page.waitForTimeout(ShareCards.SETTLE_MS)
        shot = await page.screenshot({ type: "jpeg", quality: 85, clip: frame })
      }
      writeFileSync(file, shot)
    } finally {
      await page.close()
    }
  }
}

await new ShareCards().run(process.argv.slice(2))
