import type { CaseJson } from "../engine/persistence/caseJson.js"
import type { SightingRecordingJson } from "../engine/persistence/sightingJson.js"
import type { SaidText } from "../engine/model/SaidText.js"
import type { CaseSweep, JudgeSummary, ReadingReplay } from "../engine/scenario/ScenarioSweep.js"
import type { Scenario } from "../engine/scenario/UncertainConditions.js"
import type { WindSource } from "../engine/scenario/WindProfiles.js"
import { HostLocale, selectLocale } from "../i18n/locale.js"
import { HintElement } from "./HintElement.js"
import { ScenarioSweepWords } from "./ScenarioSweepWords.js"
import type { ScenarioSweepMessages } from "./messages/ScenarioSweepMessages.js"
import { SCENARIO_SWEEP_MESSAGES, UFO_SUPPORTED_LANGUAGES, type UfoLanguage } from "./messages/index.js"

/** What the panel sweeps and where it puts what is kept: the case's editor. */
export interface ScenarioSweepHost {
  /** The case as it stands. */
  caseJson(): CaseJson
  /** A recording of the case, by its address as the case lists it. */
  load(url: string): Promise<SightingRecordingJson>
  /** Adds the readings kept, each as a reading of the account the reading it was played from reads; says how many were added. */
  keep(readings: { recording: SightingRecordingJson, title: SaidText, readingUrl: string }[]): number
}

/**
 * The sweep of a case's uncertain place and date, in its editor (see ScenarioSweep, docs/uncertain-conditions.md): a button plays every
 * reading over every scenario the case's candidates give, the verdict of each is shown with how it moved from the verdict as written and
 * the scenarios it was played in, the telling ones ticked; those ticked are added to the case as readings when asked. The alerts of the
 * sky follow.
 *
 * Shown only for a case that states uncertain conditions. The sweep's code, and the archive of the wind, are fetched when it is run.
 */
export class ScenarioSweepElement extends HTMLElement {
  static readonly TAG = "rr0-scenario-sweep"

  private static readonly CSS = `
:host { display: block; font-size: 13px; line-height: 1.4; margin-top: 14px; }
:host([hidden]) { display: none; }
summary { cursor: pointer; list-style-position: inside; font: 600 12px/1.4 var(--rr0-sans, system-ui, sans-serif); letter-spacing: .08em; text-transform: uppercase; opacity: .8; }
p { margin: 6px 0; }
.actions { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; margin: 8px 0; }
button.pill { min-height: 32px; padding: 0 14px; border: 1px solid currentColor; border-radius: 999px; background: none; color: inherit; font: inherit; cursor: pointer; }
button.pill:disabled { opacity: .5; cursor: default; }
h4 { margin: 12px 0 4px; font: 600 14px/1.3 var(--rr0-serif, Georgia, serif); }
.reading { margin: 4px 0 8px; padding: 6px 10px; border-left: 3px solid color-mix(in srgb, currentColor 25%, transparent); }
.reading[data-robustness="robust-plausible"] { border-color: var(--ok, #2e8b3e); }
.reading[data-robustness="robust-exclusion"] { border-color: var(--error, #c0392b); }
.reading[data-robustness="conditional"] { border-color: var(--warn, #d9822b); }
.verdict { font-weight: 600; }
.scroll { overflow-x: auto; }
table { border-collapse: collapse; width: 100%; min-width: 34em; margin-top: 4px; }
th, td { padding: 2px 6px; border-bottom: 1px solid color-mix(in srgb, currentColor 12%, transparent); text-align: left; vertical-align: top; }
th { font-weight: 600; opacity: .75; white-space: nowrap; }
td.number { white-space: nowrap; font-variant-numeric: tabular-nums; }
tr[data-plausible="false"] td { opacity: .7; }
ul.alerts { margin: 4px 0; padding-left: 18px; }
.note { opacity: .75; }
${HintElement.CSS}
`

  private messages?: ScenarioSweepMessages
  private language: UfoLanguage = "en"
  private host?: ScenarioSweepHost
  private result?: CaseSweep
  private state: "idle" | "running" | "done" | "failed" = "idle"
  private progress = { done: 0, total: 0 }
  private error?: string
  private note?: string
  private opened = false
  /** The scenarios ticked, by reading and scenario id. */
  private readonly ticked = new Set<string>()
  /** The wind archive of the last sweep, kept for the readings it writes. */
  private wind?: WindSource

