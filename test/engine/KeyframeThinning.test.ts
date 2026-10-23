import { describe, expect, it } from "vitest"
import { KeyframeCompletion } from "../../src/engine/model/KeyframeCompletion.js"
import type { Keyframe } from "../../src/engine/model/Keyframe.js"

describe("KeyframeCompletion.thin", () => {
  // A seeded walk of shapes changing, so that a failure is the same failure each time.
  let seed = 3
  const random = (n: number) => {
    seed = (seed * 1103515245 + 12345) % 2147483648
    return seed % n
  }
  const outline = (n: number) => Array.from({ length: n }, (_, i) => ({ x: i, y: (i * 7) % 5 }))

  it("gives back, once completed, the very keyframes it was given, over many shapes changing in every way", () => {
    for (let round = 0; round < 50; round++) {
      const sparse: unknown[] = []
      for (let i = 0; i < 30; i++) {
        const shapes = ["a", "b", "c"].filter(() => i === 0 || random(4) > 0).map(sourceId => {
          if (i === 0) {
            return { sourceId, shape: { kind: sourceId === "a" ? "oval" : "polygon", bounds: { x: 1, y: 2, width: 3, height: 4 }, color: "#ffffff", angle: 0,
              transparency: 0, haloScale: 1, selected: false, aim: { azimuthDeg: 10, altitudeDeg: 20 }, angular: { widthDeg: 1, heightDeg: 1 },
              ...(sourceId === "a" ? {} : { points: outline(5 + random(20)) }) } }
          }
          const shape: Record<string, unknown> = {}
          if (random(2)) shape.aim = { azimuthDeg: random(360), altitudeDeg: random(90) }
          if (random(3) === 0) shape.angle = random(10) / 10
          if (random(4) === 0) shape.bounds = { x: random(100), y: random(100), width: 1 + random(10), height: 1 + random(10) }
          if (random(5) === 0) shape.color = random(2) ? "#ff0000" : "#00ff00"
          if (random(6) === 0 && sourceId !== "a") shape.points = outline(3 + random(10))
          if (random(7) === 0) shape.angular = { widthDeg: random(5), heightDeg: random(5) }
          return { sourceId, shape }
        })
        sparse.push({ t: i * 25, shapes })
      }
      const whole = KeyframeCompletion.complete(sparse as Keyframe[])
      expect(KeyframeCompletion.complete(KeyframeCompletion.thin(whole) as Keyframe[])).toEqual(whole)
    }
  })

  it("writes an outline once, and a keyframe that changes nothing as nothing", () => {
    const whole = KeyframeCompletion.complete([
      { t: 0, shapes: [{ sourceId: "p", shape: { kind: "polygon", bounds: { x: 0, y: 0, width: 10, height: 10 }, points: outline(100) } }] },
      { t: 100, shapes: [{ sourceId: "p", shape: { aim: { azimuthDeg: 5, altitudeDeg: 5 } } }] },
      { t: 200, shapes: [{ sourceId: "p", shape: {} }] }
    ] as unknown as Keyframe[])
    const thin = KeyframeCompletion.thin(whole)
    expect(thin[1].shapes[0].shape).toEqual({ aim: { azimuthDeg: 5, altitudeDeg: 5 } })
    expect(thin[2].shapes[0].shape).toEqual({})
  })

  it("restates the direction and the angular size with a box restated, which completing would drop otherwise", () => {
    const whole = KeyframeCompletion.complete([
      { t: 0, shapes: [{ sourceId: "o", shape: { kind: "oval", bounds: { x: 0, y: 0, width: 10, height: 10 }, aim: { azimuthDeg: 1, altitudeDeg: 2 }, angular: { widthDeg: 1, heightDeg: 1 } } }] },
      { t: 100, shapes: [{ sourceId: "o", shape: { bounds: { x: 5, y: 0, width: 10, height: 10 }, aim: { azimuthDeg: 1, altitudeDeg: 2 }, angular: { widthDeg: 1, heightDeg: 1 } } }] }
    ] as unknown as Keyframe[])
    const thin = KeyframeCompletion.thin(whole)
    expect(Object.keys(thin[1].shapes[0].shape).sort()).toEqual(["aim", "angular", "bounds"])
    expect(KeyframeCompletion.complete(thin as Keyframe[])).toEqual(whole)
  })
})
