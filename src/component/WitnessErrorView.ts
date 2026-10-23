import { WindowClose } from "./WindowClose.js"
import type { WitnessErrorMessages } from "./messages/WitnessErrorMessages.js"
import type { Sighting } from "../engine/model/Sighting.js"
import type { WitnessConditions, WitnessExposure, WitnessWord } from "../engine/model/Account.js"
import type { Basis } from "../engine/persistence/Provenance.js"
import { WitnessError } from "../engine/witness/WitnessError.js"
import type { ErrorKind, ErrorLaw, ErrorModel } from "../engine/witness/WitnessError.js"
import { computeBodyPosition, sightingTimeToDate } from "../engine/astronomy/CelestialPositions.js"

/** What the view needs of the editor that holds it. */
export interface WitnessErrorHost {
  readonly sighting: Sighting
  messages(): WitnessErrorMessages
  /** Something the author did changed the recording: it is touched, and goes into the history. */
  changed(): void
  /** The observer's conditions were edited: the account is to keep them (see Account.conditions). */
  conditionsChanged(conditions: WitnessConditions | undefined): void
  /** The recording as it would be written, for the value a basis is said about. */
  recordingJson(): unknown
  /** The model or the observer's conditions changed: whatever reads the laws reads them again (the confrontation, the candidates). */
  lawsChanged(): void
}

/** A field whose value an observer gave, and whose error the view says. */
export interface WitnessField {
  kind: ErrorKind
  /** The element its label and value stand in (see the form-section labels of sightingEditorTemplate). */
  label: HTMLElement
  /** What fires when the author types in it, for the basis to expire. */
  input: HTMLElement
  /** Where its provenance is kept (see Provenance), or undefined while it has no value to keep one about. */
  path(): string | undefined
  /** Its value, in the unit of its kind. */
  value(): number | undefined
}

/**
 * The error model of the witness in the editor (see the design handoff, §6, and docs/witness-error-model.md):
 *
 * - on each value an observer gave, a mark of its basis — hidden at rest, shown on hover or while the field is the one edited, and
 *   always when the basis is not "stated" — which opens a window where it is said how the value was obtained (its basis, `how`, the
 *   reason); a value typed again goes back to "stated", and says so;
 * - under each, the law of its error, read-only, in the field's unit, with the status of the lead it comes from: no "±" is ever typed;
 * - for the observer, the conditions of their account and of their seeing, the Moon gauge and the parameters tying their errors.
 */
