import type { PolygonShape, Shape, ShapeBounds } from "./Shape.js"

/**
 * Interactive-editing geometry for a selected shape's handles — 8 resize handles (corners/
 * edge midpoints) plus a 9th rotate handle above the top edge. Kept separate from Shape.ts
 * (pure data model, used by playback too) since this is editor-only logic that Player/
 * Timeline/CanvasRenderer's base paint never need.
 */
export type HandleId = "nw" | "n" | "ne" | "e" | "se" | "s" | "sw" | "w" | "rotate"

export const RESIZE_HANDLE_IDS: HandleId[] = ["nw", "n", "ne", "e", "se", "s", "sw", "w"]

/** Which of the 4 diagonal/orthogonal axes a resize handle actually stretches along, once the
 * shape's own rotation is taken into account — named after the CSS `*-resize` cursor family
 * ("ew-resize", "nwse-resize", ...) they're meant to drive, but kept axis names rather than CSS
 * strings so this stays plain geometry (the component's stylesheet is what turns them into real
 * cursors, see ufoTemplate's own canvas[data-cursor] rules). */
export type ResizeAxis = "ew" | "nwse" | "ns" | "nesw"

const ROTATE_HANDLE_OFFSET = 24 // px above the top edge, in the shape's local (unrotated) frame
export const MIN_SHAPE_SIZE = 8 // px resize floor — avoids degenerate/inverted bounds — shared with UfoRecorderElement's arrow-key resize
/** A polygon needs at least 3 points to remain a real shape — deleteVertex refuses to go below
 * this, the same "always keep a minimum" precedent as MIN_SHAPE_SIZE above (and deleteShape's own
 * "always keep at least one shape" rule in UfoRecorderElement). */
