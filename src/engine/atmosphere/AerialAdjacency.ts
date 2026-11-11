import { AtmosphereProfile } from "./AtmosphereProfile.js"

/**
 * Where the light the air adds over a piece of ground comes from, when that ground is looked at from above.
 *
 * Koschmieder's law, as AerialPerspective applies it, lays over a distant thing the light of the sky behind
 * it: everything the air between took away is replaced by airlight. That holds for a hill against the sky.
 * It does not for ground seen from above, and the film of the Concorde (1976) shows the difference: its
 * fields fade to nothing towards the top of the frame, nine kilometres off, while the ground there is
 * hardly lighter than under the aircraft. Measured over 25 bands of three frames, its fine detail falls
 * as exp(−1.0 per air mass) faster than ours, where its brightness rises seven levels LESS per air mass.
 *
 * The reason is which way haze scatters. A haze particle sends most of what it scatters forward (see
 * AtmosphereProfile.aerosolPhase), so a particle on the line of sight above a field mostly passes on
 * light that was already travelling upwards: light from the ground round that field. The share of the
 * ground in what it scatters towards the eye is the share of its phase function over the directions
 * that come from below, which this integrates: for haze, 0.86 to 0.91 at 20° to 30° below the horizon;
 * for the air's molecules, which scatter as much forward as back, one half at every angle. So the field's
 * own light is still taken away along the path (its detail fades exactly as before), but most of what
 * replaces it is the ground's light, gathered from kilometres round, and only the rest is the sky's. This
 * is the adjacency effect of remote sensing (Tanré, Herman and Deschamps, 1981), in its single-scattering
 * form, with the same source function along the whole path:
 *
 *   L = L_ground · T + (1 − T) · (w · L̄_ground + (1 − w) · L_sky),   w = (σ_air·F_air + σ_haze·ω·F_haze) / σ_total
 *
 * F being the ground's share of each phase function, ω the haze's single-scattering albedo (its absorbed
 * part replaced by nothing, which the sky's term stands in for) and L̄ the ground's mean over where that
 * light comes from: a median of two or three kilometres from the point looked at, at those angles (see
 * neighbourhoodRadiusM). Left out, and said: the ground's light is not itself thinned between the ground
 * and the particle that scatters it; the scattering is single; the ground round a point is taken as one
 * mean, whatever its distance.
 */
export class AerialAdjacency {
  /** The view elevations, degrees above the horizontal from the ground looked at up to the eye, at which the tables are sampled. */
  static readonly ELEVATION_STEP_DEG = 5
  static readonly ELEVATIONS_DEG: readonly number[] = Array.from({ length: 19 }, (_, index) => index * AerialAdjacency.ELEVATION_STEP_DEG)
  /** Integration steps per angle: the tables are smooth, and a finer grid moves them by under a thousandth. */
  private static readonly STEPS = 96

  /**
   * The share of a phase function's light that comes from below the horizontal, for a scatterer sending light up to an eye `elevationDeg`
   * above it: the ground's share in what the air there adds.
   */
  static groundShare(elevationDeg: number, phase: (cosAngle: number) => number): number {
    return AerialAdjacency.fromBelow(elevationDeg, phase, () => 1)
  }

  /**
   * How far from the point looked at, in metres along the ground, half of that ground's light was sent from: for a particle at
   * `heightM`, which is where the haze is (AtmosphereProfile.AEROSOL_SCALE_HEIGHT_M) for an eye above most of it.
   */
  static neighbourhoodRadiusM(elevationDeg: number, phase: (cosAngle: number) => number, heightM: number): number {
    const samples: [number, number][] = []
    AerialAdjacency.fromBelow(elevationDeg, phase, (polar, weight) => {
      samples.push([heightM * Math.tan(polar), weight])
      return 1
    })
    samples.sort((a, b) => a[0] - b[0])
    const total = samples.reduce((sum, [, weight]) => sum + weight, 0)
    let gathered = 0
    for (const [radius, weight] of samples) {
      gathered += weight
      if (gathered >= total / 2) return radius
    }
    return samples[samples.length - 1]?.[0] ?? 0
  }

  private static tables?: { haze: number[], air: number[], radiusM: number[] }

  /** The haze's and the air's ground shares, and the haze's neighbourhood radius, at each of ELEVATIONS_DEG — what a shader interpolates. */
  static table(): { haze: readonly number[], air: readonly number[], radiusM: readonly number[] } {
    if (!AerialAdjacency.tables) {
      const haze = (cosAngle: number) => AtmosphereProfile.aerosolPhase(cosAngle)
      AerialAdjacency.tables = {
        haze: AerialAdjacency.ELEVATIONS_DEG.map(elevation => AerialAdjacency.groundShare(elevation, haze)),
        air: AerialAdjacency.ELEVATIONS_DEG.map(elevation => AerialAdjacency.groundShare(elevation, AtmosphereProfile.rayleighPhase)),
        radiusM: AerialAdjacency.ELEVATIONS_DEG.map(elevation =>
          AerialAdjacency.neighbourhoodRadiusM(elevation, haze, AtmosphereProfile.AEROSOL_SCALE_HEIGHT_M))
      }
    }
    return AerialAdjacency.tables
  }

  /**
   * The share w of the ground in the light the air adds, for a line of sight whose air and haze extinctions are `airPerM` and
   * `hazePerM` (scattering and absorption together, as AerialPerspective holds them).
   */
  static groundWeight(elevationDeg: number, airPerM: number, hazePerM: number): number {
    const total = airPerM + hazePerM
    if (!(total > 0)) return 0
    const { haze, air } = AerialAdjacency.table()
    const at = (values: readonly number[]) => AerialAdjacency.interpolate(values, elevationDeg)
    return (airPerM * at(air) + hazePerM * AtmosphereProfile.AEROSOL_SINGLE_SCATTERING_ALBEDO * at(haze)) / total
  }

  /** A table's value at `elevationDeg`, linearly between its samples, clamped to 0°–90°. */
  static interpolate(values: readonly number[], elevationDeg: number): number {
    const position = Math.min(Math.max(elevationDeg, 0), 90) / AerialAdjacency.ELEVATION_STEP_DEG
    const below = Math.min(Math.floor(position), values.length - 2)
    const fraction = position - below
    return values[below] * (1 - fraction) + values[below + 1] * fraction
  }

  /**
   * Sums `phase` over the directions a photon travels when it comes from below the horizontal, round a line going up to the eye at
   * `elevationDeg`, each direction's weight passed on through `each` (the polar angle from the vertical, then the weight).
   */
  private static fromBelow(elevationDeg: number, phase: (cosAngle: number) => number, each: (polar: number, weight: number) => number): number {
    const elevation = (elevationDeg * Math.PI) / 180
    const toEyeX = Math.cos(elevation)
    const toEyeZ = Math.sin(elevation)
    const steps = AerialAdjacency.STEPS
    const dPolar = Math.PI / 2 / steps
    const dAzimuth = (2 * Math.PI) / steps
    let sum = 0
    for (let i = 0; i < steps; i++) {
      const polar = (i + 0.5) * dPolar
      const sinPolar = Math.sin(polar)
      const cosPolar = Math.cos(polar)
      for (let j = 0; j < steps; j++) {
        const azimuth = (j + 0.5) * dAzimuth
        // Travelling upwards (z > 0), so it left the ground; the angle it is turned through is the one to the eye.
        const cosAngle = sinPolar * Math.cos(azimuth) * toEyeX + cosPolar * toEyeZ
        const weight = phase(cosAngle) * sinPolar * dPolar * dAzimuth
        sum += weight * each(polar, weight)
      }
    }
    return sum
  }
}
