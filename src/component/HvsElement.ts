import { Hvs, type HvsHypothesisResult, type HvsReading, type HvsResult, type HvsScore } from "../engine/assessment/hvs/Hvs.js"
import { Iqi, type IqiRating } from "../engine/assessment/hvs/Iqi.js"
import type { CaseElementJson, HvsHypothesisJson } from "../engine/assessment/hvs/HvsJson.js"
import { SaidTexts, type SaidText } from "../engine/model/SaidText.js"
import { CaseFile, type CaseEventJson, type CaseJson } from "../engine/persistence/caseJson.js"
import type { SightingRecordingJson } from "../engine/persistence/sightingJson.js"
import { Provenance } from "../engine/persistence/Provenance.js"
import { HostLocale, selectLocale } from "../i18n/locale.js"
import { InterpretationKinds } from "../modules/interpretations/InterpretationKind.js"
import { InterpretationRegistry } from "../modules/interpretations/interpretationSources.js"
import { HintElement } from "./HintElement.js"
import { ReadingSensitivityElement } from "./ReadingSensitivityElement.js"
import type { HvsMessages } from "./messages/HvsMessages.js"
import { HVS_MESSAGES, UFO_SUPPORTED_LANGUAGES, type UfoLanguage } from "./messages/index.js"

/** What the HVS table is given of a case: the case, how to load the recordings of its events, and what it is shown for. */
export interface HvsInput {
  caseJson: () => CaseJson
  /** The recording of the event of the case with this `id`, as written; undefined when it cannot be had. */
  recording: (eventId: string) => Promise<SightingRecordingJson | undefined>
  /**
   * The `id` of the account event of the observation to evaluate. Absent, the table is the case's: one line per observation, what
   * dominates there, each opening that observation (see `open`).
   */
  account?: string
  /** Opens the observation of an account event, from the case's table. */
  open?: (account: string) => void
  /**
   * Chooses by hand the readings that test a hypothesis (undefined: back to those its phenomenon finds), in an editor: the table then
   * offers to. The host writes it in the case (see HvsHypothesisJson.readings) and shows the table again.
   */
  choose?: (hypothesis: string, readings: string[] | undefined) => void
}

/** A reading of the observation, as the table shows and weighs it. */
interface LoadedReading extends HvsReading {
  label: string
}

/**
 * A case's hypotheses weighed by Stéphane Baron's HVS protocol (see Hvs), for one observation: the rating of its account (IQI), its
 * elements and which hypothesis explains each, then each hypothesis's readings, coverage, plausibility and score with their envelopes.
 * Shown beside the candidates of the observation (see CandidatesView), which are Poher's: two ways of weighing the same hypotheses,
 * where the observation is. For the case as a whole, one line per observation.
 *
 * Folded until it is asked for: the recordings of the account and its readings are loaded then (a direction or a size a reading
 * reconstructs is settled by its confrontation with the account).
 */
export class HvsElement extends HTMLElement {
  static readonly TAG = "rr0-hvs"

  /** Where the protocol can be read: its version deposited on HAL. */
  static readonly PROTOCOL_URL = "https://hal.science/hal-05662047"

  private static readonly CSS = `
:host { display: block; font-size: 13px; line-height: 1.4; }
:host([hidden]) { display: none; }
summary { cursor: pointer; list-style-position: inside; font: 600 12px/1.4 var(--rr0-sans, system-ui, sans-serif); letter-spacing: .08em; text-transform: uppercase; opacity: .8; }
h4 { margin: 10px 0 4px; font-size: 12px; font-weight: 600; opacity: .8; }
.scroll { overflow-x: auto; }
table { border-collapse: collapse; width: 100%; }
th, td { padding: 4px 8px; border-bottom: 1px solid color-mix(in srgb, currentColor 15%, transparent); text-align: left; vertical-align: top; }
th { font-weight: 600; opacity: .75; white-space: nowrap; }
td.number, td.mark { text-align: center; white-space: nowrap; font-variant-numeric: tabular-nums; }
td.number { text-align: right; }
td.mark[data-explained="true"] { color: var(--ok, #2e8b3e); }
td.mark[data-explained="false"] { opacity: .6; }
td.mark[data-by="confrontation"] { font-weight: 700; }
tr[data-discriminating] td:first-child::after { content: " ◆"; font-size: 10px; opacity: .7; }
tr[data-counted="false"] { opacity: .55; }
tr[data-dominant] td { font-weight: 600; }
td.readings { min-width: 8em; }
td.readings .how { opacity: .65; font-size: 12px; }
.iqi { display: flex; flex-wrap: wrap; gap: 4px 14px; margin: 0; padding: 0; list-style: none; }
.iqi [data-suggested] .level { font-style: italic; }
.iqi .level { opacity: .85; }
.note { margin: 6px 0 0; opacity: .8; }
.note.warn { color: var(--warn, #d9822b); opacity: 1; }
.credit { margin: 8px 0 0; font-size: 12px; opacity: .7; }
.credit a { color: inherit; }
button.link { padding: 0; border: 0; background: none; color: inherit; font: inherit; text-align: left; text-decoration: underline; text-underline-offset: 2px; cursor: pointer; }
.choose { position: relative; display: inline-block; margin-top: 2px; }
.choose [popover] { margin: 0; padding: 8px 10px; border: 1px solid color-mix(in srgb, currentColor 25%, transparent); border-radius: 6px; background: Canvas; color: CanvasText; font: inherit; }
.choose label { display: block; white-space: nowrap; }
.choose .actions { margin-top: 6px; display: flex; gap: 8px; }
${HintElement.CSS}
`

