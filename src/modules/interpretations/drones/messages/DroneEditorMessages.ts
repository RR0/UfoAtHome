import { Messages } from "../../../../i18n/MessageCatalog.js"

/** What the Drones part of the Sky group says — see DroneEditor. */
export interface DroneEditorMessages {
  intro: string
  none: string
  drone: string
  deleteDrone: string
  addDrone: string
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
export const DRONE_EDITOR_MESSAGES = Messages.catalog<DroneEditorMessages>({
  en: () => import("./DroneEditorMessages_en.js").then(m => m.droneEditorMessages_en),
  fr: () => import("./DroneEditorMessages_fr.js").then(m => m.droneEditorMessages_fr),
  es: () => import("./DroneEditorMessages_es.js").then(m => m.droneEditorMessages_es),
  it: () => import("./DroneEditorMessages_it.js").then(m => m.droneEditorMessages_it)
})
