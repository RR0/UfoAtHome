import { Timeline } from "./Timeline.js"

/**
 * A fuzzy date, structurally aligned with @rr0/time's Level2Date fields
 * (year/month/day/hour/minute/second) but a plain, dependency-free value —
 * see engine/interop/rr0Data.ts for converting to/from a real Level2Date.
 */
export interface SightingTime {
  year?: number
  month?: number
  day?: number
  hour?: number
  minute?: number
  second?: number
}

/**
 * A location, structurally aligned with @rr0/place's PlaceLocation (lat/lng
 * decimal degrees) but plain — see engine/interop/rr0Data.ts for converting
 * to/from a real Place.
 */
export interface SightingLocation {
  lat: number
  lng: number
}

/**
 * The sighting's real-world metadata, structurally aligned with
 * @rr0/data's RR0Event<"sighting"> but held as plain data.
 *
 * Why not the real RR0Event/Level2Date/Place classes here: @rr0/data
 * publishes a single "./dist/index.js" export barrel that re-exports its
 * Node-only file-scanning factories/services (AbstractDataFactory,
 * TypedDataFactory, PeopleFactory...) alongside RR0Event itself; those pull
 * in glob/path-scurry/minipass, which call real fs.realpathSync and other
 * APIs with no browser equivalent. Importing RR0Event here would drag that
 * whole graph into this browser-bundled engine and break `vite build`
 * (confirmed: even aggressively polyfilling node:events/node:stream/
 * node:string_decoder still bottoms out at path-scurry's literal fs calls).
 * Real RR0Event/Level2Date/Place interop lives in engine/interop/rr0Data.ts,
 * a Node-only module never imported by the Web Component/demo, so it's
 * excluded from the browser build graph entirely.
 */
export interface SightingEvent {
  eventType: "sighting"
  time?: SightingTime
  /** The observation's reported end time — an alternative to `durationSeconds` when the witness gave a clock time rather than a length. */
  endTime?: SightingTime
  /** The observation's reported length, in seconds — an alternative to `endTime`. Takes precedence over `endTime` if both are set. */
  durationSeconds?: number
  place?: SightingLocation[]
  description?: string
  tags?: string[]
}

/** `time`/`endTime` as a Unix timestamp (ms) — undefined if `year` isn't known (the one field with no sane default). */
export function sightingTimeToMs(time: SightingTime): number | undefined {
  if (time.year === undefined) return undefined
  return Date.UTC(time.year, (time.month ?? 1) - 1, time.day ?? 1, time.hour ?? 0, time.minute ?? 0, time.second ?? 0)
}

/**
 * The observation's real-world length in milliseconds, from `durationSeconds` or from
 * `time`/`endTime` — undefined if neither is known. This is the sighting's *reported* duration,
 * independent of `timeline.duration` (how long the recording itself took to author, e.g. a quick
 * mouse drag) — see UfoElement, which uses this to scale playback to match it.
 */
export function sightingDurationMs(event: SightingEvent): number | undefined {
  if (event.durationSeconds !== undefined) return event.durationSeconds * 1000
  const startMs = event.time ? sightingTimeToMs(event.time) : undefined
  const endMs = event.endTime ? sightingTimeToMs(event.endTime) : undefined
  return startMs !== undefined && endMs !== undefined ? endMs - startMs : undefined
}

/**
 * A recorded UFO sighting: the real-world metadata (time/place) plus a
 * Timeline (the recording's own internal millisecond clock) and an opaque
 * witness reference.
 *
 * Deliberately holds no witness PII (name/email/phone/address) — see
 * cms/src/people/witness/WitnessReplacer.ts for the site's existing
 * anonymization pattern, to be reused at integration time instead.
 */
export class Sighting {
  constructor(
    readonly event: SightingEvent,
    readonly timeline: Timeline,
    readonly witnessId?: string
  ) {
  }

  static create(time?: SightingTime, place?: SightingLocation[], witnessId?: string): Sighting {
    return new Sighting({ eventType: "sighting", time, place }, new Timeline(), witnessId)
  }
}
