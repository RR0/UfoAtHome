import type { SightingRecordingJson } from "../persistence/sightingJson.js"

/** A plain JSON object — what this walks into. Anything else (array, primitive, null) is a leaf. */
type JsonObject = Record<string, unknown>

/**
 * Writes a draft into a recording without undoing what the account never spoke about.
 *
 * A draft states only what the account states, so applying one is not a replacement: it is writing
 * the paths it names and leaving every other path exactly as the author left it. That distinction
 * is the whole of this class, and it is what lets a reader reword their account and press the
 * button again without losing a place they geocoded to the metre, an instrument they chose, or
 * decor they placed. None of those are in a testimony, so no reading of one may touch them.
 *
 * Two rules make it tractable:
 *
 * - Objects are walked, arrays and primitives are not. A stated `timeline.keyframes` is written in
 *   full rather than element by element, and the same for `place`, `tags` and `milestones`. Element
 *   correspondence between an array the account produced and one already in the file is a guess,
 *   and a wrong guess here corrupts a recording rather than merely annoying somebody.
 * - Nothing is ever deleted. Silence in a draft is the ACCOUNT's silence — the witness did not say
 *   how long it lasted — and that is not an instruction to forget a duration somebody established
 *   another way. Removing a value asks for a keystroke in the editor, which is cheap; recovering
 *   one that vanished on its own does not.
 */
export class DraftPatch {

  /** Every path `draft` actually states, dot-joined and outermost-first ("witness.title",
   * "timeline.keyframes") — what {@link apply} is meant to be given. */
  static stated(draft: Partial<SightingRecordingJson>): string[] {
    return DraftPatch.statedIn(draft as JsonObject, [])
  }

  /**
   * `recording` with `paths` taken from `draft` — a new object; neither argument is touched.
   *
   * A path `draft` does not actually state is skipped rather than written as undefined, so a stale
   * path list can never blank a value out.
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

  /** The leaves, never the objects holding them: naming `witness` would write the whole of it and
   * take with it any sibling key the account happens not to mention. */
  private static statedIn(draft: JsonObject, at: string[]): string[] {
    const paths: string[] = []
    for (const [key, value] of Object.entries(draft)) {
      if (value === undefined) {
        continue
      }
      const here = [...at, key]
      if (DraftPatch.isPlainObject(value)) {
        paths.push(...DraftPatch.statedIn(value, here))
      } else {
        paths.push(here.join("."))
      }
    }
    return paths
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
