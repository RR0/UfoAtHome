import type { Shape, ShapeBounds } from "./Shape.js"

/**
 * Interactive-editing geometry for a selected shape's handles — 8 resize handles (corners/
 * edge midpoints) plus a 9th rotate handle above the top edge. Kept separate from Shape.ts
 * (pure data model, used by playback too) since this is editor-only logic that Player/
 * Timeline/CanvasRenderer's base paint never need.
 */
export type HandleId = "nw" | "n" | "ne" | "e" | "se" | "s" | "sw" | "w" | "rotate"

export const RESIZE_HANDLE_IDS: HandleId[] = ["nw", "n", "ne", "e", "se", "s", "sw", "w"]

const ROTATE_HANDLE_OFFSET = 24 // px above the top edge, in the shape's local (unrotated) frame
export const MIN_SHAPE_SIZE = 8 // px resize floor — avoids degenerate/inverted bounds — shared with UfoRecorderElement's arrow-key resize

function rotateAround(
  point: { x: number; y: number },
  center: { x: number; y: number },
  angle: number
): { x: number; y: number } {
  const dx = point.x - center.x
  const dy = point.y - center.y
  const cos = Math.cos(angle)
  const sin = Math.sin(angle)
  return { x: center.x + dx * cos - dy * sin, y: center.y + dx * sin + dy * cos }
}

function shapeCenter(bounds: ShapeBounds): { x: number; y: number } {
  return { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2 }
}

const HANDLE_EDGES: Record<Exclude<HandleId, "rotate">, { left?: true; right?: true; top?: true; bottom?: true }> = {
  nw: { left: true, top: true },
  n: { top: true },
  ne: { right: true, top: true },
  e: { right: true },
  se: { right: true, bottom: true },
  s: { bottom: true },
  sw: { left: true, bottom: true },
  w: { left: true }
}

/** A shape/group's bounds+angle as far as handle geometry is concerned — every real Shape already
 * satisfies this structurally, and a synthetic group bounding box can too, with no cast. */
export interface HandleFrame {
  bounds: ShapeBounds
  angle: number
}

/** Static, editor-only geometry for a single shape/group's resize+rotate handles — everything
 * kept as class methods (even the stateless ones) rather than free functions, one scoping point
 * for this whole feature area. See ShapeGroup below for the multi-shape counterpart, which does
 * carry real per-interaction state (the group's members) and so is an instance class instead. */
export class ShapeHandles {
  /**
   * The 9 handle positions in CANVAS space (already rotated by `angle` around the frame's
   * center) — the single source of truth used both by CanvasRenderer (drawing) and hit-testing
   * below, so rendering and interaction can never disagree.
   */
  static handlePointsFor(frame: HandleFrame): Record<HandleId, { x: number; y: number }> {
    const { x, y, width: w, height: h } = frame.bounds
    const local: Record<HandleId, { x: number; y: number }> = {
      nw: { x, y },
      n: { x: x + w / 2, y },
      ne: { x: x + w, y },
      e: { x: x + w, y: y + h / 2 },
      se: { x: x + w, y: y + h },
      s: { x: x + w / 2, y: y + h },
      sw: { x, y: y + h },
      w: { x, y: y + h / 2 },
      rotate: { x: x + w / 2, y: y - ROTATE_HANDLE_OFFSET }
    }
    const center = shapeCenter(frame.bounds)
    const result = {} as Record<HandleId, { x: number; y: number }>
    for (const id of Object.keys(local) as HandleId[]) {
      result[id] = rotateAround(local[id], center, frame.angle)
    }
    return result
  }

  static hitTestHandle(
    frame: HandleFrame,
    point: { x: number; y: number },
    tolerance = 8,
    handleIds: HandleId[] = [...RESIZE_HANDLE_IDS, "rotate"]
  ): HandleId | undefined {
    const points = ShapeHandles.handlePointsFor(frame)
    for (const id of handleIds) {
      if (Math.hypot(point.x - points[id].x, point.y - points[id].y) <= tolerance) return id
    }
    return undefined
  }

