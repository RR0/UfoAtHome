import { Messages } from "../../../../i18n/MessageCatalog.js"
/** What the Launches part of the Phenomenon group says — see LaunchEditor. */
export interface LaunchEditorMessages {
  intro: string
  none: string
  launch: string
  deleteLaunch: string
  addLaunch: string
  /** The path of a launch: its row on the timeline and its legend, and what removes the place picked. */
  path: string
  deletePlace: string
  /** What else the stage lets go: a jet's legend, what adds and removes one, and the kinds a jet is added of. */
  jet: string
  addJet: string
  deleteJet: string
  jetBurn: string
  jetVent: string
  /** The adding button when the recording has no place to put a launch at. */
  addLaunchNowhere: string
  /** Under the fields: what an empty field means. */
  derivedNote: string
  /** Under the timeline: how it is used. */
  timelineNote: string
  /** The "+" of a row of the timeline, and what it says when something of the row is at the playhead already. */
  addHere: string
  here: string
  zoomHint: string
}

/** The texts of the part, one chunk per language (see MessageCatalog). */
export const LAUNCH_EDITOR_MESSAGES = Messages.catalog<LaunchEditorMessages>({
  en: () => import("./LaunchEditorMessages_en.js").then(m => m.launchEditorMessages_en),
  fr: () => import("./LaunchEditorMessages_fr.js").then(m => m.launchEditorMessages_fr),
  es: () => import("./LaunchEditorMessages_es.js").then(m => m.launchEditorMessages_es),
  it: () => import("./LaunchEditorMessages_it.js").then(m => m.launchEditorMessages_it)
})
