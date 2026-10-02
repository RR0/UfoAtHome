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
  static plan(set: TrafficDecorSet, models: ReadonlyMap<string, AircraftModel> | undefined, air: readonly UpperAirSample[], startMs: number): ContrailTrail[] {
    if (air.length === 0) return []
    const trails: ContrailTrail[] = []
    for (const object of set.objects) {
      const flight = set.flights.get(object.id)
      const keyframes = object.track
      if (!flight || !keyframes || keyframes.length !== flight.points.length) continue
      const model = models?.get(TrafficIds.keyOf(flight)) ?? AircraftModels.of(undefined)
      const efficiency = ContrailEngines.efficiencyOf(model.kind)
      if (efficiency === undefined) continue
      const points: ContrailPoint[] = []
      keyframes.forEach((keyframe, i) => {
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
          iceRelativeHumidity: forecast?.iceRelativeHumidity ?? 0
        })
      })
      // A trail needs two positions that both formed it: a single one is a dot, and the exhaust of an instant.
      if (points.some((point, i) => point.forms && points[i + 1]?.forms)) trails.push({ id: object.id, spanM: model.spanM, points })
    }
    return trails
  }
}
