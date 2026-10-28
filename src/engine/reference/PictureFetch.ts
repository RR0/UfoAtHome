/**
 * Why a picture could not be read, said so that its author can do something about it:
 * - "notShared": its site answers, but does not let other sites read it (no CORS header): saving it and adding it as a file works;
 * - "unreachable": no answer at all (a wrong address, a site down, no network);
 * - "status": the site answered with an error (404 for a picture that is not there, 403 for one it refuses);
 * - "notPicture": what came back is not a picture the browser can decode.
 */
export type PictureFailure =
  | { kind: "notShared" }
  | { kind: "unreachable" }
  | { kind: "status", status: number }
  | { kind: "notPicture" }

/** A picture that could not be read, and why. */
export class PictureFetchError extends Error {
  constructor(readonly src: string, readonly failure: PictureFailure) {
    super(`${src}: ${failure.kind === "status" ? failure.status : failure.kind}`)
  }
}

/**
 * Reads a picture's bytes across sites, as WebGL and a canvas that is read back both insist on, and tells why it could not.
 */
export class PictureFetch {
  /** The picture's bytes, or a PictureFetchError saying why not. */
  static async blob(src: string): Promise<Blob> {
    let response: Response
    try {
      response = await fetch(src)
    } catch {
      throw new PictureFetchError(src, await PictureFetch.whyUnread(src))
    }
    if (!response.ok) throw new PictureFetchError(src, { kind: "status", status: response.status })
    const blob = await response.blob()
    if (blob.type && !blob.type.startsWith("image/")) throw new PictureFetchError(src, { kind: "notPicture" })
    return blob
  }

  /** A failure of whatever reading the picture: its own when it was one of these, else that it is not a picture. */
  static failureOf(error: unknown): PictureFailure {
    return error instanceof PictureFetchError ? error.failure : { kind: "notPicture" }
  }

  /**
   * Why a fetch that did not even get a response failed: the browser says the same for a site that does not share its pictures and for
   * one that does not answer. Asked again without asking to read it (an opaque answer), the first answers and the second still does not.
   */
  private static async whyUnread(src: string): Promise<PictureFailure> {
    try {
      await fetch(src, { mode: "no-cors" })
      return { kind: "notShared" }
    } catch {
      return { kind: "unreachable" }
    }
  }
}
