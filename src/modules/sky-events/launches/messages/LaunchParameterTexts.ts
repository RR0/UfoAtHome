import { Messages } from "../../../../i18n/MessageCatalog.js"

/**
 * The words of LaunchParameters's parameters, by the keys its specifications state in place of a label, a hint, a group (see
 * ParameterTexts.resolve): one chunk per language (see MessageCatalog).
 */
export interface LaunchParameterTexts {
  engine: string
  launch: string
  name: string
  vehicle: string
  mission: string
  thrustVacuum: string
  merlinVacuum934Rl10110A: string
  specificImpulseVacuum: string
  times981MSIt: string
  propellant: string
  whatTheExhaustIsMadeOf: string
  keroseneAndOxygen: string
  methaneAndOxygen: string
  hydrogenAndOxygen: string
  hypergolic: string
  solid: string
  engineStart: string
  whenTheEngineStartedInSeconds: string
  engineCutOff: string
  whenTheEngineStoppedInSeconds: string
  exhaustFlow: string
  howMuchExhaustLeavesTheEngine: string
  plume: string
  shareThatScatters: string
  theShareOfTheExhaustThat: string
  particleRadius: string
  trailLifetime: string
  howLongTheNarrowTrailLasts: string
  trailSpreading: string
  radiusAtRelease: string
  shareInTheCollar: string
  theCollarIsTheExhaustJust: string
  collar: string
  collarSpreading: string
  howFastTheCollarWidensThree: string
  collarLifetime: string
  placeOfThePath: string
  time: string
  secondsOfTheRecordingNegativeBefore: string
  position: string
  altitude: string
  jet: string
  what: string
  engineBurn: string
  propellantVented: string
  from: string
  secondsOfTheRecordingNegativeBefore2: string
  until: string
  directionFromAft: string
  t0StraightBackAlongTheStage: string
  side: string
  roundTheLineOfMotionWhich: string
  spinPeriod: string
  howLongTheStageTakesTo: string
  speed: string
  howFastItLeavesTheStage: string
  flow: string
  spreading: string
  howFastEachPuffOfIt: string
  lifetime: string
}

export const LAUNCH_PARAMETER_TEXTS = Messages.catalog<LaunchParameterTexts>({
  en: () => import("./LaunchParameterTexts_en.js").then(m => m.launchParameterTexts_en),
  fr: () => import("./LaunchParameterTexts_fr.js").then(m => m.launchParameterTexts_fr),
  es: () => import("./LaunchParameterTexts_es.js").then(m => m.launchParameterTexts_es),
  it: () => import("./LaunchParameterTexts_it.js").then(m => m.launchParameterTexts_it)
})
