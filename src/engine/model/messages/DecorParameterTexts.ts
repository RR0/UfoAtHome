import { Messages } from "../../../i18n/MessageCatalog.js"

/**
 * The words of DecorParameterSets's and DecorBaseParameterSets's parameters, by the keys its specifications state in place of a label, a hint, a group (see
 * ParameterTexts.resolve): one chunk per language (see MessageCatalog).
 */
export interface DecorParameterTexts {
  front: string
  behind: string
  left: string
  right: string
  frontLeft: string
  frontRight: string
  behindLeft: string
  behindRight: string
  windows: string
  building: string
  bridge: string
  railing: string
  overheadLine: string
  properties: string
  floors: string
  upperStoriesAboveTheGround: string
  occupiedFloor: string
  theFloorTheWitnessIs: string
  walls: string
  wallColour: string
  theColourOfTheWalls: string
  facade: string
  aHouseS: string
  aHouseSAWindowEvery: string
  oldBuilding: string
  church: string
  bareWall: string
  noFacade: string
  roof: string
  flat: string
  flatTheBoxTwoSlopes: string
  twoSlopes: string
  fourSlopes: string
  dome: string
  rise: string
  howFarTheRidgeStands: string
  ridgeAlong: string
  theWidth: string
  theDepth: string
  roofColour: string
  opacityOfTheWindowOn: string
  engineSound: string
  engine: string
  whetherTheVehicleIsHeard: string
  silentParked: string
  car: string
  van: string
  truck: string
  motorcycle: string
  unknown: string
  loudness: string
  againstAnOrdinaryOneOf: string
  theirOwnRecordingURL: string
  sound: string
  noiseInFlight: string
  whatItSoundsLikeWhile: string
  silentAsTheModel: string
  asTheModel: string
  span: string
  metresOfOpenSpanUnder: string
  deckThickness: string
  height: string
  postSpacing: string
  rails: string
  poles: string
  whichEndsStandOnA: string
  both: string
  start: string
  end: string
  noPoles: string
  strandThickness: string
  poleHeight: string
  emptyHalfAMetreOver: string
  object: string
  name: string
  position: string
  altitude: string
  heading: string
  colour: string
  width: string
  length: string
  n3DModel: string
  noModelBuiltInShape: string
  off: string
  positionLights: string
  dippedBeam: string
  mainBeam: string
  fogLamps: string
  state: string
  lit: string
  headlights: string
  lights: string
  noLights: string
  witnessLocation: string
  notPresent: string
  aircraftNarrowBodyAirliner: string
  aircraftWideBodyAirliner: string
  aircraftRegionalJet: string
  aircraftTurboprop: string
  aircraftBusinessJet: string
  aircraftLightPistonAircraft: string
  aircraftLightHelicopter: string
  aircraftMediumHelicopter: string
  aircraftHeavyHelicopter: string
  aircraftMilitaryJet: string
  aircraftUltralight: string
  aircraftDrone: string
  aircraftGlider: string
  aircraftSilent: string
}

export const DECOR_PARAMETER_TEXTS = Messages.catalog<DecorParameterTexts>({
  en: () => import("./DecorParameterTexts_en.js").then(m => m.decorParameterTexts_en),
  fr: () => import("./DecorParameterTexts_fr.js").then(m => m.decorParameterTexts_fr),
  es: () => import("./DecorParameterTexts_es.js").then(m => m.decorParameterTexts_es),
  it: () => import("./DecorParameterTexts_it.js").then(m => m.decorParameterTexts_it)
})
