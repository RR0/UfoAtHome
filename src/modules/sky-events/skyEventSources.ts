import { ModuleRegistry } from "../ModuleRegistry.js"
import type { DataSource } from "../../engine/source/DataSource.js"
import type { SkyEventKind } from "./SkyEventKind.js"
import { BEAM_KIND } from "./beams/beamKind.js"
import { LAUNCH_KIND } from "./launches/launchKind.js"
import { REENTRY_KIND } from "./reentries/reentryKind.js"

/**
 * Every kind of event of the sky that is drawn and edited through the extension point (see SkyEventKind): one folder each under
 * src/modules/sky-events. A kind's `id` here is its `key` in the recording.
 *
 * In the order their parts are shown in the editor's Sky group.
 */
export const SKY_EVENT_SOURCES: DataSource<SkyEventKind>[] = ModuleRegistry.point("skyEvents").provide(ModuleRegistry.BUILT_IN, [
  {
    id: LAUNCH_KIND.key,
    name: "Launches",
    credit: "UFO@home",
    creditUrl: "https://ufoathome.org/docs/format/",
    create: () => LAUNCH_KIND as unknown as SkyEventKind
  },
  {
    id: BEAM_KIND.key,
    name: "Beams",
    credit: "UFO@home",
    creditUrl: "https://ufoathome.org/docs/format/",
    create: () => BEAM_KIND as unknown as SkyEventKind
  },
  {
    id: REENTRY_KIND.key,
    name: "Fireballs",
    credit: "UFO@home",
    creditUrl: "https://ufoathome.org/docs/format/",
    create: () => REENTRY_KIND as unknown as SkyEventKind
  }
])
