import { Messages } from "../../../../i18n/MessageCatalog.js"

/** What the Airships part of the Sky group says — see AirshipEditor. */
export interface AirshipEditorMessages {
  intro: string
  none: string
  airship: string
  deleteAirship: string
  addAirship: string
  addNowhere: string
  tetheredNote: string
  path: string
  deletePoint: string
  timelineNote: string
  addPointHere: string
  pointHere: string
  zoomHint: string
  derivedNote: string
}

/** One chunk per language (see MessageCatalog). */
export const AIRSHIP_EDITOR_MESSAGES = Messages.catalog<AirshipEditorMessages>({
  en: () => import("./AirshipEditorMessages_en.js").then(m => m.airshipEditorMessages_en),
  fr: () => import("./AirshipEditorMessages_fr.js").then(m => m.airshipEditorMessages_fr),
  es: () => import("./AirshipEditorMessages_es.js").then(m => m.airshipEditorMessages_es),
  it: () => import("./AirshipEditorMessages_it.js").then(m => m.airshipEditorMessages_it)
})
