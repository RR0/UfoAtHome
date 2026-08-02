/**
 * Standalone entry point for embedding <rr0-scene> into a real page —
 * the 3D-decor variant (sky/horizon/stars, see SceneRenderer), heaviest of
 * the three bundles since it pulls in Three.js. Only pages that actually
 * want the environmental reconstruction should load this one; plain
 * playback should use embed-ufo.ts's <rr0-ufo> instead.
 */
import { registerScene } from "./component/SceneElement.js"

registerScene()
