/**
 * Chooses how many device pixels a scene is drawn at, from what its frames actually cost.
 *
 * A scene's cost is almost all pixels: the cloud volume is walked once per pixel per deck, and at
 * a Retina display's own ratio the front page's scene was 2.7 million of them — sixteen frames a
 * second on a recent laptop, where the same picture at half the pixels ran at sixty. Drawing at a
 * fixed lower ratio would sharpen nothing for the machines that can afford it, and drawing at the
 * display's ratio is what stuttered on those that cannot. So the ratio follows the frames: it
 * comes down while they are late, and goes back up once there is room.
 *
 * "Late" is read two ways. Where the graphics card can be timed (EXT_disjoint_timer_query_webgl2,
 * every current Chrome and Edge), each drawing is timed and the ratio follows that time directly,
 * up as well as down. Elsewhere only the interval between animation frames is known, which says
 * when frames are late but never how much room there is — a display refreshing sixty times a
 * second delivers a frame every 16.7 ms whether the card is idle or barely keeping up. There the
 * ratio is lowered on lateness and raised by PROBING: one step up now and then, kept if the frames
 * stay on time, undone otherwise, and tried again later.
 *
 * Between one and the display's own ratio, in quarter steps, and only while the picture is being
 * CHANGED: a still is drawn once and can afford every pixel it has, and so can a picture nobody is
 * touching whose stars merely twinkle (see noteChange).
 */
export class AdaptiveResolution {
  static readonly MIN_RATIO = 1
  static readonly STEP = 0.25
  /** Graphics time per drawing above which the ratio comes down — three quarters of a frame at 60 Hz. */
  static readonly GPU_LATE_MS = 12
  /** Graphics time per drawing below which a step up costs nothing visible: the step multiplies the
   * pixels by at most (1.25/1)², so from here even the largest step stays under GPU_LATE_MS. */
  static readonly GPU_ROOM_MS = 6
  /** Frame interval above which frames are late for want of a timer — a bit over 45 frames a second. */
  static readonly INTERVAL_LATE_MS = 21
  static readonly LOWER_COOLDOWN_MS = 750
  static readonly RAISE_COOLDOWN_MS = 2000
  /** How long a probe is watched before it is kept. */
  static readonly PROBE_WATCH_MS = 2000
  /** How soon after a kept probe, and after an undone one, the next is tried. */
  static readonly PROBE_EVERY_MS = 6000
  static readonly PROBE_BACKOFF_MS = 30000

  private ratio: number
  private maxRatio: number
  private readonly timer?: GpuFrameTimer
  /** Smoothed frame interval, ms — see INTERVAL_LATE_MS. */
  private intervalMs?: number
  private lastChangeMs = -Infinity
  private nextProbeMs = 0
  private probe?: { sinceMs: number; ratioBefore: number }

  constructor(maxRatio: number, gl?: WebGLRenderingContext | WebGL2RenderingContext | null) {
    this.maxRatio = AdaptiveResolution.clamp(maxRatio)
    this.ratio = this.maxRatio
    this.timer = gl ? GpuFrameTimer.create(gl) : undefined
  }

  get pixelRatio(): number {
    return this.ratio
  }

  /** How long after the last change the picture is holding still, and drawn at every pixel. */
  static readonly SETTLE_MS = 400
  /** How long changes must keep coming before they are a motion worth fewer pixels. */
  static readonly SUSTAINED_MS = 100

  private lastEditMs = -Infinity
  private editStreakStartMs = -Infinity
  private wasChanging = false

  /**
   * Something in the picture was changed — a restated sky, a moved pose, an edit — as opposed to
   * what moves on its own (a star's twinkle, the flare's shimmer, falling rain).
   *
   * Those ambient motions redraw every frame for as long as the scene is shown, and the editor
   * keeps them running over a paused recording: the ratio came down under them and never went back
   * up, so a picture nobody was touching stayed blurred. Only a change that keeps coming is a reason
   * to trade pixels for frames; a single one (a click) is drawn at every pixel.
   */
  noteChange(nowMs: number): void {
    if (nowMs - this.lastEditMs > AdaptiveResolution.SETTLE_MS) this.editStreakStartMs = nowMs
    this.lastEditMs = nowMs
  }

