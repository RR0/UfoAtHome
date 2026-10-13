import { BuildingMaterials } from "./BuildingMaterials.js"
import { BuildingFootprints } from "./BuildingFootprints.js"
import type { VectorFeature } from "./OverheadStructures.js"
import type { SurveyedBuilding } from "./SurroundingsProvider.js"

/**
 * The buildings of a map: each outline (a polygon, drawn by a surveyor and not guessed from a laser's roof pixels), with its height and
 * its floors where the map gives them.
 *
 * The outline is what makes it better than the laser's roofs for the buildings that touch: a map knows where one house ends and the next
 * begins, a laser sees one run of roof. Each outline is turned into the rectangle that holds it, or the rectangles it is made of if it
 * is an L or a U (see BuildingFootprints.ofPoints), so that what comes out is the same thing whichever survey drew the building.
 */
export class TopoBuildings {
  private static readonly METRES_PER_DEGREE = 111320
  /** A building with no height and no floors on the map: two floors, which is what the houses of a town are. */
  private static readonly DEFAULT_HEIGHT_M = 6
  private static readonly FLOOR_HEIGHT_M = 3
  /** The cell the outline is drawn on, and the coarser one for an outline that would take too many. */
  private static readonly FINE_M = 0.5
  private static readonly COARSE_M = 1
  private static readonly MAX_CELLS = 40000
  /** An outline drawn by a surveyor is a rectangle when it nearly fills its own: a courtyard of a seventh of the area is not one. */
  private static readonly RECTANGLE_FILL = 0.9

  static buildings(features: VectorFeature[], centre: { lat: number, lng: number }, radiusM: number, minAreaM2 = 12, max = 300): SurveyedBuilding[] {
    const found: SurveyedBuilding[] = []
    for (const feature of features) {
      const rings = TopoBuildings.rings(feature, centre)
      if (rings.length === 0) continue
      const floors = Number(feature.properties.nombre_d_etages)
      const stated = Number(feature.properties.hauteur)
      const height = Number.isFinite(stated) && stated > 0
        ? stated
        : (Number.isFinite(floors) && floors > 0 ? floors * TopoBuildings.FLOOR_HEIGHT_M : TopoBuildings.DEFAULT_HEIGHT_M)
      for (const building of TopoBuildings.rectanglesOf(rings, height, minAreaM2)) {
        if (Math.hypot(building.eastM, building.northM) > radiusM) continue
        const wallMaterial = BuildingMaterials.of(feature.properties.materiaux_des_murs, "wall")
        const roofMaterial = BuildingMaterials.of(feature.properties.materiaux_de_la_toiture, "roof")
        found.push({ ...building, ...(Number.isFinite(floors) && floors > 0 ? { floors } : {}), ...(wallMaterial ? { wallMaterial } : {}), ...(roofMaterial ? { roofMaterial } : {}) })
      }
    }
    found.sort((a, b) => Math.hypot(a.eastM, a.northM) - Math.hypot(b.eastM, b.northM))
    return found.slice(0, max)
  }

  /**
   * Gives the buildings the names of the zones they stand in: a building whose middle is inside the outline of a zone the map names ("Mairie de
   * Saint-Lô", "Poste de Saint-Lô") takes its name. A zone of several buildings (a school, a hospital) names them all, which is what the map says:
   * it names the place, not each building. A zone that is not drawn round buildings (a square, a car park) names the buildings standing in it
   * all the same, so the zones are taken as they come from the map's own "activity or interest" layer, which is made of the places that are
   * named for what stands there.
   */
  static named(buildings: SurveyedBuilding[], zones: VectorFeature[], centre: { lat: number, lng: number }): SurveyedBuilding[] {
    const outlines = zones
      .map(zone => ({ name: typeof zone.properties.toponyme === "string" ? zone.properties.toponyme : "", rings: TopoBuildings.rings(zone, centre) }))
      .filter(zone => zone.name.length > 0 && zone.rings.length > 0)
    if (outlines.length === 0) return buildings
    return buildings.map(building => {
      const zone = outlines.find(candidate => TopoBuildings.inside(building.eastM, building.northM, candidate.rings))
      return zone ? { ...building, name: zone.name } : building
    })
  }

