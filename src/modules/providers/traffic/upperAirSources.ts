import { ModuleRegistry } from "../../ModuleRegistry.js"
import type { DataSource } from "../../../engine/source/DataSource.js"
import { OpenMeteoUpperAirProvider } from "./OpenMeteoUpperAirProvider.js"
import type { UpperAirProvider } from "../../../engine/traffic/UpperAirProvider.js"

/**
 * Every record the scene can read the air at the aircraft's levels from.
 *
 * Imported by the code that draws trails, which is itself fetched only when a scene has aircraft (see trafficRuntime): the registry
 * costs nothing to a scene without any.
 */
export const UPPER_AIR_SOURCES: DataSource<UpperAirProvider>[] = ModuleRegistry.point("upperAir").provide(ModuleRegistry.BUILT_IN, [
  {
    id: "open-meteo-forecast",
    name: "Open-Meteo (historical forecast)",
    credit: "Weather data by Open-Meteo.com, CC BY 4.0",
    creditUrl: "https://open-meteo.com/en/docs/historical-forecast-api",
    create: () => new OpenMeteoUpperAirProvider()
  }
])
