/**
 * Standalone entry point for embedding <rr0-ufo-witnesses> into a real page — the
 * multi-witness selector variant, for cases that have several recordings (one per
 * witness) of the same sighting. Composes the same lightweight <rr0-ufo> as embed-ufo.ts;
 * pages that only ever have a single witness should use that one directly instead.
 */
import { registerWitnessSelector } from "./component/WitnessSelectorElement.js"

registerWitnessSelector()
