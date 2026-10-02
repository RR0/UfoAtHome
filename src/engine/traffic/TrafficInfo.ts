import type { GeoPoint, SkyPoint } from "../interpretation/Reentry.js"
import type { AircraftKind, AircraftModel } from "./AircraftModels.js"
import { AircraftModels } from "./AircraftModels.js"
import { AircraftHearing } from "./AircraftHearing.js"
import type { AircraftHearingOptions } from "./AircraftHearing.js"
import type { AircraftDescription, AircraftTrack } from "./AircraftProvider.js"
import { AircraftSighting } from "./AircraftSighting.js"

/** What is heard of an aircraft at the instant, in the terms a reader is told it in. */
export interface TrafficHearing {
  audible: boolean
  levelDbA: number
  ambientDbA: number
  /** How long ago the sound that arrives now left the aircraft, s. */
  delayS: number
  /** How far behind where it is seen the sound seems to come from, degrees. */
  lagDeg: number
  /** Pitch heard over pitch made. */
  dopplerRatio: number
  /** The highest band still above the ambient, Hz; absent when none is. */
  cutoffHz?: number
  dominantHz: number
}

/** Everything the scene can say of one aircraft in the sky at one instant. */
export interface TrafficInfo {
  /** The ICAO address, hex, with a leading "~" for a pseudo-address. */
  hex: string
  registration?: string
  /** The ICAO type designator when the record gives one. */
  typeCode?: string
  /** What it is: the real type's name, or the class its category gives, or nothing known. */
  name?: string
  kind: AircraftKind
  basis: AircraftModel["basis"]
  military: boolean
  /** Its owner asked that its identity be withheld: the record has kept back its type and registration. */
  restricted: boolean
  altitudeFt: number
  groundSpeedKt?: number
  trackDeg?: number
  /** Where it is in the observer's sky now. */
  sky: SkyPoint
  /** How fast it crosses the sky, degrees per second. */
  angularRateDegPerS?: number
  /** Its sound, when it can be worked out: undefined when the aircraft was not recorded yet when the sound left it. */
  hearing?: TrafficHearing
}

/**
 * Gathers what is known of an aircraft — its description, where and how it flies, how it sounds — for the label shown when it
 * is pointed at. All of it is a candidate's, never an identification: a record of what receivers heard says that an aircraft was
 * there, at that height and going that way, and nothing about what somebody saw.
 */
export class TrafficInfos {
  /**
   * The aircraft `flight` as `observer` has it at `t` (ms UTC). Undefined when it is not in their sky then: before its first
   * position, after its last, in a gap of the record, or under their horizon.
   */
  static at(flight: AircraftTrack, description: AircraftDescription | undefined, observer: GeoPoint, t: number, options: AircraftHearingOptions = {}): TrafficInfo | undefined {
    const seen = AircraftSighting.seenFrom(flight, observer, t)
    if (!seen) return undefined
    const model = AircraftModels.of(description)
    const heard = AircraftHearing.heardAt(flight, observer, t, { noise: AircraftHearing.noiseOfKind(model.kind), ...options })
    return {
      hex: `${flight.nonIcao ? "~" : ""}${flight.icao.toString(16).padStart(6, "0")}`,
      registration: description?.registration,
      typeCode: model.code ?? description?.type,
      name: model.basis === "nothing" ? undefined : model.name,
      kind: model.kind,
      basis: model.basis,
      military: description?.military === true,
      restricted: description?.restricted === true,
      altitudeFt: seen.altitudeFt,
      groundSpeedKt: seen.groundSpeedKt,
      trackDeg: seen.trackDeg,
      sky: seen.sky,
      angularRateDegPerS: seen.angularRateDegPerS,
      hearing: heard && {
        audible: heard.audible,
        levelDbA: heard.levelDbA,
        ambientDbA: heard.ambientDbA,
        delayS: heard.delayS,
        lagDeg: heard.lagDeg,
        dopplerRatio: heard.dopplerRatio,
        cutoffHz: heard.cutoffHz,
        dominantHz: heard.dominantHz
      }
    }
  }
}
