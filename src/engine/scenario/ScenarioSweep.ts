import type { CaseJson } from "../persistence/caseJson.js"
import { CaseFile } from "../persistence/caseJson.js"
import { Provenance } from "../persistence/Provenance.js"
import { fromSightingJson, type SightingRecordingJson } from "../persistence/sightingJson.js"
import type { BodyJson, InterpretationJson } from "../interpretation/Interpretation.js"
import { ReadingSensitivity, type ReadingComparison } from "../interpretation/ReadingSensitivity.js"
import { BodyConfrontation } from "../interpretation/BodyConfrontation.js"
import { InterpretationKinds, type InterpretationKind, type KindWind } from "../../modules/interpretations/InterpretationKind.js"
import { CandidateSearch, type CandidateTrack, type Verdict as CandidateVerdict } from "../witness/CandidateSearch.js"
import type { ErrorModel } from "../witness/WitnessError.js"
import { WitnessError } from "../witness/WitnessError.js"
import { SkyCandidates, type MagnitudeLimit, type SkyStart } from "../witness/SkyCandidates.js"
import { SatellitePasses } from "../astronomy/SatellitePasses.js"
import type { OrbitingObject } from "../astronomy/TleArchive.js"
import { UncertainConditions, type AccountConditions, type Scenario, type ScenarioKeep, type UncertainConditionsJson } from "./UncertainConditions.js"
import { Winds, type Wind, type WindProfile, type WindSource } from "./WindProfiles.js"

/** The three verdicts of a reading over its scenarios (see docs/uncertain-conditions.md, "A verdict of robustness"). */
export type Robustness = "robust-plausible" | "robust-exclusion" | "conditional"

/** What a reading, or a candidate of the sky, is as written: at the account's own place and date, with what the reading itself chose. */
export type AsWritten = "plausible" | "excluded"

/** What one judge makes of a reading's bodies: how many of its comparisons agree, and how far apart what was said and what is seen are. */
export interface JudgeSummary {
  agreed: number
  compared: number
  /** How many agree on the direction, whatever the size. */
  agreedDirection: number
  medianDeg?: number
  worstDeg?: number
}

/** A reading played in one scenario. */
export interface ReadingOutcome {
  scenario: Scenario
  /** Against what the witness is on record as having said (ReadingSensitivity.forAccount). */
  said: JudgeSummary
  /** Against everything the account's timeline draws, every half second. */
  drawn: JudgeSummary
  plausible: boolean
  /** The wind at 10 m the scenario gave, when the reading depends on the wind. */
  groundWind?: Wind
  /** Why it could not be played, when it could not: the archive had no wind there and then, say. */
  error?: string
}

/** Where a conditional verdict holds: at some places whatever the date, on some dates whatever the place, or in some scenarios only. */
export interface OnlyIf {
  places?: string[]
  dates?: string[]
  scenarios?: string[]
}

/** A verdict over the scenarios, with how it moved from the verdict as written. */
export interface RobustnessVerdict {
  robustness: Robustness
  asWritten: AsWritten
  /** Where it holds, for a conditional verdict. */
  onlyIf?: OnlyIf
  /** How many scenarios it holds in, of how many played. */
  holds: number
  played: number
  /** True when nothing it depends on is moved by the scenarios: robust because the conditions played do not touch it, not because it was
   * tried against them. */
  independent?: boolean
}

/** What a reading depends on among the conditions a scenario moves. */
export type Dependency = "wind"

/** A reading of an account replayed over the account's scenarios. */
export interface ReadingReplay {
  url: string
  title?: unknown
  depends: Dependency[]
  asWritten: { said: JudgeSummary, drawn: JudgeSummary, plausible: boolean }
  outcomes: ReadingOutcome[]
  verdict: RobustnessVerdict
  /** The scenarios kept as readings (see ScenarioKeep). */
  kept: Scenario[]
}

