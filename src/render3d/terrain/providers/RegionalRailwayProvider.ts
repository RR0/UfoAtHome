import type { GeoBounds } from "../GeoBounds.js"
import type { RailwayLine, RailwayProvider } from "../RailwayProvider.js"
import { IgnTopoRailwayProvider } from "./IgnTopoRailwayProvider.js"

/**
 * The railways from the best source for where the ground is: the IGN's map in France, OpenStreetMap elsewhere, as RegionalWaterProvider does for
 * the water. Where the regional source does not answer, or has nothing, the worldwide one is asked: the box that says France takes in Belgium,
 * Luxembourg and the west of Switzerland (see IgnGeoplatform.covers), where the IGN draws nothing, and Brussels has a station. A place in France
 * with no line near it is asked about twice, once a month (see CachedRailwayProvider), and when the second does not answer, the first one's
 * nothing stands.
 */
export class RegionalRailwayProvider implements RailwayProvider {
  readonly attribution = "Railways © IGN, BD TOPO, in France; © OpenStreetMap contributors elsewhere, as drawn today"
  readonly contemporary = true

  constructor(private readonly regional: RailwayProvider, private readonly worldwide: RailwayProvider) {}

  async getRailways(bounds: GeoBounds): Promise<RailwayLine[]> {
    if (!IgnTopoRailwayProvider.covers(bounds)) return this.worldwide.getRailways(bounds)
    let regional: RailwayLine[] | undefined
    try {
      regional = await this.regional.getRailways(bounds)
      if (regional.length > 0) return regional
    } catch {
      // The regional source did not answer: the worldwide one is asked below.
    }
    try {
      return await this.worldwide.getRailways(bounds)
    } catch (error) {
      // The map said there is nothing here, and the worldwide source could not say otherwise: nothing it is, and not a failure.
      if (regional) return regional
      throw error
    }
  }
}
