import { ApparentSize } from "./ApparentSize.js"
import type { PhysicalExtent } from "./ApparentSize.js"

/**
 * A shape's screen-space bounding box.
 */
export interface ShapeBounds {
  x: number
  y: number
  width: number
  height: number
}

export interface BaseShape {
  bounds: ShapeBounds
  /** CSS color */
  color: string
  /** Rotation in radians; 0 = no rotation */
  angle: number
  /** 0 = opaque, 1 = fully transparent */
  transparency: number
  /** 0 = no halo/glow, >1 = larger glow radius */
  haloScale: number
  selected: boolean
  title?: string
  /**
   * Whether the witness reported this shape as being behind cloud at this instant — "it
   * disappeared into a cloud", which is a thing they SAW, not something to be deduced.
   *
   * Stated rather than inferred on purpose, and for the same reason DecorObject.occludesSourceIds
   * is: nothing in a recording can decide it. This format describes what reached the witness's
   * eyes — a 2D appearance on their own field of view — not where an object was in space; a
   * reported distance (see physical) is an occasional, often shaky extra, and the sky's own gaps
   * here are procedural noise, so leaving the question to geometry means bending the weather until
   * the reported disappearance happens to occur. The witness's own account outranks both.
   *
   * Keyframed like every other appearance field, and held rather than blended (see lerpShape):
   * there is no halfway between visible and hidden behind a cloud.
   */
  behindCloud?: boolean
  /** The real size/distance `bounds` was computed from, when the witness reported them (see
   * ApparentSize) — absent for a shape drawn purely by eye, which is why it's optional rather
   * than required: most freehand recordings have no reported measurement to attach. Never read
   * by rendering or hit-testing, which always use `bounds`; this documents where that size came
   * from and lets it be recomputed. */
  physical?: PhysicalExtent
}

export interface OvalShape extends BaseShape {
  kind: "oval"
}

export interface PolygonShape extends BaseShape {
  kind: "polygon"
  /** Points relative to bounds origin (0,0 = bounds.x, bounds.y) */
  points: ReadonlyArray<{ x: number; y: number }>
}

export type Shape = OvalShape | PolygonShape

export function createOval(bounds: ShapeBounds, color = "#39ff14"): OvalShape {
  return { kind: "oval", bounds, color, angle: 0, transparency: 0, haloScale: 0, selected: false }
}

export function createPolygon(
  bounds: ShapeBounds,
  points: ReadonlyArray<{ x: number; y: number }>,
  color = "#39ff14"
): PolygonShape {
  return { kind: "polygon", bounds, points, color, angle: 0, transparency: 0, haloScale: 0, selected: false }
}

/** A plain quad — the starting point for a freeform, arbitrary-vertex shape (a "cigare" or any
 * other outline a fixed preset wouldn't cover) rather than a shape in its own right. Its 4
 * corners are just as editable via ShapeHandles.moveVertex as any other polygon's points — vertex
 * editing is a capability of every `kind: "polygon"` shape, not something special-cased to shapes
 * created via this one preset; starting from a plain quad just gives more room to reshape from
 * than a triangle would, with no other consequence — see ShapeHandles.insertVertexNear/
 * deleteVertex for growing/shrinking the point count from there. (The project's own former fixed
 * "Saucer"/"Triangle" presets were removed once this made them redundant — either shape, or any
 * other outline, is now just a Polygon reshaped by hand.) */
export function createCustomPolygon(bounds: ShapeBounds, color = "#39ff14"): PolygonShape {
  const { width: w, height: h } = bounds
  const points = [
    { x: 0, y: 0 },
    { x: w, y: 0 },
    { x: w, y: h },
    { x: 0, y: h }
  ]
  return createPolygon(bounds, points, color)
}

export type ShapePresetId = "oval" | "polygon"

export const SHAPE_PRESETS: Record<ShapePresetId, (bounds: ShapeBounds, color?: string) => Shape> = {
  oval: createOval,
  polygon: createCustomPolygon
}

export interface Appearance {
  presetId: ShapePresetId
  color: string
  transparency: number
  haloScale: number
}

