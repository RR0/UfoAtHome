import { AtmosphereProfile } from "./AtmosphereProfile.js"
import { HumidHaze } from "./HumidHaze.js"
import type { Weather } from "../model/Weather.js"

/** Red, green and blue, in that order. */
export type Rgb = [number, number, number]

/**
 * The air between an eye and what it looks at: how much of a thing's light gets through it, and how
 * much light the air itself adds along the way.
 *
 * It is the same air the sky is made of (see AtmosphereProfile), taken sideways instead of upwards:
 * molecules that scatter blue four times as well as red, and haze that scatters almost every colour
 * alike and lives in the lowest kilometre or two. Along a line of sight of length d, a thing's light
 * is multiplied by T = exp(−∫σ), and the air adds (1 − T) of the light of the sky behind it —
 * Koschmieder's law, which is what makes distant hills pale and blue, a mountain range go flat, and
 * an aircraft ten kilometres off a grey shape before it is a dot.
 *
 * Its conditions are the ones a recording can state: the humidity, which swells the haze (see
 * HumidHaze), and what is falling. What it cannot state is a mist or a fog — a visibility under a
 * kilometre — because no field of Weather holds one, and HumidHaze stops at 95 % for that reason.
 *
 * The density of both falls exponentially with altitude above SEA LEVEL, as it does in the sky's own
 * tables, so a witness on the Socorro mesa looks through thinner air than one in the Cantal, and a
 * crew at 1 500 m through thinner air still.
 */
export class AerialPerspective {
  /**
   * The wavelength each channel of the screen stands for — the peaks of what a red, a green and a
   * blue pixel emit, near enough.
   */
  static readonly CHANNEL_WAVELENGTHS_NM: Rgb = [680, 550, 440]
  /** Koschmieder's contrast threshold, as meteorological visibility defines it: 2 %, so V = 3.912/σ. */
  static readonly KOSCHMIEDER = -Math.log(0.02)

  /**
   * What falls through the air thins it too, and without regard to colour, since a raindrop is a
   * thousand wavelengths across: σ = a·Rᵇ per kilometre, R the rate in millimetres of water per
   * hour. These are the TYPICAL power laws of the optical-link literature, not a fit made here,
   * and they are stated so that a better source can replace them: rain at 1 mm/h lets one see
   * some ten kilometres, at 8 mm/h some three; snow of the same water content about three times
   * less far.
   */
  static readonly PRECIPITATION_EXTINCTION_PER_KM: Record<"rain" | "snow" | "hail", { a: number, b: number }> = {
    rain: { a: 0.365, b: 0.63 },
    snow: { a: 1.023, b: 0.72 },
    hail: { a: 0.365, b: 0.63 }
  }
  /** The rate precipitationIntensity 1 stands for — see OpenMeteoWeatherProvider. */
  static readonly FULL_INTENSITY_MM_PER_H = 8

  /** Air's own extinction at sea level, per metre, per channel. */
  readonly rayleigh: Rgb
  /** Haze's, and anything falling's, at sea level, per metre, per channel. */
  readonly aerosol: Rgb

  /**
   * @param aerosolOpticalDepth The haze's vertical optical depth at 550 nm — what the sky is built
   *   with too. The profile's own clear continental day when absent.
   * @param precipitationPerM What is falling, as an extinction at the ground, per metre, the same
   *   in every colour. Carried in the haze's layer: it falls from a cloud base a kilometre or two
   *   up, which is where the haze thins out as well.
   */
  constructor(aerosolOpticalDepth: number = AtmosphereProfile.DEFAULT_AEROSOL_OPTICAL_DEPTH, precipitationPerM = 0) {
    const [red, green, blue] = AerialPerspective.CHANNEL_WAVELENGTHS_NM
    this.rayleigh = [AtmosphereProfile.rayleighAt(red), AtmosphereProfile.rayleighAt(green), AtmosphereProfile.rayleighAt(blue)]
    const haze = (nm: number) =>
      (aerosolOpticalDepth / AtmosphereProfile.AEROSOL_SCALE_HEIGHT_M) * (nm / 550) ** -AtmosphereProfile.AEROSOL_ANGSTROM_EXPONENT
    // Precipitation is spread over the haze's scale height from the ground up, so that at the
    // ground it is exactly the extinction stated.
    this.aerosol = [haze(red) + precipitationPerM, haze(green) + precipitationPerM, haze(blue) + precipitationPerM]
  }