  private messages?: HvsMessages
  private language: UfoLanguage = "en"
  private said = new SaidTexts(["en"])
  private input?: HvsInput
  private opened = false
  /** The observation's account and readings, once loaded, by the account's event id. */
  private loaded = new Map<string, { account?: SightingRecordingJson, readings: LoadedReading[] }>()
  private loading = false

  static register(): void {
    if (!customElements.get(HvsElement.TAG)) customElements.define(HvsElement.TAG, HvsElement)
  }

  constructor() {
    super()
    this.attachShadow({ mode: "open" })
  }

  connectedCallback(): void {
    if (!this.messages) void this.loadLocale()
  }

  /** What to weigh. Called again when the case changes: what was loaded is loaded again when the table is open. */
  show(input: HvsInput | undefined): void {
    this.input = input
    this.loaded.clear()
    this.draw()
    if (this.opened) void this.loadRecordings()
  }

  /** Draws the table again from what is loaded: after the case's text changed (a choice of readings, say), with nothing to load anew. */
  redraw(): void {
    this.draw()
  }

  private async loadLocale(): Promise<void> {
    const preferences = HostLocale.preferencesFor(this)
    const language = selectLocale(preferences, UFO_SUPPORTED_LANGUAGES) as UfoLanguage
    this.messages = await HVS_MESSAGES.load(language)
    this.language = language
    this.said = new SaidTexts(preferences)
    this.draw()
  }

  /** The accounts of the case that have an id: what an observation is named by. */
  private static accounts(json: CaseJson): CaseEventJson[] {
    return (json.events ?? []).filter(event => event.eventType === CaseFile.SIGHTING_EVENT && event.interpretationOf === undefined && event.id !== undefined)
  }

  /** The reading events of the case that read the account `account`. */
  private static readingEvents(json: CaseJson, account: string): CaseEventJson[] {
    return (json.events ?? []).filter(event => event.eventType === CaseFile.SIGHTING_EVENT && event.id !== undefined
      && [event.interpretationOf].flat().includes(account))
  }

  /** The account and the readings of each observation shown, each reading with its phenomena and the confrontation it was put to. */
  private async loadRecordings(): Promise<void> {
    const input = this.input
    if (!input || this.loading || this.loaded.size > 0) return
    this.loading = true
    try {
      const json = input.caseJson()
      const accounts = input.account !== undefined ? [input.account] : HvsElement.accounts(json).map(event => event.id!)
      const kinds = InterpretationRegistry.kinds()
      for (const id of accounts) {
        const account = await input.recording(id)
        const readings: LoadedReading[] = []
        for (const event of HvsElement.readingEvents(json, id)) {
          const recording = await input.recording(event.id!)
          if (!recording) continue
          // With the bodies its kinds compute (lanterns, balloons, drones…), from its plain values: a reading of them states none of its
          // own to confront.
          const interpretation = Provenance.strip(recording).recording.interpretation
          await InterpretationKinds.load(interpretation, kinds)
          const expanded = InterpretationKinds.expand(interpretation, kinds)
          const result = account ? ReadingSensitivityElement.resultOf(account, InterpretationKinds.computes(interpretation, kinds) ? { ...recording, interpretation: expanded } : recording) : undefined
          readings.push({
            id: event.id!,
            label: this.said.read(event.title as SaidText | undefined) ?? event.id!,
            phenomena: InterpretationKinds.phenomena(interpretation, kinds),
            ...(result ? { outcomes: result.outcomes } : {})
          })
        }
        if (this.input !== input) return
        this.loaded.set(id, { ...(account ? { account } : {}), readings })
      }
    } finally {
      this.loading = false
    }
    this.draw()
  }

