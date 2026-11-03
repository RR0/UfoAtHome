import type { PlaceJson } from "@rr0/place"
import { formatEdtfTime, type SightingTime } from "../model/Sighting.js"
import type { ReadableSightingJson, SightingRecordingJson } from "./sightingJson.js"

/** A value as a file may write it: bare, or with its provenance beside it (see Provenance). */
type Wrapped<T> = T | { value: T, basis?: string, rationale?: string, how?: string }

/** A location of version 1's `place`. */
interface Version1Location {
  lat: number
  lng: number
  name?: string
}

/**
 * Brings a recording written in an older version of the format to the current one, before anything else reads it (see FormatVersion):
 * the rest of the engine only ever sees the current version.
 *
 * Version 2 (2026-11) writes an observation's time and place as RR0 does (see @rr0/data's RR0EventJson), so that a recording and an
 * event of RR0 say "when" and "where" alike:
 * - `time` and `endTime` are EDTF text ("2015-05-31T00:50:34", "1965-07-01~"), not the fields of a date ({ year, month, … });
 * - `place` is one place (@rr0/place's PlaceJson: its name, its locations), not a list of locations each with its own name.
 *
 * What a value said of its provenance stays with it: a time stated `{ value: { year… }, basis: "derived" }` becomes
 * `{ value: "2015-07-12T00:45:00", basis: "derived" }`, and the place takes the provenance its locations had.
 */
export class SightingMigration {

  /** `json` in the current version of the format: itself when it already is (a copy otherwise; the original is left as it was). */
  static toCurrent(json: ReadableSightingJson): SightingRecordingJson
  static toCurrent<T extends object>(json: T): T
  static toCurrent<T extends object>(json: T): T {
    const version = (json as { version?: unknown }).version
    const stated = typeof version === "object" && version !== null && "value" in version ? (version as { value: unknown }).value : version
    if (stated !== undefined && stated !== 1) return json
    return SightingMigration.fromVersion1(json as unknown as Record<string, unknown>) as unknown as T
  }

  private static fromVersion1(json: Record<string, unknown>): Record<string, unknown> {
    const migrated: Record<string, unknown> = { ...json, version: 2 }
    for (const key of ["time", "endTime"]) {
      if (json[key] !== undefined) migrated[key] = SightingMigration.edtf(json[key] as Wrapped<SightingTime | string>)
    }
    if (Array.isArray(json.place)) {
      const place = SightingMigration.place(json.place as Wrapped<Version1Location>[])
      if (place === undefined) delete migrated.place
      else migrated.place = place
    }
    return migrated
  }

  /** A time of version 1 (its fields), as EDTF text, its provenance kept. */
  private static edtf(time: Wrapped<SightingTime | string>): Wrapped<string> | undefined {
    if (SightingMigration.isWrapped(time)) {
      const value = SightingMigration.edtf(time.value)
      return value === undefined ? undefined : { ...time, value: value as string }
    }
    if (typeof time === "string") return time
    // A field of the date stated with its provenance of its own (`year: { value: 1965, basis: "stated" }`): the date is one text now, and
    // takes the first such provenance.
    const fields = time as unknown as Record<string, Wrapped<unknown>>
    const inner = Object.values(fields).find(field => SightingMigration.isWrapped(field)) as { basis?: string, rationale?: string, how?: string } | undefined
    const bare = Object.fromEntries(Object.entries(fields).map(([key, field]) => [key, SightingMigration.isWrapped(field) ? field.value : field])) as SightingTime
    const text = formatEdtfTime(bare)
    if (text === "") return undefined
    if (!inner) return text
    const { basis, rationale, how } = inner
    return { value: text, ...(basis === undefined ? {} : { basis }), ...(rationale === undefined ? {} : { rationale }), ...(how === undefined ? {} : { how }) }
  }

  /** The locations of version 1 as one place: the first one's name, every one's coordinates; the provenance the first wrapped one had. */
  private static place(locations: Wrapped<Version1Location>[]): Wrapped<PlaceJson> | undefined {
    if (locations.length === 0) return undefined
    const bare = locations.map(location => (SightingMigration.isWrapped(location) ? location.value : location))
    const name = bare.find(location => location.name)?.name
    const place: PlaceJson = { ...(name ? { name } : {}), locations: bare.map(({ lat, lng }) => ({ lat, lng })) }
    const provenance = locations.find(location => SightingMigration.isWrapped(location)) as { basis?: string, rationale?: string, how?: string } | undefined
    if (!provenance) return place
    const { basis, rationale, how } = provenance
    return { value: place, ...(basis === undefined ? {} : { basis }), ...(rationale === undefined ? {} : { rationale }), ...(how === undefined ? {} : { how }) }
  }

  /** Provenance's own test (see Provenance.isWrapper): a `value` key, which no field of a recording has of its own. */
  private static isWrapped<T>(value: Wrapped<T>): value is { value: T, basis?: string, rationale?: string, how?: string } {
    return typeof value === "object" && value !== null && !Array.isArray(value) && "value" in value
  }
}
