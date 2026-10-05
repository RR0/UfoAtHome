import { formatEdtfTime, parseEdtfTime } from "../engine/model/Sighting.js"
import type { SightingTime } from "../engine/model/Sighting.js"

/** What a date field says in words: its qualifiers, and what is wrong with a text it cannot read. */
export interface EdtfDateFieldMessages {
  edtfInvalid: string
  timeQualifierExact: string
  timeQualifierApproximate: string
  timeQualifierUncertain: string
  timeQualifierBoth: string
  /** The text field's placeholder and its tooltip, when the field has any to say. */
  edtfPlaceholder?: string
  /** The toggle between the picker and the text, when the field has one of its own. */
  edtfModeTitle?: string
}

/** The three controls one date is said with. */
export interface EdtfDateParts {
  /** A date and a time to the minute (or the second), by the browser's own picker. */
  picker: HTMLInputElement
  /** The same date as text, for what the picker cannot hold: a bare year, a month, a second. */
  text: HTMLInputElement
  /** How sure it is: none, `~` approximate, `?` uncertain, `%` both — the whole of what a value can qualify. */
  qualifier: HTMLSelectElement
}

/**
 * A date said two ways, and written to whoever asks as one thing: a time as a recording states it
 * (see SightingTime, which carries as much of it as was known, and EDTF for the text it is written as).
 *
 * The picker is the default because a reconstruction needs a full instant to compute a sky at all;
 * the text is not removed, only folded away, because the corpus says otherwise — most case files
 * state a bare year, and a case does not need an instant. The picker writes THROUGH the text: it
 * composes an EDTF string, puts it in the field and goes down the path a typed one goes, so there is
 * one parse, one validation, and the stored string stays canonical whichever control wrote it.
 *
 * It binds controls it is given rather than building them: see DateInputElement, the element that makes them.
 */
export class EdtfDateField {
  /** The four things a whole value can say about how sure it is, in the order they get less certain. */
  private static readonly QUALIFIERS: { value: string, key: "timeQualifierExact" | "timeQualifierApproximate" | "timeQualifierUncertain" | "timeQualifierBoth" }[] = [
    { value: "", key: "timeQualifierExact" },
    { value: "~", key: "timeQualifierApproximate" },
    { value: "?", key: "timeQualifierUncertain" },
    { value: "%", key: "timeQualifierBoth" }
  ]

  private edtfMode = false

  /**
   * @param onChange Told what the field now says: a time, or `undefined` once it is cleared. Never told
   *   of a text that does not read yet (it is half typed), nor of a picker that is half entered.
   */
  constructor(
    private readonly parts: EdtfDateParts,
    private messages: EdtfDateFieldMessages,
    private readonly onChange: (time: SightingTime | undefined) => void
  ) {
    this.setMessages(messages)
    parts.text.addEventListener("input", () => this.readText())
    // "change", not "input": a datetime-local reports an empty value while it is still half typed,
    // and only a committed change can be told apart from a field in mid-entry.
    parts.picker.addEventListener("change", () => this.writeFromPicker())
    parts.qualifier.addEventListener("change", () => this.writeFromPicker())
    // Diagnosed on blur only, never while the text is being typed: a live "you're wrong" on every
    // character of "1965-07-01T05:00" is illegible and distracting.
    parts.text.addEventListener("blur", () => this.validate())
  }

  /** A button of its own that swaps the picker for the text, when the field has one (see DateInputElement). */
  toggle?: HTMLButtonElement

  /** Whether the text is what shows, rather than the picker. */
  get edtf(): boolean {
    return this.edtfMode
  }

  /** Words the field again — its qualifiers, its placeholder — keeping the qualifier chosen. */
  setMessages(messages: EdtfDateFieldMessages): void {
    this.messages = messages
    const select = this.parts.qualifier
    const chosen = select.value
    select.replaceChildren(...EdtfDateField.QUALIFIERS.map(qualifier => {
      const option = select.ownerDocument.createElement("option")
      option.value = qualifier.value
      option.textContent = messages[qualifier.key]
      return option
    }))
    select.value = chosen
    if (messages.edtfPlaceholder !== undefined) this.parts.text.placeholder = messages.edtfPlaceholder
    if (this.toggle && messages.edtfModeTitle !== undefined) {
      this.toggle.title = messages.edtfModeTitle
      this.toggle.setAttribute("aria-label", messages.edtfModeTitle)
    }
  }

