import { Messages } from "../../../../i18n/MessageCatalog.js"

/** What the balloons are called (see BALLOON_KIND). */
export interface BalloonKindMessages {
  /** The editor's part. */
  title: string
  /** What one of them is called under the pointer, when it has no name of its own (see InterpretationKind.messages). */
  name: string
}

/** One chunk per language (see MessageCatalog). */
export const BALLOON_KIND_MESSAGES = Messages.catalog<BalloonKindMessages>({
  en: () => import("./BalloonKindMessages_en.js").then(m => m.balloonKindMessages_en),
  fr: () => import("./BalloonKindMessages_fr.js").then(m => m.balloonKindMessages_fr),
  es: () => import("./BalloonKindMessages_es.js").then(m => m.balloonKindMessages_es),
  it: () => import("./BalloonKindMessages_it.js").then(m => m.balloonKindMessages_it)
})
