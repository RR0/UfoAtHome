import { DurationText } from "./DurationText.js"
import type { ObserverVehicle } from "./Vehicle.js"
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
import type { Milestone } from "./Milestone.js"
import type { StatedRoad } from "./Road.js"
import type { InvestigatorTrace } from "./Trace.js"
import type { SaidText } from "./SaidText.js"
import type { RecordingSource } from "./RecordingSource.js"
import type { SceneReference } from "./Reference.js"
import { Instruments } from "../instrument/Instrument.js"
import type { Instrument } from "../instrument/Instrument.js"
import { Provenance } from "../persistence/Provenance.js"
import type { RecordingIssue } from "../persistence/RecordingIssue.js"
import type { InterpretationJson } from "../interpretation/Interpretation.js"
import type { Account } from "./Account.js"
import { Level2Date } from "@rr0/time/core"
import { Level2DateParser } from "@rr0/time/parsers"

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
  /** The season, when the date is only known to be "in the spring of 2022" (EDTF `2022-21`): then `month` and `day` are
   * undefined. Hemisphere is not kept, only which season. */
  season?: Season
  /** The exact EDTF-ish text as typed in the editor UI (e.g. "2025-06?", "1948-07-24T02:45~") —
   * the source of truth for display/re-editing and for round-tripping uncertain/approximate/
   * imprecise qualifiers through JSON (see parseEdtfTime/formatEdtfTime). year/month/... above are
   * always kept in sync with it whenever the UI sets it, so every existing numeric consumer
   * (astronomy, real-clock playback, the Node-only rr0Data interop) keeps reading plain numbers
   * unchanged. Absent on data that only ever had the numeric fields set directly (older
   * recordings, hand-authored JSON) — formatEdtfTime derives a plain display string from those. */
  raw?: string
}

/** The seasons EDTF can state in place of a month: 21 to 24 (not tied to a hemisphere), 25 to 28 (northern) and 29 to 32
 * (southern), in the order spring, summer, autumn, winter. The 33 to 41 that follow are quarters, quadrimesters and
 * semesters, which are not a season. */
export type Season = "spring" | "summer" | "autumn" | "winter"
const SEASONS: readonly Season[] = ["spring", "summer", "autumn", "winter"]

/** The first EDTF "month" that is a season, and the last. */
const FIRST_SEASON_CODE = 21
const LAST_SEASON_CODE = 32

/** A bare hh:mm[:ss] with no date at all, with an optional doubt suffix. A deliberate departure from EDTF, which has no
 * such thing: for an observer who remembers a time of day but not (or not precisely) which date it was.
 * sightingTimeOffsetMs already treats a year-less SightingTime as "compare hour/minute/second only" for duration
 * purposes, so this needs no changes downstream. It is read here, and not by @rr0/time, which would take "22:30" for a
 * year. */
const TIME_ONLY_PATTERN = /^(?<hour>[01]?\d|2[0-3]):(?<minute>[0-5]\d)(?::(?<second>[0-5]\d))?[?~%]?$/

/** The parser. @rr0/time's parsers read the whole text (they throw on "1948abc" or "1965-07-"), as a field being typed
 * in requires. Created at the first date read, not when this module loads: its patterns are compiled on construction. */
let edtfDate: InstanceType<typeof Level2DateParser> | undefined

function edtfDateParser(): InstanceType<typeof Level2DateParser> {
  return edtfDate ??= new Level2DateParser()
}

/** A component's number, or undefined when it is not one: masked ("199X", "1948-0X") is a range, not a value. */
function componentNumber(component: { value: unknown } | undefined): number | undefined {
  return typeof component?.value === "number" ? component.value : undefined
}

/** EDTF text (or a bare "hh:mm[:ss]" with no date) -> SightingTime, or undefined if `raw` is neither. EDTF is read by
 * @rr0/time at Level 2: uncertain `?`, approximate `~` or both `%` on the whole date or on any component, masked
 * digits, ... The caller shows a custom-validity error and leaves the previous value alone rather than overwriting it with garbage — see
 * SightingEditorElement.applyEdtfTimeInput.
 *
 * Only what a SightingTime can hold is accepted: a season (a "month" of 21 to 32) is read as `season`, with no month
 * or day, but a quarter or a semester (33 to 41), a time zone or a year of more than four digits is not, and a masked component ("199X", "1948-0X") is read as unknown (`undefined`), not as a number to guess at.
 * A bare "hh:mm[:ss]" has year/month/day all undefined. */
