import { Messages } from "../../../../i18n/MessageCatalog.js"

/** What the Balloons part of the Sky group says — see BalloonEditor. */
export interface BalloonEditorMessages {
  intro: string
  none: string
  balloon: string
  deleteBalloon: string
  addBalloon: string
  addNowhere: string
  releasesNote: string
  windsNote: string
  planNote: string
  derivedNote: string
}

/** One chunk per language (see MessageCatalog). */
export const BALLOON_EDITOR_MESSAGES = Messages.catalog<BalloonEditorMessages>({
  en: () => import("./BalloonEditorMessages_en.js").then(m => m.balloonEditorMessages_en),
  fr: () => import("./BalloonEditorMessages_fr.js").then(m => m.balloonEditorMessages_fr),
  es: () => import("./BalloonEditorMessages_es.js").then(m => m.balloonEditorMessages_es),
  it: () => import("./BalloonEditorMessages_it.js").then(m => m.balloonEditorMessages_it)
})