/** A candidate of the sky (the Moon, a planet, a bright star, the ISS) searched for in each scenario of an account. */
export interface SkyReplay {
  candidate: string
  label: string
  /** "body", "star" or "satellite". */
  kind: "body" | "star" | "satellite"
  outcomes: { scenario: Scenario, verdict: CandidateVerdict, cost: number, reason?: string }[]
  verdict: RobustnessVerdict
}

/** One account of the case and what the sweep made of it. */
export interface AccountSweep {
  eventId?: string
  url: string
  title?: unknown
  scenarios: Scenario[]
  readings: ReadingReplay[]
  sky: SkyReplay[]
  /** Why the sky was not searched: no direction stated, say. */
  skyNote?: string
}

/** The alert of a candidate of the sky whose verdict is robust, or conditional: "Venus incompatible in every scenario". */
export interface SkyAlert {
  eventId?: string
  candidate: string
  label: string
  robustness: Robustness
  onlyIf?: OnlyIf
}

/** What the sweep made of a whole case. */
export interface CaseSweep {
  accounts: AccountSweep[]
  alerts: SkyAlert[]
}

/** What the sweep reads with: the winds, the satellites' elements, the kinds of interpretation, and how to fetch a recording. */
export interface SweepSources {
  wind: WindSource
  /** The orbiting objects known at a date (see TleArchive.at): the ISS is searched among them. None, and no satellite is searched. */
  satellites?: (date: Date) => Promise<OrbitingObject[] | undefined>
  kinds: readonly InterpretationKind[]
  /** A recording of the case, by its address as the case lists it. */
  load: (url: string) => Promise<SightingRecordingJson>
  /** The faintest a light can be seen at, by the Sun's height (visibleMagnitudeLimit, with no instrument). */
  limitAt: MagnitudeLimit
  /** What the candidates of the sky are called. */
  names?: (id: string) => string | undefined
  model?: ErrorModel
}

/** What is swept, of a case. */
export interface SweepOptions {
  /** Only the readings whose address is listed. All when absent. */
  readings?: string[]
  /** Only the accounts whose event id is listed. All when absent. */
  accounts?: string[]
  /** Which scenarios are kept as readings: the case's own choice (`conditions.keep`), else "telling". */
  keep?: ScenarioKeep
  /** The conditions to sweep, instead of those the case states. */
  conditions?: UncertainConditionsJson
  /** Whether the sky is searched: true when absent. */
  sky?: boolean
  /** Told of each step done, for a progress bar: how many are done, of how many. */
  progress?: (done: number, total: number) => void
}

/**
 * Plays every reading of a case's accounts over the scenarios its uncertain conditions give (see UncertainConditionsJson), and the
 * candidates of the sky as well, and says of each whether its verdict is robust (it holds, or fails, in every scenario played) or
 * conditional, and where (docs/uncertain-conditions.md).
 *
 * In each scenario, a reading is played with what it takes from the place and the date replaced by what that scenario gives: the wind
 * archived there and then, for whatever the air carries (see InterpretationKind.inWind, BodyJson.drifting). It is judged twice, against
 * what the witness is on record as having said and against everything the account's timeline draws (see ReadingSensitivity). The
 * witness's own position and the bodies' geometry are not moved with the place: what is carried over is what the place changes.
 *
 * The candidates of the sky are searched for in each scenario as the editor searches them (CandidateSearch), from the scenario's place and
 * at its instant, the date not shifted further since the dates are scenarios already.
 */
export class ScenarioSweep {

  /** The share of the indications a reading must reproduce to be plausible in a scenario: as much as the margins need to mean anything. */
  static readonly PLAUSIBLE = ReadingSensitivity.MEASURABLE
  /** The half second the drawn judge looks at the timeline every. */
  static readonly DRAWN_STEP_MS = 500
  /** How many stars are tried, as in the editor. */
  static readonly STARS = 6
  static readonly STAR_MAG = 1.5

  private readonly model: ErrorModel

