import type { DataSource } from "../../engine/source/DataSource.js"
import { CachedSurroundingsProvider } from "./CachedSurroundingsProvider.js"
import { FirstSurroundingsThatAnswers } from "./FirstSurroundingsThatAnswers.js"
import type { SurroundingsProvider } from "./SurroundingsProvider.js"
import { IgnLidarSurroundingsProvider } from "./providers/IgnLidarSurroundingsProvider.js"
import { IgnLidarTopoSurroundingsProvider } from "./providers/IgnLidarTopoSurroundingsProvider.js"
import { IgnTopoSurroundingsProvider } from "./providers/IgnTopoSurroundingsProvider.js"
import { OsmBuildingsSurroundingsProvider } from "./providers/OsmBuildingsSurroundingsProvider.js"
import { OsmStreetLamps } from "./providers/OsmStreetLamps.js"

/**
 * Every survey of the surroundings the trees, buildings, bridges and lines of a place can be taken from, which the author
 * chooses among (or none: all by hand). The first is the default, the one that knows the most. The first three are the IGN's
 * and so cover France; the last is OpenStreetMap's buildings, which cover the world as far as its volunteers have drawn it, and is what a place outside
 * France is given when the author has not chosen. Other countries have their own scans (the USGS 3DEP in the United States, the AHN in the
 * Netherlands, Wallonia's relief) and would be entries here, each saying where it covers.
 *
 * Each answers a place it was already asked about from what it said then (see CachedSurroundingsProvider).
 */
export const SURROUNDINGS_SOURCES: DataSource<SurroundingsProvider>[] = [
  {
    id: "ign-lidar-topo",
    name: "IGN LiDAR HD + BD TOPO",
    credit: "© IGN, LiDAR HD and BD TOPO, Licence Ouverte 2.0; street lamps © OpenStreetMap contributors",
    creditUrl: "https://geoservices.ign.fr/lidarhd",
    create: () => new CachedSurroundingsProvider(new IgnLidarTopoSurroundingsProvider({}, new OsmStreetLamps()))
  },
  {
    id: "ign-lidar-hd",
    name: "IGN LiDAR HD",
    credit: "© IGN, LiDAR HD, Licence Ouverte 2.0; street lamps © OpenStreetMap contributors",
    creditUrl: "https://geoservices.ign.fr/lidarhd",
    create: () => new CachedSurroundingsProvider(new IgnLidarSurroundingsProvider({}, new OsmStreetLamps()))
  },
  {
    id: "ign-bd-topo",
    name: "IGN BD TOPO",
    credit: "© IGN, BD TOPO, Licence Ouverte 2.0; street lamps © OpenStreetMap contributors",
    creditUrl: "https://geoservices.ign.fr/bdtopo",
    create: () => new CachedSurroundingsProvider(new IgnTopoSurroundingsProvider({}, new OsmStreetLamps()))
  },
  {
    id: "osm-buildings",
    name: "OpenStreetMap buildings",
    credit: "Buildings and street lamps © OpenStreetMap contributors (ODbL)",
    creditUrl: "https://www.openstreetmap.org/copyright",
    create: () => new CachedSurroundingsProvider(new OsmBuildingsSurroundingsProvider({}, new OsmStreetLamps()))
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

  /** The survey that reaches everywhere, and is what a place gets where the default does not reach. */
  static readonly WORLD_ID = "osm-buildings"

  /** Nothing chosen: the scenery is the author's alone. Not a source, and what a preference says in one word. */
  static readonly NONE = "none"

  static byId(id: string | undefined): DataSource<SurroundingsProvider> | undefined {
    return id === SurroundingsSources.NONE ? undefined : SURROUNDINGS_SOURCES.find(source => source.id === id) ?? SURROUNDINGS_SOURCES[0]
  }

  /**
   * The provider of the chosen source where it covers the place, else nothing: an author who chose a source gets that source or none. One who did not
   * choose (the default) gets the first source of the registry that covers the place, which is how a place outside France is given the world's buildings and
   * not nothing.
   */
  static providerFor(id: string | undefined, lat: number, lng: number): SurroundingsProvider | undefined {
    const chosen = SurroundingsSources.byId(id)?.create()
    if (id !== undefined && id !== SurroundingsSources.DEFAULT_ID) return chosen?.covers(lat, lng) ? chosen : undefined
    // Not chosen: the default where it reaches, and the world's buildings where it does not (or turns out not to, see FirstSurroundingsThatAnswers).
    const world = SURROUNDINGS_SOURCES.find(source => source.id === SurroundingsSources.WORLD_ID)!.create()
    const candidates = [chosen, world].filter((provider): provider is SurroundingsProvider => provider !== undefined && provider.covers(lat, lng))
    return candidates.length > 1 ? new FirstSurroundingsThatAnswers(candidates) : candidates[0]
  }
}
