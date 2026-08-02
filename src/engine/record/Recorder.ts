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
 */
export class Recorder {
  private currentPointer: { x: number; y: number } | null = null
  private shapePrototype: Shape | null = null
  private sourceId = ""

  constructor(
    private readonly timeline: Timeline,
    private readonly clock: SamplingClock
  ) {
  }

  start(sourceId: string, shapePrototype: Shape): void {
    this.sourceId = sourceId
    this.shapePrototype = shapePrototype
    this.currentPointer = null
    this.clock.start(elapsedMs => this.recordSample(elapsedMs))
  }

  onPointerMove(x: number, y: number): void {
    this.currentPointer = { x, y }
  }

  stop(): void {
    this.clock.stop()
  }

  private recordSample(elapsedMs: number): void {
    if (!this.currentPointer || !this.shapePrototype) return
    const shape = moveShapeTo(this.shapePrototype, this.currentPointer.x, this.currentPointer.y)
    this.timeline.addKeyframe(elapsedMs, [{ sourceId: this.sourceId, shape }])
  }
}