  constructor(private readonly sources: SweepSources) {
    this.model = sources.model ?? WitnessError.MODELS[0]
  }

  /** The sweep of `json`, a case, its recordings read through `sources.load`. */
  async sweep(json: CaseJson, options: SweepOptions = {}): Promise<CaseSweep> {
    const events = (json.events ?? []).filter(event => event.eventType === CaseFile.SIGHTING_EVENT && !event.interpretationOf && event.url)
      .filter(event => !options.accounts || (event.id !== undefined && options.accounts.includes(event.id)))
    const accounts: AccountSweep[] = []
    const plan = await Promise.all(events.map(async event => {
      const accountJson = await this.sources.load(event.url!)
      const conditions = options.conditions ?? UncertainConditions.merged(json.conditions, Provenance.strip(accountJson).recording.conditions)
      const scenarios = UncertainConditions.scenarios(ScenarioSweep.conditionsOf(accountJson, event.id), conditions)
      const ids = [event.id, Provenance.strip(accountJson).recording.id].filter((id): id is string => !!id)
      const readings = CaseFile.interpretationEvents(json, ids).filter(reading => reading.url && (!options.readings || options.readings.includes(reading.url)))
      return { event, accountJson, conditions, scenarios, readings }
    }))
    const total = plan.reduce((sum, item) => sum + item.scenarios.length * (item.readings.length + (options.sky === false ? 0 : 1)), 0)
    let done = 0
    const step = () => options.progress?.(++done, total)
    for (const { event, accountJson, conditions, scenarios, readings } of plan) {
      const sweep: AccountSweep = { ...(event.id ? { eventId: event.id } : {}), url: event.url!, title: event.title, scenarios, readings: [], sky: [] }
      const judges = ScenarioSweep.judges(accountJson)
      for (const reading of readings) {
        const readingJson = await this.sources.load(reading.url!)
        const interpretation = Provenance.strip(readingJson).recording.interpretation
        // A reading the sweep played under a scenario is one of its results: it is not played again.
        if (!interpretation || interpretation.scenario) {
          scenarios.forEach(step)
          continue
        }
        const replay = await this.replay(reading.url!, reading.title, interpretation, scenarios, judges, step)
        replay.kept = ScenarioSweep.kept(replay, options.keep ?? conditions?.keep ?? "telling")
        sweep.readings.push(replay)
      }
      if (options.sky !== false) {
        const sky = await this.sky(accountJson, scenarios, step)
        sweep.sky = sky.replays
        if (sky.note) sweep.skyNote = sky.note
      }
      accounts.push(sweep)
    }
    return { accounts, alerts: ScenarioSweep.alerts(accounts) }
  }

  /** Where and when an account says it happened, as the scenarios move it. */
  static conditionsOf(json: SightingRecordingJson, eventId?: string): AccountConditions {
    const recording = Provenance.strip(json).recording
    const at = recording.place?.locations?.[0]
    if (!recording.time || !at) throw new Error(`An account with no time or no place cannot be played elsewhere: ${recording.id ?? eventId}`)
    return {
      ...(eventId ? { eventId } : {}), local: recording.time, utcOffsetHours: recording.utcOffsetHours ?? Math.round(at.lng / 15),
      lat: at.lat, lng: at.lng, ...(recording.place?.name ? { placeName: recording.place.name } : {})
    }
  }

  /** The two judges of an account: what the witness said, and what the timeline draws every half second. */
  static judges(accountJson: SightingRecordingJson): { said: ReadingSensitivity, drawn: ReadingSensitivity } {
    const said = ReadingSensitivity.forAccount(accountJson)
    const account = fromSightingJson(accountJson)
    const keyframes = Provenance.strip(accountJson).recording.timeline?.keyframes ?? []
    const lastT = Math.max(0, ...keyframes.map(key => key.t))
    const instants = Array.from({ length: Math.floor(lastT / ScenarioSweep.DRAWN_STEP_MS) + 1 }, (_, i) => i * ScenarioSweep.DRAWN_STEP_MS)
    // Judged with the uncertainty a witness's estimate has, as what was said is (see BodyConfrontation.lawsOf).
    const tolerance = BodyConfrontation.lawsOf(WitnessError.MODELS[0], account.account?.conditions)
    return { said, drawn: new ReadingSensitivity(account, instants, tolerance) }
  }

