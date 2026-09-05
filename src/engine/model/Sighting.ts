import { Timeline } from "./Timeline.js"
import { ObserverTrack } from "./ObserverTrack.js"
import type { ObserverPose } from "./ObserverTrack.js"
import { WeatherTrack } from "./WeatherTrack.js"
import { SoundTrack } from "./SoundTrack.js"
import { DEFAULT_WEATHER } from "./Weather.js"
import type { Weather, WeatherSource } from "./Weather.js"
import { DEFAULT_SOUND } from "./Sound.js"
import type { SightingSound } from "./Sound.js"
import type { People } from "./People.js"
import type { DecorObject } from "./Decor.js"
import { Instruments } from "../instrument/Instrument.js"
import type { Instrument } from "../instrument/Instrument.js"

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
  /** The exact EDTF-ish text as typed in the recorder UI (e.g. "2025-06?", "1948-07-24T02:45~") —
   * the source of truth for display/re-editing and for round-tripping uncertain/approximate/
   * imprecise qualifiers through JSON (see parseEdtfTime/formatEdtfTime). year/month/... above are
   * always kept in sync with it whenever the UI sets it, so every existing numeric consumer
   * (astronomy, real-clock playback, the Node-only rr0Data interop) keeps reading plain numbers
   * unchanged. Absent on data that only ever had the numeric fields set directly (older
   * recordings, hand-authored JSON) — formatEdtfTime derives a plain display string from those. */
  raw?: string
}

/** Level 0 EDTF date/time (YYYY[-MM[-DD]][Thh:mm[:ss]]) plus the three Level 1 suffix qualifiers
 * ("?"=uncertain, "~"=approximate, "%"=both) and basic year-masking ("199X"/"19XX") — not a real
 * EDTF parser (no seasons, no per-component qualifiers, no intervals), just enough to (a) reject
 * obvious garbage in the recorder's date fields and (b) recover the numeric components
 * SightingTime's other consumers need. The second alternative (own group names, to avoid relying
 * on duplicate-named-group support) is a deliberate departure from real EDTF: a bare hh:mm[:ss]
 * with no date at all, for a witness who remembers a time of day but not (or not precisely) which
 * date it was — sightingTimeOffsetMs already treats a year-less SightingTime as "compare
 * hour/minute/second only" for duration purposes, so this needs no changes downstream. */
const EDTF_TIME_PATTERN =
  /^(?:(?<year>\d{4}|\d{3}X|\d{2}XX)(-(?<month>0[1-9]|1[0-2]))?(-(?<day>0[1-9]|[12]\d|3[01]))?(?:[T ](?<hour>[01]?\d|2[0-3]):(?<minute>[0-5]\d)(?::(?<second>[0-5]\d))?)?|(?<timeOnlyHour>[01]?\d|2[0-3]):(?<timeOnlyMinute>[0-5]\d)(?::(?<timeOnlySecond>[0-5]\d))?)[?~%]?$/

/** Best-effort EDTF text -> SightingTime, or undefined if `raw` doesn't match EDTF_TIME_PATTERN at
 * all (the caller shows a custom-validity error and leaves the previous value alone rather than
 * overwriting it with garbage — see UfoRecorderElement.applyEdtfTimeInput). A masked year
 * component ("199X"/"19XX") parses to `year: undefined` — genuinely unknown for duration/astronomy
 * purposes, not a real number to guess at. Likewise a bare "hh:mm[:ss]" (no date at all) parses to
 * year/month/day all undefined, hour/minute/second set. */
