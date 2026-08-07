import { describe, expect, it } from "vitest"
import { createCustomPolygon, createOval, createPolygon, createShape, lerpShape } from "../../src/engine/shape/Shape.js"

describe("shape presets", () => {
  it("createCustomPolygon produces an editable 4-point quad spanning the given bounds", () => {
    const shape = createCustomPolygon({ x: 0, y: 0, width: 40, height: 20 }, "#fff")
    expect(shape.kind).toBe("polygon")
    expect(shape.points).toEqual([
      { x: 0, y: 0 },
      { x: 40, y: 0 },
      { x: 40, y: 20 },
      { x: 0, y: 20 }
    ])
  })

  it("createShape applies the requested appearance on top of the preset geometry", () => {
    const shape = createShape(
      { x: 5, y: 5, width: 10, height: 10 },
      { presetId: "polygon", color: "#ff0000", transparency: 0.4, haloScale: 2 }
    )
    expect(shape.kind).toBe("polygon")
    expect(shape.color).toBe("#ff0000")
    expect(shape.transparency).toBe(0.4)
    expect(shape.haloScale).toBe(2)
  })
})

describe("lerpShape", () => {
  it("blends bounds/angle/transparency/haloScale linearly", () => {
    const from = { ...createOval({ x: 0, y: 0, width: 10, height: 10 }), angle: 0, transparency: 0, haloScale: 0 }
    const to = { ...createOval({ x: 10, y: 20, width: 20, height: 30 }), angle: Math.PI, transparency: 1, haloScale: 2 }

    const mid = lerpShape(from, to, 0.5)

    expect(mid.bounds).toEqual({ x: 5, y: 10, width: 15, height: 20 })
    expect(mid.angle).toBeCloseTo(Math.PI / 2)
    expect(mid.transparency).toBeCloseTo(0.5)
    expect(mid.haloScale).toBeCloseTo(1)
  })

  it("blends hex colors channel-by-channel", () => {
    const from = createOval({ x: 0, y: 0, width: 10, height: 10 }, "#ff0000")
    const to = createOval({ x: 10, y: 10, width: 10, height: 10 }, "#0000ff")

    expect(lerpShape(from, to, 0.5).color).toBe("#800080")
  })

  it("falls back to holding from's color when it isn't a #rrggbb hex value", () => {
    const from = createOval({ x: 0, y: 0, width: 10, height: 10 }, "red")
    const to = createOval({ x: 10, y: 10, width: 10, height: 10 }, "#0000ff")

    expect(lerpShape(from, to, 0.5).color).toBe("red")
  })

  it("blends polygon points vertex-by-vertex when both shapes have the same point count", () => {
    const trianglePoints = [
      { x: 0, y: 0 },
      { x: 10, y: 5 },
      { x: 0, y: 10 }
    ]
    const from = createPolygon({ x: 0, y: 0, width: 10, height: 10 }, trianglePoints)
    const to = createPolygon(
      { x: 0, y: 0, width: 20, height: 20 },
      trianglePoints.map(p => ({ x: p.x * 2, y: p.y * 2 }))
    )

    const mid = lerpShape(from, to, 0.5)

    expect(mid.kind).toBe("polygon")
    expect((mid as typeof from).points).toEqual([
      { x: 0, y: 0 },
      { x: 15, y: 7.5 },
      { x: 0, y: 15 }
    ])
  })

  it("holds from's outline when shape kinds differ, still blending shared fields", () => {
    const from = createOval({ x: 0, y: 0, width: 10, height: 10 })
    const to = createPolygon({ x: 0, y: 0, width: 10, height: 10 }, [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 10, y: 10 },
      { x: 0, y: 10 },
      { x: 5, y: 12 },
      { x: 0, y: 10 }
    ])

    const mid = lerpShape(from, to, 0.5)

    expect(mid.kind).toBe("oval")
    expect(mid.bounds).toEqual({ x: 0, y: 0, width: 10, height: 10 })
  })

  it("holds from's outline when polygons have a different point count", () => {
    const from = createPolygon({ x: 0, y: 0, width: 10, height: 10 }, [
      { x: 0, y: 0 },
      { x: 10, y: 5 },
      { x: 0, y: 10 }
    ])
    const to = createPolygon({ x: 0, y: 0, width: 10, height: 10 }, [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 10, y: 10 },
      { x: 0, y: 10 },
      { x: 5, y: 12 },
      { x: 0, y: 10 },
      { x: 2, y: 2 },
      { x: 8, y: 2 }
    ])

    const mid = lerpShape(from, to, 0.5)

    expect(mid.kind).toBe("polygon")
    expect((mid as typeof from).points).toEqual(from.points)
  })
})