export class WitnessErrorView {
  static readonly CSS = `
.basis-mark {
  display: inline-block; margin-left: 8px; padding: 0 8px; border: 1px solid var(--glow-dim); border-radius: 999px;
  font: 600 11px/1.6 var(--sans); color: var(--glow); cursor: pointer; visibility: hidden; vertical-align: .05em; user-select: none;
}
:is(label, .field):is(:hover, :focus-within) .basis-mark, .basis-mark:not([data-basis="stated"]) { visibility: visible; }
.basis-mark[data-basis="assumed"], .basis-mark[data-basis="derived"] { font-style: italic; }
:is(label, .field)[data-basis="assumed"] :is(input, .edtf-field input) { font-style: italic; }
/* A field with its basis: its name and the mark on the first line, the value and its unit on the next, the law under them. Left to
   the field's own flow, the mark (hidden but for the hover) opened the second line and pushed the value aside. */
.app .form-section > :is(label, .field):has(> .basis-mark) {
  display: grid; grid-template-columns: auto auto minmax(0, 1fr); align-items: center; gap: 6px;
}
.app .form-section > :is(label, .field):has(> .basis-mark) > :first-child { grid-column: 1; }
.app .form-section > :is(label, .field):has(> .basis-mark) > .basis-mark { grid-column: 2 / -1; justify-self: start; margin-left: 0; }
.app .form-section > :is(label, .field):has(> .basis-mark) > :is(.law, rr0-date-input, rr0-duration-input) { grid-column: 1 / -1; }
.law { flex: 1 0 100%; display: flex; flex-wrap: wrap; align-items: baseline; gap: 4px 8px; font: 400 12px/1.4 var(--sans); color: var(--ink-dim); }
.law-symbol { color: var(--glow-dim); font-weight: 700; }
.law-reset { color: var(--glow); }
.lead-status { user-select: none; padding: 0 7px; border-radius: 6px; font: 600 11px/1.6 var(--sans); color: var(--ink); background: var(--neutral-bg); }
.lead-status[data-status="individual"] { background: light-dark(rgba(31, 122, 68, .14), rgba(143, 215, 164, .16)); }
.lead-status:is([data-status="argued"], [data-status="single"]) { background: var(--warn-bg); }
.lead-status[data-status="contested"] { background: var(--error-bg); }
.basis-window { width: min(26em, 92vw); padding: 18px 20px; border: 1px solid var(--line-strong); border-radius: 12px; background: var(--ground-raised); color: var(--ink); box-shadow: 0 12px 32px rgba(0, 0, 0, .3); }
.basis-window h3 { margin: 0 0 12px; font: 600 19px/1.3 var(--serif); }
.basis-window label { display: flex; flex-direction: column; gap: 5px; margin: 0 0 12px; font: 600 13px/1.3 var(--sans); color: var(--ink-dim); }
.basis-window :is(select, textarea) { box-sizing: border-box; width: 100%; font-weight: 400; }
.basis-window textarea { min-height: 4em; }
.moon-gauge { display: grid; grid-template-columns: 150px minmax(0, 1fr); gap: 16px; align-items: start; grid-column: 1 / -1; }
.moon-picture { position: relative; width: 150px; height: 150px; border-radius: 10px; background: #0b1020; }
.moon-picture svg { display: block; }
.moon-picture span { position: absolute; left: 8px; bottom: 6px; font: 500 10px/1 var(--mono); color: #a3adc2; }
.moon-side { display: flex; flex-direction: column; gap: 8px; }
.moon-side .note { margin: 0; padding: 8px 10px; border-radius: 8px; background: var(--neutral-bg); font-size: 13px; color: var(--ink-dim); }
.section-head { grid-column: 1 / -1; display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 10px; }
.section-head .model-pick { display: inline-flex; align-items: center; gap: 8px; font: 600 13px/1.3 var(--sans); color: var(--ink-dim); }
.section-intro { grid-column: 1 / -1; margin: 0; font-size: 13px; color: var(--ink-dim); }
.parameter-rows { grid-column: 1 / -1; display: grid; gap: 6px; }
.parameter-row { display: grid; grid-template-columns: minmax(10em, auto) minmax(0, 1fr) auto; gap: 4px 14px; align-items: baseline; padding: 10px 14px;
  border: 1px solid var(--line-strong); border-radius: 10px; background: var(--ground); }
.parameter-row strong { font-size: 14px; }
.parameter-row .scope { color: var(--ink-faint); font-size: 13px; }
.extrapolation { grid-column: 1 / -1; margin: 0; padding: 8px 10px; border-radius: 8px; background: var(--warn-bg); font-size: 13px; color: var(--ink); }
@container (max-width: 640px) { .moon-gauge { grid-template-columns: minmax(0, 1fr); } .parameter-row { grid-template-columns: minmax(0, 1fr) auto; } }
`

  private readonly fields: WitnessField[] = []
  private model: ErrorModel = WitnessError.MODELS[0]
  private readonly window: HTMLElement
  private readonly sections: HTMLElement[] = []

  constructor(private readonly host: WitnessErrorHost, windowParent: HTMLElement) {
    this.window = document.createElement("div")
    this.window.className = "basis-window"
    this.window.setAttribute("popover", "")
    this.window.setAttribute("role", "dialog")
    windowParent.append(this.window)
  }

  // -- Fields -----------------------------------------------------------------------------------------------------------------------

