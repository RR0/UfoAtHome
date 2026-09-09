import { ApparentSize } from "../shape/ApparentSize.js"
import { ImageProjection } from "../instrument/ImageProjection.js"
import type { Shape, ShapeAim, ShapeBounds } from "../shape/Shape.js"
import { Sighting, resolveObserverPoseAt } from "../model/Sighting.js"
import type { ObserverPose } from "../model/ObserverTrack.js"
import { Instruments } from "../instrument/Instrument.js"
import type { Instrument } from "../instrument/Instrument.js"

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
 * still draws each instant at the size its own angle implies — and through the sighting's own
 * INSTRUMENT, since an eye and a camera lens turn the same angle into different pixels (see
 * ImageProjection).
 */
export class SightingShapes {
  /** What a recording without any observer track is assumed to have been seen through: its own
   * INSTRUMENT's field (see Instruments.fieldOfViewDeg), which for an eye is the unaided sixty
   * degrees and for a 50 mm lens is twenty-seven. Only ever reached by a file too old to carry a
   * witnessTrack, or one that never stated a pose. */
  static fovOf(sighting: Sighting, t: number): number {
    return resolveObserverPoseAt(sighting, t)?.fovDeg ?? Instruments.fieldOfViewDeg(sighting.instrument)
  }

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
    this.eachKeyframe(sighting, (shape, projection) => ({ ...shape, angular: projection.ofBounds(shape.bounds) }))
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
    this.eachKeyframe(sighting, (shape, projection) => {
      if (!shape.angular) return shape
      const { width, height } = projection.toBoundsSize(shape.angular)
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

  /**
   * Fills in every shape's DIRECTION from where it is currently drawn and where the witness was
   * looking — run just before writing a file, alongside toAngular, and unconditional for the same
   * reason: between load and save `bounds` is what every editing gesture moved, so the drawing is
   * the newer statement.
   *
   * Skipped for a keyframe whose pose states no heading. There is nothing to measure an azimuth
   * from, and a shape aimed from an assumed north would be worse than one aimed from nothing.
   */
  static toAim(sighting: Sighting): void {
    this.eachKeyframe(sighting, (shape, projection, pose) => {
      const aim = this.aimFrom(sighting, projection, pose, shape.bounds)
      return aim ? { ...shape, aim } : shape
    })
  }

  /**
   * The direction a box drawn at `bounds` states at instant `t` — what an editing gesture has to
   * write beside the box it moved, so that the scene, which stands a shape along its stated
   * direction, and the overlay, which draws the box, keep saying the same thing between two
   * saves. Undefined when the pose states no heading, for toAim's own reason.
   */
  static aimOf(sighting: Sighting, t: number, bounds: ShapeBounds): ShapeAim | undefined {
    const projection = ImageProjection.of(sighting.instrument, ApparentSize.CANVAS_HEIGHT_PX, this.fovOf(sighting, t))
    return this.aimFrom(sighting, projection, resolveObserverPoseAt(sighting, t), bounds)
  }

  private static aimFrom(
    sighting: Sighting,
    projection: ImageProjection,
    pose: ObserverPose | undefined,
    bounds: ShapeBounds
  ): ShapeAim | undefined {
    if (pose?.headingDeg === undefined) return undefined
    const centre = this.frameCentre(sighting)
    const offAxisX = projection.radiusPxToAngleDeg(bounds.x + bounds.width / 2 - centre.x)
    const offAxisY = projection.radiusPxToAngleDeg(centre.y - (bounds.y + bounds.height / 2))
    return { azimuthDeg: (((pose.headingDeg + offAxisX) % 360) + 360) % 360, altitudeDeg: pose.pitchDeg + offAxisY }
  }

  /**
   * Re-derives every shape's drawn POSITION from the direction it states — run just after reading a
   * file, which is what makes the direction authoritative rather than decorative, exactly as
   * toBounds does for the stated size.
   *
   * This is the step that lets a witness turn their head. Without it a recording only ever said
   * "so many degrees left of wherever I was facing", so editing the pose swung the phenomenon
   * around the sky along with the camera — and a thing described as sitting on the ground went with
   * the witness when they turned away from it.
   *
   * A direction more than a right angle off the axis is not on this canvas at all, and is placed
   * frankly off it rather than through a tangent that would fold it back into view. That is not a
   * failure: it is a witness who has looked away, and it is the whole reason this exists.
   */
  static toPosition(sighting: Sighting): void {
    this.eachKeyframe(sighting, (shape, projection, pose) => {
      if (!shape.aim || pose?.headingDeg === undefined) return shape
      const centre = this.frameCentre(sighting)
      const offAxisX = this.shortestArc(shape.aim.azimuthDeg - pose.headingDeg)
      const offAxisY = shape.aim.altitudeDeg - pose.pitchDeg
      const x = centre.x + this.offAxisPx(projection, offAxisX) - shape.bounds.width / 2
      const y = centre.y - this.offAxisPx(projection, offAxisY) - shape.bounds.height / 2
      return { ...shape, bounds: { ...shape.bounds, x, y } }
    })
  }

  /** Where the axis of the image falls, in the pixels every shape's bounds are expressed in. */
  private static frameCentre(sighting: Sighting): { x: number; y: number } {
    return {
      x: Instruments.frameWidthPx(sighting.instrument, ApparentSize.CANVAS_HEIGHT_PX) / 2,
      y: ApparentSize.CANVAS_HEIGHT_PX / 2
    }
  }

  /** Shortest way round: 359 degrees to 1 is two degrees, not three hundred and fifty-eight. */
  private static shortestArc(deg: number): number {
    return ((((deg % 360) + 540) % 360) - 180)
  }

  /** How far off the axis that direction falls, pixels — pushed frankly off the canvas past the
   * quarter turn where no flat projection has an answer (a rectilinear one's tangent would fold it
   * back into view, pointing behind the witness at something in front of them). */
  private static offAxisPx(projection: ImageProjection, offAxisDeg: number): number {
    if (Math.abs(offAxisDeg) >= SightingShapes.OFF_CANVAS_DEG) {
      return Math.sign(offAxisDeg) * SightingShapes.OFF_CANVAS_PX
    }
    return projection.angleDegToRadiusPx(offAxisDeg)
  }

  /** Past this far off the axis, a direction is simply not in the picture. */
  private static readonly OFF_CANVAS_DEG = 89
  /** Far enough outside any canvas this project draws that nothing of the shape reaches it. */
  private static readonly OFF_CANVAS_PX = 100000

  /**
   * Re-expresses a whole recording for a different instrument — what has to happen the moment the
   * declared instrument changes, and what the case files themselves went through when they stopped
   * being rendered as photographs.
   *
   * Sizes follow from the stated angles, as always. POSITIONS have to move too, and that is the
   * part it would be easy to miss: a pixel only names a direction once a projection is named, so a
   * shape 9 degrees off-axis sits 371 px across a lens's image and 375 px across an eye's. Leaving
   * positions alone while resizing each shape about its own old centre is exactly how an object
   * drawn in several parts comes apart — the fuselage grows, its windows stay put.
   *
   * Radially, about the centre of the image: an angle off-axis is an angle off-axis whichever way
   * the point lies, and only its distance from the axis is projection-dependent.
   */
  static reproject(sighting: Sighting, previous: Instrument, fieldBefore?: ReadonlyMap<number, number>): void {
    // The two frames are not the same size. A change of instrument is a change of FORMAT as well as
    // of projection — the same silicon held upright is 270 pixels wide where an eye's frame is 640 —
    // and every stored bound is measured from its own frame's left edge. So a shape is taken out of
    // the old centre and put back around the new one; leaving the centre where it was would slide
    // every shape sideways by half the difference, which is a testimony being edited by a picker.
    // The HEIGHT never moves (see Instruments.frameWidthPx), so nothing shifts vertically.
    const fromHalfWidth = Instruments.frameWidthPx(previous, ApparentSize.CANVAS_HEIGHT_PX) / 2
    const toHalfWidth = Instruments.frameWidthPx(sighting.instrument, ApparentSize.CANVAS_HEIGHT_PX) / 2
    const halfHeight = ApparentSize.CANVAS_HEIGHT_PX / 2
    for (const keyframe of [...sighting.timeline.allKeyframes]) {
      // TWO fields, not one, and getting this wrong moved every off-centre shape in the sky. An
      // instrument brings its own field with it (see Instruments.fieldOfViewDeg), so by the time
      // this runs the recording may already state a different one than the pixels were drawn under.
      // The old pixels have to be read under the OLD field and written under the new: read both
      // under the new one and a shape 19 degrees off-axis comes out at 9, which is the reconstruction
      // quietly moving what a witness drew.
      const toFovDeg = this.fovOf(sighting, keyframe.t)
      const fromFovDeg = fieldBefore?.get(keyframe.t) ?? toFovDeg
      const from = ImageProjection.of(previous, ApparentSize.CANVAS_HEIGHT_PX, fromFovDeg)
      const to = ImageProjection.of(sighting.instrument, ApparentSize.CANVAS_HEIGHT_PX, toFovDeg)
      sighting.timeline.addKeyframe(
        keyframe.t,
        keyframe.shapes.map(state => {
          const { bounds } = state.shape
          const dx = bounds.x + bounds.width / 2 - fromHalfWidth
          const dy = bounds.y + bounds.height / 2 - halfHeight
          const radius = Math.hypot(dx, dy)
          const scale = radius === 0 ? 1 : to.angleDegToRadiusPx(from.radiusPxToAngleDeg(radius)) / radius
          const moved = {
            ...bounds,
            x: toHalfWidth + dx * scale - bounds.width / 2,
            y: halfHeight + dy * scale - bounds.height / 2
          }
          return { ...state, shape: { ...state.shape, bounds: moved } }
        })
      )
    }
    // Now that every shape sits where the new projection puts it, its size follows from its own
    // stated angle — about the centre it has just been moved to.
    this.toBounds(sighting)
  }

  /** Rewrites every shape of every keyframe through `transform`, going through the timeline's own
   * addKeyframe rather than mutating its keyframes in place — same reason anything else does: the
   * timeline owns its ordering and its per-source merge, and a shape rewritten behind its back
   * would be the one write in the codebase that doesn't. */
  private static eachKeyframe(
    sighting: Sighting,
    transform: (shape: Shape, projection: ImageProjection, pose: ObserverPose | undefined) => Shape
  ): void {
    const { timeline } = sighting
    for (const keyframe of [...timeline.allKeyframes]) {
      const pose = resolveObserverPoseAt(sighting, keyframe.t)
      const fovDeg = this.fovOf(sighting, keyframe.t)
      const projection = ImageProjection.of(sighting.instrument, ApparentSize.CANVAS_HEIGHT_PX, fovDeg)
      timeline.addKeyframe(
        keyframe.t,
        keyframe.shapes.map(state => ({ ...state, shape: transform(state.shape, projection, pose) }))
      )
    }
  }
}
