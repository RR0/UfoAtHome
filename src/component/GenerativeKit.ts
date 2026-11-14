import { BufferTarget, CanvasSource, getFirstEncodableVideoCodec, Mp4OutputFormat, Output, QUALITY_HIGH } from "mediabunny"
import { zip, type AsyncZippable } from "fflate"
import { VideoExport, type FilmedScene } from "./VideoExport.js"
import type { ControlPassFrame } from "../render3d/ControlPasses.js"
import { ControlPassEncoding } from "../engine/generative/ControlPassEncoding.js"
import { GenerativePrompt } from "../engine/generative/GenerativePrompt.js"
import type { GenerativeKitMessages } from "./messages/GenerativeKitMessages.js"

/** What a kit is made from: the film of the scene, without what is laid over it, and what the scene can say of each of its frames. */
export interface KitScene {
  /** The film, its pictures free of any caption, logo or photograph of the place: what a generator is to make realistic. */
  readonly film: FilmedScene
  /** The control passes of the frame frameAt has just drawn, in the same task (see SceneRenderer.drawControlPasses). */
  drawControlPasses(): ControlPassFrame
  /** The recording, in its own format: what the prompt is written from (see GenerativePrompt). */
  readonly recording: object
  /** The observation's name, and the address of the recording. */
  readonly title: string
  readonly source?: string
}

/** One of the films made alongside the reference, frame for frame: its encoder, and the canvas each frame is painted into. */
interface PassFilm {
  readonly name: string
  readonly output: Output<Mp4OutputFormat, BufferTarget>
  readonly source: CanvasSource
  readonly context: OffscreenCanvasRenderingContext2D
}

/**
 * The kit a reader downloads to make a realistic video of a reconstruction with a generator of their own choosing (Runway, Kling, Luma,
 * Veo…), without letting the generator invent the testimony: a zip of the reference film (with its sound, nothing laid over it), the depth
 * and the masks of the phenomenon and of the sky (see ControlPasses), the first frame, a prompt written from the recording's statements only
 * (see GenerativePrompt), the instructions in the reader's language and a manifest.
 *
 * Made in the reader's browser, from the same frames as the film (see VideoExport): nothing is sent anywhere. Loaded only when a kit is
 * asked for.
 */
export class GenerativeKit {

  static async make(kit: KitScene, texts: GenerativeKitMessages, onProgress: (share: number) => void, signal: AbortSignal): Promise<Blob> {
    const width = Math.max(2, Math.floor(kit.film.width / 2) * 2)
    const height = Math.max(2, Math.floor(kit.film.height / 2) * 2)
    const codec = await getFirstEncodableVideoCodec(["avc", "vp9", "av1"], { width, height })
    if (!codec) throw new Error(`No video codec for ${width}×${height}`)
    const passes = await Promise.all(["depth", "phenomenon-mask", "sky-mask"].map(name => GenerativeKit.passFilm(name, width, height, codec)))
    const [depth, phenomenon, sky] = passes
    let drawn: ControlPassFrame | undefined
    let firstFrame: Blob | undefined
    let frames = 0
    try {
      const reference = await VideoExport.film({
        ...kit.film,
        frameAt: (timeMs, clockMs, target) => {
          if (!kit.film.frameAt(timeMs, clockMs, target)) return false
          // In the same task as the picture: nothing has moved the scene since.
          drawn = kit.drawControlPasses()
          return true
        },
        hearInto: context => kit.film.hearInto(context),
        afterFrame: async (index, picture) => {
          if (index === 0) firstFrame = await picture.canvas.convertToBlob({ type: "image/png" })
          if (!drawn) throw new Error(`No control passes for frame ${index}`)
          GenerativeKit.paint(drawn, depth.context, phenomenon.context, sky.context)
          drawn = undefined
          for (const pass of passes) await pass.source.add(index / VideoExport.FRAME_RATE, 1 / VideoExport.FRAME_RATE)
          frames = index + 1
        }
      }, onProgress, signal)
      const films = await Promise.all(passes.map(async pass => {
        await pass.output.finalize()
        const buffer = pass.output.target.buffer
        if (!buffer) throw new Error(`Empty ${pass.name} film`)
        return [pass.name, new Uint8Array(buffer)] as const
      }))
      return await GenerativeKit.zipped(kit, texts, new Uint8Array(await reference.arrayBuffer()), films, firstFrame, frames)
    } catch (error) {
      await Promise.all(passes.map(pass => pass.output.cancel().catch(() => undefined)))
      throw error
    }
  }

