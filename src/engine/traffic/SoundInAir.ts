/** The state of the air a sound crosses. */
export interface AirConditions {
  /** Degrees Celsius, near the ground. */
  temperatureC: number
  /** 0 to 1, near the ground. */
  relativeHumidity: number
  /** Static pressure, kPa. */
  pressureKPa: number
}

/**
 * How sound travels through air: how fast, how it is weakened on the way, and how an ear weighs its
 * frequencies. Plain physics, with no aircraft in it (see AircraftHearing).
 */
export class SoundInAir {
  /** The octave bands, Hz, 63 to 8000: those aircraft noise is described in. */
  static readonly OCTAVES = [63, 125, 250, 500, 1000, 2000, 4000, 8000]
  /** A standard day at sea level, and a typical damp one. */
  static readonly STANDARD: AirConditions = { temperatureC: 15, relativeHumidity: 0.7, pressureKPa: 101.325 }

  private static readonly REFERENCE_PRESSURE_KPA = 101.325
  private static readonly REFERENCE_TEMPERATURE_K = 293.15
  /** The triple point of water, K. */
  private static readonly TRIPLE_POINT_K = 273.16

  /** The speed of sound in dry air, m/s: about 340 at 15 degrees, 331 at freezing. Humidity changes it by a fraction of a percent. */
  static speedOfSound(temperatureC: number): number {
    return 20.0468 * Math.sqrt(temperatureC + 273.15)
  }

  /**
   * How much the air itself weakens a pure tone of `frequencyHz`, dB per km, over and above the spreading
   * of the wavefront: ISO 9613-1, the absorption by the relaxation of oxygen and nitrogen, which is
   * why a distant aircraft is a rumble and not a roar — the highs go first, a hundred times faster at
   * 8 kHz than at 250 Hz.
   *
   * Taken from the air at the ground. The aircraft's own air is colder, thinner and drier: absorption
   * differs there, and what the sound crosses is a column of both. The ground's is the better
   * approximation for the audible part of the path, which is the last few kilometres.
   */
  static absorptionDbPerKm(frequencyHz: number, air: AirConditions = SoundInAir.STANDARD): number {
    const T = air.temperatureC + 273.15
    const T0 = SoundInAir.REFERENCE_TEMPERATURE_K
    const pressureRatio = air.pressureKPa / SoundInAir.REFERENCE_PRESSURE_KPA
    // The molar concentration of water vapour, per cent, from the relative humidity and the
    // saturation pressure.
    const saturation = 10 ** (-6.8346 * (SoundInAir.TRIPLE_POINT_K / T) ** 1.261 + 4.6151)
    const h = (air.relativeHumidity * 100 * saturation) / pressureRatio
    const oxygenRelaxation = pressureRatio * (24 + (4.04e4 * h * (0.02 + h)) / (0.391 + h))
    const nitrogenRelaxation = pressureRatio * (T / T0) ** -0.5 * (9 + 280 * h * Math.exp(-4.17 * ((T / T0) ** (-1 / 3) - 1)))
    const f2 = frequencyHz * frequencyHz
    const perMetre = 8.686 * f2 * (
      1.84e-11 * (1 / pressureRatio) * Math.sqrt(T / T0)
      + (T / T0) ** -2.5 * (
        0.01275 * Math.exp(-2239.1 / T) / (oxygenRelaxation + f2 / oxygenRelaxation)
        + 0.1068 * Math.exp(-3352 / T) / (nitrogenRelaxation + f2 / nitrogenRelaxation)
      )
    )
    return perMetre * 1000
  }

  /** The A-weighting, dB, of a frequency: how little the ear takes of the lows and the very highs (IEC 61672). */
  static aWeightingDb(frequencyHz: number): number {
    const f2 = frequencyHz * frequencyHz
    const ra = (12194 ** 2 * f2 * f2) / ((f2 + 20.6 ** 2) * Math.sqrt((f2 + 107.7 ** 2) * (f2 + 737.9 ** 2)) * (f2 + 12194 ** 2))
    return 20 * Math.log10(ra) + 2
  }

  /** The sum of levels, dB: energies add, not decibels. */
  static sumDb(levels: readonly number[]): number {
    return 10 * Math.log10(levels.reduce((sum, level) => sum + 10 ** (level / 10), 0))
  }
}
