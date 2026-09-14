/**
 * How much haze the air held, from the one thing about it a weather record does hold: its humidity.
 *
 * Haze is small particles — sulphate, salt, organic smoke, dust — and most of them take up water.
 * As the air nears saturation they swell, and a particle twice as wide scatters four times as much:
 * the same aerosol that makes a dry afternoon sharp makes a humid morning milky, without a single
 * particle more in it. That growth is well described by a power law in the dryness of the air,
 * f(RH) = (1 − RH)^−γ (Kasten, 1969; Hänel, 1976), with γ around 0.3 for a continental aerosol.
 *
 * What no record from 1948 or 1965 holds is how many particles there were — the dry burden, which
 * depends on the wind's history, the season and the nearest town. So this models the swelling and
 * nothing else: a typical continental burden, made more or less milky by the humidity the record
 * gives. A dry desert morning and a humid valley dawn come out different; two towns of different
 * industry at the same humidity do not, and cannot, from these data.
 */
export class HumidHaze {
  /** Optical depth at 550 nm of the typical continental burden, dry. Chosen so that air at 50 %
   * relative humidity comes back at the 0.1 AtmosphereProfile takes when nothing is known. */
  static readonly DRY_OPTICAL_DEPTH = 0.08
  /** The growth exponent γ of a continental aerosol. */
  static readonly GROWTH_EXPONENT = 0.3
  /** Above this the power law runs away, and what is really in the air is mist or fog, which a clear
   * sky model has no business drawing. */
  static readonly MAX_RELATIVE_HUMIDITY = 0.95
  /** Optical depths closer than this share their tables: the difference is invisible, and each new
   * value costs the GPU a second of building. */
  static readonly OPTICAL_DEPTH_STEP = 0.02

  /** Relative humidity, 0 to 1, from the air temperature and its dew point in °C — the Magnus form
   * with the coefficients of Alduchov and Eskridge (1996). */
  static relativeHumidity(temperatureC: number, dewPointC: number): number {
    const saturation = (celsius: number) => Math.exp((17.625 * celsius) / (243.04 + celsius))
    return Math.min(Math.max(saturation(dewPointC) / saturation(temperatureC), 0), 1)
  }

  /** The aerosol optical depth at 550 nm for air at that relative humidity. */
  static opticalDepth(relativeHumidity: number): number {
    const humidity = Math.min(Math.max(relativeHumidity, 0), HumidHaze.MAX_RELATIVE_HUMIDITY)
    return HumidHaze.DRY_OPTICAL_DEPTH * (1 - humidity) ** -HumidHaze.GROWTH_EXPONENT
  }

  /** The same, on the steps the sky's tables are built at. */
  static steppedOpticalDepth(relativeHumidity: number): number {
    const step = HumidHaze.OPTICAL_DEPTH_STEP
    return Math.round(HumidHaze.opticalDepth(relativeHumidity) / step) * step
  }
}