  private draw(): void {
    const m = this.messages
    const json = this.input?.caseJson()
    const elements = json?.elements ?? []
    const hypotheses = json?.hvs?.hypotheses ?? []
    this.hidden = !json || (elements.length === 0 && hypotheses.length === 0)
    if (!m || !json || this.hidden) {
      this.shadowRoot!.replaceChildren()
      return
    }
    const style = document.createElement("style")
    style.textContent = HvsElement.CSS
    const details = document.createElement("details")
    details.open = this.opened
    details.addEventListener("toggle", () => {
      this.opened = details.open
      if (details.open) void this.loadRecordings()
    })
    const summary = document.createElement("summary")
    summary.append(m.heading, HintElement.of(this.input?.account === undefined ? m.hintCase : m.hint))
    details.append(summary)
    if (this.opened) {
      const ready = this.loaded.size > 0
      details.append(...(!ready ? [this.paragraph(m.loading, "note")]
        : this.input!.account !== undefined ? this.observation(json, this.input!.account, m) : this.caseLines(json, m)))
      details.append(this.credit(json, m))
    }
    this.shadowRoot!.replaceChildren(style, details)
  }

  /** The weighing of the hypotheses against the observation `account`. */
  private resultOf(json: CaseJson, account: string): HvsResult {
    const single = HvsElement.accounts(json).length <= 1
    return Hvs.of(json.elements ?? [], json.hvs, account, this.loaded.get(account)?.readings ?? [], single)
  }

  /** One observation: its IQI, its elements and which hypothesis explains each, and the hypotheses weighed. */
  private observation(json: CaseJson, account: string, m: HvsMessages): HTMLElement[] {
    const single = HvsElement.accounts(json).length <= 1
    const elements = Hvs.elementsOf(json.elements ?? [], account, single)
    const hypotheses = json.hvs?.hypotheses ?? []
    const result = this.resultOf(json, account)
    const loaded = this.loaded.get(account)
    const interviewed = (json.events ?? []).some(event => event.eventType === CaseFile.INTERVIEW_EVENT && [event.interviewOf].flat().includes(account))
    const parts: HTMLElement[] = [this.heading(m.iqi.heading),
      this.iqiList(Iqi.of(json.hvs?.observations?.[account]?.iqi, loaded?.account ? [loaded.account] : [], interviewed), m)]
    parts.push(this.heading(m.elements.heading))
    if (elements.length === 0) {
      parts.push(this.paragraph(m.noElements, "note"))
    } else {
      if (!json.elementsSealed) parts.push(this.paragraph(m.notSealed, "note warn"))
      parts.push(this.elementsTable(elements, hypotheses, result, m))
    }
    const unassigned = Hvs.unassigned(json.elements ?? [], single)
    if (unassigned.length > 0) parts.push(this.paragraph(m.unassigned.replace("{ids}", unassigned.map(element => element.id).join(", ")), "note warn"))
    parts.push(this.heading(m.hypotheses.heading))
    parts.push(hypotheses.length === 0 ? this.paragraph(m.noHypotheses, "note") : this.hypothesesTable(hypotheses, result, loaded?.readings ?? [], m))
    return parts
  }