  /** What a reading depends on among what the scenarios move: the wind, when a kind of it is carried by the air or a body drifts. */
  dependsOn(interpretation: InterpretationJson): Dependency[] {
    const carried = this.sources.kinds.some(kind => kind.inWind && InterpretationKinds.itemsOf(interpretation, kind.key).length > 0)
      || interpretation.bodies.some(body => body.drifting)
    return carried ? ["wind"] : []
  }

  /** The reading in the wind of `profile`: each kind the air carries in it, each drifting body moved to drift with its ground wind. */
  inWind(interpretation: InterpretationJson, profile: WindProfile): InterpretationJson {
    const wind: KindWind = { at: height => Winds.at(profile, height), levels: profile.levels.map(level => level.aboveGroundM) }
    const out: InterpretationJson = { ...interpretation }
    for (const kind of this.sources.kinds) {
      const items = InterpretationKinds.itemsOf(interpretation, kind.key)
      if (!kind.inWind || items.length === 0) continue
      out[kind.key] = items.map(item => kind.inWind!(item, wind))
    }
    out.bodies = interpretation.bodies.map(body => body.drifting ? ScenarioSweep.drifted(body, Winds.at(profile, 10)) : body)
    return out
  }

  /**
   * A body whose track was written drifting with one wind, moved to drift with `wind` instead: the drift it was written with is its track's
   * first and last keyframes' (what a body carried by the air does over the whole of it), and each keyframe is shifted by the difference
   * over the time since the first. Its height, attitude and look are kept: only where the air takes it changes.
   */
  static drifted(body: BodyJson, wind: Wind): BodyJson {
    const track = body.track
    if (!track || track.length < 2) return body
    const first = track[0], last = track[track.length - 1]
    const spanS = (last.t - first.t) / 1000
    if (spanS <= 0 || first.eastM === undefined || last.eastM === undefined || first.northM === undefined || last.northM === undefined) return body
    const [we, wn] = Winds.vector(wind)
    const de = we - (last.eastM - first.eastM) / spanS, dn = wn - (last.northM - first.northM) / spanS
    return {
      ...body,
      track: track.map(key => key.eastM === undefined || key.northM === undefined ? key
        : { ...key, eastM: key.eastM + de * (key.t - first.t) / 1000, northM: key.northM + dn * (key.t - first.t) / 1000 })
    }
  }

  /** The bodies `interpretation` is, its kinds computed. */
  async bodiesOf(interpretation: InterpretationJson): Promise<BodyJson[]> {
    await InterpretationKinds.load(interpretation, this.sources.kinds)
    return InterpretationKinds.expand(interpretation, this.sources.kinds).bodies
  }

  private async replay(url: string, title: unknown, interpretation: InterpretationJson, scenarios: Scenario[],
                       judges: { said: ReadingSensitivity, drawn: ReadingSensitivity }, step: () => void): Promise<ReadingReplay> {
    const depends = this.dependsOn(interpretation)
    const judged = (bodies: BodyJson[]) => {
      const said = ScenarioSweep.summary(judges.said.comparisons(bodies)), drawn = ScenarioSweep.summary(judges.drawn.comparisons(bodies))
      return { said, drawn, plausible: ScenarioSweep.plausible(said, drawn) }
    }
    const asWritten = judged(await this.bodiesOf(interpretation))
    const outcomes: ReadingOutcome[] = []
    for (const scenario of scenarios) {
      step()
      if (depends.length === 0) {
        // Nothing it takes from the place or the date is moved: it is as written in every scenario.
        outcomes.push({ scenario, ...asWritten })
        continue
      }
      try {
        const profile = await this.sources.wind.profile(scenario.lat, scenario.lng, scenario.date)
        outcomes.push({ scenario, ...judged(await this.bodiesOf(this.inWind(interpretation, profile))), groundWind: Winds.at(profile, 10) })
      }
      catch (error) {
        outcomes.push({ scenario, ...asWritten, plausible: asWritten.plausible, error: (error as Error).message })
      }
    }
    const played = outcomes.filter(outcome => !outcome.error)
    const verdict = ScenarioSweep.verdict(asWritten.plausible ? "plausible" : "excluded", played.map(outcome => ({ scenario: outcome.scenario, plausible: outcome.plausible })))
    if (depends.length === 0) verdict.independent = true
    return { url, title, depends, asWritten, outcomes, verdict, kept: [] }
  }

