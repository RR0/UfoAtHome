import { DRONE_KIND_MESSAGES } from "./messages/DroneKindMessages.js"
import type { InterpretationKind } from "../InterpretationKind.js"
import type { DroneFlightJson } from "./DroneFlight.js"

/** Drones, alone or in groups, computed into one body each as they fly their path (see DroneFlightJson, DroneFlight). */
export const DRONE_KIND: InterpretationKind<DroneFlightJson> = {
  key: "drones",
  messages: DRONE_KIND_MESSAGES,
  compute: () => import("./DroneFlight.js").then(({ DroneFlight }) => flight => DroneFlight.bodiesOf(flight)),
  editor: () => import("./DroneEditor.js").then(({ DroneEditor }) => (container, host, language) => new DroneEditor(container, host, language))
}
