import { ModuleRegistry } from "../../ModuleRegistry.js"
import type { DataSource } from "../../../engine/source/DataSource.js"
import { AircraftCoverage } from "../../../engine/traffic/AircraftCoverage.js"
import type { AircraftProvider } from "../../../engine/traffic/AircraftProvider.js"
import { LazyAircraftProvider } from "../../../engine/traffic/LazyAircraftProvider.js"

/** What the licence of the ADSB.lol archive asks to be said. */
export const ADSB_LOL_CITATION = "Aircraft positions: adsb.lol feeders and contributors, Open Database License 1.0 (https://www.adsb.lol/docs/open-data/historical/)"

/**
 * Every record the scene can read the traffic around an observer from.
 *
 * Their providers are loaded on demand: this registry is what a scene and an editor need to be able to show a choice and its credit,
 * and is a few lines; what reads the record is only brought in when a scene that could have traffic first asks for it.
 */
export const AIRCRAFT_SOURCES: DataSource<AircraftProvider>[] = ModuleRegistry.point("aircraft").provide(ModuleRegistry.BUILT_IN, [
  {
    id: "adsb-lol",
    name: "adsb.lol",
    credit: "adsb.lol feeders and contributors, ODbL 1.0",
    creditUrl: "https://www.adsb.lol/docs/open-data/historical/",
    create: () => new LazyAircraftProvider(
      ADSB_LOL_CITATION,
      ms => AircraftCoverage.mayCover(ms),
      async () => new (await import("./AdsbLolArchiveProvider.js")).AdsbLolArchiveProvider()
    )
  }
])
