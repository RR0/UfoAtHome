import type { GeoBounds } from "./GeoBounds.js"

/**
 * What runs on a line, which decides how it is built: a main line or a siding has ballast, sleepers and, when it is electrified, a catenary; a tram's
 * rails are laid in the street and its wire is a single one; a metro takes its current from a rail at the side; a funicular is pulled by a cable.
 */
export type RailwayKind = "rail" | "light_rail" | "tram" | "subway" | "funicular"

/** How a line takes its current, where the survey says: an overhead wire, a third rail, or none at all. */
export type RailwayElectrification = "overhead" | "third_rail" | "none"

/** One length of railway, as a chain of real geographic points along the middle of its track or tracks. */
export interface RailwayLine {
  /** Stable within one fetch. */
  id: string
  /** What it is called, where it is called anything: "Ligne de La Plaine à Hirson et Anor (frontière)". */
  name?: string
  /**
   * The services that run on it, where the survey says (OpenStreetMap's routes): "Transilien K", "TER K15", "RER B". What a reader pointing at a line
   * wants to know first: which trains pass there, and so at what hours one might.
   */
  services?: string[]
  /** The voltage of its wire or its rail, volts, where the survey says: 25000 on a French main line of the north, 1500 on the older ones. */
  voltageV?: number
  kind: RailwayKind
  /** A siding, a yard, a depot track: laid lighter than a main line. */
  service?: boolean
  /** A line built for high speed, where the survey says: its tracks stand farther apart and its contact wire lower. */
  highSpeed?: boolean
  /** Between the inner faces of the two rails, millimetres: 1435 for the standard gauge, 1000 for the metre gauge. */
  gaugeMm: number
  /** How many tracks run side by side along this one centre line: the map draws a double track as one line. */
  tracks: number
  /** Absent is not known, which draws no wire: a catenary drawn over a line that has none is worse than one missing. */
  electrification?: RailwayElectrification
  /**
   * Where the line stands against the ground: 0 on it (an embankment and a cutting are the ground's own shape), above it on a bridge or a viaduct,
   * below it in a tunnel, which is not drawn.
   */
  level: number
  /**
   * In the order the survey drew it. The altitude, metres above the sea, where the survey gives one (the IGN's map does, to a metre and a half):
   * it is what holds a viaduct up, since the relief under it is the bare earth.
   */
  points: { lat: number, lng: number, altitudeM?: number }[]
}

/**
 * Where the railways under a scene come from.
 *
 * The same seam as RoadProvider and WaterProvider. A provider that cannot answer answers with nothing: a scene without tracks is the scene every
 * scene was until now. What comes back is today's network (`contemporary`): lines are closed, lifted and electrified over the years, and a recording
 * is of another day.
 */
export interface RailwayProvider {
  /** Shown to the reader wherever these tracks are (see ImageryProvider.attribution). */
  readonly attribution: string
  /** True when what comes back is today's network rather than the recording's own day. */
  readonly contemporary: boolean
  getRailways(bounds: GeoBounds): Promise<RailwayLine[]>
}
