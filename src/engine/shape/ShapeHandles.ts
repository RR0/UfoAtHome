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
const MIN_SHAPE_SIZE = 8 // px resize floor — avoids degenerate/inverted bounds

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

/**
 * The 9 handle positions in CANVAS space (already rotated by shape.angle around the shape's
 * center) — the single source of truth used both by CanvasRenderer (drawing) and hit-testing
 * below, so rendering and interaction can never disagree.
 */
export function handlePointsFor(shape: Shape): Record<HandleId, { x: number; y: number }> {
  const { x, y, width: w, height: h } = shape.bounds
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
  const center = shapeCenter(shape.bounds)
  const result = {} as Record<HandleId, { x: number; y: number }>
  for (const id of Object.keys(local) as HandleId[]) {
    result[id] = rotateAround(local[id], center, shape.angle)
  }
  return result
}

export function hitTestHandle(shape: Shape, point: { x: number; y: number }, tolerance = 8): HandleId | undefined {
  const points = handlePointsFor(shape)
  for (const id of [...RESIZE_HANDLE_IDS, "rotate"] as HandleId[]) {
    if (Math.hypot(point.x - points[id].x, point.y - points[id].y) <= tolerance) return id
  }
  return undefined
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

/**
 * Resizes `original` by dragging `handle` to `pointer` (canvas space). Inverse-rotates the
 * pointer into the shape's local (unrotated) frame first — R(angle) is orthogonal, so
 * rotating by -angle about center recovers local coordinates — so resize works correctly
 * even on an already-rotated shape, then does plain axis-aligned edge math anchored at the
 * opposite corner/edge. Rescales polygon `points` proportionally (they're absolute pixel
 * offsets, not fractions) so the outline stays matched to the new bounds. If a polygon's
 * bounds ever has zero width/height at drag start (only possible via externally-loaded/
 * corrupted JSON — this feature's own MIN_SHAPE_SIZE floor prevents it), points on that axis
 * are left unscaled rather than dividing by zero.
 */
export function resizeShape(original: Shape, handle: HandleId, pointer: { x: number; y: number }): Shape {
  if (handle === "rotate") throw new Error("resizeShape does not accept the rotate handle")
  const center = shapeCenter(original.bounds)
  const local = rotateAround(pointer, center, -original.angle)
  const { x, y, width, height } = original.bounds
  const edges = HANDLE_EDGES[handle]
  let newLeft = x
  let newTop = y
  let newRight = x + width
  let newBottom = y + height
  if (edges.left) newLeft = Math.min(local.x, newRight - MIN_SHAPE_SIZE)
  if (edges.right) newRight = Math.max(local.x, newLeft + MIN_SHAPE_SIZE)
  if (edges.top) newTop = Math.min(local.y, newBottom - MIN_SHAPE_SIZE)
  if (edges.bottom) newBottom = Math.max(local.y, newTop + MIN_SHAPE_SIZE)
  const bounds: ShapeBounds = { x: newLeft, y: newTop, width: newRight - newLeft, height: newBottom - newTop }
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
export function rotateShape(original: Shape, pointer: { x: number; y: number }): Shape {
  const center = shapeCenter(original.bounds)
  const angle = Math.atan2(pointer.y - center.y, pointer.x - center.x) + Math.PI / 2
  return { ...original, angle }
}
