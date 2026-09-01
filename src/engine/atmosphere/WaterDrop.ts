/**
 * One raindrop, and what a ray of sunlight does inside it.
 *
 * The water counterpart of IceCrystal, and the comparison is the point. A halo needs a whole
 * population of orientations because a hexagonal prism does different things depending on which way
 * it is turned; a raindrop is a SPHERE, so it has no orientation at all, and everything a shower can
 * put in the sky follows from one number — how far off centre the ray struck. That is why a rainbow
 * is always the same size wherever and whenever it appears, while a halo display is a different
 * display every hour.
 *
 * Nothing here is placed either. A ray is refracted in by Snell's law, bounced around inside by
 * Fresnel's, and let out; do that for every impact parameter across the drop and the whole sight
 * comes out of the answer. The bright bow at forty-two degrees is where the rays that bounced ONCE
 * pile up, and they pile up because the angle they leave at has a minimum there — light from a whole
 * range of impact parameters arriving in almost the same direction. The fainter bow further out,
 * with its colours the other way round, is the same thing for rays that bounced TWICE. The dark band
 * between them is the one part of the sky neither can reach. NONE of those words appear below.
 *
 * WHAT IS NOT HERE is the wave. Geometric optics has nothing to say about the supernumerary arcs
 * crowded inside a bright primary, about the glory, or about the corona round a low Sun seen through
 * a thin water cloud, all of which are interference, and it makes the bow's own bright edge
 * infinitely sharp instead of about a degree wide. What it does get right is where the bows are,
 * which way their colours run, how much brighter the first is than the second, and that the sky
 * between them is dark — and those are the things a witness describes.
 */

import { Fresnel } from "./Fresnel.js"

/** One way light left a drop: how far round from the direction it came in, and how much of the
 * incident ray went that way. */
export interface DropRay {
  /**
   * How many chords the light travelled inside the drop, in Debye's numbering: 0 for light that
   * never got in and simply bounced off the outside, 1 for light that went straight through, 2 for
   * light that reflected once off the far inside — the primary bow — and 3 for the secondary. The
   * numbering is worth keeping rather than counting bounces, because it is how every treatment of
   * this since Debye names the terms, and because "the p = 2 term" is the primary rainbow and
   * nothing else.
   */
  chords: number
  /** The angle between the direction the light was going when it arrived and the direction it left
   * in, folded into 0 to π: 0 is straight on, π is straight back. Radians. */
  scatteringAngle: number
  /** The fraction of the incident ray that left this way. */
  weight: number
}

/**
 * The refractive index of water as a function of wavelength.
 *
 * The whole colour of a rainbow is this one function not being constant, and it is a SMALLER
 * variation than ice's — about seven parts in a thousand across the visible, against ice's eight —
 * which is not why the bow is more colourful than a halo. That is geometry: the bow's angle changes
 * far faster with the index than a halo's does, so the same small spread of index throws the
 * colours nearly two degrees apart instead of two thirds of one.
 *
 * Fitted in Cauchy's form (n = A + B/λ²) through two measured indices at 20 °C, at the same two
 * wavelengths the ice fit is anchored on, so that a claim about one substance and a claim about the
 * other rest on the same kind of number.
 */
export class WaterRefraction {
  /** The wavelengths the two anchoring indices were measured at, nanometres. */
  static readonly RED_NM = 656.3
  static readonly BLUE_NM = 435.8

  private static readonly ANCHOR_RED = 1.3312
  private static readonly ANCHOR_BLUE = 1.3404

  /** Cauchy's B, in nm², from the two anchors: the entire dispersion of water in one number. */
  private static readonly B =
    (WaterRefraction.ANCHOR_BLUE - WaterRefraction.ANCHOR_RED) /
    (1 / (WaterRefraction.BLUE_NM * WaterRefraction.BLUE_NM) -
      1 / (WaterRefraction.RED_NM * WaterRefraction.RED_NM))

  private static readonly A =
    WaterRefraction.ANCHOR_RED - WaterRefraction.B / (WaterRefraction.RED_NM * WaterRefraction.RED_NM)