  /** Whether changes are coming in a sustained stream right now — see noteChange. */
  changing(nowMs: number): boolean {
    return nowMs - this.lastEditMs <= AdaptiveResolution.SETTLE_MS
      && this.lastEditMs - this.editStreakStartMs >= AdaptiveResolution.SUSTAINED_MS
  }

  /**
   * The ratio to draw the next frame at: every pixel while the picture holds still, the adapted one
   * while it changes. What frames cost while still says nothing about what they will cost moving,
   * so the measurements are forgotten each time a motion starts.
   */
  ratioFor(nowMs: number, intervalMs: number): number {
    const changing = this.changing(nowMs)
    if (!changing) {
      this.wasChanging = false
      return this.maxRatio
    }
    if (!this.wasChanging) {
      this.wasChanging = true
      this.reset()
      return this.ratio
    }
    this.update(nowMs, intervalMs)
    return this.ratio
  }

  /** Whether the graphics card itself is being timed, or only the frames' intervals. */
  get timesGpu(): boolean {
    return this.timer !== undefined
  }

  /** The most the ratio may rise to — the display's own by default; a page may ask for less. */
  set maximum(maxRatio: number) {
    this.maxRatio = AdaptiveResolution.clamp(maxRatio)
    if (this.ratio > this.maxRatio) this.ratio = this.maxRatio
  }

  get maximum(): number {
    return this.maxRatio
  }

  /** Brackets one drawing, so the card's time for it can be read later. */
  beginDrawing(): void {
    this.timer?.begin()
  }

  endDrawing(): void {
    this.timer?.end()
  }

  /** Forgets what was measured — on a pause, since the next frames say nothing about the last. */
  reset(): void {
    this.intervalMs = undefined
    this.probe = undefined
    this.timer?.reset()
  }

  /**
   * One animation frame later: `intervalMs` since the previous one. Returns the ratio to draw the
   * next frames at when it changed, undefined otherwise.
   */
  update(nowMs: number, intervalMs: number): number | undefined {
    const gpuMs = this.timer?.poll()
    if (this.timer && gpuMs === undefined) return undefined
    if (gpuMs !== undefined) return this.followGpu(nowMs, gpuMs)
    return this.followIntervals(nowMs, intervalMs)
  }

  private followGpu(nowMs: number, gpuMs: number): number | undefined {
    if (gpuMs > AdaptiveResolution.GPU_LATE_MS) return this.lower(nowMs, AdaptiveResolution.LOWER_COOLDOWN_MS)
    if (gpuMs < AdaptiveResolution.GPU_ROOM_MS) return this.raise(nowMs, AdaptiveResolution.RAISE_COOLDOWN_MS)
    return undefined
  }

  private followIntervals(nowMs: number, intervalMs: number): number | undefined {
    if (!(intervalMs > 0) || intervalMs > 1000) return undefined
    this.intervalMs = this.intervalMs === undefined ? intervalMs : this.intervalMs * 0.9 + intervalMs * 0.1
    const late = this.intervalMs > AdaptiveResolution.INTERVAL_LATE_MS
    if (this.probe) {
      if (late) {
        // The step up was too much: back where it was, and not tried again for a good while.
        this.ratio = this.probe.ratioBefore
        this.probe = undefined
        this.lastChangeMs = nowMs
        this.nextProbeMs = nowMs + AdaptiveResolution.PROBE_BACKOFF_MS
        return this.ratio
      }
      if (nowMs - this.probe.sinceMs >= AdaptiveResolution.PROBE_WATCH_MS) {
        this.probe = undefined
        this.nextProbeMs = nowMs + AdaptiveResolution.PROBE_EVERY_MS
      }
      return undefined
    }
    if (late) {
      const lowered = this.lower(nowMs, AdaptiveResolution.LOWER_COOLDOWN_MS)
      if (lowered !== undefined) this.nextProbeMs = nowMs + AdaptiveResolution.PROBE_EVERY_MS
      return lowered
    }
    if (this.ratio < this.maxRatio && nowMs >= this.nextProbeMs && nowMs - this.lastChangeMs >= AdaptiveResolution.RAISE_COOLDOWN_MS) {
      const ratioBefore = this.ratio
      const raised = this.raise(nowMs, 0)
      if (raised !== undefined) this.probe = { sinceMs: nowMs, ratioBefore }
      return raised
    }
    return undefined
  }

