import type { Timeline } from "../model/Timeline.js"
import type { Shape } from "../shape/Shape.js"

export type PlaybackState = "stopped" | "playing" | "paused"

/**
 * Replays a Timeline, replacing UFOController's animation-runner loop.
 * Shapes are linearly interpolated between a source's surrounding keyframes for smooth
 * motion (see Timeline.getInterpolatedShapeAt/Shape.lerpShape), holding at the ends of its
 * recorded range. Driven by requestAnimationFrame advancing real wall-clock time, decoupling
 * playback frame rate from whatever samplingRate the recording used.
 */
export class Player {
  private rafId: number | null = null
  private state: PlaybackState = "stopped"
  private currentT = 0
  private lastWallTime = 0

  /**
   * Multiplies elapsed wall-clock time before advancing currentT. 1 (default) means playback
   * takes as long as `timeline.duration` itself; UfoElement sets this to
   * `timeline.duration / sightingDurationMs(event)` when the sighting's real declared duration
   * is known, so watching it takes as long as the observation was actually reported to last,
   * rather than however long the recording itself took to author (e.g. a quick mouse drag).
   * Manually dragging the seek bar always jumps directly regardless of this rate.
   */
  playbackRate = 1

  /** When true, playback restarts from 0 instead of stopping once it reaches the end. */
  loop = false

  /**
   * Called once, after the final frame is painted, when playback runs off the end of the timeline
   * without looping.
   *
   * A hook rather than something a caller could infer from the frame callback: a single tick can
   * carry the playhead from well inside the recording to past its end, so there is no "last
   * playing frame" to compare against, and a `seek()` to the very end paints a frame at exactly
   * the same position without anything having ended. Only this branch is the ending.
   */
  onEnded?: () => void

  /**
   * Extends the seekable/playable range beyond timeline.duration (the last recorded
   * keyframe) when the sighting's real declared duration is longer — UfoElement sets this
   * from sightingDurationMs(event). Without it, an editor couldn't scrub to and place the
   * very first keyframe past wherever the last one currently sits (seek()/play() would clamp
   * right back), and pure playback would stop at the last recorded position instead of
   * holding it for the remainder of a longer real observation. 0 (default) means "no
   * extension" — seekableDuration then falls back to plain timeline.duration.
   */
  durationOverrideMs = 0

  constructor(
    private readonly timeline: Timeline,
    private readonly onFrame: (t: number, shapesBySource: Map<string, Shape>) => void
  ) {
  }

  get seekableDuration(): number {
    return Math.max(this.timeline.duration, this.durationOverrideMs)
  }

  play(): void {
    if (this.state === "playing") return
    // Replaying after reaching the end (non-looping) restarts from 0, matching standard media
    // player behavior — otherwise the next tick would immediately re-trigger the end-of-timeline
    // branch below and stop again with no visible effect.
    if (this.currentT >= this.seekableDuration) {
      this.currentT = 0
      this.resolveFrame(0)
    }
    this.state = "playing"
    this.lastWallTime = performance.now()
    const tick = () => {
      if (this.state !== "playing") return
      const now = performance.now()
      this.currentT += (now - this.lastWallTime) * this.playbackRate
      this.lastWallTime = now
      if (this.currentT >= this.seekableDuration) {
        if (this.loop && this.seekableDuration > 0) {
          this.currentT %= this.seekableDuration
          this.resolveFrame(this.currentT)
          this.rafId = requestAnimationFrame(tick)
          return
        }
        this.currentT = this.seekableDuration
        // stop() before resolveFrame(): callers reading `playbackState` from within onFrame (e.g.
        // to sync a Play/Pause button) see the final "stopped" state, not a stale "playing" one.
        this.stop()
        this.resolveFrame(this.currentT)
        this.onEnded?.()
        return
      }
      this.resolveFrame(this.currentT)
      this.rafId = requestAnimationFrame(tick)
    }
    this.rafId = requestAnimationFrame(tick)
  }

  pause(): void {
    if (this.state !== "playing") return
    this.state = "paused"
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId)
      this.rafId = null
    }
  }

  stop(): void {
    this.state = "stopped"
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId)
      this.rafId = null
    }
  }

  seek(t: number): void {
    this.currentT = Math.max(0, Math.min(t, this.seekableDuration))
    this.resolveFrame(this.currentT)
  }

  get playbackState(): PlaybackState {
    return this.state
  }

  get time(): number {
    return this.currentT
  }

  private resolveFrame(t: number): void {
    const shapesBySource = new Map<string, Shape>()
    for (const sourceId of this.timeline.sourceIds) {
      const shape = this.timeline.getInterpolatedShapeAt(t, sourceId)
      if (shape) shapesBySource.set(sourceId, shape)
    }
    this.onFrame(t, shapesBySource)
  }
}
