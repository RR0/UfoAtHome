import { computeBodyPosition, sightingTimeToDate } from "../astronomy/CelestialPositions.js"
import { parseEdtfTime, type SightingTime } from "../model/Sighting.js"
import { TimeSpan } from "../model/TimeSpan.js"
import { Provenance, type ProvenanceEntry } from "../persistence/Provenance.js"
import type { SightingLighting, SightingRecordingJson } from "../persistence/sightingJson.js"
import { BestCaseSearch } from "./BestCaseSearch.js"
import type { FindingGround, ReadingFinding } from "./Interpretation.js"
import type { ReadingCheckTexts } from "./messages/ReadingCheckTexts.js"

/** Where an instrument stood and looked, and the clock it kept (see ReadingCheck.standOf). */
interface Stand { lat: number, lng: number, elevationM: number, headingDeg: number, utcOffsetHours?: number }

/** A value of the observation a reading may move, by where it is in the recording, and what it is called. */
const PLACES: readonly { path: string, what: "latitude" | "longitude" }[] = [
  { path: "place.locations.0.lat", what: "latitude" },
  { path: "place.locations.0.lng", what: "longitude" }
]

/**
 * What a reading of an observation is, set against the observation: the findings that come of it by themselves, beside those its author
 * wrote (see InterpretationJson.findings).
 *
 * A reading is the observation as whoever reads it holds it (see InterpretationEventJson), and it may move what is not known of it: an
 * hour nobody recorded, a place given as a region. Not what is: each value of the observation says how far it is known (see
 * StatedValue.range and Basis), and a reading that takes one beyond contradicts the observation head-on. The checks are those of the
 * values the readings of the cases so far moved, the time and the place, and the light the picture shows (see SightingLighting), which
 * is where the date, the hour, the place and the heading meet: the Sun they put together has to light the scene as the picture does.
 */
export class ReadingCheck {

  /** @param words What the findings say, in the language of whoever reads them: they are computed for them, never written down. */
  private readonly bestCases: BestCaseSearch
  /** The best cases found, by reading and account: a search of the whole sky, too long to run again on every drawing of a list. */
  private readonly found = new WeakMap<SightingRecordingJson, { account: SightingRecordingJson, key: string, findings: ReadingFinding[] }>()

  constructor(private readonly words: ReadingCheckTexts) {
    this.bestCases = new BestCaseSearch(words)
  }

  findingsOf(accountJson: SightingRecordingJson, readingJson: SightingRecordingJson): ReadingFinding[] {
    const account = Provenance.strip(accountJson)
    const reading = Provenance.strip(readingJson).recording
    const findings: ReadingFinding[] = []
    const time = this.timeFinding(account.recording.time, account.provenance.at("time"), reading.time)
    if (time) findings.push(time)
    for (const { path, what } of PLACES) {
      const found = this.numberFinding(ReadingCheck.at(account.recording, path), account.provenance.at(path), ReadingCheck.at(reading, path), this.words[what])
      if (found) findings.push({ ...found, path })
    }
    const lighting = account.recording.lighting
    if (lighting && ReadingCheck.movesTheSun(account.recording, reading)) {
      const found = this.lightingFinding(lighting, account.provenance.at("lighting"), reading)
      if (found) findings.push(found)
    }
    findings.push(...this.bestCasesOf(accountJson, readingJson))
    return findings
  }

  /** The findings of the reading's best case (see BestCaseSearch), found once for a reading and its account as they are. */
  private bestCasesOf(account: SightingRecordingJson, reading: SightingRecordingJson): ReadingFinding[] {
    const key = JSON.stringify([reading.interpretation?.mechanism, reading.lens, reading.instrument])
    const known = this.found.get(reading)
    if (known && known.account === account && known.key === key) return known.findings
    const findings = this.bestCases.findingsOf(account, reading)
    this.found.set(reading, { account, key, findings })
    return findings
  }

  /** Whether the instant is within an EDTF interval "start/end", each end taken as wide as it is said: "1976-06/1976-07" is the whole of June and July. */
  static withinInterval(instant: Date, interval: string): boolean | undefined {
    const [start, end] = interval.split("/")
    const from = start ? parseEdtfTime(start) : undefined
    const to = end ? parseEdtfTime(end) : undefined
    if (!from && !to) return undefined
    if (from && instant.getTime() < TimeSpan.earliestOf(from)) return false
    if (to && instant.getTime() > TimeSpan.latestOf(to)) return false
    return true
  }

