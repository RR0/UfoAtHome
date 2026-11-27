import { Provenance } from "../persistence/Provenance.js"
import type { Sighting } from "../model/Sighting.js"
import type { AccountStatement, CandidateTrack, StructuralReading } from "./CandidateSearch.js"
import { CandidateSearch } from "./CandidateSearch.js"
import { WitnessError } from "./WitnessError.js"
import { computeBodyMagnitude, computeBodyPosition, equatorialToHorizontal } from "../astronomy/CelestialPositions.js"
import type { CelestialBody, ObserverGeo } from "../astronomy/CelestialPositions.js"
import { BRIGHT_STARS } from "../astronomy/brightStarCatalog.js"
import type { BrightStar } from "../astronomy/brightStarCatalog.js"
import type { SatellitePosition } from "../astronomy/SatellitePasses.js"

/** Where and when the sky is looked at: the instant the recording starts, and the observer. */
export interface SkyStart {
  date: Date
  observer: ObserverGeo
}

/** The faintest a light can be and still be seen, given how high the Sun is (see visibleMagnitudeLimit). */
export type MagnitudeLimit = (sunAltitudeDeg: number) => number

/**
 * The candidates of the sky an account may be a misperception of, as tracks the candidate search follows (see CandidateSearch): the Moon,
 * the planets, the bright stars, a satellite. Shared by the editor's candidates (CandidatesView) and the scenario sweep (ScenarioSweep),
 * which follows them from each candidate place and date.
 */
export class SkyCandidates {

  static readonly PLANETS: readonly CelestialBody[] = ["Venus", "Mars", "Jupiter", "Saturn"]
  /** The ISS's catalogue number: the brightest satellite, and the one most often reported. */
  static readonly ISS_NORAD = 25544

  /**
   * What the account states of its main phenomenon: the first shape, at its first keyframe, and how it moved and grew from there to the
   * last instant it is placed; with that first instant, ms of the recording, where every candidate is looked at from.
   */
  static statement(sighting: Sighting): { statement: AccountStatement, t: number } | undefined {
    const timeline = sighting.timeline
    const first = timeline.sourceIds[0]
    if (!first) return undefined
    const k = timeline.allKeyframes.findIndex(keyframe => keyframe.shapes.some(state => state.sourceId === first))
    const t = timeline.allKeyframes[k]?.t ?? 0
    const shape = timeline.getInterpolatedShapeAt(t, first)
    if (!shape?.aim) return undefined
    // A size the account only supposes says nothing a candidate could be too big or too small for.
    const n = k >= 0 ? timeline.allKeyframes[k].shapes.findIndex(state => state.sourceId === first) : -1
    const sizeSupposed = n >= 0 && Provenance.free(sighting.provenance.at(`timeline.keyframes.${k}.shapes.${n}.shape.angular`))
    const statement: AccountStatement = { aim: shape.aim, ...(sizeSupposed ? {} : { widthDeg: shape.angular?.widthDeg }), timeHow: sighting.provenance.at("time")?.how }
    const last = [...timeline.allKeyframes].reverse().find(keyframe => keyframe.t > t && timeline.getShapeAt(keyframe.t, first)?.aim)
    const end = last ? timeline.getInterpolatedShapeAt(last.t, first) : undefined
    if (last && end?.aim) {
      statement.motion = { sweepDeg: CandidateSearch.separation(shape.aim, end.aim), spanMinutes: (last.t - t) / 60_000 }
      const from = shape.angular?.widthDeg
      const to = end.angular?.widthDeg
      if (from && to && !sizeSupposed) statement.growth = to / from
    }
    return { statement, t }
  }

