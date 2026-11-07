import { Messages } from "../../../../i18n/MessageCatalog.js"

/**
 * The words of BeamParameters's parameters, by the keys its specifications state in place of a label, a hint, a group (see
 * ParameterTexts.resolve): one chunk per language (see MessageCatalog).
 */
export interface BeamParameterTexts {
  light: string
  beam: string
  when: string
  name: string
  divergence: string
  howFastItWidensFullAngle: string
  widthAtTheEmitter: string
  unevenHaze: string
  howUnevenlyTheHazeItCrosses: string
  itsColour532ForTheGreen: string
  theOpticalPowerItCarriesIts: string
  wavelength: string
  power: string
  time: string
  secondsOfTheRecording: string
  onFrom: string
  secondsOfTheRecordingEmptyFrom: string
  offAt: string
  secondsOfTheRecordingEmptyUntil: string
  pathAtAnInstant: string
  pointOfThePath: string
  position: string
  altitude: string
  aboveTheSeaNotTheGround: string
}

export const BEAM_PARAMETER_TEXTS = Messages.catalog<BeamParameterTexts>({
  en: () => import("./BeamParameterTexts_en.js").then(m => m.beamParameterTexts_en),
  fr: () => import("./BeamParameterTexts_fr.js").then(m => m.beamParameterTexts_fr),
  es: () => import("./BeamParameterTexts_es.js").then(m => m.beamParameterTexts_es),
  it: () => import("./BeamParameterTexts_it.js").then(m => m.beamParameterTexts_it)
})
