import { Messages } from "../../../../i18n/MessageCatalog.js"

/** What the aurorae are called, and what the scene's tooltip says of one (see AURORA_KIND). */
export interface AuroraKindMessages {
  /** The editor's part. */
  title: string
  /** What an aurora with no title of its own is called. */
  name: string
  /** The tooltip's detail: {name}, {kp} (the planetary index), {green} and {red} (kR of each line along the line of sight). */
  detail: string
}

/** One chunk per language (see MessageCatalog). */
export const AURORA_KIND_MESSAGES = Messages.catalog<AuroraKindMessages>({
  en: () => import("./AuroraKindMessages_en.js").then(m => m.auroraKindMessages_en),
  fr: () => import("./AuroraKindMessages_fr.js").then(m => m.auroraKindMessages_fr),
  es: () => import("./AuroraKindMessages_es.js").then(m => m.auroraKindMessages_es),
  it: () => import("./AuroraKindMessages_it.js").then(m => m.auroraKindMessages_it)
})
