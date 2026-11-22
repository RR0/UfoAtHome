import { BALLOON_KIND_MESSAGES } from "./messages/BalloonKindMessages.js"
import type { InterpretationKind } from "../InterpretationKind.js"
import type { BalloonFlightJson } from "./BalloonFlight.js"
import { BalloonTypes } from "./BalloonType.js"

/**
 * Balloons, one or a group let go together, computed into one body each as they rise, swell, drift, burst or float (see BalloonFlightJson,
 * BalloonFlight). Each is assessed as the column of RR0's matrix its type names (see BalloonType.phenomenon): a weather or a hot-air
 * balloon as Poher's own, a foil, an LED or a stratospheric one as RR0's.
 */
export const BALLOON_KIND: InterpretationKind<BalloonFlightJson> = {
  key: "balloons",
  messages: BALLOON_KIND_MESSAGES,
  phenomenon: flight => {
    const id = typeof flight.balloon === "string" ? flight.balloon : flight.balloon?.id
    return (BalloonTypes.byId(id) ?? BalloonTypes.ALL[0]).phenomenon
  },
  compute: () => import("./BalloonFlight.js").then(({ BalloonFlight }) => flight => BalloonFlight.bodiesOf(flight)),
  editor: () => import("./BalloonEditor.js").then(({ BalloonEditor }) => (container, host, language) => new BalloonEditor(container, host, language))
}
