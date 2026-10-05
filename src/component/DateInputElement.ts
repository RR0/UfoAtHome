import type { SightingTime } from "../engine/model/Sighting.js"
import { EdtfDateField } from "./EdtfDateField.js"
import type { EdtfDateFieldMessages } from "./EdtfDateField.js"
import { sightingEditorMessages_en } from "./messages/SightingEditorMessages_en.js"

export const DATE_INPUT_ELEMENT_NAME = "rr0-date-input"

/**
 * A date as the project says it: a picker for a full instant, a text for anything less (EDTF), and
 * how sure it is — see EdtfDateField, which does the work this element stands on.
 *
 * `<rr0-date-input name="obs-time">` makes, in its own light DOM so that the page's styles reach
 * them, a datetime-local (`obs-time-native`), a text (`obs-time`) and a qualifier (`obs-time-qualifier`):
 * the ids derive from `name`, which is how an editor that holds several finds the control it means.
 * `toggle` adds a button of its own to swap the picker for the text; without it whoever holds the date
 * swaps it (`setMode`), as the recording editor does for its two dates at once.
 *
 * It says what the date now is by a `datechange` event, whose `detail.time` is a SightingTime or
 * `undefined` once cleared — never for a text that does not read yet. `time` sets what it shows,
 * telling nobody.
 *
 * The controls are made when the element is connected, or at once by `build()`: an element in a
 * template that is not yet in a page is not upgraded until it is, and an editor has to reach the
 * controls before that.
 */
export class DateInputElement extends HTMLElement {
  private dateField?: EdtfDateField
  private shown?: SightingTime
  private wording: EdtfDateFieldMessages = sightingEditorMessages_en

  /** Makes the controls, once. */
  build(): void {
    if (this.dateField) return
    const name = this.getAttribute("name")
    const doc = this.ownerDocument
    const picker = doc.createElement("input")
    picker.type = "datetime-local"
    picker.step = "60"
    const text = doc.createElement("input")
    text.type = "text"
    text.hidden = true
    const qualifier = doc.createElement("select")
    qualifier.className = "time-qualifier"
    if (name) {
      picker.id = `${name}-native`
      text.id = name
      qualifier.id = `${name}-qualifier`
    }
    this.append(picker, text, qualifier)
    this.dateField = new EdtfDateField({ picker, text, qualifier }, this.wording,
      time => this.dispatchEvent(new CustomEvent("datechange", { detail: { time }, bubbles: true, composed: true })))
    if (this.hasAttribute("toggle")) {
      const toggle = doc.createElement("button")
      toggle.type = "button"
      toggle.textContent = "EDTF"
      toggle.setAttribute("aria-pressed", "false")
      toggle.addEventListener("click", () => this.setMode(!this.dateField!.edtf))
      this.append(toggle)
      this.dateField.toggle = toggle
      this.dateField.setMessages(this.wording)
    }
    this.shown = undefined
  }

  connectedCallback(): void {
    this.build()
  }

  /** The field this element is made of, for whoever needs the detail of it. */
  get field(): EdtfDateField {
    this.build()
    return this.dateField!
  }

  /** What the date shows. Setting it writes nothing and tells nobody. */
  get time(): SightingTime | undefined {
    return this.shown
  }

  set time(time: SightingTime | undefined) {
    this.shown = time
    this.field.set(time)
  }

  /** Whether the text is showing rather than the picker. */
  get edtf(): boolean {
    return this.field.edtf
  }

  /** Shows the picker or the text. A mode is a way of saying a date, not a statement of it: nothing is written. */
  setMode(edtf: boolean): void {
    this.field.setMode(edtf)
  }

  /** Words the date again: its qualifiers, its placeholder, its toggle. */
  set messages(messages: EdtfDateFieldMessages) {
    this.wording = messages
    if (this.dateField) this.dateField.setMessages(messages)
  }
}

export function register(): void {
  if (!customElements.get(DATE_INPUT_ELEMENT_NAME)) customElements.define(DATE_INPUT_ELEMENT_NAME, DateInputElement)
}
