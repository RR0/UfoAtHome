import type { SkyEventKind } from "../SkyEventKind.js"
import type { BeamJson } from "./LaserBeam.js"
import { TerrainReach } from "../../../render3d/terrain/TerrainReach.js"
import { BEAM_KIND_MESSAGES } from "./messages/BeamKindMessages.js"
import type { BeamKindMessages } from "./messages/BeamKindMessages.js"

/**
 * Beams of light sent through the air from the ground: a laser shot across a city, a searchlight (see BeamJson). The kind's whole
 * declaration: its drawing (BeamSystem), its editor's part (BeamEditor) and its texts (BeamKindMessages) are chunks of their own, loaded
 * when first needed.
 */
export const BEAM_KIND: SkyEventKind<BeamJson, BeamKindMessages> = {
  key: "beams",
  messages: BEAM_KIND_MESSAGES,
  pickKind: "beam",
  simulation: () => import("./BeamSystem.js").then(({ BeamSystem }) => () => new BeamSystem()),
  editor: () => import("./BeamEditor.js").then(({ BeamEditor }) => (container, host, language) => new BeamEditor(container, host, language)),
  reachM: (beams, centre) => TerrainReach.beamReachFor(beams, centre),
  describe: (beam, hit, { texts, name, distance }) => ({
    name,
    detail: texts.detail.replace("{name}", name).replace("{wavelength}", String(beam.wavelengthNm))
      .replace("{power}", beam.powerW.toLocaleString()).replace("{distance}", distance(hit.distanceM ?? 0))
  })
}
