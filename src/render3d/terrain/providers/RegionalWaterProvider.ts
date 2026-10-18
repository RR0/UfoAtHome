import type { GeoBounds } from "../GeoBounds.js"
import type { WaterProvider, WaterSurface } from "../WaterProvider.js"
import { IgnTopoWaterProvider } from "./IgnTopoWaterProvider.js"

/**
 * The water from the best source for where the ground is: the IGN's map in France, the worldwide one elsewhere, as RegionalRoadProvider does for
 * the roads. Where the regional source does not answer, or has nothing, the worldwide one does: the box that says France takes in corners of
 * Belgium, Switzerland and Italy (see IgnGeoplatform.covers), where the IGN draws nothing. A place in France with no water is asked about twice,
 * which costs a published scene nothing (its water is frozen, see ArchivedWaterProvider) and the editor once a month (see CachedWaterProvider).
 */
export class RegionalWaterProvider implements WaterProvider {
  readonly attribution = "Water © IGN, BD TOPO, in France; © OpenStreetMap contributors elsewhere"

  constructor(private readonly regional: WaterProvider, private readonly worldwide: WaterProvider) {}

  async getWater(bounds: GeoBounds): Promise<WaterSurface[]> {
    if (IgnTopoWaterProvider.covers(bounds)) {
      try {
        const surfaces = await this.regional.getWater(bounds)
        if (surfaces.length > 0) return surfaces
      } catch {
        // The regional source did not answer: the worldwide one is asked below.
      }
    }
    return this.worldwide.getWater(bounds)
  }
}
