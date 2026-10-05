import type { SightingTime } from "../engine/model/Sighting.js"
import { HostLocale } from "../i18n/locale.js"
import { EdtfDateField } from "./EdtfDateField.js"
import type { EdtfDateFieldMessages } from "./EdtfDateField.js"
import { sightingEditorMessages_en } from "./messages/SightingEditorMessages_en.js"

export const DATE_INPUT_ELEMENT_NAME = "rr0-date-input"

const STYLE = `
rr0-date-input { position: relative; display: inline-flex; align-items: center; gap: .3em; }
rr0-date-input .edtf-field { position: relative; display: inline-flex; align-items: center; }
rr0-date-input .edtf-field input[type="text"] { padding-right: 1.6em; }
rr0-date-input .edtf-help { position: absolute; right: .25em; top: 50%; transform: translateY(-50%); width: 1.2em; height: 1.2em; padding: 0; border: 1px solid currentColor; border-radius: 50%; background: none; color: inherit; font-size: .75em; line-height: 1; cursor: help; opacity: .7; }
rr0-date-input .edtf-deduction, rr0-date-input .edtf-helppop { position: absolute; left: 0; bottom: calc(100% + .35em); z-index: 5; max-width: 26em; padding: .35em .6em; border-radius: 4px; background: rgba(0, 0, 0, .88); color: #fff; font-size: .8rem; line-height: 1.35; white-space: normal; pointer-events: none; }
rr0-date-input .edtf-deduction.bad { color: #ffb4a8; }
rr0-date-input .edtf-helppop { pointer-events: auto; min-width: 16em; }
rr0-date-input .edtf-helppop p { margin: 0 0 .3em; font-weight: 600; }
rr0-date-input .edtf-helppop ul { margin: 0; padding-left: 1.1em; }
rr0-date-input [hidden] { display: none !important; }
rr0-date-input .edtf-deduction { display: none !important; }
rr0-date-input:hover .edtf-deduction:not([hidden]), rr0-date-input:focus-within .edtf-deduction:not([hidden]) { display: block !important; }
`

/**
 * A date as the project says it: precise (a picker for a full instant) or in EDTF (a text, for a bare year, a
 * month, a time with no date, or any date with a doubt) — see EdtfDateField, which does the work this element stands on.
 *
 * `<rr0-date-input name="obs-time">` makes, in its own light DOM so that the page's styles reach them, a
 * datetime-local (`obs-time-native`), a text (`obs-time`) and a button that says which of the two the date is said
 * in («precise» or «EDTF») and swaps them. Above the text, while it is hovered or has the focus, what is deduced
 * from it ("→ May 1950 — uncertain"); in it, a (?) that opens the syntax the text takes. The ids derive from `name`,
 * which is how an editor that holds several finds the control it means.
 *
 * It says what the date now is by a `datechange` event, whose `detail.time` is a SightingTime or `undefined` once
 * cleared — never for a text that does not read yet. `time` sets what it shows, telling nobody.
 *
 * The controls are made when the element is connected, or at once by `build()`: an element in a template that is not
 * yet in a page is not upgraded until it is, and an editor has to reach the controls before that.
 */
export class DateInputElement extends HTMLElement {
  private dateField?: EdtfDateField
  private shown?: SightingTime
  private wording: EdtfDateFieldMessages = sightingEditorMessages_en
  private helpPopup?: HTMLElement

  /** Makes the controls, once. */
  build(): void {
    if (this.dateField) return
    const name = this.getAttribute("name")
    const doc = this.ownerDocument
    const style = doc.createElement("style")
    style.textContent = STYLE
    const field = doc.createElement("span")
    field.className = "edtf-field"
    const picker = doc.createElement("input")
    picker.type = "datetime-local"
    picker.step = "60"
    const text = doc.createElement("input")
    text.type = "text"
    text.hidden = true
    const help = doc.createElement("button")
    help.type = "button"
    help.className = "edtf-help"
    help.textContent = "?"
    help.hidden = true
    const deduction = doc.createElement("span")
    deduction.className = "edtf-deduction"
    deduction.hidden = true
    deduction.setAttribute("role", "status")
    const popup = doc.createElement("div")
    popup.className = "edtf-helppop"
    popup.hidden = true
    this.helpPopup = popup
    if (name) {
      picker.id = `${name}-native`
      text.id = name
    }
    field.append(picker, text, help, deduction, popup)
    const mode = doc.createElement("button")
    mode.type = "button"
    mode.className = "edtf-mode"
    this.append(style, field, mode)
    this.dateField = new EdtfDateField({ picker, text, mode, deduction, help }, this.wording,
      time => this.dispatchEvent(new CustomEvent("datechange", { detail: { time }, bubbles: true, composed: true })),
      HostLocale.preferencesFor(this)[0] ?? "en")
    help.addEventListener("click", () => this.toggleHelp())
    this.shown = undefined
    this.fillHelp()
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
    if (this.helpPopup && !this.helpPopup.hidden && !event.composedPath().includes(this)) this.helpPopup.hidden = true
  }

  private readonly closeHelpOnEscape = (event: KeyboardEvent): void => {
    if (event.key === "Escape" && this.helpPopup) this.helpPopup.hidden = true
  }

  private toggleHelp(): void {
    if (this.helpPopup) this.helpPopup.hidden = !this.helpPopup.hidden
  }

  /** The syntax the text takes, one line to a line of the message. */
  private fillHelp(): void {
    const popup = this.helpPopup
    if (!popup) return
    const title = this.ownerDocument.createElement("p")
    title.textContent = this.wording.dateHelpTitle
    const list = this.ownerDocument.createElement("ul")
    for (const line of this.wording.dateHelpLines.split("\n")) {
      const item = this.ownerDocument.createElement("li")
      item.textContent = line
      list.append(item)
    }
    popup.replaceChildren(title, list)
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

  /** Whether the date is said as a precise instant, in the picker, rather than in EDTF. */
  get precise(): boolean {
    return this.field.isPrecise
  }

  /** Shows the picker (a precise date) or the text (EDTF). A mode is a way of saying a date, not a statement of it: nothing is written. */
  setPrecise(precise: boolean): void {
    this.field.setPrecise(precise)
  }

  /** Words the date again: its button, its placeholder, its help. */
  set messages(messages: EdtfDateFieldMessages) {
    this.wording = messages
    if (this.dateField) {
      this.dateField.setMessages(messages, HostLocale.preferencesFor(this)[0] ?? "en")
      this.fillHelp()
    }
  }
}

export function register(): void {
  if (!customElements.get(DATE_INPUT_ELEMENT_NAME)) customElements.define(DATE_INPUT_ELEMENT_NAME, DateInputElement)
}
