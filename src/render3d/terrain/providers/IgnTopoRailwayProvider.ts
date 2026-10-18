import type { GeoBounds } from "../GeoBounds.js"
import type { RailwayElectrification, RailwayKind, RailwayLine, RailwayProvider } from "../RailwayProvider.js"
import type { VectorFeature } from "../OverheadStructures.js"
import { IgnGeoplatform } from "./IgnGeoplatform.js"
import type { IgnGeoplatformOptions } from "./IgnGeoplatform.js"

/**
 * The railways of France as the IGN's map (BD TOPO) draws them: each section of line with its nature, its gauge, how many tracks it carries, whether
 * it is electrified and where it stands against the ground, and the altitude of every point of it. About 150 kB for the yards of the Gare de Lyon.
 *
 * Better than OpenStreetMap for France for the reasons the roads are (see IgnTopoRoadProvider): it answers, and it says what a scene needs. Its
 * altitudes are what holds a viaduct up: the relief is the bare earth, which has no bridge in it.
 */
export class IgnTopoRailwayProvider implements RailwayProvider {
  readonly attribution = "Railways © IGN, BD TOPO (Licence Ouverte 2.0), as drawn today"
  readonly contemporary = true

  /** What each nature of the map is. "Transport urbain" is the map's word for a light railway of a town that is neither a tram nor a metro. */
  private static readonly BY_NATURE: Readonly<Record<string, { kind: RailwayKind, service?: boolean, highSpeed?: boolean }>> = {
    "Voie ferrée principale": { kind: "rail" },
    "LGV": { kind: "rail", highSpeed: true },
    "Voie de service": { kind: "rail", service: true },
    "Métro": { kind: "subway" },
    "Tramway": { kind: "tram" },
    "Transport urbain": { kind: "light_rail" },
    "Funiculaire ou crémaillère": { kind: "funicular" }
  }
  /** The gauges the map tells apart: the standard one, the metre gauge of the mountain and secondary lines, and the broad one, which France has none of. */
  private static readonly GAUGE_MM: Readonly<Record<string, number>> = { "Normale": 1435, "Etroite": 1000, "Étroite": 1000, "Large": 1668 }
  /** What the map writes for an altitude it does not know. */
  private static readonly NO_ALTITUDE = -1000

  private readonly platform: IgnGeoplatform

  constructor(options: IgnGeoplatformOptions = {}) {
    this.platform = new IgnGeoplatform(options)
  }

  static covers(bounds: GeoBounds): boolean {
    return IgnGeoplatform.covers((bounds.south + bounds.north) / 2, (bounds.west + bounds.east) / 2)
  }

  async getRailways(bounds: GeoBounds): Promise<RailwayLine[]> {
    const features = await this.platform.railways(bounds)
    return features.flatMap((feature, index) => IgnTopoRailwayProvider.linesOf(feature, index))
  }

  private static linesOf(feature: VectorFeature, index: number): RailwayLine[] {
    const { type, coordinates } = feature.geometry
    const parts = type === "LineString" ? [coordinates as number[][]] : type === "MultiLineString" ? coordinates as number[][][] : []
    const nature = IgnTopoRailwayProvider.BY_NATURE[String(feature.properties.nature ?? "")]
    if (!nature) return []
    const id = String(feature.properties.cleabs ?? `ign-rail-${index}`)
    const tracks = Number(feature.properties.nombre_de_voies)
    const level = Number(feature.properties.position_par_rapport_au_sol)
    const name = feature.properties.cpx_toponyme
    const gaugeMm = IgnTopoRailwayProvider.GAUGE_MM[String(feature.properties.largeur ?? "")] ?? 1435
    const electrification = IgnTopoRailwayProvider.electrificationOf(nature.kind, gaugeMm, feature.properties.electrifie)
    return parts.flatMap((part, at) => {
      const points = part.map(vertex => ({
        lat: vertex[1], lng: vertex[0],
        ...(vertex.length > 2 && Number.isFinite(vertex[2]) && vertex[2] > IgnTopoRailwayProvider.NO_ALTITUDE ? { altitudeM: vertex[2] } : {})
      }))
      if (points.length < 2) return []
      return [{
        id: parts.length > 1 ? `${id}-${at}` : id,
        ...(typeof name === "string" && name.length > 0 ? { name } : {}),
        kind: nature.kind,
        ...(nature.service ? { service: true } : {}),
        ...(nature.highSpeed ? { highSpeed: true } : {}),
        gaugeMm,
        tracks: Number.isInteger(tracks) && tracks > 0 ? tracks : 1,
        ...(electrification ? { electrification } : {}),
        level: Number.isFinite(level) ? level : 0,
        points
      }]
    })
  }

  /**
   * How a section takes its current. The map says only whether it is electrified, not how: a metro takes it from a rail at the side, a main line,
   * a siding and a tram from a wire. A metre-gauge line is left unknown, as is anything pulled by a cable: the two electrified metre-gauge lines of
   * France most travelled (the Mont-Blanc Express, the Train jaune) run on a third rail, and the rack railways of the mountains on a wire.
   */
  private static electrificationOf(kind: RailwayKind, gaugeMm: number, electrified: unknown): RailwayElectrification | undefined {
    if (electrified === false) return "none"
    if (electrified !== true) return undefined
    if (kind === "subway") return "third_rail"
    if (kind === "funicular" || gaugeMm < 1435) return undefined
    return "overhead"
  }
}
