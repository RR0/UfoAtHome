import { Messages } from "../../../../i18n/MessageCatalog.js"

/** The words of AuroraParameters's parameters, by the keys its specifications state in place of a label, a hint, a group (see ParameterTexts.resolve). */
export interface AuroraParameterTexts {
  aurora: string
  name: string
  field: string
  light: string
  when: string
  kp: string
  kpHint: string
  edge: string
  edgeHint: string
  arcs: string
  arcsHint: string
  arcBrightness: string
  arcBrightnessHint: string
  red: string
  redHint: string
  from: string
  fromHint: string
  until: string
  untilHint: string
}

/** One chunk per language (see MessageCatalog). */
export const AURORA_PARAMETER_TEXTS = Messages.catalog<AuroraParameterTexts>({
  en: () => import("./AuroraParameterTexts_en.js").then(m => m.auroraParameterTexts_en),
  fr: () => import("./AuroraParameterTexts_fr.js").then(m => m.auroraParameterTexts_fr),
  es: () => import("./AuroraParameterTexts_es.js").then(m => m.auroraParameterTexts_es),
  it: () => import("./AuroraParameterTexts_it.js").then(m => m.auroraParameterTexts_it)
})
