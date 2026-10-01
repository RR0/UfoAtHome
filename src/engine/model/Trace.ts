import type { SaidText } from "./SaidText.js"

/** What a trace is: a place (a marker), a line (a line of sight, an axis, a path) or the outline of
 * an area (a zone, a field). */
export type TraceKind = "point" | "line" | "polygon"

/**
 * How a point's height is to be read — the three of KML's `altitudeMode`, since that is where most
 * traces come from (Google Earth).
 *
 * "ground" is drawn on the relief whatever `altM` says, "relative" is that many metres above the
 * relief under the point, and "absolute" is that many metres above sea level — which is what a
 * line of sight toward something hovering over a ridge needs, and what a GPS track reports.
 */
export type TraceAltitude = "ground" | "relative" | "absolute"

/** The colour of a trace its author gave none: not one the sky, the ground or a lamp is. */
export const DEFAULT_TRACE_COLOR = "#2ec4ff"

export interface TracePoint {
  lat: number
  lng: number
  /** Metres, read as `InvestigatorTrace.altitude` says. Absent is on the ground. */
  altM?: number
}

/**
 * A line, marker or outline somebody ELSE drew over the place — a investigator's lines of sight, the
 * axis of a flight path, an angle measured from a spot — imported from the file they drew it in (a
 * Google Earth KML) rather than reconstructed by this project.
 *
 * It is kept apart from everything the reconstruction draws, and for the same reason a stated road
 * is kept apart from a surveyed one (see StatedRoad): it is a CLAIM with an author, not a measure of
 * the world. The reconstruction runs the same with or without it, nothing is fitted to it, and it is
 * shown as what it is — in its own colour, with its name and where it came from — so that a reader
 * can see where the investigator said the object was relative to where the account puts it, and
 * judge. Nothing is invented: a trace holds exactly the coordinates the file held.
 *
 * In latitude and longitude, unlike decor and stated roads (metres from the observer): a trace is
 * drawn on the real ground by somebody who did not know where the observer would stand in this
 * reconstruction, and the observer may well move.
 */
export interface InvestigatorTrace {
  id: string
  /** What its author called it ("Ligne de visée depuis la ferme"). Translatable — see SaidText. */
  title?: SaidText
  kind: TraceKind
  /** One point for a marker, the vertices of a line, the vertices of an outline (not repeated at
   * the end: it is closed by being a polygon). */
  points: TracePoint[]
  /** How `altM` is read. Absent is "ground". */
  altitude?: TraceAltitude
  /** CSS colour the author gave it, `#rrggbb`. Absent is the one every trace without one gets. */
  color?: string
  /** Whose it is and where it comes from — the person, the report, the file. Shown with the other
   * credits, because a line nobody can trace back to somebody is an illustration. */
  source?: SaidText
}
