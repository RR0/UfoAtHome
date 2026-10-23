import type { WitnessErrorMessages } from "./messages/WitnessErrorMessages.js"
import type { Sighting } from "../engine/model/Sighting.js"
import type { WitnessConditions } from "../engine/model/Account.js"
import type { ErrorModel, LeadStatus } from "../engine/witness/WitnessError.js"
import { WitnessError } from "../engine/witness/WitnessError.js"
import { CandidateSearch } from "../engine/witness/CandidateSearch.js"
import type { AccountStatement, CandidateTrack, MovedValue, StructuralReading, UsedReading, Variant } from "../engine/witness/CandidateSearch.js"
import { computeBodyMagnitude, computeBodyPosition, equatorialToHorizontal } from "../engine/astronomy/CelestialPositions.js"
import type { CelestialBody } from "../engine/astronomy/CelestialPositions.js"
import { PoherAnswers } from "../engine/witness/PoherMatrix.js"
import type { PoherFacts, PoherMatrix, PoherRanking } from "../engine/witness/PoherMatrix.js"
import type { SatellitePass, SatellitePosition } from "../engine/astronomy/SatellitePasses.js"
import { ReentrySighting } from "../engine/interpretation/Reentry.js"
import type { ReentryJson } from "../engine/interpretation/Reentry.js"
import type { AircraftDescription, AircraftTrack } from "../engine/traffic/AircraftProvider.js"
import type { BodyJson, InterpretationJson } from "../engine/interpretation/Interpretation.js"
import { BRIGHT_STARS } from "../engine/astronomy/brightStarCatalog.js"

/** What the view needs of the editor that holds it. */
export interface CandidatesHost {
  readonly sighting: Sighting
  messages(): WitnessErrorMessages
  model(): ErrorModel
  conditions(): WitnessConditions | undefined
  /** When and where the observation began, or undefined when the recording does not say. */
  start(): { date: Date, observer: { lat: number, lng: number, elevationM: number } } | undefined
  /** The faintest magnitude seen with the Sun at that altitude, through the recording's instrument. */
  limitAt(sunAltitudeDeg: number): number
  /** The labels of the fields a variant moves, to strike what the account says beside what the variant reads. */
  fieldLabels(): Partial<Record<MovedValue["field"], HTMLElement>>
  /** Where the label of the variant on show goes: over the scene, always in view. */
  sceneCard(): HTMLElement
  /** Poher's matrix as rr0.org publishes it, with its labels in the reader's language (see PoherMatrix.load). */
  poher(): Promise<{ matrix: PoherMatrix, labels: Record<string, string> }>
  /** What the recording says that the matrix asks about. */
  facts(): PoherFacts
  /** The satellite passes during the observation, and where each object stood at an instant, when the archive is loaded. */
  satellites(): { passes: SatellitePass[], positionsAt(date: Date): SatellitePosition[] | undefined } | undefined
  /** The re-entries the recording states and the fireballs a camera network recorded during it. */
  burning(): { reentries: ReentryJson[], fireballs: ReentryJson[] }
  /** The aircraft of the traffic record, the recording's start in ms UTC, and what is known of each — while there is a record. */
  traffic(): { tracks: AircraftTrack[], startMs: number, describe(track: AircraftTrack): AircraftDescription | undefined } | undefined
  /** The interpretations of the account: its own, and the readings of it a case holds, each with what it is called. */
  interpretations(): { id: string, label: string, interpretation: InterpretationJson }[]
  /** What a bright star is called in the reader's language (see SceneNaming.star). */
  starName(name: string): string
  /** How a body looks from the observer's eye at `t` ms of the recording (see SceneElement.bodyProjectionAt). */
  projectionAt(body: BodyJson, t: number): { aim: { azimuthDeg: number, altitudeDeg: number }, angular: { widthDeg: number } } | undefined
  /** The variants the recording keeps (see InterpretationJson.variant), and keeping or removing one: a change of the author's. */
  variants(): InterpretationJson[]
  keep(variant: InterpretationJson): void
  remove(index: number): void
}

/** What a known phenomenon of Poher's matrix is followed by, when its track can be computed. */
type Tracked = "Moon" | "Planets" | "Stars" | "OrbitingSatellites" | "AtmosphericSatellitesReentry" | "Meteorits" | "HighAltitudePlanes" | "LowAltitudePlanes" | "Helicopters"

/**
 * The candidate explanations of the Summary section (see the design handoff, §6, and docs/witness-error-model.md, "The search"): one
 * row a candidate, by verdict and cost, each opening on the values it moves — the account's value struck, the variant's beside it, the
 * bias that moves it and its status — and on "See this variant", which shows the account as it would read had the observer erred
 * that way: a label over the scene with the way back, and every moved value struck in its field. The account itself never changes.
 */
