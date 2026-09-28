import { describe, expect, it } from "vitest"
import { KeyframeCompletion } from "../../../src/engine/model/KeyframeCompletion.js"
import type { Keyframe } from "../../../src/engine/model/Keyframe.js"
import { Timeline } from "../../../src/engine/model/Timeline.js"
import type { PolygonShape } from "../../../src/engine/shape/Shape.js"

/** Keyframes as a hand-written file states them: partial shapes, cast because the model's type
 * describes what loading produces, not what a person types. */
function partial(keyframes: unknown): Keyframe[] {
  return keyframes as Keyframe[]
}

describe("KeyframeCompletion", () => {
  it("holds every field a later keyframe leaves out", () => {
    const [, second] = KeyframeCompletion.complete(partial([
      {
        t: 0, shapes: [{
          sourceId: "a",
          shape: {
            kind: "polygon", bounds: { x: 10, y: 20, width: 30, height: 4 }, points: [{ x: 0, y: 0 }, { x: 30, y: 4 }],
            color: "#fff", angle: 0.1, transparency: 0.2, haloScale: 0.5, brightness: 0.3, selected: false,
            angular: { widthDeg: 8.5, heightDeg: 0.5 }, aim: { azimuthDeg: 353.6, altitudeDeg: 0.6 }
          }
        }]
      },
      { t: 1000, shapes: [{ sourceId: "a", shape: { aim: { azimuthDeg: 353.6, altitudeDeg: 1.8 } } }] }
    ]))
    const shape = second.shapes[0].shape as PolygonShape
    expect(shape.aim).toEqual({ azimuthDeg: 353.6, altitudeDeg: 1.8 })
    expect(shape.points).toEqual([{ x: 0, y: 0 }, { x: 30, y: 4 }])
    expect(shape.haloScale).toBe(0.5)
    expect(shape.brightness).toBe(0.3)
    expect(shape.angular).toEqual({ widthDeg: 8.5, heightDeg: 0.5 })
    expect(shape.angle).toBe(0.1)
  })

  it("does not hold a direction across a box restated in pixels", () => {
    const [, second] = KeyframeCompletion.complete(partial([
      { t: 0, shapes: [{ sourceId: "a", shape: { kind: "oval", bounds: { x: 0, y: 0, width: 4, height: 4 }, aim: { azimuthDeg: 10, altitudeDeg: 5 }, angular: { widthDeg: 1, heightDeg: 1 } } }] },
      { t: 1000, shapes: [{ sourceId: "a", shape: { bounds: { x: 100, y: 50, width: 4, height: 4 } } }] }
    ]))
    expect(second.shapes[0].shape.aim).toBeUndefined()
    expect(second.shapes[0].shape.angular).toBeUndefined()
    expect(second.shapes[0].shape.bounds.x).toBe(100)
  })

  it("gives a first appearance values that assert nothing, and a polygon its box's corners", () => {
    const [first] = KeyframeCompletion.complete(partial([
      { t: 0, shapes: [{ sourceId: "a", shape: { kind: "polygon", angular: { widthDeg: 2, heightDeg: 1 }, aim: { azimuthDeg: 0, altitudeDeg: 10 } } }] }
    ]))
    const shape = first.shapes[0].shape as PolygonShape
    expect(shape.transparency).toBe(0)
    expect(shape.haloScale).toBe(0)
    expect(shape.angle).toBe(0)
    expect(shape.points).toHaveLength(4)
  })

  it("completes from the earlier keyframe even when the file lists them out of order", () => {
    const completed = KeyframeCompletion.complete(partial([
      { t: 1000, shapes: [{ sourceId: "a", shape: { transparency: 0.5 } }] },
      { t: 0, shapes: [{ sourceId: "a", shape: { kind: "oval", color: "#abc", haloScale: 2 } }] }
    ]))
    expect(completed.map(k => k.t)).toEqual([0, 1000])
    expect(completed[1].shapes[0].shape.color).toBe("#abc")
    expect(completed[1].shapes[0].shape.haloScale).toBe(2)
  })

  it("lets a timeline load a polygon keyframe that left its outline out", () => {
    const timeline = Timeline.fromJSON({
      keyframes: partial([
        { t: 0, shapes: [{ sourceId: "a", shape: { kind: "polygon", bounds: { x: 0, y: 0, width: 10, height: 2 }, points: [{ x: 0, y: 2 }, { x: 5, y: 0 }, { x: 10, y: 2 }] } }] },
        { t: 1000, shapes: [{ sourceId: "a", shape: { angle: 0.2 } }] }
      ])
    })
    const halfway = timeline.getInterpolatedShapeAt(500, "a") as PolygonShape
    expect(halfway.points).toHaveLength(3)
    expect(halfway.angle).toBeCloseTo(0.1)
    expect(Number.isNaN(halfway.haloScale)).toBe(false)
  })
})
