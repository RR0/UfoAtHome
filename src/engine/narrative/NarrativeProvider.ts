import type { SightingRecordingJson } from "../persistence/sightingJson.js"

/** One image the account came with — a photograph, or a frame pulled out of a film. */
export interface NarrativeImage {
  /** What the bytes are. Only what the reader's provider accepts, which is why it is a union and
   * not a free string: an unsupported type is a rejected call, not a degraded one. */
  mediaType: "image/jpeg" | "image/png" | "image/gif" | "image/webp"
  /** The bytes, base64, WITHOUT the `data:…;base64,` prefix a FileReader would leave on. */
  data: string
}

/**
 * One thing a draft asserts, and the words of the account that justify it.
 *
 * This is the whole reason the interface returns something richer than a recording. A reconstruction
 * that cannot say where each of its numbers came from is indistinguishable from one that invented
 * them, and this format exists precisely so that the difference stays visible — a shape carries the
 * angle a witness stated, not a size someone found plausible. So a provider that proposes
 * `angular.widthDeg` has to be able to quote the sentence it read it in; what it cannot quote goes
 * in {@link NarrativeDraft.gaps} and stays unset.
 */
export interface NarrativeClaim {
  /** Where the value goes, as a path into SightingRecordingJson — "time.hour", "place.0.name",
   * "timeline.keyframes.1.shapes.0.shape.angular.widthDeg". */
  path: string
  /** The account's own words that state it, quoted verbatim so a reader can find them again. A
   * paraphrase would defeat the point: it is the witness's sentence that is the evidence. */
  quote: string
}

/** What a provider makes of an account: a recording, why each of its values is there, and what it
 * refused to fill in. */
export interface NarrativeDraft {
  /** The recording as the account states it, and no further. Partial on purpose — an account that
   * does not give the year has no `time.year`, and a draft that supplied one would be lying about
   * where it came from. */
  recording: Partial<SightingRecordingJson>
  claims: NarrativeClaim[]
  /** What the account does not say, in the reader's own language — "the account gives no duration",
   * "the direction the witness faced is never stated". Listed rather than guessed: this is the
   * to-do list for the person who goes back to the source, and it is worth as much as the draft. */
  gaps: string[]
}

/** One earlier round, so that a correction reads as a correction of THIS and not as a fresh
 * account. Held by the caller, since the Messages API remembers nothing between calls. */
export interface NarrativeExchange {
  /** What was asked that round — the account itself on the first, a correction after that. */
  request: string
  /** The recording that answered it. */
  draft: Partial<SightingRecordingJson>
}

/** One ask: an account, or a correction to what an earlier ask produced. */
export interface NarrativeRequest {
  /** The account in prose, or — when `history` is not empty — what to change about the last draft. */
  ask: string
  images?: NarrativeImage[]
  /** Earlier rounds, oldest first. Empty or absent on the first ask. */
  history?: NarrativeExchange[]
  /**
   * What the editor holds RIGHT NOW, which is not the same thing as the last draft: between two
   * rounds the author may have fixed a name, moved a shape or set a time by hand, and a correction
   * applied to the superseded draft would quietly undo all of it. Providers send a digest of this
   * rather than the file (see RecordingDigest — Socorro's own recording is 62 KB, 44 of them
   * keyframes, and resending it every round would pay for the timeline over and over).
   */
  current?: SightingRecordingJson
  /** BCP 47 tag the prose parts — `description`, and the gaps — should come back in. Defaults to
   * the account's own language, which is usually right and occasionally is not. */
  language?: string
  /**
   * Whose key pays for this call. The visitor's own, always: nothing in this project holds a
   * credential for anybody else, and a provider that needed one hosted somewhere would be a
   * different implementation with a different name. Ignored by providers that need none.
   */
  credential?: string
}

/**
 * A source that turns an account in prose into a draft recording — one interchangeable
 * implementation, registered like every other data source in this project (see narrativeSources.ts,
 * and DataSource's own doc comment on why the picker exists with a single entry in it).
 *
 * Why this is a seam and not a function: what reads an account is the most obviously provisional
 * thing in the editor. Today it is a language model the reader pays for themselves; it could be a
 * local one, a parser for a report form some association publishes, or nothing at all. None of that
 * is allowed to reach the recording, which states what a witness said and must outlive every
 * fashion in how the saying got typed up.
 */
export interface NarrativeProvider {
  /** True when {@link NarrativeRequest.credential} has to be set for `draft` to work — what the
   * editor asks the reader for a key on, rather than hardcoding that Claude in particular needs
   * one. */
  readonly needsCredential: boolean

  /** Reads `request` and proposes a recording. Rejects on refusal, on a bad credential, and on an
   * answer that is not a draft; `signal` aborts a call in flight. */
  draft(request: NarrativeRequest, signal?: AbortSignal): Promise<NarrativeDraft>
}
