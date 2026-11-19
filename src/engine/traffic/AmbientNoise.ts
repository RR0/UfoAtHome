import { SoundInAir } from "./SoundInAir.js"
import type { Around } from "../model/Around.js"
import { AroundNoise } from "./AroundNoise.js"

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
 * The WEATHER makes it — a wind in the trees, rain on the ground and the leaves — and what is AROUND, when the recording says (see Around):
 * cars, trucks, people talking, roads, worked out by AroundNoise. The weather's figures are those reported of such noises, not measurements of
 * any place, and the base is a quiet rural night (30 dB(A)): a place's own noise is told and not guessed.
 */
export class AmbientNoise {
  /** A quiet rural place on a calm night, dB(A): what the weather adds its noise to. */
  static readonly BASE_DB_A = 30
  /** The A-weighted shape of an ordinary outdoor noise across the octaves, dB re its total: more in the lows. What the base and the weather are spread as. */
  static readonly OUTDOOR_SHAPE_DB: readonly number[] = [-12, -7, -5, -5, -7, -11, -17, -25]
  /**
   * How far under the reference a sound at the ambient's own level is played, dB: what leaves room for one that is fifty decibels over it, an
   * airliner over a calm night, before the player saturates. Some 0.3 of the reference, fitted on the pass of an A320neo over Gonesse
   * (2025-12-30), where the levels played then follow the real ones within 3 to 5 dB down to 30 under the loudest (see TrafficSound.KNEE_DB).
   * The bed of what is around is played under it as well, so that it and an aircraft stand to each other as their levels do.
   */
  static readonly HEADROOM_DB = 10.5
  /**
   * Whether the vehicles around are played as a bed (see aroundBedRms, WeatherAudio.setAround). Not now: a noise of a road's spectrum is a hiss
   * that does not move, and heard on the demo of Gonesse (2025-12-30) it was "always there, dominant and never fading", over the aircraft whose
   * rumble a laptop's speakers hardly play. What is around still masks the aircraft, which is what it is for; it will be heard when the scene
   * has vehicles of its own to play, where they are.
   */
  static readonly AROUND_BED_PLAYED = false
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
  static dbA(weather: NoisyWeather, around?: Around): number {
    const levels = [AmbientNoise.BASE_DB_A, AmbientNoise.along(AmbientNoise.WIND_DB_A, weather.windSpeed), AroundNoise.dbA(around)].filter(Number.isFinite)
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
  static referenceAmplitude(weather: NoisyWeather, around?: Around): number {
    return Math.max(Math.hypot(AmbientNoise.BED_RMS * AmbientNoise.bedVolume(weather), AmbientNoise.aroundReference(around)), AmbientNoise.MINIMUM_REFERENCE)
  }

  /**
   * What an aircraft at the level of what is around is referred to: the faint minimum at the quiet base's level, and as many decibels over it as
   * what is around stands over the base. So an aircraft over a town is played as loud as the same aircraft over a field: what changes is what it
   * stands against, and what is masked.
   */
  private static aroundReference(around: Around | undefined): number {
    const level = AroundNoise.dbA(around)
    if (!Number.isFinite(level) || level <= AmbientNoise.BASE_DB_A) return 0
    return AmbientNoise.MINIMUM_REFERENCE * 10 ** ((level - AmbientNoise.BASE_DB_A) / 20)
  }

  /**
   * How loud the bed of what is around is played (see WeatherAudio.setAround), as the root of its mean square: as an aircraft of the vehicles'
   * own level is (see HEADROOM_DB), so that the bed and an aircraft stand to each other as their levels do. It was played at the
   * reference itself, ten decibels over what an aircraft of its level would be: heard on the demo of Gonesse (2025-12-30), a hiss "too loud all
   * the time", louder than the airliner a kilometre off. The vehicles alone: the voices are in the level heard, not in what the bed plays.
   */
  static aroundBedRms(around: Around | undefined): number {
    if (!AmbientNoise.AROUND_BED_PLAYED) return 0
    const level = AroundNoise.dbA(around, false)
    if (!Number.isFinite(level) || level <= AmbientNoise.BASE_DB_A) return 0
    return Math.min(AmbientNoise.BED_RMS, AmbientNoise.MINIMUM_REFERENCE * 10 ** ((level - AmbientNoise.BASE_DB_A - AmbientNoise.HEADROOM_DB) / 20))
  }

  /** Whether the scene plays a bed of the ambient noise, which masks a faint aircraft as the air does (see TrafficSound.expandUnderKnee). */
  static bedPlays(weather: NoisyWeather, around?: Around): boolean {
    return AmbientNoise.bedVolume(weather) > 0 || AmbientNoise.aroundBedRms(around) > 0
  }

  /**
   * How the ambient noise is spread over the octaves, dB(A) re its total (see AircraftHearingOptions.ambientShapeDb): the quiet base and the
   * weather in an outdoor noise's shape, more in the lows, and the vehicles around in their own, CNOSSOS-EU's, whose most is from 500 Hz to
   * 2 kHz. A road masks an aircraft's mids and leaves its rumble; the old single shape, all lows, took the rumble away first.
   */
  static shapeDb(weather: NoisyWeather, around?: Around): number[] {
    const all = 10 ** (AmbientNoise.dbA(weather, around) / 10)
    const vehiclesLevel = AroundNoise.dbA(around, false)
    const vehicles = Number.isFinite(vehiclesLevel) ? 10 ** (vehiclesLevel / 10) : 0
    // What is neither the weather nor the vehicles is the voices, taken in the outdoor shape.
    const outdoor = Math.max(0, all - vehicles)
    const base = AmbientNoise.OUTDOOR_SHAPE_DB
    const baseTotal = 10 ** (SoundInAir.sumDb(base) / 10)
    const shape = AroundNoise.vehicleShape(around)
    const aWeighted = shape?.map((amplitude, band) => amplitude * amplitude * 10 ** (SoundInAir.aWeightingDb(SoundInAir.OCTAVES[band]) / 10))
    const aTotal = aWeighted?.reduce((sum, energy) => sum + energy, 0) ?? 1
    const energies = SoundInAir.OCTAVES.map((_, band) => outdoor * 10 ** (base[band] / 10) / baseTotal + (aWeighted ? vehicles * aWeighted[band] / aTotal : 0))
    const total = energies.reduce((sum, energy) => sum + energy, 0)
    return energies.map(energy => 10 * Math.log10(energy / total))
  }

  /** The octave proportions the bed of what is around is played in (see AroundNoise.vehicleShape); none when no vehicle is said. */
  static aroundBedShape(around: Around | undefined): number[] | undefined {
    return AroundNoise.vehicleShape(around)
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
