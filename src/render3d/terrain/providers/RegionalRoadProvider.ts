import type { GeoBounds } from "../GeoBounds.js"
import type { RoadProvider, RoadWay } from "../RoadProvider.js"
import { IgnTopoRoadProvider } from "./IgnTopoRoadProvider.js"

/**
 * The roads from the best source for where the ground is: the IGN's map in France, which names its roads and answers, and the worldwide one
 * elsewhere. Where the regional source does not answer, the worldwide one does: a scene with roads from OpenStreetMap is better than one without.
 *
 * The attribution names both, since which of them a scene's roads came from depends on where it is.
 */
export class RegionalRoadProvider implements RoadProvider {
  readonly attribution = "Roads © IGN, BD TOPO, in France; © OpenStreetMap contributors elsewhere, as drawn today"
  readonly contemporary = true

  constructor(private readonly regional: RoadProvider, private readonly worldwide: RoadProvider) {}

  async getRoads(bounds: GeoBounds): Promise<RoadWay[]> {
    if (IgnTopoRoadProvider.covers(bounds)) {
      try {
        const ways = await this.regional.getRoads(bounds)
        if (ways.length > 0) return ways
      } catch {
        // The regional source did not answer: the worldwide one is asked below.
      }
    }
    return this.worldwide.getRoads(bounds)
  }
}
