import { Messages } from "../../../../i18n/MessageCatalog.js"

/**
 * The words of BalloonParameters's parameters, by the keys its specifications state in place of a label, a hint, a group (see
 * ParameterTexts.resolve), and the names of the types: one chunk per language (see MessageCatalog).
 */
export interface BalloonParameterTexts {
  balloons: string
  balloon: string
  letGo: string
  air: string
  flight: string
  name: string
  type: string
  hotAir: string
  party: string
  led: string
  foil: string
  pilot: string
  weather: string
  stratospheric: string
  solar: string
  captive: string
  stratosphericLarge: string
  superpressure: string
  infrared: string
  prankCandles: string
  prankFlares: string
  shape: string
  round: string
  star: string
  heart: string
  figure: string
  hair: string
  skin: string
  bottom: string
  shoes: string
  flamesLit: string
  candlesOrFlares: string
  flameColour: string
  colour: string
  itsLightsForAnLedBalloon: string
  filledWith: string
  atSeaLevel: string
  weight: string
  withoutItsGas: string
  standForTheShapes: string
  noShape: string
  whereLetGo: string
  heightOfTheSite: string
  aboveTheGroundOfThePlace: string
  thePlaceAboveTheSea: string
  whatSetsHowThinTheAir: string
  howMany: string
  oneBalloon: string
  aGroup: string
  letGoAt: string
  secondsOfTheRecording: string
  firstSeenAt: string
  alreadyUp: string
  count: string
  firstLetGoAt: string
  lastLetGoAt: string
  letGoWithin: string
  fillingUnlike: string
  asAShare: string
  draw: string
  whatTheDrawsStartFrom: string
  windTowards: string
  atTheGround: string
  windSpeed: string
  windAloftAt: string
  aboveTheSite: string
  windAloftTowards: string
  windAloftSpeed: string
  airTemperature: string
  atTheSite: string
  gustsAcross: string
  gustsUpAndDown: string
  pilotHolds: string
  line: string
  lampLit: string
  theLampUnderIt: string
  computedFor: string
  itMayBurstOrLandBefore: string
}

/** One chunk per language (see MessageCatalog). */
export const BALLOON_PARAMETER_TEXTS = Messages.catalog<BalloonParameterTexts>({
  en: () => import("./BalloonParameterTexts_en.js").then(m => m.balloonParameterTexts_en),
  fr: () => import("./BalloonParameterTexts_fr.js").then(m => m.balloonParameterTexts_fr),
  es: () => import("./BalloonParameterTexts_es.js").then(m => m.balloonParameterTexts_es),
  it: () => import("./BalloonParameterTexts_it.js").then(m => m.balloonParameterTexts_it)
})
