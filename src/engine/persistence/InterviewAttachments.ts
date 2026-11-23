import type { InterviewAttachment } from "./interviewJson.js"

/**
 * The files given in this page to the turns of interviews (see InterviewSegment.files) that are on nobody's disk but the giver's yet: a witness's map,
 * sketch or photo, picked from their disk. Each is kept here by its whole address (its `src` read against its interview's file) until the case is
 * saved, which writes it beside the interview (see CaseSession), and shown meanwhile from memory. One per page.
 */
export class InterviewAttachments {
  private static readonly given = new Map<string, { blob: Blob, shown?: string }>()

  /**
   * A file picked from the giver's disk, as a turn of the interview at `interviewUrl` holds it: `src` beside that file, in a directory named after
   * it (`interview-qb.json` → `interview-qb-files/sketch.jpg`), its name made unique there.
   */
  static add(file: File, interviewUrl: string): InterviewAttachment {
    const stem = decodeURIComponent(interviewUrl.replace(/[?#].*$/, "").replace(/^.*\//, "")).replace(/\.json$/i, "") || "interview"
    const safe = file.name.replace(/[\\/:*?"<>|#%]+/g, "_").trim() || "file"
    let src = `${stem}-files/${safe}`
    for (let n = 2; InterviewAttachments.given.has(new URL(encodeURI(src), interviewUrl).href); n++) src = `${stem}-files/${safe.replace(/(\.[^.]*)?$/, `-${n}$1`)}`
    InterviewAttachments.given.set(new URL(encodeURI(src), interviewUrl).href, { blob: file })
    return { src, name: file.name, ...(file.type ? { type: file.type } : {}) }
  }

  /** Where `file`, held by the interview at `interviewUrl`, can be shown from: memory when it was given in this page, its address otherwise. */
  static shown(file: InterviewAttachment, interviewUrl: string | undefined): string {
    const url = InterviewAttachments.url(file, interviewUrl)
    const given = InterviewAttachments.given.get(url)
    if (!given) return url
    given.shown ??= URL.createObjectURL(given.blob)
    return given.shown
  }

  /** The whole address of `file`, held by the interview at `interviewUrl`. */
  static url(file: InterviewAttachment, interviewUrl: string | undefined): string {
    try {
      return new URL(/^[a-z][a-z0-9+.-]*:/i.test(file.src) ? file.src : encodeURI(file.src), interviewUrl ?? (typeof location === "undefined" ? undefined : location.href)).href
    } catch {
      return file.src
    }
  }

  /** The file given in this page at `url` (a whole address), if one was: what saving its case writes there. */
  static blob(url: string): Blob | undefined {
    return InterviewAttachments.given.get(url)?.blob
  }

  /** Forgets them all (a test). */
  static clear(): void {
    for (const { shown } of InterviewAttachments.given.values()) if (shown) URL.revokeObjectURL(shown)
    InterviewAttachments.given.clear()
  }
}
