import { ReadingSensitivity, type KnobMargin, type ReadingSensitivityResult, type SensitivityKnob } from "../engine/interpretation/ReadingSensitivity.js"
import type { BodyJson } from "../engine/interpretation/Interpretation.js"
import { SaidTexts } from "../engine/model/SaidText.js"
import type { Sighting } from "../engine/model/Sighting.js"
import { Provenance } from "../engine/persistence/Provenance.js"
import { fromSightingJson, type SightingRecordingJson } from "../engine/persistence/sightingJson.js"
import { HostLocale, selectLocale } from "../i18n/locale.js"
import { HintElement } from "./HintElement.js"
import type { ReadingSensitivityMessages } from "./messages/ReadingSensitivityMessages.js"
import { READING_SENSITIVITY_MESSAGES, UFO_SUPPORTED_LANGUAGES, type UfoLanguage } from "./messages/index.js"

/**
 * How much a reading's likeness to the account it reads owes to what it supposed (see ReadingSensitivity): one line saying how much of
 * the account it reproduces and what that is the most tied to, and, unfolded, how far each value it supposed can be moved.
 *
 * One element for the case's player and its editor alike, which show a reading each in their own way and say this the same: the duality of
 * reader and editor is kept by the components that hold it, not by writing it twice (see CaseElement, CaseEditorElement).
 *
 * Given its two recordings by {@link show}; nothing at all for a reading that places no body, since there is nothing to move.
 */
export class ReadingSensitivityElement extends HTMLElement {
  static readonly TAG = "rr0-reading-sensitivity"

  private static readonly CSS = `
:host { display: block; font-size: 13px; line-height: 1.4; color: var(--ink-dim, inherit); }
:host([hidden]) { display: none; }
details > summary { cursor: pointer; list-style-position: inside; }
.heading { font-weight: 700; color: var(--ink, inherit); }
ul { margin: 3px 0 0; padding: 0 0 0 1.2em; display: grid; gap: 2px; }
li[data-tight] { color: var(--warn, #d9822b); }
.better { margin: 3px 0 0; color: var(--warn, #d9822b); }
${HintElement.CSS}
`

  /** The accounts as models, once for each recording: a recording of several megabytes is not read again at every drawing of a card. */
  private static readonly models = new WeakMap<SightingRecordingJson, Sighting>()
  /** What was found, by reading: a card is drawn again at every change of the list, and the reading is the same. */
  private static readonly found = new WeakMap<SightingRecordingJson, { account: SightingRecordingJson, result: ReadingSensitivityResult }>()

  private messages?: ReadingSensitivityMessages
  private language: UfoLanguage = "en"
  private said = new SaidTexts(["en"])
  private shown?: { account: SightingRecordingJson, reading: SightingRecordingJson }
  private loading?: Promise<void>

  static register(): void {
    if (!customElements.get(ReadingSensitivityElement.TAG)) customElements.define(ReadingSensitivityElement.TAG, ReadingSensitivityElement)
  }

  static create(): ReadingSensitivityElement {
    ReadingSensitivityElement.register()
    return document.createElement(ReadingSensitivityElement.TAG) as ReadingSensitivityElement
  }

  constructor() {
    super()
    // Hidden by draw(), not here: an element made by createElement may not have attributes yet.
    this.attachShadow({ mode: "open" })
  }

  connectedCallback(): void {
    this.loading ??= this.loadLocale()
  }

  /** Sets `reading` against `account`, and says what comes of it. */
  show(account: SightingRecordingJson | undefined, reading: SightingRecordingJson | undefined): void {
    this.shown = account && reading ? { account, reading } : undefined
    this.draw()
  }

  /** What `reading` comes to against `account`: undefined for a reading that places no body. */
  static resultOf(account: SightingRecordingJson, reading: SightingRecordingJson): ReadingSensitivityResult | undefined {
    const known = ReadingSensitivityElement.found.get(reading)
    if (known?.account === account) return known.result
    const { recording, provenance } = Provenance.strip(reading)
    const bodies = recording.interpretation?.bodies ?? []
    if (bodies.length === 0) return undefined
    let model = ReadingSensitivityElement.models.get(account)
    if (!model) {
      try {
        model = fromSightingJson(account)
      } catch {
        return undefined
      }
      ReadingSensitivityElement.models.set(account, model)
    }
    const instants = (Provenance.strip(account).recording.timeline?.keyframes ?? []).map(key => key.t)
    const result = new ReadingSensitivity(model, instants).of(bodies, provenance)
    ReadingSensitivityElement.found.set(reading, { account, result })
    return result
  }

  private async loadLocale(): Promise<void> {
    const preferences = HostLocale.preferencesFor(this)
    const language = selectLocale(preferences, UFO_SUPPORTED_LANGUAGES) as UfoLanguage
    this.messages = await READING_SENSITIVITY_MESSAGES.load(language)
    this.language = language
    this.said = new SaidTexts(preferences)
    this.draw()
  }