  /**
   * Whether a reading is plausible in a scenario: the directions its bodies are seen in are not contradicted, within the uncertainty a
   * witness's estimate has (BodyConfrontation.lawsOf), at PLAUSIBLE of the instants compared at least: those of what the witness said, or,
   * when the account traces no direction to the witness, those its timeline draws.
   *
   * The direction only: it is what a scenario moves (where the air takes a body, where a body of the sky stands), and the sizes are judged by
   * a law that refuses even a size equal to the one said (see ReadingSensitivity's open problem), which would exclude every reading alike.
   */
  static plausible(said: JudgeSummary, drawn: JudgeSummary): boolean {
    const judge = said.compared > 0 ? said : drawn
    return judge.compared > 0 && judge.agreedDirection / judge.compared >= ScenarioSweep.PLAUSIBLE
  }

  static summary(comparisons: readonly ReadingComparison[]): JudgeSummary {
    const separations = comparisons.filter(c => c.separationDeg !== undefined).map(c => c.separationDeg!).sort((a, b) => a - b)
    return {
      agreed: comparisons.filter(c => c.agrees).length, compared: comparisons.length,
      agreedDirection: comparisons.filter(c => !c.contradicted?.includes("direction")).length,
      ...(separations.length ? { medianDeg: separations[Math.floor(separations.length / 2)], worstDeg: separations[separations.length - 1] } : {})
    }
  }

  /**
   * The verdict over the scenarios played: robust when it is the same in every one, conditional otherwise, and then where it holds: at
   * some places whatever the date, on some dates whatever the place, or in a list of scenarios.
   */
  static verdict(asWritten: AsWritten, outcomes: { scenario: Scenario, plausible: boolean }[]): RobustnessVerdict {
    const holds = outcomes.filter(outcome => outcome.plausible)
    const played = outcomes.length
    if (played === 0) return { robustness: asWritten === "plausible" ? "robust-plausible" : "robust-exclusion", asWritten, holds: 0, played: 0, independent: true }
    if (holds.length === played) return { robustness: "robust-plausible", asWritten, holds: played, played }
    if (holds.length === 0) return { robustness: "robust-exclusion", asWritten, holds: 0, played }
    return { robustness: "conditional", asWritten, onlyIf: ScenarioSweep.onlyIf(outcomes), holds: holds.length, played }
  }

  static onlyIf(outcomes: { scenario: Scenario, plausible: boolean }[]): OnlyIf {
    const by = (key: (scenario: Scenario) => string) => {
      const groups = new Map<string, boolean[]>()
      for (const outcome of outcomes) groups.set(key(outcome.scenario), [...(groups.get(key(outcome.scenario)) ?? []), outcome.plausible])
      const all = [...groups.entries()]
      // A grouping explains the verdict when every group is all plausible or all not.
      return all.every(([, values]) => values.every(v => v) || values.every(v => !v)) ? all.filter(([, values]) => values[0]).map(([k]) => k) : undefined
    }
    const places = by(scenario => scenario.placeId)
    if (places && new Set(outcomes.map(outcome => outcome.scenario.placeId)).size > 1) return { places }
    const dates = by(scenario => scenario.local.slice(0, 10))
    if (dates && new Set(outcomes.map(outcome => outcome.scenario.local.slice(0, 10))).size > 1) return { dates }
    return { scenarios: outcomes.filter(outcome => outcome.plausible).map(outcome => outcome.scenario.id) }
  }