  private timeFinding(accountTime: string | undefined, entry: ProvenanceEntry | undefined, readingTime: string | undefined): ReadingFinding | undefined {
    if (accountTime === undefined || readingTime === undefined || accountTime === readingTime) return undefined
    const parsed = parseEdtfTime(readingTime)
    const instant = parsed ? sightingTimeToDate(parsed, 0, 0) : undefined
    if (typeof entry?.range === "string" && instant) {
      const within = ReadingCheck.withinInterval(instant, entry.range)
      if (within === undefined) return undefined
      const words = within ? this.words.timeWithin : this.words.timeOutside
      return { text: ReadingCheck.fill(words, { time: readingTime, range: entry.range }), outcome: within ? "holds" : "fails", against: "established", path: "time" }
    }
    if (entry?.basis === "assumed") return undefined
    return { text: ReadingCheck.fill(this.words.timeChanged, { from: accountTime, time: readingTime }), outcome: "fails", against: "established", path: "time" }
  }

  private numberFinding(accountValue: unknown, entry: ProvenanceEntry | undefined, readingValue: unknown, what: string): ReadingFinding | undefined {
    if (typeof accountValue !== "number" || typeof readingValue !== "number" || Math.abs(accountValue - readingValue) < 1e-9) return undefined
    if (Array.isArray(entry?.range)) {
      const [min, max] = entry.range
      const within = readingValue >= min && readingValue <= max
      return {
        text: ReadingCheck.fill(within ? this.words.valueWithin : this.words.valueOutside, { what, value: readingValue, min, max }),
        outcome: within ? "holds" : "fails", against: "established"
      }
    }
    if (entry?.basis === "assumed") return undefined
    return { text: ReadingCheck.fill(this.words.valueChanged, { what, from: accountValue, value: readingValue }), outcome: "fails", against: "established" }
  }

  /** Whether the reading changes what puts the Sun where it is in the picture: the time, the place, where the instrument stood and looked. */
  private static movesTheSun(account: SightingRecordingJson, reading: SightingRecordingJson): boolean {
    const start = (json: SightingRecordingJson) => json.observerTrack?.keyframes?.[0]?.pose
    const a = start(account), b = start(reading)
    return account.time !== reading.time || account.utcOffsetHours !== reading.utcOffsetHours
      || JSON.stringify(account.place) !== JSON.stringify(reading.place)
      || a?.lat !== b?.lat || a?.lng !== b?.lng || a?.headingDeg !== b?.headingDeg
  }

  private lightingFinding(lighting: SightingLighting, entry: ProvenanceEntry | undefined, reading: SightingRecordingJson): ReadingFinding | undefined {
    const time = reading.time ? parseEdtfTime(reading.time) : undefined
    const sun = time ? ReadingCheck.sunOf(time, reading) : undefined
    if (!sun) return undefined
    const { bearing } = sun
    const { fromDeg: from, toDeg: to } = lighting.sunFromViewDeg ?? { fromDeg: 0, toDeg: 360 }
    const { minDeg: low, maxDeg: high } = lighting.sunAltitudeDeg ?? { minDeg: -90, maxDeg: 90 }
    const holds = ReadingCheck.lights(lighting, sun)
    const ground: FindingGround = entry?.basis === "assumed" ? "supposed" : "established"
    const round = (value: number) => Math.round(value)
    return {
      text: ReadingCheck.fill(holds ? this.words.lightingHolds : this.words.lightingFails, {
        bearing: round(bearing), altitude: round(sun.altitudeDeg), from, to,
        altitudes: lighting.sunAltitudeDeg ? ReadingCheck.fill(this.words.altitudes, { min: low, max: high }) : ""
      }),
      outcome: holds ? "holds" : "fails", against: ground, path: "lighting", ...(entry?.rationale ? { rationale: entry.rationale } : {})
    }
  }

