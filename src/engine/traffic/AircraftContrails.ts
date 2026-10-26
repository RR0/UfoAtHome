import type { AircraftModel } from "./AircraftModels.js"
import { AircraftModels } from "./AircraftModels.js"
import { ContrailEngines } from "./ContrailEngines.js"
import { ContrailGrowth } from "./ContrailGrowth.js"
import { ContrailPhysics } from "./ContrailPhysics.js"
import type { TrafficDecorSet } from "./TrafficDecor.js"
import { TrafficIds } from "./TrafficIds.js"
import { UpperAirProfile } from "./UpperAirProfile.js"
import type { UpperAirSample } from "./UpperAirProvider.js"

/** One position of an aircraft, with what the air made of its exhaust there. */
export interface ContrailPoint {
  /** ms from the recording's start. */
  tMs: number
  /** Where the aircraft was, in the scene's frame: metres east, north and up of the observer. */
  eastM: number
  northM: number
  upM: number
  /** Whether the exhaust left a trail here. */
  forms: boolean
  /** Whether it lasts. */
  persistent: boolean
  /** How long it lasts when it does not, s. */
  lifetimeS: number
  /** Where the air moves what the aircraft left in it, m/s east and north. */
  driftEastMs: number
  driftNorthMs: number
  /** How fast the wind changes with height there, per second: how much the trail is spread. */
  shearPerS: number
  iceRelativeHumidity: number
  /** For a trail that persists, how long after it formed the air at its height stays supersaturated, s; Infinity for as long as the record says. */
  saturatedForS: number
}

/** The trail one flight of one aircraft leaves, as a series of its positions: a segment of it exists between two that both formed it. */
export interface ContrailTrail {
  /** The id of the aircraft's decor object (see TrafficDecor.idOf). */
  id: string
  spanM: number
  points: ContrailPoint[]
}

/**
 * Which of the aircraft of a record leave a trail, where along their flight, and where the air carries it.
 *
 * Each position of an aircraft is read against the air of the record at its own pressure (a barometric altitude IS a pressure) and
 * instant, by the criterion of ContrailPhysics. What is made of it is the renderer's to draw, at the instant shown (see ContrailGrowth).
 *
 * The air is the record's at the observer's place: an aircraft a hundred kilometres off flies in air the model may state differently, and
 * the trail drawn there is a candidate, as the aircraft is.
 */
export class AircraftContrails {
  /** Under this an aircraft leaves no trail in any air: its exhaust is never cold enough below some 8 km (see ContrailPhysics), less a margin. */
  static readonly MIN_ALTITUDE_FT = 20000
  /**
   * Positions older than this before the recording are kept one a minute: a trail an hour old is a gentle curve, and a position every five
   * seconds over an hour would be hundreds of segments for each aircraft.
   */
  private static readonly DENSE_MS = 300_000
  private static readonly SPARSE_STEP_MS = 60_000
  /** How far ahead the air is read to know how long a trail persists, and how finely, ms. */
  private static readonly SATURATION_HORIZON_MS = 3 * 3_600_000
  private static readonly SATURATION_STEP_MS = 600_000
  /** The pressures the persistence is worked out at, hPa, apart: neighbouring positions of a cruise share it. */
  private static readonly PRESSURE_STEP_HPA = 5

  static plan(set: TrafficDecorSet, models: ReadonlyMap<string, AircraftModel> | undefined, air: readonly UpperAirSample[], startMs: number): ContrailTrail[] {
    if (air.length === 0) return []
    const trails: ContrailTrail[] = []
    const saturation = new Map<string, number>()
    // How long the air at `pressureHpa` stays supersaturated over ice after `fromMs`: read every ten minutes, the first reading that is not
    // ending it.
    const saturatedFor = (fromMs: number, pressureHpa: number, efficiency: number): number => {
      const level = Math.round(pressureHpa / AircraftContrails.PRESSURE_STEP_HPA) * AircraftContrails.PRESSURE_STEP_HPA
      const step = AircraftContrails.SATURATION_STEP_MS
      const start = Math.floor(fromMs / step) * step
      const key = `${level}|${start}`
      const known = saturation.get(key)
      if (known !== undefined) return known + (start - fromMs) / 1000
      let lasting = Infinity
      for (let ahead = step; ahead <= AircraftContrails.SATURATION_HORIZON_MS; ahead += step) {
        const aloft = UpperAirProfile.at(air, start + ahead, level)
        if (!aloft) break
        if (ContrailPhysics.evaluate(aloft, efficiency).iceRelativeHumidity < 1) {
          lasting = ahead / 1000
          break
        }
      }
      saturation.set(key, lasting)
      return lasting + (start - fromMs) / 1000
    }
    for (const object of set.objects) {
      const flight = set.flights.get(object.id)
      const keyframes = object.track
      if (!flight || !keyframes || keyframes.length !== flight.points.length) continue
      const model = models?.get(TrafficIds.keyOf(flight)) ?? AircraftModels.of(undefined)
      const efficiency = ContrailEngines.efficiencyOf(model.kind)
      if (efficiency === undefined) continue
      const points: ContrailPoint[] = []
      let keptMs = -Infinity
      keyframes.forEach((keyframe, i) => {
        if (keyframe.t < -AircraftContrails.DENSE_MS && i + 1 < keyframes.length && keyframe.t - keptMs < AircraftContrails.SPARSE_STEP_MS) return
        keptMs = keyframe.t
        const point = flight.points[i]
        const pressureHpa = ContrailPhysics.pressureAtAltitudeFt(point.altitudeFt)
        const aloft = UpperAirProfile.at(air, startMs + keyframe.t, pressureHpa)
        const forecast = aloft && ContrailPhysics.evaluate(aloft, efficiency)
        points.push({
          tMs: keyframe.t,
          eastM: keyframe.eastM,
          northM: keyframe.northM,
          upM: keyframe.altitudeM ?? 0,
          forms: forecast?.forms ?? false,
          persistent: forecast?.persistent ?? false,
          lifetimeS: forecast ? ContrailGrowth.lifetimeS(forecast.iceRelativeHumidity) : 0,
          driftEastMs: aloft?.driftEastMs ?? 0,
          driftNorthMs: aloft?.driftNorthMs ?? 0,
          shearPerS: aloft?.shearPerS ?? ContrailGrowth.TYPICAL_SHEAR_PER_S,
          iceRelativeHumidity: forecast?.iceRelativeHumidity ?? 0,
          saturatedForS: forecast?.persistent ? saturatedFor(startMs + keyframe.t, pressureHpa, efficiency) : 0
        })
      })
      // A trail needs two positions that both formed it: a single one is a dot, and the exhaust of an instant.
      if (points.some((point, i) => point.forms && points[i + 1]?.forms)) trails.push({ id: object.id, spanM: model.spanM, points })
    }
    return trails
  }
}
