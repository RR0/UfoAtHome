import { SurfaceBrightness, type SkyBrightnessMap } from "./SurfaceBrightness.js"

/**
 * The dust of the Solar System, lit by the Sun, seen edge on from inside it.
 *
 * A cone of light standing up from where the Sun has just set, or from where it is about to rise —
 * the "false dawn". It is a manual's strange glow: it does not move like a cloud, it has no edge, it
 * is not there an hour later, and everybody who reports one for the first time reports something
 * they had no name for. Which is exactly why it belongs in this project, and why nothing about
 * drawing it needs any data to be hosted or any licence to be checked.
 *
 * WHAT IS BEING COMPUTED is one line of sight walked out from the Earth through a cloud of dust
 * that thins with distance from the Sun and with height above the plane of the planets. Every grain
 * it passes is lit by a Sun that falls off as the inverse square, and throws its share toward the
 * witness according to how sharply it turns light — a real scattering law, forward-peaked the way
 * dust is. Add it up and you get: a bright cone leaning along the ecliptic near the Sun, a band
 * that thins to nothing at the ecliptic poles, and a faint oval brightening exactly opposite the
 * Sun. Those are the zodiacal light, the zodiacal band and the gegenschein, three named sights
 * that no line in this file names.
 *
 * THE GEGENSCHEIN IS THE PART THAT PROVES THE LAW. A cloud lit from behind you should be dimmest
 * where you are looking straight away from the light, and instead there is a patch there — because
 * real dust backscatters as well as forward-scatters, and the scattering law used here has that
 * lobe in it. Take the lobe out and the anti-solar sky goes flat; nothing else has to be touched.
 *
 * Stated in the frame the measurements are published in — how far round the ecliptic from the Sun,
 * and how far above it — which is also the one frame in which the whole thing is CONSTANT. The
 * cloud does not care what date it is; only the Sun's own place in the witness's sky does, and that
 * is a rotation applied to a map computed once.
 */
export class ZodiacalLight {
  /** Columns over how far round the ecliptic a direction lies from the Sun's longitude, zero to
   * half a turn, warped toward the Sun where the cone is. */
  static readonly LONGITUDE_STEPS = 128
  /** Rows over ecliptic latitude, warped toward the plane where the band is. */
  static readonly LATITUDE_STEPS = 96

  /**
   * How the dust thins with distance from the Sun, and with height above the plane.
   *
   * The classical "fan" cloud of Giese and of Leinert et al. (1998), "The 1997 reference of diffuse
   * night sky brightness": density falling as a power of heliocentric distance, times an exponential
   * in the sine of heliocentric latitude. BOTH numbers are the published ones, and neither is fitted
   * here — which is what makes the pole a test rather than a target (see
   * POLE_S10).
   */
  private static readonly RADIAL_FALLOFF = 1.3
  private static readonly FAN_EXPONENT = 2.6

  /**
   * Inside this, there is no dust: it has been vaporised.
   *
   * A real limit, not a numerical convenience, though it is also that — the integral along a line
   * of sight aimed straight at the Sun would otherwise run away, since the density rises as the
   * distance falls and the illumination rises faster still. Nothing this project draws is ever
   * within a few degrees of the Sun anyway.
   */
  private static readonly SUBLIMATION_AU = 0.1

  /** How far out the walk goes, and in how many steps — logarithmic, so the near dust that
   * dominates a line of sight close to the Sun gets the resolution and the far dust, which is
   * thinning as the cube of distance once the inverse square is counted, does not. */
  private static readonly NEAR_LIMIT_AU = 0.004
  private static readonly FAR_LIMIT_AU = 8
  private static readonly STEPS = 224

  /**
   * How sharply the dust turns light, as three Henyey-Greenstein lobes.
   *
   * Hong (1985), "A new equation for the volume scattering function of interplanetary dust": a
   * strong forward lobe, a broad backward one and a narrow backward one. The first is why the cone near the Sun is the brightest part of the whole
   * display; the last is the gegenschein.
   */
  private static readonly LOBE_ASYMMETRY = [0.7, -0.2, -0.81]
  private static readonly LOBE_WEIGHT = [0.665, 0.33, 0.00541]

  /**
   * The one measured number the whole model is scaled by: how bright the zodiacal light is a
   * quarter turn from the Sun, in the plane of the ecliptic, in S10 units.
   *
   * 200 S10, from Leinert et al. (1998) — the same 22nd magnitude a square arcsecond as a dark natural sky, which is the fact
   * worth carrying away from it: at right angles to the Sun the zodiacal light is not a sight, it
   * is HALF THE SKY ITSELF. What makes a cone out of it is that thirty degrees from the Sun the
   * same dust is four or five times brighter.
   */
  static readonly RIGHT_ANGLE_S10 = 200

  /**
   * How bright it is at the pole of the ecliptic, in the same units — and this one is NOT used to
   * build anything. It is what the model is checked against.
   *
   * Also Leinert et al. The whole thing is scaled by exactly one number, RIGHT_ANGLE_S10, measured
   * in the plane of the ecliptic. The pole is the opposite corner of the sky from that anchor, its brightness is set
   * entirely by how steeply the published fan thins with height, and nothing here was adjusted to
   * land on it. The model puts about 70 S10 there against a measured 77 — ten per cent, on a
   * quantity it was not shown. That is the evidence that the cloud is the right shape, and it is
   * worth more than a fit would have been. See the test that measures it.
   *
   * Everything else the model says — the run of brightness with elongation, the width of the band,
   * the gegenschein — is prediction in the same sense.
   */
  static readonly POLE_S10 = 77

