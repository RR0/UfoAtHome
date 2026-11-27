import { Hvs, type HvsHypothesisResult, type HvsResult, type HvsScore, type ReadingOutcomes } from "../engine/assessment/hvs/Hvs.js"
import { Iqi, type IqiRating } from "../engine/assessment/hvs/Iqi.js"
import type { CaseElementJson, HvsHypothesisJson } from "../engine/assessment/hvs/HvsJson.js"
import { SaidTexts, type SaidText } from "../engine/model/SaidText.js"
import { CaseFile, type CaseJson } from "../engine/persistence/caseJson.js"
import type { SightingRecordingJson } from "../engine/persistence/sightingJson.js"
import { HostLocale, selectLocale } from "../i18n/locale.js"
import { HintElement } from "./HintElement.js"
import { ReadingSensitivityElement } from "./ReadingSensitivityElement.js"
import type { HvsMessages } from "./messages/HvsMessages.js"
import { HVS_MESSAGES, UFO_SUPPORTED_LANGUAGES, type UfoLanguage } from "./messages/index.js"

/** What the HVS table is given of a case: the case itself, and how to load the recordings of its events when the table is unfolded. */
export interface HvsInput {
  caseJson: () => CaseJson
  /** The recording of the event of the case with this `id`, as written; undefined when it cannot be had. */
  recording: (eventId: string) => Promise<SightingRecordingJson | undefined>
}

