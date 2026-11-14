import { AudioBufferSource, BufferTarget, CanvasSource, getFirstEncodableAudioCodec, getFirstEncodableVideoCodec, Mp4OutputFormat, Output, QUALITY_HIGH } from "mediabunny"

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

  /**
   * Plays every sound of the scene into `context` from now on, as it would play to the reader while the recording runs, or back to the
   * reader's speakers with undefined. Each frame drawn restates them at the instant the context is suspended at: what is heard follows
   * the picture to the sample.
   */
  hearInto(context: BaseAudioContext | undefined): void

  /**
   * Called once each frame is in the film, with the picture it was made from and its index: what is made alongside the film, frame for
   * frame (see GenerativeKit), is made here. The next frame is not drawn before it has resolved.
   */
  afterFrame?(index: number, picture: OffscreenCanvasRenderingContext2D): Promise<void>

  /** What the film's file says of itself (see film): what it is called, what it is, and what it was made from. */
  readonly about?: FilmAbout
}

/** What a film's file says of itself, in its metadata. */
export interface FilmAbout {
  readonly title?: string
  /** What it is: a simulation, not a recording of the observation. */
  readonly description?: string
  /** The address of the recording it was made from. */
  readonly source?: string
}

/**
 * Makes an MP4 film of a scene, frame by frame rather than as it plays.
 *
 * Captured as it plays, a film would be as the machine managed it: frames dropped whenever one took longer than the screen's own, and a
 * twenty-minute observation twenty minutes to film. Here each frame is asked for at its own instant and waited for, however long it takes
 * to draw, and the animations are moved on the film's clock (see FilmedScene.frameAt): the film runs at its frame rate whatever the
 * machine, and the same recording makes the same film.
 *
 * The sound is rendered alongside, in a context of its own (see FilmedScene.hearInto). Encoded by the browser itself (WebCodecs), packed by
 * mediabunny: loaded only when a film is asked for (see SceneElement.film).
 */
export class VideoExport {
  static readonly FRAME_RATE = 30
  /** Who the film's file says made it. */
  static readonly MADE_BY = "UFO@home (https://ufoathome.org)"
  /** The film's sound: stereo, as the aircraft are placed left and right of the listener. */
  static readonly CHANNELS = 2
  static readonly SAMPLE_RATE = 48000
  /** How long one frame may take to be drawn before the film is given up: a scene whose relief or decor never arrives. */
  static readonly FRAME_PATIENCE_MS = 30000
  /** How often the page is let paint while a film is made (see film). */
  static readonly PAINT_EVERY_MS = 100
  /** The longest a film waits for the page to be painted. */
  static readonly PAINT_WAIT_MS = 50
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
    // Whoever is passed the file can read where it comes from: made by UFO@home, when, and from which recording.
    output.setMetadataTags({
      artist: VideoExport.MADE_BY,
      date: new Date(),
      ...(scene.about?.title ? { title: scene.about.title } : {}),
      ...(scene.about?.description ? { description: scene.about.description } : {}),
      ...(scene.about?.source ? { comment: scene.about.source } : {})
    })
    const video = new CanvasSource(canvas, { codec, quality: QUALITY_HIGH })
    output.addVideoTrack(video, { frameRate: VideoExport.FRAME_RATE })
    const stepMs = 1000 / VideoExport.FRAME_RATE
    const rate = scene.rate > 0 ? scene.rate : 1
    const filmMs = Math.max(0, scene.toMs - scene.fromMs) / rate
    const frames = Math.floor(filmMs / stepMs) + 1
    // Where the browser can encode no sound, the film is made silent rather than not at all.
    const audioCodec = await getFirstEncodableAudioCodec(["aac", "opus"], { numberOfChannels: VideoExport.CHANNELS, sampleRate: VideoExport.SAMPLE_RATE })
    const audio = audioCodec ? new AudioBufferSource({ codec: audioCodec, quality: QUALITY_HIGH }) : undefined
    if (audio) output.addAudioTrack(audio)
    const sound = audio ? new OfflineAudioContext(VideoExport.CHANNELS, Math.ceil(frames / VideoExport.FRAME_RATE * VideoExport.SAMPLE_RATE), VideoExport.SAMPLE_RATE) : undefined
    await output.start()
    try {
      if (sound) scene.hearInto(sound)
      // The sound is rendered as the frames are drawn: suspended at each frame's instant, so that what the frame restates (the rain, an
      // engine, a voice) starts there. The first frame is drawn before it starts, at its instant 0.
      const reached: Promise<void>[] = []
      for (let index = 1; index < frames && sound; index++) reached[index] = sound.suspend(index / VideoExport.FRAME_RATE)
      const clockStartMs = performance.now()
      let rendering: Promise<AudioBuffer> | undefined
      let paintedAtMs = performance.now()
      for (let index = 0; index < frames; index++) {
        signal.throwIfAborted()
        if (index > 0) await reached[index]
        const timeMs = Math.min(scene.fromMs + index * stepMs * rate, scene.toMs)
        await VideoExport.drawFrame(scene, timeMs, clockStartMs + index * stepMs, context, signal)
        await video.add(index / VideoExport.FRAME_RATE, 1 / VideoExport.FRAME_RATE)
        await scene.afterFrame?.(index, context)
        onProgress((index + 1) / frames)
        if (sound) {
          if (rendering) await sound.resume()
          else rendering = sound.startRendering()
        }
        // What the next instant asks for (a tile, a model) arrives in tasks of its own; and now and then the page is painted, its
        // progress with it: a page that went on making frames without ever showing one would look, to the reader as to the browser, hung.
        if (performance.now() - paintedAtMs > VideoExport.PAINT_EVERY_MS && typeof document !== "undefined" && !document.hidden) {
          // Not longer than PAINT_WAIT_MS: a page out of sight that the browser does not call hidden (a pane put away) is given an
          // animation frame a second, and a film made there would wait as long every tenth of a second.
          await new Promise(resolve => {
            requestAnimationFrame(resolve)
            setTimeout(resolve, VideoExport.PAINT_WAIT_MS)
          })
          paintedAtMs = performance.now()
        } else {
          await VideoExport.nextTask()
        }
      }
      if (audio && rendering) await audio.add(await rendering)
      await output.finalize()
    } catch (error) {
      await output.cancel().catch(() => undefined)
      throw error
    } finally {
      if (sound) scene.hearInto(undefined)
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
      // A hidden page's timers are slowed to one a second, and to one a minute after a while: a film made in a tab left behind would
      // wait that long for every frame not drawn at once. Its tasks are not slowed.
      if (typeof document !== "undefined" && document.hidden) await VideoExport.nextTask()
      else await new Promise(resolve => setTimeout(resolve, VideoExport.FRAME_RETRY_MS))
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
