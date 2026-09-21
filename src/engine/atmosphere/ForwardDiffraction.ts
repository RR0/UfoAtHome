import { VisibleSpectrum } from "./Spectrum.js"

/** A population of particles by size: a lognormal in radius, weighted by cross-section — the
 * weighting diffraction itself uses, since each particle diffracts the light its own disc blocks. */
export interface ParticleSizes {
  /** The median radius of that area-weighted distribution, micrometres. */
  medianRadiusUm: number
  /** Its geometric standard deviation: 1 is every particle alike, 2 a factor of two either way. */
  geometricSigma: number
}

/**
 * The light a particle much larger than a wavelength throws just past itself: its diffraction lobe.
 *
 * Half of everything such a particle takes out of a beam it does not absorb or reflect at all — it
 * diffracts it, into a lobe a few degrees wide round the forward direction (van de Hulst's
 * extinction paradox: the efficiency is 2, and half of it is the shadow's edge). Seen from the
 * ground, that lobe is what surrounds a bright source seen through the particles, and two sizes of
 * particle make the two sights this class draws:
 *
 * - THE AUREOLE: the haze's coarse particles, a micrometre or two across and every size mixed, whose
 *   lobes overlap into a smooth whitish glow falling off over ten or twenty degrees. The sky's own
 *   tables cannot show it: they carry the haze's scattering as a smooth Henyey-Greenstein function
 *   (g = 0.8, see AtmosphereProfile), which has no core, and at their resolution could not draw one
 *   if it did. What is added here is that core — the part of the haze's forward peak the smooth
 *   function leaves out. Its share of the haze's light is counted a second time by the tables,
 *   a known excess of some fifteen per cent of the haze's scattering, near the source.
 * - THE CORONA: the droplets of a thin water cloud, all of nearly one size, whose lobes are Airy
 *   patterns that do not wash each other out: a bluish-white disc round the source and one or two
 *   rings, red outside, a few degrees across — smaller droplets, wider rings.
 *
 * A particle of radius a diffracts, per steradian, (ka)²/4π · [2J₁(u)/u]² with u = ka·sin θ and
 * k = 2π/λ: the Fraunhofer pattern of its own shadow, normalised over the sphere. Averaged here over
 * the sizes and over the visible spectrum, in the colours an eye gives each wavelength.
 */
export class ForwardDiffraction {
  /** The haze's coarse mode, as climatologies of continental aerosol give it — a typical
   * distribution, not a measurement of any of these nights. */
  static readonly HAZE_COARSE_MODE: ParticleSizes = { medianRadiusUm: 1.5, geometricSigma: 2 }
  /** The droplets of a thin, young water cloud — altocumulus, the edge of a stratocumulus — whose
   * sizes are close enough for rings to show. 8 µm is ASSUMED: it puts the first red ring near two
   * and a half degrees, the size lunar coronas are commonly photographed at. */
  static readonly CLOUD_DROPLETS: ParticleSizes = { medianRadiusUm: 8, geometricSigma: 1.15 }
  /** The share of the haze's optical depth the coarse particles carry, at 550 nm: typically a
   * fifth to two fifths for continental air. ASSUMED at 0.3. */
  static readonly COARSE_FRACTION = 0.3
  /** What diffraction takes of a large particle's extinction: half of it (see the class comment). */
  static readonly DIFFRACTED_SHARE = 0.5
  /** How far round the source a profile is worked out, and in how many steps. */
  static readonly MAX_ANGLE_RAD = (30 * Math.PI) / 180
  static readonly STEPS = 512
  /** How many radii a distribution is summed over, across ±3 of its geometric deviations. */
  private static readonly RADII = 32

  /** J₁, the Bessel function of the first kind and order one — the rational approximations of
   * Numerical Recipes (§6.5), good to a part in 10⁸. */
  static bessel1(x: number): number {
    const ax = Math.abs(x)
    if (ax < 8) {
      const y = x * x
      const numerator = x * (72362614232.0 + y * (-7895059235.0 + y * (242396853.1 + y * (-2972611.439 + y * (15704.4826 + y * -30.16036606)))))
      const denominator = 144725228442.0 + y * (2300535178.0 + y * (18583304.74 + y * (99447.43394 + y * (376.9991397 + y))))
      return numerator / denominator
    }
    const z = 8 / ax
    const y = z * z
    const xx = ax - 2.356194491
    const p = 1 + y * (0.183105e-2 + y * (-0.3516396496e-4 + y * (0.2457520174e-5 + y * -0.240337019e-6)))
    const q = 0.04687499995 + y * (-0.2002690873e-3 + y * (0.8449199096e-5 + y * (-0.88228987e-6 + y * 0.105787412e-6)))
    const value = Math.sqrt(0.636619772 / ax) * (Math.cos(xx) * p - z * Math.sin(xx) * q)
    return x < 0 ? -value : value
  }

  /** [2J₁(u)/u]², the Airy pattern: 1 straight ahead, first dark at u = 3.83. */
  static airy(u: number): number {
    if (Math.abs(u) < 1e-6) return 1
    const amplitude = (2 * ForwardDiffraction.bessel1(u)) / u
    return amplitude * amplitude
  }

