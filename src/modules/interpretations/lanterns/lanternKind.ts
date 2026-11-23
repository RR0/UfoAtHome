import { LANTERN_KIND_MESSAGES } from "./messages/LanternKindMessages.js"
import type { InterpretationKind } from "../InterpretationKind.js"
import type { LanternLaunchJson } from "./SkyLantern.js"
import { Winds } from "../../../engine/scenario/WindProfiles.js"

const rounded = Winds.rounded

/** Sky lanterns let go from the ground, computed into one body each as they rise and drift (see LanternLaunchJson, SkyLantern). */
export const LANTERN_KIND: InterpretationKind<LanternLaunchJson> = {
  key: "lanterns",
  messages: LANTERN_KIND_MESSAGES,
  phenomenon: () => "SkyLantern",
  // The wind at the ground (10 m), and aloft at the height above the site the reading states it at, 1 km when it states none.
  inWind: (launch, wind) => {
    const site = launch.site.altitudeM ?? 0
    const atM = launch.windAloft?.atM ?? 1000
    return { ...launch, wind: rounded(wind.at(10)), windAloft: { ...rounded(wind.at(site + atM)), atM } }
  },
  compute: () => import("./SkyLantern.js").then(({ SkyLantern }) => (launch, context) => SkyLantern.bodiesOf(launch, context?.obstacles)),
  editor: () => import("./LanternEditor.js").then(({ LanternEditor }) => (container, host, language) => new LanternEditor(container, host, language))
}
