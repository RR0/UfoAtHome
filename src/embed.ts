/**
 * Standalone entry point for embedding <rr0-ufo-recorder> into a real page
 * (e.g. an rr0.org case dossier), matching the site's existing
 * cms/src/time/DualRangeComponent.mjs pattern: a single self-registering
 * ES module loaded via <script type="module" src="..."></script>, no
 * separate bootstrap script needed on the page.
 */
import { register } from "./component/UfoRecorderElement.js"

register()