  /** What one direction of the sky is worth in S10, anchored on the one measured number this model
   * has (see RIGHT_ANGLE_S10) — the whole brightness, including the floor that the sky it would be
   * drawn on already carries. */
  surfaceBrightnessS10(longitudeGapDeg: number, latitudeDeg: number): number {
    return this.radianceTowards(longitudeGapDeg, latitudeDeg) * this.anchor()
  }

  /** One line of sight, kept once found: the whole model hangs off this single measurement. */
  private anchored?: number

  private anchor(): number {
    if (this.anchored === undefined) this.anchored = ZodiacalLight.RIGHT_ANGLE_S10 / this.radianceTowards(90, 0)
    return this.anchored
  }

  /**
   * Adds up the scattered sunlight along one line of sight, in units of the local dust's own
   * scattering — a relative number, made absolute by harvest()'s single anchor.
   *
   * `longitudeGapDeg` is how far round the ecliptic the direction lies from the Sun's own
   * longitude; `latitudeDeg` is its ecliptic latitude.
   */
  radianceTowards(longitudeGapDeg: number, latitudeDeg: number): number {
    const gap = (longitudeGapDeg * Math.PI) / 180
    const latitude = (latitudeDeg * Math.PI) / 180
    // Heliocentric ecliptic axes with the Earth on the positive x side, so the direction from the
    // Earth to the Sun is -x and the ecliptic pole is +z.
    const towardX = -Math.cos(latitude) * Math.cos(gap)
    const towardY = -Math.cos(latitude) * Math.sin(gap)
    const towardZ = Math.sin(latitude)
    // How far round from the Sun the line of sight actually is, which is not the longitude gap
    // except in the plane itself.
    const cosElongation = -towardX

    let collected = 0
    let previous = 0
    const logNear = Math.log(ZodiacalLight.NEAR_LIMIT_AU)
    const logSpan = Math.log(ZodiacalLight.FAR_LIMIT_AU) - logNear
    for (let step = 0; step < ZodiacalLight.STEPS; step++) {
      const distance = Math.exp(logNear + (logSpan * step) / (ZodiacalLight.STEPS - 1))
      const walked = distance - previous
      previous = distance
      const at = distance - walked / 2
      const x = 1 + at * towardX
      const y = at * towardY
      const z = at * towardZ
      const sunDistance = Math.hypot(x, y, z)
      if (sunDistance < ZodiacalLight.SUBLIMATION_AU) continue
      const heliocentricSine = z / sunDistance
      const density =
        sunDistance ** -ZodiacalLight.RADIAL_FALLOFF *
        Math.exp(-ZodiacalLight.FAN_EXPONENT * Math.abs(heliocentricSine))
      // How far the light had to turn to get from the Sun to the witness by way of this grain: none
      // at all when the grain is between them, half a turn when the witness stands between it and
      // the Sun.
      const cosScattering = (cosElongation - at) / sunDistance
      collected += (density * this.scattering(cosScattering) * walked) / (sunDistance * sunDistance)
    }
    return collected
  }

  /** The three lobes, evaluated together. */
  private scattering(cosScattering: number): number {
    let total = 0
    for (let lobe = 0; lobe < ZodiacalLight.LOBE_ASYMMETRY.length; lobe++) {
      const g = ZodiacalLight.LOBE_ASYMMETRY[lobe]
      const denominator = 1 + g * g - 2 * g * cosScattering
      total += (ZodiacalLight.LOBE_WEIGHT[lobe] * (1 - g * g)) / (4 * Math.PI * denominator ** 1.5)
    }
    return total
  }

  private readonly values = new Float32Array(ZodiacalLight.LONGITUDE_STEPS * ZodiacalLight.LATITUDE_STEPS)
  private walked = 0

  get done(): boolean {
    return this.walked >= ZodiacalLight.LATITUDE_STEPS
  }

  /** Walked a few rows at a time, for the reason MilkyWay.walk gives. */
  walk(rows: number): void {
    const width = ZodiacalLight.LONGITUDE_STEPS
    const last = Math.min(ZodiacalLight.LATITUDE_STEPS, this.walked + rows)
    for (; this.walked < last; this.walked++) {
      const latitudeDeg = SurfaceBrightness.latitudeOfRowCoord((this.walked + 0.5) / ZodiacalLight.LATITUDE_STEPS)
      for (let column = 0; column < width; column++) {
        const longitudeGapDeg = SurfaceBrightness.angleOfColumnCoord((column + 0.5) / width)
        this.values[this.walked * width + column] = this.radianceTowards(longitudeGapDeg, latitudeDeg)
      }
    }
  }

  /**
   * The finished map, scaled to S10 by the one anchor, with its own faintest level taken out for
   * the reason MilkyWay.harvest gives at length: the sky it will be added to already contains the
   * average of this very glow, and light must not be counted twice.
   */
  harvest(): SkyBrightnessMap {
    const scale = this.anchor()
    let faintest = Number.POSITIVE_INFINITY
    for (const value of this.values) if (value < faintest) faintest = value
    const data = new Float32Array(this.values.length)
    for (let at = 0; at < data.length; at++) data[at] = (this.values[at] - faintest) * scale
    return { width: ZodiacalLight.LONGITUDE_STEPS, height: ZodiacalLight.LATITUDE_STEPS, data }
  }
}
