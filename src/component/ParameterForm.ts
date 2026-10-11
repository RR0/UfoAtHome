import { Parameters } from "../engine/interpretation/Parameters.js"
import type { ChoiceParameter, NumberParameter, ParameterHolder, ParameterSet, ParameterSpec } from "../engine/interpretation/Parameters.js"
import type { SaidText } from "../engine/model/SaidText.js"
import { SaidTexts } from "../engine/model/SaidText.js"
import { NumberFields } from "./NumberFields.js"

/**
 * Where a form reads an element from and how an edit reaches it.
 *
 * A launch is edited where it stands. A decor object is not: the recording's decor is replaced by a new
 * array at every edit (see SightingEditorElement.updateDecor), so that what holds the old one — the
 * scene, a history — sees a different object. `read` gives the element as it stands now, and `edit` is
 * handed a draft of it to change, which is the form's only way to write. The element is read again at
 * every use, so that whatever else changed it meanwhile (a size typed in another field) is not
 * written over from a copy taken earlier.
 */
export class ParameterTarget {
  constructor(readonly read: () => ParameterHolder | undefined, readonly edit: (apply: (draft: ParameterHolder) => void) => void) {
  }

  /** An element edited where it stands. */
  static inPlace(element: ParameterHolder): ParameterTarget {
    return new ParameterTarget(() => element, apply => apply(element))
  }
}

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
  private target?: ParameterTarget
  private changed: () => void = () => undefined
  private said: SaidTexts

  /** `idPrefix` is put before each key to make the id of its field, so that something outside the form (a summary chip) can reach it. */
  constructor(private readonly container: HTMLElement, language: string, private readonly idPrefix = "") {
    this.said = new SaidTexts([language, "en"])
  }

  /** Redraws in another language, keeping the element on show. */
  setLanguage(language: string): void {
    this.said = new SaidTexts([language, "en"])
    if (this.set && this.target) this.show(this.set, this.target, this.changed)
  }

  /** Draws the fields of `set` for `target`; `changed` is called after every edit that was written. */
  show(set: ParameterSet, target: ParameterHolder | ParameterTarget, changed: () => void): void {
    this.set = set
    this.target = target instanceof ParameterTarget ? target : ParameterTarget.inPlace(target)
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

  /** Empties the form, for an element that has none to show. */
  clear(): void {
    this.set = undefined
    this.target = undefined
    this.container.replaceChildren()
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
    const element = this.target?.read()
    if (!this.set || !element) return
    const active = (this.container.getRootNode() as Document | ShadowRoot).activeElement
    for (const spec of this.set.parameters) {
      const field = this.field(spec.key)
      if (!field) continue
      const row = (field.closest("label") ?? field) as HTMLElement
      row.hidden = spec.visibleWhen !== undefined && !spec.visibleWhen(element)
      const stated = Parameters.read(element, spec.key)
      if (spec.type === "number") {
        const input = field as HTMLInputElement
        if (input !== active) input.value = typeof stated === "number" ? String(stated) : ""
        const bounds = ParameterForm.boundsOf(spec, element)
        input.min = String(bounds.min)
        input.max = String(bounds.max)
        const effective = spec.effective?.(element)
        input.placeholder = effective === undefined ? "" : ParameterForm.shown(effective, spec)
        input.classList.toggle("parameter-derived", stated === undefined)
      } else if (spec.type === "choice") {
        const select = field as HTMLSelectElement
        if (select !== active) select.value = typeof stated === "string" ? stated : ""
        const effective = spec.effective?.(element)
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
    // A group with no field showing has no heading to show.
    for (const group of this.container.querySelectorAll<HTMLElement>("fieldset.parameter-group")) {
      group.hidden = [...group.querySelectorAll<HTMLElement>("label")].every(label => label.hidden)
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
      this.identify(select, spec)
      select.append(new Option("—", ""), ...spec.choices.map(choice => new Option(this.read(choice.label) ?? choice.value, choice.value)))
      select.addEventListener("input", () => this.write(spec, select.value === "" ? undefined : select.value))
      label.append(select)
    } else if (spec.type === "boolean") {
      const input = document.createElement("input")
      input.type = "checkbox"
      this.identify(input, spec)
      input.addEventListener("input", () => this.write(spec, input.checked))
      label.prepend(input)
      label.append(" ")
    } else {
      const input = document.createElement("input")
      this.identify(input, spec)
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

  private identify(field: HTMLElement, spec: ParameterSpec): void {
    field.dataset.key = spec.key
    if (this.idPrefix !== "") field.id = `${this.idPrefix}${spec.key}`
  }

  private write(spec: ParameterSpec, value: unknown): void {
    const target = this.target
    if (!target) return
    // What is written is held to the bounds the field has now, whatever was typed on the way: a
    // vehicle's windscreen is never more open than the glass allows, though "5" on its way to "95"
    // goes through the field.
    let written = value
    if (spec.type === "number" && typeof value === "number") {
      const element = target.read()
      if (element) {
        const bounds = ParameterForm.boundsOf(spec, element)
        written = Math.max(bounds.min, Math.min(bounds.max, value))
      }
    }
    target.edit(draft => Parameters.write(draft, spec.key, written))
    this.changed()
    // What one value implies for another (a thrust for an exhaust flow) shows at once, in the fields left empty.
    this.sync()
  }

  private read(text: SaidText | undefined): string | undefined {
    return this.said.read(text)
  }

  private static boundsOf(spec: NumberParameter, element: ParameterHolder): { min: number, max: number } {
    const dynamic = spec.bounds?.(element)
    return { min: dynamic?.min ?? spec.min, max: dynamic?.max ?? spec.max }
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
