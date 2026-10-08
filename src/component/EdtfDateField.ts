import { formatEdtfTime, parseEdtfTime } from "../engine/model/Sighting.js"
import type { SightingTime } from "../engine/model/Sighting.js"

/** What a date field says in words. */
export interface EdtfDateFieldMessages {
  edtfInvalid: string
  /** What the mode button reads while the date is precise, and while it is said in EDTF. */
  datePrecise: string
  dateEdtf: string
  /** The mode button's tooltip. */
  edtfModeTitle: string
  /** How a doubt reads in what is deduced from a text: "approximate", "uncertain", "approximate and uncertain". */
  timeQualifierApproximate: string
  /** The four seasons a date can be known to be in ("Spring 2022"). */
  timeSeasonSpring: string
  timeSeasonSummer: string
  timeSeasonAutumn: string
  timeSeasonWinter: string
  timeQualifierUncertain: string
  timeQualifierBoth: string
  /** The text field's placeholder and its tooltip. */
  edtfPlaceholder?: string
  /** The help popup: its title, and its lines, one per line of the string. */
  dateHelpTitle: string
  dateHelpLines: string
}

/** The controls one date is said with. */
export interface EdtfDateParts {
  /** A date and a time to the minute (or the second), by the browser's own picker: for a date that is precise. */
  picker: HTMLInputElement
  /** The same date as EDTF text, for what the picker cannot hold: a bare year, a month, a time with no date, a doubt. */
  text: HTMLInputElement
  /** Tells which of the two says the date, and swaps them. */
  mode: HTMLButtonElement
  /** The (?) inside the text field that opens the help on the syntax: only there while the text is what shows. */
  help?: HTMLElement
}

/**
 * A date said one of two ways, and written to whoever asks as one thing: a time as a recording states it
 * (see SightingTime, which carries as much of it as was known).
 *
 * A date is either PRECISE — a full instant, which a picker holds, and which is exact — or it is said in
 * EDTF: a bare year, a month, a time with no date, or any date with a doubt (`?` uncertain, `~` approximate,
 * `%` both), which only a text holds. The mode button says which it is and swaps them. There is no third
 * control for the doubt: it is the last character of the text, as the format has it.
 *
 * The picker writes THROUGH the text: it composes an EDTF string, puts it in the field and goes down the path a
 * typed one goes, so there is one parse, one validation, and the stored string stays canonical whichever
 * control wrote it.
 *
 * It binds controls it is given rather than building them: see DateInputElement, the element that makes them.
 */
export class EdtfDateField {
  private precise = true
  /** What the text's tooltip says when there is nothing to deduce from it. */
  private hint = ""

  /**
   * @param onChange Told what the field now says: a time, or `undefined` once it is cleared. Never told
   *   of a text that does not read yet (it is half typed), nor of a picker that is half entered.
   * @param locale What a deduction is worded in: a language tag, as `Intl` takes it.
   */
  constructor(
    private readonly parts: EdtfDateParts,
    private messages: EdtfDateFieldMessages,
    private readonly onChange: (time: SightingTime | undefined) => void,
    private locale = "en"
  ) {
    this.setMessages(messages)
    parts.text.addEventListener("input", () => {
      this.readText()
      this.showDeduction()
    })
    // "change", not "input": a datetime-local reports an empty value while it is still half typed,
    // and only a committed change can be told apart from a field in mid-entry.
    parts.picker.addEventListener("change", () => this.writeFromPicker())
    parts.mode.addEventListener("click", () => this.setPrecise(!this.precise))
    // Diagnosed on blur only, never while the text is being typed: a live "you're wrong" on every
    // character of "1965-07-01T05:00" is illegible and distracting.
    parts.text.addEventListener("blur", () => this.validate())
    parts.text.addEventListener("focus", () => this.showDeduction())
  }

  /** Whether the date is said as a precise instant, in the picker, rather than in EDTF. */
  get isPrecise(): boolean {
    return this.precise
  }

  /** Words the field again — its mode button, its placeholder — and what a deduction is worded in. */
  setMessages(messages: EdtfDateFieldMessages, locale = this.locale): void {
    this.messages = messages
    this.locale = locale
    if (messages.edtfPlaceholder !== undefined) this.parts.text.placeholder = messages.edtfPlaceholder
    this.parts.mode.title = messages.edtfModeTitle
    this.parts.mode.setAttribute("aria-label", messages.edtfModeTitle)
    this.setPrecise(this.precise)
  }

  /** Shows the picker or the text. A mode is a way of saying a date, not a statement of it: nothing is written. */
  setPrecise(precise: boolean): void {
    this.precise = precise
    this.parts.picker.hidden = !precise
    this.parts.text.hidden = precise
    this.parts.mode.textContent = precise ? this.messages.datePrecise : this.messages.dateEdtf
    this.parts.mode.setAttribute("aria-pressed", String(!precise))
    if (this.parts.help) this.parts.help.hidden = precise
    this.showDeduction()
  }

