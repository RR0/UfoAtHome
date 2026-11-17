import { Messages } from "../../../../i18n/MessageCatalog.js"

/** What the birds are called (see BIRD_KIND). */
export interface BirdKindMessages {
  /** The editor's part. */
  title: string
  /** What one of them is called under the pointer, when it has no name of its own (see InterpretationKind.messages). */
  name: string
}

/** One chunk per language (see MessageCatalog). */
export const BIRD_KIND_MESSAGES = Messages.catalog<BirdKindMessages>({
  en: () => import("./BirdKindMessages_en.js").then(m => m.birdKindMessages_en),
  fr: () => import("./BirdKindMessages_fr.js").then(m => m.birdKindMessages_fr),
  es: () => import("./BirdKindMessages_es.js").then(m => m.birdKindMessages_es),
  it: () => import("./BirdKindMessages_it.js").then(m => m.birdKindMessages_it)
})
