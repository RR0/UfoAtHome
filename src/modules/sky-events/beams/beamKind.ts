import type { SkyEventKind } from "../SkyEventKind.js"
import type { BeamJson } from "./LaserBeam.js"
import { TerrainReach } from "../../../render3d/terrain/TerrainReach.js"

/**
 * Beams of light sent through the air from the ground: a laser shot across a city, a searchlight (see BeamJson). The kind's whole
 * declaration: its drawing (BeamSystem) and its editor's part (BeamEditor) are chunks of their own, loaded when first needed.
 */
export const BEAM_KIND: SkyEventKind<BeamJson> = {
  key: "beams",
  title: { en: "Beams", fr: "Faisceaux", es: "Haces", it: "Fasci" },
  fallbackName: "Laser",
  simulation: () => import("./BeamSystem.js").then(({ BeamSystem }) => () => new BeamSystem()),
  editor: () => import("./BeamEditor.js").then(({ BeamEditor }) => (container, host, language) => new BeamEditor(container, host, language)),
  reachM: (beams, centre) => TerrainReach.beamReachFor(beams, centre),
  describe: (beam, name, distance) => `${name} (${beam.wavelengthNm} nm, ${beam.powerW.toLocaleString()} W), ${distance}`
}
