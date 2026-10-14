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
  /**
   * Whether the way is a street of a built-up area, where the map says so: a street has pavements, a country road does not. Absent is "not
   * known", which draws none (a map that does not say is not a map that says there are none, but a pavement drawn along a field is worse).
   */
  urban?: boolean
  /**
   * What kind of road it is, where the survey says (see RoadMarkings): a carriageway of a motorway or of a road with two, a road, a roundabout, a slip road.
   * Absent is not known, which draws the paint of any wide road.
   */
  kind?: RoadKind
  /** How many lanes it has, where the survey says: of the carriageway for a one-way way, of the road for a two-way one. */
  lanes?: number
  /**
   * Which way the traffic goes along it, where the survey says: "both" for a two-way road, "forward" for one-way with the order of `points`, "backward" against it.
   * Absent is not known, and a way with no direction is drawn the same either way.
   */
  direction?: "both" | "forward" | "backward"
  /** The usual speed of the traffic on it, km/h, where the survey says. */
  speedKmh?: number
  /** In the order the survey drew it, which is the way of travel for a way that says "forward" and the opposite for "backward". */
  points: { lat: number; lng: number }[]
}

/** The kinds of road the paint tells apart. */
export type RoadKind = "motorway" | "dual" | "road" | "roundabout" | "slip"

/**
 * Where the roads under a scene come from.
 *
 * The same seam as ElevationProvider and ImageryProvider, for the same reason: this project takes
 * the ground from surveys it did not make, and the one place that chooses which survey is
 * defaultTerrainProviders. A provider that cannot answer answers with nothing — a scene without
 * roads is the scene every scene had until now, so there is nothing to throw.
 *
 * What a provider must NOT do is pretend. Every road it returns is the road network of the day it
 * was surveyed, and a recording is of some other day — sixty years apart, for the cases this was
 * built on, over which roads are widened, realigned and abandoned, and an unsealed track is the
 * first to go. That is why `contemporary` exists rather than being assumed: see RoadSystem, which
 * draws a contemporary road differently from one the case file states, and says so.
 */
export interface RoadProvider {
  /** Shown to the reader wherever these roads are (see ImageryProvider.attribution). */
  readonly attribution: string
  /** True when what comes back is today's network rather than the recording's own day. */
  readonly contemporary: boolean
  getRoads(bounds: GeoBounds): Promise<RoadWay[]>
}
