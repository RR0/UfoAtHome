/**
 * What a recording's tags are CALLED, for one language.
 *
 * A tag is stored in English and is a technical term, not prose: two recordings that share one
 * have to match on it — that is the whole of what a tag is for — and translations do not compare
 * equal, so the file cannot hold the reader's word for it (see SightingEvent.tags, and rr0.org's
 * own `tag-<slug>` filtering, which works the same way).
 *
 * Which leaves the reader's word to be found here, keyed by the stored one. A tag no dictionary
 * knows is shown exactly as it is stored — that is not a failure: "RR3", "NL" and "Blue Book 8729"
 * are the same in every language, and a term this file has never heard of is still worth showing.
 */
export type TagNames = Readonly<Record<string, string>>

/** Names tags for a reader, and reads back what that reader typed. */
export class SightingTags {

  constructor(private readonly names: TagNames) {
  }

  /** What to show for a stored tag: the reader's word for it, else the stored one itself. */
  name(tag: string): string {
    return this.names[tag.toLowerCase()] ?? tag
  }

  /**
   * The reverse, for the editor: what to STORE for a tag someone typed.
   *
   * An author writing in French types "atterrissage", and the file has to end up holding
   * "landing", or their recording stops matching everybody else's. Anything the dictionary does
   * not recognise is stored as typed — a term nobody has translated yet is still a tag, and
   * refusing it would be refusing the only person who knows the case.
   */
  stored(typed: string): string {
    const wanted = typed.trim().toLowerCase()
    for (const [tag, name] of Object.entries(this.names)) {
      if (name.toLowerCase() === wanted) {
        return tag
      }
    }
    return typed.trim()
  }
}