  /** Puts the basis mark and the law on `field`. */
  attach(field: WitnessField): void {
    this.fields.push(field)
    const mark = document.createElement("span")
    mark.className = "basis-mark"
    // A role and not a <button>: a button before the field in its label would become what the label labels.
    mark.setAttribute("role", "button")
    mark.tabIndex = 0
    const open = (event: Event) => {
      event.preventDefault()
      event.stopPropagation()
      this.openWindow(field)
    }
    mark.addEventListener("click", open)
    mark.addEventListener("keydown", event => { if (event.key === "Enter" || event.key === " ") open(event) })
    const name = field.label.firstElementChild
    if (name) name.after(mark)
    else field.label.prepend(mark)
    const law = document.createElement("span")
    law.className = "law"
    field.label.append(law)
    // A value typed again is the author's: what was said of the one before no longer holds, and the mark says so.
    field.input.addEventListener("input", () => this.retyped(field))
    field.input.addEventListener("change", () => this.retyped(field))
  }

  /** Says again, on every field, what its basis is and the law of its error, and the observer's own sections. */
  refresh(): void {
    this.refreshFields()
    this.renderObserver()
    this.host.lawsChanged()
  }

  /** The error model picked (see WitnessError.MODELS). */
  get errorModel(): ErrorModel {
    return this.model
  }

  /** Says again, on every field, what its basis is and the law of its error: what follows the playhead. */
  refreshFields(): void {
    for (const field of this.fields) this.refreshField(field)
  }

  private entryOf(field: WitnessField) {
    const path = field.path()
    return path === undefined ? undefined : this.host.sighting.provenance.at(path)
  }

  private refreshField(field: WitnessField, reset?: Basis): void {
    const m = this.host.messages()
    const entry = this.entryOf(field)
    const basis: Basis = entry?.basis ?? "stated"
    const mark = field.label.querySelector<HTMLElement>(".basis-mark")!
    mark.dataset.basis = basis
    mark.textContent = m.basis[basis]
    mark.title = m.basisTitle
    mark.setAttribute("aria-label", `${m.basisTitle} : ${m.basis[basis]}`)
    mark.hidden = field.path() === undefined
    field.label.dataset.basis = basis
    const law = field.label.querySelector<HTMLElement>(".law")!
    if (reset) {
      law.replaceChildren(Object.assign(document.createElement("span"), { className: "law-reset", textContent: m.basisReset.replace("{basis}", m.basis[reset]) }))
      return
    }
    const value = field.value()
    if (value === undefined) {
      law.replaceChildren()
      return
    }
    law.replaceChildren(...this.lawNodes(this.model.law({ kind: field.kind, value, basis, how: entry?.how }, this.conditions), field.kind))
  }

  /** A law as it reads under its field: ≈ or ∅, what it says in the field's unit, and the status of its lead. */
  private lawNodes(law: ErrorLaw, kind: ErrorKind): Node[] {
    const m = this.host.messages()
    const symbol = Object.assign(document.createElement("span"), { className: "law-symbol", textContent: law.shape === "uninformative" ? "∅" : "≈" })
    let text = m.laws[law.note]
    for (const [name, figure] of Object.entries(law.params ?? {})) text = text.replaceAll(`{${name}}`, this.number(WitnessError.rounded(figure)))
    if (law.low !== undefined) text = text.replaceAll("{low}", this.withUnit(law.low, kind))
    if (law.high !== undefined) text = text.replaceAll("{high}", this.withUnit(law.high, kind))
    const said = Object.assign(document.createElement("span"), { textContent: text })
    if (law.sources.length > 0) said.title = m.lawSources.replace("{sources}", law.sources.join(", "))
    const status = Object.assign(document.createElement("span"), { className: "lead-status", textContent: m.status[law.status] })
    status.dataset.status = law.status
    return [symbol, said, status]
  }

  private number(value: number): string {
    return value.toLocaleString(document.documentElement.lang || undefined, { maximumFractionDigits: 2 })
  }

  /** A figure of a law in the unit of its kind: seconds or minutes for a duration, degrees for an angle. */
  private withUnit(value: number, kind: ErrorKind): string {
    const rounded = WitnessError.rounded(value)
    switch (kind) {
      case "duration": return rounded >= 90 ? `${this.number(WitnessError.rounded(rounded / 60))} min` : `${this.number(rounded)} s`
      case "time": return `${this.number(rounded)} min`
      case "distance": return `${this.number(rounded)} m`
      default: return `${this.number(rounded)}°`
    }
  }

