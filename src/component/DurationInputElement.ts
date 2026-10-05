import { DurationText } from "../engine/model/DurationText.js"
import type { DurationReading } from "../engine/model/DurationText.js"
import type { EdtfDateFieldMessages } from "./EdtfDateField.js"
import { sightingEditorMessages_en } from "./messages/SightingEditorMessages_en.js"

export const DURATION_INPUT_ELEMENT_NAME = "rr0-duration-input"

/** What a duration field says in words — the date field's, plus its own. */
export interface DurationInputMessages extends Pick<EdtfDateFieldMessages, "timeQualifierApproximate" | "timeQualifierUncertain" | "timeQualifierBoth"> {
  durationPrecise: string
  durationIso: string
  durationModeTitle: string
  durationInvalid: string
  durationHelpTitle: string
  durationHelpLines: string
  durationChosen: string
}

const STYLE = `
rr0-duration-input { position: relative; display: inline-flex; align-items: center; gap: .3em; }
rr0-duration-input .duration-field { position: relative; display: inline-flex; align-items: center; gap: .25em; }
rr0-duration-input .duration-field input[type="text"] { padding-right: 1.6em; }
rr0-duration-input .duration-help { position: absolute; right: .25em; top: 50%; transform: translateY(-50%); width: 1.2em; height: 1.2em; padding: 0; border: 1px solid currentColor; border-radius: 50%; background: none; color: inherit; font-size: .75em; line-height: 1; cursor: help; opacity: .7; }
rr0-duration-input .duration-helppop { position: absolute; left: 0; bottom: calc(100% + .35em); z-index: 5; max-width: 26em; padding: .35em .6em; border-radius: 4px; background: rgba(0, 0, 0, .88); color: #fff; font-size: .8rem; line-height: 1.35; white-space: normal; pointer-events: none; }
rr0-duration-input .duration-helppop { pointer-events: auto; min-width: 16em; }
rr0-duration-input .duration-helppop p { margin: 0 0 .3em; font-weight: 600; }
rr0-duration-input .duration-helppop ul { margin: 0; padding-left: 1.1em; }
rr0-duration-input [hidden] { display: none !important; }
`

/**
 * A length of time, as a date is said: PRECISE (a number of seconds) or as it was STATED when it could not be exact — an
 * ISO 8601 duration with a doubt or a range (`PT10M~`, `PT5M/PT10M`), see DurationText. One button, right after the input, says which — "precise" or
 * "EDTF", as a date's does — and swaps them.
 *
 * `<rr0-duration-input name="durationSeconds">` makes a number (id `durationSeconds`), a text (`durationSeconds-text`) and that
 * button; in the text's tooltip, what is understood of it; in it, a (?) that opens the syntax.
 * After a duration that was not stated exactly, in brackets, the one length the simulation is played at, chosen from it
 * (the duration, or the middle of a range). The number always holds that length, so that whoever reads it need not know
 * how the duration was said.
 *
 * It tells what the author said by a `durationchange` event: `detail.seconds` is the length to play at (or `undefined` once
 * cleared) and `detail.text` the stated duration when it was not exact (`undefined` when it was). `set` shows what a recording
 * holds, telling nobody. The controls are made when the element is connected, or by `build()`.
 */
export class DurationInputElement extends HTMLElement {
  private wording: DurationInputMessages = sightingEditorMessages_en
  private built = false
  private precise = true
  private numberInput!: HTMLInputElement
  private textInput!: HTMLInputElement
  private modeButton!: HTMLButtonElement
  private helpButton!: HTMLButtonElement
  private popup!: HTMLElement
  private chosen!: HTMLElement

  /** Makes the controls, once. */
  build(): void {
    if (this.built) return
    this.built = true
    const name = this.getAttribute("name")
    const doc = this.ownerDocument
    const style = doc.createElement("style")
    style.textContent = STYLE
    const field = doc.createElement("span")
    field.className = "duration-field"
    this.numberInput = doc.createElement("input")
    this.numberInput.type = "number"
    this.numberInput.min = "0"
    this.numberInput.max = "86400"
    this.numberInput.step = "0.1"
    this.numberInput.setAttribute("aria-required", "true")
    const unit = doc.createElement("span")
    unit.className = "duration-unit"
    unit.textContent = "s"
    this.textInput = doc.createElement("input")
    this.textInput.type = "text"
    this.textInput.hidden = true
    this.helpButton = doc.createElement("button")
    this.helpButton.type = "button"
    this.helpButton.className = "duration-help"
    this.helpButton.textContent = "?"
    this.helpButton.hidden = true
    this.popup = doc.createElement("div")
    this.popup.className = "duration-helppop"
    this.popup.hidden = true
    this.chosen = doc.createElement("span")
    this.chosen.className = "duration-chosen"
    this.chosen.hidden = true
    this.modeButton = doc.createElement("button")
    this.modeButton.type = "button"
    this.modeButton.className = "duration-mode"
    if (name) {
      this.numberInput.id = name
      this.textInput.id = `${name}-text`
    }
    field.append(this.numberInput, unit, this.textInput, this.helpButton, this.popup)
    // The button right after the input, then what the simulation is played at.
    this.append(style, field, this.modeButton, this.chosen)
    this.numberInput.addEventListener("input", () => {
      const value = this.numberInput.value
      this.tell(value === "" ? undefined : Number(value), undefined)
    })
    this.textInput.addEventListener("input", () => this.readText())
    this.textInput.addEventListener("focus", () => this.showDeduction())
    this.modeButton.addEventListener("click", () => this.setPrecise(!this.precise))
    this.helpButton.addEventListener("click", () => { this.popup.hidden = !this.popup.hidden })
    this.applyWording()
  }

