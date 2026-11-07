import { Messages } from "../../../i18n/MessageCatalog.js"

/**
 * The words of BodyParameterSets's parameters, by the keys its specifications state in place of a label, a hint, a group (see
 * ParameterTexts.resolve): one chunk per language (see MessageCatalog).
 */
export interface BodyParameterTexts {
  body: string
  iD: string
  name: string
  standsForTheShapes: string
  noShape: string
  partDrawnByTheWitness: string
  nodeOfTheModelE: string
  atThePlayhead: string
  position: string
  fromTheWitness: string
  inTheWorld: string
  azimuth: string
  elevation: string
  distance: string
  onTheGround: string
  aboveTheGround: string
  width: string
  length: string
  height: string
  heading: string
  pitch: string
  roll: string
  colour: string
  albedo: string
  lightOfItsOwn: string
  transparency: string
  halo: string
}

export const BODY_PARAMETER_TEXTS = Messages.catalog<BodyParameterTexts>({
  en: () => import("./BodyParameterTexts_en.js").then(m => m.bodyParameterTexts_en),
  fr: () => import("./BodyParameterTexts_fr.js").then(m => m.bodyParameterTexts_fr),
  es: () => import("./BodyParameterTexts_es.js").then(m => m.bodyParameterTexts_es),
  it: () => import("./BodyParameterTexts_it.js").then(m => m.bodyParameterTexts_it)
})