  private retyped(field: WitnessField): void {
    const path = field.path()
    const entry = path === undefined ? undefined : this.host.sighting.provenance.at(path)
    if (!path || !entry || (entry.basis === "stated" && entry.how === undefined)) {
      this.refreshField(field)
      return
    }
    this.host.sighting.provenance.clear(path)
    this.refreshField(field, entry.basis === "stated" ? undefined : entry.basis)
    // Said for a moment, then the law of the value as it now stands.
    setTimeout(() => this.refreshField(field), 4000)
  }

  /** The window where how a value was obtained is said: its basis, how (from the list for its kind), and why. */
  private openWindow(field: WitnessField): void {
    const path = field.path()
    if (path === undefined) return
    const m = this.host.messages()
    const entry = this.host.sighting.provenance.at(path)
    const heading = Object.assign(document.createElement("h3"), { textContent: m.basisTitle })
    const basis = document.createElement("select")
    for (const value of ["measured", "stated", "derived", "assumed"] as const) basis.append(new Option(m.basis[value], value))
    basis.value = entry?.basis ?? "stated"
    const how = document.createElement("select")
    how.append(new Option("—", ""))
    for (const value of WitnessError.HOW[field.kind]) how.append(new Option(m.how[value] ?? value, value))
    how.value = entry?.how ?? ""
    const rationale = document.createElement("textarea")
    rationale.value = entry?.rationale ?? ""
    const write = () => {
      const value = field.value()
      const next = { basis: basis.value as Basis, ...(how.value ? { how: how.value } : {}), ...(rationale.value.trim() ? { rationale: rationale.value.trim() } : {}) }
      if (next.basis === "stated" && !("how" in next) && !("rationale" in next)) this.host.sighting.provenance.clear(path)
      else this.host.sighting.provenance.set(path, { ...next, ...(value !== undefined ? { of: this.valueAt(path) } : {}) })
      this.host.changed()
      this.refreshField(field)
    }
    for (const control of [basis, how]) control.addEventListener("change", write)
    rationale.addEventListener("change", write)
    const labelled = (text: string, control: HTMLElement) => {
      const label = document.createElement("label")
      label.append(Object.assign(document.createElement("span"), { textContent: text }), control)
      return label
    }
    this.window.replaceChildren(heading, labelled(m.basisField, basis), labelled(m.howField, how), labelled(m.rationaleField, rationale))
    WindowClose.popover(this.window, this.host.messages().basisTitle)
    if (typeof this.window.showPopover === "function") this.window.showPopover()
  }

  /** The value at `path` as the recording holds it, for its provenance to expire when it changes (see ProvenanceEntry.of). */
  private valueAt(path: string): unknown {
    // A value already said about is written as { value, basis }: what is compared is the value.
    const plain = (held: unknown) => held && typeof held === "object" && !Array.isArray(held) && "value" in held ? (held as { value: unknown }).value : held
    let at: unknown = this.host.recordingJson()
    for (const step of path.split(".")) at = at && typeof at === "object" ? plain((at as Record<string, unknown>)[step]) : undefined
    return plain(at)
  }

  // -- The observer -----------------------------------------------------------------------------------------------------------------

  /** The observer's conditions, as the account holds them. */
  get conditions(): WitnessConditions | undefined {
    return this.host.sighting.account?.conditions
  }

  private setConditions(patch: Partial<WitnessConditions>): void {
    const next: Record<string, unknown> = { ...(this.conditions ?? {}), ...patch }
    for (const key of Object.keys(next)) if (next[key] === undefined) delete next[key]
    this.host.conditionsChanged(Object.keys(next).length > 0 ? next as WitnessConditions : undefined)
    this.host.changed()
    this.refresh()
  }

  /** Puts the observer's four sections after `after`: the conditions of the account and of seeing, the Moon gauge, the error parameters. */
  placeObserverSections(after: HTMLElement): void {
    const make = () => {
      const section = document.createElement("div")
      section.className = "form-section witness-error"
      this.sections.push(section)
      return section
    }
    const sections = [make(), make(), make(), make()]
    after.after(...sections)
    this.renderObserver()
  }

