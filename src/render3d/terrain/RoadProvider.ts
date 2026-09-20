import type { GeoBounds } from "./GeoBounds.js"

/**
 * How a road is built, which is what decides how wide it is and what colour it reads as — not what
 * it is called on a map. A reader looking at Zamora's ground needs to tell a highway from the
 * gravel track he turned onto; whether the state calls that track NM-1 is beside the point.
 */
export type RoadSurface = "paved" | "gravel" | "dirt"

/** One length of road, as a chain of real geographic points. */
export interface RoadWay {
  /** Stable within one fetch, so a way can be recognised across rebuilds. */
  id: string
  /** What it is called, where it is called anything. */
  name?: string
  surface: RoadSurface
  /** Metres, carriageway only — see RoadProvider for where a missing width comes from. */
  widthM: number
  /** West to east, north to south, in no particular order: a road has no direction here. */
  points: { lat: number; lng: number }[]
}

/**
 * Where the roads under a scene come from.
 *
 * The same seam as ElevationProvider and ImageryProvider, for the same reason: this project takes
 * the ground from surveys it did not make, and the one place that chooses which survey is
 * defaultTerrainProviders. A provider that cannot answer answers with nothing — a scene without
 * roads is the scene every scene had until now, so there is nothing to throw.
 *
 * What a provider must NOT do is pretend. Every road it returns is the road network of the day it
 * was surveyed, and a recording is of some other day: the interstate beside Socorro was not there
 * when Zamora drove, and the gravel track he turned onto may not be there now. That is why
 * `contemporary` exists rather than being assumed — see RoadSystem, which draws a contemporary road
 * differently from one the case file states, and says so.
 */
export interface RoadProvider {
  /** Shown to the reader wherever these roads are (see ImageryProvider.attribution). */
  readonly attribution: string
  /** True when what comes back is today's network rather than the recording's own day. */
  readonly contemporary: boolean
  getRoads(bounds: GeoBounds): Promise<RoadWay[]>
}
