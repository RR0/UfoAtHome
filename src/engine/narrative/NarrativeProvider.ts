import type { SightingRecordingJson } from "../persistence/sightingJson.js"
import type { Basis } from "../persistence/Provenance.js"
import type { SaidText } from "../model/SaidText.js"

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
 * What it does NOT mean is that only quotable values may be written. A observer saying "a few
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
   * the point, since it is the observer's sentence that is the evidence. */
  rationale: string
}

/** What a provider makes of an account: a recording, why each of its values is there, and what it
 * refused to fill in. */
export interface NarrativeDraft {
  /** The recording, filled in as far as the account and honest reasoning reach. Partial still: a
   * field nothing at all bears on is left out rather than invented, and every field that IS here
   * has a claim saying whether the observer said it, it was worked out, or it was guessed. */
  recording: Partial<SightingRecordingJson>
  claims: NarrativeClaim[]
  /** What nothing could settle — not even a guess worth making. Narrower than it used to be, now
   * that an unsupported value is written and marked "assumed" rather than withheld: what is left
   * here is what the reconstruction does not even have a shape for. */
  gaps: string[]
}

/** One ask: an account, read whole. */
export interface NarrativeRequest {
  /** The account in prose, in the observer's own words — the recording's own `description`, which
   * is where a account has always belonged (see SightingEvent.description). There is no second
   * kind of ask: reworking a draft means rewording the account and reading it again, because the
   * account is the only thing here anybody actually observered. */
  ask: string
  images?: NarrativeImage[]
  /**
   * What the editor holds right now, so that a draft does not contradict what is already settled —
   * coordinates geocoded to the metre, an instrument chosen, decor placed. None of that is in a
   * account and none of it is the account's to overrule. Providers send a digest rather than the
   * file (see RecordingDigest: Socorro's own recording is 62 KB, 44 of them keyframes, and none of
   * those keyframes is something an account can be checked against).
   */
  current?: SightingRecordingJson
  /** BCP 47 tag the prose parts — `description`, and the gaps — should come back in. Defaults to
   * the account's own language, which is usually right and occasionally is not. */
  language?: string
  /**
   * The values the reader gave the provider's own settings (see NarrativeProvider.settings), by
   * setting id: a key, a workspace, a model. Whose key pays for this call is always the visitor's
   * own: nothing in this project holds a credential for anybody else.
   */
  settings: Readonly<Record<string, string>>
}

/**
 * One option a provider needs from the reader, described rather than built: the editor renders
 * every provider's settings the same way, so that registering a second provider (a local model, a
 * report-form parser) does not also mean adding its fields to the editor.
 */
export interface NarrativeSetting {
  /** Stable id: the key in NarrativeRequest.settings, and in what is stored on the device. */
  id: string
  /** A password field, a plain one, or a list to pick from. */
  kind: "secret" | "text" | "choice"
  label: SaidText
  placeholder?: SaidText
  /** What the field is for, shown as its tooltip. */
  hint?: SaidText
  /** For a "choice": the values and how each is named. The first is the default. */
  choices?: ReadonlyArray<{ value: string, label: SaidText }>
  /** A draft cannot be asked for while this is empty; the button says which setting is missing. */
  required?: boolean
  /**
   * Whether the value may outlive the page. "credential": only when the reader ticks the box that
   * says so, and forgotten the moment it is unticked. "preference": always, like any other choice
   * of theirs (a model picked). Absent: never.
   */
  remembered?: "credential" | "preference"
  /** A warning for a value that looks wrong (a key without its service's prefix): shown, never
   * enforced, since the day the format changes a refusal would be the bug. */
  suspect?(value: string): SaidText | undefined
}

/**
 * A source that turns an account in prose into a draft recording — one interchangeable
 * implementation, registered like every other data source in this project (see narrativeSources.ts,
 * and DataSource's own doc comment on why the picker exists with a single entry in it).
 *
 * Why this is a seam and not a function: what reads an account is the most obviously provisional
 * thing in the editor. Today it is a language model the reader pays for themselves; it could be a
 * local one, a parser for a report form some association publishes, or nothing at all. None of that
 * is allowed to reach the recording, which states what a observer said and must outlive every
 * fashion in how the saying got typed up.
 */
export interface NarrativeProvider {
  /** What this provider needs from the reader before it can draft — see NarrativeSetting. */
  readonly settings: ReadonlyArray<NarrativeSetting>

  /** Reads `request` and proposes a recording — never its `description`, which is the account it
   * was just handed. Rejects on refusal, on a bad credential, and on an answer that is not a draft;
   * `signal` aborts a call in flight. */
  draft(request: NarrativeRequest, signal?: AbortSignal): Promise<NarrativeDraft>
}
