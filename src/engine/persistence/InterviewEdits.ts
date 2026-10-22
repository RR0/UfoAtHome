import { InterviewFile } from "./interviewJson.js"
import type { InterviewRedaction, InterviewSegment, InterviewSegmentPart } from "./interviewJson.js"

/** Where a stretch of a segment stands in the text a reader shows of it: its part, and its first and last character. */
export interface ShownRange {
  part: number
  from: number
  to: number
}

/**
 * The edits an interview's editor makes to one segment of its transcript: taking a stretch of what was said out (it becomes a part
 * `redacted`, see InterviewSegment.parts), taking the whole segment out, putting back what was taken out while its text is still known,
 * and the segment as raw text where `⟦ … ⟧` marks what was taken out.
 *
 * Offsets are in the text a reader SHOWS of the segment (see InterviewElement): each said part's text without its markup, a space
 * between two parts where the reader puts one, nothing for a part taken out. That is what a selection in the reader measures.
 */
export class InterviewEdits {
  /** What is said of a segment, as parts: its own, or its text as one, or none when it is taken out whole. */
  static partsOf(segment: InterviewSegment): InterviewSegmentPart[] {
    if (segment.parts) return segment.parts
    return segment.redacted ? [] : [{ text: segment.text ?? "" }]
  }

  /** Where each part stands in the text the reader shows, with the reader's own spacing between two parts. */
  static shownRanges(parts: readonly InterviewSegmentPart[]): ShownRange[] {
    const ranges: ShownRange[] = []
    let before = ""
    let at = 0
    parts.forEach((part, index) => {
      const text = "redacted" in part ? "▮" : InterviewFile.plain(part.text)
      if (/[\p{L}\p{N}.,;:!?)»”…▮]$/u.test(before) && /^[\p{L}\p{N}(«“▮]/u.test(text)) at += 1
      const length = "redacted" in part ? 0 : text.length
      ranges.push({ part: index, from: at, to: at + length })
      at += length
      before = text
    })
    return ranges
  }

  /** How many words a text has. */
  static words(text: string): number {
    return text.trim() === "" ? 0 : text.trim().split(/\s+/u).length
  }