export function parseEdtfTime(raw: string): SightingTime | undefined {
  const match = EDTF_TIME_PATTERN.exec(raw.trim())
  if (!match?.groups) return undefined
  const { year, month, day, hour, minute, second, timeOnlyHour, timeOnlyMinute, timeOnlySecond } = match.groups
  const resolvedHour = hour ?? timeOnlyHour
  const resolvedMinute = minute ?? timeOnlyMinute
  const resolvedSecond = second ?? timeOnlySecond
  return {
    year: year && !year.includes("X") ? Number(year) : undefined,
    month: month ? Number(month) : undefined,
    day: day ? Number(day) : undefined,
    hour: resolvedHour ? Number(resolvedHour) : undefined,
    minute: resolvedMinute ? Number(resolvedMinute) : undefined,
    second: resolvedSecond ? Number(resolvedSecond) : undefined,
    raw: raw.trim()
  }
}

/** Reverse of parseEdtfTime, for display — `raw` verbatim when present (preserves whatever
 * qualifiers/masking were typed), otherwise a plain ISO-ish string built from the numeric fields
 * (legacy/hand-authored data with no `raw` at all). A year-less time (see parseEdtfTime) formats
 * as a bare "hh:mm[:ss]", matching what would need to be typed to reproduce it. */
export function formatEdtfTime(time: SightingTime): string {
  if (time.raw !== undefined) return time.raw
  if (time.year === undefined) {
    if (time.hour === undefined) return ""
    let s = `${String(time.hour).padStart(2, "0")}:${String(time.minute ?? 0).padStart(2, "0")}`
    if (time.second !== undefined) s += `:${String(time.second).padStart(2, "0")}`
    return s
  }
  let s = String(time.year).padStart(4, "0")
  if (time.month === undefined) return s
  s += `-${String(time.month).padStart(2, "0")}`
  if (time.day === undefined) return s
  s += `-${String(time.day).padStart(2, "0")}`
  if (time.hour === undefined) return s
  s += `T${String(time.hour).padStart(2, "0")}:${String(time.minute ?? 0).padStart(2, "0")}`
  if (time.second !== undefined) s += `:${String(time.second).padStart(2, "0")}`
  return s
}

/**
 * A location, structurally aligned with @rr0/place's PlaceLocation (lat/lng
 * decimal degrees) but plain — see engine/interop/rr0Data.ts for converting
 * to/from a real Place.
 */
export interface SightingLocation {
  lat: number
  lng: number
  /** The place as it is named, fully qualified — "Valensole, Alpes-de-Haute-Provence, …, France".
   * How the coordinates were arrived at in the first place (see engine/place/PlaceProvider.ts:
   * testimony says "on the Valensole plateau", never 43.8379 / 5.9840), and what a reader needs
   * to land on the same spot rather than on one of the four other villages of that name. Absent
   * on recordings whose coordinates were typed in directly. */
  name?: string
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
  /**
   * Hours to subtract from `time`/`endTime` to get UTC — i.e. the legal time zone the witness's
   * own clock was on, +1 for France in 1965, -7 for New Mexico in April 1964. Absent means
   * "unknown", and astronomy falls back to approximating it from the longitude (see
   * sightingTimeToDate), which is right often enough but cannot know legal time: France in July
   * 1965 was on UTC+1 while its longitude says UTC+0 (summer time was only reintroduced in 1976),
   * so a dawn sighting there renders an hour of sky too late — the Sun 17 degrees up instead of
   * the 7 the witness actually had. Daylight-saving transitions are the same problem: Socorro's
   * own 1964-04-24 falls two days before that year's US summer-time switch.
   */
  utcOffsetHours?: number
  /**
   * The witness's own legal time zone, as an IANA name ("Europe/Paris", "America/Denver") — the
   * RULE, where `utcOffsetHours` is only the number that rule produced for this sighting's date.
   * Both are stored: the offset is what every consumer reads (no consumer needs a tz database),
   * and the zone is what lets an editor recompute it correctly when the date changes, summer time
   * and its own history included (see engine/time/TimeZones.ts). Absent means the offset was
   * stated directly, which is all a recording ever used to be able to say.
   */
  timeZone?: string
}

