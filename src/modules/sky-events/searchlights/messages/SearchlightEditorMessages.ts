import { Messages } from "../../../../i18n/MessageCatalog.js"

/** What the Searchlights part of the Sky group says — see SearchlightEditor. */
export interface SearchlightEditorMessages {
  intro: string
  none: string
  searchlight: string
  deleteSearchlight: string
  addSearchlight: string
  /** Why one cannot be added yet: the recording has no place. */
  addNowhere: string
  /** Under the fields: what an empty field means. */
  defaultsNote: string
}

/** One chunk per language (see MessageCatalog). */
export const SEARCHLIGHT_EDITOR_MESSAGES = Messages.catalog<SearchlightEditorMessages>({
  en: () => import("./SearchlightEditorMessages_en.js").then(m => m.searchlightEditorMessages_en),
  fr: () => import("./SearchlightEditorMessages_fr.js").then(m => m.searchlightEditorMessages_fr),
  es: () => import("./SearchlightEditorMessages_es.js").then(m => m.searchlightEditorMessages_es),
  it: () => import("./SearchlightEditorMessages_it.js").then(m => m.searchlightEditorMessages_it)
})
