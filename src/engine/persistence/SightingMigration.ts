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
 *
 * Version 3 (2026-11) says whom every event is about by an id (see RecordingEventJson.who), as there may be several phenomena, and an
 * event may be about a part of one:
 * - a group of shapes has an id (`{ id, members }`, see ShapeGroupJson), and may hold groups, where version 2 wrote the list of its members;
 * - an event of the observer says their id, where version 2 left `who` out (or wrote "observer");
 * - an event of the account's phenomenon says the id of the shape or group it is about, where version 2 wrote "phenomenon": the group of all
 *   the account's shapes, made when there is more than one; and a blink is about the shapes that blink, where version 2 listed them in
 *   its `parts`: one of them, or a group of them, made where they were.
 */
export class SightingMigration {

  /** `json` in the current version of the format: itself when it already is (a copy otherwise; the original is left as it was). */
  static toCurrent(json: ReadableSightingJson): SightingRecordingJson
  static toCurrent<T extends object>(json: T): T
  static toCurrent<T extends object>(json: T): T {
    const version = (json as { version?: unknown }).version
    const stated = typeof version === "object" && version !== null && "value" in version ? (version as { value: unknown }).value : version
    if (stated !== undefined && stated !== 1 && stated !== 2) return json
    const current = stated === 2 ? json as unknown as Record<string, unknown> : SightingMigration.fromVersion1(json as unknown as Record<string, unknown>)
    return SightingMigration.fromVersion2(current) as unknown as T
  }

  /** The observer's id, as version 3 says whom an event is about: theirs, or "observer" for an observer without one. */
  static observerIdOf(json: { observer?: { id?: string } }): string {
    return json.observer?.id ?? "observer"
  }

  private static fromVersion2(json: Record<string, unknown>): Record<string, unknown> {
    const migrated: Record<string, unknown> = { ...json, version: 3 }
    const timeline = { ...(json.timeline as Record<string, unknown> | undefined ?? { keyframes: [] }) }
    const taken = new Set<string>()
    const keyframes = (timeline.keyframes as { shapes?: { sourceId: string }[] }[] | undefined) ?? []
    for (const keyframe of keyframes) for (const shape of keyframe.shapes ?? []) taken.add(shape.sourceId)
    const groups: { id: string, members: string[] }[] = []
    const fresh = (wanted?: string) => {
      let id = wanted
      for (let n = groups.length + 1; id === undefined || taken.has(id); n++) id = `group-${n}`
      taken.add(id)
      return id
    }
    const written = Array.isArray(timeline.groups) ? timeline.groups as unknown[] : []
    for (const group of written) {
      if (Array.isArray(group)) groups.push({ id: fresh(), members: [...group as string[]] })
      else if (typeof group === "object" && group !== null) groups.push(group as { id: string, members: string[] })
    }
    const events = Array.isArray(json.events) ? (json.events as Record<string, unknown>[]).map(event => ({ ...event })) : undefined
    if (events) {
      const observer = SightingMigration.observerIdOf(json as { observer?: { id?: string } })
      const phenomenon = events.filter(event => event.who === "phenomenon")
      // The account's shapes: drawn, or those its looks draw.
      const shapes = new Set(taken)
      for (const event of phenomenon) {
        const parts = SightingMigration.unwrapped((event.params as Record<string, unknown> | undefined)?.parts)
        if (event.eventType === "appearance" && Array.isArray(parts)) for (const part of parts as { sourceId?: string }[]) if (part.sourceId) shapes.add(part.sourceId)
      }
      for (const id of shapes) taken.add(id)
      const parentOf = (id: string) => groups.find(group => group.members.includes(id))
      const topOf = (id: string): string => {
        const parent = parentOf(id)
        return parent ? topOf(parent.id) : id
      }
      const units = [...new Set([...shapes].map(topOf))]
      const whole = units.length === 1 ? units[0] : units.length > 1 ? fresh("phenomenon") : "phenomenon"
      if (units.length > 1) groups.push({ id: whole, members: units })
      for (const event of events) {
        if (event.who === undefined || event.who === "observer") event.who = observer
        else if (event.who === "phenomenon") {
          event.who = whole
          const params = event.params as Record<string, unknown> | undefined
          if (event.eventType !== "blink" || !params || !Array.isArray(params.parts)) continue
          const parts = params.parts as string[]
          const { parts: _, ...rest } = params
          event.params = rest
          event.who = SightingMigration.groupFor(parts, groups, fresh) ?? whole
        }
      }
      migrated.events = events
    }
    if (groups.length > 0 || written.length > 0) migrated.timeline = { ...timeline, groups }
    return migrated
  }

  /**
   * The id that says `parts` (shapes): the one shape; the group that has exactly them; or a group of them made where they were (in the group
   * that held them all). Undefined when they are held by different groups, which no group can say without changing those.
   */
  private static groupFor(parts: string[], groups: { id: string, members: string[] }[], fresh: () => string): string | undefined {
    if (parts.length === 1) return parts[0]
    const leaves = (id: string): string[] => {
      const group = groups.find(candidate => candidate.id === id)
      return group ? group.members.flatMap(leaves) : [id]
    }
    const same = groups.find(group => {
      const own = leaves(group.id)
      return own.length === parts.length && parts.every(part => own.includes(part))
    })
    if (same) return same.id
    const parents = new Set(parts.map(part => groups.find(group => group.members.includes(part))))
    if (parents.size !== 1) return undefined
    const [parent] = parents
    const id = fresh()
    if (parent) {
      const at = parent.members.findIndex(member => parts.includes(member))
      parent.members = parent.members.filter(member => !parts.includes(member))
      parent.members.splice(at, 0, id)
    }
    groups.push({ id, members: [...parts] })
    return id
  }

  private static unwrapped(value: unknown): unknown {
    return SightingMigration.isWrapped(value as Wrapped<unknown>) ? (value as { value: unknown }).value : value
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
