import type { Surroundings, SurroundingsProvider, SurveyDates } from "./SurroundingsProvider.js"
import { SurroundingsUnavailableError } from "./SurroundingsProvider.js"

/** A place on the ground. */
export interface Stop {
  lat: number
  lng: number
}

export interface SurroundingsCorridorOptions {
  /** How many trees a stop keeps: the nearest to it. A laser square of 150 m holds hundreds, and a path of kilometres has many stops. */
  treesPerStop?: number
  /** How many stops asked at once: the services are public, and the answers heavy. */
  concurrency?: number
}

/**
 * What stands within a radius of EVERY place an observer goes through, and not of the one they start from.
 *
 * An observer who moves (a witness driving along a road, walking up a path) sees what is round each of the places they pass: the buildings of a
 * kilometre away from where they set off are the ones they drive towards. So the survey is asked at stops along the path, each with the radius, and
 * the answers are put together in the frame of the first place (what a decor object is measured from, see DecorObject.eastM), what two stops both saw
 * counted once.
 *
 * The stops are a radius apart or more, so that their circles meet, and no more than MAX_STOPS in all: a path of fifty kilometres is not worth a hundred
 * requests, and what it asks for is spread thinner (a longer step) rather than cut short.
 */
export class SurroundingsCorridor {
  static readonly MAX_STOPS = 12
  private static readonly METRES_PER_DEGREE = 111320
  /** Two trees closer than this are one; two buildings whose middles are closer than this and whose sizes are alike are one. */
  private static readonly SAME_TREE_M = 1.5
  private static readonly SAME_BUILDING_M = 2.5
  private static readonly SAME_STRUCTURE_M = 5

  /**
   * The places to ask about along a path: its first point, then one every `spacingM` metres travelled, and its last. Stepped wider where that
   * would be more than MAX_STOPS.
   */
  static stops(path: readonly Stop[], spacingM: number): Stop[] {
    if (path.length === 0) return []
    const first = path[0]
    const cosine = Math.cos(first.lat * Math.PI / 180)
    const legs = path.slice(1).map((point, i) => Math.hypot(
      (point.lat - path[i].lat) * SurroundingsCorridor.METRES_PER_DEGREE,
      (point.lng - path[i].lng) * SurroundingsCorridor.METRES_PER_DEGREE * cosine))
    const total = legs.reduce((sum, leg) => sum + leg, 0)
    const step = Math.max(spacingM, total / (SurroundingsCorridor.MAX_STOPS - 1))
    const stops: Stop[] = [first]
    let travelled = 0
    let next = step
    path.slice(1).forEach((point, i) => {
      travelled += legs[i]
      if (travelled >= next) {
        stops.push(point)
        next = travelled + step
      }
    })
    // The end of the path, where the last stop is not already near it.
    const last = path[path.length - 1]
    const lastStop = stops[stops.length - 1]
    const gap = Math.hypot((last.lat - lastStop.lat) * SurroundingsCorridor.METRES_PER_DEGREE, (last.lng - lastStop.lng) * SurroundingsCorridor.METRES_PER_DEGREE * cosine)
    if (gap > spacingM / 2 && stops.length < SurroundingsCorridor.MAX_STOPS) stops.push(last)
    return stops
  }

  /**
   * The surroundings of every stop, in metres from the first: asked a few at a time, the nearest trees of each kept, what is double dropped. A stop the
   * survey does not cover or cannot answer is left out as long as another answers; if none does, the first failure is the answer.
   */
  static async fetch(provider: SurroundingsProvider, stops: readonly Stop[], radiusM: number, options: SurroundingsCorridorOptions = {}): Promise<Surroundings> {
    if (stops.length === 0) throw new SurroundingsUnavailableError("no-coverage", "No place to ask about")
    const origin = stops[0]
    const cosine = Math.cos(origin.lat * Math.PI / 180)
    const answers: (Surroundings | undefined)[] = new Array(stops.length).fill(undefined)
    const failures: unknown[] = []
    const concurrency = Math.max(1, options.concurrency ?? 3)
    let next = 0
    const worker = async (): Promise<void> => {
      while (next < stops.length) {
        const at = next++
        try {
          answers[at] = await provider.getSurroundings(stops[at], radiusM)
        } catch (error) {
          failures.push(error)
        }
      }
    }
    await Promise.all(Array.from({ length: Math.min(concurrency, stops.length) }, worker))
    const merged: Surroundings = { trees: [], buildings: [], bridges: [], lines: [] }
    let any = false
    const dates: SurveyDates = {}
    answers.forEach((answer, at) => {
      if (!answer) return
      any = true
      const east = (stops[at].lng - origin.lng) * SurroundingsCorridor.METRES_PER_DEGREE * cosine
      const north = (stops[at].lat - origin.lat) * SurroundingsCorridor.METRES_PER_DEGREE
      const moved = <T extends { eastM: number, northM: number }>(objects: T[]): T[] =>
        objects.map(object => ({ ...object, eastM: Math.round((object.eastM + east) * 10) / 10, northM: Math.round((object.northM + north) * 10) / 10 }))
      const trees = moved(answer.trees)
        .sort((a, b) => Math.hypot(a.eastM - east, a.northM - north) - Math.hypot(b.eastM - east, b.northM - north))
        .slice(0, options.treesPerStop ?? answer.trees.length)
      SurroundingsCorridor.add(merged.trees, trees, (a, b) => Math.hypot(a.eastM - b.eastM, a.northM - b.northM) < SurroundingsCorridor.SAME_TREE_M)
      SurroundingsCorridor.add(merged.buildings, moved(answer.buildings), (a, b) =>
        Math.hypot(a.eastM - b.eastM, a.northM - b.northM) < SurroundingsCorridor.SAME_BUILDING_M && Math.abs(a.widthM - b.widthM) < 1.5 && Math.abs(a.lengthM - b.lengthM) < 1.5)
      SurroundingsCorridor.add(merged.bridges, moved(answer.bridges), (a, b) => Math.hypot(a.eastM - b.eastM, a.northM - b.northM) < SurroundingsCorridor.SAME_STRUCTURE_M)
      SurroundingsCorridor.add(merged.lines, moved(answer.lines), (a, b) =>
        Math.hypot(a.eastM - b.eastM, a.northM - b.northM) < SurroundingsCorridor.SAME_STRUCTURE_M && Math.abs(a.lengthM - b.lengthM) < 5)
      SurroundingsCorridor.addFurniture(merged, answer, moved)
      if (answer.incomplete) merged.incomplete = true
      for (const key of ["laser", "photo", "map", "lamps"] as const) {
        const day = answer.dates?.[key]
        if (day && (!dates[key] || day > dates[key]!)) dates[key] = day
      }
    })
    if (!any) throw failures.find(error => !(error instanceof SurroundingsUnavailableError && error.reason === "no-coverage")) ?? failures[0]
    if (Object.keys(dates).length > 0) merged.dates = dates
    return merged
  }

