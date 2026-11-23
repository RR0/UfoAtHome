/**
 * The SHA-256 of a recording, in hexadecimal: what a result computed on it says it was computed on (see OrientationAccount.digest).
 *
 * Of the file's text when there is one, since that is what was sent; of an object, of its JSON with the keys of every object in order, so that the
 * same recording read twice gives the same digest whatever order its fields were written in.
 */
export class RecordingDigest {

  static async of(recording: string | object): Promise<string> {
    const text = typeof recording === "string" ? recording : RecordingDigest.canonical(recording)
    const hash = await globalThis.crypto.subtle.digest("SHA-256", new TextEncoder().encode(text))
    return [...new Uint8Array(hash)].map(byte => byte.toString(16).padStart(2, "0")).join("")
  }

  /** JSON with the keys of every object sorted. */
  static canonical(value: unknown): string {
    return JSON.stringify(value, (_, item: unknown) => item !== null && typeof item === "object" && !Array.isArray(item)
      ? Object.fromEntries(Object.entries(item as Record<string, unknown>).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0))
      : item)
  }
}
