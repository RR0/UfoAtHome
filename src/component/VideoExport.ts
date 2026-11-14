import { BufferTarget, CanvasSource, getFirstEncodableVideoCodec, Mp4OutputFormat, Output, QUALITY_HIGH } from "mediabunny"

/**
 * A scene as a film is made from it, one frame at a time: what part of the recording, at what speed, and the drawing of one instant.
 */
export interface FilmedScene {
  /** The part of the recording filmed, in the player's own timeline ms (see Player). */
  readonly fromMs: number
  readonly toMs: number
  /** How many of the timeline's ms pass in one ms of the film: the player's own playbackRate, so the film lasts as long as the observation did. */
  readonly rate: number
  /** The size of the film, in pixels. */
  readonly width: number
  readonly height: number

  /**
   * Draws the recording at `timeMs`, everything that moves on its own (rain, twinkle) at the film's own `clockMs`, and copies the picture
   * into `target` in the same task, the drawing buffer not being kept past it. Says whether it could: a scene still loading or compiling
   * has nothing to show yet, and is asked again.
   */
  frameAt(timeMs: number, clockMs: number, target: OffscreenCanvasRenderingContext2D): boolean
}

/**
 * Makes an MP4 film of a scene, frame by frame rather than as it plays.
 *
 * Captured as it plays, a film would be as the machine managed it: frames dropped whenever one took longer than the screen's own, and a
 * twenty-minute observation twenty minutes to film. Here each frame is asked for at its own instant and waited for, however long it takes
 * to draw, and the animations are moved on the film's clock (see FilmedScene.frameAt): the film runs at its frame rate whatever the
 * machine, and the same recording makes the same film.
 *
 * Encoded by the browser itself (WebCodecs), packed by mediabunny: loaded only when a film is asked for (see SceneElement.film).
 */
export class VideoExport {
  static readonly FRAME_RATE = 30
  /** How long one frame may take to be drawn before the film is given up: a scene whose relief or decor never arrives. */
  static readonly FRAME_PATIENCE_MS = 30000
  /** How often a frame not yet drawn is asked again. */
  static readonly FRAME_RETRY_MS = 20

  /** Whether this browser can make a film at all. */
  static get supported(): boolean {
    return typeof VideoEncoder !== "undefined" && typeof OffscreenCanvas !== "undefined"
  }

  /**
   * The film of `scene`, as an MP4 file.
   *
   * @param onProgress Told the share of the frames made so far, 0 to 1.
   * @param signal Aborts the film: the promise then rejects with the signal's reason.
   */
  static async film(scene: FilmedScene, onProgress: (share: number) => void, signal: AbortSignal): Promise<Blob> {
    // Even sizes: H.264 halves the picture for its colours.
    const width = Math.max(2, Math.floor(scene.width / 2) * 2)
    const height = Math.max(2, Math.floor(scene.height / 2) * 2)
    const codec = await getFirstEncodableVideoCodec(["avc", "vp9", "av1"], { width, height })
    if (!codec) throw new Error(`No video codec for ${width}×${height}`)
    const canvas = new OffscreenCanvas(width, height)
    const context = canvas.getContext("2d")
    if (!context) throw new Error("No 2D context")
    context.imageSmoothingQuality = "high"
    const output = new Output({ format: new Mp4OutputFormat({ fastStart: "in-memory" }), target: new BufferTarget() })
    const source = new CanvasSource(canvas, { codec, quality: QUALITY_HIGH })
    output.addVideoTrack(source, { frameRate: VideoExport.FRAME_RATE })
    await output.start()
    try {
      const stepMs = 1000 / VideoExport.FRAME_RATE
      const rate = scene.rate > 0 ? scene.rate : 1
      const filmMs = Math.max(0, scene.toMs - scene.fromMs) / rate
      const frames = Math.floor(filmMs / stepMs) + 1
      const clockStartMs = performance.now()
      for (let index = 0; index < frames; index++) {
        signal.throwIfAborted()
        const timeMs = Math.min(scene.fromMs + index * stepMs * rate, scene.toMs)
        await VideoExport.drawFrame(scene, timeMs, clockStartMs + index * stepMs, context, signal)
        await source.add(index / VideoExport.FRAME_RATE, 1 / VideoExport.FRAME_RATE)
        onProgress((index + 1) / frames)
        // What the next instant asks for (a tile, a model) arrives in tasks of its own.
        await VideoExport.nextTask()
      }
      await output.finalize()
    } catch (error) {
      await output.cancel().catch(() => undefined)
      throw error
    }
    const buffer = output.target.buffer
    if (!buffer) throw new Error("Empty film")
    return new Blob([buffer], { type: output.format.mimeType })
  }

  private static async drawFrame(scene: FilmedScene, timeMs: number, clockMs: number, target: OffscreenCanvasRenderingContext2D, signal: AbortSignal): Promise<void> {
    const giveUpAtMs = performance.now() + VideoExport.FRAME_PATIENCE_MS
    while (!scene.frameAt(timeMs, clockMs, target)) {
      signal.throwIfAborted()
      if (performance.now() > giveUpAtMs) throw new Error(`No frame at ${Math.round(timeMs)} ms`)
      await new Promise(resolve => setTimeout(resolve, VideoExport.FRAME_RETRY_MS))
    }
  }

  /** The next task, without the clamping of timers (a hidden page's are slowed to one a second). */
  private static nextTask(): Promise<void> {
    return new Promise(resolve => {
      const channel = new MessageChannel()
      channel.port1.onmessage = () => {
        channel.port1.close()
        resolve()
      }
      channel.port2.postMessage(undefined)
    })
  }
}
