import { ModuleRegistry } from "../../ModuleRegistry.js"
import type { DataSource } from "../../../engine/source/DataSource.js"
import type { TimeZoneProvider } from "../../../engine/time/TimeZoneProvider.js"
import { OpenMeteoTimeZoneProvider } from "./OpenMeteoTimeZoneProvider.js"

/** Every service the editor can ask which legal time zone a place falls in. One entry, like the
 * place and weather registries beside it — the seam is meant to be visible before it is used. */
export const TIME_ZONE_SOURCES: DataSource<TimeZoneProvider>[] = ModuleRegistry.point("timeZone").provide(ModuleRegistry.BUILT_IN, [
  {
    id: "open-meteo",
    name: "Open-Meteo",
    credit: "© Open-Meteo",
    creditUrl: "https://open-meteo.com/en/docs",
    create: () => new OpenMeteoTimeZoneProvider()
  }
])
