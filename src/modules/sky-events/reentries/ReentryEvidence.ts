import { ReentrySighting } from "./Reentry.js"
import type { GeoPoint, ReentryJson, SkyPoint } from "./Reentry.js"
import { ReentryTypes } from "./types/ReentryTypes.js"
import { FireballArchive } from "../../../engine/astronomy/FireballArchive.js"
import type { FireballRecord } from "../../../engine/astronomy/FireballArchive.js"
import { ReentryArchive } from "../../../engine/astronomy/ReentryArchive.js"
import type { ReentryCandidate } from "../../../engine/astronomy/ReentryArchive.js"
import { computeBodyPosition } from "../../../engine/astronomy/CelestialPositions.js"

/** What a re-entry stated looked like from where the witness stood: where it appeared and went out, when, for how long, how bright. */
export interface StatedView {
  /** When it appeared, ms UTC. */
  startMs: number
  durationS: number
  from: { azimuthDeg: number, altitudeDeg: number }
  to: { azimuthDeg: number, altitudeDeg: number }
  /** Its brightest absolute magnitude, at 100 km. */
  peakAbsoluteMagnitude: number
}

/** How far a match is from what was stated, and how far it may be for a witness (see the margins of ReentryEvidence). */
export interface FireballMatch {
  record: FireballRecord
  offsetMinutes: number
  headingOffDeg: number
  altitudeOffDeg: number
}

/**
 * What the sources say of one re-entry the recording states:
 * - `known`: a record matches it, within the errors a witness makes: what was entered is in fact known.
 * - `possible`: a record coarse in time (a day, a window of hours) fits, without saying it crossed this sky.
 * - `expectedAbsent`: had it been there, a source that watches for such things would have it, and has nothing.
 * - `impossible`: nothing of its type could be there then (an object in orbit before the first one).
 * - `uninformative`: no source would have it whether or not it was there, and why.
 * - `unchecked`: the sources could not be asked.
 */
export type ReentryFinding =
  | { verdict: "known", source: "gmn", match: FireballMatch }
  | { verdict: "known", source: "catalogue", candidate: ReentryCandidate, by: "object" | "seen" }
  | { verdict: "possible", source: "catalogue", candidate: ReentryCandidate }
  | { verdict: "expectedAbsent", source: "gmn", absoluteMagnitude: number, watchedCount: number }
  | { verdict: "expectedAbsent", source: "catalogue" }
  | { verdict: "impossible", source: "catalogue" }
  | { verdict: "uninformative", source: "gmn", reason: "faint" | "beforeArchive" | "unwatched" | "daylight" }
  | { verdict: "uninformative", source: "none", reason: "typeUnknown" }
  | { verdict: "unchecked", source: "gmn" | "catalogue" | "none", reason: "unreachable" | "noDateOrPlace" }

/** The archives asked, given to `check` so that a test gives its own. */
export interface EvidenceArchives {
  fireballs: Pick<FireballArchive, "between">
  reentries: Pick<ReentryArchive, "candidates">
}

/**
 * A re-entry the recording states, confronted with the sources that record such events: whether it is in fact a known event, and when it
 * is not, whether its absence tells (it should have been there had it happened) or not (nothing would have recorded it). What a source
 * does not watch for is never held against an account; what it would have seen is.
 *
 * The margins are those of an observer's errors, as the consolidated readings state them (see ConsolidatedErrorModel): a time of day
 * within six minutes unless read on a clock, a heading within 45°, an elevation overestimated (the true one between 0.3 times the one
 * given and the one given), a duration within a factor of three.
 */
export class ReentryEvidence {
  static readonly TIME_MARGIN_MIN = 6
  static readonly HEADING_MARGIN_DEG = 45
  static readonly ELEVATION_LOW_FACTOR = 0.3
  /** Degrees added to the elevation's range, for what is said to the degree near the horizon. */
  static readonly ELEVATION_SLACK_DEG = 5
  static readonly DURATION_FACTOR = 3
  /** The faintest the fireball archive holds: absolute magnitude −3 (see FireballArchive). */
  static readonly ARCHIVED_MAGNITUDE = -3
  /** How near the network's records of the month have to be for its cameras to be said to watch this sky, km, and how many of them. */
  static readonly WATCHED_KM = 600
  static readonly WATCHED_COUNT = 5
  /** The Sun below this, degrees, and the cameras of the network are running. */
  static readonly NIGHT_SUN_DEG = -12
  /** Sputnik 1: nothing came down from orbit before. */
  static readonly FIRST_ORBIT_MS = Date.UTC(1957, 9, 4)

  private static readonly shared: EvidenceArchives = { fireballs: new FireballArchive(), reentries: new ReentryArchive() }

