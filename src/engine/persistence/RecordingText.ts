import type { SightingRecordingJson } from "./sightingJson.js"

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

  of(json: SightingRecordingJson): string {
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

  private keyframeText(keyframe: object, indent: string): string {
    const known = this.written.get(keyframe)
    if (known?.indent === indent) return known.text
    const text = JSON.stringify(keyframe, null, 2).replaceAll("\n", `\n${indent}`)
    this.written.set(keyframe, { indent, text })
    return text
  }
}
