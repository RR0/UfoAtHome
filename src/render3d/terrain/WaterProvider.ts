import type { GeoBounds } from "./GeoBounds.js"

/** One body of water as a map draws it: a river's surface between its banks, a lake, a pond. */
export interface WaterSurface {
  /** Stable within one fetch. */
  id: string
  /**
   * Its outline and its islands, as chains of real geographic points: the first ring is the outline, the others the land inside it (the Île de la
   * Cité in the Seine). Each ring is closed implicitly: its last point is not its first again.
   */
  rings: { lat: number, lng: number }[][]
}

/**
 * Where the water under a scene comes from: the rivers, lakes and ponds a map draws as surfaces.
 *
 * The same seam as RoadProvider. The relief of a scene is a model of the bare earth, and the bare earth of a river is its water level: the laser
 * does not see under the surface, so a river is a flat trough in the ground, drawn in the colour of the photograph, and nothing in it says it is
 * water. What does is the map, which has its outline. A provider that cannot answer answers with nothing: a scene without water is the scene every
 * scene was until now.
 */
export interface WaterProvider {
  /** Shown to the reader wherever this water is (see ImageryProvider.attribution). */
  readonly attribution: string
  getWater(bounds: GeoBounds): Promise<WaterSurface[]>
}
