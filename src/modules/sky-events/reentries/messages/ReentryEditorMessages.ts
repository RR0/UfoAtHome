import { Messages } from "../../../../i18n/MessageCatalog.js"
/** What the Fireballs part of the Sky group says — see ReentryEditor. */
export interface ReentryEditorMessages {
  intro: string
  none: string
  reentry: string
  deleteReentry: string
  addReentry: string
  kindFireball: string
  kindReentry: string
  path: string
  deletePlace: string
  fragments: string
  fragment: string
  addFragment: string
  deleteFragment: string
  curve: string
  deleteCurvePoint: string
  noCurve: string
  addNowhere: string
  derivedNote: string
  timelineNote: string
  addPointHere: string
  pointHere: string
  zoomHint: string
}

/** The texts of the part, one chunk per language (see MessageCatalog). */
export const REENTRY_EDITOR_MESSAGES = Messages.catalog<ReentryEditorMessages>({
  en: () => import("./ReentryEditorMessages_en.js").then(m => m.reentryEditorMessages_en),
  fr: () => import("./ReentryEditorMessages_fr.js").then(m => m.reentryEditorMessages_fr),
  es: () => import("./ReentryEditorMessages_es.js").then(m => m.reentryEditorMessages_es),
  it: () => import("./ReentryEditorMessages_it.js").then(m => m.reentryEditorMessages_it)
})