export class CandidatesView {
  static readonly CSS = `
.candidates { display: grid; gap: 8px; }
.candidate { border: 1px solid var(--line-strong); border-radius: 10px; background: var(--ground); }
.candidate-head { display: grid; grid-template-columns: auto minmax(0, 1fr) auto auto; gap: 10px; align-items: center; width: 100%; min-height: 46px; padding: 0 14px;
  border: 0; border-radius: 10px; background: none; color: var(--ink); font: 600 15px/1.3 var(--sans); text-align: left; }
.candidate-head:hover:not(:disabled) { background: var(--ground-sunken); }
.candidate-head::before { content: "›"; color: var(--ink-faint); transition: transform .12s ease; }
.candidate[open] .candidate-head::before { transform: rotate(90deg); }
.verdict { user-select: none; padding: 2px 9px; border-radius: 6px; font: 600 12px/1.5 var(--sans); background: var(--neutral-bg); }
.verdict[data-verdict="consolidated"] { background: light-dark(rgba(31, 122, 68, .14), rgba(143, 215, 164, .16)); }
.verdict[data-verdict="contested"] { background: var(--warn-bg); }
.verdict[data-verdict="incompatible"] { background: var(--error-bg); }
.cost { font-size: 13px; color: var(--ink-faint); font-weight: 400; }
.candidate-body { display: grid; gap: 6px; padding: 4px 14px 14px; font-size: 14px; }
.candidate-body[hidden] { display: none; }
.moved-row { display: grid; grid-template-columns: minmax(8em, auto) minmax(0, auto) minmax(0, 1fr) auto; gap: 4px 12px; align-items: baseline; }
.moved-row s, .variant-value s { color: var(--ink-faint); text-decoration-color: var(--error); }
.moved-row b, .variant-value b { color: var(--ink); }
.moved-row .bias { color: var(--ink-dim); }
.reading-row { grid-template-columns: minmax(8em, auto) minmax(0, 1fr) auto; }
.candidate-reason { margin: 0; color: var(--ink-dim); }
.candidates-note { margin: 4px 0 0; font-size: 13px; color: var(--ink-faint); }
.variant-value { flex: 1 0 100%; font: 400 13px/1.4 var(--sans); }
.poher-tag { user-select: none; margin-left: 6px; padding: 1px 7px; border-radius: 6px; background: var(--neutral-bg); color: var(--ink-dim); font: 600 11px/1.6 var(--sans); }
.poher-tag[data-excluded="true"] { background: var(--error-bg); }
.poher-answers { font-size: 13px; color: var(--ink-dim); }
.poher-answers summary { cursor: pointer; font-weight: 600; }
.poher-answers ul, .poher-list { margin: 6px 0 0; padding-left: 18px; display: grid; gap: 3px; }
.poher-answers li[data-firm="false"] { color: var(--ink-faint); }
.firmness { font-size: 11px; color: var(--ink-faint); }
.poher-block h4 { margin: 14px 0 2px; font: 600 15px/1.3 var(--serif); }
.poher-block h5 { margin: 8px 0 0; font: 600 12px/1.3 var(--sans); letter-spacing: .08em; text-transform: uppercase; color: var(--glow-dim); }
.poher-block details summary { margin-top: 8px; cursor: pointer; font: 600 13px/1.3 var(--sans); color: var(--ink-dim); }
.poher-list { font-size: 14px; }
.poher-bar { display: inline-block; width: 60px; height: 6px; border-radius: 3px; vertical-align: middle;
  background: linear-gradient(90deg, var(--glow-solid) calc(var(--score) * 100%), var(--line) 0); }
.poher-list .doubt { color: var(--ink-faint); font-size: 12px; }
.candidate-actions { display: flex; flex-wrap: wrap; gap: 8px; }
.kept-variants h4 { margin: 14px 0 6px; font: 600 15px/1.3 var(--serif); }
.kept-variant { display: flex; flex-wrap: wrap; align-items: center; gap: 8px 12px; padding: 8px 12px; margin-bottom: 6px; border: 1px dashed var(--line-strong); border-radius: 10px; }
.kept-variant .recomputed { flex: 1 0 100%; font-size: 13px; color: var(--glow); }
.variant-badge { position: absolute; top: 10px; left: 10px; z-index: 5; display: inline-flex; align-items: center; gap: 10px; padding: 4px 6px 4px 12px;
  border-radius: 999px; background: rgba(127, 212, 255, .94); color: #07111c; font: 600 13px/1.3 var(--sans); }
.variant-badge button { min-height: 28px; padding: 0 10px; border: 0; border-radius: 999px; background: rgba(7, 10, 18, .85); color: #e8ecf4; font: 600 12px/1 var(--sans); }
`

  private static readonly PLANETS: readonly CelestialBody[] = ["Venus", "Mars", "Jupiter", "Saturn"]
  /** How many stars are tried: those that shone nearest where the account puts its phenomenon, since a star is only ever mistaken there. */
  private static readonly STARS = 6
  /** The faintest star tried: the first-magnitude ones, which are what gets taken for something else; a fainter one nearer would win
   * on direction alone, the search knowing nothing of how bright the light was. */
  private static readonly STAR_MAG = 1.5
  /** How many satellite passes are tried: the brightest, since a faint one is no candidate for a light somebody noticed. */
  private static readonly SATELLITES = 4
  /** How many aircraft are tried: the nearest to the observer when the sighting began, since a far one is a dot nobody describes. */
  private static readonly AIRCRAFT = 12
  /** Beyond this distance an aircraft's lights are no candidate for anything described. */
  private static readonly AIRCRAFT_RANGE_KM = 80
  /** The wingspan an aircraft's lights spread across, when its type is not known: an airliner's. */
  private static readonly SPAN_M = 35
  /** Feet in a metre: aircraft state their altitude in feet. */
  private static readonly FT_M = 0.3048
  /** When the account's main phenomenon is stated, in ms of the recording: where a re-entry's or an aircraft's track is read from. */
  private statementT = 0

