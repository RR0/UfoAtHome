import type { Instrument } from "./Instrument.js"

/**
 * What a lens leaves sharp, and what it does not.
 *
 * This is the second thing an aperture decides, and the one that carries evidence. A photograph
 * that shows an object SHARP says the object stood inside the lens's depth of field, which is a
 * real bound on how far away it was — the same kind of statement this project already gets from
 * decor occlusion ("it passed behind that building, so it was further than 90 m") and from a
 * stated angular size. It also works in reverse and is worth as much: an object photographed as a
 * blur, in a picture whose horizon is sharp, was CLOSE.
 *
 * Everything here is the textbook thin-lens geometry, which is exact enough for the question being
 * asked. A point at distance `d`, through a lens of focal length `f` stopped to `N` and focused at
 * `s`, lands on the film as a disc rather than a point:
 *
 *   c = (f² / N) · |d − s| / (d · (s − f))
 *
 * and everything else below is that one expression rearranged. Note what it says about a phone:
 * with f = 5.7 mm, the numerator is a thirtieth of a 35 mm camera's, so almost nothing a phone
 * photographs is out of focus — which is why phone pictures of lights in the sky never show the
 * blur that would have bounded their distance, and why the same picture from a 200 mm lens would.
 */
export class DepthOfField {
  /**
   * How large a blur disc still reads as a point, as a fraction of the frame's DIAGONAL.
   *
   * The classic criterion, and it is about eyes rather than about lenses: a print viewed at arm's
   * length resolves about a fifteen-hundredth of its diagonal, so a disc smaller than that is
   * indistinguishable from a point no matter what the negative holds. It is what every published
   * depth-of-field table is computed with, which is what makes the numbers here checkable against
   * one.
   */
  static readonly ACCEPTABLE_DIAGONAL_FRACTION = 1 / 1500

  /** The largest blur that still counts as sharp on that instrument's own frame, millimetres. */
  static acceptableCircleMm(instrument: Instrument): number | undefined {
    const frame = instrument.frame
    if (!frame) return undefined
    return Math.hypot(frame.widthMm, frame.heightMm) * DepthOfField.ACCEPTABLE_DIAGONAL_FRACTION
  }

  /**
   * The diameter of the blur disc an object at `subjectM` lands as, millimetres on the frame.
   *
   * `focusM` is where the lens was focused; undefined means at infinity, which is where a camera
   * pointed at the sky sits and where every celestial thing in this scene actually is.
   */
  static circleOfConfusionMm(
    focalLengthMm: number,
    fNumber: number,
    subjectM: number,
    focusM?: number
  ): number {
    if (subjectM <= 0 || focalLengthMm <= 0 || fNumber <= 0) return 0
    const subjectMm = subjectM * 1000
    if (focusM === undefined) {
      // Focused at infinity: the disc is simply the aperture's own image, and it grows without
      // limit as the object comes closer.
      return (focalLengthMm * focalLengthMm) / (fNumber * subjectMm)
    }
    const focusMm = focusM * 1000
    if (focusMm <= focalLengthMm) return 0
    return (
      ((focalLengthMm * focalLengthMm) / fNumber) *
      (Math.abs(subjectMm - focusMm) / (subjectMm * (focusMm - focalLengthMm)))
    )
  }

  /**
   * The distance beyond which everything is sharp when the lens is focused at infinity — and, when
   * focused AT it, the distance from which everything to infinity is.
   *
   * The single number that says whether a device can bound anything at all. A phone's is about a
   * metre and a half: nothing it photographs in the sky is ever out of focus, so no phone picture
   * can put a near bound on a light. A 200 mm at f/8 has a hyperfocal of 170 metres, and a picture
   * from one that shows a sharp light says the light was further off than that.
   */
  static hyperfocalM(focalLengthMm: number, fNumber: number, acceptableCircleMm: number): number {
    if (acceptableCircleMm <= 0) return Number.POSITIVE_INFINITY
    return ((focalLengthMm * focalLengthMm) / (fNumber * acceptableCircleMm) + focalLengthMm) / 1000
  }

  /**
   * The nearest and furthest an object could have stood and still come out sharp — the bound a
   * photograph actually carries.
   *
   * `far` is Infinity once the lens is focused at or beyond its hyperfocal distance, which is the
   * ordinary case for anything pointed at the sky and the reason most UFO photographs bound
   * nothing at their far end.
   */
  static sharpRangeM(
    focalLengthMm: number,
    fNumber: number,
    acceptableCircleMm: number,
    focusM?: number
  ): { nearM: number; farM: number } {
    const hyperfocalM = DepthOfField.hyperfocalM(focalLengthMm, fNumber, acceptableCircleMm)
    if (focusM === undefined || !Number.isFinite(focusM)) {
      // Focused at infinity: sharp from half the hyperfocal distance outward, which is the same
      // statement as the hyperfocal's own definition.
      return { nearM: hyperfocalM, farM: Number.POSITIVE_INFINITY }
    }
    const focalM = focalLengthMm / 1000
    const near = (focusM * (hyperfocalM - focalM)) / (hyperfocalM + focusM - 2 * focalM)
    const far =
      focusM >= hyperfocalM ? Number.POSITIVE_INFINITY : (focusM * (hyperfocalM - focalM)) / (hyperfocalM - focusM)
    return { nearM: Math.max(0, near), farM: far }
  }
}
