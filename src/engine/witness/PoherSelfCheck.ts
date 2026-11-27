import type { BodyJson } from "../interpretation/Interpretation.js"
import { BodyPlacement, type BodyState } from "../interpretation/BodyPlacement.js"
import { resolveWeatherAt, type Sighting } from "../model/Sighting.js"
import { computeBodyPosition, sightingTimeToDate } from "../astronomy/CelestialPositions.js"
import { WitnessError } from "./WitnessError.js"
import { PoherAnswers, type PoherAnswer, type PoherFacts, type PoherMatrix } from "./PoherMatrix.js"

/** A direction across the sky at an instant, milliseconds. */
export interface TimedAim {
  t: number
  azimuthDeg: number
  altitudeDeg: number
}

/** How far a phenomenon moved across the sky and how: what Poher's questions on the path and the angular speed ask (see PoherFacts). */
export class PoherMotion {
  /** The angle between two directions, degrees. */
  static separation(a: { azimuthDeg: number, altitudeDeg: number }, b: { azimuthDeg: number, altitudeDeg: number }): number {
    const toRad = Math.PI / 180
    const cos = Math.sin(a.altitudeDeg * toRad) * Math.sin(b.altitudeDeg * toRad) + Math.cos(a.altitudeDeg * toRad) * Math.cos(b.altitudeDeg * toRad) * Math.cos((a.azimuthDeg - b.azimuthDeg) * toRad)
    return Math.acos(Math.max(-1, Math.min(1, cos))) / toRad
  }

  /** From the directions it was seen in, in the order of time: nothing for fewer than two. */
  static of(aims: readonly TimedAim[]): Pick<PoherFacts, "sweepDeg" | "straysDeg" | "speedDegPerS" | "speedVariation"> {
    if (aims.length < 2) return {}
    const steps = aims.slice(1).map((at, i) => ({ deg: PoherMotion.separation(aims[i], at), s: (at.t - aims[i].t) / 1000 }))
    const sweepDeg = PoherMotion.separation(aims[0], aims[aims.length - 1])
    const travelled = steps.reduce((sum, step) => sum + step.deg, 0)
    const facts: ReturnType<typeof PoherMotion.of> = { sweepDeg, straysDeg: Math.max(0, travelled - sweepDeg) / 2 }
    const span = (aims[aims.length - 1].t - aims[0].t) / 1000
    if (span > 0) {
      facts.speedDegPerS = travelled / span
      const fastest = Math.max(...steps.filter(step => step.s > 0).map(step => step.deg / step.s))
      facts.speedVariation = facts.speedDegPerS > 0 ? fastest / facts.speedDegPerS : 0
    }
    return facts
  }
}