  /** What the witness saw of `reentry`: where they said they saw it when they did (see ReentrySeen), else its path seen from them. */
  static viewOf(reentry: ReentryJson, start: Date, observer: GeoPoint): StatedView | undefined {
    const track = reentry.track
    if (track.length < 2) return undefined
    const first = track[0]
    const last = track[track.length - 1]
    const seen = reentry.seen
    const pointOf = (place: typeof first): SkyPoint => ReentrySighting.seenFrom(observer, { lat: place.lat, lng: place.lng, heightM: place.altitudeKm * 1000 })
    const from = seen?.fromAzimuthDeg !== undefined && seen.fromAltitudeDeg !== undefined ? { azimuthDeg: seen.fromAzimuthDeg, altitudeDeg: seen.fromAltitudeDeg } : pointOf(first)
    const to = seen?.toAzimuthDeg !== undefined && seen.toAltitudeDeg !== undefined ? { azimuthDeg: seen.toAzimuthDeg, altitudeDeg: seen.toAltitudeDeg } : pointOf(last)
    const durationS = seen?.durationS ?? (last.t - first.t) / 1000
    const peakAbsoluteMagnitude = Math.min(...reentry.fragments.flatMap(fragment => [fragment.absoluteMagnitude, ...(fragment.lightCurve ?? []).map(point => point.absoluteMagnitude)]))
    return { startMs: start.getTime() + first.t, durationS, from: { azimuthDeg: from.azimuthDeg, altitudeDeg: from.altitudeDeg }, to: { azimuthDeg: to.azimuthDeg, altitudeDeg: to.altitudeDeg }, peakAbsoluteMagnitude }
  }

  /** The smallest angle between two azimuths, degrees. */
  static azimuthOff(a: number, b: number): number {
    const d = Math.abs(((a - b) % 360 + 360) % 360)
    return Math.min(d, 360 - d)
  }

  /** How far a true elevation is outside what a witness who gave `stated` may have seen, degrees: 0 within. */
  static elevationOff(stated: number, actual: number): number {
    const low = Math.max(0, stated * ReentryEvidence.ELEVATION_LOW_FACTOR) - ReentryEvidence.ELEVATION_SLACK_DEG
    const high = stated + ReentryEvidence.ELEVATION_SLACK_DEG
    return actual < low ? low - actual : actual > high ? actual - high : 0
  }

  /** A fireball on record matches what was stated when its time, its ends in the sky and its duration all are within a witness's errors. */
  static matchFireball(view: StatedView, record: FireballRecord, observer: GeoPoint): FireballMatch | undefined {
    const offsetMs = record.t < view.startMs ? view.startMs - record.t : 0
    const lateMs = record.t > view.startMs ? record.t - view.startMs : 0
    if (Math.max(offsetMs, lateMs) > ReentryEvidence.TIME_MARGIN_MIN * 60_000) return undefined
    const from = ReentrySighting.seenFrom(observer, { lat: record.from[0], lng: record.from[1], heightM: record.from[2] * 1000 })
    const to = ReentrySighting.seenFrom(observer, { lat: record.to[0], lng: record.to[1], heightM: record.to[2] * 1000 })
    if (from.altitudeDeg < 0 && to.altitudeDeg < 0) return undefined
    const headingOffDeg = Math.max(ReentryEvidence.azimuthOff(view.from.azimuthDeg, from.azimuthDeg), ReentryEvidence.azimuthOff(view.to.azimuthDeg, to.azimuthDeg))
    if (headingOffDeg > ReentryEvidence.HEADING_MARGIN_DEG) return undefined
    const altitudeOffDeg = Math.max(ReentryEvidence.elevationOff(view.from.altitudeDeg, from.altitudeDeg), ReentryEvidence.elevationOff(view.to.altitudeDeg, to.altitudeDeg))
    if (altitudeOffDeg > 0) return undefined
    const factor = ReentryEvidence.DURATION_FACTOR
    if (record.durationS > 0 && (view.durationS < record.durationS / factor || view.durationS > record.durationS * factor)) return undefined
    return { record, offsetMinutes: Math.round((offsetMs + lateMs) / 60_000), headingOffDeg: Math.round(headingOffDeg), altitudeOffDeg: Math.round(Math.abs(to.altitudeDeg - view.to.altitudeDeg)) }
  }