  private renderObserver(): void {
    if (this.sections.length === 0) return
    const m = this.host.messages()
    const c = this.conditions ?? {}
    const [account, viewing, moon, parameters] = this.sections
    const title = (text: string) => Object.assign(document.createElement("h3"), { className: "section-title", textContent: text })
    const field = (text: string, control: HTMLElement, unit?: string) => {
      const label = document.createElement("label")
      label.append(Object.assign(document.createElement("span"), { textContent: text }), control)
      if (unit) label.append(` ${unit}`)
      return label
    }
    const number = (value: number | undefined, write: (value: number | undefined) => void, step = "1") => {
      const input = document.createElement("input")
      input.type = "number"
      input.min = "0"
      input.step = step
      input.value = value === undefined ? "" : String(value)
      input.addEventListener("change", () => write(input.value.trim() === "" || !Number.isFinite(Number(input.value)) ? undefined : Number(input.value)))
      return input
    }
    const choice = <T extends string>(value: T | undefined, options: [T, string][], write: (value: T | undefined) => void) => {
      const select = document.createElement("select")
      select.append(new Option(m.unknownChoice, ""), ...options.map(([key, label]) => new Option(label, key)))
      select.value = value ?? ""
      select.addEventListener("change", () => write(select.value === "" ? undefined : select.value as T))
      return select
    }
    const box = (text: string, checked: boolean | undefined, write: (value: boolean | undefined) => void) => {
      const label = document.createElement("label")
      const input = document.createElement("input")
      input.type = "checkbox"
      input.checked = checked === true
      input.addEventListener("change", () => write(input.checked ? true : undefined))
      label.append(input, ` ${text}`)
      return label
    }
    const independence = document.createElement("select")
    independence.append(new Option(m.unknownChoice, ""), new Option(m.independentYes, "yes"), new Option(m.independentNo, "no"))
    independence.value = c.independent === undefined ? "" : c.independent ? "yes" : "no"
    independence.addEventListener("change", () => this.setConditions({ independent: independence.value === "" ? undefined : independence.value === "yes" }))
    account.replaceChildren(title(m.sectionAccountConditions),
      field(m.delayField, number(c.delayDays, value => this.setConditions({ delayDays: value })), m.delayUnit),
      field(m.versionField, number(c.version, value => this.setConditions({ version: value }))),
      field(m.wordField, choice<WitnessWord>(c.word, Object.entries(m.words) as [WitnessWord, string][], value => this.setConditions({ word: value }))),
      field(m.exposureField, choice<WitnessExposure>(c.exposure, Object.entries(m.exposures) as [WitnessExposure, string][], value => this.setConditions({ exposure: value }))),
      field(m.independenceField, independence))
    viewing.replaceChildren(title(m.sectionViewing),
      box(m.darkAdapted, c.darkAdapted, value => this.setConditions({ darkAdapted: value })),
      box(m.correctedVision, c.correctedVision, value => this.setConditions({ correctedVision: value })),
      box(m.glare, c.glare, value => this.setConditions({ glare: value })),
      Object.assign(document.createElement("p"), { className: "section-intro", textContent: m.viewingNote }))
    moon.replaceChildren(title(m.sectionMoon), Object.assign(document.createElement("p"), { className: "section-intro", textContent: m.moonIntro }), this.moonGauge(c))
    this.renderParameters(parameters, c)
  }

