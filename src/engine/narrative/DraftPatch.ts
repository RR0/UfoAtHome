import type { SightingRecordingJson } from "../persistence/sightingJson.js"

/** A plain JSON object — what this walks into. Anything else (array, primitive, null) is a leaf. */
type JsonObject = Record<string, unknown>

/**
 * Writes a draft into a recording without undoing the author's own edits.
 *
 * The first draft can simply be applied: there is nothing yet to lose. Every draft after it is a
 * correction, and a correction comes back WHOLE — ask for the altitude to be raised and the answer
 * restates the witness, the place and the tags along with it, exactly as they were proposed the
 * round before. Applying that wholesale would silently undo the name the author fixed by hand in
 * between: the value did not change in the model's eyes, so it would arrive looking like an
 * assertion when it is only an echo.
 *
 * So a correction is narrowed to what actually moved between the two drafts, and only those paths
 * are written. Everything else in the editor is left exactly as the author left it.
 *
 * Two rules make this tractable:
 *
 * - Objects are walked, arrays and primitives are not. A changed `timeline.keyframes` is written in
 *   full rather than element by element, and the same for `place`, `tags` and `milestones`. Element
 *   correspondence across two independently produced arrays is a guess, and a wrong guess here
 *   corrupts a recording rather than merely annoying somebody. The protection that matters is that
 *   a correction about the timeline leaves `witness.title` alone, and this gives it.
 * - Nothing is ever deleted. A field the new draft does not mention is not a retraction — it is far
 *   more often a field nobody was talking about this round. Removing a value asks for a keystroke
 *   in the editor, which is cheap; recovering one that vanished on its own does not.
 */
export class DraftPatch {

  /** The paths whose value differs between `before` and `after`, dot-joined and outermost-first
   * ("witness.title", "timeline.keyframes"). A path stated only in `after` counts as changed; one
   * stated only in `before` does not, per the no-deletion rule above. */
  static changed(before: Partial<SightingRecordingJson>, after: Partial<SightingRecordingJson>): string[] {
    return DraftPatch.changedIn(before as JsonObject, after as JsonObject, [])
  }

  /** All the paths `draft` states — what to write when there is no previous draft to compare it
   * with, i.e. the first time. */
  static stated(draft: Partial<SightingRecordingJson>): string[] {
    return DraftPatch.changedIn({}, draft as JsonObject, [])
  }

  /**
   * `recording` with `paths` taken from `draft` — a new object; neither argument is touched.
   *
   * A path `draft` does not actually state is skipped rather than written as undefined: callers pass
   * the output of {@link changed}, which can name a path that was in the earlier draft only.
   */
  static apply(
    recording: SightingRecordingJson, draft: Partial<SightingRecordingJson>, paths: string[]
  ): SightingRecordingJson {
    const patched = structuredClone(recording) as SightingRecordingJson
    for (const path of paths) {
      const steps = path.split(".")
      const value = DraftPatch.read(draft as JsonObject, steps)
      if (value === undefined) {
        continue
      }
      DraftPatch.write(patched as unknown as JsonObject, steps, structuredClone(value))
    }
    return patched
  }

  private static changedIn(before: JsonObject, after: JsonObject, at: string[]): string[] {
    const paths: string[] = []
    for (const [key, next] of Object.entries(after)) {
      if (next === undefined) {
        continue
      }
      const here = [...at, key]
      const previous = before[key]
      if (DraftPatch.isPlainObject(next) && DraftPatch.isPlainObject(previous)) {
        paths.push(...DraftPatch.changedIn(previous, next, here))
      } else if (DraftPatch.isPlainObject(next) && previous === undefined) {
        // Wholly new object: name its leaves rather than the object, so that a later round adding a
        // sibling key doesn't have to restate the ones already applied.
        paths.push(...DraftPatch.changedIn({}, next, here))
      } else if (!DraftPatch.same(previous, next)) {
        paths.push(here.join("."))
      }
    }
    return paths
  }

  /** Value equality, by serialisation. Fine for this format, which is JSON by definition, and it
   * is the same comparison a reader makes when they look at two files. */
  private static same(a: unknown, b: unknown): boolean {
    return JSON.stringify(a ?? null) === JSON.stringify(b ?? null)
  }

  private static isPlainObject(value: unknown): value is JsonObject {
    return typeof value === "object" && value !== null && !Array.isArray(value)
  }

  private static read(from: JsonObject, steps: string[]): unknown {
    let at: unknown = from
    for (const step of steps) {
      if (!DraftPatch.isPlainObject(at)) {
        return undefined
      }
      at = at[step]
    }
    return at
  }

  private static write(into: JsonObject, steps: string[], value: unknown): void {
    let at = into
    for (const step of steps.slice(0, -1)) {
      const next = at[step]
      if (!DraftPatch.isPlainObject(next)) {
        at[step] = {}
      }
      at = at[step] as JsonObject
    }
    at[steps[steps.length - 1]] = value
  }
}
