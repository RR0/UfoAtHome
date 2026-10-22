import type { WitnessErrorMessages } from "./messages/WitnessErrorMessages.js"
import type { Sighting } from "../engine/model/Sighting.js"
import type { WitnessConditions } from "../engine/model/Account.js"
import type { ErrorModel, LeadStatus } from "../engine/witness/WitnessError.js"
import { WitnessError } from "../engine/witness/WitnessError.js"
import { CandidateSearch } from "../engine/witness/CandidateSearch.js"
import type { AccountStatement, CandidateTrack, MovedValue, Variant } from "../engine/witness/CandidateSearch.js"
import { computeBodyMagnitude, computeBodyPosition } from "../engine/astronomy/CelestialPositions.js"
import type { CelestialBody } from "../engine/astronomy/CelestialPositions.js"
import { PoherAnswers } from "../engine/witness/PoherMatrix.js"
import type { PoherFacts, PoherMatrix, PoherRanking } from "../engine/witness/PoherMatrix.js"
import type { SatellitePass, SatellitePosition } from "../engine/astronomy/SatellitePasses.js"

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
}

/** What a known phenomenon of Poher's matrix is followed by, when its track can be computed. */
type Tracked = "Moon" | "Planets" | "OrbitingSatellites"

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
.verdict { padding: 2px 9px; border-radius: 6px; font: 600 12px/1.5 var(--sans); background: var(--neutral-bg); }
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
.candidate-reason { margin: 0; color: var(--ink-dim); }
.candidates-note { margin: 4px 0 0; font-size: 13px; color: var(--ink-faint); }
.variant-value { flex: 1 0 100%; font: 400 13px/1.4 var(--sans); }
.poher-tag { margin-left: 6px; padding: 1px 7px; border-radius: 6px; background: var(--neutral-bg); color: var(--ink-dim); font: 600 11px/1.6 var(--sans); }
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
.variant-badge { position: absolute; top: 10px; left: 10px; z-index: 5; display: inline-flex; align-items: center; gap: 10px; padding: 4px 6px 4px 12px;
  border-radius: 999px; background: rgba(127, 212, 255, .94); color: #07111c; font: 600 13px/1.3 var(--sans); }
.variant-badge button { min-height: 28px; padding: 0 10px; border: 0; border-radius: 999px; background: rgba(7, 10, 18, .85); color: #e8ecf4; font: 600 12px/1 var(--sans); }
`

  private static readonly PLANETS: readonly CelestialBody[] = ["Venus", "Mars", "Jupiter", "Saturn"]
  /** How many satellite passes are tried: the brightest, since a faint one is no candidate for a light somebody noticed. */
  private static readonly SATELLITES = 4

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
    const shape = timeline.getInterpolatedShapeAt(t, first)
    if (!shape?.aim) return undefined
    return { aim: shape.aim, widthDeg: shape.angular?.widthDeg, timeHow: sighting.provenance.at("time")?.how }
  }

  /** The candidates whose track can be computed, each as the phenomenon of the matrix it stands for. */
  private tracks(): CandidateTrack[] {
    const start = this.host.start()
    if (!start) return []
    const names = this.host.messages().candidates.bodies
    const body = (name: CelestialBody): CandidateTrack => ({
      id: name,
      label: names[name] ?? name,
      at: (offsetMinutes: number) => {
        const date = new Date(start.date.getTime() + offsetMinutes * 60_000)
        const position = computeBodyPosition(name, date, start.observer)
        if (position.altitudeDeg < 0) return undefined
        const sun = computeBodyPosition("Sun", date, start.observer).altitudeDeg
        const magnitude = name === "Moon" ? -10 : computeBodyMagnitude(name, date)
        if (magnitude > this.host.limitAt(sun)) return undefined
        return { aim: { azimuthDeg: position.azimuthDeg, altitudeDeg: position.altitudeDeg }, widthDeg: name === "Moon" ? WitnessError.MOON_DEG : 0.01 }
      }
    })
    this.phenomenonOf.clear()
    const tracks: CandidateTrack[] = [body("Moon")]
    this.phenomenonOf.set("Moon", "Moon")
    for (const planet of CandidatesView.PLANETS) {
      tracks.push(body(planet))
      this.phenomenonOf.set(planet, "Planets")
    }
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
            const seen = at(new Date(start.date.getTime() + offsetMinutes * 60_000))?.find(position => position.object.norad === pass.object.norad)
            if (!seen || seen.altitudeDeg < 0 || seen.sunlitFraction < 0.5) return undefined
            return { aim: { azimuthDeg: seen.azimuthDeg, altitudeDeg: seen.altitudeDeg }, widthDeg: 0.01 }
          }
        })
        this.phenomenonOf.set(id, "OrbitingSatellites")
      }
    }
    return tracks
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
    this.variants = statement && start ? new CandidateSearch(this.host.model(), this.host.conditions()).search(statement, this.tracks()) : []
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
    if (ranking) nodes.push(this.poherBlock(ranking.rows))
    nodes.push(this.note(m.scopeNote))
    this.section.replaceChildren(...nodes)
    // A variant on show is shown again as the search now reads it, or goes with its candidate.
    const shown = this.shown && this.variants.find(variant => variant.candidate === this.shown!.candidate)
    this.show(shown && shown.verdict !== "incompatible" ? shown : undefined)
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
    if (variant.verdict !== "incompatible") {
      const see = document.createElement("button")
      see.type = "button"
      see.className = "pill-btn"
      see.textContent = m.seeVariant
      see.addEventListener("click", () => this.show(variant))
      body.append(see)
    }
    row.append(head, body)
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
    const amount = moved.parameter === "clock" || moved.parameter === "heading"
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
