import type { DataSource } from "../../engine/source/DataSource.js"
import type { SurroundingsProvider } from "./SurroundingsProvider.js"
import { IgnLidarSurroundingsProvider } from "./providers/IgnLidarSurroundingsProvider.js"
import { IgnLidarTopoSurroundingsProvider } from "./providers/IgnLidarTopoSurroundingsProvider.js"
import { IgnTopoSurroundingsProvider } from "./providers/IgnTopoSurroundingsProvider.js"

/**
 * Every survey of the surroundings the trees, buildings, bridges and lines of a place can be taken from, which the author
 * chooses among (or none: all by hand). The first is the default, the one that knows the most. All three are the IGN's
 * and so cover France: other countries have their own scans (the USGS 3DEP in the United States, the AHN in the
 * Netherlands) and would be entries here, each saying where it covers.
 */
export const SURROUNDINGS_SOURCES: DataSource<SurroundingsProvider>[] = [
  {
    id: "ign-lidar-topo",
    name: "IGN LiDAR HD + BD TOPO",
    credit: "© IGN, LiDAR HD and BD TOPO, Licence Ouverte 2.0",
    creditUrl: "https://geoservices.ign.fr/lidarhd",
    create: () => new IgnLidarTopoSurroundingsProvider()
  },
  {
    id: "ign-lidar-hd",
    name: "IGN LiDAR HD",
    credit: "© IGN, LiDAR HD, Licence Ouverte 2.0",
    creditUrl: "https://geoservices.ign.fr/lidarhd",
    create: () => new IgnLidarSurroundingsProvider()
  },
  {
    id: "ign-bd-topo",
    name: "IGN BD TOPO",
    credit: "© IGN, BD TOPO, Licence Ouverte 2.0",
    creditUrl: "https://geoservices.ign.fr/bdtopo",
    create: () => new IgnTopoSurroundingsProvider()
  }
]

/**
 * The survey of the surroundings the author chose, if it covers a place: not every place has been flown, and a recording with no survey
 * (or none chosen) simply has no tree or building given to it, which is what every recording had until now.
 *
 * Its own module, away from terrainSources and defaultTerrainProviders, which every scene loads: the survey is looked up when an author sets a
 * place, and the code that reads a laser survey is not worth carrying to everyone who only watches (see SightingEditorElement).
 */
export class SurroundingsSources {
  /** The id the editor starts with, and what an unknown one (a hand-edited preference, a source since removed) means. */
  static readonly DEFAULT_ID = SURROUNDINGS_SOURCES[0].id

  /** Nothing chosen: the scenery is the author's alone. Not a source, and what a preference says in one word. */
  static readonly NONE = "none"

  static byId(id: string | undefined): DataSource<SurroundingsProvider> | undefined {
    return id === SurroundingsSources.NONE ? undefined : SURROUNDINGS_SOURCES.find(source => source.id === id) ?? SURROUNDINGS_SOURCES[0]
  }

  /** The provider of the chosen source where it covers the place, else nothing. */
  static providerFor(id: string | undefined, lat: number, lng: number): SurroundingsProvider | undefined {
    const provider = SurroundingsSources.byId(id)?.create()
    return provider?.covers(lat, lng) ? provider : undefined
  }
}