  /** The air of a recording's weather at an instant: its humidity and what is falling. */
  static of(weather: Pick<Weather, "relativeHumidity" | "precipitationType" | "precipitationIntensity">): AerialPerspective {
    const depth = weather.relativeHumidity === undefined ? undefined : HumidHaze.opticalDepth(weather.relativeHumidity)
    return new AerialPerspective(depth, AerialPerspective.precipitationExtinction(weather))
  }

  /** What is falling, as an extinction per metre at the ground. */
  static precipitationExtinction(weather: Pick<Weather, "precipitationType" | "precipitationIntensity">): number {
    if (weather.precipitationType === "none" || !(weather.precipitationIntensity > 0)) return 0
    const law = AerialPerspective.PRECIPITATION_EXTINCTION_PER_KM[weather.precipitationType]
    const rate = weather.precipitationIntensity * AerialPerspective.FULL_INTENSITY_MM_PER_H
    return (law.a * rate ** law.b) / 1000
  }

  /**
   * How much of a thing's light reaches the eye, per channel, along a straight line between two
   * altitudes above sea level, `distanceM` long.
   */
  transmittance(fromAltitudeM: number, toAltitudeM: number, distanceM: number): Rgb {
    const air = AerialPerspective.meanDensity(fromAltitudeM, toAltitudeM, AtmosphereProfile.RAYLEIGH_SCALE_HEIGHT_M)
    const haze = AerialPerspective.meanDensity(fromAltitudeM, toAltitudeM, AtmosphereProfile.AEROSOL_SCALE_HEIGHT_M)
    return [0, 1, 2].map(channel =>
      Math.exp(-(this.rayleigh[channel] * air + this.aerosol[channel] * haze) * distanceM)) as Rgb
  }

  /**
   * How much of a light from outside the atmosphere — the Sun's, the Moon's — reaches an eye at
   * `altitudeM`, per channel, when it stands `elevationDeg` above the horizon: the columns of air
   * and haze above the eye, times the air mass of that slant (Kasten and Young's, which stays finite
   * at the horizon). Ozone's weak Chappuis absorption is left out, a few per cent at most.
   */
  transmittanceFromSpace(altitudeM: number, elevationDeg: number): Rgb {
    const elevation = Math.max(elevationDeg, 0)
    const airMass = 1 / (Math.sin((elevation * Math.PI) / 180) + 0.50572 * (elevation + 6.07995) ** -1.6364)
    const air = AtmosphereProfile.RAYLEIGH_SCALE_HEIGHT_M * AtmosphereProfile.rayleighDensity(altitudeM)
    const haze = AtmosphereProfile.AEROSOL_SCALE_HEIGHT_M * AtmosphereProfile.aerosolDensity(altitudeM)
    return [0, 1, 2].map(channel =>
      Math.exp(-(this.rayleigh[channel] * air + this.aerosol[channel] * haze) * airMass)) as Rgb
  }

  /**
   * The extinction at 550 nm of the air and of the haze, per metre, at a given altitude — what a
   * renderer that counts heights from the ground of the scene needs, rather than from the sea.
   */
  extinctionAt(altitudeM: number): { rayleigh: number, aerosol: number } {
    return {
      rayleigh: this.rayleigh[1] * AtmosphereProfile.rayleighDensity(altitudeM),
      aerosol: this.aerosol[1] * AtmosphereProfile.aerosolDensity(altitudeM)
    }
  }

  /** How far one can see at this altitude, metres, looking level — the meteorological visibility. */
  visibilityM(altitudeM: number): number {
    const { rayleigh, aerosol } = this.extinctionAt(altitudeM)
    return AerialPerspective.KOSCHMIEDER / (rayleigh + aerosol)
  }

  /** The ratio of each channel's extinction to green's — what a shader that is handed only the
   * green figures multiplies them by. */
  get rayleighRatios(): Rgb {
    return [this.rayleigh[0] / this.rayleigh[1], 1, this.rayleigh[2] / this.rayleigh[1]]
  }

  /**
   * The mean of exp(−h/H) along a straight line from one altitude to another: what the density is
   * on average over a line of sight, which a single density at either end would get wrong by the
   * whole difference between a valley and the air a crew flies in. Below the sea the density is
   * the sea's, as it is in the sky's own profile.
   */
  static meanDensity(fromAltitudeM: number, toAltitudeM: number, scaleHeightM: number): number {
    const from = Math.max(fromAltitudeM, 0)
    const to = Math.max(toAltitudeM, 0)
    const rise = to - from
    if (Math.abs(rise) < 0.01) return Math.exp(-from / scaleHeightM)
    return (scaleHeightM * (Math.exp(-from / scaleHeightM) - Math.exp(-to / scaleHeightM))) / rise
  }
}
