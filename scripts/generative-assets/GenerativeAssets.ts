/**
 * Prepares what a video generator can be given to make a realistic film of a reconstruction, without letting it invent the testimony: the
 * film as the player draws it, how far each pixel is (depth), where the phenomenon is (what a generated phenomenon is checked against),
 * where the sky is, and a prompt written from the recording's own statements only.
 *
 * Only the material: nothing is sent anywhere. Sending it to a generation service is a separate step, on the user's own account.
 *
 * Run with (outside the sandbox: Chrome needs its own sockets):
 *   PLAYWRIGHT_MODULE=/path/to/node_modules/playwright-core npx tsx scripts/generative-assets/GenerativeAssets.ts observer-maffliers [options]
 *     --from <s> --to <s>   the part of the recording filmed (default: its whole length)
 *     --fps <n>             frames per second (default 24)
 *     --size <w>x<h>        the picture (default 1280x720)
 *     --out <dir>           where the assets go (default generative-out/<name>)
 *
 * Needs ffmpeg on the PATH for the PNG sequences and the films.
 */
import { createRequire } from "node:module"
import { execFileSync } from "node:child_process"
import { closeSync, mkdirSync, openSync, readFileSync, rmSync, writeFileSync, writeSync } from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { createServer } from "vite"
import { ControlPassEncoding } from "../../src/engine/generative/ControlPassEncoding.js"
import { GenerativePrompt } from "../../src/engine/generative/GenerativePrompt.js"

interface Options {
  name: string
  from?: number
  to?: number
  fps: number
  width: number
  height: number
  out: string
}

interface CapturedFrame {
  width: number
  height: number
  image: string
  distance: string
  phenomenon: string
}


class GenerativeAssets {

  static readonly CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
  static readonly TIMEOUT_MS = 180_000
  static readonly GROUND_MS = 60_000
  static readonly SETTLE_MS = 3000

  private readonly root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..")

  options(args: string[]): Options {
    const value = (flag: string) => {
      const at = args.indexOf(flag)
      return at >= 0 ? args[at + 1] : undefined
    }
    const name = args.find((arg, index) => !arg.startsWith("--") && (index === 0 || !args[index - 1].startsWith("--")))
    if (!name) throw new Error("Which recording? e.g. observer-maffliers")
    const [width, height] = (value("--size") ?? "1280x720").split("x").map(Number)
    return {
      name,
      from: value("--from") === undefined ? undefined : Number(value("--from")),
      to: value("--to") === undefined ? undefined : Number(value("--to")),
      fps: Number(value("--fps") ?? 24),
      width,
      height,
      out: path.resolve(value("--out") ?? path.join(this.root, "generative-out", name.replace(/^observer-/, "")))
    }
  }