  /**
   * Drags `handle` to `pointer` (canvas space) and returns the resulting bounds. Inverse-rotates
   * the pointer into the local (unrotated) frame first — R(angle) is orthogonal, so rotating by
   * -angle about center recovers local coordinates — so resize works correctly even on an
   * already-rotated frame, then does plain axis-aligned edge math anchored at the opposite
   * corner/edge. Shared by resizeShape (single shape) and ShapeGroup.resize (group bbox, angle 0).
   */
  static resizeBounds(bounds: ShapeBounds, angle: number, handle: Exclude<HandleId, "rotate">, pointer: { x: number; y: number }): ShapeBounds {
    const center = shapeCenter(bounds)
    const local = rotateAround(pointer, center, -angle)
    const { x, y, width, height } = bounds
    const edges = HANDLE_EDGES[handle]
    let newLeft = x
    let newTop = y
    let newRight = x + width
    let newBottom = y + height
    if (edges.left) newLeft = Math.min(local.x, newRight - MIN_SHAPE_SIZE)
    if (edges.right) newRight = Math.max(local.x, newLeft + MIN_SHAPE_SIZE)
    if (edges.top) newTop = Math.min(local.y, newBottom - MIN_SHAPE_SIZE)
    if (edges.bottom) newBottom = Math.max(local.y, newTop + MIN_SHAPE_SIZE)
    return { x: newLeft, y: newTop, width: newRight - newLeft, height: newBottom - newTop }
  }

  /**
   * Resizes `original` by dragging `handle` to `pointer`. Rescales polygon `points`
   * proportionally (they're absolute pixel offsets, not fractions) so the outline stays matched
   * to the new bounds. If a polygon's bounds ever has zero width/height at drag start (only
   * possible via externally-loaded/corrupted JSON — this feature's own MIN_SHAPE_SIZE floor
   * prevents it), points on that axis are left unscaled rather than dividing by zero.
   */
  static resizeShape(original: Shape, handle: HandleId, pointer: { x: number; y: number }): Shape {
    if (handle === "rotate") throw new Error("resizeShape does not accept the rotate handle")
    const { width, height } = original.bounds
    const bounds = ShapeHandles.resizeBounds(original.bounds, original.angle, handle, pointer)
    if (original.kind === "oval") return { ...original, bounds }
    const scaleX = width === 0 ? 1 : bounds.width / width
    const scaleY = height === 0 ? 1 : bounds.height / height
    return { ...original, bounds, points: original.points.map(p => ({ x: p.x * scaleX, y: p.y * scaleY })) }
  }

  /**
   * Absolute angle from dragging the rotate handle to `pointer` — a direct function of pointer
   * position (not a delta from `original.angle`), so rotation has no drift/hysteresis. The
   * +Math.PI/2 offset makes "handle dragged straight up from center" map to angle 0 (the
   * handle's rest position in handlePointsFor).
   */
  static rotateShape(original: Shape, pointer: { x: number; y: number }): Shape {
    const center = shapeCenter(original.bounds)
    const angle = Math.atan2(pointer.y - center.y, pointer.x - center.x) + Math.PI / 2
    return { ...original, angle }
  }

  /** Axis-aligned union bounding box of a list of shape bounds — deliberately ignores each
   * member's own `angle` (the group bbox itself is never rotated; see ShapeGroup.rotate, which
   * instead revolves each member's position around the group's center and spins its own angle,
   * rather than tilting this shared frame). */
  static groupBoundsFor(boundsList: ShapeBounds[]): ShapeBounds {
    const left = Math.min(...boundsList.map(b => b.x))
    const top = Math.min(...boundsList.map(b => b.y))
    const right = Math.max(...boundsList.map(b => b.x + b.width))
    const bottom = Math.max(...boundsList.map(b => b.y + b.height))
    return { x: left, y: top, width: right - left, height: bottom - top }
  }
}

/**
 * A live multi-shape selection being resized/nudged together. Constructed once per drag/nudge
 * interaction and holds `members` as instance state — the invariant that would otherwise need
 * re-passing to every call — so callers just call bounds()/scaleTo()/resize() repeatedly (e.g.
 * once per pointermove) without threading the member list through each time.
 */
