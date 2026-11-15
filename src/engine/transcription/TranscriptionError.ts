/**
 * Why a transcription did not happen, as the editor says it in the reader's language:
 * - `noKey`: the service needs the reader's key, and none was typed;
 * - `key`: the service refused the key;
 * - `rateLimited`: the service asks to wait (a free plan's quota);
 * - `tooLarge`: the file is more than the page, or the service, can take at once;
 * - `unsupported`: this browser cannot run what is needed;
 * - `failed`: anything else, `detail` saying what.
 */
export type TranscriptionErrorCode = "noKey" | "key" | "rateLimited" | "tooLarge" | "unsupported" | "failed"

export class TranscriptionError extends Error {
  constructor(readonly code: TranscriptionErrorCode, readonly detail?: string) {
    super(detail ? `${code}: ${detail}` : code)
    this.name = "TranscriptionError"
  }
}
