import { LANTERN_KIND_MESSAGES } from "./messages/LanternKindMessages.js"
import type { InterpretationKind } from "../InterpretationKind.js"
import { SkyLantern } from "./SkyLantern.js"
import type { LanternLaunchJson } from "./SkyLantern.js"

/** Sky lanterns let go from the ground, computed into one body each as they rise and drift (see LanternLaunchJson, SkyLantern). */
export const LANTERN_KIND: InterpretationKind<LanternLaunchJson> = {
  key: "lanterns",
  messages: LANTERN_KIND_MESSAGES,
  bodiesOf: launch => SkyLantern.bodiesOf(launch),
  editor: () => import("./LanternEditor.js").then(({ LanternEditor }) => (container, host, language) => new LanternEditor(container, host, language))
}
