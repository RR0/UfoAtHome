import { expect, it } from "vitest"
import { Vector3 } from "three"
import { cloudDragDelta } from "../../src/render3d/CloudManipulation.js"

it("preserves the grab offset and moves in a fixed viewing plane", () => {
  const start = new Vector3(0, 0, -1), center = { x: 200, y: 100, z: -5000 }
  expect(cloudDragDelta(start, start, center)).toEqual({ x: 0, y: 0, z: 0 })
  const delta = cloudDragDelta(start, new Vector3(0.1, 0.2, -1).normalize(), center)!
  expect(delta.x).toBeCloseTo(500)
  expect(delta.y).toBeCloseTo(1000)
  expect(delta.z).toBeCloseTo(0)
})
it("rejects rays behind or nearly parallel to the manipulation plane", () => {
  expect(cloudDragDelta(new Vector3(0, 0, -1), new Vector3(1, 0, 0), { x: 0, y: 0, z: -1000 })).toBeUndefined()
})