  static indexAt(wavelengthNm: number): number {
    return WaterRefraction.A + WaterRefraction.B / (wavelengthNm * wavelengthNm)
  }
}

/**
 * A spherical drop of a stated refractive index, ready to be shot at.
 *
 * SPHERICAL, and that is an assumption rather than a fact: a falling drop bigger than about a
 * millimetre is flattened by the air it is falling through, and the flattening is what makes the
 * top of a heavy shower's bow brighter than its sides and can leave the red edge of a very large
 * drop's bow slightly out of place. Drizzle and the drops of an ordinary shower are round to within
 * a per cent, which is the case this reproduces.
 *
 * No size, either, and that is not an omission: geometric optics has no length in it, so a fog
 * droplet and a thunderstorm drop scatter light into exactly the same angles. Size only enters
 * through the wave — see the class comment — which is why a fog bow is broad and white while a
 * shower's is narrow and coloured, and why nothing below can tell them apart.
 */
export class WaterDrop {
  /**
   * How many chords a ray is followed for. Four is enough to include both bows anybody sees and the
   * two nobody does: the third and fourth bows stand round the SUN rather than opposite it, at 40
   * and 45 degrees from it, and are so faint against the glare there that the first photograph of a
   * natural one was taken in 2011.
   */
  static readonly MAX_CHORDS = 4

  private index = 1.333

  /** The index this drop refracts by — one colour at a time, since that is what makes a bow
   * coloured at all. */
  set refractiveIndex(index: number) {
    this.index = index
  }

  /**
   * Follows one ray through the drop and reports every way light left it.
   *
   * `sineIncidence` is the impact parameter as a fraction of the drop's radius, which is also the
   * sine of the angle the ray makes with the surface where it strikes — the two are the same number
   * for a sphere, and that identity is the whole reason this is a one-parameter problem.
   *
   * Returns how many emergences were written into `out`.
   */
  trace(sineIncidence: number, out: DropRay[]): number {
    const sineIn = Math.min(1, Math.max(0, sineIncidence))
    const cosIn = Math.sqrt(Math.max(0, 1 - sineIn * sineIn))
    const sineRefracted = sineIn / this.index
    const cosRefracted = Math.sqrt(Math.max(0, 1 - sineRefracted * sineRefracted))
    const incidence = Math.asin(sineIn)
    const refracted = Math.asin(sineRefracted)
    const outerReflectance = Fresnel.reflectance(cosIn, 1, this.index)
    // The share that never gets in. It leaves at every angle there is, brightest straight back the
    // way it came, and it is a floor of pale light under the whole sky rather than a form.
    let count = 0
    out[count].chords = 0
    out[count].scatteringAngle = WaterDrop.folded(Math.PI - 2 * incidence)
    out[count].weight = outerReflectance
    count++

    // Inside, every bounce meets the surface at the same angle as the first — a chord of a circle
    // makes equal angles at both ends — so one reflectance serves them all.
    const innerReflectance = Fresnel.reflectance(cosRefracted, this.index, 1)
    let weight = 1 - outerReflectance
    for (let chords = 1; chords <= WaterDrop.MAX_CHORDS && count < out.length; chords++) {
      const deviation = 2 * (incidence - refracted) + (chords - 1) * (Math.PI - 2 * refracted)
      out[count].chords = chords
      out[count].scatteringAngle = WaterDrop.folded(deviation)
      out[count].weight = weight * (1 - innerReflectance)
      count++
      weight *= innerReflectance
    }
    return count
  }

  /**
   * The angle an observer would measure, from the total turning the ray underwent.
   *
   * A ray that has been turned through more than half a circle has not gone anywhere an observer
   * can tell from its mirror image: the sky is a sphere and a scattering angle only runs from
   * straight on to straight back. Folding is what puts the secondary bow at 51 degrees from the
   * point opposite the Sun rather than at the 231 degrees of turning it actually accumulated, and
   * it is the reason its colours come out the other way up.
   */
  private static folded(deviation: number): number {
    const turn = 2 * Math.PI
    let angle = deviation % turn
    if (angle < 0) angle += turn
    return angle > Math.PI ? turn - angle : angle
  }
}