  private draw(): void {
    const m = this.messages
    const shown = this.shown
    const result = m && shown ? ReadingSensitivityElement.resultOf(shown.account, shown.reading) : undefined
    this.hidden = !result
    if (!m || !shown || !result) {
      this.shadowRoot!.replaceChildren()
      return
    }
    const bodies = Provenance.strip(shown.reading).recording.interpretation?.bodies ?? []
    const style = document.createElement("style")
    style.textContent = ReadingSensitivityElement.CSS
    // Something to unfold only when there is more than the line: a line alone is a paragraph, with no arrow that opens nothing.
    const unfolds = result.margins.length > 0 || result.better !== undefined
    const details = document.createElement(unfolds ? "details" : "div")
    const summary = document.createElement(unfolds ? "summary" : "p")
    const heading = document.createElement("span")
    heading.className = "heading"
    heading.textContent = `${m.heading} `
    summary.append(heading, this.sentence(result, bodies, m), HintElement.of(m.hint))
    summary.style.margin = "0"
    details.append(summary)
    if (result.margins.length > 0) {
      const list = document.createElement("ul")
      list.append(...result.margins.map((margin, index) => {
        const row = document.createElement("li")
        if (index === 0) row.dataset.tight = ""
        row.textContent = this.fill(m.margin, this.marginWords(margin, bodies, m, result))
        return row
      }))
      details.append(list)
    }
    if (result.better) {
      const better = document.createElement("p")
      better.className = "better"
      const { bodyId, knob, amount, agreement } = result.better
      better.textContent = this.fill(m.better, {
        knob: this.knobName(knob, bodyId, bodies, m, result), amount: this.value(knob, amount),
        agreed: String(Math.round(agreement * result.compared)), compared: String(result.compared)
      })
      details.append(better)
    }
    this.shadowRoot!.replaceChildren(style, details)
  }

  /** The line it comes to: how much of the account it reproduces, then what that is the most tied to, or why there is nothing to say. */
  private sentence(result: ReadingSensitivityResult, bodies: readonly BodyJson[], m: ReadingSensitivityMessages): string {
    if (result.compared === 0) return m.nothingToConfront
    const compared = String(result.compared)
    const agreed = Math.round(result.agreement * result.compared)
    const share = agreed === 0 ? this.fill(m.noneAgrees, { compared })
      : agreed === result.compared ? this.fill(m.allAgree, { compared })
        : agreed === 1 ? this.fill(m.agreementOne, { compared }) : this.fill(m.agreement, { agreed: String(agreed), compared })
    if (agreed === 0) return share
    if (result.freeBodies.length === 0) return `${share} · ${m.noFreeValue}`
    const tightest = result.margins[0]
    return tightest ? `${share} · ${this.fill(m.tightest, this.marginWords(tightest, bodies, m, result))}` : share
  }

  private marginWords(margin: KnobMargin, bodies: readonly BodyJson[], m: ReadingSensitivityMessages, result: ReadingSensitivityResult): Record<string, string> {
    const end = (amount: number, reached: boolean) => reached ? this.fill(m.atLeast, { value: this.value(margin.knob, amount) }) : this.value(margin.knob, amount)
    return {
      knob: this.knobName(margin.knob, margin.bodyId, bodies, m, result),
      lower: end(margin.lower, margin.lowerReached), upper: end(margin.upper, margin.upperReached)
    }
  }

  /** What a knob is called, followed by the body it turns, in parentheses, when the reading supposed several: one alone goes without
   * saying, and a body's title is a name a sentence cannot always put after a preposition ("Le phénomène"). */
  private knobName(knob: SensitivityKnob, bodyId: string, bodies: readonly BodyJson[], m: ReadingSensitivityMessages, result: ReadingSensitivityResult): string {
    return result.freeBodies.length > 1 ? `${m.knobs[knob]} (${this.bodyName(bodyId, bodies)})` : m.knobs[knob]
  }

  private bodyName(id: string, bodies: readonly BodyJson[]): string {
    const body = bodies.find(candidate => candidate.id === id)
    return (body?.title ? this.said.read(body.title) : undefined) ?? id
  }

  /** A turn as it is said: degrees and seconds signed, a factor after a ×. */
  private value(knob: SensitivityKnob, amount: number): string {
    const signed = new Intl.NumberFormat(this.language, { maximumFractionDigits: 1, signDisplay: "exceptZero" })
    switch (knob) {
      case "azimuth":
      case "altitude":
        return `${signed.format(amount)}°`
      case "time":
        return `${new Intl.NumberFormat(this.language, { maximumFractionDigits: 2, signDisplay: "exceptZero" }).format(amount / 1000)} s`
      case "distance":
      case "size":
        return `×${new Intl.NumberFormat(this.language, { maximumFractionDigits: 2 }).format(amount)}`
    }
  }

  private fill(template: string, values: Record<string, string>): string {
    return template.replace(/\{(\w+)\}/g, (whole, key: string) => key in values ? values[key] : whole)
  }
}
