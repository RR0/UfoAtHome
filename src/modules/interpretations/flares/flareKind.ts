import { FLARE_KIND_MESSAGES } from "./messages/FlareKindMessages.js"
import type { InterpretationKind } from "../InterpretationKind.js"
import type { FlareSalvoJson } from "./DecoyFlare.js"
import { Winds } from "../../../engine/scenario/WindProfiles.js"

const rounded = Winds.rounded

/** Salvoes of decoy flares an aircraft dispensed, computed into the aircraft and one body per flare (see FlareSalvoJson, DecoyFlare). Edited
 * in the recording's text: no part of the editor of its own yet. */
export const FLARE_KIND: InterpretationKind<FlareSalvoJson> = {
  key: "flares",
  messages: FLARE_KIND_MESSAGES,
  phenomenon: () => "DecoyFlare",
  // The flares fall from the aircraft's height, and burn out within seconds of it: the wind there is theirs.
  inWind: (salvo, wind) => ({ ...salvo, wind: rounded(wind.at(salvo.aircraft.altitudeM)) }),
  compute: () => import("./DecoyFlare.js").then(({ DecoyFlare }) => salvo => DecoyFlare.bodiesOf(salvo))
}
