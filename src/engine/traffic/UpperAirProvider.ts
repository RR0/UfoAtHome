/** Where a record of the air aloft comes from, for the credit and the replay. */
export interface UpperAirSource {
  id: string
  name: string
  /** The one request that makes the record, replayable. */
  url: string
}

/** The air at one pressure level. */
export interface UpperAirLevel {
  pressureHpa: number
  temperatureC: number
  /** Over liquid water, 0 to 1: the way reanalyses and forecasts state it, whatever the temperature. */
  relativeHumidity: number
  windSpeedMs: number
  /** Where the wind comes FROM, degrees clockwise from north. */
  windFromDeg: number
}

/** The levels of one instant, by increasing height (decreasing pressure). */
export interface UpperAirSample {
  /** ms UTC. */
  t: number
  levels: UpperAirLevel[]
}

/**
 * What a record of the air aloft answered for one place and window.
 *
 * The same three answers as every lookup here (see AircraftTraffic): "the record holds it", "the record does not
 * hold it" (a day before it begins) and "the record could not be read", of which only the first may be shown as air.
 */
export type UpperAir =
  | { status: "found"; samples: UpperAirSample[]; source: UpperAirSource }
  | { status: "outside" }
  | { status: "failed" }

/**
 * Source of the temperature, humidity and wind at the pressure levels the aircraft fly at: what decides whether the exhaust of
 * an engine leaves a trail and whether it lasts (see ContrailPhysics), and where it drifts.
 *
 * The same "one interface, interchangeable implementations" seam as the weather and the aircraft themselves. A provider reads
 * at one place, the observer's: the air a hundred kilometres off is the reanalysis's own to differ in, and the trail drawn there
 * is a candidate like the aircraft that made it.
 */
export interface UpperAirProvider {
  between(place: { lat: number; lng: number }, startMs: number, endMs: number): Promise<UpperAir>
}