  /**
   * What the stops' answers lacked when they came back incomplete, once it comes (see SurroundingsProvider.later), in metres from the first stop as
   * `fetch` puts them. Undefined where the survey has nothing that comes late; failing if no stop's comes.
   */
  static later(provider: SurroundingsProvider, stops: readonly Stop[], radiusM: number): Promise<Partial<Surroundings>> | undefined {
    if (!provider.later || stops.length === 0) return undefined
    const origin = stops[0]
    const cosine = Math.cos(origin.lat * Math.PI / 180)
    const asked = stops.map(stop => provider.later!(stop, radiusM) ?? Promise.reject(new Error("Nothing comes late")))
    return Promise.allSettled(asked).then(answers => {
      if (!answers.some(answer => answer.status === "fulfilled")) throw (answers[0] as PromiseRejectedResult).reason
      const merged: Partial<Surroundings> = {}
      answers.forEach((answer, at) => {
        if (answer.status !== "fulfilled") return
        const east = (stops[at].lng - origin.lng) * SurroundingsCorridor.METRES_PER_DEGREE * cosine
        const north = (stops[at].lat - origin.lat) * SurroundingsCorridor.METRES_PER_DEGREE
        const moved = <T extends { eastM: number, northM: number }>(objects: T[]): T[] =>
          objects.map(object => ({ ...object, eastM: Math.round((object.eastM + east) * 10) / 10, northM: Math.round((object.northM + north) * 10) / 10 }))
        SurroundingsCorridor.addFurniture(merged, answer.value, moved)
        const day = answer.value.dates?.lamps
        if (day && (!merged.dates?.lamps || day > merged.dates.lamps)) merged.dates = { lamps: day }
      })
      return merged
    })
  }

  /** The lamps, lights, crossings and signs of one stop's answer, moved to the first stop's metres, into `merged` unless one like each is there. */
  private static addFurniture(merged: Partial<Surroundings>, answer: Partial<Surroundings>, moved: <T extends { eastM: number, northM: number }>(objects: T[]) => T[]): void {
    if (answer.lamps) SurroundingsCorridor.add((merged.lamps ??= []), moved(answer.lamps), (a, b) => Math.hypot(a.eastM - b.eastM, a.northM - b.northM) < 1)
    // A light, a crossing or a sign is the one met again from the next stop when it is where it was, facing the same way.
    const samePost = (a: { eastM: number, northM: number, headingDeg: number }, b: { eastM: number, northM: number, headingDeg: number }) =>
      Math.hypot(a.eastM - b.eastM, a.northM - b.northM) < 1 && Math.abs(((a.headingDeg - b.headingDeg + 540) % 360) - 180) < 10
    if (answer.signals) SurroundingsCorridor.add((merged.signals ??= []), moved(answer.signals), samePost)
    if (answer.crossings) SurroundingsCorridor.add((merged.crossings ??= []), moved(answer.crossings), samePost)
    if (answer.signs) SurroundingsCorridor.add((merged.signs ??= []), moved(answer.signs), samePost)
  }

  /** Puts each of `found` in `into` unless one like it is there already. */
  private static add<T>(into: T[], found: T[], same: (a: T, b: T) => boolean): void {
    for (const object of found) if (!into.some(existing => same(existing, object))) into.push(object)
  }
}
