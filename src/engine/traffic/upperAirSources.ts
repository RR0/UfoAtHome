import type { DataSource } from "../source/DataSource.js"
import { OpenMeteoUpperAirProvider } from "./providers/OpenMeteoUpperAirProvider.js"
import type { UpperAirProvider } from "./UpperAirProvider.js"

/**
 * Every record the scene can read the air at the aircraft's levels from.
 *
 * Imported by the code that draws trails, which is itself fetched only when a scene has aircraft (see trafficRuntime): the registry
 * costs nothing to a scene without any.
 */
export const UPPER_AIR_SOURCES: DataSource<UpperAirProvider>[] = [
  {
    id: "open-meteo-forecast",
    name: "Open-Meteo (historical forecast)",
    credit: "Weather data by Open-Meteo.com, CC BY 4.0",
    creditUrl: "https://open-meteo.com/en/docs/historical-forecast-api",
    create: () => new OpenMeteoUpperAirProvider()
  }
]