  /** The Moon or a planet, seen from `start.observer` `t` ms into the recording and `offsetMinutes` after: above the horizon, and bright enough. */
  static body(name: CelestialBody, label: string, start: SkyStart, t: number, limitAt: MagnitudeLimit): CandidateTrack {
    return {
      id: name,
      label,
      at: (offsetMinutes: number) => {
        const date = new Date(start.date.getTime() + t + offsetMinutes * 60_000)
        const position = computeBodyPosition(name, date, start.observer)
        if (position.altitudeDeg < 0) return undefined
        const sun = computeBodyPosition("Sun", date, start.observer).altitudeDeg
        const magnitude = name === "Moon" ? -10 : computeBodyMagnitude(name, date)
        if (magnitude > limitAt(sun)) return undefined
        return { aim: { azimuthDeg: position.azimuthDeg, altitudeDeg: position.altitudeDeg }, widthDeg: name === "Moon" ? WitnessError.MOON_DEG : 0.01, magnitude }
      },
      // A body of the sky stands still against the horizon: seen moving, it is by the autokinetic effect, or behind drifting clouds.
      readings: ["still-seen-moving"]
    }
  }

  /**
   * The `count` bright stars (`maxMag` at the faintest) seen when the recording starts nearest where the account puts its phenomenon: a star
   * stands still against the horizon but for the sky's turning, so only those the heading and elevation laws could reach are worth a try.
   * Without a stated direction, the brightest seen.
   */
  static stars(start: SkyStart, t: number, statement: AccountStatement, limitAt: MagnitudeLimit, count: number, maxMag: number): { star: BrightStar, track: Omit<CandidateTrack, "label"> }[] {
    const dateAt = (offsetMinutes: number) => new Date(start.date.getTime() + t + offsetMinutes * 60_000)
    const sunAt = (date: Date) => computeBodyPosition("Sun", date, start.observer).altitudeDeg
    const limit = limitAt(sunAt(dateAt(0)))
    const aim = statement.aim
    const away = (position: { azimuthDeg: number, altitudeDeg: number }) => !aim ? 0 : CandidateSearch.separation(aim, position)
    return BRIGHT_STARS
      .filter(star => star.mag <= Math.min(limit, maxMag))
      .map(star => ({ star, position: equatorialToHorizontal(star.raHours, star.decDeg, dateAt(0), start.observer) }))
      .filter(({ position }) => position.altitudeDeg > 0)
      .sort((a, b) => away(a.position) - away(b.position) || a.star.mag - b.star.mag)
      .slice(0, count)
      .map(({ star }) => ({
        star,
        track: {
          id: `star-${star.name}`,
          at: (offsetMinutes: number) => {
            const date = dateAt(offsetMinutes)
            const position = equatorialToHorizontal(star.raHours, star.decDeg, date, start.observer)
            if (position.altitudeDeg < 0 || star.mag > limitAt(sunAt(date))) return undefined
            return { aim: { azimuthDeg: position.azimuthDeg, altitudeDeg: position.altitudeDeg }, widthDeg: 0.01, magnitude: star.mag }
          },
          readings: ["still-seen-moving"] as StructuralReading[]
        }
      }))
  }

  /** A satellite, followed by `positionAt`, seen when it is above the horizon, lit by the Sun, and bright enough. */
  static satellite(id: string, label: string, positionAt: (date: Date) => SatellitePosition | undefined, start: SkyStart, t: number,
                   limitAt?: MagnitudeLimit): CandidateTrack {
    return {
      id,
      label,
      at: (offsetMinutes: number) => {
        const date = new Date(start.date.getTime() + t + offsetMinutes * 60_000)
        const seen = positionAt(date)
        if (!seen || seen.altitudeDeg < 0 || seen.sunlitFraction < 0.5) return undefined
        if (limitAt && seen.magnitude !== undefined && seen.magnitude > limitAt(computeBodyPosition("Sun", date, start.observer).altitudeDeg)) return undefined
        return { aim: { azimuthDeg: seen.azimuthDeg, altitudeDeg: seen.altitudeDeg }, widthDeg: 0.01, magnitude: seen.magnitude }
      },
      // A tumbling stage or a panel catching the Sun flares: brighter for a few seconds.
      readings: ["brightening-as-approach"]
    }
  }
}