  async run(args: string[]): Promise<void> {
    const options = this.options(args)
    const recording = JSON.parse(readFileSync(path.join(this.root, "public", "demo-data", `${options.name}.json`), "utf8"))
    const from = options.from ?? 0
    const to = options.to ?? recording.durationSeconds ?? 10
    const count = Math.max(1, Math.round((to - from) * options.fps))
    for (const dir of ["beauty", "depth", "phenomenon-mask", "sky-mask"]) {
      rmSync(path.join(options.out, dir), { recursive: true, force: true })
      mkdirSync(path.join(options.out, dir), { recursive: true })
    }
    const work = path.join(options.out, ".work")
    mkdirSync(work, { recursive: true })
    const distanceFile = path.join(work, "distance.f32")
    const maskFile = path.join(work, "phenomenon.u8")

    const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE || "playwright-core")
    // Neither watched nor hot-reloaded: an edit anywhere in the tree (another session's, say) reloaded the page halfway through a film.
    const server = await createServer({ root: this.root, server: { port: 0, host: "127.0.0.1", hmr: false, watch: null }, logLevel: "error" })
    await server.listen()
    const origin = `http://127.0.0.1:${(server.httpServer!.address() as { port: number }).port}`
    const browser = await chromium.launch({ executablePath: GenerativeAssets.CHROME, headless: true, args: ["--use-angle=metal", "--ignore-gpu-blocklist"] })
    let size = { width: 0, height: 0 }
    try {
      const page = await browser.newPage({ viewport: { width: options.width, height: options.height }, deviceScaleFactor: 1 })
      page.on("pageerror", (error: Error) => console.error(`page: ${error.message}`))
      await page.goto(`${origin}/scripts/generative-assets/capture.html?src=${encodeURIComponent(`/demo-data/${options.name}.json`)}&t=${from}&w=${options.width}&h=${options.height}`)
      await page.waitForFunction(() => {
        const loader = (window as any).__stage?.scene?.shadowRoot?.getElementById("scene-loader")
        return loader && loader.hidden === true
      }, null, { timeout: GenerativeAssets.TIMEOUT_MS, polling: 500 })
      await page.waitForFunction(() => Boolean((window as any).__stage.scene.sceneRenderer.terrainMesh), null, { timeout: GenerativeAssets.GROUND_MS, polling: 500 }).catch(() => undefined)
      await page.evaluate("(() => { const scene = window.__stage.scene; scene.ufoElement.pause(); scene.sceneRenderer.setReferencesShown(false) })()")
      await page.waitForTimeout(GenerativeAssets.SETTLE_MS)
      // The control passes of the very first frame came back empty (programs and target made on that draw): one drawn and thrown away.
      await page.evaluate(`(${GenerativeAssets.CAPTURE_IN_PAGE})(${from})`)
      const distances = openSync(distanceFile, "w")
      const masks = openSync(maskFile, "w")
      try {
        for (let index = 0; index < count; index++) {
          const seconds = from + index / options.fps
          const frame: CapturedFrame = await page.evaluate(`(${GenerativeAssets.CAPTURE_IN_PAGE})(${seconds})`)
          size = { width: frame.width, height: frame.height }
          writeFileSync(path.join(options.out, "beauty", `${String(index + 1).padStart(4, "0")}.png`), Buffer.from(frame.image.replace(/^data:image\/png;base64,/, ""), "base64"))
          const distance = Buffer.from(frame.distance, "base64")
          writeSync(distances, distance)
          writeSync(masks, Buffer.from(frame.phenomenon, "base64"))
          process.stdout.write(`\r${index + 1}/${count} t=${seconds.toFixed(2)} s`)
        }
      } finally {
        closeSync(distances)
        closeSync(masks)
      }
      process.stdout.write("\n")
    } finally {
      await browser.close()
      await server.close()
    }
    this.writePasses(options, size, count, distanceFile, maskFile)
    rmSync(work, { recursive: true, force: true })
    writeFileSync(path.join(options.out, "prompt.txt"), GenerativePrompt.of(recording, { fromSeconds: from, toSeconds: to }))
    writeFileSync(path.join(options.out, "manifest.json"), JSON.stringify(this.manifest(options, recording, size, count, from, to), null, 2) + "\n")
    console.log(`${path.relative(this.root, options.out)}: ${count} frames ${size.width}×${size.height}`)
  }

  /**
   * In the page: the recording at `seconds`, drawn with its control passes, as base64 to cross into Node. Plain JavaScript in a string:
   * a function handed to page.evaluate would carry the helpers tsx compiles into it, which the page does not have.
   */
  private static readonly CAPTURE_IN_PAGE = `async seconds => {
    const scene = window.__stage.scene
    scene.ufoElement.currentTime = seconds * 1000
    const nextFrame = () => new Promise(resolve => requestAnimationFrame(resolve))
    await nextFrame()
    await nextFrame()
    const base64 = bytes => {
      let text = ""
      for (let at = 0; at < bytes.length; at += 0x8000) text += String.fromCharCode(...bytes.subarray(at, at + 0x8000))
      return btoa(text)
    }
    for (let attempt = 0; attempt < 600; attempt++) {
      const frame = await scene.sceneRenderer.controlFrame()
      if (frame) return {
        width: frame.width,
        height: frame.height,
        image: frame.image,
        distance: base64(new Uint8Array(frame.distanceM.buffer)),
        phenomenon: base64(frame.phenomenon)
      }
      await nextFrame()
    }
    throw new Error("No frame could be drawn at " + seconds + " s")
  }`

  /**
   * The depth (see ControlPassEncoding: one scale for every frame and every recording) in 16 bits, the phenomenon's mask grown by its
   * margin, the sky's mask where nothing solid is. Each as a PNG sequence and a film.
   */
  private writePasses(options: Options, size: { width: number, height: number }, count: number, distanceFile: string, maskFile: string): void {
    const pixels = size.width * size.height
    const distances = readFileSync(distanceFile)
    const masks = readFileSync(maskFile)
    const depth = Buffer.alloc(pixels * 2 * count)
    const phenomenon = Buffer.alloc(pixels * count)
    const sky = Buffer.alloc(pixels * count)
    for (let frame = 0; frame < count; frame++) {
      const metres = new Float32Array(distances.buffer, distances.byteOffset + frame * pixels * 4, pixels)
      for (let at = 0; at < pixels; at++) {
        const index = frame * pixels + at
        if (!(metres[at] > 0)) sky[index] = 255
        depth.writeUInt16LE(Math.round(ControlPassEncoding.depthLevel(metres[at]) * 65535), index * 2)
      }
      ControlPassEncoding.dilate(masks.subarray(frame * pixels, (frame + 1) * pixels), phenomenon.subarray(frame * pixels, (frame + 1) * pixels), size.width, size.height)
    }
    const work = path.dirname(distanceFile)
    const sequences: [string, string, Buffer][] = [["depth", "gray16le", depth], ["phenomenon-mask", "gray", phenomenon], ["sky-mask", "gray", sky]]
    for (const [name, format, bytes] of sequences) {
      const raw = path.join(work, `${name}.raw`)
      writeFileSync(raw, bytes)
      const input = ["-y", "-loglevel", "error", "-f", "rawvideo", "-pix_fmt", format, "-s", `${size.width}x${size.height}`, "-r", String(options.fps), "-i", raw]
      execFileSync("ffmpeg", [...input, "-pix_fmt", format === "gray16le" ? "gray16be" : "gray", path.join(options.out, name, "%04d.png")])
      execFileSync("ffmpeg", [...input, "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "12", path.join(options.out, `${name}.mp4`)])
    }
    execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-r", String(options.fps), "-i", path.join(options.out, "beauty", "%04d.png"), "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "14", path.join(options.out, "beauty.mp4")])
  }

  private manifest(options: Options, recording: any, size: { width: number, height: number }, count: number, from: number, to: number): object {
    let commit: string | undefined
    try {
      commit = execFileSync("git", ["rev-parse", "--short", "HEAD"], { cwd: this.root }).toString().trim()
    } catch {
      commit = undefined
    }
    const version = JSON.parse(readFileSync(path.join(this.root, "package.json"), "utf8")).version
    return {
      recording: recording.id,
      source: `https://ufoathome.org/demo-data/${options.name}.json`,
      producedBy: { ufoathome: version, commit },
      clip: { fromSeconds: from, toSeconds: to, fps: options.fps, frames: count, width: size.width, height: size.height },
      files: {
        "beauty/ + beauty.mp4": "The reconstruction as the player draws it, through the instrument's own projection, without the pictures of the place laid over it.",
        "depth/ + depth.mp4": `Distance from the eye on a logarithmic scale, 16-bit PNG (the film is 8-bit): 1 - ln(d / ${ControlPassEncoding.DEPTH_NEAR_M} m) / ln(${ControlPassEncoding.DEPTH_FAR_M} m / ${ControlPassEncoding.DEPTH_NEAR_M} m), clamped to 0..1; 0 for the sky. The same scale as the kit the player makes (see ControlPassEncoding).`,
        "phenomenon-mask/ + phenomenon-mask.mp4": `White where the testimony's phenomenon is (grown by ${ControlPassEncoding.MASK_MARGIN_PX} px): what the phenomenon a generator renders is checked against (it must not leave it, change shape, size, colour or motion, or gain details); never pasted back, which would look stuck on.`,
        "sky-mask/ + sky-mask.mp4": "White where nothing solid is: sky and clouds.",
        "prompt.txt": "Prompt and negative prompt written from the recording's statements only (see GenerativePrompt)."
      },
      notStated: "Everything the testimony does not state is drawn by the reconstruction from data (terrain, decor, weather records) or marked as assumed in the recording: a generator must not be asked to decide it.",
      sound: recording.soundTrack?.keyframes?.length ? "See the recording's soundTrack." : "The recording states no sound (its own words: no noise from the phenomenon); the rain is synthesized by the player and not exported."
    }
  }
}

await new GenerativeAssets().run(process.argv.slice(2))