  private poher?: { matrix: PoherMatrix, labels: Record<string, string> }
  private poherState: "idle" | "loading" | "failed" | "ready" = "idle"
  /** Which phenomenon of the matrix each variant stands for. */
  private readonly phenomenonOf = new Map<string, Tracked>()

  private variants: Variant[] = []
  private shown?: Variant
  private readonly open = new Set<string>()

  constructor(private readonly host: CandidatesHost, private readonly section: HTMLElement) {
  }

  /** What the account states of its main phenomenon: the first shape, at its first keyframe. */
  private statement(): AccountStatement | undefined {
    const sighting = this.host.sighting
    const timeline = sighting.timeline
    const first = timeline.sourceIds[0]
    if (!first) return undefined
    const t = timeline.allKeyframes.find(keyframe => keyframe.shapes.some(state => state.sourceId === first))?.t ?? 0
    this.statementT = t
    const shape = timeline.getInterpolatedShapeAt(t, first)
    if (!shape?.aim) return undefined
    const statement: AccountStatement = { aim: shape.aim, widthDeg: shape.angular?.widthDeg, timeHow: sighting.provenance.at("time")?.how }
    // How it moved and grew: from the first instant it is placed to the last, when the account places it more than once.
    const last = [...timeline.allKeyframes].reverse().find(keyframe => keyframe.t > t && timeline.getShapeAt(keyframe.t, first)?.aim)
    const end = last ? timeline.getInterpolatedShapeAt(last.t, first) : undefined
    if (last && end?.aim) {
      statement.motion = { sweepDeg: CandidateSearch.separation(shape.aim, end.aim), spanMinutes: (last.t - t) / 60_000 }
      const from = shape.angular?.widthDeg
      const to = end.angular?.widthDeg
      if (from && to) statement.growth = to / from
    }
    return statement
  }

  /** The candidates whose track can be computed, each as the phenomenon of the matrix it stands for. */
  private tracks(statement: AccountStatement): CandidateTrack[] {
    const start = this.host.start()
    if (!start) return []
    const names = this.host.messages().candidates.bodies
    const body = (name: CelestialBody): CandidateTrack => ({
      id: name,
      label: names[name] ?? name,
      at: (offsetMinutes: number) => {
        const date = new Date(start.date.getTime() + this.statementT + offsetMinutes * 60_000)
        const position = computeBodyPosition(name, date, start.observer)
        if (position.altitudeDeg < 0) return undefined
        const sun = computeBodyPosition("Sun", date, start.observer).altitudeDeg
        const magnitude = name === "Moon" ? -10 : computeBodyMagnitude(name, date)
        if (magnitude > this.host.limitAt(sun)) return undefined
        return { aim: { azimuthDeg: position.azimuthDeg, altitudeDeg: position.altitudeDeg }, widthDeg: name === "Moon" ? WitnessError.MOON_DEG : 0.01, magnitude }
      },
      // A body of the sky stands still against the horizon: seen moving, it is by the autokinetic effect, or behind drifting clouds.
      readings: ["still-seen-moving"]
    })
    this.phenomenonOf.clear()
    const tracks: CandidateTrack[] = [body("Moon")]
    this.phenomenonOf.set("Moon", "Moon")
    for (const planet of CandidatesView.PLANETS) {
      tracks.push(body(planet))
      this.phenomenonOf.set(planet, "Planets")
    }
    tracks.push(...this.starTracks(start, statement))
    // The brightest passes during the observation, followed as they cross: lit, and above the horizon.
    const satellites = this.host.satellites()
    if (satellites) {
      const positions = new Map<number, SatellitePosition[] | undefined>()
      const at = (date: Date) => {
        if (!positions.has(date.getTime())) positions.set(date.getTime(), satellites.positionsAt(date))
        return positions.get(date.getTime())
      }
      const brightest = [...satellites.passes].sort((a, b) => (a.peak.magnitude ?? 99) - (b.peak.magnitude ?? 99)).slice(0, CandidatesView.SATELLITES)
      for (const pass of brightest) {
        const id = `satellite-${pass.object.norad}`
        tracks.push({
          id,
          label: pass.object.name,
          at: (offsetMinutes: number) => {
            const seen = at(new Date(start.date.getTime() + this.statementT + offsetMinutes * 60_000))?.find(position => position.object.norad === pass.object.norad)
            if (!seen || seen.altitudeDeg < 0 || seen.sunlitFraction < 0.5) return undefined
            return { aim: { azimuthDeg: seen.azimuthDeg, altitudeDeg: seen.altitudeDeg }, widthDeg: 0.01, magnitude: seen.magnitude }
          },
          // A tumbling stage or a panel catching the Sun flares: brighter for a few seconds.
          readings: ["brightening-as-approach"]
        })
        this.phenomenonOf.set(id, "OrbitingSatellites")
      }
    }
    tracks.push(...this.burningTracks(start), ...this.aircraftTracks(start), ...this.interpretationTracks())
    return tracks
  }

