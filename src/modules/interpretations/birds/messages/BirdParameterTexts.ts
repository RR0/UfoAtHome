import { Messages } from "../../../../i18n/MessageCatalog.js"

/**
 * The words of BirdParameters's parameters, by the keys its specifications state in place of a label, a hint, a group (see
 * ParameterTexts.resolve), and the names of the species: one chunk per language (see MessageCatalog).
 */
export interface BirdParameterTexts {
  birds: string
  flock: string
  formation: string
  flight: string
  look: string
  name: string
  species: string
  howMany: string
  standForTheShapes: string
  theWholeFlockTakenForOne: string
  noShape: string
  draw: string
  whatTheDrawsStartFrom: string
  pattern: string
  oneBird: string
  inAV: string
  inAJ: string
  inEchelon: string
  inAColumn: string
  abreast: string
  aLooseCrowd: string
  aFlockThatFliesItself: string
  informed: string
  aFewKnowWhereTheFlockIsGoing: string
  angleBetweenTheArms: string
  aGooseVMeasures: string
  onTheRightArm: string
  spacingInWingspans: string
  betweenNeighbours: string
  strayInWingspans: string
  howMuchEachBirdStrays: string
  wingbeat: string
  predictedFromItsSpecies: string
  howTheyFly: string
  flappingAllTheTime: string
  inBurstsAndGlides: string
  asTheirPathAsks: string
  wingbeatsABurst: string
  glideBetween: string
  thePlaceSGroundAboveTheSea: string
  whatSetsHowThinTheAir: string
  upperSide: string
  theBackAndTheUpperSide: string
  underSide: string
  theBellyAndTheUnderSide: string
  wingTips: string
  head: string
  neck: string
  bill: string
  litFromBelow: string
  theLampsOfATown: string
  lightFromBelowColour: string
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
  herringGull: string
  ringBilledGull: string
  blackHeadedGull: string
  brownPelican: string
  americanWhitePelican: string
  canadaGoose: string
  snowGoose: string
  mallard: string
  americanGoldenPlover: string
  killdeer: string
}

/** One chunk per language (see MessageCatalog). */
export const BIRD_PARAMETER_TEXTS = Messages.catalog<BirdParameterTexts>({
  en: () => import("./BirdParameterTexts_en.js").then(m => m.birdParameterTexts_en),
  fr: () => import("./BirdParameterTexts_fr.js").then(m => m.birdParameterTexts_fr),
  es: () => import("./BirdParameterTexts_es.js").then(m => m.birdParameterTexts_es),
  it: () => import("./BirdParameterTexts_it.js").then(m => m.birdParameterTexts_it)
})
