/**
 * Standalone entry point for embedding <rr0-sighting> into a real page — the standard way to
 * display any real sighting, whether it has one observer or several. Composes <rr0-scene> (the
 * same full sky/ground backdrop embed-scene.ts builds): a
 * observer recording is always a real sighting, so it always needs the real astronomy context,
 * not just the bare recorded shape.
 */
import { registerSighting } from "./component/SightingElement.js"
import { register as registerCase } from "./component/CaseElement.js"

registerSighting()
// Its reader half comes with it: <rr0-case> is what shows a case.json whole (its chronology, its interviews), and it wraps this very
// player. Small beside it, and a page given a case can then mount the right element without fetching a second bundle.
registerCase()
