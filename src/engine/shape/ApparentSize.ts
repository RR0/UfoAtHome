/**
 * The one size a testimony actually contains — how much of the witness's field of view the thing
 * filled — and the arithmetic for turning that into the pixels a shape occupies on the canvas.
 *
 * A witness never perceives meters. They perceive an angle: the object covered a thumbnail at
 * arm's length, or a fifth of the windshield, or two full Moons. Everything else they say about
 * its size — "about 30 m long", "a hundred feet" — is an INFERENCE they made from a distance they
 * also could not perceive, and the two errors multiply. That is why nothing in a recording stores
 * a real size or a real distance (see BaseShape.angular, and PhysicalExtent's own comment below):
 * the angle is the observation, the meters are a conclusion, and a format that stores conclusions
 * as if they were observations cannot later be told which was which.
 *
 * Apparent size is also the one quantity in a testimony that can be checked arithmetically, so it
 * is the one that should never be drawn by eye — eyes are wrong about it by a factor of five to
 * ten.
 */

/**
 * How big something looked, in degrees of arc — the recording's own unit of size, and the only one
 * that is a perception rather than a deduction.
 *
 * Both axes, not just a width: a cigar seen end-on and the same cigar seen broadside subtend very
 * different heights for the same width, and which one the witness saw is part of what they
 * reported.
 */
export interface AngularExtent {
  /** How wide it looked, in degrees of arc. */
  widthDeg: number
  /** How tall it looked, in degrees of arc. */
  heightDeg: number
}

/**
 * A real size and a real distance, in meters — **never** something a recording stores, only ever
 * something derived from one (see SizeEstimate).
 *
 * Kept as a type because the arithmetic below still needs to name the pair: an authoring aid lets
 * a user try "suppose it was 30 m at 500 m" to size a drawing, and the estimator turns an
 * occlusion inequality back into meters. Neither of those is testimony, and neither is written to
 * a case file.
 */
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

  /** The fixed drawing space every shape's `bounds` is expressed in — see UfoElement's own canvas,
   * which is 640x360 whatever CSS size it is displayed at. Named here rather than left implicit in
   * the template because the angular extent is defined AGAINST it: a width in pixels only means an
   * angle once you know how many pixels the field of view spans. */
  static readonly CANVAS_WIDTH_PX = 640
  static readonly CANVAS_HEIGHT_PX = 360

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

  /** Inverse of pxToDeg — what an angle spans on this canvas. This is the direction that actually
   * matters at load time, since the file states the angle and the drawing has to follow it. */
  static degToPx(deg: number, canvasHeightPx: number, fovDeg: number): number {
    return (canvasHeightPx * Math.tan((deg * Math.PI) / 360)) / Math.tan((fovDeg * Math.PI) / 360)
  }

  /** How many full Moons wide something of `angularWidthDeg` is — the comparison a reader can
   * actually picture, and the quickest sanity check on a reproduction. */
  static inMoons(angularWidthDeg: number): number {
    return angularWidthDeg / ApparentSize.MOON_ANGULAR_WIDTH_DEG
  }

  /** What a drawn box actually subtends, on both axes — the conversion that turns an author's
   * freehand drag into the recording's own unit before it is written to a file. */
  static ofBounds(size: { width: number; height: number }, canvasHeightPx: number, fovDeg: number): AngularExtent {
    return {
      widthDeg: ApparentSize.pxToDeg(size.width, canvasHeightPx, fovDeg),
      heightDeg: ApparentSize.pxToDeg(size.height, canvasHeightPx, fovDeg)
    }
  }

  /** The exact inverse: how big a stated angular extent has to be drawn here. Applied at load
   * time, which is what makes the stated angle — not the pixel box saved next to it — the thing
   * that survives a change of canvas or of field of view. */
  static toBoundsSize(angular: AngularExtent, canvasHeightPx: number, fovDeg: number): { width: number; height: number } {
    return {
      width: ApparentSize.degToPx(angular.widthDeg, canvasHeightPx, fovDeg),
      height: ApparentSize.degToPx(angular.heightDeg, canvasHeightPx, fovDeg)
    }
  }

  /** Interpolates an angular extent, so an object that visibly grows as it closes keeps stating a
   * real apparent size at every instant rather than only at its keyframes. Returns undefined
   * unless BOTH ends have one — a half-documented pair would silently invent a size for the end
   * that never had one. */
  static lerpAngular(from: AngularExtent | undefined, to: AngularExtent | undefined, fraction: number): AngularExtent | undefined {
    if (!from || !to) return undefined
    return {
      widthDeg: from.widthDeg + (to.widthDeg - from.widthDeg) * fraction,
      heightDeg: from.heightDeg + (to.heightDeg - from.heightDeg) * fraction
    }
  }

  /** How big something subtending `widthDeg` must really be, if it was `distanceM` away. The
   * inequality-to-meters step: an occlusion says "at least this far", this says what that implies
   * about its size. */
  static sizeMAt(distanceM: number, widthDeg: number): number {
    return 2 * distanceM * Math.tan((widthDeg * Math.PI) / 360)
  }

  /** The reverse: how far something `sizeM` wide must have been to look `widthDeg` wide. Lets a
   * size interval, once established, be read back as a distance at every other instant of the
   * recording — where the object subtends something else entirely. */
  static distanceMAt(sizeM: number, widthDeg: number): number {
    return sizeM / (2 * Math.tan((widthDeg * Math.PI) / 360))
  }
}
