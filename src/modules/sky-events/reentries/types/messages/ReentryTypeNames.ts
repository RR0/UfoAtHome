import { Messages } from "../../../../../i18n/MessageCatalog.js"

/** The names of the built-in types of re-entry (see reentryTypeSources.ts). */
export interface ReentryTypeNames {
  meteor: string
  fireball: string
  satellite: string
  rocketStage: string
  capsule: string
}

/** One chunk per language (see MessageCatalog). */
export const REENTRY_TYPE_NAMES = Messages.catalog<ReentryTypeNames>({
  en: () => import("./ReentryTypeNames_en.js").then(m => m.reentryTypeNames_en),
  fr: () => import("./ReentryTypeNames_fr.js").then(m => m.reentryTypeNames_fr),
  es: () => import("./ReentryTypeNames_es.js").then(m => m.reentryTypeNames_es),
  it: () => import("./ReentryTypeNames_it.js").then(m => m.reentryTypeNames_it)
})
