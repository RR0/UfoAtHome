import type { Weather, WeatherSource } from "../model/Weather.js"

/** Where the observer was, at one instant (UTC) to be described. */
export interface WeatherPoint {
  lat: number
  lng: number
  time: Date
}

/**
 * The instants to describe, each with the observer's own position at it — not one place and a list
 * of times. Half of aviation testimony is given from a cockpit, and an aircraft under observation
 * for an hour is a long way from where it started: asking about its take-off coordinates for the
 * whole span would describe weather the witness had already left behind.
 */
export interface WeatherQuery {
  /** Sorted by time, ascending — see WeatherInference, which builds them from the sighting's own
   * date, duration and witnessTrack. */
  points: WeatherPoint[]
}

export interface WeatherSample {
  /** The requested instant, echoed back — the record's own resolution is usually coarser (ERA5 is
   * hourly), so this is what was ASKED for, not necessarily a distinct measurement. */
  time: Date
  weather: Weather
}

export interface WeatherObservation {
  /** One per requested point, same order. */
  samples: WeatherSample[]
  source: WeatherSource
}

/**
 * Source of real-world weather for a place and instant — the same "one interface, interchangeable
 * concrete implementations" arrangement terrain already uses (see ElevationProvider's own doc
 * comment): everything about how a record is fetched, decoded and mapped onto this project's
 * Weather fields lives in providers/, so swapping datasets never touches the editor or the
 * inference above it.
 *
 * `undefined` means the provider has no record for that place/instant (before its dataset's own
 * epoch, typically) — a normal, expected answer the UI states as such. A network or HTTP failure
 * throws instead: "we couldn't ask" and "there is nothing to find" are different things to tell a
 * witness, and only the second one is a fact about their sighting.
 */
export interface WeatherProvider {
  getWeather(query: WeatherQuery): Promise<WeatherObservation | undefined>
}
