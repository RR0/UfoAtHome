/**
 * Standalone entry point for embedding <rr0-interview> into a real page (an rr0.org page that publishes an interview): a single self-registering
 * ES module loaded via <script type="module" src="..."></script>. Light: it holds the dialogue and nothing of the scene or the editors.
 */
import { register } from "./component/InterviewElement.js"

register()