  private static async passFilm(name: string, width: number, height: number, codec: Awaited<ReturnType<typeof getFirstEncodableVideoCodec>>): Promise<PassFilm> {
    const canvas = new OffscreenCanvas(width, height)
    const context = canvas.getContext("2d")
    if (!context) throw new Error("No 2D context")
    // A distance or a mask is not blended between neighbours.
    context.imageSmoothingEnabled = false
    const output = new Output({ format: new Mp4OutputFormat({ fastStart: "in-memory" }), target: new BufferTarget() })
    const source = new CanvasSource(canvas, { codec: codec!, quality: QUALITY_HIGH })
    output.addVideoTrack(source, { frameRate: VideoExport.FRAME_RATE })
    await output.start()
    return { name, output, source, context }
  }

  /** Paints one frame of the passes, at their own size, into the films' canvases, scaled to the film's. */
  private static paint(passes: ControlPassFrame, depth: OffscreenCanvasRenderingContext2D, phenomenon: OffscreenCanvasRenderingContext2D, sky: OffscreenCanvasRenderingContext2D): void {
    const { width, height } = passes
    const pixels = width * height
    const grown = new Uint8Array(pixels)
    ControlPassEncoding.dilate(passes.phenomenon, grown, width, height)
    const levels = { depth: new ImageData(width, height), phenomenon: new ImageData(width, height), sky: new ImageData(width, height) }
    for (let at = 0; at < pixels; at++) {
      const distanceM = passes.distanceM[at]
      const grey = Math.round(ControlPassEncoding.depthLevel(distanceM) * 255)
      const skyLevel = distanceM > 0 ? 0 : 255
      const offset = at * 4
      for (const [data, value] of [[levels.depth.data, grey], [levels.phenomenon.data, grown[at]], [levels.sky.data, skyLevel]] as const) {
        data[offset] = value
        data[offset + 1] = value
        data[offset + 2] = value
        data[offset + 3] = 255
      }
    }
    const scratch = new OffscreenCanvas(width, height)
    const scratchContext = scratch.getContext("2d")!
    for (const [target, image] of [[depth, levels.depth], [phenomenon, levels.phenomenon], [sky, levels.sky]] as const) {
      scratchContext.putImageData(image, 0, 0)
      target.drawImage(scratch, 0, 0, target.canvas.width, target.canvas.height)
    }
  }

  private static zipped(kit: KitScene, texts: GenerativeKitMessages, reference: Uint8Array, films: readonly (readonly [string, Uint8Array])[], firstFrame: Blob | undefined, frames: number): Promise<Blob> {
    const encoder = new TextEncoder()
    // The recording's own seconds, which its keyframes and milestones are in; the observation's are these over the rate.
    const fromSeconds = kit.film.fromMs / 1000
    const toSeconds = kit.film.toMs / 1000
    const rate = kit.film.rate > 0 ? kit.film.rate : 1
    const durationS = Math.round(frames / VideoExport.FRAME_RATE * 10) / 10
    const date = new Date().toISOString().slice(0, 10)
    const facts: Record<string, string> = {
      title: kit.title,
      source: kit.source ?? "",
      date,
      fps: String(VideoExport.FRAME_RATE),
      duration: String(durationS),
      near: String(ControlPassEncoding.DEPTH_NEAR_M),
      far: String(ControlPassEncoding.DEPTH_FAR_M),
      margin: String(ControlPassEncoding.MASK_MARGIN_PX),
      label: texts.label
    }
    const readme = texts.readme.replace(/\{(\w+)\}/g, (whole, key: string) => facts[key] ?? whole)
    const manifest = {
      title: kit.title,
      source: kit.source,
      madeBy: VideoExport.MADE_BY,
      date,
      clip: { fromSeconds: fromSeconds / rate, toSeconds: toSeconds / rate, fps: VideoExport.FRAME_RATE, frames, width: kit.film.width, height: kit.film.height },
      depth: { encoding: "1 - ln(d / near) / ln(far / near), clamped to 0..1; 0 for the sky", nearM: ControlPassEncoding.DEPTH_NEAR_M, farM: ControlPassEncoding.DEPTH_FAR_M },
      phenomenonMaskMarginPx: ControlPassEncoding.MASK_MARGIN_PX,
      label: texts.label
    }
    const stored = { level: 0 as const }
    const files: AsyncZippable = {
      "reference.mp4": [reference, stored],
      ...Object.fromEntries(films.map(([name, bytes]) => [`${name}.mp4`, [bytes, stored]])),
      "prompt.txt": encoder.encode(GenerativePrompt.of(kit.recording, { fromSeconds, toSeconds, rate })),
      [texts.readmeFile]: encoder.encode(readme),
      "manifest.json": encoder.encode(JSON.stringify(manifest, null, 2) + "\n")
    }
    return (async () => {
      if (firstFrame) files["first-frame.png"] = [new Uint8Array(await firstFrame.arrayBuffer()), stored]
      return new Promise<Blob>((resolve, reject) => zip(files, (error, bytes) => error ? reject(error) : resolve(new Blob([bytes as BlobPart], { type: "application/zip" }))))
    })()
  }
}
