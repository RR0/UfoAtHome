import { describe, expect, it } from "vitest"
import { ShapeHandles, ShapeGroup, RESIZE_HANDLE_IDS } from "../../src/engine/shape/ShapeHandles.js"
import type { HandleId } from "../../src/engine/shape/ShapeHandles.js"
import { createOval, createPolygon } from "../../src/engine/shape/Shape.js"

describe("handlePointsFor", () => {
  it("computes the 9 handle positions at angle 0 directly from bounds", () => {
    const shape = createOval({ x: 0, y: 0, width: 100, height: 50 })
    const points = ShapeHandles.handlePointsFor(shape)

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
    const points = ShapeHandles.handlePointsFor(shape)

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
    const points = ShapeHandles.handlePointsFor(shape)
    for (const id of Object.keys(points) as (keyof typeof points)[]) {
      expect(ShapeHandles.hitTestHandle(shape, points[id])).toBe(id)
    }
  })

  it("hits the correct (rotated) handle position at a non-zero angle", () => {
    const shape = { ...createOval({ x: 0, y: 0, width: 100, height: 50 }), angle: Math.PI / 2 }
    const points = ShapeHandles.handlePointsFor(shape)
    expect(ShapeHandles.hitTestHandle(shape, points.rotate)).toBe("rotate")
    expect(ShapeHandles.hitTestHandle(shape, points.e)).toBe("e")
  })

  it("misses just outside tolerance and inside the shape's interior", () => {
    const shape = createOval({ x: 0, y: 0, width: 100, height: 50 })
    expect(ShapeHandles.hitTestHandle(shape, { x: 0, y: 9 })).toBeUndefined() // 9px from nw (0,0) — just past tolerance 8
    expect(ShapeHandles.hitTestHandle(shape, { x: 50, y: 25 })).toBeUndefined() // shape center, not a handle
  })
})

describe("resizeShape", () => {
  const bounds = { x: 100, y: 100, width: 40, height: 20 }

  it("drags each handle to move only the expected edge(s), anchoring the opposite side", () => {
    const shape = createOval(bounds)
    expect(ShapeHandles.resizeShape(shape, "e", { x: 180, y: 110 }).bounds).toEqual({ x: 100, y: 100, width: 80, height: 20 })
    expect(ShapeHandles.resizeShape(shape, "w", { x: 60, y: 110 }).bounds).toEqual({ x: 60, y: 100, width: 80, height: 20 })
    expect(ShapeHandles.resizeShape(shape, "s", { x: 120, y: 160 }).bounds).toEqual({ x: 100, y: 100, width: 40, height: 60 })
    expect(ShapeHandles.resizeShape(shape, "n", { x: 120, y: 60 }).bounds).toEqual({ x: 100, y: 60, width: 40, height: 60 })
    expect(ShapeHandles.resizeShape(shape, "se", { x: 180, y: 160 }).bounds).toEqual({ x: 100, y: 100, width: 80, height: 60 })
    expect(ShapeHandles.resizeShape(shape, "nw", { x: 60, y: 60 }).bounds).toEqual({ x: 60, y: 60, width: 80, height: 60 })
  })

  it("resizes correctly on an already-rotated shape by working in its local (unrotated) frame", () => {
    // Rotated 90deg, so "e" (right edge) now points straight down from center (120,110) in
    // canvas space. Dragging it further down (canvas point (120,150), 40px below center)
    // should extend the (local/unrotated) right edge by 40px, not move top/left/bottom.
    const rotated = { ...createOval(bounds), angle: Math.PI / 2 }
    const resized = ShapeHandles.resizeShape(rotated, "e", { x: 120, y: 150 })
    expect(resized.bounds).toEqual({ x: 100, y: 100, width: 60, height: 20 })
    expect(resized.angle).toBeCloseTo(Math.PI / 2)
  })

  it("clamps to a minimum size instead of inverting when dragged past the opposite edge", () => {
    const shape = createOval(bounds)
    const resized = ShapeHandles.resizeShape(shape, "e", { x: 50, y: 110 }) // dragged past the left edge
    expect(resized.bounds.width).toBeGreaterThanOrEqual(8)
    expect(resized.bounds.x).toBe(100) // left edge (anchor) unchanged
  })

  it("rescales polygon points proportionally so the outline stays matched to the new bounds", () => {
    const shape = createPolygon(bounds, [
      { x: 0, y: 0 },
      { x: 40, y: 0 },
      { x: 20, y: 20 }
    ])
    const resized = ShapeHandles.resizeShape(shape, "e", { x: 180, y: 110 }) // width 40 -> 80, i.e. scaleX=2
    expect(resized.kind).toBe("polygon")
    expect((resized as typeof shape).points).toEqual([
      { x: 0, y: 0 },
      { x: 80, y: 0 },
      { x: 40, y: 20 }
    ])
  })

  it("does not accept the rotate handle", () => {
    const shape = createOval(bounds)
    expect(() => ShapeHandles.resizeShape(shape, "rotate", { x: 0, y: 0 })).toThrow()
  })
})