/** `time`/`endTime` as a Unix timestamp (ms) — undefined if `year` isn't known (the one field with no sane default). */
export function sightingTimeToMs(time: SightingTime): number | undefined {
  if (time.year === undefined) return undefined
  return Date.UTC(time.year, (time.month ?? 1) - 1, time.day ?? 1, time.hour ?? 0, time.minute ?? 0, time.second ?? 0)
}

/** A `SightingTime`'s day/hour/minute/second offset in ms, ignoring year/month — used only by
 * sightingDurationMs's fallback, for a witness who gave a start/end without a full calendar date
 * (e.g. just "start 0 min, end 10 min"). Not a substitute for sightingTimeToMs's real absolute
 * timestamp elsewhere (astronomy, real clock display): this can't detect a day/month/year
 * rollover, so it's only trusted when at least one side lacks a `year` — see sightingDurationMs. */
function sightingTimeOffsetMs(time: SightingTime): number {
  return (((time.day ?? 0) * 24 + (time.hour ?? 0)) * 60 + (time.minute ?? 0)) * 60000 + (time.second ?? 0) * 1000
}

// `second` is deliberately excluded from both — unlike a missing year/month/day/hour/minute (a
// real ambiguity worth up to that field's own range), a missing second is treated as exactly :00
// on both sides, the same default sightingTimeToMs/sightingTimeOffsetMs already silently apply —
// so "1926-08-12 10:18" vs "1926-08-12 10:20:30" still computes a duration (2m30s) instead of
// being blocked just because only one side happened to type seconds.
const CALENDAR_FIELDS = ["year", "month", "day", "hour", "minute"] as const
const OFFSET_FIELDS = ["day", "hour", "minute"] as const

/** A SightingTime's defined-field "shape" among `fields`, as a comparable key — e.g. {hour,minute}
 * vs {hour,minute,second} produce different keys. Two times can only have an exact duration
 * computed between them when they share the same shape: a field present on one side and absent on
 * the other means that side's true value for it is unknown, which could shift the real duration by
 * up to that field's own range — see sightingDurationMs. */
function timeShape(t: SightingTime, fields: readonly (keyof SightingTime)[]): string {
  return fields.filter(f => t[f] !== undefined).join(",")
}

/**
 * The observation's real-world length in milliseconds, from `durationSeconds` or from
 * `time`/`endTime` — undefined if neither is known. This is the sighting's *reported* duration,
 * independent of `timeline.duration` (how long the recording itself took to author, e.g. a quick
 * mouse drag) — see UfoElement, which uses this to scale playback to match it.
 *
 * `time`/`endTime` don't both need a full calendar date to compute a duration — a witness often
 * only knows "it started around 0 past the hour, ended around 10 past" without a real date at
 * all. Prefers the real absolute-timestamp difference (correctly handles a day/month/year
 * rollover, e.g. 23:58 -> 00:02) when both sides have a `year`; otherwise falls back to a same-day
 * day/hour/minute/second offset (sightingTimeOffsetMs) that needs no `year` on either side.
 *
 * Either way, `time` and `endTime` must share the exact same set of defined fields *down to the
 * minute* (see timeShape/CALENDAR_FIELDS/OFFSET_FIELDS) — e.g. one known to the hour and the
 * other to the minute can't yield a single exact duration, only a range. `second` is deliberately
 * excluded from that check: a missing second is always treated as :00 on both sides (the same
 * default sightingTimeToMs/sightingTimeOffsetMs already apply), so "1926-08-12 10:18" vs
 * "1926-08-12 10:20:30" still computes 2m30s rather than being blocked just because only one side
 * happened to type seconds. A masked EDTF year ("199X", parsed to `year: undefined` by
 * parseEdtfTime) naturally falls to the offset path via the `bothHaveYear` check below, same as a
 * plain missing year.
 */