/** What an account answers of Poher's questions (see PoherFacts). */
export class PoherAccountFacts {
  /**
   * What the recording says that Poher's matrix asks about: the Sun at the start, the duration, the weather when it is the record's, and of
   * the main phenomenon its elevation, size, how far, how straight and how fast it moved, its colours and its brilliance; how many
   * phenomena and observers; whether anything was heard.
   *
   * @param groundElevationM The height of the ground under the observer, metres: where the Sun is seen from.
   */
  static of(sighting: Sighting, groundElevationM = 0): PoherFacts {
    const facts: PoherFacts = {}
    const event = sighting.event
    const place = event.place?.[0]
    if (place && event.time?.year !== undefined && event.time.hour !== undefined) {
      const date = sightingTimeToDate(event.time, place.lng, event.utcOffsetHours)
      if (date) facts.sunAltitudeDeg = computeBodyPosition("Sun", date, { lat: place.lat, lng: place.lng, elevationM: groundElevationM }).altitudeDeg
    }
    if (event.durationSeconds !== undefined) facts.durationSeconds = event.durationSeconds
    // The weather only when it is the record's: the default sky is no statement that the sky was clear.
    if (sighting.weatherTrack.allKeyframes.length > 0) {
      const weather = resolveWeatherAt(sighting, 0)
      facts.cloudCover = weather.cloudCover
      facts.lightning = weather.storm
      facts.lowVisibility = weather.precipitationType !== "none" && weather.precipitationIntensity > 0.3
    }
    const timeline = sighting.timeline
    const first = timeline.sourceIds[0]
    if (first) {
      const keyframes = timeline.allKeyframes.filter(keyframe => keyframe.shapes.some(state => state.sourceId === first))
      const aims = keyframes.map(keyframe => ({ t: keyframe.t, shape: timeline.getShapeAt(keyframe.t, first)! })).filter(at => at.shape?.aim)
      const shape = timeline.getInterpolatedShapeAt(keyframes[0]?.t ?? 0, first)
      if (shape?.aim) facts.elevationDeg = shape.aim.altitudeDeg
      if (shape?.angular) {
        facts.widthDeg = shape.angular.widthDeg
        const ratio = shape.angular.heightDeg > 0 ? shape.angular.widthDeg / shape.angular.heightDeg : 1
        facts.round = shape.kind === "oval" && ratio > 0.8 && ratio < 1.25
      }
      if (shape?.brightness !== undefined) facts.brightness = shape.brightness
      Object.assign(facts, PoherMotion.of(aims.map(at => ({ t: at.t, ...at.shape.aim! }))))
    }
    // A group of shapes is one phenomenon drawn in parts.
    const counted = new Set(timeline.sourceIds.map(id => timeline.groupMembers(id)?.[0] ?? id))
    if (counted.size > 0) facts.count = counted.size
    // In a row: three or more where they first stand, none further from the line between the two furthest apart than a tenth of it.
    const aims = [...counted].map(id => timeline.getInterpolatedShapeAt(0, id)?.aim).filter(aim => aim !== undefined)
    if (aims.length >= 3) {
      const toRad = Math.PI / 180
      const points = aims.map(aim => ({ x: (((aim.azimuthDeg - aims[0].azimuthDeg) % 360 + 540) % 360 - 180) * Math.cos(aim.altitudeDeg * toRad), y: aim.altitudeDeg }))
      let [a, b] = [points[0], points[1]]
      for (const p of points) for (const q of points) if (Math.hypot(p.x - q.x, p.y - q.y) > Math.hypot(a.x - b.x, a.y - b.y)) [a, b] = [p, q]
      const span = Math.hypot(a.x - b.x, a.y - b.y)
      facts.aligned = span > 0 && points.every(p => Math.abs((b.x - a.x) * (a.y - p.y) - (a.x - p.x) * (b.y - a.y)) / span <= Math.max(0.5, span * 0.1))
    }
    // One colour a phenomenon: the parts of one drawn in several colours are not several lights.
    const colors = new Set([...counted].map(id => timeline.getInterpolatedShapeAt(0, id)?.color).filter((color): color is string => color !== undefined))
    if (colors.size > 0) facts.colors = [...colors]
    facts.observers = sighting.observerCount
    if (sighting.instrument.category === "eye") facts.nakedEye = true
    if (sighting.soundTrack.allKeyframes.some(keyframe => keyframe.sound.kind !== "none")) facts.sound = true
    return facts
  }
}

/** Where a reading's own phenomenon stands when Poher's matrix is asked about what the reading shows. */
export interface PoherSelfRank {
  /** Its rank, from 1, among the phenomena the matrix lists; undefined when the matrix does not list it. */
  rank?: number
  /** How many other phenomena it is ranked equal with. */
  tied?: number
  /** How many phenomena the matrix ranks. */
  of: number
  /** The phenomenon the matrix puts first. */
  first?: string
  /** The answers that rule it out, which a reading that is what it says should never meet. */
  excludedBy: string[]
  /** The answers the synthetic observation gave. */
  answers: PoherAnswer[]
}

/**
 * Sets Poher's matrix against a reading as though the reading were a testimony: what an observer would have seen had it been true, every
 * answer firm (a reconstruction has no error of estimate), the matrix asked, and where the reading's own phenomenon comes.
 *
 * Two things are checked at once. A reading the matrix ranks low or rules out is at odds with what it says it is (a lantern climbing at
 * airliner speed); a matrix that ranks low the phenomenon of readings that are sound is at fault itself. RR0's extension of the matrix
 * was scored knowing these models, so it is expected to agree with them; Poher's scores of 1977 were not, and are the fairer test.
 *
 * Only what the reading settles is answered from it: where its bodies stand, how big they look, how they move, how many and of which
 * colour. The rest (the Sun, the duration, the weather, the observers, the naked eye) is the account's, the reading leaving it as it is.
 */
export class PoherSelfCheck {
  private static readonly FLAT = { heightAt: () => 0 }

