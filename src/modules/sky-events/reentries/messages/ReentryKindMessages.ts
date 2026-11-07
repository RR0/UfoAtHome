import { Messages } from "../../../../i18n/MessageCatalog.js"

/** What the fireballs and re-entries are called, and what the scene's tooltip says of a piece (see REENTRY_KIND). */
export interface ReentryKindMessages {
  /** The editor's part. */
  title: string
  /** What a re-entry with no title or object is called. */
  name: string
  /** The tooltip of a piece: {name}, {mag}, {height} (km), {distance} (km). */
  piece: string
  /** The same, of a fragment a piece shed. */
  fragment: string
}

/** One chunk per language (see MessageCatalog). */
export const REENTRY_KIND_MESSAGES = Messages.catalog<ReentryKindMessages>({
  en: () => import("./ReentryKindMessages_en.js").then(m => m.reentryKindMessages_en),
  fr: () => import("./ReentryKindMessages_fr.js").then(m => m.reentryKindMessages_fr),
  es: () => import("./ReentryKindMessages_es.js").then(m => m.reentryKindMessages_es),
  it: () => import("./ReentryKindMessages_it.js").then(m => m.reentryKindMessages_it)
})