  static register(): void {
    if (!customElements.get(ScenarioSweepElement.TAG)) customElements.define(ScenarioSweepElement.TAG, ScenarioSweepElement)
  }

  constructor() {
    super()
    this.attachShadow({ mode: "open" })
  }

  connectedCallback(): void {
    if (!this.messages) void this.loadLocale()
  }

  /** The case to sweep. Its last results are kept until it is swept again. */
  show(host: ScenarioSweepHost): void {
    this.host = host
    this.draw()
  }

  private async loadLocale(): Promise<void> {
    const language = selectLocale(HostLocale.preferencesFor(this), UFO_SUPPORTED_LANGUAGES) as UfoLanguage
    this.messages = await SCENARIO_SWEEP_MESSAGES.load(language)
    this.language = language
    this.draw()
  }

  private words(m: ScenarioSweepMessages, language: string = this.language): ScenarioSweepWords {
    const candidates = new Map((this.host?.caseJson().conditions?.places?.candidates ?? []).map(candidate => [candidate.id, candidate.place.name ?? candidate.id]))
    return new ScenarioSweepWords(m, id => id === "own" ? m.ownPlace : candidates.get(id) ?? id, language)
  }

  /** Plays every scenario: the code of the sweep and of the kinds of interpretation is fetched then. */
  private async run(): Promise<void> {
    const host = this.host
    if (!host || this.state === "running") return
    this.state = "running"
    this.progress = { done: 0, total: 0 }
    this.draw()
    try {
      const [{ ScenarioSweep }, { OpenMeteoWindProfiles }, { TleArchive }, { visibleMagnitudeLimit }, { InterpretationKinds }, { INTERPRETATION_SOURCES }] = await Promise.all([
        import("../engine/scenario/ScenarioSweep.js"), import("../engine/scenario/WindProfiles.js"), import("../engine/astronomy/TleArchive.js"),
        import("../render3d/skyColors.js"), import("../modules/interpretations/InterpretationKind.js"), import("../modules/interpretations/interpretationSources.js")
      ])
      const kept = new Map<string, string>()
      const wind = new OpenMeteoWindProfiles({ cache: { get: async key => kept.get(key), set: async (key, text) => { kept.set(key, text) } } })
      this.wind = wind
      const tle = new TleArchive()
      const m = this.messages!
      const sweeper = new ScenarioSweep({
        wind, load: url => host.load(url), limitAt: sun => visibleMagnitudeLimit(sun),
        kinds: INTERPRETATION_SOURCES.map(source => InterpretationKinds.of(source)),
        satellites: async date => (await tle.at(date))?.objects,
        names: id => (m.bodies as Record<string, string>)[id]
      })
      let shown = 0
      this.result = await sweeper.sweep(host.caseJson(), {
        progress: (done, total) => {
          this.progress = { done, total }
          if (done === total || performance.now() - shown > 250) {
            shown = performance.now()
            this.draw()
          }
        }
      })
      this.ticked.clear()
      for (const account of this.result.accounts) for (const reading of account.readings) for (const scenario of reading.kept) this.ticked.add(this.key(reading, scenario))
      this.state = "done"
      this.note = undefined
    }
    catch (error) {
      this.state = "failed"
      this.error = (error as Error).message
    }
    this.draw()
  }

  private key(reading: ReadingReplay, scenario: Scenario): string {
    return `${reading.url}|${scenario.id}`
  }