  /** Shows one of the two ways of saying a date. Writes nothing: a mode is a way of saying something, not a statement. */
  setMode(edtf: boolean): void {
    this.edtfMode = edtf
    this.parts.text.hidden = !edtf
    this.parts.picker.hidden = edtf
    this.parts.qualifier.hidden = edtf
    if (this.toggle) this.toggle.setAttribute("aria-pressed", String(edtf))
  }

  /** Shows a time as the field says it, from what was loaded. Writes nothing and tells nobody. */
  set(time: SightingTime | undefined): void {
    const { text, picker, qualifier } = this.parts
    text.value = time ? formatEdtfTime(time) : ""
    picker.step = EdtfDateField.stepFor(time)
    picker.value = EdtfDateField.pickerValueOf(time)
    qualifier.value = EdtfDateField.qualifierOf(text.value)
    text.setCustomValidity("")
    text.classList.remove("invalid")
  }

  /** The way in to open on: the picker when what is stated is a full instant (or nothing), the text otherwise. */
  static opensInPicker(...times: (SightingTime | undefined)[]): boolean {
    return times.every(time => time === undefined || EdtfDateField.isPickable(time))
  }

  /**
   * Whether a stated time is one the native picker can hold: a full instant to the minute. Seconds
   * count too: a datetime-local holds them once its step is a second. A qualifier is no obstacle: the
   * select beside the picker carries it.
   */
  static isPickable(time: SightingTime | undefined): boolean {
    return !!time && time.year !== undefined && time.month !== undefined && time.day !== undefined &&
      time.hour !== undefined && time.minute !== undefined
  }

  /** The value a datetime-local takes for a stated time — "" for anything it cannot hold. */
  static pickerValueOf(time: SightingTime | undefined): string {
    if (!EdtfDateField.isPickable(time)) return ""
    const pad = (n: number, width = 2): string => String(n).padStart(width, "0")
    const seconds = time!.second ? `:${pad(time!.second)}` : ""
    return `${pad(time!.year!, 4)}-${pad(time!.month!)}-${pad(time!.day!)}T${pad(time!.hour!)}:${pad(time!.minute!)}${seconds}`
  }

  /** A picker steps by the minute unless the time it shows states a second: then by the second, or the browser would call it out of step. */
  static stepFor(time: SightingTime | undefined): string {
    return time?.second ? "1" : "60"
  }

  /** The trailing [?~%] of an EDTF value, or "" — the only qualifier a value carries. */
  static qualifierOf(edtf: string): string {
    const last = edtf.trim().slice(-1)
    return "?~%".includes(last) ? last : ""
  }

  /**
   * Reads the text: an empty one clears the date; one that does not read leaves what was there
   * untouched (it is half typed, and is never overwritten with garbage mid-typing). The flag of an
   * earlier blur goes the moment the text reads, so fixing a typo does not stay red while it is fixed.
   */
  private readText(): void {
    const { text } = this.parts
    const value = text.value.trim()
    if (value === "") {
      this.clean()
      this.onChange(undefined)
      return
    }
    const parsed = parseEdtfTime(value)
    if (!parsed) return
    this.clean()
    this.onChange(parsed)
  }

  private clean(): void {
    this.parts.text.setCustomValidity("")
    this.parts.text.classList.remove("invalid")
  }

  /**
   * Turns what the picker and its qualifier now say into EDTF and sends it down the typed path.
   *
   * An empty picker is two different statements, told apart by badInput: genuinely cleared, which is
   * a date withdrawn and must be recorded; or half typed, which is nothing yet and must NOT be, since
   * an empty text reads as "no date at all" and would erase the date between a day and its hour.
   */
  private writeFromPicker(): void {
    const { picker, qualifier, text } = this.parts
    if (picker.value === "" && picker.validity.badInput) return
    // A picker stepped to the second may report "02:45:30.000", which EDTF does not take.
    text.value = picker.value === "" ? "" : `${picker.value.replace(/\.\d+$/, "")}${qualifier.value}`
    this.readText()
  }

  /** Flags a text that does not read — now, on blur, and not while it is being typed. Empty or valid: nothing to say. */
  private validate(): void {
    const { text } = this.parts
    const value = text.value.trim()
    if (value === "" || parseEdtfTime(value)) return
    text.setCustomValidity(this.messages.edtfInvalid)
    text.classList.add("invalid")
  }
}
