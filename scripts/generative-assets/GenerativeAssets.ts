/**
 * Prepares what a video generator can be given to make a realistic film of a reconstruction, without letting it invent the testimony: the
 * film as the player draws it, how far each pixel is (depth), where the phenomenon is (the part of the picture never to be redrawn),
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

type Localized = string | Record<string, string> | undefined

class GenerativeAssets {

  static readonly CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
  static readonly TIMEOUT_MS = 180_000
  static readonly GROUND_MS = 60_000
  static readonly SETTLE_MS = 3000
  /** How far the phenomenon's mask is grown, pixels: a generator's edit bleeds over the edge of what it is told to keep. */
  static readonly MASK_MARGIN_PX = 4
  /** The share of the nearest solid pixels left out of the depth's range, so that one blade of grass at the eye's feet does not flatten the rest. */
  static readonly NEAR_PERCENTILE = 0.01

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
    const sample: number[] = []
    let farM = 0
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
          const metres = new Float32Array(distance.buffer, distance.byteOffset, distance.byteLength / 4)
          for (let at = 0; at < metres.length; at += 97) if (metres[at] > 0) sample.push(metres[at])
          for (const m of metres) if (m > farM) farM = m
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
    sample.sort((a, b) => a - b)
    const nearM = Math.max(0.1, sample[Math.floor(sample.length * GenerativeAssets.NEAR_PERCENTILE)] ?? 0.1)
    this.writePasses(options, size, count, distanceFile, maskFile, nearM, farM)
    rmSync(work, { recursive: true, force: true })
    writeFileSync(path.join(options.out, "prompt.md"), this.prompt(recording, from, to))
    writeFileSync(path.join(options.out, "manifest.json"), JSON.stringify(this.manifest(options, recording, size, count, from, to, nearM, farM), null, 2) + "\n")
    console.log(`${path.relative(this.root, options.out)}: ${count} frames ${size.width}×${size.height}, depth ${nearM.toFixed(1)} to ${Math.round(farM)} m`)
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
   * The depth on a logarithmic scale of distance (near white, the far end and the sky black), on ONE range for the whole film so that it
   * does not flicker, in 16 bits. Logarithmic and not the inverse distance most depth estimators give: the inverse put a wood's edge 500 m away
   * at 1 % of the range, black, where a generator has to see it to keep the horizon where it is. The
   * phenomenon's mask grown by a margin; the sky's mask where nothing solid is. Each as a PNG sequence and a film.
   */
  private writePasses(options: Options, size: { width: number, height: number }, count: number, distanceFile: string, maskFile: string, nearM: number, farM: number): void {
    const pixels = size.width * size.height
    const distances = readFileSync(distanceFile)
    const masks = readFileSync(maskFile)
    const depth = Buffer.alloc(pixels * 2 * count)
    const phenomenon = Buffer.alloc(pixels * count)
    const sky = Buffer.alloc(pixels * count)
    const logRange = Math.log(Math.max(farM, nearM * 2) / nearM)
    for (let frame = 0; frame < count; frame++) {
      const metres = new Float32Array(distances.buffer, distances.byteOffset + frame * pixels * 4, pixels)
      for (let at = 0; at < pixels; at++) {
        const m = metres[at]
        const index = frame * pixels + at
        if (m <= 0) {
          sky[index] = 255
          continue
        }
        const value = Math.min(1, Math.max(0, 1 - Math.log(m / nearM) / logRange))
        depth.writeUInt16LE(Math.round(value * 65535), index * 2)
      }
      this.dilate(masks.subarray(frame * pixels, (frame + 1) * pixels), phenomenon.subarray(frame * pixels, (frame + 1) * pixels), size.width, size.height, GenerativeAssets.MASK_MARGIN_PX)
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

  /** `from` grown by `radius` pixels (a square), into `into`. */
  private dilate(from: Uint8Array, into: Uint8Array, width: number, height: number, radius: number): void {
    const rows = new Uint8Array(from.length)
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        let on = 0
        for (let dx = -radius; dx <= radius && !on; dx++) {
          const column = x + dx
          if (column >= 0 && column < width && from[y * width + column]) on = 255
        }
        rows[y * width + x] = on
      }
    }
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        let on = 0
        for (let dy = -radius; dy <= radius && !on; dy++) {
          const row = y + dy
          if (row >= 0 && row < height && rows[row * width + x]) on = 255
        }
        into[y * width + x] = on
      }
    }
  }

  private text(value: Localized, language: string): string | undefined {
    if (value === undefined) return undefined
    if (typeof value === "string") return value
    return value[language] ?? value.en ?? Object.values(value)[0]
  }

  /**
   * What the generator is told, from the recording's statements and nothing else: the testimony quoted, the place, the time, the weather
   * stated, the phenomenon as drawn. And what it must not do, since the shortest prompt invites it to fill every gap with the usual
   * picture of a UFO. In English, the language generators follow best; the testimony is also given in its own language.
   */
  private prompt(recording: any, from: number, to: number): string {
    const shapes = new Map<string, any>()
    // Where each shape stands as the clip opens (its motion after that is the reference frames' to give, not the prompt's).
    for (const keyframe of recording.timeline?.keyframes ?? []) {
      for (const shape of keyframe.shapes ?? []) if (keyframe.t <= from * 1000 || !shapes.has(shape.sourceId)) shapes.set(shape.sourceId, shape.shape)
    }
    const phenomena = [...shapes.entries()].map(([id, shape]) => {
      const angular = shape.angular ? `${shape.angular.widthDeg}° wide, ${shape.angular.heightDeg}° tall as seen` : "size not stated"
      const aim = shape.aim ? `, at the start of the clip azimuth ${Math.round(shape.aim.azimuthDeg)}°, ${shape.aim.altitudeDeg.toFixed(1)}° above the horizon` : ""
      return `- ${this.text(shape.title, "en") ?? id}: colour ${shape.color ?? "not stated"}, ${angular}${aim}.`
    })
    const milestones = (recording.milestones ?? []).filter((milestone: any) => milestone.t / 1000 >= from - 1 && milestone.t / 1000 <= to + 1)
      .map((milestone: any) => `- ${(milestone.t / 1000 - from).toFixed(1)} s into the clip: ${this.text(milestone.note, "en")}`)
    const original = Object.keys(recording.description ?? {})[0]
    return [
      `# Prompt: ${recording.id}`,
      "",
      "## Prompt",
      "",
      `Realistic, steady first-person view, as seen by a pedestrian's own eyes, ${recording.place?.name ?? "place not stated"}, local time ${recording.time}.`,
      `Keep exactly the geometry, horizon, framing and lighting of the conditioning video (depth and reference frames): only make the textures`,
      `(vegetation, ground, clouds, rain) photographic. The phenomenon is given by the reference frames inside the protected mask and must be`,
      `left as it is drawn there.`,
      "",
      "## Phenomenon (as drawn by the reconstruction, from the testimony)",
      "",
      ...phenomena,
      "",
      ...(milestones.length > 0 ? ["## What happens", "", ...milestones, ""] : []),
      ...this.weather(recording, from, to),
      "## Negative prompt",
      "",
      "No added objects, no windows or portholes, no lights or beams not in the reference, no smoke, no people other than stated, no camera shake",
      "beyond the reference, no lens flares not in the reference, no change of the phenomenon's shape, size, colour, position or motion.",
      "",
      "## The testimony, for the reader (not to be sent as the prompt: the generator would draw every word of it)",
      "",
      `> ${this.text(recording.description, "en") ?? ""}`,
      "",
      ...(original && original !== "en" ? [`> ${this.text(recording.description, original)}`, ""] : []),
      "## Label to burn into the generated film",
      "",
      "\"Reconstitution générée, pas une image réelle / Generated reconstruction, not real footage\": over the whole frame, not in a corner.",
      ""
    ].join("\n")
  }

  /** The weather the recording states over the clip (its records and its account): what the sky must look like, whatever the reconstruction's own rendering of it. */
  private weather(recording: any, from: number, to: number): string[] {
    const keyframes: any[] = recording.weatherTrack?.keyframes ?? []
    const describe = (weather: any) => {
      const parts: string[] = []
      if (typeof weather.cloudCover === "number") parts.push(weather.cloudCover >= 0.95 ? "overcast" : `cloud cover ${Math.round(weather.cloudCover * 100)} %`)
      if (typeof weather.cloudBaseM === "number") parts.push(`cloud base ${Math.round(weather.cloudBaseM)} m`)
      parts.push(weather.precipitationType && weather.precipitationType !== "none" ? `${weather.precipitationType}, intensity ${weather.precipitationIntensity}` : "no precipitation")
      return parts.join(", ")
    }
    const lines: string[] = []
    let last = ""
    for (const keyframe of keyframes) {
      const seconds = keyframe.t / 1000
      const text = describe(keyframe.weather)
      if (text === last) continue
      last = text
      if (seconds > to) break
      lines.push(`- ${seconds <= from ? "from the start of the clip" : `from ${(seconds - from).toFixed(1)} s into the clip`}: ${text}.`)
    }
    const tags: string[] = recording.tags ?? []
    if (lines.length === 0 && tags.length === 0) return []
    return ["## Weather and light (stated by the recording: the sky must follow this, not the reconstruction's own colours)", "", ...(tags.length > 0 ? [`- ${tags.join(", ")}.`] : []), ...lines, ""]
  }

  private manifest(options: Options, recording: any, size: { width: number, height: number }, count: number, from: number, to: number, nearM: number, farM: number): object {
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
        "depth/ + depth.mp4": `Distance from the eye on a logarithmic scale, 16-bit PNG (the film is 8-bit): value = 1 - ln(d / ${nearM.toFixed(2)} m) / ln(${Math.round(farM)} m / ${nearM.toFixed(2)} m), 1 near, 0 at the far end and for the sky. One range for the whole clip.`,
        "phenomenon-mask/ + phenomenon-mask.mp4": `White where the testimony's phenomenon is (grown by ${GenerativeAssets.MASK_MARGIN_PX} px): never to be redrawn by a generator, composited back from beauty/ afterwards.`,
        "sky-mask/ + sky-mask.mp4": "White where nothing solid is: sky and clouds.",
        "prompt.md": "Prompt and negative prompt written from the recording's statements only, and the label to burn into the result."
      },
      notStated: "Everything the testimony does not state is drawn by the reconstruction from data (terrain, decor, weather records) or marked as assumed in the recording: a generator must not be asked to decide it.",
      sound: recording.soundTrack?.keyframes?.length ? "See the recording's soundTrack." : "The recording states no sound (its own words: no noise from the phenomenon); the rain is synthesized by the player and not exported."
    }
  }
}

await new GenerativeAssets().run(process.argv.slice(2))
