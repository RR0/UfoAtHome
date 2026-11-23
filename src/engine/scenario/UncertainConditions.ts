import type { PlaceJson } from "@rr0/place"
import type { RecordingSource } from "../model/RecordingSource.js"

/**
 * The conditions a case, or one recording, leaves open: the dates and the places its accounts may have happened at, each candidate stated
 * with what supports it, rather than a range drawn around a guess (see docs/uncertain-conditions.md). Read by the scenario sweep
 * (ScenarioSweep), which plays each reading of an account over the scenarios these give and says how its verdict depends on them.
 *
 * Absent, nothing is open: an account is played where and when it says, as always.
 */
export interface UncertainConditionsJson {
  /** The dates or instants left open. */
  time?: CandidateTimesJson
  /** The places left open, beside each account's own. */
  places?: CandidatePlacesJson
  /** Which scenarios are kept as readings once the sweep has judged them all (see ScenarioKeep): "telling" when absent. */
  keep?: ScenarioKeep
}

/**
 * How the values of one open condition are iterated:
 * - `bounds`, the default: the first and the last candidate, which is where a verdict that changes at all is the likeliest to;
 * - `points`: the values listed (`points`);
 * - `step`: every `step` from the first to the last;
 * - `deltas`: each of `deltas` away from the account's own value.
 */
export type SweepMode = "bounds" | "points" | "step" | "deltas"

/**
 * The instants an account may have happened at, in the legal time of each account (its `utcOffsetHours`), from `from` to `to`.
 *
 * With `each` "day" (the default) only the date is open: an account keeps the time of day it states, on each day that puts it within the
 * interval. Two evenings and the dawn after them are `from` the first noon `to` the last: the evenings fall on the two first days, the dawn
 * on the two last. With `each` "instant" the time of day is open as well: the instants are those of the interval itself.
 */
export interface CandidateTimesJson {
  /** The first instant, ISO local time ("2023-10-14T12:00"). */
  from: string
  /** The last instant, ISO local time. */
  to: string
  each?: "day" | "instant"
  /** How the candidates are iterated: their bounds when absent. */
  sweep?: SweepMode
  /** With `sweep` "points": the dates ("2023-10-15", at each account's own time of day) or instants ("2023-10-15T19:30") to play. */
  points?: string[]
  /** With `sweep` "step": minutes between two candidates; a day (1440) when `each` is "day", an hour otherwise, when absent. */
  stepMinutes?: number
  /** With `sweep` "deltas": minutes from each account's own instant, which is played as well (a delta of 0 need not be listed). */
  deltasMinutes?: number[]
  /** Why these, in a sentence. */
  rationale?: string
}

/** The places an account may have happened at, beside its own. */
export interface CandidatePlacesJson {
  candidates?: CandidatePlaceJson[]
  /**
   * How they are iterated: `bounds`, the default, plays every candidate (each is a bound of what the clues leave open); `points` only
   * those named in `points`; `deltas` moves each account's own place by each of `deltasKm`; `step` lays a grid of `stepKm` over the box the
   * candidates and the account's own place span.
   */
  sweep?: SweepMode
  /** With `sweep` "points": the `id`s of the candidates to play. */
  points?: string[]
  /** With `sweep` "deltas": kilometres east and north of each account's own place. */
  deltasKm?: { eastKm: number, northKm: number }[]
  /** With `sweep` "step": kilometres between two points of the grid. */
  stepKm?: number
  /** Whether each account's own place, where it is played, is a scenario too: true when absent. */
  own?: boolean
}

/** One candidate place, with what supports it. */
export interface CandidatePlaceJson {
  /** What the scenarios at it are named by, unique among the candidates ("pahranagat"). */
  id: string
  place: PlaceJson
  /** Why it is a candidate: the clues that point at it. */
  rationale?: string
  sources?: RecordingSource[]
  /** The ids of the accounts (their events' `id` in the case) it is a candidate for: every account when absent. Witnesses who stood
   * apart each have their own; witnesses who stood together share one. */
  for?: string[]
}

/**
 * Which scenarios are kept as readings once every one has been judged; the others only serve the verdict:
 * - `telling`: those that show the verdict: for a robust one the scenario that is nearest to turning it, for a conditional one the best
 *   where it holds and the worst where it fails;
 * - `robust`: the telling ones of the readings whose verdict is robust;
 * - `conditional`: the telling ones of the readings whose verdict is conditional;
 * - `all`, `none`.
 */
