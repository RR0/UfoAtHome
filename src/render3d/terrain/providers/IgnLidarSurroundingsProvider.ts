import type { Surroundings, SurroundingsProvider } from "../SurroundingsProvider.js"
import { SurroundingsUnavailableError } from "../SurroundingsProvider.js"
import { BuildingFootprints } from "../BuildingFootprints.js"
import { CanopyCrowns } from "../CanopyCrowns.js"
import { BuildingMaterials } from "../BuildingMaterials.js"
import { RoofShapes } from "../RoofShapes.js"
import { OsmStreetLamps } from "./OsmStreetLamps.js"
import { IgnGeoplatform } from "./IgnGeoplatform.js"
import type { IgnGeoplatformOptions } from "./IgnGeoplatform.js"

/**
 * The trees and the buildings round a place in France, from the IGN's LiDAR HD alone: the whole country scanned from the air, published
 * as open data (Licence Ouverte 2.0).
 *
 * Trees are the laser's own, which no map has (a map draws woods, not oaks); its buildings are the roofs the laser saw, cut into rectangles
 * (see BuildingFootprints), which for houses that touch is a guess a map's outlines do better (see IgnTopoSurroundingsProvider). It has no
 * bridges and no electric lines: a wire is a few centimetres across and a half-metre pixel does not see it.
 *
 * The survey is of the day it was flown, which the service does not say: the provider is `contemporary`, and what it returns a suggestion.
 */
export class IgnLidarSurroundingsProvider implements SurroundingsProvider {
  readonly id = "ign-lidar-hd"
  readonly name = "IGN LiDAR HD"
  readonly attribution = "Canopy and roofs © IGN, LiDAR HD (Licence Ouverte 2.0), as surveyed on a day the service does not give"
  readonly creditUrl = "https://geoservices.ign.fr/lidarhd"
  readonly contemporary = true

  private readonly platform: IgnGeoplatform
  /** Where the public lamps come from, when asked for: the registry gives it, a test that fakes only the IGN does not. */
  private readonly lamps?: OsmStreetLamps

  constructor(options: IgnGeoplatformOptions = {}, lamps?: OsmStreetLamps) {
    this.platform = new IgnGeoplatform(options)
    this.lamps = lamps
  }

  covers(lat: number, lng: number): boolean {
    return IgnGeoplatform.covers(lat, lng)
  }

  async getSurroundings(centre: { lat: number, lng: number }, radiusM: number): Promise<Surroundings> {
    if (!this.covers(centre.lat, centre.lng)) throw new SurroundingsUnavailableError("no-coverage", "The LiDAR HD survey covers France only")
    const radius = IgnGeoplatform.lidarRadius(radiusM)
    const [grids, photo, lamps] = await Promise.all([this.platform.lidar(centre, radius), this.platform.photo(centre, radius).catch(() => undefined), this.lamps?.near(centre, radiusM)])
    return {
      trees: new CanopyCrowns(grids.heights, grids.vegetation, grids.size, grids.size).trees({ metresPerPixel: grids.metresPerPixel, radiusM: radius }),
      buildings: BuildingMaterials.fit(RoofShapes.fit(
        new BuildingFootprints(grids.heights, grids.building, grids.size, grids.size).buildings({ metresPerPixel: grids.metresPerPixel, radiusM: radius, maxBuildings: 300 }),
        grids, photo)),
      bridges: [],
      lines: [],
      ...(lamps ? { lamps } : {})
    }
  }
}