export function createShape(bounds: ShapeBounds, appearance: Appearance): Shape {
  return {
    ...SHAPE_PRESETS[appearance.presetId](bounds, appearance.color),
    transparency: appearance.transparency,
    haloScale: appearance.haloScale
  }
}

export function cloneShape(shape: Shape): Shape {
  return { ...shape, bounds: { ...shape.bounds } }
}

export function shapeContains(shape: Shape, x: number, y: number): boolean {
  const { bounds } = shape
  return x >= bounds.x && x <= bounds.x + bounds.width && y >= bounds.y && y <= bounds.y + bounds.height
}

export function moveShapeTo(shape: Shape, x: number, y: number): Shape {
  const width = shape.bounds.width
  const height = shape.bounds.height
  return {
    ...shape,
    bounds: { x: x - width / 2, y: y - height / 2, width, height }
  }
}

function lerp(from: number, to: number, fraction: number): number {
  return from + (to - from) * fraction
}

/** Only the `#rrggbb` hex form the color picker actually produces (see template.ts) parses; anything else (a named CSS color, `rgb()`...) isn't blendable. */
function parseHexColor(color: string): [number, number, number] | undefined {
  const match = /^#([0-9a-f]{6})$/i.exec(color)
  if (!match) return undefined
  const value = parseInt(match[1], 16)
  return [(value >> 16) & 0xff, (value >> 8) & 0xff, value & 0xff]
}

function toHexColor(channels: [number, number, number]): string {
  return `#${channels.map(c => Math.round(c).toString(16).padStart(2, "0")).join("")}`
}

function lerpColor(from: string, to: string, fraction: number): string {
  const a = parseHexColor(from)
  const b = parseHexColor(to)
  if (!a || !b) return fraction < 1 ? from : to
  return toHexColor([lerp(a[0], b[0], fraction), lerp(a[1], b[1], fraction), lerp(a[2], b[2], fraction)])
}

/**
 * Blends two keyframe shapes for smooth in-between playback frames. Geometry/appearance
 * (bounds, angle, transparency, haloScale, color) always blends linearly; polygon `points`
 * only blend when both shapes are polygons with the same point count (there's no meaningful
 * per-vertex correspondence otherwise) — mismatched kind, or differing point counts, holds
 * `from`'s outline/title/selected until `fraction` reaches 1, at which point `to`'s take over;
 * this only matters for callers using fraction 1 directly, since
 * Timeline.getInterpolatedShapeAt never calls this with fraction outside (0, 1).
 * Angle is lerped directly (no shortest-path wraparound), matching recorded drag gestures.
 */
export function lerpShape(from: Shape, to: Shape, fraction: number): Shape {
  const bounds: ShapeBounds = {
    x: lerp(from.bounds.x, to.bounds.x, fraction),
    y: lerp(from.bounds.y, to.bounds.y, fraction),
    width: lerp(from.bounds.width, to.bounds.width, fraction),
    height: lerp(from.bounds.height, to.bounds.height, fraction)
  }
  const angle = lerp(from.angle, to.angle, fraction)
  const transparency = lerp(from.transparency, to.transparency, fraction)
  const haloScale = lerp(from.haloScale, to.haloScale, fraction)
  const color = lerpColor(from.color, to.color, fraction)
  // An object that recedes has a real distance at every instant, not just at its keyframes —
  // interpolated (rather than held from `from`) so that stays true mid-flight. Undefined unless
  // both ends document one; see ApparentSize.lerp.
  const physical = ApparentSize.lerp(from.physical, to.physical, fraction)

  if (from.kind === "polygon" && to.kind === "polygon" && from.points.length === to.points.length) {
    return {
      ...from,
      bounds,
      angle,
      transparency,
      haloScale,
      color,
      physical,
      // Held, not blended — see BaseShape.behindCloud. The spread above already carries `from`'s
      // value; this is only here so the field is visibly part of the interpolation contract.
      behindCloud: fraction < 1 ? from.behindCloud : to.behindCloud,
      points: from.points.map((point, i) => ({
        x: lerp(point.x, to.points[i].x, fraction),
        y: lerp(point.y, to.points[i].y, fraction)
      }))
    }
  }

  return { ...(fraction < 1 ? from : to), bounds, angle, transparency, haloScale, color, physical }
}
