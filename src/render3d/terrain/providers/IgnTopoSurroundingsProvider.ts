import type { Surroundings, SurroundingsProvider } from "../SurroundingsProvider.js"
import { SurroundingsUnavailableError } from "../SurroundingsProvider.js"
import { OverheadStructures } from "../OverheadStructures.js"
import { BuildingMaterials } from "../BuildingMaterials.js"
import { RoofShapes } from "../RoofShapes.js"
import { TopoBuildings } from "../TopoBuildings.js"
import { OsmStreetLamps } from "./OsmStreetLamps.js"
import { IgnGeoplatform } from "./IgnGeoplatform.js"
import type { IgnGeoplatformOptions } from "./IgnGeoplatform.js"

/**
 * The buildings, the bridges and the overhead electric lines round a place in France, from the IGN's map (BD TOPO) alone.
 *
 * A map draws things as a surveyor decided to: every building has its own outline (so houses that touch are several), with its height and
 * its floors where the map has them; each bridge is a centre line, the road it carries has a width; each electric line is a polyline of
 * its supports, with its voltage. What a map does not draw is a tree, and what it does not measure is how high a deck or a pylon is:
 * those come out as what a structure of their kind is (see OverheadStructures), where the laser could have said (see
 * IgnLidarTopoSurroundingsProvider, which asks both).
 */
export class IgnTopoSurroundingsProvider implements SurroundingsProvider {
  readonly id = "ign-bd-topo"
  readonly name = "IGN BD TOPO"
  readonly attribution = "Buildings, bridges and lines © IGN, BD TOPO (Licence Ouverte 2.0), as drawn on a day the service does not give"
  readonly creditUrl = "https://geoservices.ign.fr/bdtopo"
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
    if (!this.covers(centre.lat, centre.lng)) throw new SurroundingsUnavailableError("no-coverage", "BD TOPO covers France only")
    const radius = IgnGeoplatform.radius(radiusM)
    const [vectors, photo, lamps, flown] = await Promise.all([this.platform.vectors(centre, radius, true), this.platform.photo(centre, radius).catch(() => undefined), this.lamps?.near(centre, radiusM), this.platform.photoDate(centre)])
    return {
      trees: [],
      buildings: BuildingMaterials.fit(RoofShapes.fit(TopoBuildings.named(TopoBuildings.buildings(vectors.buildings, centre, radius), vectors.zones, centre), undefined, photo)),
      bridges: OverheadStructures.bridges(vectors, centre, radius, undefined),
      lines: OverheadStructures.lines(vectors, centre, radius, undefined),
      ...(lamps ? { lamps } : {}),
      dates: { ...(vectors.mapDate ? { map: vectors.mapDate } : {}), ...(photo && flown ? { photo: flown } : {}), ...(lamps?.length ? { lamps: OsmStreetLamps.today() } : {}) }
    }
  }
}
