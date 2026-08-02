import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { Timeline } from "../../src/engine/model/Timeline.js"
import { Recorder } from "../../src/engine/record/Recorder.js"
import { IntervalSamplingClock } from "../../src/engine/record/SamplingClock.js"
import { createOval } from "../../src/engine/shape/Shape.js"

describe("Recorder", () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it("records the latest pointer position at each sampling tick", () => {
    const timeline = new Timeline()
    const recorder = new Recorder(timeline, new IntervalSamplingClock(100))
    recorder.start("ufo-1", createOval({ x: 0, y: 0, width: 20, height: 20 }))

    recorder.onPointerMove(10, 10)
    vi.advanceTimersByTime(100)
    recorder.onPointerMove(50, 60)
    vi.advanceTimersByTime(100)

    recorder.stop()

    expect(timeline.allKeyframes).toHaveLength(2)
    const [first, second] = timeline.allKeyframes
    expect(first.shapes[0].shape.bounds).toEqual({ x: 0, y: 0, width: 20, height: 20 })
    expect(second.shapes[0].shape.bounds).toEqual({ x: 40, y: 50, width: 20, height: 20 })
  })

  it("does not record before any pointer position is known", () => {
    const timeline = new Timeline()
    const recorder = new Recorder(timeline, new IntervalSamplingClock(100))
    recorder.start("ufo-1", createOval({ x: 0, y: 0, width: 20, height: 20 }))

    vi.advanceTimersByTime(100)

    expect(timeline.allKeyframes).toHaveLength(0)
    recorder.stop()
  })

  it("stops sampling once stop() is called", () => {
    const timeline = new Timeline()
    const recorder = new Recorder(timeline, new IntervalSamplingClock(100))
    recorder.start("ufo-1", createOval({ x: 0, y: 0, width: 20, height: 20 }))
    recorder.onPointerMove(5, 5)
    vi.advanceTimersByTime(100)
    recorder.stop()
    vi.advanceTimersByTime(500)

    expect(timeline.allKeyframes).toHaveLength(1)
  })
})
