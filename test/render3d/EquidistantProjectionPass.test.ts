import { describe, expect, it } from "vitest"
import { EquidistantProjectionPass } from "../../src/render3d/EquidistantProjectionPass.js"

/** directionFor as a pure function of the pass's own aspect, for the round trip below. */
function directionFor(ndcX: number, ndcY: number, fovDeg: number, aspect: number) {
  const halfFovRad = ((fovDeg / 2) * Math.PI) / 180
  const ax = ndcX * aspect * halfFovRad
  const ay = ndcY * halfFovRad
  const theta = Math.hypot(ax, ay)
  if (theta < 1e-6) return { x: 0, y: 0, z: -1 }
  const sin = Math.sin(theta)
  return { x: (ax / theta) * sin, y: (ay / theta) * sin, z: -Math.cos(theta) }
}

describe("EquidistantProjectionPass.ndcFor", () => {
  it("is the inverse of directionFor across the frame", () => {
    for (const [ndcX, ndcY] of [[0, 0], [0.5, 0], [0, -0.7], [0.9, 0.9], [-1, 0.3]]) {
      const back = EquidistantProjectionPass.ndcFor(directionFor(ndcX, ndcY, 60, 16 / 9), 60, 16 / 9)
      expect(back).toBeDefined()
      expect(back!.ndcX).toBeCloseTo(ndcX, 9)
      expect(back!.ndcY).toBeCloseTo(ndcY, 9)
    }
  })

  it("puts a direction beyond the frame beyond ±1, and one behind the camera nowhere", () => {
    // 60° up through a 60° field: twice the half-field, so twice the frame's own edge.
    const up = EquidistantProjectionPass.ndcFor({ x: 0, y: Math.sin(Math.PI / 3), z: -Math.cos(Math.PI / 3) }, 60, 16 / 9)
    expect(up!.ndcY).toBeCloseTo(2, 9)
    expect(EquidistantProjectionPass.ndcFor({ x: 0, y: 0, z: 1 }, 60, 16 / 9)).toBeUndefined()
  })
})
