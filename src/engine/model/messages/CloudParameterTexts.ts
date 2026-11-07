import { Messages } from "../../../i18n/MessageCatalog.js"

/**
 * The words of CloudParameterSets's parameters, by the keys its specifications state in place of a label, a hint, a group (see
 * ParameterTexts.resolve): one chunk per language (see MessageCatalog).
 */
export interface CloudParameterTexts {
  cloudLayer: string
  cloudType: string
  unknown: string
  base: string
  thickness: string
  coverage: string
  cloudSize: string
  density: string
  darkness: string
  crystalAlignment: string
  layerWindDirection: string
  generalWind: string
  layerWindSpeed: string
  patternSeed: string
  individualCloud: string
  position: string
  cloudBase: string
  cloudThickness: string
  cloudWidth: string
  cloudDepth: string
  cloudRotation: string
  cloudDensity: string
  layerDarkness: string
  cumulus: string
  stratus: string
  stratocumulus: string
  cirrus: string
}

export const CLOUD_PARAMETER_TEXTS = Messages.catalog<CloudParameterTexts>({
  en: () => import("./CloudParameterTexts_en.js").then(m => m.cloudParameterTexts_en),
  fr: () => import("./CloudParameterTexts_fr.js").then(m => m.cloudParameterTexts_fr),
  es: () => import("./CloudParameterTexts_es.js").then(m => m.cloudParameterTexts_es),
  it: () => import("./CloudParameterTexts_it.js").then(m => m.cloudParameterTexts_it)
})