  private lower(nowMs: number, cooldownMs: number): number | undefined {
    if (this.ratio <= AdaptiveResolution.MIN_RATIO || nowMs - this.lastChangeMs < cooldownMs) return undefined
    this.ratio = AdaptiveResolution.clamp(this.ratio - AdaptiveResolution.STEP)
    this.lastChangeMs = nowMs
    return this.ratio
  }

  private raise(nowMs: number, cooldownMs: number): number | undefined {
    if (this.ratio >= this.maxRatio || nowMs - this.lastChangeMs < cooldownMs) return undefined
    this.ratio = Math.min(this.maxRatio, AdaptiveResolution.clamp(this.ratio + AdaptiveResolution.STEP))
    this.lastChangeMs = nowMs
    return this.ratio
  }

  private static clamp(ratio: number): number {
    if (!Number.isFinite(ratio)) return AdaptiveResolution.MIN_RATIO
    return Math.max(AdaptiveResolution.MIN_RATIO, Math.round(ratio / AdaptiveResolution.STEP) * AdaptiveResolution.STEP)
  }
}

/**
 * Times drawings on the graphics card, where the browser allows it — see AdaptiveResolution.
 *
 * A query brackets one drawing; its result arrives frames later, so several are kept in flight
 * and read back as they complete. What is reported is a smoothed time per drawing, undefined until
 * the first result is in.
 */
class GpuFrameTimer {
  private static readonly IN_FLIGHT_MAX = 8

  static create(gl: WebGLRenderingContext | WebGL2RenderingContext): GpuFrameTimer | undefined {
    if (!(gl instanceof WebGL2RenderingContext)) return undefined
    const extension = gl.getExtension("EXT_disjoint_timer_query_webgl2") as { TIME_ELAPSED_EXT: number; GPU_DISJOINT_EXT: number } | null
    return extension ? new GpuFrameTimer(gl, extension) : undefined
  }

  private readonly pending: WebGLQuery[] = []
  private active?: WebGLQuery
  private smoothedMs?: number

  private constructor(
    private readonly gl: WebGL2RenderingContext,
    private readonly extension: { TIME_ELAPSED_EXT: number; GPU_DISJOINT_EXT: number }
  ) {}

  begin(): void {
    if (this.active || this.pending.length >= GpuFrameTimer.IN_FLIGHT_MAX) return
    try {
      const query = this.gl.createQuery()
      if (!query) return
      this.gl.beginQuery(this.extension.TIME_ELAPSED_EXT, query)
      this.active = query
    } catch {
      this.active = undefined
    }
  }

  end(): void {
    if (!this.active) return
    try {
      this.gl.endQuery(this.extension.TIME_ELAPSED_EXT)
      this.pending.push(this.active)
    } catch {
      // A context lost mid-drawing: nothing to read back.
    }
    this.active = undefined
  }

  /** The smoothed time of a drawing, in ms, once any result has come back. */
  poll(): number | undefined {
    const gl = this.gl
    try {
      for (let i = 0; i < this.pending.length; i++) {
        const query = this.pending[i]
        if (!gl.getQueryParameter(query, gl.QUERY_RESULT_AVAILABLE)) continue
        const disjoint = gl.getParameter(this.extension.GPU_DISJOINT_EXT) as boolean
        if (!disjoint) {
          const ms = (gl.getQueryParameter(query, gl.QUERY_RESULT) as number) / 1e6
          this.smoothedMs = this.smoothedMs === undefined ? ms : this.smoothedMs * 0.8 + ms * 0.2
        }
        gl.deleteQuery(query)
        this.pending.splice(i, 1)
        i--
      }
    } catch {
      this.pending.length = 0
    }
    return this.smoothedMs
  }

  reset(): void {
    this.smoothedMs = undefined
  }
}
