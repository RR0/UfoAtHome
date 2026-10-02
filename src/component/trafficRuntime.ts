/**
 * What it takes to draw, label and hear the aircraft of a record of air traffic: the real types and their dimensions, their lamps, their
 * sound, the label on hover. Everything the scene needs ONLY when there are aircraft to draw, which most scenes never have.
 *
 * Its own module so that it is its own chunk, brought in by a dynamic import on the first aircraft found (see SceneElement.loadTrafficRuntime) and
 * not by every page that shows a scene. The scene itself keeps only what it needs to tell whether there is anything to load.
 */
export { AircraftModels } from "../engine/traffic/AircraftModels.js"
export { TrafficDecor } from "../engine/traffic/TrafficDecor.js"
export { TrafficInfos } from "../engine/traffic/TrafficInfo.js"
export { TrafficTooltip } from "./TrafficTooltip.js"