  /** What one particle of radius `radiusUm` diffracts into the direction θ off its axis, per
   * steradian, at wavelength `wavelengthNm` — integrating to one over the sphere. */
  static phaseOf(thetaRad: number, radiusUm: number, wavelengthNm: number): number {
    const ka = (2 * Math.PI * radiusUm * 1000) / wavelengthNm
    return ((ka * ka) / (4 * Math.PI)) * ForwardDiffraction.airy(ka * Math.sin(thetaRad))
  }

  /** The same, averaged over a population of sizes. */
  static phase(thetaRad: number, wavelengthNm: number, sizes: ParticleSizes): number {
    let sum = 0
    let weights = 0
    for (const { radiusUm, weight } of ForwardDiffraction.radiiOf(sizes)) {
      sum += weight * ForwardDiffraction.phaseOf(thetaRad, radiusUm, wavelengthNm)
      weights += weight
    }
    return sum / weights
  }

  /**
   * The colour of the lobe at every angle from 0 to MAX_ANGLE_RAD, in STEPS steps: for a source of
   * flat spectrum, linear sRGB per steradian, interleaved red, green, blue — white where every
   * wavelength is diffracted alike, and bluish or reddish where the Airy rings of one colour stand
   * apart from another's. Worked out once per population and kept.
   */
  static profile(sizes: ParticleSizes): Float32Array {
    const key = `${sizes.medianRadiusUm}:${sizes.geometricSigma}`
    const known = ForwardDiffraction.profiles.get(key)
    if (known) return known
    const steps = ForwardDiffraction.STEPS
    const out = new Float32Array(steps * 3)
    const radii = ForwardDiffraction.radiiOf(sizes)
    const total = radii.reduce((sum, { weight }) => sum + weight, 0)
    for (let step = 0; step < steps; step++) {
      const theta = (step / (steps - 1)) * ForwardDiffraction.MAX_ANGLE_RAD
      let red = 0
      let green = 0
      let blue = 0
      for (const sample of VisibleSpectrum.SAMPLES) {
        let phase = 0
        for (const { radiusUm, weight } of radii) phase += weight * ForwardDiffraction.phaseOf(theta, radiusUm, sample.wavelengthNm)
        phase /= total
        red += phase * sample.r
        green += phase * sample.g
        blue += phase * sample.b
      }
      out[step * 3] = red
      out[step * 3 + 1] = green
      out[step * 3 + 2] = blue
    }
    ForwardDiffraction.profiles.set(key, out)
    return out
  }

  private static readonly profiles = new Map<string, Float32Array>()

  /** A lognormal sampled evenly in log radius across ±3σ, each radius with its density. */
  private static radiiOf(sizes: ParticleSizes): { radiusUm: number, weight: number }[] {
    const count = ForwardDiffraction.RADII
    const logSigma = Math.log(Math.max(sizes.geometricSigma, 1.0001))
    const radii: { radiusUm: number, weight: number }[] = []
    for (let index = 0; index < count; index++) {
      const z = -3 + (6 * (index + 0.5)) / count
      radii.push({ radiusUm: sizes.medianRadiusUm * Math.exp(z * logSigma), weight: Math.exp(-0.5 * z * z) })
    }
    return radii
  }

  /**
   * Illuminance at the eye from a body of this apparent magnitude, lux: the Sun's −26.74 gives
   * 10⁵, a full Moon's −12.7 a quarter of a lux.
   */
  static illuminanceOf(magnitude: number): number {
    return 10 ** ((-14.18 - magnitude) / 2.5)
  }

  /**
   * How much of a source's illuminance the haze's coarse particles send towards the eye near it, per
   * steradian of the profile: single scattering along the line of sight to the source, whose path
   * through the haze is its air mass times the haze's vertical depth, dimmed by that same path.
   */
  static aureoleScale(aerosolOpticalDepth: number, airMass: number): number {
    const slant = aerosolOpticalDepth * airMass
    return ForwardDiffraction.DIFFRACTED_SHARE * ForwardDiffraction.COARSE_FRACTION * slant * Math.exp(-slant)
  }

  /**
   * The same for a cloud of optical depth `cloudOpticalDepth` along the line of sight: once
   * scattered, τ·e^−τ, which is largest for a thin veil (τ = 1) and gone in a thick deck, where the
   * light has been scattered so many times that the rings are lost in the cloud's own glow.
   */
  static coronaScale(cloudOpticalDepth: number): number {
    return ForwardDiffraction.DIFFRACTED_SHARE * cloudOpticalDepth * Math.exp(-cloudOpticalDepth)
  }

  /** The air mass towards a body at this altitude — Kasten and Young (1989). */
  static airMass(altitudeDeg: number): number {
    const altitude = Math.max(altitudeDeg, 0)
    return 1 / (Math.sin((altitude * Math.PI) / 180) + 0.50572 * (altitude + 6.07995) ** -1.6364)
  }
}
