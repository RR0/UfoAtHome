/**
 * Standalone entry point for embedding <rr0-ufo-scene> into a real page —
 * the 3D-decor variant (sky/horizon/stars, see SceneRenderer), heaviest of
 * the three bundles since it pulls in Three.js. Only pages that actually
 * want the environmental reconstruction should load this one; plain
 * playback should use embed-player.ts's <rr0-ufo-player> instead.
 */
import { registerScene } from "./component/UfoSceneElement.js"

registerScene()
