import { Arounds, type Around } from "../model/Around.js"
import { SoundInAir } from "./SoundInAir.js"

/** CNOSSOS-EU's coefficients of one category of vehicle, band by band over SoundInAir.OCTAVES: rolling noise (A_R, B_R) and propulsion (A_P, B_P). */
interface VehicleCoefficients {
  rollingA: number[]
  rollingB: number[]
  propulsionA: number[]
  propulsionB: number[]
}

/**
 * The sound power of a vehicle, from CNOSSOS-EU, the common noise assessment method of the European Union: Directive (EU) 2015/996, Annex II,
 * with the coefficients of its Table F-1 as Commission Delegated Directive (EU) 2021/1226 replaced them. Per octave, rolling
 * L_WR = A_R + B_R lg(v / v_ref) and propulsion L_WP = A_P + B_P (v − v_ref) / v_ref, v_ref 70 km/h, added as energies; not A-weighted.
 * Category 1 is the light vehicles, cars and vans; category 3 the heavy ones, trucks and buses of three axles or more (a two-axle truck,
 * category 2, is a little quieter: taken as a heavy one, which errs louder). On the reference road surface, at a steady speed.
 *
 * Worked through for a car at 50 km/h, it is 98 dB(A) of power, 73 dB(A) at 7.5 m from its line as it passes: what a car in a town measures.
 */
const LIGHT: VehicleCoefficients = {
  rollingA: [83.1, 89.2, 87.7, 93.1, 100.1, 96.7, 86.8, 76.2],
  rollingB: [30, 41.5, 38.9, 25.7, 32.5, 37.2, 39, 40],
  propulsionA: [97.9, 92.5, 90.7, 87.2, 84.7, 88, 84.4, 77.1],
  propulsionB: [-1.3, 7.2, 7.7, 8, 8, 8, 8, 8]
}
const HEAVY: VehicleCoefficients = {
  rollingA: [91.7, 96.2, 98.2, 104.9, 105.1, 98.5, 91.1, 85.6],
  rollingB: [30, 33.5, 31.3, 25.4, 31.8, 37.1, 38.6, 40.6],
  propulsionA: [108.8, 104.2, 103.5, 102.9, 102.6, 98.5, 93.8, 87.5],
  propulsionB: [0, 3, 4.6, 5, 5, 5, 5, 5]
}
const REFERENCE_SPEED_KMH = 70

/**
 * A person talking, A-weighted: 55 dB(A) at a metre, the mean of face-to-face conversation where the noise around is under 48 dB(A), by
 * Pearsons, Bennett and Fidell, Speech levels in various noise environments (EPA-600/1-77-025, 1977). As a source over the ground, whose sound
 * spreads over a half sphere: 55 + 10 lg(2π) of power. A person who is not talking is taken as silent.
 */
const TALKING_POWER_DB_A = 55 + 10 * Math.log10(2 * Math.PI)
/** The nearest a counted thing is taken to be, m: a car is not in the observer's lap, and a person they talk with is a metre or two off. */
const NEAREST_VEHICLE_M = 5
const NEAREST_PERSON_M = 2

/**
 * What the things around the observer sound like where they stand (see Around), dB(A): cars, trucks and people counted at once within a
 * radius, and roads at their distance.
 *
 * COUNTED THINGS are taken as spread evenly over the disc within the radius, from the nearest they can be: n sources of power W on the ground,
 * each heard over a half sphere (W / 2π r²), give at its centre n W ln(R / r0) / (π (R² − r0²)) on average.
 *
 * A ROAD is a line of vehicles, Q an hour going at v: CNOSSOS-EU's power per metre of it, L_W + 10 lg(Q / 1000 v) with v in km/h, heard at d as
 * a line on the ground (W' / π d). Its nearest stretch is at the distance said; as a straight road, endless both ways.
 *
 * What the ground and the air do on the way, and the buildings between, are not worked out: over a few hundred metres the first two are a few
 * decibels, and the third is why a witness counts what they could see.
 */
export class AroundNoise {
  /** The power of one vehicle of a category at `speedKmh`, dB(A) in all. */
  static vehiclePowerDbA(heavy: boolean, speedKmh: number): number {
    return SoundInAir.sumDb(AroundNoise.vehiclePowerBands(heavy, speedKmh).map((level, band) => level + SoundInAir.aWeightingDb(SoundInAir.OCTAVES[band])))
  }

  /** The power of one vehicle in each octave, dB, not A-weighted. */
  static vehiclePowerBands(heavy: boolean, speedKmh: number): number[] {
    const c = heavy ? HEAVY : LIGHT
    const v = Math.max(speedKmh, 1)
    return SoundInAir.OCTAVES.map((_, band) => {
      const rolling = c.rollingA[band] + c.rollingB[band] * Math.log10(v / REFERENCE_SPEED_KMH)
      const propulsion = c.propulsionA[band] + c.propulsionB[band] * (v - REFERENCE_SPEED_KMH) / REFERENCE_SPEED_KMH
      return SoundInAir.sumDb([rolling, propulsion])
    })
  }