  /**
   * The bright stars seen when the sighting began nearest where the account puts its phenomenon: a star stands still against the horizon
   * but for the sky's turning, so only those the heading and elevation laws could reach are worth a try. Without a stated direction, the
   * brightest seen.
   */
  private starTracks(start: { date: Date, observer: { lat: number, lng: number, elevationM: number } }, statement: AccountStatement): CandidateTrack[] {
    const m = this.host.messages().candidates
    const dateAt = (offsetMinutes: number) => new Date(start.date.getTime() + this.statementT + offsetMinutes * 60_000)
    const sunAt = (date: Date) => computeBodyPosition("Sun", date, start.observer).altitudeDeg
    const limit = this.host.limitAt(sunAt(dateAt(0)))
    const aim = statement.aim
    const rad = Math.PI / 180
    const away = (position: { azimuthDeg: number, altitudeDeg: number }) => !aim ? 0 : Math.acos(Math.min(1,
      Math.sin(aim.altitudeDeg * rad) * Math.sin(position.altitudeDeg * rad)
      + Math.cos(aim.altitudeDeg * rad) * Math.cos(position.altitudeDeg * rad) * Math.cos((position.azimuthDeg - aim.azimuthDeg) * rad))) / rad
    const seen = BRIGHT_STARS
      .filter(star => star.mag <= Math.min(limit, CandidatesView.STAR_MAG))
      .map(star => ({ star, position: equatorialToHorizontal(star.raHours, star.decDeg, dateAt(0), start.observer) }))
      .filter(({ position }) => position.altitudeDeg > 0)
      .sort((a, b) => away(a.position) - away(b.position) || a.star.mag - b.star.mag)
      .slice(0, CandidatesView.STARS)
    return seen.map(({ star }) => {
      const id = `star-${star.name}`
      this.phenomenonOf.set(id, "Stars")
      return {
        id,
        label: m.star.replace("{name}", this.host.starName(star.name)),
        at: (offsetMinutes: number) => {
          const date = dateAt(offsetMinutes)
          const position = equatorialToHorizontal(star.raHours, star.decDeg, date, start.observer)
          if (position.altitudeDeg < 0 || star.mag > this.host.limitAt(sunAt(date))) return undefined
          return { aim: { azimuthDeg: position.azimuthDeg, altitudeDeg: position.altitudeDeg }, widthDeg: 0.01, magnitude: star.mag }
        },
        readings: ["still-seen-moving"] as StructuralReading[]
      }
    })
  }

  /** The interpretations of the account, each followed by the body that claims to be its main phenomenon (else its first body). */
  private interpretationTracks(): CandidateTrack[] {
    const m = this.host.messages().candidates
    const first = this.host.sighting.timeline.sourceIds[0]
    return this.host.interpretations().flatMap(({ id, label, interpretation }) => {
      const body = interpretation.bodies.find(candidate => first !== undefined && candidate.explains?.includes(first)) ?? interpretation.bodies[0]
      if (!body) return []
      return [{
        id: `interpretation-${id}`,
        label: m.interpretation.replace("{name}", label),
        at: (offsetMinutes: number) => {
          const seen = this.host.projectionAt(body, this.statementT + offsetMinutes * 60_000)
          return seen ? { aim: seen.aim, widthDeg: seen.angular.widthDeg } : undefined
        }
      }]
    })
  }

  /**
   * The re-entries and the recorded fireballs, each as its brightest fragment seen from the observer at an instant of the recording, its
   * fragments' spread as its size: a procession is read as one body (see the structural readings of docs/witness-error-model.md).
   */
  private burningTracks(start: { date: Date, observer: { lat: number, lng: number, elevationM: number } }): CandidateTrack[] {
    const m = this.host.messages().candidates
    const { reentries, fireballs } = this.host.burning()
    const observer = { lat: start.observer.lat, lng: start.observer.lng, heightM: start.observer.elevationM }
    const track = (reentry: ReentryJson, fireball: boolean): CandidateTrack => {
      const id = `${fireball ? "fireball" : "reentry"}-${reentry.id}`
      this.phenomenonOf.set(id, fireball ? "Meteorits" : "AtmosphericSatellitesReentry")
      const name = reentry.object?.name ?? reentry.id
      return {
        id,
        label: (fireball ? m.fireball : m.reentry).replace("{name}", name),
        at: (offsetMinutes: number) => {
          const t = this.statementT + offsetMinutes * 60_000
          const views = ReentrySighting.viewsAt([reentry], t, observer).filter(view => view.head.altitudeDeg >= 0)
          if (views.length === 0) return undefined
          const sun = computeBodyPosition("Sun", new Date(start.date.getTime() + t), start.observer).altitudeDeg
          const brightest = views.reduce((best, view) => view.magnitude < best.magnitude ? view : best)
          if (brightest.magnitude > this.host.limitAt(sun)) return undefined
          let spread = 0
          for (const a of views) for (const b of views) spread = Math.max(spread, Math.hypot(a.head.azimuthDeg - b.head.azimuthDeg, a.head.altitudeDeg - b.head.altitudeDeg))
          return { aim: { azimuthDeg: brightest.head.azimuthDeg, altitudeDeg: brightest.head.altitudeDeg }, widthDeg: Math.max(0.01, spread), magnitude: brightest.magnitude }
        },
        // Its fragments read as one body, flaring as they break up.
        readings: ["grouped", "brightening-as-approach"]
      }
    }
    return [...reentries.map(reentry => track(reentry, false)), ...fireballs.map(fireball => track(fireball, true))]
  }