describe("rotateShape", () => {
  const shape = createOval({ x: 100, y: 100, width: 40, height: 20 }) // center (120,110)

  it("yields angle 0 when the pointer is directly above center (the handle's rest position)", () => {
    expect(ShapeHandles.rotateShape(shape, { x: 120, y: 40 }).angle).toBeCloseTo(0)
  })

  it("yields the expected angle for the other three cardinal directions", () => {
    expect(ShapeHandles.rotateShape(shape, { x: 190, y: 110 }).angle).toBeCloseTo(Math.PI / 2) // right of center
    expect(ShapeHandles.rotateShape(shape, { x: 120, y: 180 }).angle).toBeCloseTo(Math.PI) // below center
    // Left of center: atan2(0,-70)=PI, +PI/2 = 3PI/2 — equivalent to -PI/2 mod 2*PI, but
    // rotateShape doesn't normalize (Shape.angle is just a canvas rotation parameter, which
    // is periodic regardless), so assert the actual unnormalized value.
    expect(ShapeHandles.rotateShape(shape, { x: 50, y: 110 }).angle).toBeCloseTo((3 * Math.PI) / 2)
  })

  it("is a direct function of pointer position, independent of the shape's prior angle", () => {
    const alreadyRotated = { ...shape, angle: Math.PI / 3 }
    expect(ShapeHandles.rotateShape(alreadyRotated, { x: 120, y: 40 }).angle).toBeCloseTo(0)
  })
})

describe("ShapeHandles.groupBoundsFor", () => {
  it("returns the axis-aligned union of several boxes", () => {
    expect(
      ShapeHandles.groupBoundsFor([
        { x: 0, y: 0, width: 10, height: 10 },
        { x: 20, y: 5, width: 10, height: 30 }
      ])
    ).toEqual({ x: 0, y: 0, width: 30, height: 35 })
  })

  it("matches the single box exactly when given only one", () => {
    const bounds = { x: 5, y: 5, width: 40, height: 20 }
    expect(ShapeHandles.groupBoundsFor([bounds])).toEqual(bounds)
  })
})

