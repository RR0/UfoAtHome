/**
 * Where an account can be read as it was given: a book, an article, a report, a post.
 *
 * The shape of an RR0 source (SourceJson in @rr0/data, what a case's events carry as `sources`),
 * restated rather than imported: the schema this project generates describes only what it declares
 * itself, and the barrel of @rr0/data does not bundle for the browser. The same keys, so a recording's
 * sources go into an RR0 case unchanged. `type` is RR0's own ("book", "article"); a web page or a
 * post has none and is simply its `url`.
 */
export interface RecordingSource {
  type?: "book" | "article"
  title?: string
  /** The author(s) name(s): for a post, the account that posted it. */
  authors?: string[]
  /** Where it can be read. For a post, the post's own address. */
  url?: string
  /** Who published it and when (EDTF). Optional for a post, whose publisher is the
   * network itself. */
  publication?: { publisher?: string, time?: string }
  /** Chapter, page, etc. */
  index?: string
}
