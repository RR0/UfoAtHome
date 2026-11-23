import { Messages } from "../../../../i18n/MessageCatalog.js"

/** The words of SearchlightParameters's parameters, by the keys its specifications state in place of a label, a hint, a group (see ParameterTexts.resolve). */
export interface SearchlightParameterTexts {
  searchlight: string
  name: string
  lamp: string
  motion: string
  when: string
  position: string
  height: string
  heightHint: string
  beams: string
  beamsHint: string
  intensity: string
  intensityHint: string
  divergence: string
  divergenceHint: string
  temperature: string
  temperatureHint: string
  pattern: string
  patternHint: string
  fixed: string
  sweep: string
  rotate: string
  cloverleaf: string
  tilt: string
  tiltHint: string
  spread: string
  spreadHint: string
  azimuth: string
  azimuthHint: string
  period: string
  periodHint: string
  from: string
  fromHint: string
  until: string
  untilHint: string
}

/** One chunk per language (see MessageCatalog). */
export const SEARCHLIGHT_PARAMETER_TEXTS = Messages.catalog<SearchlightParameterTexts>({
  en: () => import("./SearchlightParameterTexts_en.js").then(m => m.searchlightParameterTexts_en),
  fr: () => import("./SearchlightParameterTexts_fr.js").then(m => m.searchlightParameterTexts_fr),
  es: () => import("./SearchlightParameterTexts_es.js").then(m => m.searchlightParameterTexts_es),
  it: () => import("./SearchlightParameterTexts_it.js").then(m => m.searchlightParameterTexts_it)
})