/**
 * A case's hypotheses weighed by Stéphane Baron's HVS protocol (see Hvs): the rating of its file (IQI), its elements and which hypothesis
 * explains each, then each hypothesis's coverage, plausibility and score with their envelopes.
 *
 * Shown for a case that lists elements or hypotheses, under its readings compared, folded until it is asked for: the recordings of the
 * accounts and the readings are loaded then (a direction or a size a reading reconstructs is settled by its confrontation with the account).
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
.iqi { display: flex; flex-wrap: wrap; gap: 4px 14px; margin: 0; padding: 0; list-style: none; }
.iqi [data-suggested] .level { font-style: italic; }
.iqi .level { opacity: .85; }
.note { margin: 6px 0 0; opacity: .8; }
.note.warn { color: var(--warn, #d9822b); opacity: 1; }
.credit { margin: 8px 0 0; font-size: 12px; opacity: .7; }
.credit a { color: inherit; }
${HintElement.CSS}
`

  private messages?: HvsMessages
  private language: UfoLanguage = "en"
  private said = new SaidTexts(["en"])
  private input?: HvsInput
  private opened = false
  /** What the confrontation of each reading found, by its event's id, once loaded. */
  private outcomes?: Map<string, ReadingOutcomes>
  private accounts?: SightingRecordingJson[]
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

  /** The case to weigh. Called again when the case changes: what was loaded is loaded again when the table is open. */
  show(input: HvsInput): void {
    this.input = input
    this.outcomes = undefined
    this.accounts = undefined
    this.draw()
    if (this.opened) void this.loadRecordings()
  }

  private async loadLocale(): Promise<void> {
    const preferences = HostLocale.preferencesFor(this)
    const language = selectLocale(preferences, UFO_SUPPORTED_LANGUAGES) as UfoLanguage
    this.messages = await HVS_MESSAGES.load(language)
    this.language = language
    this.said = new SaidTexts(preferences)
    this.draw()
  }

  /** The case's accounts, and the confrontation of every reading a hypothesis names with the account it reads. */
  private async loadRecordings(): Promise<void> {
    const input = this.input
    if (!input || this.outcomes || this.loading) return
    this.loading = true
    try {
      const json = input.caseJson()
      const events = json.events ?? []
      const accountEvents = events.filter(event => event.eventType === CaseFile.SIGHTING_EVENT && event.interpretationOf === undefined && event.id !== undefined)
      const accounts = await Promise.all(accountEvents.map(event => input.recording(event.id!)))
      const outcomes = new Map<string, ReadingOutcomes>()
      const readings = new Set((json.hvs?.hypotheses ?? []).flatMap(hypothesis => hypothesis.readings ?? []))
      for (const readingId of readings) {
        const accountId = HvsElement.accountOf(json, readingId)
        if (!accountId) continue
        const [account, reading] = await Promise.all([input.recording(accountId), input.recording(readingId)])
        if (!account || !reading) continue
        const result = ReadingSensitivityElement.resultOf(account, reading)
        if (result) outcomes.set(readingId, result.outcomes)
      }
      if (this.input !== input) return
      this.accounts = accounts.filter((account): account is SightingRecordingJson => account !== undefined)
      this.outcomes = outcomes
    } finally {
      this.loading = false
    }
    this.draw()
  }

  /** The `id` of the account event the reading event `readingId` reads: the first it names. */
  private static accountOf(json: CaseJson, readingId: string): string | undefined {
    const event = (json.events ?? []).find(candidate => candidate.id === readingId)
    return [event?.interpretationOf].flat()[0]
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
    summary.append(m.heading, HintElement.of(m.hint))
    details.append(summary)
    if (this.opened) details.append(...this.body(json, elements, hypotheses, m))
    this.shadowRoot!.replaceChildren(style, details)
  }

  private body(json: CaseJson, elements: CaseElementJson[], hypotheses: HvsHypothesisJson[], m: HvsMessages): HTMLElement[] {
    if (!this.outcomes) return [this.paragraph(m.loading, "note")]
    const accountIds = (json.events ?? []).filter(event => event.eventType === CaseFile.SIGHTING_EVENT && event.interpretationOf === undefined)
      .map(event => event.id).filter((id): id is string => id !== undefined)
    const result = Hvs.of(elements, json.hvs, id => this.outcomes!.get(id), id => HvsElement.accountOf(json, id),
      accountIds.length === 1 ? accountIds[0] : undefined)
    const interviewed = (json.events ?? []).some(event => event.eventType === CaseFile.INTERVIEW_EVENT)
    const parts: HTMLElement[] = [this.heading(m.iqi.heading), this.iqiList(Iqi.of(json.hvs?.iqi, this.accounts ?? [], interviewed), m)]
    parts.push(this.heading(m.elements.heading))
    if (elements.length === 0) {
      parts.push(this.paragraph(m.noElements, "note"))
    } else {
      if (!json.elementsSealed) parts.push(this.paragraph(m.notSealed, "note warn"))
      parts.push(this.elementsTable(elements, hypotheses, result, m))
    }
    parts.push(this.heading(m.hypotheses.heading))
    parts.push(hypotheses.length === 0 ? this.paragraph(m.noHypotheses, "note") : this.hypothesesTable(hypotheses, result, m))
    const credit = document.createElement("p")
    credit.className = "credit"
    const link = document.createElement("a")
    link.href = HvsElement.PROTOCOL_URL
    link.target = "_blank"
    link.rel = "noopener"
    link.textContent = m.credit.replace("{protocol}", json.hvs?.protocol ?? "")
    credit.append(link, json.hvs?.taxonomy ? ` · ${m.taxonomy.replace("{taxonomy}", json.hvs.taxonomy)}` : "")
    parts.push(credit)
    return parts
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
        cell.title = explanation.by === "confrontation"
          ? explanation.explained ? e.explainedByReading : e.notExplainedByReading
          : explanation.explained ? e.explainedDeclared : e.notExplainedDeclared
      }
    }
    return this.scrolling(table)
  }

  private hypothesesTable(hypotheses: HvsHypothesisJson[], result: HvsResult, m: HvsMessages): HTMLElement {
    const h = m.hypotheses
    const table = document.createElement("table")
    const head = table.createTHead().insertRow()
    for (const label of [h.code, h.hypothesis, h.csRaw, h.csDiscriminating, h.ps, h.hvs, h.standing]) {
      const cell = document.createElement("th")
      cell.scope = "col"
      cell.textContent = label
      head.append(cell)
    }
    const body = table.createTBody()
    hypotheses.forEach((hypothesis, index) => {
      const found = result.hypotheses[index]
      const row = body.insertRow()
      if (found.dominant) row.dataset.dominant = ""
      row.insertCell().textContent = hypothesis.code ?? ""
      row.insertCell().textContent = this.titleOf(hypothesis)
      this.scoreCell(row, found.csRaw, m)
      this.scoreCell(row, found.csDiscriminating, m)
      const ps = this.scoreCell(row, found.ps, m)
      const notes = [
        ...(found.geometric ? [h.geometric] : []),
        ...(found.missing ? [h.missing.replace("{names}", found.missing.map(name => h.ratings[name as keyof typeof h.ratings] ?? name).join(", "))] : [])
      ]
      if (notes.length) ps.title = notes.join(" · ")
      this.scoreCell(row, found.hvs, m)
      row.insertCell().textContent = this.standingOf(found, m)
    })
    return this.scrolling(table)
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
    const words = [found.retained ? h.retained : h.notRetained]
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