export function sightingDurationMs(event: SightingEvent): number | undefined {
  if (event.durationSeconds !== undefined) return event.durationSeconds * 1000
  if (!event.time || !event.endTime) return undefined
  const bothHaveYear = event.time.year !== undefined && event.endTime.year !== undefined
  const fields = bothHaveYear ? CALENDAR_FIELDS : OFFSET_FIELDS
  const shape = timeShape(event.time, fields)
  if (shape === "" || shape !== timeShape(event.endTime, fields)) return undefined
  return bothHaveYear
    ? sightingTimeToMs(event.endTime)! - sightingTimeToMs(event.time)!
    : sightingTimeOffsetMs(event.endTime) - sightingTimeOffsetMs(event.time)
}

/** Distinguishes "nothing entered" (nothing to explain) from "entered on both sides, but too
 * imprecise/mismatched to compute an exact duration" (the UI needs to tell the witness why and
 * that they must enter a duration manually) — see sightingDurationMs and its own timeShape check. */
export function sightingDurationBlockedReason(event: SightingEvent): "imprecise" | undefined {
  if (event.durationSeconds !== undefined) return undefined
  if (!event.time || !event.endTime) return undefined
  return sightingDurationMs(event) === undefined ? "imprecise" : undefined
}

/**
 * A recorded UFO sighting: the real-world metadata (time/place) plus a
 * Timeline (the recording's own internal millisecond clock), a witness
 * reference, and — for cases with several witnesses, each with their own
 * recording — a shared case id so a page can group and label them (see
 * SightingElement).
 *
 * `witness` is a lightweight `People` reference (deliberately no PII beyond
 * an id/dirName/title/name — no email/phone/address; see
 * cms/src/people/witness/WitnessReplacer.ts for the site's existing
 * anonymization pattern for anything more sensitive). Omit it for anonymous
 * witnesses.
 *
 * `witness`/`caseId` are not readonly, unlike `event`/`timeline`/`witnessTrack`
 * above — same reasoning as `weather` below: UfoRecorderElement's metadata toolbar edits these
 * directly, field-by-field, rather than replacing the whole Sighting.
 */
export class Sighting {
  constructor(
    readonly event: SightingEvent,
    readonly timeline: Timeline,
    readonly witnessTrack: ObserverTrack,
    readonly weatherTrack: WeatherTrack,
    /** What the sighting sounded like over time — see SoundTrack. Empty (not silent) for every
     * recording that says nothing about sound, which is most of them: see resolveSoundAt. */
    readonly soundTrack: SoundTrack,
    public witness?: People,
    public caseId?: string,
    /** Legacy fallback only, kept for old recordings made before weatherTrack existed — see
     * resolveWeatherAt, which prefers weatherTrack (interpolated) and only falls back to this
     * static field when the track has no keyframes at all. Not readonly, same "reassigned
     * wholesale, never mutated field-by-field" reasoning WeatherTrack keyframes themselves now
     * carry instead (see UfoRecorderElement.applyWeatherAtPlayhead). */
    public weather?: Weather,
    /** Static scenery (buildings/trees/streetlights/vehicles/other witnesses) — see Decor.ts.
     * Not readonly, same "reassigned wholesale on edit" reasoning as witness/caseId above:
     * UfoRecorderElement's Decor group adds/removes/edits entries by replacing this array. */
    public decor: DecorObject[] = [],
    /** Set when every weatherTrack keyframe came from a real meteorological record looked up from
     * this sighting's own date/time and place, rather than from the witness — see WeatherSource
     * and engine/weather/WeatherInference.ts. Absent is the stronger statement of the two: the
     * conditions are the witness's own, and nothing may overwrite them. */
    public weatherSource?: WeatherSource,
    /** Which INSTRUMENTS entry this observation was made through — an eye, a camera — by id, so a
     * file names a registry entry rather than carrying a copy of its settings that could drift out
     * of date with it. Absent means the naked eye, which is what every recording made before this
     * existed was: a witness who filmed says so, a witness who looked says nothing. See
     * Instrument.ts for why it changes the geometry of every shape. */
    public instrumentId?: string,
    /**
     * How long the shutter stayed open, seconds — one value for the whole observation.
     *
     * NOT keyframed, unlike the aperture and the focus beside it on each pose: a witness
     * photographs a sighting the way they set the camera, and a shutter speed that changed halfway
     * through would be a second photograph rather than a moment of this one. It is also what the
     * picture is MADE of here — the object's streak and the sky's own trails are drawn from it (see
     * UfoElement.exposureTimes and SkyDrift) — so letting it vary along the timeline would have the
     * same recording be two different photographs at two instants.
     *
     * Absent falls back to the instrument's own (an Instamatic's ninetieth), and an eye has none at
     * all.
     */
    public exposureSeconds?: number
  ) {
  }

