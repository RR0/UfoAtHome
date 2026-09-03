/**
 * How far the sky itself slid while the shutter was open, and how many instants it takes to draw
 * that.
 *
 * A photograph is not a moment (see UfoElement.exposureInstants, which already draws the OBJECT
 * that way) and the sky is not a backdrop: the Earth turns under it at a fifteenth of a degree per
 * minute, so a pose long enough leaves every star as an ARC and not a point. That is the picture a
 * witness on a tripod comes back with, and one of the things a photograph of "lights that moved"
 * most often turns out to be — the lights held still and the camera did not.
 *
 * Below a pixel of drift there is nothing to draw and no reason to pay for it: an eighth of a second
 * moves a star a thousandth of a degree. So this states, in pixels, what the sky did — and the
 * renderer asks it before deciding whether a frame is one instant or many.
 */
export class SkyDrift {
  /**
   * The rate itself: a full turn per SIDEREAL day, not per solar one.
   *
   * 86 164.0905 s and not 86 400 — the four minutes between the two are the Earth's own progress
   * around the Sun, and it is the stars, not the Sun, that a long pose draws. Using the solar day
   * would put a five-minute trail 1.1 % short, which is small and is still a made-up number where a
   * measured one exists.
   */
  static readonly DEG_PER_SECOND = 360 / 86164.0905

  /** How far a star on the celestial equator moved in that many seconds. The equator is the fastest
   * any of them goes — everything nearer a pole traces a shorter arc (by cos of its declination),
   * and the pole star itself barely moves at all — so this is the drift of the LONGEST trail in the
   * frame, which is exactly what deciding how finely to sample it turns on. */
  static degOver(exposureSeconds: number): number {
    return Math.max(0, exposureSeconds) * SkyDrift.DEG_PER_SECOND
  }

  /**
   * How many instants that pose has to be drawn at.
   *
   * One per pixel of the longest trail: consecutive instants then land on touching pixels and the
   * arc comes out continuous. Drawing fewer leaves it DASHED — the same failure the 2D shape
   * accumulation was caught in at two dozen steps, and the reason that one settled on 48.
   *
   * One, meaning no accumulation at all, whenever the sky moved less than a pixel: there is nothing
   * to see, and a scene must never pay for a pass that cannot show (the same rule the depth-of-field
   * pass is gated by).
   */
  static instants(exposureSeconds: number, degPerPixel: number): number {
    if (!(degPerPixel > 0)) return 1
    const pixels = SkyDrift.degOver(exposureSeconds) / degPerPixel
    if (pixels < 1) return 1
    return Math.min(SkyDrift.MAX_INSTANTS, Math.max(2, Math.ceil(pixels)))
  }

  /**
   * However long the pose, this many drawings of it — and unlike the shape accumulation's own cap,
   * this one is a real ceiling on COST: each instant here is a whole sky recomputed (Sun, Moon,
   * planets, every star transformed) and drawn again, not one shape painted a second time. Measured
   * on a 1174 x 784 canvas: about 16 ms an instant, so the most expensive frame this allows takes
   * a second. An ordinary frame never comes near it — a snapshot renders in a tenth of a
   * millisecond and asks for one instant.
   *
   * Where the cap starts to show, measured rather than guessed: at 1800 s the 64 instants land
   * 3.4 px apart and a first-magnitude trail was still unbroken end to end (206 px long); at 3600 s
   * they land 6.8 px apart and it had beaded into separate dots. What makes that acceptable rather
   * than a defect is the other measurement — by then the trail is barely there at all. Its peak
   * fell from 181 (snapshot) to 52 at 600 s, 39 at 1800 s and 35 at 3600 s against a sky of 30.5,
   * which is what a real hour-long trail does too: the light of one star is spread over four
   * hundred pixels, and this project draws what the pose really collected rather than what would
   * read well.
   */
  static readonly MAX_INSTANTS = 64
}
