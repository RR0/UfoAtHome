import type { SightingRecordingJson } from "./sightingJson.js"
import { TextEnds } from "./TextEnds.js"
import { KeyframeCompletion } from "../model/KeyframeCompletion.js"
import type { Keyframe } from "../model/Keyframe.js"

/**
 * A recording as the text of its file, the very text `JSON.stringify(json, null, 2)` writes, without writing again what was
 * written already: the text of each keyframe of the timeline is kept as long as the keyframe is the same object.
 *
 * A keyframe is never changed in place, only replaced (see Timeline.addKeyframe, and SightingShapes, which leaves alone what it does
 * not change): the same object is the same keyframe, and its text still holds. A recording made by recording a take is mostly its
 * keyframes, millions of characters of them, and an edit of the form changes one of them, or none.
 */
export class RecordingText {
  /** What stands for the keyframes while the rest is written, and where they go in. */
  private static readonly MARK = "\u0000rr0-keyframes\u0000"

  /** The text of each keyframe already written, with the indentation it was written at. */
  private readonly written = new WeakMap<object, { indent: string, text: string }>()
  /** The keyframes last written all together, and their text: the same keyframes in the same order are the same text. */
  private lastKeyframes: readonly object[] = []
  private lastIndent = ""
  private lastJoined = ""

  /**
   * `keyframes`: "thin" writes each keyframe as stating only what changed since the one before (see KeyframeCompletion.thin), which is
   * how a recording is written by hand and how it is read; "whole" writes every keyframe as it is held in memory, every field of every
   * shape, which says it all at each instant at the price of its size. `boxDrawnAgain`, thin, leaves out the boxes and outlines
   * loading draws again by itself (see SightingShapes.derivable).
   */
  of(json: SightingRecordingJson, keyframes: "thin" | "whole" = "whole", boxDrawnAgain?: (keyframe: number, sourceId: string) => boolean): string {
    if (keyframes === "thin" && json.timeline?.keyframes?.length) {
      // Small once thin: written whole each time, nothing kept.
      const thin = KeyframeCompletion.thin(json.timeline.keyframes as Keyframe[], boxDrawnAgain)
      return JSON.stringify({ ...json, timeline: { ...json.timeline, keyframes: thin } }, null, 2)
    }
    return this.wholeOf(json)
  }

  private wholeOf(json: SightingRecordingJson): string {
    const keyframes = json.timeline?.keyframes
    if (!keyframes || keyframes.length === 0) return JSON.stringify(json, null, 2)
    const text = JSON.stringify({ ...json, timeline: { ...json.timeline, keyframes: RecordingText.MARK } }, null, 2)
    const at = text.indexOf(JSON.stringify(RecordingText.MARK))
    const lineStart = text.lastIndexOf("\n", at) + 1
    const lineIndent = /^ */.exec(text.slice(lineStart, at))![0]
    const indent = `${lineIndent}  `
    return `${text.slice(0, at)}[\n${indent}${this.joined(keyframes, indent)}\n${lineIndent}]${text.slice(at + JSON.stringify(RecordingText.MARK).length)}`
  }

  private joined(keyframes: readonly object[], indent: string): string {
    const same = indent === this.lastIndent && keyframes.length === this.lastKeyframes.length
      && keyframes.every((keyframe, i) => keyframe === this.lastKeyframes[i])
    if (!same) {
      this.lastJoined = keyframes.map(keyframe => this.keyframeText(keyframe, indent)).join(`,\n${indent}`)
      // A copy: the timeline's own list is spliced in place, and would be the same list after it changed.
      this.lastKeyframes = [...keyframes]
      this.lastIndent = indent
    }
    return this.lastJoined
  }

  /**
   * The fields of the recording that are not written the same in the two texts, both written as this writes them; undefined when
   * either is laid out otherwise (typed by hand), and the fields cannot be told apart by their place. A field is a line at the
   * first indentation and all the deeper ones after it: nothing else starts a line with two spaces and a quote, a string's own line
   * breaks being written `\n`.
   */
  static changedFields(before: string, after: string): string[] | undefined {
    if (!RecordingText.laidOut(before) || !RecordingText.laidOut(after)) return undefined
    const prefix = TextEnds.commonPrefix(before, after)
    if (prefix === before.length && prefix === after.length) return []
    const suffix = TextEnds.commonSuffix(before, after, Math.min(before.length, after.length) - prefix)
    // From the start of the field the first difference is in to the start of the field after the last one: only there are fields
    // looked for, which for a name changed is a line or two of fourteen million characters.
    const from = before.lastIndexOf(RecordingText.FIELD_START, prefix)
    if (from === -1) return undefined
    const next = before.indexOf(RecordingText.FIELD_START, before.length - suffix)
    const beforeEnd = next === -1 ? before.length - 2 : next
    const afterEnd = after.length - (before.length - beforeEnd)
    // Whole fields on both sides: those written the same are not changed, though the difference is next to them (one inserted before).
    const a = RecordingText.spansIn(before.slice(from, beforeEnd))
    const b = RecordingText.spansIn(after.slice(from, afterEnd))
    return [...new Set([...a.keys(), ...b.keys()])].filter(key => a.get(key) !== b.get(key))
  }

  /** What starts a field of the recording, and nothing else: a line at the first indentation, opening a key. */
  private static readonly FIELD_START = '\n  "'

  private static laidOut(text: string): boolean {
    return text.startsWith(`{${RecordingText.FIELD_START}`) && text.endsWith("\n}")
  }

  /** Each field of `part`, which starts a field and ends where one ends, with what is written of it: up to the next one, its comma left out. */
  private static spansIn(part: string): Map<string, string> {
    const starts: { key: string, at: number }[] = []
    const field = /\n {2}"((?:[^"\\]|\\.)*)": /g
    for (let match = field.exec(part); match; match = field.exec(part)) starts.push({ key: JSON.parse(`"${match[1]}"`) as string, at: match.index })
    const spans = new Map<string, string>()
    starts.forEach(({ key, at }, i) => {
      const span = part.slice(at, i + 1 < starts.length ? starts[i + 1].at : part.length)
      spans.set(key, span.endsWith(",") ? span.slice(0, -1) : span)
    })
    return spans
  }

  /**
   * The values of `fields` in `text`, laid out as this writes it, each read from its own lines alone: a name changed in a recording
   * of fourteen million characters is not a reason to read them all. Undefined when the text is laid out otherwise.
   */
  static valuesOf(text: string, fields: readonly string[]): Record<string, unknown> | undefined {
    if (!RecordingText.laidOut(text)) return undefined
    const all = RecordingText.spansIn(text.slice(1, text.length - 2))
    const values: Record<string, unknown> = {}
    for (const field of fields) {
      const span = all.get(field)
      if (span === undefined) continue
      // `\n  "key": value`, its comma already left out.
      const value = span.slice(span.indexOf(": ") + 2)
      values[field] = JSON.parse(value)
    }
    return values
  }

  private keyframeText(keyframe: object, indent: string): string {
    const known = this.written.get(keyframe)
    if (known?.indent === indent) return known.text
    const text = JSON.stringify(keyframe, null, 2).replaceAll("\n", `\n${indent}`)
    this.written.set(keyframe, { indent, text })
    return text
  }
}