export function parseEdtfTime(raw: string): SightingTime | undefined {
  const text = raw.trim()
  // What starts like a time of day is one, or garbage: @rr0/time would read "25:00" as a year.
  if (/^\d{1,2}:/.test(text)) {
    const timeOnly = TIME_ONLY_PATTERN.exec(text)?.groups
    if (!timeOnly) return undefined
    return {
      year: undefined,
      month: undefined,
      day: undefined,
      hour: Number(timeOnly.hour),
      minute: Number(timeOnly.minute),
      second: timeOnly.second ? Number(timeOnly.second) : undefined,
      raw: text
    }
  }
  let date: Level2Date
  try {
    date = Level2Date.fromString(text, edtfDateParser())
  } catch {
    return undefined
  }
  const year = componentNumber(date.year)
  const monthCode = componentNumber(date.month)
  const isSeason = monthCode !== undefined && monthCode >= FIRST_SEASON_CODE && monthCode <= LAST_SEASON_CODE
  if (date.timeshift || (year !== undefined && Math.abs(year) > 9999)) return undefined
  if (monthCode !== undefined && monthCode > 12 && !isSeason) return undefined
  // A season is the whole of a quarter of the year: it has no day, nor a time of day.
  if (isSeason && (date.day || date.hour)) return undefined
  return {
    year,
    month: isSeason ? undefined : monthCode,
    ...(isSeason ? { season: SEASONS[(monthCode - FIRST_SEASON_CODE) % 4] } : {}),
    day: componentNumber(date.day),
    hour: componentNumber(date.hour),
    minute: componentNumber(date.minute),
    second: componentNumber(date.second),
    raw: text
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
  if (time.season !== undefined) return `${s}-${FIRST_SEASON_CODE + SEASONS.indexOf(time.season)}`
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
   * account says "on the Valensole plateau", never 43.8379 / 5.9840), and what a reader needs
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
  /** The observation's reported end time — an alternative to `durationSeconds` when the observer gave a clock time rather than a length. */
  endTime?: SightingTime
  /** The observation's reported length, in seconds — an alternative to `endTime`. Takes precedence over `endTime` if both are set. */
  durationSeconds?: number
  /**
   * The length as the observer stated it when they could not state it exactly — an ISO 8601 duration with a doubt
   * (`PT10M~`, about ten minutes) or a range (`PT5M/PT10M`) — see DurationText. Then `durationSeconds` is the one
   * length the simulation is played at, chosen from it: this is what was said, that is what is used.
   */
  durationText?: string
  place?: SightingLocation[]
  /** The account itself, in prose. Translatable — see SaidText. */
  description?: SaidText
  /**
    * Technical keywords, stored in ENGLISH and named for the reader by the components' own
    * messages — "landing" is displayed "atterrissage" to a French reader, and a tag no message
    * knows is displayed as it is stored (see SightingTags).
    *
    * Not SaidText, deliberately, unlike everything else an author types here: two recordings that
    * share a tag have to match on it — that is what a tag is for — and translations do not compare
    * equal. rr0.org's own `tag-<slug>` filtering works the same way.
    */
  tags?: string[]
  /**
   * Hours to subtract from `time`/`endTime` to get UTC — i.e. the legal time zone the observer's
   * own clock was on, +1 for France in 1965, -7 for New Mexico in April 1964. Absent means
   * "unknown", and astronomy falls back to approximating it from the longitude (see
   * sightingTimeToDate), which is right often enough but cannot know legal time: France in July
   * 1965 was on UTC+1 while its longitude says UTC+0 (summer time was only reintroduced in 1976),
   * so a dawn sighting there renders an hour of sky too late — the Sun 17 degrees up instead of
   * the 7 the observer actually had. Daylight-saving transitions are the same problem: Socorro's
   * own 1964-04-24 falls two days before that year's US summer-time switch.
   */
  utcOffsetHours?: number
  /**
   * The observer's own legal time zone, as an IANA name ("Europe/Paris", "America/Denver") — the
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
 * sightingDurationMs's fallback, for a observer who gave a start/end without a full calendar date
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
 * `time`/`endTime` don't both need a full calendar date to compute a duration — a observer often
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
  // A duration stated as vaguer than a number says one length to play at all the same: see DurationText.
  const stated = event.durationText === undefined ? undefined : DurationText.parse(event.durationText)
  if (stated) return stated.chosenSeconds * 1000
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
 * imprecise/mismatched to compute an exact duration" (the UI needs to tell the observer why and
 * that they must enter a duration manually) — see sightingDurationMs and its own timeShape check. */
export function sightingDurationBlockedReason(event: SightingEvent): "imprecise" | undefined {
  if (event.durationSeconds !== undefined) return undefined
  if (!event.time || !event.endTime) return undefined
  return sightingDurationMs(event) === undefined ? "imprecise" : undefined
}

/**
 * A recorded UFO sighting: the real-world metadata (time/place) plus a
 * Timeline (the recording's own internal millisecond clock), a observer
 * reference, and an id of its own.
 *
 * A recording knows nothing of the case it belongs to. The case names its accounts (its
 * `sighting` events, see CaseFile), and the analyses of them name them too, by this id: a
 * reference points from what interprets to what is interpreted, never back. A account written
 * before anyone filed it, or filed in two places, is the same file either way.
 *
 * `observer` is a lightweight `People` reference (deliberately no PII beyond
 * an id/title/name — no email/phone/address; see
 * cms/src/people/observer/ObserverReplacer.ts for the site's existing
 * anonymization pattern for anything more sensitive). Omit it for anonymous
 * observers.
 *
 * `id`/`observer` are not readonly, unlike `event`/`timeline`/`observerTrack`
 * above — same reasoning as `weather` below: SightingEditorElement's metadata toolbar edits these
 * directly, field-by-field, rather than replacing the whole Sighting.
 */
export class Sighting {
  constructor(
    readonly event: SightingEvent,
    readonly timeline: Timeline,
    readonly observerTrack: ObserverTrack,
    readonly weatherTrack: WeatherTrack,
    /** What the sighting sounded like over time — see SoundTrack. Empty (not silent) for every
     * recording that says nothing about sound, which is most of them: see resolveSoundAt. */
    readonly soundTrack: SoundTrack,
    public observer?: People,
    /** Which account this is, unique across every recording anywhere, so that a case and the
     * interpretations filed in it can name it: the day it happened, then who saw it
     * ("1964-04-24-ZamoraLonnie"), or where when the observer is anonymous ("1964-04-24-Socorro").
     * Absent for a recording nobody has referred to yet. */
    public id?: string,
    /** Legacy fallback only, kept for old recordings made before weatherTrack existed — see
     * resolveWeatherAt, which prefers weatherTrack (interpolated) and only falls back to this
     * static field when the track has no keyframes at all. Not readonly, same "reassigned
     * wholesale, never mutated field-by-field" reasoning WeatherTrack keyframes themselves now
     * carry instead (see SightingEditorElement.applyWeatherAtPlayhead). */
    public weather?: Weather,
    /** Static scenery (buildings/trees/streetlights/vehicles/other observers) — see Decor.ts.
     * Not readonly, same "reassigned wholesale on edit" reasoning as id/observer above:
     * SightingEditorElement's Decor group adds/removes/edits entries by replacing this array. */
    public decor: DecorObject[] = [],
    /** Set when every weatherTrack keyframe came from a real meteorological record looked up from
     * this sighting's own date/time and place, rather than from the observer — see WeatherSource
     * and engine/weather/WeatherInference.ts. Absent is the stronger statement of the two: the
     * conditions are the observer's own, and nothing may overwrite them. */
    public weatherSource?: WeatherSource,
    /** Which INSTRUMENTS entry this observation was made through — an eye, a camera — by id, so a
     * file names a registry entry rather than carrying a copy of its settings that could drift out
     * of date with it. Absent means the naked eye, which is what every recording made before this
     * existed was: a observer who filmed says so, a observer who looked says nothing. See
     * Instrument.ts for why it changes the geometry of every shape. */
    public instrumentId?: string,
    /**
     * How long the shutter stayed open, seconds — one value for the whole observation.
     *
     * NOT keyframed, unlike the aperture and the focus beside it on each pose: a observer
     * photographs a sighting the way they set the camera, and a shutter speed that changed halfway
     * through would be a second photograph rather than a moment of this one. It is also what the
     * picture is MADE of here — the object's streak and the sky's own trails are drawn from it (see
     * UfoElement.exposureTimes and SkyDrift) — so letting it vary along the timeline would have the
     * same recording be two different photographs at two instants.
     *
     * Absent falls back to the instrument's own (an Instamatic's ninetieth), and an eye has none at
     * all.
     */
    public exposureSeconds?: number,
    /** The named moments of the account — see Milestone. Not readonly, same "replaced wholesale on
     * edit" reasoning as decor above. Empty for every recording that names none, which is most of
     * them: a twenty-second close pass has nothing to bookmark. */
    public milestones: Milestone[] = [],
    /** Pictures of the place laid over the reconstruction — see SceneReference. Not readonly, same
     * "reassigned wholesale on edit" reasoning as decor above. Empty for every recording made
     * before pictures could be laid over one. */
    public references: SceneReference[] = [],
    /** The roads the account's own plan draws, in metres from the observer's place — see Road.ts.
     * Not readonly, same "reassigned wholesale on edit" reasoning as decor above. Empty for every
     * recording that states none, which is every recording made before a plan could be read into
     * one; those still get the roads a survey of today reports, drawn faint. */
    public roads: StatedRoad[] = [],
    /** Lines, places and outlines an investigator drew over the place and the file imported — see
     * InvestigatorTrace. Not readonly, same "reassigned wholesale on edit" reasoning as decor
     * above. Empty for every recording that carries none. */
    public traces: InvestigatorTrace[] = []
  ) {
  }

  /**
   * Where the values of this recording came from — what the observer said, what was worked out from
   * it, and what was guessed so the reconstruction could run at all.
   *
   * Held here as one table rather than on each value, because it is a fact about the FILE and not
   * about the model: nothing that draws, computes or plays a sighting consults it, and wrapping
   * every number so that they could would be a change to all of them for a fact none of them use.
   * See Provenance, which takes it off on the way in and puts it back on the way out.
   *
   * Empty for every recording written before it existed, which reads correctly: no entry means
   * "stated", and stated is what those files were.
   */
  provenance: Provenance = Provenance.empty()

  /**
   * What loading this sighting's file had to make up or set aside — see RecordingIssue. Only what
   * the loader itself did; the check against the format runs apart (RecordingCheck), because it
   * needs the format's description, which is not worth shipping to every reader up front.
   */
  loadIssues: RecordingIssue[] = []

  /**
   * Who saw it and how their account reached this file — see Account.
   *
   * A field of its own rather than more of `observer`, which is one person's identity and is
   * structurally aligned with @rr0/data's own PeopleJson (see People). Not readonly, same
   * "reassigned wholesale on edit" reasoning as id and observer above.
   */
  account?: Account

  /**
   * Where the account can be read as it was given — see RecordingSource. A recording restates an
   * account; these let a reader go back to the words it restates, and see whether they have changed.
   */
  sources?: RecordingSource[]

  /**
   * What the observer took it to be, in metres — see InterpretationJson. The observer's own claim
   * about their account, and so part of it; an analyst's lives in the case instead. Not readonly,
   * same "reassigned wholesale" reasoning as account above.
   */
  interpretation?: InterpretationJson

  /**
   * How much the observer's body moves the view when they are not walking — see Stance. 1 is a
   * person standing or sitting, 0 an instrument on a tripod or anything else that does not move at
   * all, and a value between or above scales that sway. Absent means 1, except for an observer the
   * account says was paralysed, who does not move (tag "paralysis"), and for an exposure longer than
   * a hand can hold (see Stance.HAND_HELD_S), made on a tripod. Not readonly, same reasoning as
   * account above.
   */
  sway?: number

  /**
   * How bright the night sky is at this place, towns and all: the zenith of a moonless night, in
   * magnitudes per square arcsecond — what a Sky Quality Meter pointed up reads, and the "SQM" figure
   * the World Atlas of the artificial night sky brightness gives for a place (Falchi et al. 2016).
   * 22.0 is a natural sky; a suburb is about 19, a city centre 17.
   *
   * THE WHOLE SKY and not the towns' share alone, because that is the figure both sources give; the
   * towns' share is what is left once the natural 22.0 is taken out (see
   * NightSkyBrightness.artificialZenithNanolamberts). It brightens the sky, more toward the horizon,
   * hides the Milky Way and takes stars off the faintest an eye could see.
   *
   * Absent means a natural sky, which is what every recording made before this existed gets: the
   * sky they were drawn with is the one they keep. Its provenance says where the figure came from —
   * "derived" from the atlas for the place, or "stated" when the observer measured it. Not readonly,
   * same reasoning as account above.
   */
  lightPollution?: number

  /**
   * Whether the map of where the observer stood starts open when this recording is played or edited. Absent says nothing, and the player
   * decides: open for an observer who went somewhere (see ObserverPath.travels), closed for one who stayed put. A page embedding the
   * player has the last word (the `show-observer-map` attribute).
   *
   * The author's own choice, written by the editor when the map is opened or closed there: having it open while writing a place is what
   * a reader of the recording is then shown, and the other way round.
   */
  observerMap?: boolean

  /**
   * The speed of the film or sensor the picture was taken on, ISO — what a photographer loaded, as
   * the shutter is what they set (see exposureSeconds). Absent means the device's own (see
   * Instrument.medium); meaningless for an eye. Not readonly, same reasoning as account above.
   */
  iso?: number

  /**
   * The vehicle the observer was in, when it is not drawn — see ObserverVehicle. Heard from inside,
   * its engine turning with the observer's own journey (see VehicleDrive). Absent means on foot, or
   * in a vehicle the decor draws. Not readonly, same reasoning as account above.
   */
  vehicle?: ObserverVehicle

  /**
   * How many people THIS observer's account puts at the scene, themselves included — counted off the
   * decor, never stored.
   *
   * What a account-level evaluation reads: Poher's heaviest credibility rubric is the number of
   * observers, and this is the number this account claims. It is the observer's own belief and may
   * be wrong, which is exactly why it belongs to their recording and not to some census.
   *
   * Deliberately NOT the same number as the case's. A case gathers one recording per observer who
   * gave an account (see CaseFile), and four people in a car who produced one written account
   * between them are four here and one there. Both are true of different things, and evaluating a
   * case is a separate exercise from evaluating a account.
   *
   * Derived rather than stored for the reason every derived thing here is: two statements of one
   * fact are free to disagree, and of these the placement is the better one, since it says where
   * each of them stood rather than only how many there were.
   */
  get observerCount(): number {
    return 1 + this.decor.filter(object => object.kind === "observer").length
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

  static create(time?: SightingTime, place?: SightingLocation[], observer?: People): Sighting {
    return new Sighting(
      { eventType: "sighting", time, place },
      new Timeline(),
      new ObserverTrack(),
      new WeatherTrack(),
      new SoundTrack(),
      observer
    )
  }
}

/** Fallback pose used when a sighting has no observerTrack entry at t — the legacy static
 * place[0] (lat/lng only), with no known heading (renderers must treat this as azimuth-agnostic,
 * not "facing north"). Mirrors DEFAULT_ALTITUDE_DEG's role as SceneElement's existing fallback. */
const DEFAULT_ELEVATION_M = 0
const DEFAULT_PITCH_DEG = 0

/** Resolves the observer's pose at t: prefers observerTrack (interpolated), falls back to the
 * legacy static place[0] when the track has no keyframes. undefined only when neither exists. */
export function resolveObserverPoseAt(sighting: Sighting, t: number): ObserverPose | undefined {
  const trackPose = sighting.observerTrack.getInterpolatedPoseAt(t)
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

/** Resolves the weather as it actually was at t — the stated one, with rain that takes the time
 * real rain takes to start and stop (see WeatherTrack.getActualWeatherAt). What a scene draws; an
 * editor writing keyframes reads resolveWeatherAt instead. */
export function resolveActualWeatherAt(sighting: Sighting, t: number): Weather {
  return sighting.weatherTrack.getActualWeatherAt(t) ?? sighting.weather ?? DEFAULT_WEATHER
}

/** Resolves the sound at t (interpolated, see SoundTrack), falling back to DEFAULT_SOUND —
 * silence — for a recording whose track is empty, which is every recording made before the track
 * existed and every one whose observer was never asked. Silence is the only safe fallback: unlike
 * weather, whose DEFAULT_WEATHER stands for "unremarkable conditions", inventing a noise nobody
 * reported would be putting words in a observer's mouth. Playing nothing says nothing. */
export function resolveSoundAt(sighting: Sighting, t: number): SightingSound {
  return sighting.soundTrack.getInterpolatedSoundAt(t) ?? DEFAULT_SOUND
}