  /** The real full Moon beside the Moon as the observer showed it, the field to say how wide they showed it, and what it makes of their sizes. */
  private moonGauge(c: WitnessConditions): HTMLElement {
    const m = this.host.messages()
    const k = WitnessError.moonFactor(c)
    const gauge = document.createElement("div")
    gauge.className = "moon-gauge"
    const picture = document.createElement("div")
    picture.className = "moon-picture"
    const real = 12
    const shown = k === undefined ? undefined : Math.min(70, real * k)
    picture.innerHTML = `<svg viewBox="0 0 150 150" width="150" height="150" aria-hidden="true"><circle cx="75" cy="72" r="${real}" fill="#efe9d6"/>${shown !== undefined ? `<circle cx="75" cy="72" r="${shown}" fill="none" stroke="#f5c451" stroke-width="1.5" stroke-dasharray="4 3"/>` : ""}</svg>`
    picture.append(Object.assign(document.createElement("span"), { textContent: m.moonReal }))
    const side = document.createElement("div")
    side.className = "moon-side"
    const label = document.createElement("label")
    const input = document.createElement("input")
    input.type = "number"
    input.min = "0"
    input.step = "0.1"
    input.placeholder = "1,7"
    input.value = c.moonShownDeg === undefined ? "" : String(c.moonShownDeg)
    input.addEventListener("change", () => this.setConditions({ moonShownDeg: input.value.trim() === "" || !(Number(input.value) > 0) ? undefined : Number(input.value) }))
    label.append(Object.assign(document.createElement("span"), { textContent: m.moonField }), input, " °")
    const hint = Object.assign(document.createElement("span"), { className: "section-intro", textContent: m.moonHint })
    const general = this.model.parameters().find(parameter => parameter.id === "size")!
    let generalText = m.parameters[general.note]
    for (const [name, figure] of Object.entries(general.params ?? {})) generalText = generalText.replaceAll(`{${name}}`, this.number(figure))
    const note = Object.assign(document.createElement("p"), {
      className: "note",
      textContent: k === undefined ? m.moonNone.replace("{law}", `${generalText}, ${m.status[general.status]}`) : m.moonFactor.replace("{k}", this.number(WitnessError.rounded(k)))
    })
    side.append(label, hint, note)
    gauge.append(picture, side)
    return gauge
  }

  /** The parameters that tie the observer's errors, as the model picked reads them, and whether the laws are stretched to a daylight sighting. */
  private renderParameters(section: HTMLElement, c: WitnessConditions): void {
    const m = this.host.messages()
    const head = document.createElement("div")
    head.className = "section-head"
    const pick = document.createElement("label")
    pick.className = "model-pick"
    const select = document.createElement("select")
    for (const model of WitnessError.MODELS) select.append(new Option(m.models[model.id] ?? model.title, model.id))
    select.value = this.model.id
    select.addEventListener("change", () => {
      this.model = WitnessError.byId(select.value)
      this.refresh()
    })
    pick.append(m.errorModelField, select)
    head.append(Object.assign(document.createElement("h3"), { className: "section-title", textContent: m.sectionErrorParameters }), pick)
    const timeHow = this.host.sighting.provenance.at("time")?.how
    const rows = document.createElement("div")
    rows.className = "parameter-rows"
    for (const parameter of this.model.parameters(c, timeHow)) {
      const row = document.createElement("div")
      row.className = "parameter-row"
      let text = m.parameters[parameter.note]
      for (const [name, figure] of Object.entries(parameter.params ?? {})) text = text.replaceAll(`{${name}}`, this.number(WitnessError.rounded(figure)))
      const status = Object.assign(document.createElement("span"), { className: "lead-status", textContent: m.status[parameter.status] })
      status.dataset.status = parameter.status
      const law = document.createElement("span")
      law.append(text, Object.assign(document.createElement("span"), { className: "scope", textContent: ` · ${m.parameterScopes[parameter.id]}` }))
      row.append(Object.assign(document.createElement("strong"), { textContent: m.parameterNames[parameter.id] }), law, status)
      rows.append(row)
    }
    const nodes: Node[] = [head, Object.assign(document.createElement("p"), { className: "section-intro", textContent: m.parametersIntro }), rows]
    if (this.daylight()) nodes.push(Object.assign(document.createElement("p"), { className: "extrapolation", textContent: m.extrapolation }))
    section.replaceChildren(...nodes)
  }

  /** Whether the Sun was up at the sighting: the laws were measured at night. */
  private daylight(): boolean {
    const event = this.host.sighting.event
    const place = event.place?.[0]
    if (!place || !event.time) return false
    const date = sightingTimeToDate(event.time, place.lng, event.utcOffsetHours)
    return date !== undefined && computeBodyPosition("Sun", date, { lat: place.lat, lng: place.lng, elevationM: 0 }).altitudeDeg > 0
  }
}
