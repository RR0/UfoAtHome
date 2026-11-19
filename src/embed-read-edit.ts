/**
 * Standalone entry point for <rr0-read-edit>: a file read or edited in place, each half fetched the first time it is asked for. This
 * entry holds neither: the reader (<rr0-case>, <rr0-sighting>) and the editor (<rr0-case-editor>) are chunks of this bundle of their own,
 * so that a page that only reads never fetches the editor, and one that opens on a blank editor fetches the reader only when it reads.
 */
import { register } from "./component/ReadEditElement.js"

register()
