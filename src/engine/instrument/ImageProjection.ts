import type { Instrument, ProjectionKind } from "./Instrument.js"
import { ApparentSize } from "../shape/ApparentSize.js"
import type { AngularExtent, PhysicalExtent } from "../shape/ApparentSize.js"

const DEG_TO_RAD = Math.PI / 180
const RAD_TO_DEG = 180 / Math.PI

/**
 * The mapping between an angle in the observer's field of view and a pixel on the image, for one
 * instrument looking through one field of view onto one canvas.
 *
 * An instance rather than a pile of functions taking the same three arguments: a projection is a
 * *setting* — this canvas, this field of view, this instrument — and every conversion made under it
 * has to agree with every other. Passing the three around separately is how they stop agreeing.
 *
 * Both mappings pin the same landmark: the canvas's full height spans exactly `fovDeg`. They
 * therefore disagree everywhere else, and by design — the rectilinear one packs the centre and
 * spreads the edges, the equidistant one is uniform. A shape near the centre of the frame is about
 * 10% larger under the equidistant mapping for the same stated angle, which is not a discrepancy to
 * reconcile but the whole difference between an eye and a lens.
 */
export class ImageProjection {
  /** Pixels per radian at the centre of the image, which for the equidistant mapping is pixels per
   * radian everywhere. */
  private readonly focalPx: number

  constructor(
    readonly kind: ProjectionKind,
    readonly canvasHeightPx: number,
    readonly fovDeg: number
  ) {
    const halfFovRad = (fovDeg * DEG_TO_RAD) / 2
    this.focalPx = kind === "equidistant" ? canvasHeightPx / 2 / halfFovRad : canvasHeightPx / 2 / Math.tan(halfFovRad)
  }

  /** The projection an instrument produces on this project's own canvas at this field of view. */
  static of(instrument: Instrument, canvasHeightPx: number, fovDeg: number): ImageProjection {
    return new ImageProjection(instrument.projection, canvasHeightPx, fovDeg)
  }

  /**
   * How many pixels an object subtending `deg` occupies.
   *
   * Measured across the centre of the image in the rectilinear case — an object drawn off-axis is
   * stretched further by the projection itself, which is exactly the effect the equidistant mapping
   * exists to avoid and the reason a lens is not an eye. The 2D overlay this feeds has no way to
   * express that stretch anyway (it draws axis-aligned boxes), so for a camera the numbers here are
   * right at the centre and progressively small towards the edges, matching what the old code did.
   */
  degToPx(deg: number): number {
    const rad = deg * DEG_TO_RAD
    return this.kind === "equidistant" ? this.focalPx * rad : 2 * this.focalPx * Math.tan(rad / 2)
  }

  /** The exact inverse: what a pixel width on this image actually subtends. */
  pxToDeg(px: number): number {
    return this.kind === "equidistant"
      ? (px / this.focalPx) * RAD_TO_DEG
      : 2 * Math.atan(px / (2 * this.focalPx)) * RAD_TO_DEG
  }

  /**
   * How far from the image's centre a direction `deg` off-axis falls, in pixels.
   *
   * A POSITION, not an extent — and the two are different measures even under the same projection:
   * an extent straddles the axis (`2f·tan(Δ/2)` for a lens), a radius runs from it (`f·tan θ`).
   * Conflating them is a factor-of-two error near the edges.
   *
   * This is what makes a change of instrument move a shape rather than merely resize it. A pixel
   * position only means a direction once a projection is named, so when the projection changes the
   * pixels have to follow — otherwise an object drawn in several parts (a fuselage and its row of
   * windows) comes apart, each part resized about a centre that no longer stands for where the
   * witness was looking.
   */
  angleDegToRadiusPx(deg: number): number {
    const rad = deg * DEG_TO_RAD
    return this.kind === "equidistant" ? this.focalPx * rad : this.focalPx * Math.tan(rad)
  }

  /**
   * Half of what the image takes in ACROSS, degrees, for a frame `aspect` times wider than it is
   * tall (see Instruments.aspectOf).
   *
   * The field is stated vertically everywhere in this project because the height is the invariant
   * (see the class comment). The horizontal half-angle is what a map needs instead: the wedge of
   * ground a witness had in front of them is an AZIMUTH, and how far the frame reaches to the sides
   * is exactly what decides whether something they described could have been in it.
   *
   * A radius, not an extent, and derived through the projection rather than by scaling the vertical
   * field: a lens 60 degrees tall on a 16:9 frame reaches 92 degrees across, not 107 as
   * `fov·aspect` would say, because a rectilinear image spreads its edges. For an eye, whose
   * mapping is uniform, `fov·aspect` happens to be right — and quietly using it for both is how a
   * camera's cone ends up 15 degrees too wide.
   */
  halfWidthAngleDeg(aspect: number): number {
    return this.radiusPxToAngleDeg((this.canvasHeightPx * aspect) / 2)
  }

  /** The inverse: which direction a point that far from the centre of the image stands for. */
  radiusPxToAngleDeg(px: number): number {
    return this.kind === "equidistant" ? (px / this.focalPx) * RAD_TO_DEG : Math.atan(px / this.focalPx) * RAD_TO_DEG
  }

  /** What a drawn box subtends, on both axes — how an author's freehand drag becomes the
   * recording's own unit before it is written to a file. */
  ofBounds(size: { width: number; height: number }): AngularExtent {
    return { widthDeg: this.pxToDeg(size.width), heightDeg: this.pxToDeg(size.height) }
  }

  /** How big a stated angular extent has to be drawn here. Applied at load time, which is what
   * makes the stated angle — not the pixel box saved next to it — the thing that survives a change
   * of canvas, of field of view, or of instrument. */
  toBoundsSize(angular: AngularExtent): { width: number; height: number } {
    return { width: this.degToPx(angular.widthDeg), height: this.degToPx(angular.heightDeg) }
  }

  /** How many pixels a real object of that size, at that distance, actually covers here — the
   * authoring aid, and the only place meters ever enter a drawing (see
   * SightingEditorElement.applySizeHypothesis, which forgets them immediately afterwards). */
  widthPx(extent: PhysicalExtent): number {
    return this.degToPx(ApparentSize.angularWidthDeg(extent))
  }
}