describe("ShapeGroup", () => {
  it("bounds() reports the union bbox of its members", () => {
    const group = new ShapeGroup([
      { sourceId: "a", shape: createOval({ x: 0, y: 0, width: 10, height: 10 }) },
      { sourceId: "b", shape: createOval({ x: 20, y: 10, width: 10, height: 10 }) }
    ])
    expect(group.bounds()).toEqual({ x: 0, y: 0, width: 30, height: 20 })
  })

  it("scaleTo() scales each member proportionally to the target bbox", () => {
    // Members span x=[0,20] within the from-bbox x=[0,20]; scaling that bbox to twice the width
    // should double each member's own width and x-offset-from-origin.
    const group = new ShapeGroup([
      { sourceId: "a", shape: createOval({ x: 0, y: 0, width: 10, height: 10 }) },
      { sourceId: "b", shape: createOval({ x: 10, y: 0, width: 10, height: 10 }) }
    ])
    const scaled = group.scaleTo({ x: 0, y: 0, width: 40, height: 10 })
    expect(scaled.find(m => m.sourceId === "a")?.shape.bounds).toEqual({ x: 0, y: 0, width: 20, height: 10 })
    expect(scaled.find(m => m.sourceId === "b")?.shape.bounds).toEqual({ x: 20, y: 0, width: 20, height: 10 })
  })

  it("scaleTo() rescales polygon points proportionally, same technique as resizeShape", () => {
    const group = new ShapeGroup([
      { sourceId: "a", shape: createPolygon({ x: 0, y: 0, width: 10, height: 10 }, [{ x: 0, y: 0 }, { x: 10, y: 10 }]) }
    ])
    const scaled = group.scaleTo({ x: 0, y: 0, width: 20, height: 10 })
    const shape = scaled[0].shape as ReturnType<typeof createPolygon>
    expect(shape.points).toEqual([{ x: 0, y: 0 }, { x: 20, y: 10 }])
  })

  it("scaleTo() clamps a shrinking member's size to MIN_SHAPE_SIZE rather than collapsing it", () => {
    const group = new ShapeGroup([
      { sourceId: "a", shape: createOval({ x: 0, y: 0, width: 100, height: 100 }) },
      { sourceId: "b", shape: createOval({ x: 0, y: 0, width: 4, height: 4 }) } // already tiny
    ])
    const scaled = group.scaleTo({ x: 0, y: 0, width: 10, height: 10 }) // shrink the group 10x
    const tiny = scaled.find(m => m.sourceId === "b")!.shape.bounds
    expect(tiny.width).toBeGreaterThanOrEqual(8)
    expect(tiny.height).toBeGreaterThanOrEqual(8)
  })

  it("scaleTo() leaves each member's own angle untouched — group-rotate is out of scope", () => {
    const group = new ShapeGroup([{ sourceId: "a", shape: { ...createOval({ x: 0, y: 0, width: 10, height: 10 }), angle: 1.2 } }])
    const scaled = group.scaleTo({ x: 0, y: 0, width: 20, height: 20 })
    expect(scaled[0].shape.angle).toBeCloseTo(1.2)
  })

  it("resize() drags a shared corner handle and scales both members together", () => {
    const group = new ShapeGroup([
      { sourceId: "a", shape: createOval({ x: 0, y: 0, width: 10, height: 10 }) },
      { sourceId: "b", shape: createOval({ x: 10, y: 0, width: 10, height: 10 }) }
    ])
    // Group bbox is (0,0,20,10); drag "e" out to x=40 -> new bbox width 40, scaleX=2.
    const resized = group.resize("e", { x: 40, y: 5 })
    expect(resized.find(m => m.sourceId === "a")?.shape.bounds).toEqual({ x: 0, y: 0, width: 20, height: 10 })
    expect(resized.find(m => m.sourceId === "b")?.shape.bounds).toEqual({ x: 20, y: 0, width: 20, height: 10 })
  })

  it("rotate() revolves each member around the group's center AND spins its own angle by the same delta", () => {
    // a center (10,10), b center (30,10); group bbox (0,0,40,20), center (20,10).
    const group = new ShapeGroup([
      { sourceId: "a", shape: createOval({ x: 0, y: 0, width: 20, height: 20 }) },
      { sourceId: "b", shape: createOval({ x: 20, y: 0, width: 20, height: 20 }) }
    ])
    // startPointer straight right of center (angle 0); pointer straight above center (angle
    // -PI/2 in screen coords) -> delta = -PI/2, a quarter-turn.
    const rotated = group.rotate({ x: 20, y: 0 }, { x: 30, y: 10 })

    const a = rotated.find(m => m.sourceId === "a")!.shape
    const b = rotated.find(m => m.sourceId === "b")!.shape
    // a's center (10,10) is 10px left of the group center (20,10) -> swings to 10px below it (20,20).
    expect(a.bounds.x).toBeCloseTo(10)
    expect(a.bounds.y).toBeCloseTo(10)
    // b's center (30,10) is 10px right of the group center -> swings to 10px above it (20,0).
    expect(b.bounds.x).toBeCloseTo(10)
    expect(b.bounds.y).toBeCloseTo(-10)
    // Widths/heights untouched — rotate revolves position and spins angle, never scales.
    expect(a.bounds.width).toBe(20)
    expect(a.bounds.height).toBe(20)
    // Each member's own angle advances by the same delta.
    expect(a.angle).toBeCloseTo(-Math.PI / 2)
    expect(b.angle).toBeCloseTo(-Math.PI / 2)
  })

  it("rotate() is a pure delta from startPointer to pointer, independent of members' prior angle", () => {
    const group = new ShapeGroup([{ sourceId: "a", shape: { ...createOval({ x: 0, y: 0, width: 10, height: 10 }), angle: 1.2 } }])
    const rotated = group.rotate({ x: 5, y: -5 }, { x: 15, y: 5 }) // same delta as above (-PI/2)
    expect(rotated[0].shape.angle).toBeCloseTo(1.2 - Math.PI / 2)
  })
})

