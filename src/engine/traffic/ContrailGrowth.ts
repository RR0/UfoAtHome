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
  /** Metres a trail widens by per second of age with no shear at all: turbulent diffusion alone, three quarters of a kilometre in an hour. */
  private static readonly DIFFUSION_M_PER_S = 0.2
  /** The shear of the upper troposphere, per second, when the record states none: 3 m/s for each kilometre of height. */
  static readonly TYPICAL_SHEAR_PER_S = 0.003
  /** How deep a trail is when it has settled behind the aircraft, m, and how fast it deepens (ice falls and the air mixes it): about 500 m after an hour. */
  private static readonly INITIAL_DEPTH_M = 150
  private static readonly DEEPENING_M_PER_S = 0.1
  /** The optical depth of a young trail across it: thick enough to be a white line against a blue sky, thin enough to see the sky through. */
  private static readonly YOUNG_OPTICAL_DEPTH = 0.5
  /** How much of the dilution by spreading shows in the optical depth: all of it would be the same ice over a wider sheet, and the ice that grows in the supersaturated air gives some back. */
  private static readonly DILUTION_EXPONENT = 0.75
  /** The time over which the mixing of the trail with the air around it makes it less distinct, s: a sharp young trail is a few minutes, and none is seen after an hour. */
  private static readonly MIXING_S = 1500
  /** Under this share of the light stopped a trail is not seen against a sky: it has dispersed. */
  private static readonly INVISIBLE = 0.006
  private static readonly MIN_LIFETIME_S = 15
  private static readonly LIFETIME_SPAN_S = 120

  /**
   * How wide a trail is at `ageS`, m. The wind differs from the top of a trail to its bottom, so the top is carried away from the bottom at
   * the shear times the depth between them: the width grows by the integral of that, which grows faster as the trail deepens. Turbulence
   * adds a spread of its own. A shear of 3 m/s per km, the upper troposphere's typical, gives some kilometres in an hour.
   */
  static widthM(spanM: number, ageS: number, shearPerS: number = ContrailGrowth.TYPICAL_SHEAR_PER_S): number {
    const age = Math.max(0, ageS)
    const sheared = shearPerS * (ContrailGrowth.INITIAL_DEPTH_M * age + (ContrailGrowth.DEEPENING_M_PER_S * age * age) / 2)
    return spanM + ContrailGrowth.DIFFUSION_M_PER_S * age + sheared
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
   * seen: a trail that lasts is a quarter of an hour or half an hour of visible white, not a line in the sky for ever.
   */
  static opacity(ageS: number, kind: ContrailKind): number {
    if (ageS < ContrailGrowth.FORMATION_S) return 0
    let depth: number
    if (kind.persistent) {
      const diluted = (kind.spanM / ContrailGrowth.widthM(kind.spanM, ageS, kind.shearPerS)) ** ContrailGrowth.DILUTION_EXPONENT
      depth = ContrailGrowth.YOUNG_OPTICAL_DEPTH * diluted * Math.exp(-ageS / ContrailGrowth.MIXING_S)
    } else {
      if (ageS >= kind.lifetimeS) return 0
      depth = ContrailGrowth.YOUNG_OPTICAL_DEPTH * (1 - ageS / kind.lifetimeS) ** 2
    }
    const opacity = 1 - Math.exp(-depth)
    return opacity < ContrailGrowth.INVISIBLE ? 0 : opacity
  }
}
