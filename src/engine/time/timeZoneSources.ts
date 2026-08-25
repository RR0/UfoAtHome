import type { DataSource } from "../source/DataSource.js"
import type { TimeZoneProvider } from "./TimeZoneProvider.js"
import { OpenMeteoTimeZoneProvider } from "./providers/OpenMeteoTimeZoneProvider.js"

/** Every service the editor can ask which legal time zone a place falls in. One entry, like the
 * place and weather registries beside it — the seam is meant to be visible before it is used. */
export const TIME_ZONE_SOURCES: DataSource<TimeZoneProvider>[] = [
  {
    id: "open-meteo",
    name: "Open-Meteo",
    credit: "© Open-Meteo",
    creditUrl: "https://open-meteo.com/en/docs",
    create: () => new OpenMeteoTimeZoneProvider()
  }
]
