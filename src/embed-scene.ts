/**
 * Standalone entry point for embedding <rr0-scene> into a real page —
 * the 3D-decor variant (sky/horizon/stars, see SceneRenderer), heaviest of
 * the three bundles since it pulls in Three.js. Only pages that actually
 * want the environmental reconstruction should load this one; plain
 * playback has nothing lighter to reach for: the phenomenon is drawn in the scene itself.
 */
import { registerScene } from "./component/SceneElement.js"

registerScene()
