import type { GeoPoint } from "../interpretation/Reentry.js"

/** One position of one aircraft. */
export interface AircraftPoint {
  /** ms UTC. */
  t: number
  lat: number
  lng: number
  /** Barometric altitude, feet. */
  altitudeFt: number
  groundSpeedKt?: number
  trackDeg?: number
}

/** One aircraft's positions within a window and a radius, oldest first. */
export interface AircraftTrack {
  /** The 24-bit address; see `nonIcao`. */
  icao: number
  /** True for a pseudo-address (TIS-B and the like), which is not the airframe's own. */
  nonIcao: boolean
  points: AircraftPoint[]
}

export interface AircraftDescription {
  registration?: string
  /** The ICAO type designator: A320, B738, EC35, C172. Absent for what broadcasts none (about one in seven). */
  type?: string
  /**
   * The emitter category the aircraft states: A1 light, A2 small, A3 large, A4 high-vortex, A5 heavy, A6 high-performance,
   * A7 rotorcraft; B1 glider, B2 lighter-than-air, B4 ultralight, B6 unmanned. Absent for what states none.
   */
  category?: string
  /** Flagged military by the aircraft database. Only those that broadcast are in a record at all. */
  military?: boolean
  /** Whose owner asked that its identity not be shown (privacy or limited-display programmes): its type and registration are kept back. */
  restricted?: boolean
}

/**
 * What a record of air traffic answered for one place and window.
 *
 * Three answers and not two, for the reason every lookup in this project keeps them apart: "the record
 * covers this window and these aircraft were there" (possibly none: that is still a finding about the
 * record, and says nothing about the sky, see below), "the record does not cover this window" and "the
 * record could not be read" are different sentences, and only the first may be shown as traffic.
 *
 * Even `found` is not the sky: a record holds what receivers heard. An aircraft without a transponder,
 * out of every receiver's range, or whose position was not broadcast is NOT in it, so an absence
 * excludes nothing, and a track is a COMPATIBLE candidate, never an identification.
 */
export type AircraftTraffic =
  | { status: "found"; tracks: AircraftTrack[] }
  /** The record does not hold the whole window (a day not ingested, a date before it begins). */
  | { status: "outside" }
  /** The record could not be read: offline, a server error. Nothing is known. */
  | { status: "failed" }

/**
 * Source of the aircraft around an observer — the same "one interface, interchangeable implementations"
 * seam as the weather, the terrain and the light pollution (see WeatherProvider): how a record is
 * fetched and decoded lives in providers/, and the scene only ever names this. Another source (OpenSky,
 * ADS-B Exchange, a file an investigator brings) is another implementation and another entry of
 * aircraftSources.ts, not a change to what draws the aircraft.
 */
export interface AircraftProvider {
  /** The citation the record's licence requires. */
  readonly citation: string

  /**
   * Whether the record could hold that instant at all, known without fetching anything: nearly every
   * recording here is older than any record of air traffic, and asking for those would be a request that
   * can only fail. Optional: a record that cannot tell is asked.
   */
  mayCover?(ms: number): boolean

  /**
   * The aircraft that came within `radiusKm` of `observer` between `startMs` and `endMs`, each with its
   * positions in that window and that radius. Never rejects: the failure is an answer.
   */
  between(observer: GeoPoint, startMs: number, endMs: number, radiusKm?: number): Promise<AircraftTraffic>

  /**
   * The registration and type of an aircraft of that UTC day, when the record has them. Optional: a
   * record may carry positions only. Fetched on demand, for the aircraft a scene decides to name.
   */
  describe?(track: AircraftTrack, day: string): Promise<AircraftDescription | undefined>
}
