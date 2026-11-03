/**
 * Where an account can be read as it was given: a book, an article, a report, a post.
 *
 * RR0's own SourceJson (see @rr0/data), what a case's events carry as `sources`, so that a recording's sources go into an RR0 case
 * unchanged. Its `type` is RR0's ("book", "article"); a web page or a post has none and is simply its `url`, and a post's publication has
 * no publisher (the network itself).
 */
import type { SourceJson } from "@rr0/data"

export type RecordingSource = SourceJson
