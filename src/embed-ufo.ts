/**
 * Standalone entry point for embedding the read-only <rr0-ufo> into a
 * real page (e.g. an rr0.org case dossier) — the lightweight bundle, without
 * the Recorder engine/SamplingClock/appearance toolbar that embed.ts's
 * <rr0-sighting-editor> pulls in. Matches
 * cms/src/time/DualRangeComponent.mjs's pattern: one self-registering ES
 * module loaded via <script type="module" src="...">.
 */
import { registerUfo } from "./component/UfoElement.js"

registerUfo()
