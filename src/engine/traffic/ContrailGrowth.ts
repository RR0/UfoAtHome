/** What a trail of one aircraft is, apart from the air it formed in. */
export interface ContrailKind {
  /** Whether the air is supersaturated over ice: see ContrailForecast. */
  persistent: boolean
  /** How long a trail that does not persist lasts, s; unbounded for one that does. */
  lifetimeS: number
  /** The aircraft's wingspan, m: what the trail starts as wide as. */
  spanM: number
  /** How fast the wind changes with height where it flew, per second: how much it is spread. Typical when not stated. */
  shearPerS?: number
}

/**
 * How a trail ages: how wide it grows, how long one that does not last lasts, how thick it looks. The width follows the
 * wind shear the record states at the aircraft's height, and a typical diffusion for the turbulence it does not; how deep a trail is
 * and how it deepens are parameterised from observed orders of magnitude (a few kilometres wide after an hour). Not simulated: only the
 * width is sheared, and it is drawn across the line of sight whichever way the shear points.
 */
export class ContrailGrowth {
  /** How far behind the engines the exhaust has cooled enough to be seen, s: a few tens of metres at cruise speed. */
  static readonly FORMATION_S = 0.3
  /**
   * The wake's own spreading: the two vortices the wings shed hold the exhaust for a minute or two, then break up and let it go a few
   * times as wide as the wingspan (Unterstrasser's simulations, Gerz and Holzäpfel's measurements). How many times, and how fast.
   */
  private static readonly VORTEX_SPREAD = 3
  private static readonly VORTEX_S = 60
  /**
   * The horizontal diffusivity of the upper troposphere's turbulence, m²/s: a cloud of ice spreads as the square root of its age, a
   * hundred metres in a minute and some eight hundred in an hour (Schumann et al., 1995, give 10 to 20).
   */
  private static readonly DIFFUSIVITY_M2_PER_S = 15
  /** The width of a Gaussian at half its height, in standard deviations. */
  private static readonly FWHM = 2 * Math.sqrt(2 * Math.log(2))
  /**
   * How long a trail takes to lose its sharp edges, s: a young one is a band as wide as the wake holds it, an old one a cloud thinning out
   * at its sides as anything diffusing does (see profileExponent).
   */
  private static readonly DIFFUSING_S = 120
  /** The shear of the upper troposphere, per second, when the record states none: 3 m/s for each kilometre of height. */
  static readonly TYPICAL_SHEAR_PER_S = 0.003
  /** How deep a trail is when it has settled behind the aircraft, m, and how fast it deepens (ice falls and the air mixes it): about 500 m after an hour. */
  private static readonly INITIAL_DEPTH_M = 150
  private static readonly DEEPENING_M_PER_S = 0.1
  /** The optical depth of a young trail across it: thick enough to be a white line against a blue sky, thin enough to see the sky through. */
  private static readonly YOUNG_OPTICAL_DEPTH = 0.5
  /**
   * How much of the dilution by spreading shows in the optical depth: all of it would be the same ice over a wider sheet, and the ice that
   * grows in the supersaturated air gives half of it back, so that a trail spread over a kilometre or two is still an optical depth of a
   * tenth or two (Voigt et al., 2011, measured some 0.1 to 0.3 in aged trails).
   */
  private static readonly DILUTION_EXPONENT = 0.5
  /** The time over which the mixing of the trail with the air around it makes it less distinct, s: a sharp young trail is a few minutes, an hour's a faint wide band, and none is seen after two. */
  private static readonly MIXING_S = 1500
  /** Under this share of the light stopped a trail is not seen against a sky: it has dispersed. */
  private static readonly INVISIBLE = 0.006
  private static readonly MIN_LIFETIME_S = 15
  private static readonly LIFETIME_SPAN_S = 120

  /**
   * How wide a trail is at `ageS`, m, at half its middle's thickness. The wake's vortices first hold it, then let it go a few spans wide.
   * The wind differs from the top of a trail to its bottom, so the top is carried away from the bottom at the shear times the depth
   * between them: the width grows by the integral of that, which grows faster as the trail deepens. Turbulence spreads it besides, as the
   * square root of its age, which the two add to as independent spreadings do, in quadrature. A shear of 3 m/s per km, the upper
   * troposphere's typical, gives some kilometres in an hour.
   */
  static widthM(spanM: number, ageS: number, shearPerS: number = ContrailGrowth.TYPICAL_SHEAR_PER_S): number {
    const age = Math.max(0, ageS)
    const wake = spanM * (1 + (ContrailGrowth.VORTEX_SPREAD - 1) * (1 - Math.exp(-age / ContrailGrowth.VORTEX_S)))
    const sheared = shearPerS * (ContrailGrowth.INITIAL_DEPTH_M * age + (ContrailGrowth.DEEPENING_M_PER_S * age * age) / 2)
    const diffused = ContrailGrowth.FWHM * Math.sqrt(2 * ContrailGrowth.DIFFUSIVITY_M2_PER_S * age)
    return Math.hypot(wake + sheared, diffused)
  }

  /**
   * The shape of a trail across it at `ageS`, as the exponent `p` of exp(-ln 2 |2x/w|^p), x from its middle and w its width: 2 is the
   * Gaussian of ice that diffuses, a larger one a band with sharp sides. A young trail is the band the wake holds, an old one has
   * diffused.
   */
  static profileExponent(ageS: number): number {
    return 2 + 6 * Math.exp(-Math.max(0, ageS) / ContrailGrowth.DIFFUSING_S)
  }

  /** How long a trail lasts in air that is `iceRelativeHumidity` over ice and not supersaturated, s: from seconds in dry air to a few minutes near saturation. */
  static lifetimeS(iceRelativeHumidity: number): number {
    const share = Math.min(1, Math.max(0, iceRelativeHumidity))
    return ContrailGrowth.MIN_LIFETIME_S + ContrailGrowth.LIFETIME_SPAN_S * share * share
  }

  /**
   * How much of the light behind the trail it stops, 0 to 1, at `ageS` after the exhaust left the engines.
   *
   * One that does not last thins to nothing at the end of its life. One that does thins as it spreads and mixes (the same ice over a
   * wider sheet, less than proportionally because the ice it takes from the air keeps growing), over minutes, until it is no longer
   * seen: a trail that lasts is half an hour or an hour of visible white, widening into a band, not a line in the sky for ever.
   */
  static opacity(ageS: number, kind: ContrailKind): number {
    if (ageS < ContrailGrowth.FORMATION_S) return 0
    let depth: number
    if (kind.persistent) {
      // The young depth is that of the band the wake lets go: spreading dilutes it from there.
      const released = kind.spanM * ContrailGrowth.VORTEX_SPREAD
      const diluted = Math.min(1, released / ContrailGrowth.widthM(kind.spanM, ageS, kind.shearPerS)) ** ContrailGrowth.DILUTION_EXPONENT
      depth = ContrailGrowth.YOUNG_OPTICAL_DEPTH * diluted * Math.exp(-ageS / ContrailGrowth.MIXING_S)
    } else {
      if (ageS >= kind.lifetimeS) return 0
      depth = ContrailGrowth.YOUNG_OPTICAL_DEPTH * (1 - ageS / kind.lifetimeS) ** 2
    }
    const opacity = 1 - Math.exp(-depth)
    return opacity < ContrailGrowth.INVISIBLE ? 0 : opacity
  }
}
