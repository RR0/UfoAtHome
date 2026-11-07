import { Messages } from "../../../../i18n/MessageCatalog.js"
/** What the Lanterns part of the Sky group says — see LanternEditor. */
export interface LanternEditorMessages {
  intro: string
  none: string
  launch: string
  deleteLaunch: string
  addLaunch: string
  /** The adding button when the recording has no place to let them go from. */
  addLaunchNowhere: string
  /** Under the fields of a launch that also states lanterns one by one, which these fields do not show. {n} is how many. */
  releasesNote: string
  /** Under the fields: what an empty field means. */
  derivedNote: string
}

/** The texts of the part, one chunk per language (see MessageCatalog). */
export const LANTERN_EDITOR_MESSAGES = Messages.catalog<LanternEditorMessages>({
  en: () => import("./LanternEditorMessages_en.js").then(m => m.lanternEditorMessages_en),
  fr: () => import("./LanternEditorMessages_fr.js").then(m => m.lanternEditorMessages_fr),
  es: () => import("./LanternEditorMessages_es.js").then(m => m.lanternEditorMessages_es),
  it: () => import("./LanternEditorMessages_it.js").then(m => m.lanternEditorMessages_it)
})