  /**
   * The aircraft of the traffic record nearest the observer when the sighting began, each where its track puts it at an instant, its lights
   * spread across its wingspan at the distance it is: a helicopter, a low or a high aircraft for the matrix, by what it says it is and how
   * high it flies.
   */
  private aircraftTracks(start: { date: Date, observer: { lat: number, lng: number, elevationM: number } }): CandidateTrack[] {
    const traffic = this.host.traffic()
    if (!traffic) return []
    const m = this.host.messages().candidates
    const observer = { lat: start.observer.lat, lng: start.observer.lng, heightM: start.observer.elevationM }
    const startMs = traffic.startMs + this.statementT
    const at = (track: AircraftTrack, ms: number) => {
      const points = track.points
      if (points.length === 0 || ms < points[0].t || ms > points[points.length - 1].t) return undefined
      let i = 0
      while (i < points.length - 2 && points[i + 1].t < ms) i++
      const from = points[i]
      const to = points[Math.min(i + 1, points.length - 1)]
      const f = to.t > from.t ? (ms - from.t) / (to.t - from.t) : 0
      return {
        lat: from.lat + (to.lat - from.lat) * f,
        lng: from.lng + (to.lng - from.lng) * f,
        heightM: (from.altitudeFt + (to.altitudeFt - from.altitudeFt) * f) * CandidatesView.FT_M
      }
    }
    const near = traffic.tracks
      .map(track => ({ track, point: at(track, startMs) }))
      .filter((candidate): candidate is { track: AircraftTrack, point: { lat: number, lng: number, heightM: number } } => candidate.point !== undefined)
      .map(candidate => ({ ...candidate, seen: ReentrySighting.seenFrom(observer, candidate.point) }))
      .filter(candidate => candidate.seen.distanceKm <= CandidatesView.AIRCRAFT_RANGE_KM)
      .sort((a, b) => a.seen.distanceKm - b.seen.distanceKm)
      .slice(0, CandidatesView.AIRCRAFT)
    return near.map(({ track, point }) => {
      const description = traffic.describe(track)
      const id = `aircraft-${track.icao}`
      this.phenomenonOf.set(id, description?.category === "A7" ? "Helicopters" : point.heightM > 15000 * CandidatesView.FT_M ? "HighAltitudePlanes" : "LowAltitudePlanes")
      const name = description?.restricted ? track.icao.toString(16).toUpperCase() : [description?.type, description?.registration].filter(Boolean).join(" ") || track.icao.toString(16).toUpperCase()
      return {
        id,
        label: m.aircraft.replace("{name}", name),
        at: (offsetMinutes: number) => {
          const position = at(track, startMs + offsetMinutes * 60_000)
          if (!position) return undefined
          const seen = ReentrySighting.seenFrom(observer, position)
          if (seen.altitudeDeg < 0 || seen.distanceKm > CandidatesView.AIRCRAFT_RANGE_KM) return undefined
          const widthDeg = (Math.atan2(CandidatesView.SPAN_M, seen.distanceKm * 1000) * 180) / Math.PI
          return { aim: { azimuthDeg: seen.azimuthDeg, altitudeDeg: seen.altitudeDeg }, widthDeg }
        },
        // Its lights read as one body; coming head on, it seems to hover, its landing lights growing brighter.
        readings: ["grouped", "moving-seen-still", "brightening-as-approach"] as StructuralReading[]
      }
    })
  }

  /** The matrix's ranking of the known phenomena against what the recording answers, once the matrix is read. */
  private ranking(): { rows: PoherRanking[], answers: ReturnType<PoherAnswers["of"]> } | undefined {
    if (!this.poher) return undefined
    const answers = new PoherAnswers(this.host.model(), this.host.conditions()).of(this.host.facts()).filter(answer => this.poher!.matrix.has(answer.question))
    return { rows: this.poher.matrix.rank(answers), answers }
  }

  /** The reader's language changed: the matrix's labels are read again in it, the next time the section is drawn. */
  languageChanged(): void {
    if (this.poherState === "loading") return
    this.poherState = "idle"
    this.poher = undefined
  }

  /** Reads the matrix the first time it is needed, and draws the section again once it is read. */
  private loadPoher(): void {
    if (this.poherState !== "idle") return
    this.poherState = "loading"
    this.host.poher().then(poher => {
      this.poher = poher
      this.poherState = "ready"
      this.refresh()
    }, () => {
      this.poherState = "failed"
      this.refresh()
    })
  }

