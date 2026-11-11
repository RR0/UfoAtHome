import { computeBodyPosition, sightingTimeToDate } from "../astronomy/CelestialPositions.js"
import { parseEdtfTime } from "../model/Sighting.js"
import { TimeSpan } from "../model/TimeSpan.js"
import { Provenance, type ProvenanceEntry } from "../persistence/Provenance.js"
import type { SightingLighting, SightingRecordingJson } from "../persistence/sightingJson.js"
import type { FindingGround, ReadingFinding } from "./Interpretation.js"
import type { ReadingCheckTexts } from "./messages/ReadingCheckTexts.js"

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
  constructor(private readonly words: ReadingCheckTexts) {}

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
    const pose = reading.observerTrack?.keyframes?.[0]?.pose
    const location = reading.place?.locations?.[0] as { lat?: number, lng?: number } | undefined
    const lat = pose?.lat ?? location?.lat
    const lng = pose?.lng ?? location?.lng
    const time = reading.time ? parseEdtfTime(reading.time) : undefined
    if (lat === undefined || lng === undefined || !time || pose?.headingDeg === undefined) return undefined
    const date = sightingTimeToDate(time, lng, reading.utcOffsetHours)
    if (!date) return undefined
    const sun = computeBodyPosition("Sun", date, { lat, lng, elevationM: pose.elevationM ?? 0 })
    const bearing = ((sun.azimuthDeg - pose.headingDeg) % 360 + 360) % 360
    const { fromDeg: from, toDeg: to } = lighting.sunFromViewDeg ?? { fromDeg: 0, toDeg: 360 }
    const inBearing = lighting.sunFromViewDeg ? ReadingCheck.onArc(bearing, from, to) : true
    const { minDeg: low, maxDeg: high } = lighting.sunAltitudeDeg ?? { minDeg: -90, maxDeg: 90 }
    const inAltitude = sun.altitudeDeg >= low && sun.altitudeDeg <= high
    const holds = inBearing && inAltitude
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
