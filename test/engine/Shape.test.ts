import { describe, expect, it } from "vitest"
import { createShape, createSaucer, createTriangle } from "../../src/engine/shape/Shape.js"

describe("shape presets", () => {
  it("createSaucer produces a closed polygon spanning the given bounds", () => {
    const shape = createSaucer({ x: 0, y: 0, width: 40, height: 20 }, "#fff")
    expect(shape.kind).toBe("polygon")
    expect(shape.points.length).toBeGreaterThanOrEqual(6)
    const xs = shape.points.map(p => p.x)
    const ys = shape.points.map(p => p.y)
    expect(Math.min(...xs)).toBe(0)
    expect(Math.max(...xs)).toBe(40)
    expect(Math.min(...ys)).toBe(0)
    expect(Math.max(...ys)).toBe(20)
  })

  it("createTriangle produces a 3-point polygon", () => {
    const shape = createTriangle({ x: 0, y: 0, width: 30, height: 10 }, "#fff")
    expect(shape.kind).toBe("polygon")
    expect(shape.points).toHaveLength(3)
  })

  it("createShape applies the requested appearance on top of the preset geometry", () => {
    const shape = createShape(
      { x: 5, y: 5, width: 10, height: 10 },
      { presetId: "triangle", color: "#ff0000", transparency: 0.4, haloScale: 2 }
    )
    expect(shape.kind).toBe("polygon")
    expect(shape.color).toBe("#ff0000")
    expect(shape.transparency).toBe(0.4)
    expect(shape.haloScale).toBe(2)
  })
})
