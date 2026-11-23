import { Messages } from "../../../../i18n/MessageCatalog.js"

/** What the Aurorae part of the Sky group says — see AuroraEditor. */
export interface AuroraEditorMessages {
  intro: string
  none: string
  aurora: string
  deleteAurora: string
  addAurora: string
  /** Under the fields: what an empty field means. */
  derivedNote: string
}

/** The texts of the part, one chunk per language (see MessageCatalog). */
export const AURORA_EDITOR_MESSAGES = Messages.catalog<AuroraEditorMessages>({
  en: () => import("./AuroraEditorMessages_en.js").then(m => m.auroraEditorMessages_en),
  fr: () => import("./AuroraEditorMessages_fr.js").then(m => m.auroraEditorMessages_fr),
  es: () => import("./AuroraEditorMessages_es.js").then(m => m.auroraEditorMessages_es),
  it: () => import("./AuroraEditorMessages_it.js").then(m => m.auroraEditorMessages_it)
})
