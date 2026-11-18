import { Messages } from "../../../../i18n/MessageCatalog.js"

/**
 * The words of DroneParameters's parameters, by the keys its specifications state in place of a label, a hint, a group (see
 * ParameterTexts.resolve), and the names of the airframes and the lights: one chunk per language (see MessageCatalog).
 */
export interface DroneParameterTexts {
  drones: string
  drone: string
  flight: string
  look: string
  name: string
  airframe: string
  quadcopter: string
  saucer: string
  fixedWing: string
  howMany: string
  standForTheShapes: string
  theWholeGroupTakenForOne: string
  noShape: string
  draw: string
  whatTheDrawsStartFrom: string
  pattern: string
  oneDrone: string
  aLooseGroup: string
  abreast: string
  spacing: string
  betweenNeighbours: string
  noseTowards: string
  whereItGoes: string
  windFrom: string
  whatItLeansInto: string
  windSpeed: string
  silent: string
  notEvenItsRotors: string
  quieter: string
  thanItsClass: string
  hull: string
  front: string
  rear: string
  strobe: string
  rim: string
  under: string
  navLeft: string
  navRight: string
  tail: string
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
export const DRONE_PARAMETER_TEXTS = Messages.catalog<DroneParameterTexts>({
  en: () => import("./DroneParameterTexts_en.js").then(m => m.droneParameterTexts_en),
  fr: () => import("./DroneParameterTexts_fr.js").then(m => m.droneParameterTexts_fr),
  es: () => import("./DroneParameterTexts_es.js").then(m => m.droneParameterTexts_es),
  it: () => import("./DroneParameterTexts_it.js").then(m => m.droneParameterTexts_it)
})