  /** The shutter this observation was made with, resolved — the recording's own, else the device's,
   * else none at all (an eye has no shutter). */
  get exposure(): number | undefined {
    return this.exposureSeconds ?? this.instrument.exposureSeconds
  }

  /** The instrument this observation was made through, resolved — never undefined: an unknown or
   * absent id falls back to the naked eye (see Instruments.byId). */
  get instrument(): Instrument {
    return Instruments.byId(this.instrumentId)
  }

  static create(time?: SightingTime, place?: SightingLocation[], witness?: People): Sighting {
    return new Sighting(
      { eventType: "sighting", time, place },
      new Timeline(),
      new ObserverTrack(),
      new WeatherTrack(),
      new SoundTrack(),
      witness
    )
  }
}

/** Fallback pose used when a sighting has no witnessTrack entry at t — the legacy static
 * place[0] (lat/lng only), with no known heading (renderers must treat this as azimuth-agnostic,
 * not "facing north"). Mirrors DEFAULT_ALTITUDE_DEG's role as SceneElement's existing fallback. */
const DEFAULT_ELEVATION_M = 0
const DEFAULT_PITCH_DEG = 0

/** Resolves the observer's pose at t: prefers witnessTrack (interpolated), falls back to the
 * legacy static place[0] when the track has no keyframes. undefined only when neither exists. */
export function resolveObserverPoseAt(sighting: Sighting, t: number): ObserverPose | undefined {
  const trackPose = sighting.witnessTrack.getInterpolatedPoseAt(t)
  if (trackPose) return trackPose
  const location = sighting.event.place?.[0]
  if (!location) return undefined
  return {
    lat: location.lat,
    lng: location.lng,
    elevationM: DEFAULT_ELEVATION_M,
    headingDeg: undefined,
    pitchDeg: DEFAULT_PITCH_DEG,
    // The instrument's own field, not a constant: a sighting photographed through a 50 mm lens took
    // in 27 degrees and one simply looked at took in sixty, and neither is a preference. A
    // recording that states its own field per keyframe overrides this, which is the branch above.
    fovDeg: Instruments.fieldOfViewDeg(sighting.instrument)
  }
}

/** Resolves weather at t: prefers weatherTrack (interpolated), falls back to the legacy static
 * `weather` field (old recordings made before weatherTrack existed) when the track has no
 * keyframes, then DEFAULT_WEATHER — unlike resolveObserverPoseAt, never undefined, since Weather
 * (unlike ObserverPose) has a real default for every field, not just some. */
export function resolveWeatherAt(sighting: Sighting, t: number): Weather {
  return sighting.weatherTrack.getInterpolatedWeatherAt(t) ?? sighting.weather ?? DEFAULT_WEATHER
}

/** Resolves the sound at t (interpolated, see SoundTrack), falling back to DEFAULT_SOUND —
 * silence — for a recording whose track is empty, which is every recording made before the track
 * existed and every one whose witness was never asked. Silence is the only safe fallback: unlike
 * weather, whose DEFAULT_WEATHER stands for "unremarkable conditions", inventing a noise nobody
 * reported would be putting words in a witness's mouth. Playing nothing says nothing. */
export function resolveSoundAt(sighting: Sighting, t: number): SightingSound {
  return sighting.soundTrack.getInterpolatedSoundAt(t) ?? DEFAULT_SOUND
}
