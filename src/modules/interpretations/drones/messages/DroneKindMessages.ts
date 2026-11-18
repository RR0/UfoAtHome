import { Messages } from "../../../../i18n/MessageCatalog.js"

/** What the drones are called (see DRONE_KIND). */
export interface DroneKindMessages {
  /** The editor's part. */
  title: string
  /** What one of them is called under the pointer, when it has no name of its own (see InterpretationKind.messages). */
  name: string
}

/** One chunk per language (see MessageCatalog). */
export const DRONE_KIND_MESSAGES = Messages.catalog<DroneKindMessages>({
  en: () => import("./DroneKindMessages_en.js").then(m => m.droneKindMessages_en),
  fr: () => import("./DroneKindMessages_fr.js").then(m => m.droneKindMessages_fr),
  es: () => import("./DroneKindMessages_es.js").then(m => m.droneKindMessages_es),
  it: () => import("./DroneKindMessages_it.js").then(m => m.droneKindMessages_it)
})