  connectedCallback(): void {
    this.build()
    document.addEventListener("pointerdown", this.closeHelpOutside, true)
    document.addEventListener("keydown", this.closeHelpOnEscape, true)
  }

  disconnectedCallback(): void {
    document.removeEventListener("pointerdown", this.closeHelpOutside, true)
    document.removeEventListener("keydown", this.closeHelpOnEscape, true)
  }

  private readonly closeHelpOutside = (event: Event): void => {
    if (this.popup && !this.popup.hidden && !event.composedPath().includes(this)) this.popup.hidden = true
  }

  private readonly closeHelpOnEscape = (event: KeyboardEvent): void => {
    if (event.key === "Escape" && this.popup) this.popup.hidden = true
  }

  /** The number: what holds the length the simulation is played at, whichever way the duration was said. */
  get input(): HTMLInputElement {
    this.build()
    return this.numberInput
  }

  /** The text, where a duration that is not exact is said. */
  get textField(): HTMLInputElement {
    this.build()
    return this.textInput
  }

  /** Whether the duration is said exactly, in seconds, rather than as it was stated. */
  get isPrecise(): boolean {
    this.build()
    return this.precise
  }

  /** Words the field again: its button, its help, what it understood. */
  set messages(messages: DurationInputMessages) {
    this.wording = messages
    if (this.built) this.applyWording()
  }

  private applyWording(): void {
    const m = this.wording
    this.modeButton.title = m.durationModeTitle
    this.modeButton.setAttribute("aria-label", m.durationModeTitle)
    const title = this.ownerDocument.createElement("p")
    title.textContent = m.durationHelpTitle
    const list = this.ownerDocument.createElement("ul")
    for (const line of m.durationHelpLines.split("\n")) {
      const item = this.ownerDocument.createElement("li")
      item.textContent = line
      list.append(item)
    }
    this.popup.replaceChildren(title, list)
    this.setPrecise(this.precise)
  }

  /** Shows the number (exact) or the text (as stated). A mode is a way of saying a length, not a statement of it: nothing is written. */
  setPrecise(precise: boolean): void {
    this.build()
    const wasPrecise = this.precise
    this.precise = precise
    this.numberInput.hidden = !precise
    this.querySelector<HTMLElement>(".duration-unit")!.hidden = !precise
    this.textInput.hidden = precise
    this.helpButton.hidden = precise
    this.modeButton.textContent = precise ? this.wording.durationPrecise : this.wording.durationIso
    this.modeButton.setAttribute("aria-pressed", String(!precise))
    // Going to the text with an exact length in the number, the text starts as that length, there to be made vaguer.
    if (!precise && wasPrecise && this.textInput.value === "" && this.numberInput.value !== "") {
      this.textInput.value = DurationText.format(Number(this.numberInput.value))
    }
    this.showDeduction()
    this.showChosen()
  }

  /**
   * Shows what a recording holds: the length it is played at, and the duration as stated when it was not exact. Writes
   * nothing and tells nobody.
   */
  set(seconds: number | undefined, text: string | undefined): void {
    this.build()
    this.numberInput.value = seconds === undefined ? "" : String(seconds)
    this.textInput.value = text ?? ""
    this.setPrecise(text === undefined)
  }

  /** What the text says: read, and told as the length to play at. A text that does not read yet is half typed: nothing is told. */
  private readText(): void {
    const value = this.textInput.value.trim()
    this.showDeduction()
    if (value === "") {
      this.numberInput.value = ""
      this.showChosen()
      this.tell(undefined, undefined)
      return
    }
    const reading = DurationText.parse(value)
    if (!reading) return
    this.numberInput.value = String(reading.chosenSeconds)
    this.showChosen()
    // An exact length is a plain duration: nothing was stated that the number does not say.
    this.tell(reading.chosenSeconds, DurationText.isExact(value) ? undefined : value)
  }

  private tell(seconds: number | undefined, text: string | undefined): void {
    this.dispatchEvent(new CustomEvent("durationchange", { detail: { seconds, text }, bubbles: true, composed: true }))
  }

  private describe(reading: DurationReading): string {
    const m = this.wording
    const said = reading.minSeconds === reading.maxSeconds
      ? DurationText.say(reading.minSeconds)
      : `${DurationText.say(reading.minSeconds)} – ${DurationText.say(reading.maxSeconds)}`
    const word = reading.doubt === "~" ? m.timeQualifierApproximate : reading.doubt === "?" ? m.timeQualifierUncertain
      : reading.doubt === "%" ? m.timeQualifierBoth : ""
    return word ? `${said} — ${word.toLowerCase()}` : said
  }

  /** In the text's tooltip: what is understood of it, or that it is not. Nothing while the number shows. */
  private showDeduction(): void {
    const value = this.textInput.value.trim()
    if (this.precise || value === "") {
      this.textInput.title = ""
      return
    }
    const reading = DurationText.parse(value)
    this.textInput.title = reading ? `→ ${this.describe(reading)}` : this.wording.durationInvalid
  }

  /** After a duration that was not stated exactly, in brackets: the one length the simulation is played at. */
  private showChosen(): void {
    const reading = this.precise ? undefined : DurationText.parse(this.textInput.value)
    const shown = reading !== undefined && !DurationText.isExact(this.textInput.value)
    this.chosen.hidden = !shown
    this.chosen.textContent = shown ? this.wording.durationChosen.replace("{value}", DurationText.say(reading!.chosenSeconds)) : ""
  }
}

export function register(): void {
  if (!customElements.get(DURATION_INPUT_ELEMENT_NAME)) customElements.define(DURATION_INPUT_ELEMENT_NAME, DurationInputElement)
}