  /** Shows a time as the field says it, from what was loaded. Writes nothing and tells nobody. */
  set(time: SightingTime | undefined): void {
    const { text, picker } = this.parts
    text.value = time ? formatEdtfTime(time) : ""
    picker.step = EdtfDateField.stepFor(time)
    picker.value = EdtfDateField.pickerValueOf(time)
    text.setCustomValidity("")
    text.classList.remove("invalid")
    this.showDeduction()
  }

  /**
   * The way in to open on: precise when what is stated is an exact full instant (or nothing at all), EDTF otherwise —
   * a doubt, a bare year or a time with no date is not something a picker can hold.
   */
  static opensPrecise(...times: (SightingTime | undefined)[]): boolean {
    return times.every(time => time === undefined || (EdtfDateField.isPickable(time) && EdtfDateField.qualifierOf(formatEdtfTime(time)) === ""))
  }

  /** Whether a stated time is a full instant to the minute, which the native picker can hold (seconds too, once stepped to them). */
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

  /**
   * The doubt an EDTF value carries, or "": `?` uncertain, `~` approximate, `%` both — whether it is stated on the
   * whole date ("1950-05?") or on one component ("1950-?05"). A mix of the two says both.
   */
  static qualifierOf(edtf: string): string {
    const uncertain = /[?%]/.test(edtf)
    const approximate = /[~%]/.test(edtf)
    return uncertain && approximate ? "%" : uncertain ? "?" : approximate ? "~" : ""
  }

  /**
   * What a time says, in words: "11 May 1950, 19:45", "May 1950 — uncertain", "05:00 — approximate".
   * What an author reads above the text to be sure of what was understood.
   */
  describe(time: SightingTime): string {
    return EdtfDateField.describeTime(time, this.messages, this.locale)
  }

  /** `describe` without a field: the same words, for whoever shows a time elsewhere (the summary's chips). */
  static describeTime(time: SightingTime, messages: EdtfDateFieldMessages, locale: string): string {
    const raw = formatEdtfTime(time)
    const doubt = EdtfDateField.qualifierOf(raw)
    const pad = (n: number): string => String(n).padStart(2, "0")
    const parts: string[] = []
    if (time.season !== undefined) {
      const season = { spring: messages.timeSeasonSpring, summer: messages.timeSeasonSummer, autumn: messages.timeSeasonAutumn, winter: messages.timeSeasonWinter }[time.season]
      parts.push(time.year !== undefined ? `${season} ${time.year}` : season)
    } else if (time.year !== undefined) {
      const options: Intl.DateTimeFormatOptions = time.day !== undefined
        ? { year: "numeric", month: "long", day: "numeric" }
        : time.month !== undefined ? { year: "numeric", month: "long" } : { year: "numeric" }
      // A date built in UTC, so that the reader's own zone cannot move the day.
      const date = new Date(Date.UTC(time.year, (time.month ?? 1) - 1, time.day ?? 1))
      parts.push(new Intl.DateTimeFormat(locale, { ...options, timeZone: "UTC" }).format(date))
    }
    if (time.hour !== undefined) {
      parts.push(`${pad(time.hour)}:${pad(time.minute ?? 0)}${time.second !== undefined ? `:${pad(time.second)}` : ""}`)
    }
    const said = parts.join(", ")
    const word = doubt === "~" ? messages.timeQualifierApproximate
      : doubt === "?" ? messages.timeQualifierUncertain
        : doubt === "%" ? messages.timeQualifierBoth : ""
    return word ? `${said} — ${word.toLowerCase()}` : said
  }

  /** The tooltip of the text when nothing is deduced from it: what it takes. */
  setHint(hint: string): void {
    this.hint = hint
    this.showDeduction()
  }

  /**
   * Says, in the text's tooltip, what it is understood as — or that it is not. What the text takes when there is nothing
   * to understand yet, or while the picker is what shows.
   */
  private showDeduction(): void {
    const { text } = this.parts
    const value = text.value.trim()
    if (this.precise || value === "") {
      text.title = this.hint
      return
    }
    const parsed = parseEdtfTime(value)
    text.title = parsed ? `→ ${this.describe(parsed)}` : this.messages.edtfInvalid
  }

  /**
   * Reads the text: an empty one clears the date; one that does not read leaves what was there
   * untouched (it is half typed, and is never overwritten with garbage mid-typing). The flag of an
   * earlier blur goes the moment the text reads, so fixing a typo does not stay red while it is fixed.
   */
  private readText(): void {
    const value = this.parts.text.value.trim()
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
   * Turns what the picker now says into EDTF and sends it down the typed path.
   *
   * An empty picker is two different statements, told apart by badInput: genuinely cleared, which is
   * a date withdrawn and must be recorded; or half typed, which is nothing yet and must NOT be, since
   * an empty text reads as "no date at all" and would erase the date between a day and its hour.
   */
  private writeFromPicker(): void {
    const { picker, text } = this.parts
    if (picker.value === "" && picker.validity.badInput) return
    // A picker stepped to the second may report "02:45:30.000", which EDTF does not take.
    text.value = picker.value === "" ? "" : picker.value.replace(/\.\d+$/, "")
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
