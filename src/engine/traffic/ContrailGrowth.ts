/** What a trail of one aircraft is, apart from the air it formed in. */
export interface ContrailKind {
  /** Whether the air is supersaturated over ice: see ContrailForecast. */
  persistent: boolean
  /** How long a trail that does not persist lasts, s; unbounded for one that does. */
  lifetimeS: number
  /** The aircraft's wingspan, m: what the trail starts as wide as. */
  spanM: number
}

/**
 * How a trail ages: how wide it grows, how long one that does not last lasts, how thick it looks. Parameterised, not simulated: the
 * spread of a real trail depends on shear and turbulence at its height, which no record of the air gives at this scale, and what is
 * drawn follows their observed order of magnitude: some hundreds of metres in ten minutes, a kilometre or two in an hour.
 */
export class ContrailGrowth {
  /** How far behind the engines the exhaust has cooled enough to be seen, s: a few tens of metres at cruise speed. */
  static readonly FORMATION_S = 0.3
  /** Metres a trail widens by per second of age: shear and diffusion, an hour making a kilometre and a half. */
  private static readonly SPREAD_M_PER_S = 0.45
  /** The optical depth of a young trail across it: thick enough to be a white line against a blue sky, thin enough to see the sky through. */
  private static readonly YOUNG_OPTICAL_DEPTH = 0.5
  private static readonly MIN_LIFETIME_S = 15
  private static readonly LIFETIME_SPAN_S = 120

  static widthM(spanM: number, ageS: number): number {
    return spanM + ContrailGrowth.SPREAD_M_PER_S * Math.max(0, ageS)
  }

  /** How long a trail lasts in air that is `iceRelativeHumidity` over ice and not supersaturated, s: from seconds in dry air to a few minutes near saturation. */
  static lifetimeS(iceRelativeHumidity: number): number {
    const share = Math.min(1, Math.max(0, iceRelativeHumidity))
    return ContrailGrowth.MIN_LIFETIME_S + ContrailGrowth.LIFETIME_SPAN_S * share * share
  }

  /**
   * How much of the light behind the trail it stops, 0 to 1, at `ageS` after the exhaust left the engines.
   *
   * One that does not last thins to nothing at the end of its life. One that does thins as it spreads (the same ice over a wider
   * sheet, the square root of it because the ice it takes from the air keeps growing), and never to nothing.
   */
  static opacity(ageS: number, kind: ContrailKind): number {
    if (ageS < ContrailGrowth.FORMATION_S) return 0
    let depth: number
    if (kind.persistent) {
      depth = ContrailGrowth.YOUNG_OPTICAL_DEPTH * Math.sqrt(kind.spanM / ContrailGrowth.widthM(kind.spanM, ageS))
    } else {
      if (ageS >= kind.lifetimeS) return 0
      depth = ContrailGrowth.YOUNG_OPTICAL_DEPTH * (1 - ageS / kind.lifetimeS) ** 2
    }
    return 1 - Math.exp(-depth)
  }
}
