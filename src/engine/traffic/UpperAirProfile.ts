import type { UpperAirSample } from "./UpperAirProvider.js"

/** The air at a height and an instant, read from a series. */
export interface AirAloft {
  pressureHpa: number
  temperatureC: number
  relativeHumidity: number
  /** Where the air moves, m/s east and north: the opposite of where the wind comes from. */
  driftEastMs: number
  driftNorthMs: number
  /** How fast the wind changes with height, per second (m/s per m): the vector difference of the winds at the two levels either side, over the height between them. */
  shearPerS: number
}

/** Reads the air at any pressure and instant between the levels and hours a record states. */
export class UpperAirProfile {
  /** Beyond the first or last hour of a series, how far it is still held: a window that ends within the hour. */
  private static readonly HOLD_MS = 3_600_000
  private static readonly DEG = Math.PI / 180
  /** R/g for dry air, m/K: a layer of mean temperature T and pressure ratio r is (R/g) T ln r deep. */
  private static readonly GAS_CONSTANT_OVER_GRAVITY = 287.05 / 9.80665

  /**
   * The air at `pressureHpa` and `t`, undefined when the series says nothing of them: no sample, an instant more than an hour
   * past its ends, or a pressure beyond the levels it has (an extrapolated sky is not the record's).
   *
   * Linear in time, and in the logarithm of the pressure between levels: temperature and humidity change with height far
   * faster than they change from one level to the next in a way a straight line could follow, and a level is stated at its
   * own pressure, not its height.
   */
  static at(samples: readonly UpperAirSample[], t: number, pressureHpa: number): AirAloft | undefined {
    if (samples.length === 0) return undefined
    const first = samples[0]
    const last = samples[samples.length - 1]
    if (t < first.t - UpperAirProfile.HOLD_MS || t > last.t + UpperAirProfile.HOLD_MS) return undefined
    const index = samples.findIndex(sample => sample.t > t)
    const before = index === 0 ? samples[0] : samples[(index === -1 ? samples.length : index) - 1]
    const after = index === -1 || index === 0 ? before : samples[index]
    const from = UpperAirProfile.atLevel(before, pressureHpa)
    const to = UpperAirProfile.atLevel(after, pressureHpa)
    if (!from || !to) return undefined
    const share = after.t > before.t ? Math.min(1, Math.max(0, (t - before.t) / (after.t - before.t))) : 0
    const lerp = (a: number, b: number) => a + (b - a) * share
    return {
      pressureHpa,
      temperatureC: lerp(from.temperatureC, to.temperatureC),
      relativeHumidity: lerp(from.relativeHumidity, to.relativeHumidity),
      driftEastMs: lerp(from.driftEastMs, to.driftEastMs),
      driftNorthMs: lerp(from.driftNorthMs, to.driftNorthMs),
      shearPerS: lerp(from.shearPerS, to.shearPerS)
    }
  }

  private static atLevel(sample: UpperAirSample, pressureHpa: number): AirAloft | undefined {
    const levels = sample.levels
    // Sorted by decreasing pressure; the two that bracket it.
    for (let i = 0; i + 1 < levels.length; i++) {
      const low = levels[i]
      const high = levels[i + 1]
      if (pressureHpa > low.pressureHpa || pressureHpa < high.pressureHpa) continue
      const share = (Math.log(low.pressureHpa) - Math.log(pressureHpa)) / (Math.log(low.pressureHpa) - Math.log(high.pressureHpa))
      const lerp = (a: number, b: number) => a + (b - a) * share
      const drift = (level: typeof low) => {
        const from = level.windFromDeg * UpperAirProfile.DEG
        return { east: -level.windSpeedMs * Math.sin(from), north: -level.windSpeedMs * Math.cos(from) }
      }
      const a = drift(low)
      const b = drift(high)
      // The height between the levels, from the hypsometric equation with their mean temperature.
      const heightM = UpperAirProfile.GAS_CONSTANT_OVER_GRAVITY * ((low.temperatureC + high.temperatureC) / 2 + 273.15) * Math.log(low.pressureHpa / high.pressureHpa)
      return {
        pressureHpa,
        temperatureC: lerp(low.temperatureC, high.temperatureC),
        relativeHumidity: lerp(low.relativeHumidity, high.relativeHumidity),
        driftEastMs: lerp(a.east, b.east),
        driftNorthMs: lerp(a.north, b.north),
        shearPerS: Math.hypot(b.east - a.east, b.north - a.north) / heightM
      }
    }
    return undefined
  }
}
