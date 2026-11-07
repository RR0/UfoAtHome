import { Messages } from "../../../../i18n/MessageCatalog.js"

/** What the sky lanterns are called (see LANTERN_KIND). */
export interface LanternKindMessages {
  /** The editor's part. */
  title: string
}

/** One chunk per language (see MessageCatalog). */
export const LANTERN_KIND_MESSAGES = Messages.catalog<LanternKindMessages>({
  en: () => import("./LanternKindMessages_en.js").then(m => m.lanternKindMessages_en),
  fr: () => import("./LanternKindMessages_fr.js").then(m => m.lanternKindMessages_fr),
  es: () => import("./LanternKindMessages_es.js").then(m => m.lanternKindMessages_es),
  it: () => import("./LanternKindMessages_it.js").then(m => m.lanternKindMessages_it)
})
