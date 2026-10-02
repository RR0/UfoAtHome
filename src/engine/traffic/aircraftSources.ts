import type { DataSource } from "../source/DataSource.js"
import type { AircraftProvider } from "./AircraftProvider.js"
import { AdsbLolArchiveProvider } from "./providers/AdsbLolArchiveProvider.js"

/** Every record the scene can read the traffic around an observer from. */
export const AIRCRAFT_SOURCES: DataSource<AircraftProvider>[] = [
  {
    id: "adsb-lol",
    name: "adsb.lol",
    credit: "adsb.lol feeders and contributors, ODbL 1.0",
    creditUrl: "https://www.adsb.lol/docs/open-data/historical/",
    create: () => new AdsbLolArchiveProvider()
  }
]
