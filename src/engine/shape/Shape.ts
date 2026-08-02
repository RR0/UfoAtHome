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