  /**
   * Takes the stretch `[from, to)` of what the reader shows out of `segment`, with `reason`. The stretch has to lie within one part said:
   * returns what was taken out and which of the segment's parts taken out it now is (`nth`, counting only those), or undefined when it
   * does not (or is empty). The part is then plain text: offsets in a reader's text say
   * nothing of the markup around them. The moments the segment points at keep their moment and lose their range, which counted in `text`.
   */
  static redact(segment: InterviewSegment, from: number, to: number, reason: InterviewRedaction["reason"]): { text: string, nth: number } | undefined {
    const parts = [...InterviewEdits.partsOf(segment)]
    const range = InterviewEdits.shownRanges(parts).find(candidate => !("redacted" in parts[candidate.part]) && from >= candidate.from && to <= candidate.to)
    if (!range) return undefined
    const plain = InterviewFile.plain((parts[range.part] as { text: string }).text)
    // Whole words: a selection that starts or ends inside one takes it all, as a reader means it.
    const word = /[\p{L}\p{N}'’-]/u
    let start = from - range.from
    let end = to - range.from
    while (start > 0 && word.test(plain[start - 1]) && word.test(plain[start])) start--
    while (end < plain.length && word.test(plain[end]) && word.test(plain[end - 1])) end++
    const removed = plain.slice(start, end)
    if (removed.trim() === "") return undefined
    const before = plain.slice(0, start).trimEnd()
    const after = plain.slice(end).trimStart()
    const replacement: InterviewSegmentPart[] = [
      ...(before !== "" ? [{ text: before }] : []),
      { redacted: { reason, words: InterviewEdits.words(removed) } },
      ...(after !== "" ? [{ text: after }] : [])
    ]
    const nth = parts.slice(0, range.part).filter(part => "redacted" in part).length
    parts.splice(range.part, 1, ...replacement)
    InterviewEdits.setParts(segment, parts)
    return { text: removed.trim(), nth }
  }

  /** Takes the whole segment out, with `reason`: what it said goes, its speaker and times stay. Returns what it said, to put it back. */
  static redactWhole(segment: InterviewSegment, reason: InterviewRedaction["reason"]): string {
    const kept = JSON.stringify({ text: segment.text, parts: segment.parts })
    const words = InterviewEdits.partsOf(segment).reduce((sum, part) => sum + ("redacted" in part ? part.redacted.words ?? 0 : InterviewEdits.words(InterviewFile.plain(part.text))), 0)
    delete segment.text
    delete segment.parts
    segment.redacted = { reason, ...(words > 0 ? { words } : {}) }
    if (segment.refs) for (const ref of segment.refs) delete ref.range
    return kept
  }

  /** Puts back what `redactWhole` took out of `segment` (`kept` is what it returned). */
  static restoreWhole(segment: InterviewSegment, kept: string): void {
    const { text, parts } = JSON.parse(kept) as { text?: string, parts?: InterviewSegmentPart[] }
    delete segment.redacted
    if (parts) segment.parts = parts
    else segment.text = text ?? ""
  }

  /** Puts `text` back in place of the `nth` part taken out of `segment` (counting only those), joined to what is said around it. */
  static restorePart(segment: InterviewSegment, nth: number, text: string): void {
    const parts = [...InterviewEdits.partsOf(segment)]
    let seen = -1
    const index = parts.findIndex(part => "redacted" in part && ++seen === nth)
    if (index === -1) return
    parts.splice(index, 1, { text })
    InterviewEdits.setParts(segment, parts)
  }

  /** The segment as raw text: what is said as it is written, each part taken out as `⟦ … ⟧`, or as `⟦text⟧` when `known` still has it. */
  static raw(segment: InterviewSegment, known: (nth: number) => string | undefined = () => undefined): string {
    let nth = -1
    let raw = ""
    let before = ""
    for (const part of InterviewEdits.partsOf(segment)) {
      const text = "redacted" in part ? `⟦${known(++nth) ?? "…"}⟧` : part.text
      if (raw !== "" && !/\s$/u.test(before) && !/^\s/u.test(text)) raw += " "
      raw += text
      before = text
    }
    return raw
  }

  /**
   * Reads `raw` back into `segment`: what is outside `⟦ ⟧` is said, what is inside is taken out — kept as it was when it still reads `…`
   * (the n-th one keeps the n-th redaction the segment had), taken out anew with `reason` otherwise. Returns what was newly taken out, by
   * the order of the parts taken out, so that it can be put back.
   */
  static fromRaw(segment: InterviewSegment, raw: string, reason: InterviewRedaction["reason"]): Map<number, string> {
    const previous = InterviewEdits.partsOf(segment).filter((part): part is { redacted: InterviewRedaction } => "redacted" in part)
    const parts: InterviewSegmentPart[] = []
    const removed = new Map<number, string>()
    let nth = -1
    raw.split(/⟦([^⟧]*)⟧/u).forEach((piece, index) => {
      if (index % 2 === 0) {
        if (piece.trim() !== "") parts.push({ text: piece.trim() })
        return
      }
      nth++
      const inside = piece.trim()
      if (inside === "" || inside === "…" || inside === "...") parts.push({ redacted: previous[nth]?.redacted ?? { reason } })
      else {
        parts.push({ redacted: { reason, words: InterviewEdits.words(inside) } })
        removed.set(nth, inside)
      }
    })
    delete segment.redacted
    InterviewEdits.setParts(segment, parts)
    return removed
  }

  /** Writes `parts` in `segment`: as its `text` when nothing is taken out (two said parts that touch become one), as `parts` otherwise. */
  private static setParts(segment: InterviewSegment, parts: InterviewSegmentPart[]): void {
    const merged: InterviewSegmentPart[] = []
    for (const part of parts) {
      const last = merged[merged.length - 1]
      // No space before what is written against the word before it: a comma, a full stop, a closing bracket.
      const joint = !("redacted" in part) && /^[,.;:!?)»”…]/u.test(part.text) ? "" : " "
      if (last && !("redacted" in last) && !("redacted" in part)) merged[merged.length - 1] = { text: `${last.text}${joint}${part.text}`.replace(/\s+/gu, " ").trim() }
      else merged.push(part)
    }
    if (merged.some(part => "redacted" in part)) {
      segment.parts = merged
      delete segment.text
      if (segment.refs) for (const ref of segment.refs) delete ref.range
    } else {
      segment.text = merged.map(part => (part as { text: string }).text).join(" ")
      delete segment.parts
    }
  }
}