export const MIN_POLYGON_VERTICES = 3
export const VERTEX_HANDLE_TOLERANCE = 8 // px — same as hitTestHandle's own default

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

  /** The direction each resize handle pushes/pulls in the shape's own local frame, as a screen-
   * space angle in degrees (0 = right, 90 = down, matching canvas y-down convention). Opposite
   * handles (e/w, nw/se, ...) deliberately keep distinct entries even though they share an axis —
   * resizeAxisFor folds them together, and keeping the full circle here makes adding the shape's
   * own rotation a plain sum. */
  private static readonly HANDLE_DIRECTION_DEG: Record<Exclude<HandleId, "rotate">, number> = {
    e: 0,
    se: 45,
    s: 90,
    sw: 135,
    w: 180,
    nw: 225,
    n: 270,
    ne: 315
  }

  /**
   * Which axis dragging `handle` stretches along once the shape is rotated by `angle` (radians) —
   * i.e. which resize cursor should be shown while hovering it. A rotated shape's "east" handle
   * no longer resizes horizontally on screen, so the handle's own direction and the shape's angle
   * are summed, then folded into the 4 axes the 8 handles reduce to (direction and its opposite
   * resize along the same line, hence the modulo 180) and rounded to the nearest 45 degree sector.
   */
  static resizeAxisFor(handle: Exclude<HandleId, "rotate">, angle: number): ResizeAxis {
    const degrees = ShapeHandles.HANDLE_DIRECTION_DEG[handle] + (angle * 180) / Math.PI
    const folded = (((degrees % 180) + 180) % 180) / 45
    const axes: ResizeAxis[] = ["ew", "nwse", "ns", "nesw"]
    return axes[Math.round(folded) % axes.length]
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

  /** A polygon's own vertex positions in CANVAS space (bounds-relative `points` translated by
   * `bounds` origin, then rotated by `angle` around the shape's center) — the exact same
   * transform CanvasRenderer.paintBase applies via ctx.translate/ctx.rotate before stroking the
   * outline, so vertex handles always land exactly on the painted corners regardless of rotation.
   * Single source of truth for both painting (CanvasRenderer.paintVertexHandles) and hit-testing
   * (hitTestVertex) below, same "rendering and interaction can never disagree" reasoning as
   * handlePointsFor. */
  static vertexPointsFor(shape: PolygonShape): ReadonlyArray<{ x: number; y: number }> {
    const center = shapeCenter(shape.bounds)
    return shape.points.map(point => rotateAround({ x: shape.bounds.x + point.x, y: shape.bounds.y + point.y }, center, shape.angle))
  }

  static hitTestVertex(shape: PolygonShape, point: { x: number; y: number }, tolerance = VERTEX_HANDLE_TOLERANCE): number | undefined {
    const canvasPoints = ShapeHandles.vertexPointsFor(shape)
    let nearestIndex: number | undefined
    let nearestDistance = tolerance
    canvasPoints.forEach((candidate, index) => {
      const distance = Math.hypot(point.x - candidate.x, point.y - candidate.y)
      if (distance <= nearestDistance) {
        nearestDistance = distance
        nearestIndex = index
      }
    })
    return nearestIndex
  }

  /** Inverse of vertexPointsFor's own transform — a canvas-space point (e.g. the live pointer
   * position) back into the shape's local, bounds-relative, unrotated frame that `points` are
   * stored in. Shared by moveVertex/insertVertexNear, both of which need to write into `points`
   * using the same convention the shape itself already uses. */
  private static toLocalPoint(shape: PolygonShape, point: { x: number; y: number }): { x: number; y: number } {
    const center = shapeCenter(shape.bounds)
    const local = rotateAround(point, center, -shape.angle)
    return { x: local.x - shape.bounds.x, y: local.y - shape.bounds.y }
  }

  /** Drags vertex `index` to `pointer` (canvas space) — every other vertex keeps its own position
   * (in the shape's real, absolute local frame) and `angle` is untouched; only that one point
   * moves. Unlike resizeShape (which scales every point together to match a new bounding box),
   * this is what actually makes a polygon's outline freely reshapeable rather than just uniformly
   * scalable.
   *
   * `bounds` is re-fit to the new point set (tight axis-aligned box around every point,
   * `points` themselves) — points are stored relative to `bounds`'s own origin, so leaving
   * `bounds` at its old value the moment a vertex is dragged outside it would desync the
   * selection outline/handles (still drawn from the stale `bounds`) from what the shape actually
   * looks like now. Every point (not just the moved one) is rebased onto the new origin so their
   * own absolute positions — and the shape's silhouette — stay exactly where they were. */
  static moveVertex(original: PolygonShape, index: number, pointer: { x: number; y: number }): PolygonShape {
    const moved = original.points.map((p, i) => (i === index ? ShapeHandles.toLocalPoint(original, pointer) : p))
    const minX = Math.min(...moved.map(p => p.x))
    const minY = Math.min(...moved.map(p => p.y))
    const maxX = Math.max(...moved.map(p => p.x))
    const maxY = Math.max(...moved.map(p => p.y))
    const bounds: ShapeBounds = { x: original.bounds.x + minX, y: original.bounds.y + minY, width: maxX - minX, height: maxY - minY }
    const points = moved.map(p => ({ x: p.x - minX, y: p.y - minY }))
    return { ...original, bounds, points }
  }

  /**
   * Inserts a new vertex at `pointer`, splitting whichever edge it's closest to (point-to-segment
   * distance, in the shape's own local frame) — the standard "click on an outline to add a point
   * there" behavior vector editors use. Always succeeds (a polygon can always grow), unlike
   * deleteVertex's own floor.
   */
  static insertVertexNear(original: PolygonShape, pointer: { x: number; y: number }): PolygonShape {
    const target = ShapeHandles.toLocalPoint(original, pointer)
    const { points } = original
    let bestIndex = points.length - 1
    let bestDistance = Infinity
    for (let i = 0; i < points.length; i++) {
      const a = points[i]
      const b = points[(i + 1) % points.length]
      const distance = ShapeHandles.distanceToSegment(target, a, b)
      if (distance < bestDistance) {
        bestDistance = distance
        bestIndex = i
      }
    }
    const newPoints = [...points.slice(0, bestIndex + 1), target, ...points.slice(bestIndex + 1)]
    return { ...original, points: newPoints }
  }

  /** Perpendicular distance from `point` to the segment a-b, clamped to the segment itself (not
   * the infinite line through it) — standard point-to-segment formula, projecting `point` onto
   * the segment and clamping the projection parameter to [0, 1]. */
  private static distanceToSegment(point: { x: number; y: number }, a: { x: number; y: number }, b: { x: number; y: number }): number {
    const dx = b.x - a.x
    const dy = b.y - a.y
    const lengthSquared = dx * dx + dy * dy
    const t = lengthSquared === 0 ? 0 : Math.max(0, Math.min(1, ((point.x - a.x) * dx + (point.y - a.y) * dy) / lengthSquared))
    const closestX = a.x + t * dx
    const closestY = a.y + t * dy
    return Math.hypot(point.x - closestX, point.y - closestY)
  }

  /** Removes vertex `index` — refuses (returns `original` unchanged) rather than dropping below
   * MIN_POLYGON_VERTICES, the same "always keep a real shape" floor MIN_SHAPE_SIZE enforces for
   * bounds. Callers wanting to explain *why* nothing happened (e.g. disabling a menu item) should
   * check `original.points.length > MIN_POLYGON_VERTICES` themselves rather than infer it from a
   * no-op return. */
  static deleteVertex(original: PolygonShape, index: number): PolygonShape {
    if (original.points.length <= MIN_POLYGON_VERTICES) return original
    return { ...original, points: original.points.filter((_, i) => i !== index) }
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
