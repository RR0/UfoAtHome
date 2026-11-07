import { PERCEPTION_MESSAGES } from "./messages/PerceptionMessages.js"
import type { ObserverProvider, ObserverSettings } from "../../engine/observer/ObserverProvider.js"
import type { Perception } from "../../engine/observer/Perception.js"
import { Perceptions } from "../../engine/observer/Perception.js"

/**
 * A tired observer. Stated, and deliberately given NO effect on the picture: a study of officers kept awake
 * for 60 hours found no clinically or occupationally significant change in contrast sensitivity in healthy
 * eyes with normal acuity, and nothing found quantifies a change in the field or in dark adaptation. What
 * tiredness changes is attention and memory, which a picture cannot show and which belongs to how an
 * account is weighed (see Account), not to what the eye received.
 *
 * It is a provider all the same, for the one reason that a recording that says "after a night shift" should
 * be able to say it where the methods reading the account can find it.
 */
export class FatigueProvider implements ObserverProvider {
  static readonly ID = "fatigue"

  readonly id = FatigueProvider.ID
  readonly messages = PERCEPTION_MESSAGES
  readonly sources = [
    "Studies of contrast sensitivity during prolonged sleep deprivation (60 hours, naval officers): no significant change"
  ]
  readonly settings = [
    { id: "hoursAwake", kind: "number" as const, default: 0, min: 0, max: 72, step: 1, unit: "h" }
  ]

  perceive(_values: ObserverSettings): Perception {
    return Perceptions.NONE
  }
}