  /**
   * The facts of the observation the reading's bodies make, from where the account was seen.
   *
   * @param account The account the reading reads.
   * @param accountFacts What the account itself answers (see PoherFacts): the reading keeps what it does not settle.
   * @param bodies The reading's bodies, its kinds' computed with them.
   * @param instants The instants compared, milliseconds: the account's.
   */
  static facts(account: Sighting, accountFacts: PoherFacts, bodies: readonly BodyJson[], instants: readonly number[]): PoherFacts {
    const { sunAltitudeDeg, durationSeconds, cloudCover, lightning, lowVisibility, observers, nakedEye } = accountFacts
    const facts: PoherFacts = { sunAltitudeDeg, durationSeconds, cloudCover, lightning, lowVisibility, observers, nakedEye }
    for (const key of Object.keys(facts) as (keyof PoherFacts)[]) if (facts[key] === undefined) delete facts[key]
    const eyeAt = (t: number) => BodyPlacement.eyeOf(account, t, PoherSelfCheck.FLAT)
    const explaining = bodies.filter(body => (body.explains?.length ?? 0) > 0)
    const placed = (explaining.length > 0 ? explaining : bodies).map(body => new BodyPlacement(body, PoherSelfCheck.FLAT, eyeAt))
    const seen = (t: number) => {
      const eye = eyeAt(t)
      if (!eye) return []
      return placed.map(placement => placement.at(t)).filter((state): state is BodyState => state !== undefined)
        .map(state => ({ state, ...PoherSelfCheck.direction(eye, state) }))
    }
    const sorted = [...instants].sort((a, b) => a - b)
    const first = sorted.map(t => ({ t, seen: seen(t) })).find(at => at.seen.length > 0)
    if (!first) return facts
    const main = first.seen[0]
    facts.elevationDeg = main.altitudeDeg
    facts.widthDeg = main.widthDeg
    // Its path through the account's instants, and through its own track between them where the account states only a few.
    const span = sorted.filter(t => t >= first.t)
    const steps = span.length >= 2 ? PoherSelfCheck.densified(span) : span
    const aims = steps.flatMap(t => {
      const at = seen(t).find(found => found.state.id === main.state.id)
      return at ? [{ t, azimuthDeg: at.azimuthDeg, altitudeDeg: at.altitudeDeg }] : []
    })
    Object.assign(facts, PoherMotion.of(aims))
    // A group of bodies is one phenomenon drawn in parts, as an account's group of shapes.
    facts.count = new Set(first.seen.map(found => found.state.ensemble ?? found.state.id)).size
    const colors = new Set(first.seen.map(found => found.state.appearance.color))
    if (colors.size > 0) facts.colors = [...colors]
    return facts
  }

  /** Where the matrix ranks the phenomena the reading is of, asked about its facts, every answer firm. */
  static rank(matrix: PoherMatrix, facts: PoherFacts, phenomena: ReadonlySet<string>): PoherSelfRank {
    const answers = new PoherAnswers(WitnessError.MODELS[0]).of(facts).filter(answer => matrix.has(answer.question))
      .map(answer => ({ ...answer, firm: true }))
    const rows = matrix.rank(answers)
    const index = rows.findIndex(row => phenomena.has(row.phenomenon))
    // Ranked among those strictly ahead of it, ruled out by fewer answers or as many and scored higher: the matrix often scores alike,
    // and the order it lists equals in says nothing.
    const found = rows[index]
    const ahead = found ? rows.filter(row => row.excludedBy.length < found.excludedBy.length
      || (row.excludedBy.length === found.excludedBy.length && row.mean > found.mean + 1e-9)).length : 0
    return {
      ...(index >= 0 ? { rank: ahead + 1, tied: rows.filter(row => row !== found && row.excludedBy.length === found.excludedBy.length && Math.abs(row.mean - found.mean) <= 1e-9).length } : {}),
      of: rows.length,
      ...(rows[0] ? { first: rows[0].phenomenon } : {}),
      excludedBy: index >= 0 ? rows[index].excludedBy : [],
      answers
    }
  }

  /** The direction and the apparent width of a body seen from an eye, as the scene draws them. */
  private static direction(eye: { eastM: number, northM: number, upM: number }, state: BodyState): { azimuthDeg: number, altitudeDeg: number, widthDeg: number } {
    const east = state.eastM - eye.eastM
    const north = state.northM - eye.northM
    const up = state.upM - eye.upM
    const ground = Math.hypot(east, north)
    const distance = Math.max(1e-6, Math.hypot(ground, up))
    const size = Math.max(state.sizeM.widthM ?? 0, state.sizeM.lengthM ?? 0, state.sizeM.heightM ?? 0)
    return {
      azimuthDeg: ((Math.atan2(east, north) * 180) / Math.PI + 360) % 360,
      altitudeDeg: (Math.atan2(up, ground) * 180) / Math.PI,
      widthDeg: (2 * Math.atan2(size / 2, distance) * 180) / Math.PI
    }
  }

  /** The instants between the first and the last, every second: enough for a path to show its turns. */
  private static densified(instants: readonly number[]): number[] {
    const from = instants[0]
    const to = instants[instants.length - 1]
    const step = Math.max(1000, (to - from) / 600)
    const found = new Set(instants)
    for (let t = from; t < to; t += step) found.add(Math.round(t))
    return [...found].sort((a, b) => a - b)
  }
}
