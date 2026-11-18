import { ModuleRegistry } from "../ModuleRegistry.js"
import type { DataSource } from "../../engine/source/DataSource.js"
import { InterpretationKinds } from "./InterpretationKind.js"
import type { InterpretationKind } from "./InterpretationKind.js"
import { FLARE_KIND } from "./flares/flareKind.js"
import { LANTERN_KIND } from "./lanterns/lanternKind.js"
import { BIRD_KIND } from "./birds/birdKind.js"
import { DRONE_KIND } from "./drones/droneKind.js"

/**
 * Every kind of interpretation computed into bodies (see InterpretationKind): one folder each under src/modules/interpretations. A kind's
 * `id` here is its `key` in the interpretation. The flares first, as an interpretation's bodies always listed them.
 */
export const INTERPRETATION_SOURCES: DataSource<InterpretationKind>[] = ModuleRegistry.point("interpretations").provide(ModuleRegistry.BUILT_IN, [
  {
    id: FLARE_KIND.key,
    name: "Decoy flares",
    credit: "UFO@home",
    creditUrl: "https://ufoathome.org/docs/format/",
    create: () => FLARE_KIND as InterpretationKind
  },
  {
    id: LANTERN_KIND.key,
    name: "Sky lanterns",
    credit: "UFO@home",
    creditUrl: "https://ufoathome.org/docs/format/",
    create: () => LANTERN_KIND as InterpretationKind
  },
  {
    id: BIRD_KIND.key,
    name: "Birds",
    credit: "UFO@home",
    creditUrl: "https://ufoathome.org/docs/format/",
    create: () => BIRD_KIND as InterpretationKind
  },
  {
    id: DRONE_KIND.key,
    name: "Drones",
    credit: "UFO@home",
    creditUrl: "https://ufoathome.org/docs/format/",
    create: () => DRONE_KIND as InterpretationKind
  }
])

/** The kinds of the registry as they stand now. */
export class InterpretationRegistry {
  static kinds(): InterpretationKind[] {
    return INTERPRETATION_SOURCES.map(source => InterpretationKinds.of(source))
  }
}
