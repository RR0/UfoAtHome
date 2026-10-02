/** What of the weather makes noise: the wind, and what falls. */
export interface NoisyWeather {
  windSpeed: number
  precipitationType: string
  precipitationIntensity: number
}

/**
 * The noise of the place an aircraft is heard against: how loud it is, dB(A), and how loud the scene's own bed of weather sound is played, so
 * that an aircraft is played in the proportion to it that the physics says.
 *
 * It is the WEATHER that makes the ambient noise of a scene, since the scene plays nothing else: a wind in the trees, rain on the ground and
 * the leaves. The figures are those reported of such noises, not measurements of any place, and the base is a quiet rural night (30 dB(A)): a
 * place's own noise — a road, a town — is not known to the scene, and is a better thing to be told than to guess (see Sighting.lightPollution,
 * which says how settled a place is).
 */
export class AmbientNoise {
  /** A quiet rural place on a calm night, dB(A): what the weather adds its noise to. */
  static readonly BASE_DB_A = 30
  /** [wind speed m/s, dB(A) of the wind's own noise in vegetation and about the ear, which adds to the base]: a breeze of 3 m/s is about 40, a fresh wind of 8 about 52. */
  private static readonly WIND_DB_A: [number, number][] = [[0, 10], [1, 28], [2, 36], [3, 40], [5, 46], [8, 52], [12, 58], [20, 66]]
  /** [precipitation intensity 0-1, dB(A)]: a drizzle's patter is 42, a downpour's drumming 65. */
  private static readonly RAIN_DB_A: [number, number][] = [[0, 0], [0.1, 42], [0.3, 50], [0.6, 58], [1, 65]]
  /**
   * How loud the scene's own recorded beds are, as the root of the mean square of what they play, when their gain is 1. The wind and rain loops
   * are normalised recordings, a good way under full scale.
   */
  static readonly BED_RMS = 0.2
  /** The quietest an aircraft's reference is played at, where the scene plays no bed at all. */
  static readonly MINIMUM_REFERENCE = 0.008
  /** What WeatherAudio starts its wind bed above, and the speed at which it plays at full: see WeatherAudio. */
  private static readonly WIND_BED_MIN_MS = 1
  private static readonly WIND_BED_FULL_MS = 20

  /** The ambient noise of that weather, dB(A): the base, and the wind and what falls added to it as energies. */
  static dbA(weather: NoisyWeather): number {
    const levels = [AmbientNoise.BASE_DB_A, AmbientNoise.along(AmbientNoise.WIND_DB_A, weather.windSpeed)]
    // Snow falls in silence (see WeatherAudio): only its wind carries.
    if (weather.precipitationType === "rain" || weather.precipitationType === "hail") levels.push(AmbientNoise.along(AmbientNoise.RAIN_DB_A, weather.precipitationIntensity))
    return 10 * Math.log10(levels.filter(level => level > 0).reduce((sum, level) => sum + 10 ** (level / 10), 0))
  }

  /** How loudly the scene plays its own weather bed (0 to 1), as WeatherAudio does: the wind at its speed over 20, the rain at its intensity. */
  static bedVolume(weather: NoisyWeather): number {
    const wind = weather.windSpeed > AmbientNoise.WIND_BED_MIN_MS ? Math.min(weather.windSpeed / AmbientNoise.WIND_BED_FULL_MS, 1) : 0
    const rain = weather.precipitationType === "hail"
      ? Math.min(1, weather.precipitationIntensity * 1.3 + 0.2)
      : weather.precipitationType === "rain" ? weather.precipitationIntensity : 0
    return Math.hypot(wind, rain)
  }

  /**
   * The amplitude a sound that stands exactly at the ambient noise's own level is played at: that of the scene's own bed, which IS the ambient noise
   * as far as the scene's ears are concerned, or a faint minimum where there is none. So an aircraft is no louder against the weather than its
   * level over the weather's says.
   */
  static referenceAmplitude(weather: NoisyWeather): number {
    return Math.max(AmbientNoise.BED_RMS * AmbientNoise.bedVolume(weather), AmbientNoise.MINIMUM_REFERENCE)
  }

  /** Linear reading of a table, held at its ends. */
  private static along(table: [number, number][], x: number): number {
    if (x <= table[0][0]) return table[0][1]
    for (let i = 1; i < table.length; i++) {
      if (x <= table[i][0]) {
        const [x0, y0] = table[i - 1]
        const [x1, y1] = table[i]
        return y0 + ((y1 - y0) * (x - x0)) / (x1 - x0)
      }
    }
    return table[table.length - 1][1]
  }
}
