/**
 * A road the observer heard, as a witness says it: how far it was, and how busy. Not the road itself, whose line the scene may know
 * (see StatedRoad, or the survey's): what it sounds like from where they stood.
 */
export interface AroundRoad {
  /** How far its nearest stretch was from the observer, m. */
  distanceM: number
  /** How many vehicles went by on it in a minute, both ways, trucks included. */
  vehiclesPerMinute: number
  /** How many of them were trucks or buses. Absent: none. */
  trucksPerMinute?: number
  /** How fast they went, km/h. Absent: a town's 50. */
  speedKmh?: number
}

/**
 * What was around the observer that makes a noise, as a witness can say it: either what was there at once, so many cars and people within
 * so many metres, or a road at some distance and how busy it was; or both. What the place sounds like is worked out from it (see
 * AroundNoise), and an aircraft is heard against that, as against the wind and the rain.
 *
 * Every figure has its provenance, at `around.cars`, `around.roads.0.distanceM` and so on: said by the witness, estimated, or assumed.
 * Absent means nothing is said, which is what every recording made before this existed gets: a quiet place (see AmbientNoise.BASE_DB_A).
 */
export interface Around {
  /** Cars on the move at once within `withinM`. */
  cars?: number
  /** Trucks and buses on the move at once within `withinM`. */
  trucks?: number
  /** People at once within `withinM`. */
  people?: number
  /** How many of those people were talking. Absent: none. */
  talking?: number
  /** The radius the cars, trucks and people were counted within, m. Absent: 200. */
  withinM?: number
  /** The roads heard, each at its distance. */
  roads?: AroundRoad[]
}

export class Arounds {
  /** The radius counts are within when none is said, m. */
  static readonly DEFAULT_WITHIN_M = 200
  /** How fast traffic goes when nothing says, km/h. */
  static readonly DEFAULT_SPEED_KMH = 50

  /** A copy of what a file says, with what is not a finite figure of at least zero left out, and nothing at all when nothing is left. */
  static read(json: unknown): Around | undefined {
    if (!json || typeof json !== "object") return undefined
    const source = json as Record<string, unknown>
    const figure = (value: unknown) => typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : undefined
    const around: Around = {}
    for (const key of ["cars", "trucks", "people", "talking", "withinM"] as const) {
      const value = figure(source[key])
      if (value !== undefined) around[key] = value
    }
    const roads = Array.isArray(source.roads) ? source.roads.flatMap(road => {
      if (!road || typeof road !== "object") return []
      const r = road as Record<string, unknown>
      const distanceM = figure(r.distanceM)
      const vehiclesPerMinute = figure(r.vehiclesPerMinute)
      if (distanceM === undefined || vehiclesPerMinute === undefined) return []
      const read: AroundRoad = { distanceM, vehiclesPerMinute }
      const trucks = figure(r.trucksPerMinute)
      if (trucks !== undefined) read.trucksPerMinute = trucks
      const speed = figure(r.speedKmh)
      if (speed !== undefined) read.speedKmh = speed
      return [read]
    }) : []
    if (roads.length > 0) around.roads = roads
    return Object.keys(around).length > 0 ? around : undefined
  }

  /** Whether it says anything at all. */
  static says(around: Around | undefined): around is Around {
    return around !== undefined && Object.keys(around).some(key => key !== "roads" || (around.roads?.length ?? 0) > 0)
  }
}