export class ShapeGroup {
  constructor(private readonly members: ReadonlyArray<{ sourceId: string; shape: Shape }>) {}

  /** The group's current shared/union bounding box — see ShapeHandles.groupBoundsFor. */
  bounds(): ShapeBounds {
    return ShapeHandles.groupBoundsFor(this.members.map(m => m.shape.bounds))
  }

  /**
   * Scales+translates every member's own bounds (and polygon points, proportionally — same
   * technique resizeShape uses for a single shape) from the group's current bbox to `target`.
   * Clamped so no member's resulting width/height drops below MIN_SHAPE_SIZE — this can slightly
   * break strict proportionality if one member starts out tiny relative to the group, an accepted
   * edge case. Each member's own `angle` is left untouched — a resize scales, it doesn't spin (see
   * rotate() below for that).
   */
  scaleTo(target: ShapeBounds): Array<{ sourceId: string; shape: Shape }> {
    const from = this.bounds()
    const scaleX = from.width === 0 ? 1 : target.width / from.width
    const scaleY = from.height === 0 ? 1 : target.height / from.height
    return this.members.map(({ sourceId, shape }) => {
      const width = Math.max(shape.bounds.width * scaleX, MIN_SHAPE_SIZE)
      const height = Math.max(shape.bounds.height * scaleY, MIN_SHAPE_SIZE)
      const x = target.x + (shape.bounds.x - from.x) * scaleX
      const y = target.y + (shape.bounds.y - from.y) * scaleY
      const bounds: ShapeBounds = { x, y, width, height }
      if (shape.kind === "oval") return { sourceId, shape: { ...shape, bounds } }
      return { sourceId, shape: { ...shape, bounds, points: shape.points.map(p => ({ x: p.x * scaleX, y: p.y * scaleY })) } }
    })
  }

  /** Drags `handle` (of the group's own shared bbox handles, never "rotate") to `pointer` and
   * scales every member accordingly. */
  resize(handle: Exclude<HandleId, "rotate">, pointer: { x: number; y: number }): Array<{ sourceId: string; shape: Shape }> {
    return this.scaleTo(ShapeHandles.resizeBounds(this.bounds(), 0, handle, pointer))
  }

  /**
   * Rotates the whole group by the angle swept from `startPointer` to `pointer` around the
   * group's own (fixed, drag-start) center — standard multi-object rotate semantics (Figma/
   * Illustrator/PowerPoint all do this the same way): each member both REVOLVES around the shared
   * center (its position changes, not just its own orientation) AND SPINS by that same delta (its
   * own `angle` increases by it too) — rotating a two-shape group by 90° should turn it into the
   * same silhouette as if the pair had been drawn that way from the start, not just spin each
   * shape in place while leaving them at their original relative positions.
   *
   * Uses a DELTA (this drag's angular sweep), not an absolute angle the way the single-shape
   * rotateShape does — members can start at different angles, so only the *change* is meaningful
   * to apply uniformly. Polygon `points` are untouched: they're relative to each shape's own
   * bounds/angle already, which is exactly what carries the spin.
   */
  rotate(pointer: { x: number; y: number }, startPointer: { x: number; y: number }): Array<{ sourceId: string; shape: Shape }> {
    const center = shapeCenter(this.bounds())
    const angleOf = (p: { x: number; y: number }) => Math.atan2(p.y - center.y, p.x - center.x)
    const delta = angleOf(pointer) - angleOf(startPointer)
    return this.members.map(({ sourceId, shape }) => {
      const memberCenter = shapeCenter(shape.bounds)
      const newCenter = rotateAround(memberCenter, center, delta)
      const bounds: ShapeBounds = {
        x: newCenter.x - shape.bounds.width / 2,
        y: newCenter.y - shape.bounds.height / 2,
        width: shape.bounds.width,
        height: shape.bounds.height
      }
      return { sourceId, shape: { ...shape, bounds, angle: shape.angle + delta } }
    })
  }
}
