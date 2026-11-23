import { Messages } from "../../../../i18n/MessageCatalog.js"

/** What the searchlights are called, and what the scene's tooltip says of one (see SEARCHLIGHT_KIND). */
export interface SearchlightKindMessages {
  /** The editor's part. */
  title: string
  /** What a searchlight with no title of its own is called. */
  name: string
  /** The tooltip's detail: {name}, {beam} (which of its beams), {beams} (how many), {intensity} (candelas), {distance} (from the eye). */
  detail: string
}

/** One chunk per language (see MessageCatalog). */
export const SEARCHLIGHT_KIND_MESSAGES = Messages.catalog<SearchlightKindMessages>({
  en: () => import("./SearchlightKindMessages_en.js").then(m => m.searchlightKindMessages_en),
  fr: () => import("./SearchlightKindMessages_fr.js").then(m => m.searchlightKindMessages_fr),
  es: () => import("./SearchlightKindMessages_es.js").then(m => m.searchlightKindMessages_es),
  it: () => import("./SearchlightKindMessages_it.js").then(m => m.searchlightKindMessages_it)
})
