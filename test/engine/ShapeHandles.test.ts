import { describe, expect, it } from "vitest"
import { handlePointsFor, hitTestHandle, resizeShape, rotateShape } from "../../src/engine/shape/ShapeHandles.js"
import { createOval, createPolygon } from "../../src/engine/shape/Shape.js"

describe("handlePointsFor", () => {
  it("computes the 9 handle positions at angle 0 directly from bounds", () => {
    const shape = createOval({ x: 0, y: 0, width: 100, height: 50 })
    const points = handlePointsFor(shape)

    expect(points.nw).toEqual({ x: 0, y: 0 })
    expect(points.n).toEqual({ x: 50, y: 0 })
    expect(points.ne).toEqual({ x: 100, y: 0 })
    expect(points.e).toEqual({ x: 100, y: 25 })
    expect(points.se).toEqual({ x: 100, y: 50 })
    expect(points.s).toEqual({ x: 50, y: 50 })
    expect(points.sw).toEqual({ x: 0, y: 50 })
    expect(points.w).toEqual({ x: 0, y: 25 })
    expect(points.rotate).toEqual({ x: 50, y: -24 })
  })

  it("rotates handle positions around the shape's center at a non-zero angle", () => {
    const shape = { ...createOval({ x: 0, y: 0, width: 100, height: 50 }), angle: Math.PI / 2 }
    const points = handlePointsFor(shape)

    // A 90deg rotation around center (50,25): "rotate" (50,-24, i.e. 24px above center's y)
    // swings to 90deg clockwise from center, landing 24px to the right of center at the
    // center's own height; "e" (100,25, 50px right of center) swings to 50px below center.
    expect(points.rotate.x).toBeCloseTo(99)
    expect(points.rotate.y).toBeCloseTo(25)
    expect(points.e.x).toBeCloseTo(50)
    expect(points.e.y).toBeCloseTo(75)
  })
})

describe("hitTestHandle", () => {
  it("hits each of the 9 handles at angle 0, within tolerance", () => {
    const shape = createOval({ x: 0, y: 0, width: 100, height: 50 })
    const points = handlePointsFor(shape)
    for (const id of Object.keys(points) as (keyof typeof points)[]) {
      expect(hitTestHandle(shape, points[id])).toBe(id)
    }
  })

  it("hits the correct (rotated) handle position at a non-zero angle", () => {
    const shape = { ...createOval({ x: 0, y: 0, width: 100, height: 50 }), angle: Math.PI / 2 }
    const points = handlePointsFor(shape)
    expect(hitTestHandle(shape, points.rotate)).toBe("rotate")
    expect(hitTestHandle(shape, points.e)).toBe("e")
  })

  it("misses just outside tolerance and inside the shape's interior", () => {
    const shape = createOval({ x: 0, y: 0, width: 100, height: 50 })
    expect(hitTestHandle(shape, { x: 0, y: 9 })).toBeUndefined() // 9px from nw (0,0) — just past tolerance 8
    expect(hitTestHandle(shape, { x: 50, y: 25 })).toBeUndefined() // shape center, not a handle
  })
})

describe("resizeShape", () => {
  const bounds = { x: 100, y: 100, width: 40, height: 20 }

  it("drags each handle to move only the expected edge(s), anchoring the opposite side", () => {
    const shape = createOval(bounds)
    expect(resizeShape(shape, "e", { x: 180, y: 110 }).bounds).toEqual({ x: 100, y: 100, width: 80, height: 20 })
    expect(resizeShape(shape, "w", { x: 60, y: 110 }).bounds).toEqual({ x: 60, y: 100, width: 80, height: 20 })
    expect(resizeShape(shape, "s", { x: 120, y: 160 }).bounds).toEqual({ x: 100, y: 100, width: 40, height: 60 })
    expect(resizeShape(shape, "n", { x: 120, y: 60 }).bounds).toEqual({ x: 100, y: 60, width: 40, height: 60 })
    expect(resizeShape(shape, "se", { x: 180, y: 160 }).bounds).toEqual({ x: 100, y: 100, width: 80, height: 60 })
    expect(resizeShape(shape, "nw", { x: 60, y: 60 }).bounds).toEqual({ x: 60, y: 60, width: 80, height: 60 })
  })

  it("resizes correctly on an already-rotated shape by working in its local (unrotated) frame", () => {
    // Rotated 90deg, so "e" (right edge) now points straight down from center (120,110) in
    // canvas space. Dragging it further down (canvas point (120,150), 40px below center)
    // should extend the (local/unrotated) right edge by 40px, not move top/left/bottom.
    const rotated = { ...createOval(bounds), angle: Math.PI / 2 }
    const resized = resizeShape(rotated, "e", { x: 120, y: 150 })
    expect(resized.bounds).toEqual({ x: 100, y: 100, width: 60, height: 20 })
    expect(resized.angle).toBeCloseTo(Math.PI / 2)
  })

  it("clamps to a minimum size instead of inverting when dragged past the opposite edge", () => {
    const shape = createOval(bounds)
    const resized = resizeShape(shape, "e", { x: 50, y: 110 }) // dragged past the left edge
    expect(resized.bounds.width).toBeGreaterThanOrEqual(8)
    expect(resized.bounds.x).toBe(100) // left edge (anchor) unchanged
  })

  it("rescales polygon points proportionally so the outline stays matched to the new bounds", () => {
    const shape = createPolygon(bounds, [
      { x: 0, y: 0 },
      { x: 40, y: 0 },
      { x: 20, y: 20 }
    ])
    const resized = resizeShape(shape, "e", { x: 180, y: 110 }) // width 40 -> 80, i.e. scaleX=2
    expect(resized.kind).toBe("polygon")
    expect((resized as typeof shape).points).toEqual([
      { x: 0, y: 0 },
      { x: 80, y: 0 },
      { x: 40, y: 20 }
    ])
  })

  it("does not accept the rotate handle", () => {
    const shape = createOval(bounds)
    expect(() => resizeShape(shape, "rotate", { x: 0, y: 0 })).toThrow()
  })
})

describe("rotateShape", () => {
  const shape = createOval({ x: 100, y: 100, width: 40, height: 20 }) // center (120,110)

  it("yields angle 0 when the pointer is directly above center (the handle's rest position)", () => {
    expect(rotateShape(shape, { x: 120, y: 40 }).angle).toBeCloseTo(0)
  })

  it("yields the expected angle for the other three cardinal directions", () => {
    expect(rotateShape(shape, { x: 190, y: 110 }).angle).toBeCloseTo(Math.PI / 2) // right of center
    expect(rotateShape(shape, { x: 120, y: 180 }).angle).toBeCloseTo(Math.PI) // below center
    // Left of center: atan2(0,-70)=PI, +PI/2 = 3PI/2 — equivalent to -PI/2 mod 2*PI, but
    // rotateShape doesn't normalize (Shape.angle is just a canvas rotation parameter, which
    // is periodic regardless), so assert the actual unnormalized value.
    expect(rotateShape(shape, { x: 50, y: 110 }).angle).toBeCloseTo((3 * Math.PI) / 2)
  })

  it("is a direct function of pointer position, independent of the shape's prior angle", () => {
    const alreadyRotated = { ...shape, angle: Math.PI / 3 }
    expect(rotateShape(alreadyRotated, { x: 120, y: 40 }).angle).toBeCloseTo(0)
  })
})
