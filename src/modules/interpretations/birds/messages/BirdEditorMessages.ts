import { Messages } from "../../../../i18n/MessageCatalog.js"

/** What the Birds part of the Sky group says — see BirdEditor. */
export interface BirdEditorMessages {
  intro: string
  none: string
  flock: string
  deleteFlock: string
  addFlock: string
  addNowhere: string
  explainsEachNote: string
  path: string
  deletePoint: string
  timelineNote: string
  addPointHere: string
  pointHere: string
  zoomHint: string
  derivedNote: string
}

/** One chunk per language (see MessageCatalog). */
export const BIRD_EDITOR_MESSAGES = Messages.catalog<BirdEditorMessages>({
  en: () => import("./BirdEditorMessages_en.js").then(m => m.birdEditorMessages_en),
  fr: () => import("./BirdEditorMessages_fr.js").then(m => m.birdEditorMessages_fr),
  es: () => import("./BirdEditorMessages_es.js").then(m => m.birdEditorMessages_es),
  it: () => import("./BirdEditorMessages_it.js").then(m => m.birdEditorMessages_it)
})
