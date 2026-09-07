/**
 * What went wrong reading an account, in the terms the reader has to act on.
 *
 * Same shape and same reasoning as SightingFetchError: five quite different problems used to reach
 * a reader as one apologetic sentence, and the only ones worth telling apart are the ones whose fix
 * differs. A bad key is the reader's to fix; a rate limit is theirs to wait out; a refusal is
 * nobody's to fix by retrying.
 */
export type NarrativeErrorKind =
  /** No key, or one the API rejected. The reader fixes this, and only they can. */
  | "credential"
  /** Too many calls, or the account's own limit. Waiting works; retrying at once does not. */
  | "rate-limited"
  /** The provider declined to answer. Rephrasing may work; repeating will not. */
  | "refused"
  /** An answer came back that is not a draft. Asking again is reasonable — this one is chance. */
  | "malformed"
  /** Nothing answered: offline, blocked, or the service is down. */
  | "unreachable"
  /** The reader pressed Stop. Not shown as a failure. */
  | "cancelled"
  /**
   * The service refused the request and said why.
   *
   * Its own words are shown, which is unusual here and deliberate: a refusal like "this API key is
   * not scoped to a workspace, so this request must include the anthropic-workspace-id header"
   * names the field to fill, and no wording of ours could do better without going stale the day the
   * API adds a reason. Carried on {@link NarrativeError.detail}.
   */
  | "rejected"

export class NarrativeError extends Error {

  /** What the service said, for "rejected" — the only kind that carries anything. */
  readonly detail?: string

  constructor(kind: "rejected", detail: string, cause?: unknown)
  constructor(kind: Exclude<NarrativeErrorKind, "rejected">, cause?: unknown)
  constructor(readonly kind: NarrativeErrorKind, detailOrCause?: unknown, cause?: unknown) {
    const detail = kind === "rejected" && typeof detailOrCause === "string" ? detailOrCause : undefined
    const actual = kind === "rejected" ? cause : detailOrCause
    super(detail ?? kind, actual === undefined ? undefined : { cause: actual })
    this.name = "NarrativeError"
    this.detail = detail
  }
}
