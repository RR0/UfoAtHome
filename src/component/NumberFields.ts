/**
 * Number fields as wide as what they take, and no wider.
 *
 * A field's own `min`, `max` and `step` already say what may be typed into it: an age runs to three
 * digits, a roll to four characters with its sign, a latitude to two digits and four decimals. One
 * width for all of them made every field look like it was waiting for a sentence (the user's own
 * remark), and a field that cannot show what it holds is worse, so the width is read from the field
 * itself rather than guessed per form.
 *
 * A field with no bound of its own (a distance in metres, an altitude) gets room for four digits,
 * which covers what a sighting states without going back to one size for everything.
 */
export class NumberFields {
  /** Room for the spinner and the padding, over the characters themselves. */
  private static readonly CHROME = "2.6em"
  /** What a field with no max of its own is given room for. */
  private static readonly UNBOUNDED = 9999

  /** Sizes every number field under `root`, and holds each to what it takes. Returns how many. */
  static fit(root: ParentNode): number {
    const fields = [...root.querySelectorAll<HTMLInputElement>('input[type="number"]')]
    for (const field of fields) {
      field.style.width = `calc(${NumberFields.charsFor(field)}ch + ${NumberFields.CHROME})`
      field.addEventListener("input", () => NumberFields.hold(field))
      // Its floor only once the field is left: held as it is typed, a "5" on its way to "50" would
      // be pushed straight up to a minimum of ten.
      field.addEventListener("change", () => NumberFields.hold(field, true))
    }
    return fields.length
  }

  /**
   * Brings a field's value back within what it takes, as it is typed: bounds are only a validity
   * mark to a browser, so nine digits went into a field that takes three (the user's own remark).
   * The event is sent again when the value had to be brought back, since everything downstream
   * reads the field as the author typed it.
   */
  static hold(field: HTMLInputElement, leaving = false): void {
    const held = NumberFields.heldValue(field.value, field, leaving)
    if (held === field.value) return
    field.value = held
    field.dispatchEvent(new Event("input", { bubbles: true }))
  }

  /** What a field's typed value becomes once held to its bounds and its step's own decimals. An
   * unfinished number ("", "-", "1.") is left alone: it is on its way to one. Its floor holds only
   * when the field is left (`leaving`) — see fit. */
  static heldValue(typed: string, bounds: { min: string, max: string, step: string }, leaving = false): string {
    if (typed === "" || !/^-?\d+(\.\d+)?$/.test(typed)) return typed
    const decimals = NumberFields.wholeOnly(bounds.step) ? 0 : NumberFields.decimalsOf(bounds.step)
    const point = typed.indexOf(".")
    const trimmed = point >= 0 && typed.length - point - 1 > decimals
      ? (decimals === 0 ? typed.slice(0, point) : typed.slice(0, point + decimals + 1))
      : typed
    const value = Number(trimmed)
    const min = bounds.min === "" ? undefined : Number(bounds.min)
    const max = bounds.max === "" ? undefined : Number(bounds.max)
    if (max !== undefined && value > max) return String(max)
    if (leaving && min !== undefined && value < min) return String(min)
    return trimmed
  }

  /** How many characters the longest value a field takes is spelt with, sign and decimals in. */
  static charsFor(field: { min: string, max: string, step: string }): number {
    const bound = (value: string) => value === "" ? undefined : Math.abs(Number(value))
    const widest = Math.max(bound(field.max) ?? NumberFields.UNBOUNDED, bound(field.min) ?? 0)
    const digits = String(Math.floor(Number.isFinite(widest) ? widest : NumberFields.UNBOUNDED)).length
    const negative = field.min !== "" && Number(field.min) < 0 ? 1 : 0
    const decimals = NumberFields.wholeOnly(field.step) ? 0 : NumberFields.decimalsOf(field.step)
    return digits + negative + (decimals > 0 ? decimals + 1 : 0)
  }

  /**
   * How many decimals a field holds: its step's own, but never under two. A step is how far an
   * arrow takes the value, not how precisely it may be measured — a shed paced at 5.44 m goes into
   * a field that steps by 0.1, and a hundredth is what this editor rounds a measurement to anyway.
   */
  private static decimalsOf(step: string): number {
    if (step === "" || step === "any") return 2
    const point = step.indexOf(".")
    return Math.max(2, point < 0 ? 0 : step.length - point - 1)
  }

  /** Whole values only, for a field whose step is whole: a floor cannot be half a floor. */
  private static wholeOnly(step: string): boolean {
    return step !== "" && step !== "any" && !step.includes(".")
  }
}