  /** Searches again and draws the section: after the account, the place, the time, the model or the observer's conditions changed. */
  refresh(): void {
    const m = this.host.messages().candidates
    const statement = this.statement()
    const start = this.host.start()
    this.variants = statement && start ? new CandidateSearch(this.host.model(), this.host.conditions()).search(statement, this.tracks(statement)) : []
    const title = Object.assign(document.createElement("h3"), { className: "section-title", textContent: m.title })
    const nodes: Node[] = [title]
    this.loadPoher()
    const ranking = this.ranking()
    if (this.poherState === "loading") nodes.push(this.note(m.poherLoading))
    if (this.poherState === "failed") nodes.push(this.note(m.poherFailed))
    if (ranking) nodes.push(this.answersBlock(ranking.answers))
    if (!statement) nodes.push(this.note(m.noDirection))
    else if (!start) nodes.push(this.note(m.noSky))
    else {
      const list = document.createElement("div")
      list.className = "candidates"
      list.append(...this.variants.map(variant => this.row(variant, ranking?.rows.find(row => row.phenomenon === this.phenomenonOf.get(variant.candidate)))))
      nodes.push(list, this.note(m.costNote))
    }
    const kept = this.keptBlock()
    if (kept) nodes.push(kept)
    if (ranking) nodes.push(this.poherBlock(ranking.rows))
    nodes.push(this.note(m.scopeNote))
    this.section.replaceChildren(...nodes)
    // A variant on show is shown again as the search now reads it, or goes with its candidate.
    const shown = this.shown && this.variants.find(variant => variant.candidate === this.shown!.candidate)
    this.show(shown && shown.verdict !== "incompatible" ? shown : undefined)
  }

  /** Keeps `variant` in the recording, as an interpretation of the account (see InterpretationJson.variant), in place of one kept for the same candidate and model. */
  private keep(variant: Variant): void {
    const phenomenon = this.phenomenonOf.get(variant.candidate)
    const of = variant.candidate.startsWith("interpretation-")
      ? this.host.interpretations().find(({ id }) => `interpretation-${id}` === variant.candidate)?.interpretation
      : undefined
    const kept: InterpretationJson = {
      title: this.host.messages().candidates.variantLabel.replace("{name}", variant.label),
      // A variant of an interpretation stands its bodies where it did; one of a body of the sky draws none, the sky has it.
      bodies: of ? structuredClone(of.bodies) : [],
      variant: {
        candidate: variant.candidate, label: variant.label, ...(phenomenon ? { phenomenon } : {}),
        parameters: variant.parameters, moved: variant.moved.map(moved => ({ ...moved })), ...(variant.readings.length > 0 ? { readings: variant.readings.map(used => ({ ...used })) } : {}),
        cost: variant.cost, verdict: variant.verdict, modelId: variant.modelId
      }
    }
    const index = this.host.variants().findIndex(existing => existing.variant?.candidate === variant.candidate && existing.variant?.modelId === variant.modelId)
    if (index >= 0) this.host.remove(index)
    this.host.keep(kept)
    this.refresh()
  }

  /** The variants the recording keeps: each as it was kept, what the search makes of its candidate now, and the way to see or remove it. */
  private keptBlock(): HTMLElement | undefined {
    const kept = this.host.variants()
    if (kept.length === 0) return undefined
    const m = this.host.messages()
    const block = document.createElement("div")
    block.className = "kept-variants"
    block.append(Object.assign(document.createElement("h4"), { textContent: m.candidates.keptTitle.replace("{n}", String(kept.length)) }))
    kept.forEach((interpretation, index) => {
      const json = interpretation.variant
      if (!json) return
      const row = document.createElement("div")
      row.className = "kept-variant"
      const verdict = Object.assign(document.createElement("span"), { className: "verdict", textContent: m.candidates.verdicts[json.verdict] })
      verdict.dataset.verdict = json.verdict
      const cost = Object.assign(document.createElement("span"), { className: "cost", textContent: m.candidates.cost.replace("{x}", this.number(json.cost)) })
      const model = Object.assign(document.createElement("span"), { className: "cost", textContent: m.candidates.keptModel.replace("{model}", m.models[json.modelId] ?? json.modelId) })
      row.append(Object.assign(document.createElement("strong"), { textContent: json.label ?? json.candidate }), verdict, cost, model)
      // Computed again under the model and the data as they now stand: said when it no longer reads the same.
      const now = this.variants.find(variant => variant.candidate === json.candidate)
      if (now && (now.verdict !== json.verdict || Math.abs(now.cost - json.cost) > 0.05 || now.modelId !== json.modelId)) {
        row.append(Object.assign(document.createElement("span"), { className: "recomputed", textContent: m.candidates.keptRecomputed.replace("{verdict}", m.candidates.verdicts[now.verdict]).replace("{x}", this.number(now.cost)) }))
      }
      const see = document.createElement("button")
      see.type = "button"
      see.className = "pill-btn"
      see.textContent = m.candidates.seeKept
      see.addEventListener("click", () => this.show({
        candidate: json.candidate, label: json.label ?? json.candidate, verdict: json.verdict, cost: json.cost, parameters: json.parameters,
        moved: json.moved as MovedValue[], readings: (json.readings ?? []) as UsedReading[], modelId: json.modelId
      }))
      const remove = document.createElement("button")
      remove.type = "button"
      remove.className = "pill-btn"
      remove.textContent = m.candidates.removeVariant
      remove.addEventListener("click", () => {
        this.host.remove(index)
        this.refresh()
      })
      row.append(see, remove)
      block.append(row)
    })
    return block
  }

  /** The label the matrix gives one of its answers: its question and its choice ("Hour: Night"). */
  private answerLabel(question: string): string {
    const labels = this.poher?.labels ?? {}
    const group = question.slice(0, question.indexOf("."))
    return `${labels[group] ?? group} : ${labels[question] ?? question.slice(question.indexOf(".") + 1)}`
  }

