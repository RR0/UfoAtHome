/**
 * How a phone develops what its sensor records: not as a raw file, a straight line that stops at full, but the way computational
 * photography does by default (Google's HDR+, Apple's Smart HDR, both on unless turned off).
 *
 * HDR+ captures a burst at one exposure "set low enough to avoid blowing out highlights", merges it so that the shadows lose their noise,
 * then tone-maps the result, lifting the shadows and the middle tones (Hasinoff et al., "Burst photography for high dynamic range and
 * low-light imaging on mobile cameras", SIGGRAPH Asia 2016). So a phone's exposure is held down by what it must not burn out — its
 * brightest zone, or at night the most its sensor's gain can give — and its development brings the scene's mean back up to a middle
 * grey. Where nothing held the exposure down (a grey sky round a veiled Sun), there is nothing to bring back and the picture is the
 * sensor's straight line. Where something did (a night, a lamp in the frame), the shadows are lifted, and with them whatever faint light
 * lies on a dark ground: the ghost a lens throws of a lamp.
 *
 * Drawn as one global curve of the sensor's own linear signal x (0 to full), `log(1 + a·x) / log(1 + a)`, its strength `a` chosen so the
 * metered mean comes out a middle grey, and capped. A device's real tone mapping is local and its own; this is its shape, not its detail.
 */
export class PhoneDevelopment {
  /**
   * The most a phone lifts: ASSUMED, a strength of 32, which raises the deepest shadows some nine times (a little over three stops) — what
   * a phone's night video shows of a lamplit road, its sky dark grey rather than black.
   */
  static readonly MAX_STRENGTH = 32
  /** Where a raw sensor puts a middle grey: 0.18 of full at an exposure of one (see RecordingMedium). */
  static readonly MID_GREY = 0.18

  /** What the curve of strength `a` shows of a sensor's linear signal `x`, 0 to 1. */
  static shown(x: number, a: number): number {
    const signal = Math.min(1, Math.max(0, x))
    return a < 1e-3 ? signal : Math.log(1 + a * signal) / Math.log(1 + a)
  }

  /**
   * The strength that develops a scene whose metered mean lies at `meanSignal` on the sensor (a share of full) to a middle grey: none
   * when it already lies there or above, MAX_STRENGTH when even that does not reach it.
   */
  static strengthFor(meanSignal: number): number {
    if (!(meanSignal > 0) || meanSignal >= PhoneDevelopment.MID_GREY) return 0
    if (PhoneDevelopment.shown(meanSignal, PhoneDevelopment.MAX_STRENGTH) <= PhoneDevelopment.MID_GREY) return PhoneDevelopment.MAX_STRENGTH
    let low = 0, high = PhoneDevelopment.MAX_STRENGTH
    for (let step = 0; step < 40; step++) {
      const middle = (low + high) / 2
      if (PhoneDevelopment.shown(meanSignal, middle) < PhoneDevelopment.MID_GREY) low = middle
      else high = middle
    }
    return (low + high) / 2
  }
}
