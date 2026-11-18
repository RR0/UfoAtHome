import type { MessageCatalog } from "../../../../i18n/MessageCatalog.js"
import type { ReentryFragment } from "../Reentry.js"

/** What a type of re-entry is called, in the reader's language. */
export interface ReentryTypeMessages {
  name: string
}

/**
 * What a new re-entry of a type is when it is put in the recording: a placeholder crossing the observer's view from left to right, from
 * the playhead on, to be given its real path. Orders of magnitude, not measures of any one event.
 */
export interface ReentryTemplate {
  /** How far in front of the observer it crosses, km. */
  distanceKm: number
  /** How fast it goes, km/s. */
  speedKmS: number
  /** How long it is seen, seconds. */
  durationS: number
  /** Its height above the ellipsoid where it is first seen and where it goes out, km. */
  fromAltitudeKm: number
  toAltitudeKm: number
  /** Its burning pieces, the leading one first. */
  fragments: ReentryFragment[]
}

/**
 * A type of re-entry an author picks from (see ReentryJson.type): what came in, which says its nature, natural (a meteoroid) or put in
 * orbit by people, and what a new one is (see ReentryTemplate). Its drawing is the same whatever the type: what is seen follows from the
 * path and the pieces the recording states.
 *
 * A type is given to the extension point `reentryTypes` of ModuleRegistry as a DataSource whose `id` is its `key`: the built-in ones in
 * reentryTypeSources.ts, another module's by its script.
 */
export interface ReentryType {
  /** What a recording states in ReentryJson.type. Unique among the types. */
  key: string
  /** A meteoroid came in by itself; anything else was put up there. Only an artificial one names its object in the catalogue. */
  nature: "natural" | "artificial"
  /** Its name in the reader's language. */
  messages: MessageCatalog<ReentryTypeMessages>
  template: ReentryTemplate
}
