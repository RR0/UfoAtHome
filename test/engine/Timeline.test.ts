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

  it("hitTest finds a shape containing the point at that instant", () => {
    const timeline = new Timeline()
    timeline.addKeyframe(0, [{ sourceId: "a", shape: createOval({ x: 0, y: 0, width: 10, height: 10 }) }])
    expect(timeline.hitTest(0, 5, 5)?.sourceId).toBe("a")
    expect(timeline.hitTest(0, 50, 50)).toBeUndefined()
  })

  it("reports duration and sourceIds", () => {
    const timeline = new Timeline()
    timeline.addKeyframe(0, [{ sourceId: "a", shape: shapeAt(0) }])
    timeline.addKeyframe(300, [{ sourceId: "b", shape: shapeAt(1) }])
    expect(timeline.duration).toBe(300)
    expect(timeline.sourceIds.sort()).toEqual(["a", "b"])
  })

  it("round-trips through toJSON/fromJSON", () => {
    const timeline = new Timeline()
    timeline.addKeyframe(0, [{ sourceId: "a", shape: shapeAt(0) }])
    timeline.addKeyframe(100, [{ sourceId: "a", shape: shapeAt(1) }])
    const restored = Timeline.fromJSON(timeline.toJSON())
    expect(restored.allKeyframes).toEqual(timeline.allKeyframes)
  })
})