  /** Writes the scenarios ticked as readings, titled in every language, and gives them to the case. */
  private async keepTicked(): Promise<void> {
    const host = this.host, result = this.result
    if (!host || !result) return
    const [{ ScenarioReadings }, { InterpretationKinds }, { INTERPRETATION_SOURCES }] = await Promise.all([
      import("../engine/scenario/ScenarioReadings.js"), import("../modules/interpretations/InterpretationKind.js"), import("../modules/interpretations/interpretationSources.js")
    ])
    const kinds = INTERPRETATION_SOURCES.map(source => InterpretationKinds.of(source))
    const languages = await Promise.all(UFO_SUPPORTED_LANGUAGES.map(async language => ({ language, m: await SCENARIO_SWEEP_MESSAGES.load(language as UfoLanguage) })))
    const json = host.caseJson()
    const readings: { recording: SightingRecordingJson, title: SaidText, readingUrl: string }[] = []
    for (const account of result.accounts) {
      for (const reading of account.readings) {
        const event = json.events?.find(e => e.url === reading.url)
        const readingJson = await host.load(reading.url)
        for (const outcome of reading.outcomes) {
          if (!this.ticked.has(this.key(reading, outcome.scenario))) continue
          const scenario = outcome.scenario
          const profile = reading.depends.includes("wind") && this.wind ? await this.wind.profile(scenario.lat, scenario.lng, scenario.date) : undefined
          const base = (event?.title ?? readingJson.interpretation?.title) as SaidText | undefined
          const title = Object.fromEntries(languages.map(({ language, m }) => {
            const text = typeof base === "string" ? base : (base as Record<string, string> | undefined)?.[language] ?? (base as Record<string, string> | undefined)?.en ?? reading.url
            const words = this.words(m, language)
            const place = scenario.ownPlace ? m.ownPlace : json.conditions?.places?.candidates?.find(candidate => candidate.id === scenario.placeId)?.place.name ?? scenario.placeId
            return [language, m.scenarioTitle.replace("{title}", text).replace("{place}", place).replace("{date}", words.instant(scenario.local))]
          })) as SaidText
          const candidate = json.conditions?.places?.candidates?.find(c => c.id === scenario.placeId)
          const recording = ScenarioReadings.recording(readingJson, reading.url, scenario, profile, kinds, {
            title, verdict: reading.verdict.robustness,
            ...(candidate?.rationale ? { placeRationale: candidate.rationale } : {}),
            ...(json.conditions?.time?.rationale ? { timeRationale: json.conditions.time.rationale } : {})
          })
          readings.push({ recording, title, readingUrl: reading.url })
        }
      }
    }
    const added = host.keep(readings)
    this.note = this.messages!.kept.replace("{n}", String(added))
    this.draw()
  }

  private draw(): void {
    const m = this.messages
    const conditions = this.host?.caseJson().conditions
    this.hidden = !conditions
    if (!m || !conditions) {
      this.shadowRoot!.replaceChildren()
      return
    }
    const style = document.createElement("style")
    style.textContent = ScenarioSweepElement.CSS
    const details = document.createElement("details")
    details.open = this.opened
    details.addEventListener("toggle", () => { this.opened = details.open })
    const summary = document.createElement("summary")
    summary.append(m.heading, HintElement.of(m.hint))
    const words = this.words(m)
    const places = conditions.places?.candidates?.length ?? 0
    const dates = conditions.time ? `${words.instant(conditions.time.from)} – ${words.instant(conditions.time.to)}` : "–"
    const open = Object.assign(document.createElement("p"), { textContent: m.open.replace("{places}", String(places)).replace("{dates}", dates) })
    const actions = document.createElement("div")
    actions.className = "actions"
    const run = Object.assign(document.createElement("button"), { type: "button", className: "pill", textContent: m.run, disabled: this.state === "running" })
    run.addEventListener("click", () => void this.run())
    actions.append(run)
    if (this.state === "running") actions.append(Object.assign(document.createElement("span"), { textContent: m.running.replace("{done}", String(this.progress.done)).replace("{total}", String(this.progress.total || "…")) }))
    if (this.state === "failed") actions.append(Object.assign(document.createElement("span"), { className: "note", textContent: m.failed.replace("{error}", this.error ?? "") }))
    details.append(summary, open, actions)
    if (this.result && this.state !== "running") details.append(...this.results(this.result, m, words))
    this.shadowRoot!.replaceChildren(style, details)
  }