describe("vertexPointsFor / hitTestVertex", () => {
  it("places vertices at bounds-origin + point, unrotated", () => {
    const shape = createPolygon({ x: 10, y: 20, width: 100, height: 50 }, [
      { x: 0, y: 0 },
      { x: 100, y: 0 },
      { x: 50, y: 50 }
    ])
    const points = ShapeHandles.vertexPointsFor(shape)
    expect(points).toEqual([
      { x: 10, y: 20 },
      { x: 110, y: 20 },
      { x: 60, y: 70 }
    ])
  })

  it("rotates vertex positions around the shape's center at a non-zero angle", () => {
    const shape = {
      ...createPolygon({ x: 0, y: 0, width: 100, height: 50 }, [
        { x: 0, y: 0 },
        { x: 100, y: 0 },
        { x: 50, y: 50 }
      ]),
      angle: Math.PI / 2
    }
    // Center is (50,25); same rotateAround formula the already-verified "e" handle case above
    // uses (x' = cx - dy, y' = cy + dx at angle=PI/2) — the first vertex (0,0), dx=-50/dy=-25,
    // lands at (75,-25).
    const points = ShapeHandles.vertexPointsFor(shape)
    expect(points[0].x).toBeCloseTo(75)
    expect(points[0].y).toBeCloseTo(-25)
  })

  it("hits the nearest vertex within tolerance", () => {
    const shape = createPolygon({ x: 0, y: 0, width: 100, height: 50 }, [
      { x: 0, y: 0 },
      { x: 100, y: 0 },
      { x: 50, y: 50 }
    ])
    expect(ShapeHandles.hitTestVertex(shape, { x: 2, y: 1 })).toBe(0)
    expect(ShapeHandles.hitTestVertex(shape, { x: 99, y: 2 })).toBe(1)
    expect(ShapeHandles.hitTestVertex(shape, { x: 51, y: 49 })).toBe(2)
  })

  it("misses when the point is outside every vertex's tolerance", () => {
    const shape = createPolygon({ x: 0, y: 0, width: 100, height: 50 }, [
      { x: 0, y: 0 },
      { x: 100, y: 0 },
      { x: 50, y: 50 }
    ])
    expect(ShapeHandles.hitTestVertex(shape, { x: 50, y: 25 })).toBeUndefined()
  })
})

describe("moveVertex", () => {
  it("re-fits bounds tightly around the new point set and rebases every point onto it, keeping each point's real (absolute) position unchanged", () => {
    const shape = createPolygon({ x: 0, y: 0, width: 100, height: 50 }, [
      { x: 0, y: 0 },
      { x: 100, y: 0 },
      { x: 50, y: 50 }
    ])
    // Vertex 0 moves from local (0,0) to local (10,5) (still canvas (10,5), since bounds start at
    // the origin) — the tightest box around {(10,5),(100,0),(50,50)} is x:[10,100], y:[0,50].
    const moved = ShapeHandles.moveVertex(shape, 0, { x: 10, y: 5 })
    expect(moved.bounds).toEqual({ x: 10, y: 0, width: 90, height: 50 })
    // Rebased onto the new bounds origin (10,0) — same real canvas positions as before/the drag target.
    expect(moved.points[0]).toEqual({ x: 0, y: 5 })
    expect(moved.points[1]).toEqual({ x: 90, y: 0 })
    expect(moved.points[2]).toEqual({ x: 40, y: 50 })
  })

  it("grows bounds when a vertex is dragged outside the shape's original box — the real bug this fixes: the selection outline/handles must track the actual outline, not a stale box", () => {
    const shape = createPolygon({ x: 100, y: 100, width: 100, height: 50 }, [
      { x: 0, y: 0 },
      { x: 100, y: 0 },
      { x: 100, y: 50 },
      { x: 0, y: 50 }
    ])
    // Drag the top-left corner (canvas (100,100)) further up-left, to canvas (70, 80) — 30/20px
    // outside the shape's own original bounding box.
    const moved = ShapeHandles.moveVertex(shape, 0, { x: 70, y: 80 })
    expect(moved.bounds).toEqual({ x: 70, y: 80, width: 130, height: 70 })
    // The dragged vertex itself now sits exactly at the new bounds' own origin.
    expect(moved.points[0]).toEqual({ x: 0, y: 0 })
    // Every other vertex's real canvas position is unchanged — only rebased onto the new origin.
    const canvasPoints = ShapeHandles.vertexPointsFor(moved)
    expect(canvasPoints[1]).toEqual({ x: 200, y: 100 })
    expect(canvasPoints[2]).toEqual({ x: 200, y: 150 })
    expect(canvasPoints[3]).toEqual({ x: 100, y: 150 })
  })

  it("accounts for the shape's own rotation when converting the pointer to local space", () => {
    const shape = { ...createPolygon({ x: 0, y: 0, width: 100, height: 50 }, [{ x: 0, y: 0 }]), angle: Math.PI / 2 }
    // Dragging vertex 0 to its own current canvas position should round-trip back to (0,0).
    const canvasPoint = ShapeHandles.vertexPointsFor(shape)[0]
    const moved = ShapeHandles.moveVertex(shape, 0, canvasPoint)
    expect(moved.points[0].x).toBeCloseTo(0)
    expect(moved.points[0].y).toBeCloseTo(0)
  })
})