  /** Whether a point is inside an outline (an odd number of edges crossed by a ray from it), a courtyard being a hole. */
  private static inside(east: number, north: number, rings: { east: number, north: number }[][]): boolean {
    let crossings = 0
    for (const ring of rings) {
      for (let i = 0; i + 1 < ring.length; i++) {
        const a = ring[i]
        const b = ring[i + 1]
        if ((a.north <= north) === (b.north <= north)) continue
        if (a.east + (north - a.north) / (b.north - a.north) * (b.east - a.east) > east) crossings++
      }
    }
    return crossings % 2 === 1
  }

  /** Every ring of the outline (an outer ring, and a ring for each courtyard), in metres east and north of the centre. */
  private static rings(feature: VectorFeature, centre: { lat: number, lng: number }): { east: number, north: number }[][] {
    const geometry = feature.geometry
    const polygons = geometry.type === "Polygon" ? [geometry.coordinates] : geometry.type === "MultiPolygon" ? geometry.coordinates as unknown[] : []
    const cos = Math.cos(centre.lat * Math.PI / 180)
    const rings: { east: number, north: number }[][] = []
    for (const polygon of polygons as unknown[][][]) {
      for (const ring of polygon) {
        rings.push((ring as unknown as [number, number][]).map(([lng, lat]) => ({
          east: (lng - centre.lng) * TopoBuildings.METRES_PER_DEGREE * cos,
          north: (lat - centre.lat) * TopoBuildings.METRES_PER_DEGREE
        })))
      }
    }
    return rings
  }

  /** The outline drawn on a grid of cells (a cell is in it when a ray from it crosses an odd number of edges, so a courtyard is a hole), and cut into rectangles. */
  private static rectanglesOf(rings: { east: number, north: number }[][], height: number, minArea: number): SurveyedBuilding[] {
    let minE = Infinity, maxE = -Infinity, minN = Infinity, maxN = -Infinity
    for (const ring of rings) for (const p of ring) {
      minE = Math.min(minE, p.east); maxE = Math.max(maxE, p.east)
      minN = Math.min(minN, p.north); maxN = Math.max(maxN, p.north)
    }
    let res = TopoBuildings.FINE_M
    if ((maxE - minE) * (maxN - minN) / (res * res) > TopoBuildings.MAX_CELLS) res = TopoBuildings.COARSE_M
    const xs: number[] = []
    const ys: number[] = []
    for (let north = minN + res / 2; north < maxN; north += res) {
      // The crossings of this row with the edges, sorted: the cells between the first and second, the third and fourth… are inside.
      const crossings: number[] = []
      for (const ring of rings) {
        for (let i = 0; i + 1 < ring.length; i++) {
          const a = ring[i]
          const b = ring[i + 1]
          if ((a.north <= north) === (b.north <= north)) continue
          crossings.push(a.east + (north - a.north) / (b.north - a.north) * (b.east - a.east))
        }
      }
      crossings.sort((p, q) => p - q)
      for (let i = 0; i + 1 < crossings.length; i += 2) {
        for (let east = Math.ceil((crossings[i] - res / 2) / res) * res + res / 2; east < crossings[i + 1]; east += res) {
          xs.push(east)
          ys.push(north)
        }
      }
    }
    if (xs.length * res * res < minArea) return []
    // The outline's own sides tell which ways its arms run, which the cells alone do not.
    const sides = rings.flatMap(ring => ring.slice(0, -1).map((from, i) => ({ from, to: ring[i + 1] })))
    return BuildingFootprints.ofPoints(xs, ys, new Array(xs.length).fill(height), res, minArea, TopoBuildings.RECTANGLE_FILL, sides)
  }
}
