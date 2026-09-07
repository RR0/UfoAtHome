import type { SightingRecordingJson } from "../persistence/sightingJson.js"
import type { Basis } from "../persistence/Provenance.js"

/** One image the account came with — a photograph, or a frame pulled out of a film. */
export interface NarrativeImage {
  /** What the bytes are. Only what the reader's provider accepts, which is why it is a union and
   * not a free string: an unsupported type is a rejected call, not a degraded one. */
  mediaType: "image/jpeg" | "image/png" | "image/gif" | "image/webp"
  /** The bytes, base64, WITHOUT the `data:…;base64,` prefix a FileReader would leave on. */
  data: string
}

/**
 * One value a draft proposes, and where it came from.
 *
 * This is the whole reason the interface returns something richer than a recording. A reconstruction
 * that cannot say where each of its numbers came from is indistinguishable from one that invented
 * them, and this format exists precisely so that the difference stays visible.
 *
 * What it does NOT mean is that only quotable values may be written. A witness saying "a few
 * minutes" has given no duration and a timeline needs one; one saying the thing barred the road has
 * given no angle, though a carriageway's width and a plausible distance bound one within a few
 * degrees. Leaving those empty produced a recording that could not play, which is a worse answer
 * than a marked guess. So a draft fills what it can and says of each value which of the three it is
 * — see Basis, whose vocabulary this shares and which is what ends up in the file.
 */
export interface NarrativeClaim {
  /** Where the value goes, as a path into SightingRecordingJson — "time.hour", "place.0.lat",
   * "timeline.keyframes.1.shapes.0.shape.angular.widthDeg". The same vocabulary Provenance stores
   * paths in, so a claim needs no translation to be kept. */
  path: string
  basis: Basis
  /** Why this value and why that basis: the account's own words for a stated one, the working for a
   * derived one ("a 5.5 m carriageway at 20-100 m spans 15 to 3 degrees; 8 taken"), what the guess
   * was chosen for in an assumed one. Quoted verbatim where it quotes: a paraphrase would defeat
   * the point, since it is the witness's sentence that is the evidence. */
  rationale: string
}

/** What a provider makes of an account: a recording, why each of its values is there, and what it
 * refused to fill in. */
export interface NarrativeDraft {
  /** The recording, filled in as far as the account and honest reasoning reach. Partial still: a
   * field nothing at all bears on is left out rather than invented, and every field that IS here
   * has a claim saying whether the witness said it, it was worked out, or it was guessed. */
  recording: Partial<SightingRecordingJson>
  claims: NarrativeClaim[]
  /** What nothing could settle — not even a guess worth making. Narrower than it used to be, now
   * that an unsupported value is written and marked "assumed" rather than withheld: what is left
   * here is what the reconstruction does not even have a shape for. */
  gaps: string[]
}

/** One ask: an account, read whole. */
export interface NarrativeRequest {
  /** The account in prose, in the witness's own words — the recording's own `description`, which
   * is where a testimony has always belonged (see SightingEvent.description). There is no second
   * kind of ask: reworking a draft means rewording the account and reading it again, because the
   * account is the only thing here anybody actually witnessed. */
  ask: string
  images?: NarrativeImage[]
  /**
   * What the editor holds right now, so that a draft does not contradict what is already settled —
   * coordinates geocoded to the metre, an instrument chosen, decor placed. None of that is in a
   * testimony and none of it is the account's to overrule. Providers send a digest rather than the
   * file (see RecordingDigest: Socorro's own recording is 62 KB, 44 of them keyframes, and none of
   * those keyframes is something an account can be checked against).
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
  /**
   * Which of a credential's several accounts the call belongs to, when the service needs telling.
   *
   * Anthropic's own case, and the reason this exists: a key that is not scoped to a single
   * workspace is refused outright unless the request names one. It is a property of the reader's
   * key rather than of anything they asked, so it sits beside the credential and not in the ask.
   * Ignored by providers, and by keys, that need none.
   */
  credentialScope?: string
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

  /** True when {@link NarrativeRequest.credentialScope} is worth offering — what puts the field in
   * front of a reader whose key might need it, rather than in front of everybody. */
  readonly acceptsCredentialScope: boolean

  /** Reads `request` and proposes a recording — never its `description`, which is the account it
   * was just handed. Rejects on refusal, on a bad credential, and on an answer that is not a draft;
   * `signal` aborts a call in flight. */
  draft(request: NarrativeRequest, signal?: AbortSignal): Promise<NarrativeDraft>
}