  private results(result: CaseSweep, m: ScenarioSweepMessages, words: ScenarioSweepWords): Node[] {
    const nodes: Node[] = []
    const json = this.host!.caseJson()
    const said = (text: unknown) => typeof text === "string" ? text
      : typeof text === "object" && text !== null ? String((text as Record<string, string>)[this.language] ?? Object.values(text)[0] ?? "") : ""
    const titleOf = (url: string) => said(json.events?.find(e => e.url === url)?.title) || url
    const summaryOf = (s: JudgeSummary) => s.compared === 0 ? "–"
      : m.summary.replace("{agreed}", String(s.agreedDirection)).replace("{compared}", String(s.compared)).replace("{median}", s.medianDeg === undefined ? "–" : `${s.medianDeg.toFixed(1)}°`)
    for (const account of result.accounts) {
      if (account.readings.length === 0) continue
      nodes.push(Object.assign(document.createElement("h4"), { textContent: `${m.account}${m.colon}${said(account.title) || account.eventId || account.url}` }))
      for (const reading of account.readings) {
        const box = document.createElement("div")
        box.className = "reading"
        box.dataset.robustness = reading.verdict.robustness
        box.append(Object.assign(document.createElement("div"), { textContent: titleOf(reading.url) }),
          Object.assign(document.createElement("div"), { className: "verdict", textContent: words.sentence(reading.verdict) }))
        if (reading.depends.includes("wind")) box.append(Object.assign(document.createElement("div"), { className: "note", textContent: m.dependsWind }))
        if (!reading.verdict.independent) box.append(this.scenarioTable(reading, m, words, summaryOf))
        nodes.push(box)
      }
    }
    const alerts = document.createElement("ul")
    alerts.className = "alerts"
    const grouped = ScenarioSweepWords.grouped(result.alerts)
    for (const alert of grouped) alerts.append(Object.assign(document.createElement("li"), { textContent: `${words.alert(alert)}${m.colon}${alert.accounts.join(", ")}` }))
    nodes.push(Object.assign(document.createElement("h4"), { textContent: m.alertsHeading }), grouped.length > 0 ? alerts : Object.assign(document.createElement("p"), { textContent: m.noAlert }))
    const keep = document.createElement("div")
    keep.className = "actions"
    const button = Object.assign(document.createElement("button"), { type: "button", className: "pill", textContent: m.keep, disabled: this.ticked.size === 0 })
    button.addEventListener("click", () => void this.keepTicked())
    keep.append(button)
    if (this.note) keep.append(Object.assign(document.createElement("span"), { className: "note", textContent: this.note }))
    nodes.push(keep)
    return nodes
  }

  private scenarioTable(reading: ReadingReplay, m: ScenarioSweepMessages, words: ScenarioSweepWords, summaryOf: (s: JudgeSummary) => string): HTMLElement {
    const table = document.createElement("table")
    const head = table.createTHead().insertRow()
    for (const label of ["", m.scenario, m.said, m.drawn, m.wind]) head.append(Object.assign(document.createElement("th"), { scope: "col", textContent: label }))
    const body = table.createTBody()
    const written = body.insertRow()
    written.append(document.createElement("td"), Object.assign(document.createElement("td"), { textContent: m.asWritten }),
      Object.assign(document.createElement("td"), { className: "number", textContent: summaryOf(reading.asWritten.said) }),
      Object.assign(document.createElement("td"), { className: "number", textContent: summaryOf(reading.asWritten.drawn) }), document.createElement("td"))
    for (const outcome of reading.outcomes) {
      const row = body.insertRow()
      row.dataset.plausible = String(outcome.plausible)
      const tick = Object.assign(document.createElement("input"), { type: "checkbox", checked: this.ticked.has(this.key(reading, outcome.scenario)), disabled: !!outcome.error })
      tick.setAttribute("aria-label", words.scenario(outcome.scenario))
      tick.addEventListener("change", () => {
        const key = this.key(reading, outcome.scenario)
        if (tick.checked) this.ticked.add(key)
        else this.ticked.delete(key)
        this.draw()
      })
      const cell = document.createElement("td")
      cell.append(tick)
      const wind = outcome.groundWind ? m.windValue.replace("{toward}", String(Math.round(outcome.groundWind.towardDeg))).replace("{speed}", outcome.groundWind.speedMS.toFixed(1)) : ""
      row.append(cell, Object.assign(document.createElement("td"), { textContent: `${outcome.plausible ? "✓" : "✗"} ${words.scenario(outcome.scenario)}` }),
        Object.assign(document.createElement("td"), { className: "number", textContent: outcome.error ?? summaryOf(outcome.said) }),
        Object.assign(document.createElement("td"), { className: "number", textContent: outcome.error ? "" : summaryOf(outcome.drawn) }),
        Object.assign(document.createElement("td"), { className: "number", textContent: wind }))
    }
    const scroll = document.createElement("div")
    scroll.className = "scroll"
    scroll.append(table)
    return scroll
  }
}
