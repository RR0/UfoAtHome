import { describe, expect, it } from "vitest"
import { Timeline } from "../../src/engine/model/Timeline.js"
import { createOval } from "../../src/engine/shape/Shape.js"

function shapeAt(x: number): ReturnType<typeof createOval> {
  return createOval({ x, y: 0, width: 10, height: 10 })
}

describe("Timeline", () => {
  it("stores and retrieves an exact keyframe", () => {
    const timeline = new Timeline()
    timeline.addKeyframe(100, [{ sourceId: "a", shape: shapeAt(1) }])
    expect(timeline.getShapeAt(100, "a")?.bounds.x).toBe(1)
    expect(timeline.getShapeAt(200, "a")).toBeUndefined()
  })

  it("keeps keyframes sorted regardless of insertion order", () => {
    const timeline = new Timeline()
    timeline.addKeyframe(200, [{ sourceId: "a", shape: shapeAt(2) }])
    timeline.addKeyframe(0, [{ sourceId: "a", shape: shapeAt(0) }])
    timeline.addKeyframe(100, [{ sourceId: "a", shape: shapeAt(1) }])
    expect(timeline.allKeyframes.map(k => k.t)).toEqual([0, 100, 200])
  })

  it("overwrites a keyframe recorded at the same t", () => {
    const timeline = new Timeline()
    timeline.addKeyframe(100, [{ sourceId: "a", shape: shapeAt(1) }])
    timeline.addKeyframe(100, [{ sourceId: "a", shape: shapeAt(9) }])
    expect(timeline.allKeyframes).toHaveLength(1)
    expect(timeline.getShapeAt(100, "a")?.bounds.x).toBe(9)
  })

  it("getLatestShapeAt holds the last recorded value between keyframes", () => {
    const timeline = new Timeline()
    timeline.addKeyframe(0, [{ sourceId: "a", shape: shapeAt(0) }])
    timeline.addKeyframe(200, [{ sourceId: "a", shape: shapeAt(2) }])
    expect(timeline.getLatestShapeAt(0, "a")?.bounds.x).toBe(0)
    expect(timeline.getLatestShapeAt(150, "a")?.bounds.x).toBe(0)
    expect(timeline.getLatestShapeAt(200, "a")?.bounds.x).toBe(2)
    expect(timeline.getLatestShapeAt(1000, "a")?.bounds.x).toBe(2)
  })

  it("getLatestShapeAt returns undefined before the source's first keyframe", () => {
    const timeline = new Timeline()
    timeline.addKeyframe(200, [{ sourceId: "a", shape: shapeAt(2) }])
    expect(timeline.getLatestShapeAt(100, "a")).toBeUndefined()
  })

  it("addKeyframe at an existing t merges by sourceId instead of replacing the whole keyframe", () => {
    const timeline = new Timeline()
    timeline.addKeyframe(100, [
      { sourceId: "a", shape: shapeAt(1) },
      { sourceId: "b", shape: shapeAt(2) }
    ])
    timeline.addKeyframe(100, [{ sourceId: "a", shape: shapeAt(9) }])

    expect(timeline.getShapeAt(100, "a")?.bounds.x).toBe(9)
    expect(timeline.getShapeAt(100, "b")?.bounds.x).toBe(2)
  })

  it("getInterpolatedShapeAt blends between the surrounding keyframes", () => {
    const timeline = new Timeline()
    timeline.addKeyframe(0, [{ sourceId: "a", shape: shapeAt(0) }])
    timeline.addKeyframe(200, [{ sourceId: "a", shape: shapeAt(2) }])
    expect(timeline.getInterpolatedShapeAt(0, "a")?.bounds.x).toBe(0)
    expect(timeline.getInterpolatedShapeAt(50, "a")?.bounds.x).toBeCloseTo(0.5)
    expect(timeline.getInterpolatedShapeAt(150, "a")?.bounds.x).toBeCloseTo(1.5)
    expect(timeline.getInterpolatedShapeAt(200, "a")?.bounds.x).toBe(2)
  })

  it("getInterpolatedShapeAt holds the nearest value outside the source's recorded range", () => {
    const timeline = new Timeline()
    timeline.addKeyframe(100, [{ sourceId: "a", shape: shapeAt(1) }])
    timeline.addKeyframe(200, [{ sourceId: "a", shape: shapeAt(2) }])
    expect(timeline.getInterpolatedShapeAt(0, "a")?.bounds.x).toBe(1)
    expect(timeline.getInterpolatedShapeAt(1000, "a")?.bounds.x).toBe(2)
  })

  it("getInterpolatedShapeAt interpolates each source independently on its own keyframe schedule", () => {
    const timeline = new Timeline()
    // "a" has keyframes spanning the full timeline; "b" only has one, recorded partway through.
    timeline.addKeyframe(0, [{ sourceId: "a", shape: shapeAt(0) }])
    timeline.addKeyframe(50, [{ sourceId: "b", shape: shapeAt(5) }])
    timeline.addKeyframe(100, [{ sourceId: "a", shape: shapeAt(10) }])

    expect(timeline.getInterpolatedShapeAt(50, "a")?.bounds.x).toBeCloseTo(5)
    // "b" has no later keyframe of its own, so it holds instead of interpolating toward "a"'s.
    expect(timeline.getInterpolatedShapeAt(75, "b")?.bounds.x).toBe(5)
    expect(timeline.getInterpolatedShapeAt(75, "a")?.bounds.x).toBeCloseTo(7.5)
  })

  it("getInterpolatedShapeAt returns undefined when the source has no keyframes", () => {
    const timeline = new Timeline()
    timeline.addKeyframe(0, [{ sourceId: "b", shape: shapeAt(0) }])
    expect(timeline.getInterpolatedShapeAt(0, "a")).toBeUndefined()
  })

  it("hitTest finds a shape containing the point at that instant", () => {
    const timeline = new Timeline()
    timeline.addKeyframe(0, [{ sourceId: "a", shape: createOval({ x: 0, y: 0, width: 10, height: 10 }) }])
    expect(timeline.hitTest(0, 5, 5)?.sourceId).toBe("a")
    expect(timeline.hitTest(0, 50, 50)).toBeUndefined()
  })

  it("hitTest works against an interpolated instant, not just a literal keyframe", () => {
    const timeline = new Timeline()
    timeline.addKeyframe(0, [{ sourceId: "a", shape: createOval({ x: 0, y: 0, width: 10, height: 10 }) }])
    timeline.addKeyframe(100, [{ sourceId: "a", shape: createOval({ x: 100, y: 0, width: 10, height: 10 }) }])
    // At t=50 the shape is interpolated to x=50 — no literal keyframe exists there.
    expect(timeline.hitTest(50, 55, 5)?.sourceId).toBe("a")
    expect(timeline.hitTest(50, 5, 5)).toBeUndefined()
  })

  it("hitTest picks the topmost (most-recently-added) source when shapes overlap", () => {
    const timeline = new Timeline()
    timeline.addKeyframe(0, [
      { sourceId: "a", shape: createOval({ x: 0, y: 0, width: 20, height: 20 }) },
      { sourceId: "b", shape: createOval({ x: 5, y: 5, width: 20, height: 20 }) }
    ])
    expect(timeline.hitTest(0, 10, 10)?.sourceId).toBe("b")
  })

  it("reports duration and sourceIds", () => {
    const timeline = new Timeline()
    timeline.addKeyframe(0, [{ sourceId: "a", shape: shapeAt(0) }])
    timeline.addKeyframe(300, [{ sourceId: "b", shape: shapeAt(1) }])
    expect(timeline.duration).toBe(300)
    expect(timeline.sourceIds.sort()).toEqual(["a", "b"])
  })

  it("removeSource strips only that source, leaving others' data untouched", () => {
    const timeline = new Timeline()
    timeline.addKeyframe(0, [{ sourceId: "a", shape: shapeAt(0) }, { sourceId: "b", shape: shapeAt(10) }])
    timeline.addKeyframe(100, [{ sourceId: "a", shape: shapeAt(1) }])

    timeline.removeSource("a")

    expect(timeline.sourceIds).toEqual(["b"])
    expect(timeline.getShapeAt(0, "b")?.bounds.x).toBe(10)
    expect(timeline.getShapeAt(0, "a")).toBeUndefined()
    expect(timeline.getShapeAt(100, "a")).toBeUndefined()
  })

  it("removeSource drops a keyframe entirely once it has no shapes left", () => {
    const timeline = new Timeline()
    timeline.addKeyframe(0, [{ sourceId: "a", shape: shapeAt(0) }])
    timeline.addKeyframe(100, [{ sourceId: "a", shape: shapeAt(1) }, { sourceId: "b", shape: shapeAt(2) }])

    timeline.removeSource("a")

    expect(timeline.allKeyframes.map(k => k.t)).toEqual([100]) // the now-empty t=0 keyframe is gone
  })

  it("removeSource on an unknown source id is a no-op", () => {
    const timeline = new Timeline()
    timeline.addKeyframe(0, [{ sourceId: "a", shape: shapeAt(0) }])

    timeline.removeSource("nonexistent")

    expect(timeline.sourceIds).toEqual(["a"])
    expect(timeline.allKeyframes).toHaveLength(1)
  })

  it("round-trips through toJSON/fromJSON", () => {
    const timeline = new Timeline()
    timeline.addKeyframe(0, [{ sourceId: "a", shape: shapeAt(0) }])
    timeline.addKeyframe(100, [{ sourceId: "a", shape: shapeAt(1) }])
    const restored = Timeline.fromJSON(timeline.toJSON())
    expect(restored.allKeyframes).toEqual(timeline.allKeyframes)
  })
})
