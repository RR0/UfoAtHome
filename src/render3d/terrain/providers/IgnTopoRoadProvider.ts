import type { GeoBounds } from "../GeoBounds.js"
import type { RoadProvider, RoadSurface, RoadWay } from "../RoadProvider.js"
import { IgnGeoplatform } from "./IgnGeoplatform.js"
import type { IgnGeoplatformOptions } from "./IgnGeoplatform.js"
import type { VectorFeature } from "../OverheadStructures.js"

/**
 * The roads of France as the IGN's map (BD TOPO) draws them, with their names.
 *
 * Better than a live OpenStreetMap query for France on every count that matters here: it answers (the donated Overpass instances answer with a
 * 429 or a 504 often enough that a scene went without any road, which is what a reader sees as buildings standing on bare ground), it gives the
 * width of the carriageway as often as not, and it names the roads. Today's network, like any live source: a recording is of another day.
 *
 * Only what a vehicle could use is kept, as OverpassRoadProvider does: the paths and the stairs of a town are not what a reader asks the road about.
 */
export class IgnTopoRoadProvider implements RoadProvider {
  readonly attribution = "Roads © IGN, BD TOPO (Licence Ouverte 2.0), as drawn today"
  readonly contemporary = true

  /**
   * What each kind of road of the map is made of and, where the map gives no width, how wide: carriageway widths, kerb to kerb, from the ordinary
   * practice of the country: a lane is about 3.5 m, a rural two-lane road about 7, a village street 5.5, a track one vehicle wide.
   */
  private static readonly BY_NATURE: Readonly<Record<string, { surface: RoadSurface, widthM: number }>> = {
    "Type autoroutier": { surface: "paved", widthM: 11 },
    "Route à 2 chaussées": { surface: "paved", widthM: 7 },
    "Route à 1 chaussée": { surface: "paved", widthM: 5.5 },
    "Rond-point": { surface: "paved", widthM: 6 },
    "Bretelle": { surface: "paved", widthM: 5 },
    "Route empierrée": { surface: "gravel", widthM: 3.5 },
    "Chemin": { surface: "dirt", widthM: 3 },
    "Piste cyclable": { surface: "paved", widthM: 2.5 }
  }
  private static readonly DEFAULT = { surface: "paved" as RoadSurface, widthM: 5 }

  private readonly platform: IgnGeoplatform

  constructor(options: IgnGeoplatformOptions = {}) {
    this.platform = new IgnGeoplatform(options)
  }

  static covers(bounds: GeoBounds): boolean {
    return IgnGeoplatform.covers((bounds.south + bounds.north) / 2, (bounds.west + bounds.east) / 2)
  }

  async getRoads(bounds: GeoBounds): Promise<RoadWay[]> {
    const features = await this.platform.roads(bounds)
    return features.flatMap((feature, index) => IgnTopoRoadProvider.wayOf(feature, index))
  }

  private static wayOf(feature: VectorFeature, index: number): RoadWay[] {
    if (feature.geometry.type !== "LineString") return []
    const points = (feature.geometry.coordinates as [number, number][]).map(([lng, lat]) => ({ lat, lng }))
    if (points.length < 2) return []
    const nature = String(feature.properties.nature ?? "")
    const kind = IgnTopoRoadProvider.BY_NATURE[nature] ?? IgnTopoRoadProvider.DEFAULT
    const stated = Number(feature.properties.largeur_de_chaussee)
    const name = [feature.properties.cpx_toponyme_route_nommee, feature.properties.nom_voie_ban_gauche, feature.properties.nom_voie_ban_droite]
      .find((candidate): candidate is string => typeof candidate === "string" && candidate.length > 0)
    return [{
      id: String(feature.properties.cleabs ?? `ign-${index}`),
      ...(name ? { name } : {}),
      surface: kind.surface,
      widthM: Number.isFinite(stated) && stated > 0 ? stated : kind.widthM,
      points
    }]
  }
}
