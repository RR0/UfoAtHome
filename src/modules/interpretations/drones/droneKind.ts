import { DRONE_KIND_MESSAGES } from "./messages/DroneKindMessages.js"
import type { InterpretationKind } from "../InterpretationKind.js"
import type { DroneFlightJson } from "./DroneFlight.js"
import type { DroneAirframeId } from "./DroneAirframe.js"

/**
 * The column of RR0's matrix each airframe is assessed as (see InterpretationKind.phenomenon): a quadcopter is the consumer multirotor
 * `ConsumerDrone` scores; the fixed-wing one is built as the Polish army's FlyEye, a military or survey drone, `MilitaryDrone`; the saucer
 * "drufo" is a consumer multirotor in a disc, scored as one.
 */
const PHENOMENON_OF: Record<DroneAirframeId, string> = {
  quadcopter: "ConsumerDrone",
  saucer: "ConsumerDrone",
  "fixed-wing": "MilitaryDrone"
}

/** Drones, alone or in groups, computed into one body each as they fly their path (see DroneFlightJson, DroneFlight). */
export const DRONE_KIND: InterpretationKind<DroneFlightJson> = {
  key: "drones",
  messages: DRONE_KIND_MESSAGES,
  phenomenon: flight => PHENOMENON_OF[flight.airframe] ?? PHENOMENON_OF.quadcopter,
  compute: () => import("./DroneFlight.js").then(({ DroneFlight }) => flight => DroneFlight.bodiesOf(flight)),
  editor: () => import("./DroneEditor.js").then(({ DroneEditor }) => (container, host, language) => new DroneEditor(container, host, language))
}
