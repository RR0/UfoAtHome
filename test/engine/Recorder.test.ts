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

  it("two recorders sharing one timeline record independent sources without clobbering each other at colliding elapsed times", () => {
    const timeline = new Timeline()

    const first = new Recorder(timeline, new IntervalSamplingClock(100))
    first.start("ufo-1", createOval({ x: 0, y: 0, width: 20, height: 20 }))
    first.onPointerMove(10, 10)
    vi.advanceTimersByTime(100) // ufo-1 keyframe at t=100
    first.stop()

    // A second, separate take — its own elapsed clock also starts at 0, so its sampled tick
    // lands on the exact same t=100 as the first recorder's keyframe above.
    const second = new Recorder(timeline, new IntervalSamplingClock(100))
    second.start("ufo-2", createOval({ x: 0, y: 0, width: 20, height: 20 }))
    second.onPointerMove(90, 90)
    vi.advanceTimersByTime(100) // ufo-2 keyframe also at t=100
    second.stop()

    expect(timeline.getShapeAt(100, "ufo-1")?.bounds).toEqual({ x: 0, y: 0, width: 20, height: 20 })
    expect(timeline.getShapeAt(100, "ufo-2")?.bounds).toEqual({ x: 80, y: 80, width: 20, height: 20 })
  })
})

describe("Recorder thinning", () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  function record(positions: Array<[number, number]>): Timeline {
    const timeline = new Timeline()
    const recorder = new Recorder(timeline, new IntervalSamplingClock(100))
    recorder.start("ufo-1", createOval({ x: 0, y: 0, width: 20, height: 20 }))
    for (const [x, y] of positions) {
      recorder.onPointerMove(x, y)
      vi.advanceTimersByTime(100)
    }
    recorder.stop()
    return timeline
  }

  it("keeps only the ends of a straight move at constant speed", () => {
    const timeline = record([[10, 10], [20, 10], [30, 10], [40, 10], [50, 10]])
    expect(timeline.allKeyframes.map(k => k.t)).toEqual([100, 500])
  })

  it("keeps the turn of a path", () => {
    const timeline = record([[10, 10], [20, 10], [30, 10], [30, 20], [30, 30]])
    expect(timeline.allKeyframes.map(k => k.t)).toEqual([100, 300, 500])
  })

  it("keeps a pause on a straight line, which the timing alone shows", () => {
    const timeline = record([[10, 10], [20, 10], [20, 10], [20, 10], [30, 10]])
    expect(timeline.allKeyframes.map(k => k.t)).toEqual([100, 200, 400, 500])
  })

  it("plays back within a pixel of every sample it dropped", () => {
    const positions: Array<[number, number]> = Array.from({ length: 40 }, (_, i) => [100 + 80 * Math.cos(i / 6), 100 + 50 * Math.sin(i / 6)])
    const timeline = record(positions)
    expect(timeline.allKeyframes.length).toBeLessThan(positions.length)
    positions.forEach(([x, y], i) => {
      const shape = timeline.getInterpolatedShapeAt((i + 1) * 100, "ufo-1")!
      expect(Math.hypot(shape.bounds.x + 10 - x, shape.bounds.y + 10 - y)).toBeLessThanOrEqual(1)
    })
  })

  it("leaves the other sources' keyframes alone", () => {
    const timeline = new Timeline()
    timeline.addKeyframe(200, [{ sourceId: "ufo-2", shape: createOval({ x: 0, y: 0, width: 5, height: 5 }) }])
    const recorder = new Recorder(timeline, new IntervalSamplingClock(100))
    recorder.start("ufo-1", createOval({ x: 0, y: 0, width: 20, height: 20 }))
    for (const x of [10, 20, 30]) {
      recorder.onPointerMove(x, 10)
      vi.advanceTimersByTime(100)
    }
    recorder.stop()
    expect(timeline.allKeyframes.map(k => k.t)).toEqual([100, 200, 300])
    expect(timeline.getKeyframeAt(200)!.shapes.map(s => s.sourceId)).toEqual(["ufo-2"])
  })
})
