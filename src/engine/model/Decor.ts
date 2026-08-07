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

/** A side of a decor object, relative to its own headingDeg ("front" is whichever way the object
 * itself faces) rather than a compass direction — a decor object can be rotated, so "north"
 * wouldn't stay meaningful. Used both for which side a window sits on and which side the recording
 * witness is positioned at inside the object — see hasWindows/isWindowOpenable/canHoldWitness
 * below for which kinds each concept applies to. */
export type DecorSide = "front" | "behind" | "left" | "right"

export const DECOR_SIDES: DecorSide[] = ["front", "behind", "left", "right"]

/** Minimum window opacity for a side that isWindowOpenable says can't be opened (e.g. a vehicle's
 * fixed windshield/rear window) — clamped to at write time (see UfoRecorderElement.
 * updateDecorWindows), so that side can still be present at a normal glazed look but can never be
 * dialed down toward "open". */
export const FIXED_WINDOW_MIN_OPACITY_PERCENT = 90

/** Opacity a freshly created building/vehicle's own windows start at, on every side that
 * hasWindows applies to — a plain windowless box isn't a very useful starting point for
 * something real buildings/cars normally have windows on every side of (the user had to
 * manually set every single side by hand before this existed). A side that isWindowOpenable
 * says is fixed (e.g. a vehicle's windshield/rear window) starts at
 * FIXED_WINDOW_MIN_OPACITY_PERCENT instead — still present and glazed-looking, just never below
 * the floor that side is clamped to anyway. See defaultWindows, which builds the whole
 * DecorObject.windows record a freshly created decor object starts with. */
export const DEFAULT_WINDOW_OPACITY_PERCENT = 50

/** The DecorObject.windows record a freshly created decor object of this kind should start
 * with — every side hasWindows applies to, each at DEFAULT_WINDOW_OPACITY_PERCENT (or
 * FIXED_WINDOW_MIN_OPACITY_PERCENT for a side isWindowOpenable says is fixed). Returns undefined
 * for a kind with no windows at all, so callers (UfoRecorderElement.addDecor) can spread it in
 * unconditionally without an extra hasWindows check of their own. */
export function defaultWindows(kind: DecorKind): Partial<Record<DecorSide, number>> | undefined {
  if (!hasWindows(kind)) return undefined
  const windows: Partial<Record<DecorSide, number>> = {}
  for (const side of DECOR_SIDES) {
    windows[side] = isWindowOpenable(kind, side) ? DEFAULT_WINDOW_OPACITY_PERCENT : FIXED_WINDOW_MIN_OPACITY_PERCENT
  }
  return windows
}

/** Upper stories a freshly created building starts with (before the ground floor) — see
 * DecorObject.floors's own doc comment for the French "étages" convention this matches. Shared by
 * UfoRecorderElement.addDecor (the default a new building is created with) and
 * DecorSystem.build (the fallback for older/hand-edited data with no floors field at all), so the
 * two can never drift apart. */
export const DEFAULT_BUILDING_FLOORS = 2

/** Which kinds have any window at all — a tree/streetlight/other-witness has none. Shared by the
 * recorder UI (which fields to show) and DecorSystem (what geometry to build). */
export function hasWindows(kind: DecorKind): boolean {
  return kind === "building" || kind === "vehicle"
}

/** Whether the given side's window opacity can go all the way down to 0 (fully open) for this
 * kind — a building's windows all can; a vehicle's front/behind (windshield/rear window) are
 * fixed, only its left/right (doors) open (see FIXED_WINDOW_MIN_OPACITY_PERCENT for the floor a
 * non-openable side is clamped to instead). Meaningless (returns false) for a kind with no
 * windows at all. */
export function isWindowOpenable(kind: DecorKind, side: DecorSide): boolean {
  if (kind === "building") return true
  if (kind === "vehicle") return side === "left" || side === "right"
  return false
}

/** Which kinds the recording witness can be positioned inside of — a tree/streetlight/other-
 * witness can't be "inside". */
export function canHoldWitness(kind: DecorKind): boolean {
  return kind === "building" || kind === "vehicle"
}

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
  /** Per-side window opacity, 0 (fully open — the pane is invisible, and DecorSystem.addRoom's own
   * interior wall panel is skipped there too, same as no window at all) to 100 (fully closed — a
   * solid-looking pane). Replaces an earlier discrete "none"/"closed"/"open" choice — an "open"
   * pane rendered as a flat OPAQUE dark rectangle, reading as a physically-blocked-up window
   * rather than an actual opening, since "open" never actually meant "transparent" (see this
   * project's own memory notes) — with a single continuous value that genuinely IS the pane's own
   * transparency. A side absent from this record has no window structure there at all — a plain
   * wall, same rendering as opacity 0 (nothing) but a distinct concept: absent means "there's
   * never a window here", whereas a present entry at 0 still means "there's an opening here, it's
   * just wide open right now". See hasWindows/isWindowOpenable above for which sides even CAN have
   * a window at all for this kind, and which of those can go all the way down to 0 (e.g. a
   * vehicle's front/behind windshield/rear window are fixed — see
   * FIXED_WINDOW_MIN_OPACITY_PERCENT). Not keyframed (unlike lit): a window doesn't change during
   * a sighting the way a streetlight's photocell does. */
  windows?: Partial<Record<DecorSide, number>>
  /** Which side of this object the recording witness is positioned at, looking outward through
   * that side, if they're inside this object at all — see canHoldWitness above for which kinds
   * this applies to (building/vehicle; a tree/streetlight/other-witness can't be "inside"). Absent
   * means the witness isn't inside this object. At most one decor object in a sighting is expected
   * to have this set at a time — the recording witness can only be in one place — but that's a UI
   * convention, not enforced here. */
  witnessSide?: DecorSide
  /** Kind "building" only: number of upper stories above the ground floor, set when the building
   * is created (default 2, see UfoRecorderElement.addDecor) and editable afterward. Drives the
   * window rows in the 3D model and the valid range for occupiedFloor (0 = ground floor, up to and
   * including this value). Ignored for every other kind. */
  floors?: number
  /** Kind "building" only, meaningful once witnessSide is set: which floor the witness is on, 0
   * (ground floor) up to floors. Ignored for every other kind, and while witnessSide is absent. */
  occupiedFloor?: number
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
