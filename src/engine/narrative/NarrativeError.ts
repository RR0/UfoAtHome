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

export class NarrativeError extends Error {

  constructor(readonly kind: NarrativeErrorKind, cause?: unknown) {
    super(kind, cause === undefined ? undefined : { cause })
    this.name = "NarrativeError"
  }
}
