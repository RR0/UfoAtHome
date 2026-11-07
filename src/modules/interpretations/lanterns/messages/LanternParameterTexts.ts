import { Messages } from "../../../../i18n/MessageCatalog.js"

/**
 * The words of LanternParameters's parameters, by the keys its specifications state in place of a label, a hint, a group (see
 * ParameterTexts.resolve): one chunk per language (see MessageCatalog).
 */
export interface LanternParameterTexts {
  letGo: string
  lanterns: string
  air: string
  eachLantern: string
  skyLanterns: string
  name: string
  whereTheyAreLetGo: string
  whereTheyAreLetGoFrom: string
  heightAboveThePlaceSGround: string
  aGardenOnAHillAbove: string
  thePlaceSGroundAboveThe: string
  whatSetsHowThinTheAir: string
  howMany: string
  firstLetGoAt: string
  secondsOfTheRecordingBeforeIts: string
  lastLetGoAt: string
  secondsOfTheRecordingTheOthers: string
  letGoWithin: string
  aCrowdLetsThemGoA: string
  burnsAtLeast: string
  howLongEachBurnsFromWhen: string
  burnsAtMost: string
  hotterThanTheAirAtLeast: string
  howMuchHotterThanTheAir: string
  hotterThanTheAirAtMost: string
  alreadyBurntWhenLetGo: string
  forLanternsTheAccountOnlyHas: string
  draw: string
  whatTheDrawsStartFromAnother: string
  standForTheShapes: string
  noShape: string
  windAtTheGroundTowards: string
  windAtTheGroundSpeed: string
  whereItBlowsTowardsWhichIs: string
  windAloftTowards: string
  windAloftSpeed: string
  theWindHigherUpBlendedWith: string
  windAloftAt: string
  metresAboveWhereTheyAreLet: string
  airTemperature: string
  atTheGroundFallingBy6: string
  gustsAcross: string
  howFarTheAirSSpeed: string
  gustsUpAndDown: string
  aGustLasts: string
  light: string
  itsFlameSLightThroughThe: string
  shape: string
  roundAtTheMouthSquareAt: string
  balloonLobedTop: string
  paperColour: string
  whatItLooksLikeByDay: string
  flameLight: string
  itsFlameSLightThroughWhite: string
  airItHolds: string
  weightWhenLetGo: string
}

export const LANTERN_PARAMETER_TEXTS = Messages.catalog<LanternParameterTexts>({
  en: () => import("./LanternParameterTexts_en.js").then(m => m.lanternParameterTexts_en),
  fr: () => import("./LanternParameterTexts_fr.js").then(m => m.lanternParameterTexts_fr),
  es: () => import("./LanternParameterTexts_es.js").then(m => m.lanternParameterTexts_es),
  it: () => import("./LanternParameterTexts_it.js").then(m => m.lanternParameterTexts_it)
})
