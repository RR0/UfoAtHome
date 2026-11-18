import { BIRD_KIND_MESSAGES } from "./messages/BirdKindMessages.js"
import type { InterpretationKind } from "../InterpretationKind.js"
import type { BirdFlockJson } from "./BirdFlock.js"

/** Birds, alone or in flocks, computed into one body each as they fly their path (see BirdFlockJson, BirdFlock). */
export const BIRD_KIND: InterpretationKind<BirdFlockJson> = {
  key: "birds",
  messages: BIRD_KIND_MESSAGES,
  phenomenon: () => "Birds",
  compute: () => import("./BirdFlock.js").then(({ BirdFlock }) => (flock, context) => BirdFlock.bodiesOf(flock, context?.obstacles)),
  editor: () => import("./BirdEditor.js").then(({ BirdEditor }) => (container, host, language) => new BirdEditor(container, host, language))
}