export type ScenarioKeep = "telling" | "robust" | "conditional" | "all" | "none"

/** One choice of each open condition for one account: where and when it is played. */
export interface Scenario {
  /** `<place>@<local instant>`: "pahranagat@2023-10-15T19:00". */
  id: string
  /** The candidate place's id, "own" for the account's own place, or "own+<east>,<north>km" for a delta of it. */
  placeId: string
  /** The place's name, as its candidate or the account states it. */
  placeName?: string
  lat: number
  lng: number
  /** The local instant, ISO, in the account's legal time. */
  local: string
  /** The same instant, UTC. */
  date: Date
  /** Whether it is the account's own place and own instant: what the reading as written is played at. */
  own: boolean
  /** Whether it is the account's own place, whatever the instant. */
  ownPlace: boolean
}

/** What an account says of where and when it happened, as the scenarios move it. */
export interface AccountConditions {
  /** The account's event id in the case, which a candidate place's `for` names. */
  eventId?: string
  /** Its local instant, ISO ("2023-10-14T19:00:00"). */
  local: string
  utcOffsetHours: number
  lat: number
  lng: number
  placeName?: string
}

/** The scenarios an account is played over. */
export class UncertainConditions {

  /** The most scenarios one account is played over: beyond, a sweep is a sample, and is refused rather than silently thinned. */
  static readonly MAX_SCENARIOS = 200
  private static readonly KM_PER_DEG = 111.32

  /** The conditions of `account`: the case's, those of its own recording overriding them field by field. */
  static merged(caseConditions?: UncertainConditionsJson, own?: UncertainConditionsJson): UncertainConditionsJson | undefined {
    if (!caseConditions) return own
    if (!own) return caseConditions
    return { ...caseConditions, ...own }
  }

  /** Every scenario of `account` under `conditions`: each place it may have been at, at each instant. The account's own first. */
  static scenarios(account: AccountConditions, conditions: UncertainConditionsJson | undefined): Scenario[] {
    const places = UncertainConditions.places(account, conditions?.places)
    const instants = UncertainConditions.instants(account, conditions?.time)
    const scenarios: Scenario[] = []
    for (const place of places) {
      for (const local of instants) {
        const own = place.placeId === "own" && local === UncertainConditions.minute(account.local)
        scenarios.push({
          id: `${place.placeId}@${local}`, placeId: place.placeId, ...(place.placeName ? { placeName: place.placeName } : {}),
          lat: place.lat, lng: place.lng, local, date: UncertainConditions.utc(local, account.utcOffsetHours), own, ownPlace: place.placeId === "own"
        })
      }
    }
    if (scenarios.length > UncertainConditions.MAX_SCENARIOS) {
      throw new Error(`${scenarios.length} scenarios for one account: more than ${UncertainConditions.MAX_SCENARIOS}. Take a coarser step or fewer points.`)
    }
    return scenarios.sort((a, b) => Number(b.own) - Number(a.own))
  }

