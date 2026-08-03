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

/**
 * A lens/disc silhouette (classic "flying saucer" top-view outline), as a
 * fraction-of-bounds polygon — replaces AspectPanel's 3-layer dome+body+dome
 * shape compositing (ArcShape top/bottom + RectangleShape mid) with a single
 * preset shape, avoiding a Timeline/Recorder change to support multi-part
 * grouped shapes for this milestone.
 */
export function createSaucer(bounds: ShapeBounds, color = "#39ff14"): PolygonShape {
  const { width: w, height: h } = bounds
  const points = [
    { x: 0.5 * w, y: 0 },
    { x: 0.8 * w, y: 0.25 * h },
    { x: w, y: 0.5 * h },
    { x: 0.8 * w, y: 0.75 * h },
    { x: 0.5 * w, y: h },
    { x: 0.2 * w, y: 0.75 * h },
    { x: 0, y: 0.5 * h },
    { x: 0.2 * w, y: 0.25 * h }
  ]
  return createPolygon(bounds, points, color)
}

/** Matches the original (unused in the applet's actual UI) createTriangleShape preset. */
export function createTriangle(bounds: ShapeBounds, color = "#39ff14"): PolygonShape {
  const { width: w, height: h } = bounds
  const points = [
    { x: 0, y: 0 },
    { x: w, y: h / 2 },
    { x: 0, y: h }
  ]
  return createPolygon(bounds, points, color)
}

export type ShapePresetId = "oval" | "saucer" | "triangle"

export const SHAPE_PRESETS: Record<ShapePresetId, (bounds: ShapeBounds, color?: string) => Shape> = {
  oval: createOval,
  saucer: createSaucer,
  triangle: createTriangle
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

  if (from.kind === "polygon" && to.kind === "polygon" && from.points.length === to.points.length) {
    return {
      ...from,
      bounds,
      angle,
      transparency,
      haloScale,
      color,
      points: from.points.map((point, i) => ({
        x: lerp(point.x, to.points[i].x, fraction),
        y: lerp(point.y, to.points[i].y, fraction)
      }))
    }
  }

  return { ...(fraction < 1 ? from : to), bounds, angle, transparency, haloScale, color }
}