  /** The case: one line per observation, what dominates there and its score, each opening the observation. */
  private caseLines(json: CaseJson, m: HvsMessages): HTMLElement[] {
    const hypotheses = json.hvs?.hypotheses ?? []
    const list = document.createElement("ul")
    list.className = "observations"
    for (const event of HvsElement.accounts(json)) {
      const result = this.resultOf(json, event.id!)
      const item = document.createElement("li")
      const name = this.said.read(event.title as SaidText | undefined) ?? event.id!
      if (this.input?.open) {
        const link = document.createElement("button")
        link.type = "button"
        link.className = "link"
        link.textContent = name
        link.addEventListener("click", () => this.input?.open?.(event.id!))
        item.append(link)
      } else {
        item.append(name)
      }
      const dominant = result.hypotheses.find(found => found.dominant)
      const hypothesis = dominant ? hypotheses.find(candidate => candidate.id === dominant.id) : undefined
      const number = new Intl.NumberFormat(this.language, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
      const verdict = !dominant || !hypothesis ? m.caseLine.none
        : m.caseLine.dominant.replace("{hypothesis}", hypothesis.code ? `${hypothesis.code} ${this.titleOf(hypothesis)}` : this.titleOf(hypothesis))
          .replace("{hvs}", dominant.hvs ? number.format(dominant.hvs.preferred) : "–")
      const [before, after = ""] = m.caseLine.item.replace("{verdict}", verdict).split("{observation}")
      const named = item.firstChild!
      item.replaceChildren(before, named, after)
      list.append(item)
    }
    return [this.paragraph(m.caseLine.intro, "note"), list]
  }

  private credit(json: CaseJson, m: HvsMessages): HTMLElement {
    const credit = document.createElement("p")
    credit.className = "credit"
    const link = document.createElement("a")
    link.href = HvsElement.PROTOCOL_URL
    link.target = "_blank"
    link.rel = "noopener"
    link.textContent = m.credit.replace("{protocol}", json.hvs?.protocol ?? "")
    credit.append(link, json.hvs?.taxonomy ? ` · ${m.taxonomy.replace("{taxonomy}", json.hvs.taxonomy)}` : "")
    return credit
  }

  private iqiList(ratings: IqiRating[], m: HvsMessages): HTMLElement {
    const list = document.createElement("ul")
    list.className = "iqi"
    for (const rating of ratings) {
      const item = document.createElement("li")
      const level = document.createElement("span")
      level.className = "level"
      level.textContent = rating.level ? m.iqi.levels[rating.level] : m.iqi.unrated
      if (rating.suggested) {
        item.dataset.suggested = ""
        level.title = m.iqi.suggested
      }
      const [before, after = ""] = m.iqi.item.replace("{group}", m.iqi.groups[rating.group]).split("{level}")
      item.append(before, level, after)
      list.append(item)
    }
    const total = Iqi.total(ratings)
    if (total.of > 0) {
      const item = document.createElement("li")
      const number = new Intl.NumberFormat(this.language, { maximumFractionDigits: 1 })
      item.textContent = `IQI ${m.iqi.total.replace("{sum}", number.format(total.sum)).replace("{of}", String(total.of))}`
      list.append(item)
    }
    return list
  }

  private elementsTable(elements: CaseElementJson[], hypotheses: HvsHypothesisJson[], result: HvsResult, m: HvsMessages): HTMLElement {
    const e = m.elements
    const table = document.createElement("table")
    const head = table.createTHead().insertRow()
    for (const label of [e.id, e.element, e.status, ...hypotheses.map(hypothesis => hypothesis.code ?? this.titleOf(hypothesis))]) {
      const cell = document.createElement("th")
      cell.scope = "col"
      cell.textContent = label
      head.append(cell)
    }
    const body = table.createTBody()
    for (const element of elements) {
      const row = body.insertRow()
      const counted = result.counted.includes(element.id)
      row.dataset.counted = String(counted)
      if (result.discriminating.includes(element.id)) {
        row.dataset.discriminating = ""
        row.title = e.discriminating
      }
      row.insertCell().textContent = element.id
      row.insertCell().textContent = this.said.read(element.title) ?? ""
      row.insertCell().textContent = e.statuses[element.status]
      for (const found of result.hypotheses) {
        const cell = row.insertCell()
        cell.className = "mark"
        const explanation = found.explanations[element.id]
        if (!explanation) continue
        cell.dataset.explained = String(explanation.explained)
        cell.dataset.by = explanation.by
        cell.textContent = explanation.explained ? "✓" : "✗"
        const how = explanation.by === "confrontation"
          ? explanation.explained ? e.explainedByReading : e.notExplainedByReading
          : explanation.explained ? e.explainedDeclared : e.notExplainedDeclared
        cell.title = explanation.readings ? `${how} · ${e.variants.replace("{n}", String(explanation.readings))}` : how
      }
    }
    return this.scrolling(table)
  }

  private hypothesesTable(hypotheses: HvsHypothesisJson[], result: HvsResult, readings: LoadedReading[], m: HvsMessages): HTMLElement {
    const h = m.hypotheses
    const table = document.createElement("table")
    const head = table.createTHead().insertRow()
    for (const label of [h.code, h.hypothesis, h.readings, h.csRaw, h.csDiscriminating, h.ps, h.hvs, h.standing]) {
      const cell = document.createElement("th")
      cell.scope = "col"
      cell.textContent = label
      if (label === h.standing) cell.title = h.admissibleHint
      head.append(cell)
    }
    const body = table.createTBody()
    hypotheses.forEach((hypothesis, index) => {
      const found = result.hypotheses[index]
      const row = body.insertRow()
      if (found.dominant) row.dataset.dominant = ""
      row.insertCell().textContent = hypothesis.code ?? ""
      row.insertCell().textContent = this.titleOf(hypothesis)
      this.readingsCell(row.insertCell(), hypothesis, found, readings, m)
      this.scoreCell(row, found.csRaw, m)
      this.scoreCell(row, found.csDiscriminating, m)
      const ps = this.scoreCell(row, found.ps, m)
      const notes = [
        ...(found.geometric ? [h.geometric] : []),
        ...(found.missing ? [h.missing.replace("{names}", found.missing.map(name => h.ratings[name as keyof typeof h.ratings] ?? name).join(", "))] : [])
      ]
      if (notes.length) ps.title = notes.join(" · ")
      this.scoreCell(row, found.hvs, m)
      const standing = row.insertCell()
      standing.textContent = this.standingOf(found, m)
      standing.title = h.admissibleHint
    })
    return this.scrolling(table)
  }

  /** The readings that test a hypothesis there, how they were found, and, in an editor, the way to choose them. */
  private readingsCell(cell: HTMLTableCellElement, hypothesis: HvsHypothesisJson, found: HvsHypothesisResult, readings: LoadedReading[], m: HvsMessages): void {
    const h = m.hypotheses
    cell.className = "readings"
    const names = found.readings.map(id => readings.find(reading => reading.id === id)?.label ?? id)
    cell.append(names.length > 0 ? names.join(", ") : h.noReading)
    const how = document.createElement("div")
    how.className = "how"
    const phenomena = [hypothesis.phenomenon ?? []].flat()
    how.textContent = found.linkedBy === "chosen" ? h.chosen : phenomena.length > 0 ? h.byPhenomenon.replace("{phenomenon}", phenomena.join(" + ")) : h.noPhenomenon
    cell.append(how)
    const choose = this.input?.choose
    if (!choose || readings.length === 0) return
    const wrap = document.createElement("span")
    wrap.className = "choose"
    const button = document.createElement("button")
    button.type = "button"
    button.className = "link"
    button.textContent = h.choose
    const popover = document.createElement("div")
    popover.popover = "auto"
    const boxes = readings.map(reading => {
      const label = document.createElement("label")
      const box = document.createElement("input")
      box.type = "checkbox"
      box.value = reading.id
      box.checked = found.readings.includes(reading.id)
      label.append(box, " ", reading.label)
      popover.append(label)
      return box
    })
    const actions = document.createElement("div")
    actions.className = "actions"
    const keep = document.createElement("button")
    keep.type = "button"
    keep.textContent = h.keepChoice
    keep.addEventListener("click", () => {
      popover.hidePopover()
      choose(hypothesis.id, boxes.filter(box => box.checked).map(box => box.value))
    })
    actions.append(keep)
    if (hypothesis.readings !== undefined) {
      const automatic = document.createElement("button")
      automatic.type = "button"
      automatic.textContent = h.automatic
      automatic.addEventListener("click", () => {
        popover.hidePopover()
        choose(hypothesis.id, undefined)
      })
      actions.append(automatic)
    }
    popover.append(actions)
    button.addEventListener("click", () => popover.togglePopover())
    wrap.append(button, popover)
    cell.append(wrap)
  }

  private scoreCell(row: HTMLTableRowElement, score: HvsScore | undefined, m: HvsMessages): HTMLTableCellElement {
    const cell = row.insertCell()
    cell.className = "number"
    if (!score) {
      cell.textContent = "–"
      return cell
    }
    const number = new Intl.NumberFormat(this.language, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    const [low, high] = score.envelope
    cell.textContent = low === high && low === score.preferred ? number.format(score.preferred)
      : m.hypotheses.score.replace("{preferred}", number.format(score.preferred)).replace("{low}", number.format(low)).replace("{high}", number.format(high))
    return cell
  }

  private standingOf(found: HvsHypothesisResult, m: HvsMessages): string {
    const h = m.hypotheses
    const words = [found.admissible ? h.admissible : h.notAdmissible]
    if (found.dominant) words.push(h.dominant)
    if (found.milestone) words.push(h[found.milestone])
    return words.join(", ")
  }

  private titleOf(hypothesis: HvsHypothesisJson): string {
    return this.said.read(hypothesis.title as SaidText | undefined) ?? hypothesis.id
  }

  private heading(text: string): HTMLElement {
    const heading = document.createElement("h4")
    heading.textContent = text
    return heading
  }

  private paragraph(text: string, className: string): HTMLElement {
    const paragraph = document.createElement("p")
    paragraph.className = className
    paragraph.textContent = text
    return paragraph
  }

  private scrolling(table: HTMLTableElement): HTMLElement {
    const scroll = document.createElement("div")
    scroll.className = "scroll"
    scroll.append(table)
    return scroll
  }
}
