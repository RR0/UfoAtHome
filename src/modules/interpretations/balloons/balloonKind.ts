import { BALLOON_KIND_MESSAGES } from "./messages/BalloonKindMessages.js"
import type { InterpretationKind } from "../InterpretationKind.js"
import type { BalloonFlightJson } from "./BalloonFlight.js"
import { BalloonTypes } from "./BalloonType.js"
import { Winds } from "../../../engine/scenario/WindProfiles.js"

const rounded = Winds.rounded

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
  // The wind at the ground (10 m), and aloft at every height above the site the wind is known at: a weather balloon climbs through them all.
  inWind: (flight, wind) => {
    const site = flight.site.altitudeM ?? 0
    return {
      ...flight, wind: rounded(wind.at(10)),
      windsAloft: wind.levels.filter(level => level > site + 10).map(level => ({ ...rounded(wind.at(level)), atM: Math.round(level - site) }))
    }
  },
  compute: () => import("./BalloonFlight.js").then(({ BalloonFlight }) => flight => BalloonFlight.bodiesOf(flight)),
  editor: () => import("./BalloonEditor.js").then(({ BalloonEditor }) => (container, host, language) => new BalloonEditor(container, host, language))
}
