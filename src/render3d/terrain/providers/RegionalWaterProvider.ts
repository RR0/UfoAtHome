import type { GeoBounds } from "../GeoBounds.js"
import type { WaterProvider, WaterSurface } from "../WaterProvider.js"
import { IgnTopoWaterProvider } from "./IgnTopoWaterProvider.js"

/**
 * The water from the best source for where the ground is: the IGN's map in France, the worldwide one elsewhere, as RegionalRoadProvider does for
 * the roads. Where the regional source does not answer, the worldwide one does. A place in France with no water on the map is a place with none,
 * and the worldwide source is not asked about it: most places have no water, and Overpass is a donated service. The price is the corners of
 * Belgium, Switzerland and Italy the box that says France takes in (see IgnGeoplatform.covers), which the IGN answers with nothing.
 */
export class RegionalWaterProvider implements WaterProvider {
  readonly attribution = "Water © IGN, BD TOPO, in France; © OpenStreetMap contributors elsewhere"

  constructor(private readonly regional: WaterProvider, private readonly worldwide: WaterProvider) {}

  async getWater(bounds: GeoBounds): Promise<WaterSurface[]> {
    if (IgnTopoWaterProvider.covers(bounds)) {
      try {
        return await this.regional.getWater(bounds)
      } catch {
        // The regional source did not answer: the worldwide one is asked below.
      }
    }
    return this.worldwide.getWater(bounds)
  }
}
