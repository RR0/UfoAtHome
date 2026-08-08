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
 * below for which kinds each concept applies to.
 *
 * The 4 "front-X"/"behind-X" corners exist because a vehicle's LEFT (or right) side actually has
 * TWO windows in real life — a front-door window and a rear-door window, one per seat — not one:
 * "left" alone couldn't say which of the two a witness sitting inside was actually looking
 * through. A building has no such split (see decorSidesFor/witnessSidesFor below) — a wall is a
 * wall, its own left/right side isn't naturally divided into two separately-seated positions the
 * way a car's is. */
export type DecorSide = "front" | "behind" | "left" | "right" | "front-left" | "front-right" | "behind-left" | "behind-right"

/** Every DecorSide value, kind-agnostic — used where a field (e.g. DecorObject.windows,
 * DecorObject.witnessSide) needs to be resynced/cleared regardless of which of them the current
 * kind actually uses; a side outside decorSidesFor(kind) is simply unused/hidden for that kind,
 * not invalid to iterate. See decorSidesFor for which subset is actually meaningful per kind. */
export const DECOR_SIDES: DecorSide[] = ["front", "behind", "left", "right", "front-left", "front-right", "behind-left", "behind-right"]

/** Which DecorSide values a window can meaningfully sit at for this kind — a building's 4 flat
 * walls (front/behind/left/right), or a vehicle's own 6 openings: a fixed windshield/rear window
 * (front/behind — see isWindowOpenable) plus its 2 pairs of door windows (front-left/front-right/
 * behind-left/behind-right) instead of a single left/right — see DecorSide's own doc comment on
 * why. Every other kind has no windows at all (hasWindows already gates that), so the exact list
 * returned for them doesn't matter; front/behind/left/right is returned as a harmless default. */
export function decorSidesFor(kind: DecorKind): DecorSide[] {
  return kind === "vehicle"
    ? ["front", "behind", "front-left", "front-right", "behind-left", "behind-right"]
    : ["front", "behind", "left", "right"]
}

/** Which DecorSide values the recording witness can actually be positioned AT for this kind — a
 * subset of decorSidesFor: a vehicle's occupant sits in one of its 4 door/seat positions
 * (front-left/front-right/behind-left/behind-right), never "at the windshield" or "at the rear
 * window" the way decorSidesFor's own front/behind entries name a fixed pane, not a seat. Every
 * other kind (today: building) has no such distinction — every side decorSidesFor returns for it
 * is equally "a wall you could stand next to" — so this is identical to decorSidesFor there. */
export function witnessSidesFor(kind: DecorKind): DecorSide[] {
  return kind === "vehicle" ? ["front-left", "front-right", "behind-left", "behind-right"] : decorSidesFor(kind)
}

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
  for (const side of decorSidesFor(kind)) {
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
 * fixed, only its 4 door windows (front-left/front-right/behind-left/behind-right) open (see
 * FIXED_WINDOW_MIN_OPACITY_PERCENT for the floor a non-openable side is clamped to instead).
 * Meaningless (returns false) for a kind with no windows at all. */
export function isWindowOpenable(kind: DecorKind, side: DecorSide): boolean {
  if (kind === "building") return true
  if (kind === "vehicle") return side !== "front" && side !== "behind"
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
   * this applies to (building/vehicle; a tree/streetlight/other-witness can't be "inside"), and
   * witnessSidesFor for which DecorSide values are actually valid seats/positions for that kind
   * (a vehicle's occupant is always at one of its 4 door positions, never "at the windshield").
   * Absent means the witness isn't inside this object. At most one decor object in a sighting is
   * expected to have this set at a time — the recording witness can only be in one place — but
   * that's a UI convention, not enforced here. */
  witnessSide?: DecorSide
  /** Kind "building" only: number of upper stories above the ground floor, set when the building
   * is created (default 2, see UfoRecorderElement.addDecor) and editable afterward. Drives the
   * window rows in the 3D model and the valid range for occupiedFloor (0 = ground floor, up to and
   * including this value). Ignored for every other kind. */
  floors?: number
  /** Kind "building" only, meaningful once witnessSide is set: which floor the witness is on, 0
   * (ground floor) up to floors. Ignored for every other kind, and while witnessSide is absent. */
  occupiedFloor?: number
  /** Shape sourceIds (see Timeline.sourceIds/Shape) this decor object sits in front of, from the
   * witness's own reported viewpoint — occluding that shape wherever their screen positions line
   * up (see SceneRenderer.isScreenPointOccluded). Absent/empty (what every new decor object starts
   * at) means this decor object never occludes anything: every shape stays visible in front of it,
   * the same as before this field existed. Per-shape, not a single "in front of the UFO" flag,
   * because a recording can have more than one shape (see Timeline.sourceIds) and the same building
   * might genuinely pass in front of one and behind another — e.g. two independently moving lights
   * reported by the same witness. There's also no way to derive this from geometry alone: the same
   * testimony could equally report either physical relationship for a given shape, a judgment call
   * that isn't recorded anywhere else in the data model — so it's a deliberate per-shape choice set
   * by hand (see UfoRecorderElement's own "masks" checkbox list) rather than an automatic rule. */
  occludesSourceIds?: string[]
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