  /** What the recording answers of the matrix's questions, each firm or an estimate (see PoherAnswer), folded. */
  private answersBlock(answers: ReturnType<PoherAnswers["of"]>): HTMLElement {
    const m = this.host.messages().candidates
    const block = document.createElement("details")
    block.className = "poher-answers"
    block.append(Object.assign(document.createElement("summary"), { textContent: m.answersTitle.replace("{n}", String(answers.length)) }))
    const list = document.createElement("ul")
    for (const answer of answers) {
      const item = document.createElement("li")
      item.append(this.answerLabel(answer.question), " ", Object.assign(document.createElement("span"), { className: "firmness", textContent: answer.firm ? m.firm : m.soft }))
      item.dataset.firm = String(answer.firm)
      list.append(item)
    }
    block.append(list)
    return block
  }

  /** The matrix's other phenomena: those still possible with their score, then those ruled out and what rules them out, folded. */
  private poherBlock(rows: PoherRanking[]): HTMLElement {
    const m = this.host.messages().candidates
    const labels = this.poher?.labels ?? {}
    const tracked = new Set<string>(this.phenomenonOf.values())
    const others = rows.filter(row => !tracked.has(row.phenomenon))
    const block = document.createElement("div")
    block.className = "poher-block"
    block.append(Object.assign(document.createElement("h4"), { textContent: m.poherTitle }), Object.assign(document.createElement("p"), { className: "candidates-note", textContent: m.poherIntro }))
    const item = (row: PoherRanking) => {
      const li = document.createElement("li")
      li.append(Object.assign(document.createElement("strong"), { textContent: labels[row.phenomenon] ?? row.phenomenon }))
      if (row.excludedBy.length > 0) li.append(" — ", m.poherExcludedBy.replace("{list}", row.excludedBy.map(question => this.answerLabel(question)).join(", ")))
      else {
        const bar = document.createElement("span")
        bar.className = "poher-bar"
        bar.style.setProperty("--score", String(row.mean))
        li.append(" ", bar, " ", m.poherScore.replace("{x}", this.number(WitnessError.rounded(row.mean))))
        if (row.doubtedBy.length > 0) li.append(Object.assign(document.createElement("span"), { className: "doubt", textContent: ` · ${m.poherDoubted.replace("{list}", row.doubtedBy.map(question => this.answerLabel(question)).join(", "))}` }))
      }
      return li
    }
    const possible = others.filter(row => row.excludedBy.length === 0)
    const excluded = others.filter(row => row.excludedBy.length > 0)
    const list = document.createElement("ul")
    list.className = "poher-list"
    list.append(...possible.map(item))
    block.append(Object.assign(document.createElement("h5"), { textContent: m.poherPossible }), list)
    if (excluded.length > 0) {
      const fold = document.createElement("details")
      fold.append(Object.assign(document.createElement("summary"), { textContent: m.poherExcluded.replace("{n}", String(excluded.length)) }))
      const out = document.createElement("ul")
      out.className = "poher-list"
      out.append(...excluded.map(item))
      fold.append(out)
      block.append(fold)
    }
    return block
  }

  private note(text: string): HTMLElement {
    return Object.assign(document.createElement("p"), { className: "candidates-note", textContent: text })
  }

  private row(variant: Variant, poher?: PoherRanking): HTMLElement {
    const m = this.host.messages().candidates
    const row = document.createElement("div")
    row.className = "candidate"
    const head = document.createElement("button")
    head.type = "button"
    head.className = "candidate-head"
    head.setAttribute("aria-expanded", String(this.open.has(variant.candidate)))
    const verdict = Object.assign(document.createElement("span"), { className: "verdict", textContent: m.verdicts[variant.verdict] })
    verdict.dataset.verdict = variant.verdict
    const cost = Object.assign(document.createElement("span"), { className: "cost", textContent: Number.isFinite(variant.cost) ? m.cost.replace("{x}", this.number(variant.cost)) : "" })
    const name = Object.assign(document.createElement("span"), { textContent: variant.label })
    if (poher) {
      // What Poher's matrix makes of the phenomenon it is an instance of, beside what the search makes of this one.
      const tag = Object.assign(document.createElement("span"), {
        className: "poher-tag",
        textContent: m.poherTag.replace("{state}", poher.excludedBy.length > 0 ? m.poherStateExcluded : m.poherStatePossible.replace("{x}", this.number(WitnessError.rounded(poher.mean))))
      })
      tag.dataset.excluded = String(poher.excludedBy.length > 0)
      name.append(" ", tag)
    }
    head.append(name, verdict, cost)
    const body = document.createElement("div")
    body.className = "candidate-body"
    body.hidden = !this.open.has(variant.candidate)
    row.toggleAttribute("open", !body.hidden)
    head.addEventListener("click", () => {
      if (this.open.has(variant.candidate)) this.open.delete(variant.candidate)
      else this.open.add(variant.candidate)
      body.hidden = !body.hidden
      row.toggleAttribute("open", !body.hidden)
      head.setAttribute("aria-expanded", String(!body.hidden))
    })
    if (poher && poher.excludedBy.length > 0) {
      body.append(Object.assign(document.createElement("p"), {
        className: "candidate-reason",
        textContent: `${m.poherTag.replace("{state}", m.poherStateExcluded)} — ${m.poherExcludedBy.replace("{list}", poher.excludedBy.map(question => this.answerLabel(question)).join(", "))}`
      }))
    }
    if (variant.verdict === "incompatible") {
      body.append(Object.assign(document.createElement("p"), { className: "candidate-reason", textContent: `${m.reasons[variant.reason ?? "direction"]} ${m.notAgainst}` }))
    }
    for (const moved of variant.moved) body.append(this.movedRow(moved))
    for (const used of variant.readings) body.append(this.readingRow(used))
    if (variant.verdict !== "incompatible") {
      const see = document.createElement("button")
      see.type = "button"
      see.className = "pill-btn"
      see.textContent = m.seeVariant
      see.addEventListener("click", () => this.show(variant))
      const keep = document.createElement("button")
      keep.type = "button"
      keep.className = "pill-btn"
      keep.textContent = m.keepVariant
      keep.addEventListener("click", () => this.keep(variant))
      const buttons = document.createElement("div")
      buttons.className = "candidate-actions"
      buttons.append(see, keep)
      body.append(buttons)
    }
    row.append(head, body)
    return row
  }

