import { BIRD_KIND_MESSAGES } from "./messages/BirdKindMessages.js"
import type { InterpretationKind } from "../InterpretationKind.js"
import { BirdFlock } from "./BirdFlock.js"
import type { BirdFlockJson } from "./BirdFlock.js"

/** Birds, alone or in flocks, computed into one body each as they fly their path (see BirdFlockJson, BirdFlock). Drawn, not yet edited. */
export const BIRD_KIND: InterpretationKind<BirdFlockJson> = {
  key: "birds",
  messages: BIRD_KIND_MESSAGES,
  bodiesOf: flock => BirdFlock.bodiesOf(flock)
}
