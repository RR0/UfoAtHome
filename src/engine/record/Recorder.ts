import type { Timeline } from "../model/Timeline.js"
import type { Shape } from "../shape/Shape.js"
import { moveShapeTo } from "../shape/Shape.js"
import type { SamplingClock } from "./SamplingClock.js"

/**
 * Records a shape's position over time as the user drags it, replacing
 * BehaviorController/DrawController's drag-sampling. Pointer moves only update
 * the latest known position (cheap); the clock's tick decides when to actually
 * commit a keyframe from that position, at samplingRate cadence — this avoids
 * over-recording at native pointermove rates (60-240+ Hz).
 *
 * A take is thinned when it stops: a sample the playback would draw within `tolerancePx` of where it
 * was, by interpolating between the samples kept around it, is dropped. Five minutes at 100 ms are
 * 3000 keyframes nobody can go back to one by one, and most of them only say "still going the same
 * way at the same speed". The test is made in time, not along the path, so a pause, a turn back or
 * a change of speed keeps the samples that show it.
 */
export class Recorder {
  /** How far, in canvas pixels, the thinned take may be drawn from the samples it drops: under a pixel, nothing to see. */
  static readonly TOLERANCE_PX = 1

  private currentPointer: { x: number; y: number } | null = null
  private shapePrototype: Shape | null = null
  private sourceId = ""
  /** What this take wrote, in order: when, and where the centre was. */
  private samples: Array<{ t: number; x: number; y: number }> = []

  constructor(
    private readonly timeline: Timeline,
    private readonly clock: SamplingClock,
    private readonly tolerancePx = Recorder.TOLERANCE_PX
  ) {
  }

  start(sourceId: string, shapePrototype: Shape): void {
    this.sourceId = sourceId
    this.shapePrototype = shapePrototype
    this.currentPointer = null
    this.samples = []
    this.clock.start(elapsedMs => this.recordSample(elapsedMs))
  }

  onPointerMove(x: number, y: number): void {
    this.currentPointer = { x, y }
  }

  stop(): void {
    this.clock.stop()
    this.thin()
  }

  /** Drops the samples the playback would draw within tolerance anyway — see the class's own doc. */
  private thin(): void {
    const samples = this.samples
    if (samples.length <= 2) return
    const kept = new Set([0, samples.length - 1])
    const spans: Array<[number, number]> = [[0, samples.length - 1]]
    while (spans.length > 0) {
      const [first, last] = spans.pop()!
      const a = samples[first]
      const b = samples[last]
      let worst = 0
      let worstIndex = -1
      for (let i = first + 1; i < last; i++) {
        const p = samples[i]
        const fraction = (p.t - a.t) / (b.t - a.t)
        const distance = Math.hypot(a.x + (b.x - a.x) * fraction - p.x, a.y + (b.y - a.y) * fraction - p.y)
        if (distance > worst) {
          worst = distance
          worstIndex = i
        }
      }
      if (worstIndex !== -1 && worst > this.tolerancePx) {
        kept.add(worstIndex)
        spans.push([first, worstIndex], [worstIndex, last])
      }
    }
    samples.forEach((sample, i) => {
      if (!kept.has(i)) this.timeline.removeShapeAt(sample.t, this.sourceId)
    })
    this.samples = []
  }

  private recordSample(elapsedMs: number): void {
    if (!this.currentPointer || !this.shapePrototype) return
    const shape = moveShapeTo(this.shapePrototype, this.currentPointer.x, this.currentPointer.y)
    this.timeline.addKeyframe(elapsedMs, [{ sourceId: this.sourceId, shape }])
    if (this.samples[this.samples.length - 1]?.t === elapsedMs) this.samples.pop()
    this.samples.push({ t: elapsedMs, x: this.currentPointer.x, y: this.currentPointer.y })
  }
}