  /** One structural reading the variant uses: what is read otherwise, and what the studies say of it. */
  private readingRow(used: UsedReading): HTMLElement {
    const m = this.host.messages().candidates
    const row = document.createElement("div")
    row.className = "moved-row reading-row"
    row.append(Object.assign(document.createElement("span"), { textContent: m.readingTitle }),
      Object.assign(document.createElement("span"), { className: "bias", textContent: m.readings[used.reading] }), this.status(used.status))
    return row
  }

  /** One moved value: what it is, the account's value struck and the variant's, the bias and its status. */
  private movedRow(moved: MovedValue): HTMLElement {
    const m = this.host.messages()
    const row = document.createElement("div")
    row.className = "moved-row"
    const [stated, variant] = this.values(moved)
    const values = document.createElement("span")
    values.append(Object.assign(document.createElement("s"), { textContent: stated }), " → ", Object.assign(document.createElement("b"), { textContent: variant }))
    const amount = moved.parameter === "clock" || moved.parameter === "heading" || moved.parameter === "sweep"
      ? `${moved.amount > 0 ? "+" : ""}${this.number(WitnessError.rounded(moved.amount))}`
      : this.number(WitnessError.rounded(moved.amount))
    row.append(Object.assign(document.createElement("span"), { textContent: m.candidates.fields[moved.field] }), values,
      Object.assign(document.createElement("span"), { className: "bias", textContent: m.candidates.biases[moved.parameter].replace("{x}", amount) }),
      this.status(moved.status))
    return row
  }

  private status(status: LeadStatus): HTMLElement {
    const pill = Object.assign(document.createElement("span"), { className: "lead-status", textContent: this.host.messages().status[status] })
    pill.dataset.status = status
    return pill
  }

  /** A moved value as the account says it and as the variant reads it, in its unit. */
  private values(moved: MovedValue): [string, string] {
    if (moved.field === "time") {
      const start = this.host.start()
      if (!start) return ["", ""]
      const at = (date: Date) => date.toLocaleTimeString(document.documentElement.lang || undefined, { hour: "2-digit", minute: "2-digit" })
      return [at(start.date), at(new Date(start.date.getTime() + moved.variant * 60_000))]
    }
    if (moved.field === "duration") {
      const seconds = (value: number) => `${this.number(WitnessError.rounded(value))} s`
      return [seconds(moved.stated), seconds(moved.variant)]
    }
    const degrees = (value: number) => `${this.number(WitnessError.rounded(value))}°`
    return [degrees(moved.stated), degrees(moved.variant)]
  }

  private number(value: number): string {
    return value.toLocaleString(document.documentElement.lang || undefined, { maximumFractionDigits: 2 })
  }

  /** Shows `variant` — its label over the scene, the account's values struck in their fields — or, undefined, the account again. */
  show(variant: Variant | undefined): void {
    this.shown = variant
    const card = this.host.sceneCard()
    card.querySelector(".variant-badge")?.remove()
    for (const label of Object.values(this.host.fieldLabels())) label?.querySelector(".variant-value")?.remove()
    if (!variant) return
    const m = this.host.messages().candidates
    const badge = document.createElement("div")
    badge.className = "variant-badge"
    badge.setAttribute("role", "status")
    const back = document.createElement("button")
    back.type = "button"
    back.textContent = m.backToAccount
    back.addEventListener("click", () => this.show(undefined))
    badge.append(m.variantLabel.replace("{name}", variant.label), back)
    card.append(badge)
    const labels = this.host.fieldLabels()
    for (const moved of variant.moved) {
      const label = labels[moved.field]
      if (!label) continue
      const [stated, value] = this.values(moved)
      const said = document.createElement("span")
      said.className = "variant-value"
      said.append(Object.assign(document.createElement("s"), { textContent: stated }), " → ", Object.assign(document.createElement("b"), { textContent: value }))
      label.append(said)
    }
  }

  /** The variant on show, if any. */
  get variant(): Variant | undefined {
    return this.shown
  }
}
