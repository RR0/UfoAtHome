/**
 * A length of time as an observer may state it when they cannot state it exactly: "about ten minutes",
 * "between five and ten", "a minute, perhaps". Written as an ISO 8601 duration — `PT10M`, `PT1H30M`, `PT45S` —
 * optionally with a doubt as its last character (`?` uncertain, `~` approximate, `%` both, as a date has),
 * or as a range of two of them, `PT5M/PT10M`.
 *
 * A reconstruction needs ONE length to be played at, and this is where it is chosen: the duration itself, or the
 * middle of a range. What a recording states is `durationText`; the length the simulation uses stays
 * `durationSeconds`, which a reader that knows nothing of the text still understands.
 */
export interface DurationReading {
  /** The doubt, if the text carries one: "~", "?" or "%". */
  doubt: "" | "~" | "?" | "%"
  /** The shortest and the longest the text allows, in seconds; the same for a single length. */
  minSeconds: number
  maxSeconds: number
  /** The length the simulation is played at: the duration, or the middle of the range. */
  chosenSeconds: number
}

export class DurationText {
  /** One ISO 8601 duration: weeks, days, then a T and hours, minutes, seconds — decimals allowed, at least one part. */
  private static readonly ISO = /^P(?:(\d+(?:[.,]\d+)?)W)?(?:(\d+(?:[.,]\d+)?)D)?(?:T(?:(\d+(?:[.,]\d+)?)H)?(?:(\d+(?:[.,]\d+)?)M)?(?:(\d+(?:[.,]\d+)?)S)?)?$/

  /** The length of one ISO 8601 duration in seconds, or undefined when the text is not one. */
  static seconds(text: string): number | undefined {
    const trimmed = text.trim().toUpperCase()
    const match = DurationText.ISO.exec(trimmed)
    if (!match || trimmed === "P" || trimmed.endsWith("T")) return undefined
    const [, weeks, days, hours, minutes, seconds] = match
    const n = (part: string | undefined): number => (part === undefined ? 0 : Number(part.replace(",", ".")))
    const total = n(weeks) * 604800 + n(days) * 86400 + n(hours) * 3600 + n(minutes) * 60 + n(seconds)
    return Number.isFinite(total) ? total : undefined
  }

  /** What a stated duration says, or undefined when it does not read. */
  static parse(text: string): DurationReading | undefined {
    let body = text.trim()
    if (body === "") return undefined
    const last = body.slice(-1)
    const doubt = "?~%".includes(last) ? (last as "?" | "~" | "%") : ""
    if (doubt !== "") body = body.slice(0, -1).trim()
    const ends = body.split("/")
    if (ends.length > 2) return undefined
    const lengths = ends.map(end => DurationText.seconds(end))
    if (lengths.some(length => length === undefined)) return undefined
    const [from, to] = lengths as number[]
    const minSeconds = Math.min(from, to ?? from)
    const maxSeconds = Math.max(from, to ?? from)
    return { doubt, minSeconds, maxSeconds, chosenSeconds: (minSeconds + maxSeconds) / 2 }
  }

  /** Whether a text states a length exactly: it carries no doubt and no range. */
  static isExact(text: string): boolean {
    const reading = DurationText.parse(text)
    return reading !== undefined && reading.doubt === "" && reading.minSeconds === reading.maxSeconds
  }

  /** A length in seconds as an ISO 8601 duration: 600 is "PT10M", 5400 is "PT1H30M", 45.5 is "PT45.5S". */
  static format(seconds: number): string {
    const total = Math.max(0, Math.round(seconds * 10) / 10)
    const hours = Math.floor(total / 3600)
    const minutes = Math.floor((total % 3600) / 60)
    const rest = Math.round((total % 60) * 10) / 10
    const time = `${hours > 0 ? `${hours}H` : ""}${minutes > 0 ? `${minutes}M` : ""}${rest > 0 || (hours === 0 && minutes === 0) ? `${rest}S` : ""}`
    return `PT${time}`
  }

  /** A length in seconds as a reader says it: "45 s", "10 min", "1 h 30 min", "2 h". */
  static say(seconds: number): string {
    const rounded = Math.round(seconds * 10) / 10
    if (rounded < 60) return `${rounded} s`
    const hours = Math.floor(rounded / 3600)
    const minutes = Math.floor((rounded % 3600) / 60)
    const rest = Math.round((rounded % 60) * 10) / 10
    const parts: string[] = []
    if (hours > 0) parts.push(`${hours} h`)
    if (minutes > 0) parts.push(`${minutes} min`)
    if (rest > 0) parts.push(`${rest} s`)
    return parts.join(" ")
  }
}
