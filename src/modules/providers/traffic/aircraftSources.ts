import { ModuleRegistry } from "../../ModuleRegistry.js"
import type { DataSource } from "../../../engine/source/DataSource.js"
import { SourceCredentials } from "../../../engine/source/SourceCredentials.js"
import { AircraftCoverage } from "../../../engine/traffic/AircraftCoverage.js"
import type { AircraftProvider } from "../../../engine/traffic/AircraftProvider.js"
import { LazyAircraftProvider } from "../../../engine/traffic/LazyAircraftProvider.js"

/** What the licence of the ADSB.lol archive asks to be said. */
export const ADSB_LOL_CITATION = "Aircraft positions: adsb.lol feeders and contributors, Open Database License 1.0 (https://www.adsb.lol/docs/open-data/historical/)"

/** What is said of the aircraft asked of Flightradar24. */
export const FLIGHTRADAR24_CITATION = "Aircraft positions: Flightradar24 API (https://fr24api.flightradar24.com/)"

const FLIGHTRADAR24_ID = "flightradar24"

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
  },
  {
    id: FLIGHTRADAR24_ID,
    name: "Flightradar24",
    credit: "Flightradar24, on your own subscription",
    creditUrl: "https://fr24api.flightradar24.com/",
    keyUrl: "https://fr24api.flightradar24.com/key-management",
    create: () => new LazyAircraftProvider(
      FLIGHTRADAR24_CITATION,
      // Its record begins on 2016-05-11, and has nothing of what has not happened yet. How far back a key reaches, only the API knows.
      ms => ms >= Date.UTC(2016, 4, 11) && ms <= Date.now(),
      async () => new (await import("./Flightradar24Provider.js")).Flightradar24Provider({ token: () => SourceCredentials.of(FLIGHTRADAR24_ID) })
    )
  }
])
