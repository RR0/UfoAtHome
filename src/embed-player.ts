/**
 * Standalone entry point for embedding the read-only <rr0-ufo-player> into a
 * real page (e.g. an rr0.org case dossier) — the lightweight bundle, without
 * the Recorder engine/SamplingClock/appearance toolbar that embed.ts's
 * <rr0-ufo-recorder> pulls in. Matches
 * cms/src/time/DualRangeComponent.mjs's pattern: one self-registering ES
 * module loaded via <script type="module" src="...">.
 */
import { registerPlayer } from "./component/UfoPlayerElement.js"

registerPlayer()
