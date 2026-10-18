import type { GeoBounds } from "../GeoBounds.js"
import type { WaterProvider, WaterSurface } from "../WaterProvider.js"
import type { VectorFeature } from "../OverheadStructures.js"
import { IgnGeoplatform } from "./IgnGeoplatform.js"
import type { IgnGeoplatformOptions } from "./IgnGeoplatform.js"

/**
 * The water of France as the IGN's map (BD TOPO) draws it: the surface of each river between its banks, each lake and pond, as polygons with their
 * islands. A few kilobytes for a town (the Seine through the centre of Paris is one polygon of some seven hundred points).
 */
export class IgnTopoWaterProvider implements WaterProvider {
  readonly attribution = "Water © IGN, BD TOPO (Licence Ouverte 2.0)"

  private readonly platform: IgnGeoplatform

  constructor(options: IgnGeoplatformOptions = {}) {
    this.platform = new IgnGeoplatform(options)
  }

  static covers(bounds: GeoBounds): boolean {
    return IgnGeoplatform.covers((bounds.south + bounds.north) / 2, (bounds.west + bounds.east) / 2)
  }

  async getWater(bounds: GeoBounds): Promise<WaterSurface[]> {
    const features = await this.platform.waterSurfaces(bounds)
    return features.flatMap((feature, index) => IgnTopoWaterProvider.surfacesOf(feature, index))
  }

  /** One surface per polygon of the feature: a MultiPolygon is a river cut by a weir, or a lake and its separate arm. */
  private static surfacesOf(feature: VectorFeature, index: number): WaterSurface[] {
    const { type, coordinates } = feature.geometry
    const polygons = type === "Polygon" ? [coordinates as number[][][]] : type === "MultiPolygon" ? coordinates as number[][][][] : []
    const id = String(feature.properties.cleabs ?? `ign-water-${index}`)
    return polygons.flatMap((polygon, part) => {
      const rings = polygon.map(ring => IgnTopoWaterProvider.open(ring.map(vertex => ({ lat: vertex[1], lng: vertex[0] })))).filter(ring => ring.length >= 3)
      return rings.length > 0 ? [{ id: polygons.length > 1 ? `${id}-${part}` : id, rings }] : []
    })
  }

  /** A GeoJSON ring repeats its first point at its end; a WaterSurface's does not. */
  private static open(ring: { lat: number, lng: number }[]): { lat: number, lng: number }[] {
    const first = ring[0]
    const last = ring[ring.length - 1]
    return ring.length > 1 && first.lat === last.lat && first.lng === last.lng ? ring.slice(0, -1) : ring
  }
}
