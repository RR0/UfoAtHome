import { ModuleRegistry } from "../ModuleRegistry.js"
import type { DataSource } from "../../engine/source/DataSource.js"
import type { SkyEventKind } from "./SkyEventKind.js"
import { BEAM_KIND } from "./beams/beamKind.js"

/**
 * Every kind of event of the sky that is drawn and edited through the extension point (see SkyEventKind): one folder each under
 * src/modules/sky-events. A kind's `id` here is its `key` in the recording.
 *
 * The launches and the re-entries are not here yet: they are drawn and edited by code of their own (PlumeSystem, ReentrySystem), and
 * join this list as they are moved to it, as the beams were.
 */
export const SKY_EVENT_SOURCES: DataSource<SkyEventKind>[] = ModuleRegistry.point("skyEvents").provide(ModuleRegistry.BUILT_IN, [
  {
    id: BEAM_KIND.key,
    name: "Beams",
    credit: "UFO@home",
    creditUrl: "https://ufoathome.org/docs/format/",
    create: () => BEAM_KIND as unknown as SkyEventKind
  }
])