  /**
   * The scenarios of a reading kept as readings, by `keep` (see ScenarioKeep). The telling ones: for a robust verdict, the scenario nearest
   * to turning it; for a conditional one, the best where it holds and the worst where it fails. A reading that depends on nothing the
   * scenarios move has none worth keeping: each would be the reading as written.
   */
  static kept(replay: ReadingReplay, keep: ScenarioKeep): Scenario[] {
    if (keep === "none" || replay.verdict.independent) return []
    const played = replay.outcomes.filter(outcome => !outcome.error)
    if (keep === "all") return played.map(outcome => outcome.scenario)
    const robust = replay.verdict.robustness !== "conditional"
    if ((keep === "robust" && !robust) || (keep === "conditional" && robust)) return []
    // How well it does: the share it reproduces, then how near it is.
    const score = (outcome: ReadingOutcome) => {
      const judge = outcome.said.compared > 0 ? outcome.said : outcome.drawn
      return (judge.compared ? judge.agreedDirection / judge.compared : 0) - (judge.medianDeg ?? 180) / 1e4
    }
    const sorted = [...played].sort((a, b) => score(b) - score(a))
    if (robust) {
      const nearest = replay.verdict.robustness === "robust-plausible" ? sorted[sorted.length - 1] : sorted[0]
      return nearest ? [nearest.scenario] : []
    }
    const best = sorted.find(outcome => outcome.plausible), worst = [...sorted].reverse().find(outcome => !outcome.plausible)
    return [best, worst].filter((outcome): outcome is ReadingOutcome => !!outcome).map(outcome => outcome.scenario)
  }

  /** The candidates of the sky an account may be a misperception of, searched for in each of its scenarios. */
  private async sky(accountJson: SightingRecordingJson, scenarios: Scenario[], step: () => void): Promise<{ replays: SkyReplay[], note?: string }> {
    const account = fromSightingJson(accountJson)
    const found = SkyCandidates.statement(account)
    if (!found) {
      scenarios.forEach(step)
      return { replays: [], note: "no-direction" }
    }
    const { statement, t } = found
    // The date is not shifted further, since the dates are scenarios already; nor the heading mirrored, which is a reading of the testimony
    // and would be the same in every scenario: the alert is the sky's, at the directions as given.
    const search = new CandidateSearch(this.model, account.account?.conditions, { dateShiftDays: [], mirror: false })
    const name = (id: string) => this.sources.names?.(id) ?? id
    // The stars are those nearest the account's direction where and when it says: the same stars are followed in every scenario.
    const own = scenarios.find(scenario => scenario.own) ?? scenarios[0]
    const ownStart: SkyStart = { date: own.date, observer: { lat: own.lat, lng: own.lng, elevationM: 0 } }
    const starNames = new Set(SkyCandidates.stars(ownStart, t, statement, this.sources.limitAt, ScenarioSweep.STARS, ScenarioSweep.STAR_MAG).map(({ star }) => star.name))
    const byCandidate = new Map<string, SkyReplay>()
    for (const scenario of scenarios) {
      step()
      const start: SkyStart = { date: scenario.date, observer: { lat: scenario.lat, lng: scenario.lng, elevationM: 0 } }
      const tracks: { track: CandidateTrack, kind: SkyReplay["kind"] }[] = [
        { track: SkyCandidates.body("Moon", name("Moon"), start, t, this.sources.limitAt), kind: "body" },
        ...SkyCandidates.PLANETS.map(planet => ({ track: SkyCandidates.body(planet, name(planet), start, t, this.sources.limitAt), kind: "body" as const })),
        ...SkyCandidates.stars(start, t, { ...statement, aim: undefined }, this.sources.limitAt, Infinity, ScenarioSweep.STAR_MAG)
          .filter(({ star }) => starNames.has(star.name)).map(({ star, track }) => ({ track: { ...track, label: name(star.name) }, kind: "star" as const }))
      ]
      const iss = await this.issTrack(start, t)
      if (iss) tracks.push({ track: iss, kind: "satellite" })
      for (const { track, kind } of tracks) {
        const variant = search.fit(statement, track)
        let replay = byCandidate.get(track.id)
        if (!replay) {
          replay = { candidate: track.id, label: track.label, kind, outcomes: [], verdict: undefined as unknown as RobustnessVerdict }
          byCandidate.set(track.id, replay)
        }
        replay.outcomes.push({ scenario, verdict: variant.verdict, cost: variant.cost, ...(variant.reason ? { reason: variant.reason } : {}) })
      }
    }
    const replays = [...byCandidate.values()]
    for (const replay of replays) {
      const ownOutcome = replay.outcomes.find(outcome => outcome.scenario.own)
      const asWritten: AsWritten = ownOutcome ? ownOutcome.verdict === "incompatible" ? "excluded" : "plausible"
        : replay.outcomes.every(outcome => outcome.verdict === "incompatible") ? "excluded" : "plausible"
      replay.verdict = ScenarioSweep.verdict(asWritten, replay.outcomes.map(outcome => ({ scenario: outcome.scenario, plausible: outcome.verdict !== "incompatible" })))
      // A candidate missing from a scenario (the ISS with no elements then) is not counted as played there.
    }
    return { replays }
  }

