/**
 * Static scenery placed around the observer — buildings, trees, streetlights, vehicles, other
 * witnesses — for context in the 3D reconstruction. Unlike the UFO's own Timeline/Shape or the
 * observer's own ObserverTrack, decor doesn't MOVE over time via keyframes (real buildings/trees
 * don't move during a sighting, so a flat list on Sighting is enough — see Sighting.decor) — but
 * `lit` alone can still change mid-recording (a streetlight's photocell triggering at dusk, a
 * driver switching their headlights on), so it gets its own small keyframe array rather than the
 * rest of DecorObject's fields. See resolveDecorLitAt.
 */
export type DecorKind = "building" | "tree" | "streetlight" | "vehicle" | "witness"

export interface DecorLitKeyframe {
  t: number
  lit: boolean
}

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
  /** Streetlight lamp / vehicle headlights switched on. Ignored for building/tree/witness. Also
   * the fallback used when litKeyframes is empty/absent — see resolveDecorLitAt — and the value a
   * freshly added decor object starts with before its first keyframe, if any, is ever recorded. */
  lit?: boolean
  /** Sorted by t. Absent/empty means `lit` above never changes — see resolveDecorLitAt. Kept as a
   * plain array here rather than a full Track class (ObserverTrack/WeatherTrack's own
   * sorted-insert/binary-search machinery): a single boolean that changes a handful of times at
   * most doesn't need that, and DecorObject already isn't a class of its own to hang methods off. */
  litKeyframes?: DecorLitKeyframe[]
  /** For kind "witness" only: the URL of that witness's own sighting.json recording, if known —
   * lets the 3D scene's own context menu offer "view this witness's testimony" (loading it the
   * same way UfoRecorderElement.importFromUrl already does). Undefined means no known recording
   * for that witness, or not applicable for any other kind. */
  sightingUrl?: string
}

/** Hold-last-value resolution of a decor object's current lit state at time t — same semantics as
 * Sighting.ts's resolveObserverPoseAt/resolveWeatherAt, just inlined here since a single boolean
 * doesn't warrant a dedicated Track class (see litKeyframes' own doc comment). Falls back to the
 * object's own static `lit` field whenever there are no keyframes yet — a freshly added decor
 * object, or one loaded from before this feature existed. */
export function resolveDecorLitAt(decor: DecorObject, t: number): boolean {
  const keyframes = decor.litKeyframes
  if (!keyframes || keyframes.length === 0) return decor.lit ?? false
  let latest = keyframes[0]
  for (const keyframe of keyframes) {
    if (keyframe.t > t) break
    latest = keyframe
  }
  return latest.lit
}
