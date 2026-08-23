import { ApparentSize } from "../shape/ApparentSize.js"
import type { Shape } from "../shape/Shape.js"
import { Sighting, resolveObserverPoseAt } from "../model/Sighting.js"

/**
 * Reconciles a recording's stated angular sizes with the pixel boxes it is drawn as — the one
 * place the two representations of a shape's size ever meet.
 *
 * A file states an angle (see BaseShape.angular): that is what the witness perceived, and it is
 * independent of the canvas it was authored on or the field of view it was authored at. A drawing
 * needs pixels. So the angle is projected to pixels on the way IN and recovered from them on the
 * way OUT, and nothing in between has to think about it: every editing gesture, hit-test and
 * renderer keeps working on `bounds` exactly as before.
 *
 * The projection runs against the pose's own field of view AT THAT KEYFRAME's instant, not a fixed
 * 60 degrees — a recording whose witness zooms (or one authored at another fov entirely) then
 * still draws each instant at the size its own angle implies.
 */
export class SightingShapes {
  /** What a recording without any observer track is assumed to have been seen through — the
   * unaided human field of view the recorder itself writes (see UfoRecorderElement's own
   * WITNESS_FOV_DEG). Only ever reached by a file too old to carry a witnessTrack. */
  static readonly DEFAULT_FOV_DEG = 60

  /**
   * Fills in every shape's angular extent from the box it is currently drawn as — run just before
   * writing a file, so what gets stored is the perception rather than the pixels.
   *
   * Deliberately unconditional: it overwrites any angular extent already there rather than
   * preserving it. Between load and save, `bounds` is the live value every editing gesture moves,
   * so at save time the drawing IS the newer statement; keeping a stale angle would silently undo
   * the author's last resize.
   */
  static toAngular(sighting: Sighting): void {
    this.eachKeyframe(sighting, (shape, fovDeg) => ({
      ...shape,
      angular: ApparentSize.ofBounds(shape.bounds, ApparentSize.CANVAS_HEIGHT_PX, fovDeg)
    }))
  }

  /**
   * Re-derives every shape's drawn size from the angle it states — run just after reading a file,
   * which is what makes the angle authoritative rather than decorative.
   *
   * Resizes about the shape's own center: `bounds.x/y` is a position, which the angular extent
   * says nothing about and must not disturb. A polygon's `points` are relative to the box and are
   * rescaled with it, exactly as a handle drag would (see ShapeHandles.resizeShape) — otherwise an
   * outline would keep the old box's scale and drift off its own shape.
   *
   * Shapes with no stated angle are left exactly as drawn. That is a recording made before this
   * existed: its pixels are all it ever had, and inventing an angle for it here would be no more
   * informed than reading them at load time — which toAngular will do anyway the first time it is
   * saved.
   */
  static toBounds(sighting: Sighting): void {
    this.eachKeyframe(sighting, (shape, fovDeg) => {
      if (!shape.angular) return shape
      const { width, height } = ApparentSize.toBoundsSize(shape.angular, ApparentSize.CANVAS_HEIGHT_PX, fovDeg)
      const bounds = {
        x: shape.bounds.x + (shape.bounds.width - width) / 2,
        y: shape.bounds.y + (shape.bounds.height - height) / 2,
        width,
        height
      }
      if (shape.kind !== "polygon") return { ...shape, bounds }
      const scaleX = shape.bounds.width === 0 ? 1 : width / shape.bounds.width
      const scaleY = shape.bounds.height === 0 ? 1 : height / shape.bounds.height
      return { ...shape, bounds, points: shape.points.map(point => ({ x: point.x * scaleX, y: point.y * scaleY })) }
    })
  }

  /** Rewrites every shape of every keyframe through `transform`, going through the timeline's own
   * addKeyframe rather than mutating its keyframes in place — same reason anything else does: the
   * timeline owns its ordering and its per-source merge, and a shape rewritten behind its back
   * would be the one write in the codebase that doesn't. */
  private static eachKeyframe(sighting: Sighting, transform: (shape: Shape, fovDeg: number) => Shape): void {
    const { timeline } = sighting
    for (const keyframe of [...timeline.allKeyframes]) {
      const fovDeg = resolveObserverPoseAt(sighting, keyframe.t)?.fovDeg ?? this.DEFAULT_FOV_DEG
      timeline.addKeyframe(
        keyframe.t,
        keyframe.shapes.map(state => ({ ...state, shape: transform(state.shape, fovDeg) }))
      )
    }
  }
}
