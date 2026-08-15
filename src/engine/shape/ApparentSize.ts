/**
 * How big a real object of a given size, at a given distance, actually looks — the missing link
 * between what a witness reports ("gros comme une Dauphine, à 90 m") and the pixels a shape
 * occupies on the canvas.
 *
 * Without this every reproduction is drawn by eye, and eyes are wrong by a factor of 5 to 10:
 * apparent size is the one quantity in a testimony that can be checked arithmetically, so it is
 * the one that should never be guessed.
 */

/** The real-world size and distance a shape's on-screen size was derived from — kept ON the
 * shape (see BaseShape.physical) rather than only used once at authoring time, so a case file
 * documents WHY its object is that big and can be recomputed if the field of view ever changes.
 * Both are what the witness reported, not what the drawing needs; `bounds` stays the single
 * source of truth for rendering/hit-testing (see ApparentSize.widthPx, which derives one from
 * the other). */
export interface PhysicalExtent {
  /** The object's real width, in meters, along the axis the witness was looking across. */
  sizeM: number
  /** How far the object was from the witness, in meters. */
  distanceM: number
}

export class ApparentSize {
  /** The Moon's mean angular diameter — the reference every witness has actually seen, and the
   * only unit of apparent size most testimonies come with ("gros comme la Lune"). */
  static readonly MOON_ANGULAR_WIDTH_DEG = 0.5237

  /** How wide `extent` really looks, in degrees. Exact for any distance — the small-angle
   * approximation is deliberately not used, since close encounters (Wilcox touched his object
   * from 30 cm away) are precisely where it breaks down. */
  static angularWidthDeg(extent: PhysicalExtent): number {
    return (2 * Math.atan(extent.sizeM / (2 * extent.distanceM)) * 180) / Math.PI
  }

  /**
   * How many canvas pixels wide `extent` should be drawn, on a canvas `canvasHeightPx` tall
   * showing a vertical field of view of `fovDeg` (the perspective camera's own convention, see
   * ObserverPose.fovDeg — Three.js's `fov` is vertical too, which is why height, not width, is
   * what this scales against).
   *
   * Exact for an object centered in the view, which is what a witness looking AT something gives
   * you; an object near the frame's edge is stretched further by the perspective projection
   * itself, an error that stays under a percent well beyond where a testimony's own "about 3
   * meters, about 90 meters away" is meaningful.
   */
  static widthPx(extent: PhysicalExtent, canvasHeightPx: number, fovDeg: number): number {
    return (canvasHeightPx * extent.sizeM) / (2 * extent.distanceM * Math.tan((fovDeg * Math.PI) / 360))
  }

  /** Inverse of widthPx's own projection: what a pixel width on this canvas actually subtends.
   * Used to tell an author what they just drew ("110 px, i.e. 19 degrees, i.e. 37 full Moons"),
   * which is usually all it takes to see that it can't be right. */
  static pxToDeg(px: number, canvasHeightPx: number, fovDeg: number): number {
    return (2 * Math.atan((px * Math.tan((fovDeg * Math.PI) / 360)) / canvasHeightPx) * 180) / Math.PI
  }

  /** How many full Moons wide something of `angularWidthDeg` is — the comparison a reader can
   * actually picture, and the quickest sanity check on a reproduction. */
  static inMoons(angularWidthDeg: number): number {
    return angularWidthDeg / ApparentSize.MOON_ANGULAR_WIDTH_DEG
  }

  /** Interpolates a physical extent, so an object that visibly recedes over the recording keeps
   * documenting a real distance at every instant rather than only at its keyframes. Returns
   * undefined unless BOTH ends have one — a half-documented pair would be worse than none, since
   * it would silently invent a distance for the end that never had one. */
  static lerp(from: PhysicalExtent | undefined, to: PhysicalExtent | undefined, fraction: number): PhysicalExtent | undefined {
    if (!from || !to) return undefined
    return {
      sizeM: from.sizeM + (to.sizeM - from.sizeM) * fraction,
      distanceM: from.distanceM + (to.distanceM - from.distanceM) * fraction
    }
  }
}