  /** The places of `account`: its own (unless said otherwise), then the candidates that are for it, as `sweep` iterates them. */
  static places(account: AccountConditions, places: CandidatePlacesJson | undefined): { placeId: string, placeName?: string, lat: number, lng: number }[] {
    const own = { placeId: "own", ...(account.placeName ? { placeName: account.placeName } : {}), lat: account.lat, lng: account.lng }
    const result = places?.own === false ? [] : [own]
    const candidates = (places?.candidates ?? [])
      .filter(candidate => !candidate.for || account.eventId === undefined || candidate.for.includes(account.eventId))
      .flatMap(candidate => {
        const at = candidate.place.locations?.[0]
        return at ? [{ placeId: candidate.id, ...(candidate.place.name ? { placeName: candidate.place.name } : {}), lat: at.lat, lng: at.lng }] : []
      })
    switch (places?.sweep ?? "bounds") {
      case "bounds":
        return [...result, ...candidates]
      case "points": {
        const named = new Set(places?.points ?? [])
        return [...result, ...candidates.filter(candidate => named.has(candidate.placeId))]
      }
      case "deltas":
        return [...result, ...(places?.deltasKm ?? []).filter(d => d.eastKm !== 0 || d.northKm !== 0).map(d => ({
          placeId: `own${d.eastKm >= 0 ? "+" : ""}${d.eastKm},${d.northKm >= 0 ? "+" : ""}${d.northKm}km`,
          ...(account.placeName ? { placeName: account.placeName } : {}),
          lat: account.lat + d.northKm / UncertainConditions.KM_PER_DEG,
          lng: account.lng + d.eastKm / (UncertainConditions.KM_PER_DEG * Math.cos(account.lat * Math.PI / 180))
        }))]
      case "step": {
        const stepKm = places?.stepKm
        if (!stepKm || stepKm <= 0) throw new Error("A sweep of places by step states its stepKm.")
        const all = [own, ...candidates]
        const south = Math.min(...all.map(p => p.lat)), north = Math.max(...all.map(p => p.lat))
        const west = Math.min(...all.map(p => p.lng)), east = Math.max(...all.map(p => p.lng))
        const kmPerLng = UncertainConditions.KM_PER_DEG * Math.cos((south + north) / 2 * Math.PI / 180)
        const grid: { placeId: string, lat: number, lng: number }[] = []
        for (let y = 0; south + y * stepKm / UncertainConditions.KM_PER_DEG <= north + 1e-9; y++) {
          for (let x = 0; west + x * stepKm / kmPerLng <= east + 1e-9; x++) {
            const lat = south + y * stepKm / UncertainConditions.KM_PER_DEG, lng = west + x * stepKm / kmPerLng
            grid.push({ placeId: `grid${lat.toFixed(3)},${lng.toFixed(3)}`, lat, lng })
          }
        }
        return [...result, ...grid]
      }
    }
  }

  /** The local instants of `account` under `time`, ISO to the minute, in order; its own alone when nothing is open. */
  static instants(account: AccountConditions, time: CandidateTimesJson | undefined): string[] {
    const ownLocal = UncertainConditions.minute(account.local)
    if (!time) return [ownLocal]
    const own = UncertainConditions.ms(ownLocal)
    const from = UncertainConditions.ms(time.from), to = UncertainConditions.ms(time.to)
    const each = time.each ?? "day"
    const DAY = 86_400_000
    // The candidates within the interval: the account's time of day on each day it falls in, or the interval's own instants.
    const within = (step: number): number[] => {
      const out: number[] = []
      if (each === "day") {
        const first = own + Math.ceil((from - own) / DAY) * DAY
        for (let t = first; t <= to; t += step) out.push(t)
      }
      else for (let t = from; t <= to; t += step) out.push(t)
      return out
    }
    let chosen: number[]
    switch (time.sweep ?? "bounds") {
      case "bounds": {
        const all = within(each === "day" ? DAY : 60_000)
        chosen = all.length > 0 ? [all[0], all[all.length - 1]] : []
        break
      }
      case "points":
        chosen = (time.points ?? []).map(point => /T/.test(point) ? UncertainConditions.ms(point)
          : UncertainConditions.ms(`${point}T${ownLocal.slice(11)}`))
        break
      case "step":
        chosen = within((time.stepMinutes ?? (each === "day" ? 1440 : 60)) * 60_000)
        break
      case "deltas":
        chosen = [own, ...(time.deltasMinutes ?? []).map(delta => own + delta * 60_000)]
        break
    }
    return [...new Set(chosen)].sort((a, b) => a - b).map(t => new Date(t).toISOString().slice(0, 16))
  }

  /** A local ISO time read as if it were UTC, in ms: what the arithmetic of days is done on, whatever the zone. */
  private static ms(local: string): number {
    const plain = local.replace(/[~?%]$/, "").replace(/(Z|[+-]\d\d:\d\d)$/, "")
    const full = plain.length === 10 ? `${plain}T00:00` : plain
    const t = Date.parse(`${full}Z`)
    if (Number.isNaN(t)) throw new Error(`Not an instant: ${local}`)
    return t
  }

  /** A local ISO time, to the minute. */
  static minute(local: string): string {
    return new Date(UncertainConditions.ms(local)).toISOString().slice(0, 16)
  }

  /** The UTC instant of a local ISO time in a legal time `utcOffsetHours` from UTC. */
  static utc(local: string, utcOffsetHours: number): Date {
    return new Date(UncertainConditions.ms(local) - utcOffsetHours * 3_600_000)
  }
}