  /** What the sources say of `reentry`, stated in a recording that starts at `start`, seen from `observer` (see ReentryFinding). */
  static async check(reentry: ReentryJson, start: Date | undefined, observer: GeoPoint | undefined, archives: EvidenceArchives = ReentryEvidence.shared): Promise<ReentryFinding[]> {
    if (!start || !observer) return [{ verdict: "unchecked", source: "none", reason: "noDateOrPlace" }]
    const view = ReentryEvidence.viewOf(reentry, start, observer)
    if (!view) return [{ verdict: "unchecked", source: "none", reason: "noDateOrPlace" }]
    const nature = ReentryTypes.of(reentry.type)?.nature
    const findings: ReentryFinding[] = []
    if (nature !== "artificial") findings.push(...await ReentryEvidence.checkFireballs(view, observer, nature === "natural", archives))
    if (nature !== "natural") findings.push(...await ReentryEvidence.checkCatalogue(reentry, view, observer, nature === "artificial", archives))
    if (nature === undefined && !findings.some(finding => finding.verdict === "known" || finding.verdict === "possible")) {
      return [...findings.filter(finding => finding.verdict === "unchecked"), { verdict: "uninformative", source: "none", reason: "typeUnknown" }]
    }
    return findings
  }

  private static async checkFireballs(view: StatedView, observer: GeoPoint, natural: boolean, archives: EvidenceArchives): Promise<ReentryFinding[]> {
    const margin = ReentryEvidence.TIME_MARGIN_MIN * 60_000
    if (!FireballArchive.mayCover(view.startMs)) return natural ? [{ verdict: "uninformative", source: "gmn", reason: "beforeArchive" }] : []
    const records = await archives.fireballs.between(view.startMs - margin, view.startMs + margin + view.durationS * 1000)
    if (records === undefined) return natural ? [{ verdict: "unchecked", source: "gmn", reason: "unreachable" }] : []
    const matches = records.map(record => ReentryEvidence.matchFireball(view, record, observer)).filter((match): match is FireballMatch => match !== undefined)
      .sort((a, b) => a.offsetMinutes - b.offsetMinutes || a.headingOffDeg - b.headingOffDeg)
    if (matches.length > 0) return [{ verdict: "known", source: "gmn", match: matches[0] }]
    if (!natural) return []
    if (view.peakAbsoluteMagnitude > ReentryEvidence.ARCHIVED_MAGNITUDE) return [{ verdict: "uninformative", source: "gmn", reason: "faint" }]
    if (computeBodyPosition("Sun", new Date(view.startMs), { lat: observer.lat, lng: observer.lng, elevationM: 0 }).altitudeDeg > ReentryEvidence.NIGHT_SUN_DEG) {
      return [{ verdict: "uninformative", source: "gmn", reason: "daylight" }]
    }
    // Whether the network watches this sky: as many fireballs as it records near here in a month.
    const month = new Date(view.startMs)
    const monthStart = Date.UTC(month.getUTCFullYear(), month.getUTCMonth(), 1)
    const monthEnd = Date.UTC(month.getUTCFullYear(), month.getUTCMonth() + 1, 1) - 1
    const ofMonth = await archives.fireballs.between(monthStart, monthEnd) ?? []
    const watchedCount = ofMonth.filter(record => ReentryArchive.distanceKm(observer.lat, observer.lng, record.from[0], record.from[1]) <= ReentryEvidence.WATCHED_KM).length
    if (watchedCount < ReentryEvidence.WATCHED_COUNT) return [{ verdict: "uninformative", source: "gmn", reason: "unwatched" }]
    return [{ verdict: "expectedAbsent", source: "gmn", absoluteMagnitude: view.peakAbsoluteMagnitude, watchedCount }]
  }

  private static async checkCatalogue(reentry: ReentryJson, view: StatedView, observer: GeoPoint, artificial: boolean, archives: EvidenceArchives): Promise<ReentryFinding[]> {
    if (view.startMs < ReentryEvidence.FIRST_ORBIT_MS) return artificial ? [{ verdict: "impossible", source: "catalogue" }] : []
    const margin = ReentryEvidence.TIME_MARGIN_MIN * 60_000
    const candidates = await archives.reentries.candidates(view.startMs - margin, view.startMs + margin + view.durationS * 1000, observer)
    if (candidates === undefined) return artificial ? [{ verdict: "unchecked", source: "catalogue", reason: "unreachable" }] : []
    // The object it names, when the catalogue has it then: it is that one.
    const object = reentry.object
    const named = object && candidates.find(candidate => (object.cosparId && candidate.record.cosparId === object.cosparId) || (object.norad !== undefined && candidate.record.norad === object.norad))
    if (named) return [{ verdict: "known", source: "catalogue", candidate: named, by: "object" }]
    const seen = candidates.find(candidate => candidate.record.precision === "minute" && candidate.seenKm !== undefined
      && (candidate.offsetMinutes ?? 0) <= ReentryEvidence.TIME_MARGIN_MIN)
    if (seen) return [{ verdict: "known", source: "catalogue", candidate: seen, by: "seen" }]
    if (candidates.length > 0) return candidates.slice(0, 3).map(candidate => ({ verdict: "possible", source: "catalogue", candidate }) as const)
    return artificial ? [{ verdict: "expectedAbsent", source: "catalogue" }] : []
  }
}