  /** Where a reading's instrument stood and looked at the start, and the clock it kept: what puts its Sun where it is. */
  private static standOf(reading: SightingRecordingJson): Stand | undefined {
    const stripped = Provenance.strip(reading).recording
    const pose = stripped.observerTrack?.keyframes?.[0]?.pose
    const location = stripped.place?.locations?.[0] as { lat?: number, lng?: number } | undefined
    const lat = pose?.lat ?? location?.lat
    const lng = pose?.lng ?? location?.lng
    if (lat === undefined || lng === undefined || pose?.headingDeg === undefined) return undefined
    return { lat, lng, elevationM: pose.elevationM ?? 0, headingDeg: pose.headingDeg, utcOffsetHours: stripped.utcOffsetHours }
  }

  /**
   * Where the Sun was for a reading at `time`: its bearing from the way the instrument looked at the start, and its height. Undefined for
   * a time with no hour, or a reading that does not say where it stood or looked.
   */
  static sunOf(time: SightingTime, reading: SightingRecordingJson): { bearing: number, altitudeDeg: number } | undefined {
    const stand = ReadingCheck.standOf(reading)
    return stand ? ReadingCheck.sunFrom(time, stand) : undefined
  }

  private static sunFrom(time: SightingTime, stand: Stand): { bearing: number, altitudeDeg: number } | undefined {
    if (time.hour === undefined) return undefined
    const date = sightingTimeToDate(time, stand.lng, stand.utcOffsetHours)
    if (!date) return undefined
    const sun = computeBodyPosition("Sun", date, stand)
    return { bearing: ((sun.azimuthDeg - stand.headingDeg) % 360 + 360) % 360, altitudeDeg: sun.altitudeDeg }
  }

  /** Whether a Sun there lights the scene as `lighting` says the picture shows it. */
  static lights(lighting: SightingLighting, sun: { bearing: number, altitudeDeg: number }): boolean {
    const inBearing = lighting.sunFromViewDeg ? ReadingCheck.onArc(sun.bearing, lighting.sunFromViewDeg.fromDeg, lighting.sunFromViewDeg.toDeg) : true
    const inAltitude = !lighting.sunAltitudeDeg || (sun.altitudeDeg >= lighting.sunAltitudeDeg.minDeg && sun.altitudeDeg <= lighting.sunAltitudeDeg.maxDeg)
    return inBearing && inAltitude
  }

  /**
   * The time of the same day nearest `time`, to the minute, at which the reading's Sun lights the scene as the picture shows it: what an
   * hour of a reading is brought back to, its date, place and heading as the reading has them, so that moving one of those moves the
   * hours it allows. `time` itself when it does; undefined when no minute of that day does, or nothing says where the Sun was.
   */
  static nearestLit(lighting: SightingLighting, time: SightingTime, reading: SightingRecordingJson): SightingTime | undefined {
    const at = (minutes: number): SightingTime => ({ ...time, hour: Math.floor(minutes / 60), minute: minutes % 60, second: undefined, raw: undefined })
    const stand = ReadingCheck.standOf(reading)
    if (!stand) return undefined
    const lit = (minutes: number) => {
      const sun = ReadingCheck.sunFrom(at(minutes), stand)
      return sun !== undefined && ReadingCheck.lights(lighting, sun)
    }
    if (time.hour === undefined) return undefined
    const asked = time.hour * 60 + (time.minute ?? 0)
    if (lit(asked)) return time
    // Every five minutes, then the minute of the edge nearest the one asked.
    const STEP = 5
    let best: number | undefined
    for (let minutes = 0; minutes < 24 * 60; minutes += STEP) {
      if (lit(minutes) && (best === undefined || Math.abs(minutes - asked) < Math.abs(best - asked))) best = minutes
    }
    if (best === undefined) return undefined
    const towards = asked < best ? -1 : 1
    while (best + towards >= 0 && best + towards < 24 * 60 && lit(best + towards) && Math.abs(best + towards - asked) < Math.abs(best - asked)) best += towards
    return at(best)
  }

  /** Whether `angle` is on the arc that runs clockwise from `from` to `to`, all in degrees. */
  private static onArc(angle: number, from: number, to: number): boolean {
    const span = ((to - from) % 360 + 360) % 360
    const along = ((angle - from) % 360 + 360) % 360
    return along <= span
  }

  private static at(json: unknown, path: string): unknown {
    return path.split(".").reduce<unknown>((value, step) => (value as Record<string, unknown> | undefined)?.[step], json)
  }

  private static fill(template: string, values: Record<string, string | number>): string {
    return template.replace(/\{(\w+)\}/g, (whole, key: string) => key in values ? String(values[key]) : whole)
  }
}
