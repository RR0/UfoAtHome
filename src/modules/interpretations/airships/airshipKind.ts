import { AIRSHIP_KIND_MESSAGES } from "./messages/AirshipKindMessages.js"
import type { InterpretationKind } from "../InterpretationKind.js"
import type { AirshipFlightJson } from "./AirshipFlight.js"
import { AirshipTypes } from "./AirshipType.js"

/** Airships, each computed into one body as it flies its path or stays on its line (see AirshipFlightJson, AirshipFlight). */
export const AIRSHIP_KIND: InterpretationKind<AirshipFlightJson> = {
  key: "airships",
  messages: AIRSHIP_KIND_MESSAGES,
  phenomenon: flight => {
    const id = typeof flight.airship === "string" ? flight.airship : flight.airship?.id
    return (AirshipTypes.byId(id) ?? AirshipTypes.ALL[0]).phenomenon
  },
  compute: () => import("./AirshipFlight.js").then(({ AirshipFlight }) => flight => AirshipFlight.bodiesOf(flight))
}
