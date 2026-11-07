import { Messages } from "../../../../i18n/MessageCatalog.js"

/**
 * The words of ReentryParameters's parameters, by the keys its specifications state in place of a label, a hint, a group (see
 * ParameterTexts.resolve): one chunk per language (see MessageCatalog).
 */
export interface ReentryParameterTexts {
  name: string
  object: string
  light: string
  when: string
  fireballOrReEntry: string
  catalogueName: string
  forAReEntryThePiece: string
  cosparId: string
  t1968013c: string
  noradNumber: string
  pointOfThePath: string
  time: string
  secondsOfTheRecordingNegativeBefore: string
  position: string
  altitude: string
  aboveTheEllipsoidAMeteorBegins: string
  piece: string
  id: string
  absoluteMagnitude: string
  itsBrightnessSeenFrom100Km: string
  colour: string
  train: string
  howLongAStretchOfIts: string
  behindTheLead: string
  secondsBehindTheLeadingPointAlong: string
  seenFrom: string
  whenItBreaksOffOrBegins: string
  outAt: string
  whenItHasBurnedUpOr: string
  pointOfTheLightCurve: string
  secondsOfTheRecording: string
}

export const REENTRY_PARAMETER_TEXTS = Messages.catalog<ReentryParameterTexts>({
  en: () => import("./ReentryParameterTexts_en.js").then(m => m.reentryParameterTexts_en),
  fr: () => import("./ReentryParameterTexts_fr.js").then(m => m.reentryParameterTexts_fr),
  es: () => import("./ReentryParameterTexts_es.js").then(m => m.reentryParameterTexts_es),
  it: () => import("./ReentryParameterTexts_it.js").then(m => m.reentryParameterTexts_it)
})
