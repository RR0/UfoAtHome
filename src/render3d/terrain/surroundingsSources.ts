import type { DataSource } from "../../engine/source/DataSource.js"
import type { SurroundingsProvider } from "./SurroundingsProvider.js"
import { IgnLidarSurroundingsProvider } from "./providers/IgnLidarSurroundingsProvider.js"

/**
 * Every survey of the surroundings the trees and buildings of a place can be taken from, the first that covers
 * a place answering for it. One entry today, the IGN's: other countries have their own scans (the USGS 3DEP in the
 * United States, the AHN in the Netherlands) and would be entries here, each saying where it covers.
 */
export const SURROUNDINGS_SOURCES: DataSource<SurroundingsProvider>[] = [
  {
    id: "ign-lidar-hd",
    name: "IGN LiDAR HD",
    credit: "© IGN, LiDAR HD, Licence Ouverte 2.0",
    creditUrl: "https://geoservices.ign.fr/lidarhd",
    create: () => new IgnLidarSurroundingsProvider()
  }
]

/**
 * The survey of the surroundings that covers a place, or none: not every place has been flown, and a recording
 * with no survey simply has no tree or building given to it, which is what every recording had until now.
 *
 * Its own module, away from terrainSources and defaultTerrainProviders, which every scene loads: the survey is
 * looked up when an author sets a place, and the code that reads a laser survey is not worth carrying to
 * everyone who only watches (see SightingEditorElement, which imports this when it first needs it).
 */
export function defaultSurroundingsProvider(lat: number, lng: number): SurroundingsProvider | undefined {
  for (const source of SURROUNDINGS_SOURCES) {
    const provider = source.create()
    if (provider.covers(lat, lng)) return provider
  }
  return undefined
}
