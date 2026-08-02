import type { Timeline } from "../model/Timeline.js"
import type { Shape } from "../shape/Shape.js"

export type PlaybackState = "stopped" | "playing" | "paused"

/**
 * Replays a Timeline, replacing UFOController's animation-runner loop.
 * Preserves the original's discrete/hold-last-keyframe behavior (no
 * interpolation between keyframes) — that's what the applet actually did,
 * and it's the simpler, more predictable baseline for this milestone.
 * Driven by requestAnimationFrame advancing real wall-clock time, decoupling
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

  constructor(
    private readonly timeline: Timeline,
    private readonly onFrame: (t: number, shapesBySource: Map<string, Shape>) => void
  ) {
  }

  play(): void {
    if (this.state === "playing") return
    this.state = "playing"
    this.lastWallTime = performance.now()
    const tick = () => {
      if (this.state !== "playing") return
      const now = performance.now()
      this.currentT += (now - this.lastWallTime) * this.playbackRate
      this.lastWallTime = now
      if (this.currentT >= this.timeline.duration) {
        if (this.loop && this.timeline.duration > 0) {
          this.currentT %= this.timeline.duration
          this.resolveFrame(this.currentT)
          this.rafId = requestAnimationFrame(tick)
          return
        }
        this.currentT = this.timeline.duration
        this.resolveFrame(this.currentT)
        this.stop()
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
    this.currentT = Math.max(0, Math.min(t, this.timeline.duration))
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
      const shape = this.timeline.getLatestShapeAt(t, sourceId)
      if (shape) shapesBySource.set(sourceId, shape)
    }
    this.onFrame(t, shapesBySource)
  }
}
