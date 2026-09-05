/**
 * Standalone entry point for embedding <rr0-sighting> into a real page — the standard way to
 * display any real sighting, whether it has one witness or several. Composes <rr0-scene> (the
 * same full sky/ground backdrop embed-scene.ts builds), not the lighter embed-ufo.ts bundle: a
 * witness recording is always a real sighting, so it always needs the real astronomy context,
 * not just the bare recorded shape.
 */
import { registerSighting } from "./component/SightingElement.js"

registerSighting()
