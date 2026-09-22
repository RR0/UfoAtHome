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

  /** Sizes every number field under `root`, and returns how many it sized. */
  static fit(root: ParentNode): number {
    const fields = [...root.querySelectorAll<HTMLInputElement>('input[type="number"]')]
    for (const field of fields) field.style.width = `calc(${NumberFields.charsFor(field)}ch + ${NumberFields.CHROME})`
    return fields.length
  }

  /** How many characters the longest value a field takes is spelt with, sign and decimals in. */
  static charsFor(field: { min: string, max: string, step: string }): number {
    const bound = (value: string) => value === "" ? undefined : Math.abs(Number(value))
    const widest = Math.max(bound(field.max) ?? NumberFields.UNBOUNDED, bound(field.min) ?? 0)
    const digits = String(Math.floor(Number.isFinite(widest) ? widest : NumberFields.UNBOUNDED)).length
    const negative = field.min !== "" && Number(field.min) < 0 ? 1 : 0
    const decimals = NumberFields.decimalsOf(field.step)
    return digits + negative + (decimals > 0 ? decimals + 1 : 0)
  }

  /** How many decimals a step allows: none for a whole step, and a couple for a free one. */
  private static decimalsOf(step: string): number {
    if (step === "" || step === "any") return 2
    const point = step.indexOf(".")
    return point < 0 ? 0 : step.length - point - 1
  }
}
