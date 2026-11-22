import { Messages } from "../../../../i18n/MessageCatalog.js"

/**
 * The words of AirshipParameters's parameters, by the keys its specifications state in place of a label, a hint, a group (see
 * ParameterTexts.resolve), and the names of the types and the lights: one chunk per language (see MessageCatalog).
 */
export interface AirshipParameterTexts {
  airships: string
  airship: string
  flight: string
  look: string
  name: string
  type: string
  blimp: string
  zeppelinNt: string
  lightship: string
  aerostat: string
  rigid: string
  standsForTheShapes: string
  noShape: string
  draw: string
  whatTheDrawsStartFrom: string
  windFrom: string
  whatItNosesInto: string
  windSpeed: string
  silent: string
  notEvenItsEngines: string
  envelope: string
  fins: string
  signLit: string
  itsSignOfLamps: string
  signColour: string
  litFromWithin: string
  itsEnvelopeGlows: string
  navLeft: string
  navRight: string
  tail: string
  strobe: string
  nose: string
  stern: string
  switchedOff: string
  colour: string
  intensity: string
  eachLed: string
  flashesASecond: string
  steadyAtNought: string
  eachFlashLasts: string
  pointOfThePath: string
  time: string
  secondsOfTheRecording: string
  position: string
  height: string
  aboveTheGroundOfThePlace: string
  azimuth: string
  elevation: string
  distance: string
  eyeHeight: string
}

/** One chunk per language (see MessageCatalog). */
export const AIRSHIP_PARAMETER_TEXTS = Messages.catalog<AirshipParameterTexts>({
  en: () => import("./AirshipParameterTexts_en.js").then(m => m.airshipParameterTexts_en),
  fr: () => import("./AirshipParameterTexts_fr.js").then(m => m.airshipParameterTexts_fr),
  es: () => import("./AirshipParameterTexts_es.js").then(m => m.airshipParameterTexts_es),
  it: () => import("./AirshipParameterTexts_it.js").then(m => m.airshipParameterTexts_it)
})
