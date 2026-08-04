/**
 * Standalone entry point for embedding <rr0-ufo-witnesses> into a real page — the
 * multi-witness selector variant, for cases that have several recordings (one per
 * witness) of the same sighting. Composes <rr0-scene> (the same full sky/ground backdrop
 * embed-scene.ts builds), not the lighter embed-ufo.ts bundle: a witness recording is
 * always a real sighting, so it always needs the real astronomy context, not just the
 * bare recorded shape.
 */
import { registerWitnessSelector } from "./component/WitnessSelectorElement.js"

registerWitnessSelector()
