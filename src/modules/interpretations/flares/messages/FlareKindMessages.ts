import { Messages } from "../../../../i18n/MessageCatalog.js"

/** What the decoy flares are called (see FLARE_KIND). */
export interface FlareKindMessages {
  /** What they are called. */
  title: string
}

/** One chunk per language (see MessageCatalog). */
export const FLARE_KIND_MESSAGES = Messages.catalog<FlareKindMessages>({
  en: () => import("./FlareKindMessages_en.js").then(m => m.flareKindMessages_en),
  fr: () => import("./FlareKindMessages_fr.js").then(m => m.flareKindMessages_fr),
  es: () => import("./FlareKindMessages_es.js").then(m => m.flareKindMessages_es),
  it: () => import("./FlareKindMessages_it.js").then(m => m.flareKindMessages_it)
})
