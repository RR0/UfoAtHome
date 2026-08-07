/**
 * Static scenery placed around the observer — buildings, trees, streetlights, vehicles, other
 * witnesses — for context in the 3D reconstruction. Unlike the UFO's own Timeline/Shape (which
 * move over time via keyframes) or the observer's own ObserverTrack, decor doesn't animate: real
 * buildings/trees don't move during a sighting, so a flat list on Sighting is enough — see
 * Sighting.decor.
 */
export type DecorKind = "building" | "tree" | "streetlight" | "vehicle" | "witness"

export interface DecorObject {
  id: string
  kind: DecorKind
  /** Optional display name, same role as Shape.title — falls back to a generic "{kind} {n}"
   * label (see UfoRecorderElement.decorLabel) when absent. */
  title?: string
  /**
   * Meters from the observer's own position — eastM positive = east, northM positive = north.
   * Deliberately a flat local offset, not a lat/lng: decor is scenery for a single sighting, not
   * expected to survive the observer moving far enough away for that to matter (unlike
   * terrain/astronomy, which do need real geo coordinates — see terrain/GeoProjection.ts).
   */
  eastM: number
  northM: number
  /** Degrees clockwise from true north, same convention as ObserverPose.headingDeg — which way a
   * vehicle is facing, or a witness looking. Ignored for building/tree/streetlight. */
  headingDeg?: number
  /** Streetlight lamp / vehicle headlights switched on. Ignored for building/tree/witness. */
  lit?: boolean
  /** For kind "witness" only: the URL of that witness's own sighting.json recording, if known —
   * lets the 3D scene's own context menu offer "view this witness's testimony" (loading it the
   * same way UfoRecorderElement.importFromUrl already does). Undefined means no known recording
   * for that witness, or not applicable for any other kind. */
  sightingUrl?: string
}
