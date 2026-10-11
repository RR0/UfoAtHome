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
  /**
   * `edit` is told which parameter the edit is of, since where an edit goes can depend on it (a cloud's crystal
   * alignment does not detach the weather from its records). `context` is what the element alone cannot say and
   * the descriptions' `effective`, `bounds` and `visibleWhen` need: the general darkness a layer inherits.
   */
  constructor(readonly read: () => ParameterHolder | undefined, readonly edit: (apply: (draft: ParameterHolder) => void, spec: ParameterSpec) => void,
    readonly context: () => unknown = () => undefined) {
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

  /**
   * `idPrefix` is put before each key to make the id of its field, so that something outside the form (a summary chip) can reach it.
   * `values` is what a text an author writes in a language needs (see SaidParameter): how this reader reads one, and the language
   * a typed text is written into.
   */
  constructor(private readonly container: HTMLElement, language: string, private readonly idPrefix = "",
    private readonly values?: { said: () => SaidTexts, writingLanguage: () => string }) {
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
    const context = this.target!.context()
    const active = (this.container.getRootNode() as Document | ShadowRoot).activeElement
    for (const spec of this.set.parameters) {
      const field = this.field(spec.key)
      if (!field) continue
      const row = (field.closest("label, .parameter-row") ?? field) as HTMLElement
      row.hidden = spec.visibleWhen !== undefined && !spec.visibleWhen(element, context)
      const stated = Parameters.read(element, spec.key)
      if (spec.type === "number") {
        const input = field as HTMLInputElement
        if (input !== active) input.value = typeof stated === "number" ? ParameterForm.shown(stated, spec) : ""
        const bounds = ParameterForm.boundsOf(spec, element, context)
        input.min = String(bounds.min)
        input.max = String(bounds.max)
        const effective = spec.effective?.(element, context)
        input.placeholder = effective !== undefined ? ParameterForm.shown(effective, spec) : (this.read(spec.placeholder) ?? "")
        input.classList.toggle("parameter-derived", stated === undefined)
      } else if (spec.type === "choice") {
        const select = field as HTMLSelectElement
        const choices = spec.optionsOf?.(element, context) ?? spec.choices
        // The options follow the element where they depend on it: the seats a vehicle has are not those of a building.
        if ([...select.options].filter(option => option.value !== "").map(option => option.value).join("\n") !== choices.map(choice => choice.value).join("\n")) {
          select.replaceChildren(...(spec.required ? [] : [new Option("—", "")]), ...choices.map(choice => new Option(this.read(choice.label) ?? choice.value, choice.value)))
        }
        if (select !== active) select.value = typeof stated === "string" && choices.some(choice => choice.value === stated) ? stated : (spec.required ? select.options[0]?.value ?? "" : "")
        if (!spec.required) {
          const effective = spec.effective?.(element, context)
          const choice = choices.find(candidate => candidate.value === effective)
          select.options[0].textContent = choice ? (this.read(choice.label) ?? choice.value) : (this.read(spec.empty) ?? "—")
        }
      } else if (spec.type === "boolean") {
        const input = field as HTMLInputElement
        if (input !== active) input.checked = stated === true
      } else if (spec.type === "colour") {
        const input = field as HTMLInputElement
        if (input !== active) input.value = ParameterForm.swatchOf(stated, spec.fallback ?? "#808080")
      } else if (spec.type === "set") {
        this.syncSet(spec, field, element, context)
      } else if (spec.type === "said") {
        const input = field as HTMLInputElement
        if (input !== active) input.value = this.values?.said().read(Parameters.read(element, spec.key) as SaidText | undefined) ?? ""
        this.markMissing(spec, input)
      } else {
        const input = field as HTMLInputElement
        if (input !== active) {
          input.value = typeof stated === "string" ? stated : ""
          input.classList.remove("invalid")
          input.removeAttribute("aria-invalid")
        }
      }
    }
    // A group with no field showing has no heading to show.
    for (const group of this.container.querySelectorAll<HTMLElement>("fieldset.parameter-group")) {
      group.hidden = [...group.querySelectorAll<HTMLElement>("label, .parameter-row")].filter(row => row.parentElement === group).every(row => row.hidden)
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
      if (!spec.required) select.append(new Option("—", ""))
      select.append(...spec.choices.map(choice => new Option(this.read(choice.label) ?? choice.value, choice.value)))
      select.addEventListener("input", () => this.write(spec, select.value === "" ? undefined : select.value))
      label.append(select)
    } else if (spec.type === "set") {
      // Ticks, as many as the list offers: a box of its own, since a label can hold one field.
      const box = document.createElement("div")
      this.identify(box, spec)
      box.className = "parameter-set"
      box.addEventListener("input", () => {
        const checked = [...box.querySelectorAll<HTMLInputElement>("input:checked")].map(check => check.value)
        this.write(spec, checked.length > 0 ? checked : undefined)
      })
      return this.setRow(spec, box)
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
          // A value that cannot be absent keeps what it had when the field is emptied on the way to another number.
          if (typed === "") return spec.required ? undefined : this.write(spec, undefined)
          const value = Number(typed)
          // "-", "1." and the like are on their way to a number: nothing is written until one arrives.
          if (Number.isFinite(value)) this.write(spec, value)
        })
      } else if (spec.type === "colour") {
        input.type = "color"
        input.addEventListener("input", () => this.write(spec, input.value))
      } else if (spec.type === "said") {
        input.type = "text"
        input.placeholder = this.read(spec.placeholder) ?? ""
        input.addEventListener("input", () => {
          const target = this.target?.read()
          const values = this.values
          if (!target || !values) return
          // Into this language's entry, the others kept: written from nothing, an edit took every other language away.
          this.write(spec, values.said().write(Parameters.read(target, spec.key) as SaidText | undefined, input.value, values.writingLanguage()))
          this.markMissing(spec, input)
        })
      } else {
        input.type = "text"
        input.placeholder = this.read(spec.placeholder) ?? ""
        input.addEventListener("input", () => {
          const typed = spec.required || spec.validate ? input.value.trim() : input.value
          const element = this.target?.read()
          const refused = element !== undefined && ((spec.required === true && typed === "") || (typed !== "" && spec.validate?.(typed, element, this.target!.context()) === false))
          input.classList.toggle("invalid", refused)
          if (refused) input.setAttribute("aria-invalid", "true")
          else input.removeAttribute("aria-invalid")
          if (refused) return
          this.write(spec, typed === "" ? undefined : typed)
        })
        // Leaving a field whose value was refused puts the stated one back.
        input.addEventListener("change", () => {
          if (!input.classList.contains("invalid")) return
          input.classList.remove("invalid")
          input.removeAttribute("aria-invalid")
          const element = this.target?.read()
          const stated = element === undefined ? undefined : Parameters.read(element, spec.key)
          input.value = typeof stated === "string" ? stated : ""
        })
      }
      label.append(input)
    }
    // The unit stands AFTER the field, never in the label before it.
    if (unit) label.append(` ${unit}`)
    return label
  }

  /** A name left out is flagged, not refused: nothing here stops it being saved blank, it is made visibly wrong so it is not by accident. */
  private markMissing(spec: ParameterSpec, input: HTMLInputElement): void {
    if (spec.type !== "said" || !spec.required) return
    input.classList.toggle("invalid", input.value === "")
    input.setAttribute("aria-invalid", String(input.value === ""))
  }

  /** A set's row: its name, and its ticks under it. */
  private setRow(spec: ParameterSpec, box: HTMLElement): HTMLElement {
    const row = document.createElement("div")
    row.className = "parameter-row"
    const hint = this.read(spec.hint)
    if (hint) row.title = hint
    const name = document.createElement("span")
    name.textContent = this.read(spec.label) ?? spec.key
    row.append(name, box)
    return row
  }

  /** The ticks of a set: what the list offers now, with what the element states ticked. */
  private syncSet(spec: ParameterSpec, field: HTMLElement, element: ParameterHolder, context: unknown): void {
    if (spec.type !== "set") return
    const stated = Parameters.read(element, spec.key)
    const ticked = new Set(Array.isArray(stated) ? stated as string[] : [])
    const options = spec.options(element, context)
    if (options.length === 0) {
      field.textContent = this.read(spec.empty) ?? ""
      return
    }
    const same = [...field.querySelectorAll<HTMLInputElement>("input")].map(check => check.value).join("\n") === options.map(option => option.value).join("\n")
    if (!same) {
      field.replaceChildren(...options.map(option => {
        const item = document.createElement("label")
        const check = document.createElement("input")
        check.type = "checkbox"
        check.value = option.value
        item.append(check, " ", option.label)
        return item
      }))
    }
    for (const check of field.querySelectorAll<HTMLInputElement>("input")) check.checked = ticked.has(check.value)
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
        const bounds = ParameterForm.boundsOf(spec, element, target.context())
        // What was typed is in the field's own unit: a coverage is typed in percent and stored from 0 to 1.
        written = Math.max(bounds.min, Math.min(bounds.max, value)) / (spec.scale ?? 1)
      }
    }
    target.edit(draft => Parameters.write(draft, spec.key, written), spec)
    this.changed()
    // What one value implies for another (a thrust for an exhaust flow) shows at once, in the fields left empty.
    this.sync()
  }

  private read(text: SaidText | undefined): string | undefined {
    return this.said.read(text)
  }

  private static boundsOf(spec: NumberParameter, element: ParameterHolder, context?: unknown): { min: number, max: number } {
    const dynamic = spec.bounds?.(element, context)
    return { min: dynamic?.min ?? spec.min, max: dynamic?.max ?? spec.max }
  }

  /**
   * A colour as a colour field can hold it: #rrggbb, with #rgb spelt out. What the field cannot show is left as its
   * fallback grey, which only stands in the swatch until the author picks a colour of their own.
   */
  static swatchOf(colour: unknown, fallback: string): string {
    if (typeof colour !== "string") return fallback
    const short = /^#([0-9a-f])([0-9a-f])([0-9a-f])$/i.exec(colour)
    if (short) return `#${short[1]}${short[1]}${short[2]}${short[2]}${short[3]}${short[3]}`.toLowerCase()
    return /^#[0-9a-f]{6}$/i.test(colour) ? colour.toLowerCase() : fallback
  }

  /**
   * A value as a field shows it, in the unit it is typed in: no more digits than its step has decimals, and
   * never fewer than two (a step is a notch of the arrow, not a precision), and never a trailing zero. An
   * interpolated value (89.43046058333363) is not what anyone typed, and the field is for typing.
   */
  private static shown(value: number, spec: NumberParameter): string {
    const decimals = Math.max(2, Math.min(6, (String(spec.step).split(".")[1] ?? "").length))
    return String(Number((value * (spec.scale ?? 1)).toFixed(decimals)))
  }

  /** The choices of a field, for tests and for whatever needs them. */
  static choicesOf(spec: ChoiceParameter): string[] {
    return spec.choices.map(choice => choice.value)
  }
}
