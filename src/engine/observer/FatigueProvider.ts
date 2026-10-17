import type { ObserverProvider, ObserverSettings } from "./ObserverProvider.js"
import type { Perception } from "./Perception.js"
import { Perceptions } from "./Perception.js"

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
  readonly label = "Fatigue"
  readonly hint =
    "Stated only: sleep loss has not been shown to change what a healthy eye receives, so the picture is unchanged. It bears on attention and memory, not on vision."
  readonly sources = [
    "Studies of contrast sensitivity during prolonged sleep deprivation (60 hours, naval officers): no significant change"
  ]
  readonly settings = [
    { id: "hoursAwake", label: "Awake for", kind: "number" as const, default: 0, min: 0, max: 72, step: 1, unit: "h" }
  ]

  perceive(_values: ObserverSettings): Perception {
    return Perceptions.NONE
  }
}