  /**
   * What is around, as heard where the observer is, dB(A); minus infinity when nothing is said that makes a noise. `voices` false leaves out the
   * people talking: what the bed of what is around plays, which a noise cannot (see vehicleShape).
   */
  static dbA(around: Around | undefined, voices = true): number {
    if (!Arounds.says(around)) return -Infinity
    const withinM = around.withinM ?? Arounds.DEFAULT_WITHIN_M
    const speed = Arounds.DEFAULT_SPEED_KMH
    const levels = [
      AroundNoise.counted(around.cars, AroundNoise.vehiclePowerDbA(false, speed), withinM, NEAREST_VEHICLE_M),
      AroundNoise.counted(around.trucks, AroundNoise.vehiclePowerDbA(true, speed), withinM, NEAREST_VEHICLE_M),
      voices ? AroundNoise.counted(around.talking, TALKING_POWER_DB_A, withinM, NEAREST_PERSON_M) : -Infinity,
      ...(around.roads ?? []).map(road => AroundNoise.road(road.distanceM, road.vehiclesPerMinute, road.trucksPerMinute ?? 0, road.speedKmh ?? speed))
    ].filter(level => Number.isFinite(level))
    return levels.length > 0 ? SoundInAir.sumDb(levels) : -Infinity
  }

  /**
   * The shape of what the vehicles around sound like, one amplitude per octave of SoundInAir.OCTAVES whose root sum of squares is 1, as the
   * air carries it and not A-weighted: what the bed of what is around is played in (see WeatherAudio.setAround). The cars' spectrum and the
   * trucks' in the shares of their levels; the voices are not in it, which a noise cannot play. Nothing when there are no vehicles.
   */
  static vehicleShape(around: Around | undefined): number[] | undefined {
    if (!Arounds.says(around)) return undefined
    const withinM = around.withinM ?? Arounds.DEFAULT_WITHIN_M
    const speed = Arounds.DEFAULT_SPEED_KMH
    // Each category's share of the energy heard: counted, and on the roads.
    const share = (heavy: boolean) => {
      const counted = AroundNoise.counted(heavy ? around.trucks : around.cars, AroundNoise.vehiclePowerDbA(heavy, speed), withinM, NEAREST_VEHICLE_M)
      const roads = (around.roads ?? []).map(road => {
        const trucks = Math.min(road.trucksPerMinute ?? 0, road.vehiclesPerMinute)
        return heavy ? AroundNoise.road(road.distanceM, trucks, trucks, road.speedKmh ?? speed) : AroundNoise.road(road.distanceM, road.vehiclesPerMinute - trucks, 0, road.speedKmh ?? speed)
      })
      const levels = [counted, ...roads].filter(Number.isFinite)
      return levels.length > 0 ? 10 ** (SoundInAir.sumDb(levels) / 10) : 0
    }
    const light = share(false)
    const heavy = share(true)
    if (light + heavy === 0) return undefined
    // Each band's energy: the category's spectrum, brought to the category's share of the whole as heard.
    const energies = SoundInAir.OCTAVES.map(() => 0)
    for (const [weight, isHeavy] of [[light, false], [heavy, true]] as const) {
      if (weight === 0) continue
      const bands = AroundNoise.vehiclePowerBands(isHeavy, speed)
      const total = SoundInAir.sumDb(bands.map((level, band) => level + SoundInAir.aWeightingDb(SoundInAir.OCTAVES[band])))
      bands.forEach((level, band) => energies[band] += weight * 10 ** ((level - total) / 10))
    }
    const norm = Math.sqrt(energies.reduce((sum, energy) => sum + energy, 0))
    return energies.map(energy => Math.sqrt(energy) / norm)
  }

  /** `count` sources of a power spread over a disc, heard at its centre (see the class). */
  private static counted(count: number | undefined, powerDbA: number, withinM: number, nearestM: number): number {
    if (!count) return -Infinity
    const r0 = Math.min(nearestM, withinM * 0.99)
    const spread = (count * Math.log(withinM / r0)) / (Math.PI * (withinM * withinM - r0 * r0))
    return powerDbA + 10 * Math.log10(spread)
  }

  /** A road of so many vehicles a minute, of which so many trucks, heard at its distance (see the class). */
  private static road(distanceM: number, vehiclesPerMinute: number, trucksPerMinute: number, speedKmh: number): number {
    const trucks = Math.min(trucksPerMinute, vehiclesPerMinute)
    const line = (perHour: number, heavy: boolean) => perHour > 0 ? AroundNoise.vehiclePowerDbA(heavy, speedKmh) + 10 * Math.log10(perHour / (1000 * Math.max(speedKmh, 1))) : -Infinity
    const power = SoundInAir.sumDb([line((vehiclesPerMinute - trucks) * 60, false), line(trucks * 60, true)].filter(Number.isFinite))
    return Number.isFinite(power) ? power - 10 * Math.log10(Math.PI * Math.max(distanceM, 1)) : -Infinity
  }
}
