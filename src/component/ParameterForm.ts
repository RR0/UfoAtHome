import { Parameters } from "../engine/interpretation/Parameters.js"
import type { ChoiceParameter, NumberParameter, ParameterHolder, ParameterSet, ParameterSpec } from "../engine/interpretation/Parameters.js"
import type { SaidText } from "../engine/model/SaidText.js"
import { SaidTexts } from "../engine/model/SaidText.js"
import { NumberFields } from "./NumberFields.js"

/**
 * The fields of an element, built from what its kind says it lets an author set (see ParameterSet)
 * and written back onto the element as they are typed.
 *
 * It knows no kind. A launch, a decor object, a cloud: each publishes a description and this draws
 * it, with the project's rules for a form field — the view follows the `input`, not the `change`;
 * the unit stands after the field; a number field takes only what its bounds allow and is as wide
 * as the values it takes (see NumberFields). A field left empty is a value the element does not
 * state: it shows what is in force instead (`effective`), as a placeholder, and clearing a field
 * goes back to it.
 *
 * The labels are read in the language of the editor, falling back to English and then to whatever
 * the description does have (see SaidTexts), so a description from outside this package that speaks
 * only French still draws.
 */
export class ParameterForm {
  private set?: ParameterSet
  private element?: ParameterHolder
  private changed: () => void = () => undefined
  private said: SaidTexts

  constructor(private readonly container: HTMLElement, language: string) {
    this.said = new SaidTexts([language, "en"])
  }

  /** Redraws in another language, keeping the element on show. */
  setLanguage(language: string): void {
    this.said = new SaidTexts([language, "en"])
    if (this.set && this.element) this.show(this.set, this.element, this.changed)
  }

  /** Draws the fields of `set` for `element`; `changed` is called after every edit that was written onto it. */
  show(set: ParameterSet, element: ParameterHolder, changed: () => void): void {
    this.set = set
    this.element = element
    this.changed = changed
    this.container.replaceChildren()
    const groups = new Map<string, HTMLElement>()
    for (const spec of set.parameters) {
      const heading = this.read(spec.group) ?? ""
      let group = groups.get(heading)
      if (!group) {
        group = document.createElement("fieldset")
        group.className = "parameter-group"
        if (heading !== "") {
          const legend = document.createElement("legend")
          legend.textContent = heading
          group.append(legend)
        }
        groups.set(heading, group)
        this.container.append(group)
      }
      group.append(this.fieldOf(spec))
    }
    NumberFields.fit(this.container)
    this.sync()
  }

  /** The field for a key, for whatever needs to reach it. */
  field(key: string): HTMLInputElement | HTMLSelectElement | undefined {
    return this.container.querySelector<HTMLInputElement | HTMLSelectElement>(`[data-key="${key}"]`) ?? undefined
  }

  /**
   * Shows what the element states now, and what is in force where it states nothing. A field being
   * typed in is left alone, as the editor's other fields are.
   */
  sync(): void {
    if (!this.set || !this.element) return
    const active = (this.container.getRootNode() as Document | ShadowRoot).activeElement
    for (const spec of this.set.parameters) {
      const field = this.field(spec.key)
      if (!field) continue
      const stated = Parameters.read(this.element, spec.key)
      if (spec.type === "number") {
        const input = field as HTMLInputElement
        if (input !== active) input.value = typeof stated === "number" ? String(stated) : ""
        const effective = spec.effective?.(this.element)
        input.placeholder = effective === undefined ? "" : ParameterForm.shown(effective, spec)
        input.classList.toggle("parameter-derived", stated === undefined)
      } else if (spec.type === "choice") {
        const select = field as HTMLSelectElement
        if (select !== active) select.value = typeof stated === "string" ? stated : ""
        const effective = spec.effective?.(this.element)
        const choice = spec.choices.find(candidate => candidate.value === effective)
        select.options[0].textContent = choice ? (this.read(choice.label) ?? choice.value) : "—"
      } else if (spec.type === "boolean") {
        const input = field as HTMLInputElement
        if (input !== active) input.checked = stated === true
      } else {
        const input = field as HTMLInputElement
        if (input !== active) input.value = typeof stated === "string" ? stated : ""
      }
    }
  }

  private fieldOf(spec: ParameterSpec): HTMLElement {
    const label = document.createElement("label")
    const hint = this.read(spec.hint)
    if (hint) label.title = hint
    const name = document.createElement("span")
    name.textContent = this.read(spec.label) ?? spec.key
    label.append(name, " ")
    let unit: string | undefined
    if (spec.type === "choice") {
      const select = document.createElement("select")
      select.dataset.key = spec.key
      select.append(new Option("—", ""), ...spec.choices.map(choice => new Option(this.read(choice.label) ?? choice.value, choice.value)))
      select.addEventListener("input", () => this.write(spec, select.value === "" ? undefined : select.value))
      label.append(select)
    } else if (spec.type === "boolean") {
      const input = document.createElement("input")
      input.type = "checkbox"
      input.dataset.key = spec.key
      input.addEventListener("input", () => this.write(spec, input.checked))
      label.prepend(input)
      label.append(" ")
    } else {
      const input = document.createElement("input")
      input.dataset.key = spec.key
      input.autocomplete = "off"
      if (spec.type === "number") {
        input.type = "number"
        input.min = String(spec.min)
        input.max = String(spec.max)
        input.step = String(spec.step)
        unit = spec.unit
        input.addEventListener("input", () => {
          const typed = input.value.trim()
          if (typed === "") return this.write(spec, undefined)
          const value = Number(typed)
          // "-", "1." and the like are on their way to a number: nothing is written until one arrives.
          if (Number.isFinite(value)) this.write(spec, value)
        })
      } else if (spec.type === "colour") {
        input.type = "color"
        input.addEventListener("input", () => this.write(spec, input.value))
      } else {
        input.type = "text"
        input.placeholder = this.read(spec.placeholder) ?? ""
        input.addEventListener("input", () => this.write(spec, input.value === "" ? undefined : input.value))
      }
      label.append(input)
    }
    // The unit stands AFTER the field, never in the label before it.
    if (unit) label.append(` ${unit}`)
    return label
  }

  private write(spec: ParameterSpec, value: unknown): void {
    if (!this.element) return
    Parameters.write(this.element, spec.key, value)
    this.changed()
    // What one value implies for another (a thrust for an exhaust flow) shows at once, in the fields left empty.
    this.sync()
  }

  private read(text: SaidText | undefined): string | undefined {
    return this.said.read(text)
  }

  /** A value as a placeholder shows it: no more digits than its step has decimals, and never a trailing zero. */
  private static shown(value: number, spec: NumberParameter): string {
    const decimals = Math.max(0, Math.min(6, (String(spec.step).split(".")[1] ?? "").length))
    return String(Number(value.toFixed(decimals)))
  }

  /** The choices of a field, for tests and for whatever needs them. */
  static choicesOf(spec: ChoiceParameter): string[] {
    return spec.choices.map(choice => choice.value)
  }
}
