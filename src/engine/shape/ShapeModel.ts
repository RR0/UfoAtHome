import { createOval, createPolygon } from "./Shape.js"
import type { Appearance, Shape, ShapeBounds } from "./Shape.js"

export type ShapeModelId = "triangle" | "saucer" | "cigar" | "chevron" | "light"

/** A point of a part's outline, as fractions of the part's own box (0,0 = its top left corner). */
type ModelPoint = readonly [number, number]

/** One shape of a model, its box as fractions of the model's box. */
interface ShapeModelPart {
  /** What the part is called after the model's own name ("dome"), when the model has several. */
  part?: "disc" | "dome"
  /** An oval when absent, else a polygon with these points. */
  points?: ReadonlyArray<ModelPoint>
  fx: number
  fy: number
  fw: number
  fh: number
}

/**
 * A shape observers often describe, made of the only two kinds there are: ovals and polygons.
 *
 * Not a kind of shape. The project once had fixed "Saucer" and "Triangle" presets, removed when any
 * polygon became reshapable by hand (see createCustomPolygon); a model brings them back as a
 * starting point only. What it adds are ordinary shapes, each as editable as one drawn from
 * scratch, and a model of several parts adds them grouped (see Timeline.group) so they move
 * together until ungrouped. Nothing in a recording says a model was used.
 *
 * A model contributes geometry, never a palette: the parts take the editor's current appearance, so
 * the colour an observer picked is the colour drawn — except the light, which IS its halo and
 * brilliance, and states at least that much of both.
 */
export class ShapeModel {
  static readonly ALL: readonly ShapeModel[] = [
    new ShapeModel("triangle", 0.9, [{ points: [[0.5, 0], [1, 1], [0, 1]], fx: 0, fy: 0, fw: 1, fh: 1 }]),
    // The dome first, so the disc in front hides its lower half.
    new ShapeModel("saucer", 0.6, [
      { part: "dome", fx: 0.28, fy: 0, fw: 0.44, fh: 0.62 },
      { part: "disc", fx: 0, fy: 0.42, fw: 1, fh: 0.42 }
    ]),
    new ShapeModel("cigar", 0.25, [{ fx: 0, fy: 0, fw: 1, fh: 1 }]),
    // A boomerang, a "V" of lights: a chevron with its point up.
    new ShapeModel("chevron", 0.55, [{ points: [[0.5, 0], [1, 1], [0.5, 0.6], [0, 1]], fx: 0, fy: 0, fw: 1, fh: 1 }]),
    // The most reported of all: a light, which is a small round glow and nothing else.
    new ShapeModel("light", 1, [{ fx: 0.3, fy: 0.3, fw: 0.4, fh: 0.4 }], { haloScale: 2.5, brightness: 0.5 })
  ]

  static byId(id: string): ShapeModel | undefined {
    return ShapeModel.ALL.find(model => model.id === id)
  }

  private constructor(
    readonly id: ShapeModelId,
    /** Height over width of the model's box. */
    readonly aspect: number,
    private readonly parts: ReadonlyArray<ShapeModelPart>,
    /** The least of the appearance the model states, whatever the editor's current one says. */
    private readonly minimum: Partial<Pick<Appearance, "haloScale" | "brightness">> = {}
  ) {
  }

  /** What each shape is called after the model's own name, or undefined for a model of one shape. */
  get partNames(): ReadonlyArray<"disc" | "dome" | undefined> {
    return this.parts.map(part => part.part)
  }

  /** The box the model takes centred where `bounds` is centred, as wide as it and as tall as the model's own aspect makes it. */
  boundsAt(bounds: ShapeBounds): ShapeBounds {
    const height = bounds.width * this.aspect
    return { x: bounds.x, y: bounds.y + bounds.height / 2 - height / 2, width: bounds.width, height }
  }

  /** The model's shapes in `bounds`, back to front, with `appearance`'s colour, transparency, halo, blur and brilliance. */
  shapesIn(bounds: ShapeBounds, appearance: Appearance): Shape[] {
    return this.parts.map(part => {
      const box: ShapeBounds = {
        x: bounds.x + part.fx * bounds.width,
        y: bounds.y + part.fy * bounds.height,
        width: part.fw * bounds.width,
        height: part.fh * bounds.height
      }
      const shape = part.points
        ? createPolygon(box, part.points.map(([x, y]) => ({ x: x * box.width, y: y * box.height })), appearance.color)
        : createOval(box, appearance.color)
      return {
        ...shape,
        transparency: appearance.transparency,
        haloScale: Math.max(appearance.haloScale, this.minimum.haloScale ?? 0),
        blur: appearance.blur,
        brightness: Math.max(appearance.brightness, this.minimum.brightness ?? 0)
      }
    })
  }
}