describe("insertVertexNear", () => {
  it("splits the nearest edge, inserting the new point right after its start index", () => {
    const shape = createPolygon({ x: 0, y: 0, width: 100, height: 50 }, [
      { x: 0, y: 0 },
      { x: 100, y: 0 },
      { x: 50, y: 50 }
    ])
    // Midpoint of the top edge (points 0->1).
    const updated = ShapeHandles.insertVertexNear(shape, { x: 50, y: 0 })
    expect(updated.points).toHaveLength(4)
    expect(updated.points[1]).toEqual({ x: 50, y: 0 })
    expect(updated.points[0]).toEqual({ x: 0, y: 0 })
    expect(updated.points[2]).toEqual({ x: 100, y: 0 })
  })

  it("wraps around: a point nearest the closing edge (last point back to first) inserts at the end", () => {
    const shape = createPolygon({ x: 0, y: 0, width: 100, height: 50 }, [
      { x: 0, y: 0 },
      { x: 100, y: 0 },
      { x: 50, y: 50 }
    ])
    // Midpoint of the closing edge (points 2->0).
    const updated = ShapeHandles.insertVertexNear(shape, { x: 25, y: 25 })
    expect(updated.points).toHaveLength(4)
    expect(updated.points[3]).toEqual({ x: 25, y: 25 })
  })
})

describe("deleteVertex", () => {
  it("removes the targeted vertex", () => {
    const shape = createPolygon({ x: 0, y: 0, width: 100, height: 50 }, [
      { x: 0, y: 0 },
      { x: 100, y: 0 },
      { x: 50, y: 50 },
      { x: 0, y: 50 }
    ])
    const updated = ShapeHandles.deleteVertex(shape, 1)
    expect(updated.points).toEqual([
      { x: 0, y: 0 },
      { x: 50, y: 50 },
      { x: 0, y: 50 }
    ])
  })

  it("refuses to drop below MIN_POLYGON_VERTICES, returning the shape unchanged", () => {
    const shape = createPolygon({ x: 0, y: 0, width: 100, height: 50 }, [
      { x: 0, y: 0 },
      { x: 100, y: 0 },
      { x: 50, y: 50 }
    ])
    const updated = ShapeHandles.deleteVertex(shape, 0)
    expect(updated).toBe(shape)
  })
})

describe("resizeAxisFor", () => {
  it("maps each handle of an unrotated shape to the axis it visibly stretches along", () => {
    expect(ShapeHandles.resizeAxisFor("e", 0)).toBe("ew")
    expect(ShapeHandles.resizeAxisFor("w", 0)).toBe("ew")
    expect(ShapeHandles.resizeAxisFor("n", 0)).toBe("ns")
    expect(ShapeHandles.resizeAxisFor("s", 0)).toBe("ns")
    expect(ShapeHandles.resizeAxisFor("nw", 0)).toBe("nwse")
    expect(ShapeHandles.resizeAxisFor("se", 0)).toBe("nwse")
    expect(ShapeHandles.resizeAxisFor("ne", 0)).toBe("nesw")
    expect(ShapeHandles.resizeAxisFor("sw", 0)).toBe("nesw")
  })

  it("rotates the axis with the shape — a quarter turn swaps every handle's own axis", () => {
    const quarter = Math.PI / 2
    expect(ShapeHandles.resizeAxisFor("e", quarter)).toBe("ns")
    expect(ShapeHandles.resizeAxisFor("n", quarter)).toBe("ew")
    expect(ShapeHandles.resizeAxisFor("nw", quarter)).toBe("nesw")
    expect(ShapeHandles.resizeAxisFor("ne", quarter)).toBe("nwse")
  })

  it("is unchanged by a half turn — opposite handles resize along the same line", () => {
    for (const handle of RESIZE_HANDLE_IDS.filter(id => id !== "rotate") as Exclude<HandleId, "rotate">[]) {
      expect(ShapeHandles.resizeAxisFor(handle, Math.PI)).toBe(ShapeHandles.resizeAxisFor(handle, 0))
      expect(ShapeHandles.resizeAxisFor(handle, -Math.PI)).toBe(ShapeHandles.resizeAxisFor(handle, 0))
    }
  })

  it("snaps to the nearest 45 degree sector rather than only handling exact multiples", () => {
    const tenDegrees = (10 * Math.PI) / 180
    expect(ShapeHandles.resizeAxisFor("e", tenDegrees)).toBe("ew") // still nearest horizontal
    const thirtyDegrees = (30 * Math.PI) / 180
    expect(ShapeHandles.resizeAxisFor("e", thirtyDegrees)).toBe("nwse") // past the 22.5 midpoint
  })
})
