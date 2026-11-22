import { Messages } from "../../../../i18n/MessageCatalog.js"

/** What the airships are called (see AIRSHIP_KIND). */
export interface AirshipKindMessages {
  /** The editor's part. */
  title: string
  /** What one of them is called under the pointer, when it has no name of its own (see InterpretationKind.messages). */
  name: string
}

/** One chunk per language (see MessageCatalog). */
export const AIRSHIP_KIND_MESSAGES = Messages.catalog<AirshipKindMessages>({
  en: () => import("./AirshipKindMessages_en.js").then(m => m.airshipKindMessages_en),
  fr: () => import("./AirshipKindMessages_fr.js").then(m => m.airshipKindMessages_fr),
  es: () => import("./AirshipKindMessages_es.js").then(m => m.airshipKindMessages_es),
  it: () => import("./AirshipKindMessages_it.js").then(m => m.airshipKindMessages_it)
})