  /** The ISS as seen from `start`, when the satellites' elements are known at that date. */
  private async issTrack(start: SkyStart, t: number): Promise<CandidateTrack | undefined> {
    if (!this.sources.satellites) return undefined
    const objects = await this.sources.satellites(start.date).catch(() => undefined)
    const iss = objects?.find(object => object.norad === SkyCandidates.ISS_NORAD)
    if (!iss) return undefined
    const passes = new SatellitePasses([iss])
    return SkyCandidates.satellite(`satellite-${iss.norad}`, this.sources.names?.("ISS") ?? "ISS",
      date => passes.positionsAt(date, start.observer, -90).find(position => position.object.norad === iss.norad), start, t, this.sources.limitAt)
  }

  /** The alerts grouped: one per candidate and verdict, with the accounts it is said of. */
  static grouped(alerts: readonly SkyAlert[]): (SkyAlert & { accounts: string[] })[] {
    const groups = new Map<string, SkyAlert & { accounts: string[] }>()
    for (const alert of alerts) {
      const key = `${alert.candidate}|${alert.robustness}|${JSON.stringify(alert.onlyIf ?? {})}`
      const group = groups.get(key) ?? { ...alert, accounts: [] }
      if (alert.eventId) group.accounts.push(alert.eventId)
      groups.set(key, group)
    }
    const rank: Record<Robustness, number> = { "robust-plausible": 0, "conditional": 1, "robust-exclusion": 2 }
    return [...groups.values()].sort((a, b) => rank[a.robustness] - rank[b.robustness])
  }

  /**
   * The alerts of a sweep: the Moon, the planets and the ISS whose verdict is robust, plausible or excluded, or conditional; the stars only
   * where they are plausible at all, a star that is not being no news.
   */
  static alerts(accounts: AccountSweep[]): SkyAlert[] {
    return accounts.flatMap(account => account.sky
      .filter(replay => replay.kind !== "star" || replay.verdict.robustness !== "robust-exclusion")
      .map(replay => ({
        ...(account.eventId ? { eventId: account.eventId } : {}), candidate: replay.candidate, label: replay.label,
        robustness: replay.verdict.robustness, ...(replay.verdict.onlyIf ? { onlyIf: replay.verdict.onlyIf } : {})
      })))
  }
}
