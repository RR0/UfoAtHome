import { ApparentSize } from "../shape/ApparentSize.js"
import type { SightingRecordingJson } from "../persistence/sightingJson.js"
import type { DecorObject } from "../model/Decor.js"
import { DEFAULT_BUILDING_FLOORS, defaultWindows, hasWindows } from "../model/Decor.js"

/** The neutral pixel box a drafted shape starts life in — one pixel at the middle of the frame.
 * Nothing about it survives loading: SightingShapes.toBounds resizes it about its own centre from
 * the stated angle, and toPosition moves it from the stated direction. It exists only because the
 * two of them read a box, and a draft has no business inventing one. */
const NEUTRAL_BOUNDS = {
  x: ApparentSize.CANVAS_WIDTH_PX / 2,
  y: ApparentSize.CANVAS_HEIGHT_PX / 2,
  width: 1,
  height: 1
}

/** A shape as a draft states it: what it was and where, never how it is painted. */
interface DraftShape {
  kind?: string
  title?: string
  color?: string
  angular?: { widthDeg: number, heightDeg: number }
  aim?: { azimuthDeg: number, altitudeDeg: number }
  [key: string]: unknown
}

/**
 * Turns what a provider proposes into something the editor can actually load.
 *
 * A recording's shapes carry two quite different kinds of field. There is what the witness said —
 * the angle it spanned, the direction it was in, what to call it — and there is how the thing gets
 * painted: a pixel box, a transparency, a halo scale, a selection flag. Only the first kind is
 * testimony, so it is the only kind a draft is asked for; the second is derived on load from the
 * first (see SightingShapes.toBounds and toPosition) and would be pure invention coming from an
 * account.
 *
 * But it cannot simply be left out, because those very deriving steps read a box before they
 * replace it. So this fills the painting fields in with values that assert nothing, and the load
 * that follows overwrites the ones that matter. The alternative — asking a provider for `bounds`,
 * `transparency` and `haloScale` — would have it make up canvas coordinates for a sighting nobody
 * ever drew, and those numbers would be indistinguishable in the file from ones an author placed.
 */
export class DraftRecording {

  /** `draft` with every shape and every decor object completed, ready for fromSightingJson.
   * Returns a new object. */
  static loadable(draft: Partial<SightingRecordingJson>): Partial<SightingRecordingJson> {
    const decor = draft.decor ? { decor: draft.decor.map((object, index) => DraftRecording.decor(object, index)) } : {}
    const keyframes = draft.timeline?.keyframes
    if (!keyframes) {
      return { ...draft, ...decor }
    }
    return {
      ...draft,
      ...decor,
      timeline: {
        ...draft.timeline,
        keyframes: keyframes.map(keyframe => ({
          t: keyframe.t ?? 0,
          shapes: (keyframe.shapes ?? []).map(state => ({
            sourceId: state.sourceId,
            shape: DraftRecording.shape(state.shape as unknown as DraftShape)
          }))
        }))
      }
    } as Partial<SightingRecordingJson>
  }

  /**
   * A decor object with what it cannot be drawn without.
   *
   * `id` and `kind` have no defaults in the model because nothing ever created one without them; a
   * draft can. The PLACEMENT is deliberately left exactly as stated, including 0,0 — which looks
   * like a mistake and is not: an object the witness is inside carries `witnessSide`, and the
   * renderer then seats the camera within it (see DecorSystem.occupantView), so a car at the
   * witness's own position is a car around them rather than one drawn on the lens. Nudging it clear
   * would move the vehicle out from under its own driver.
   *
   * The WINDOWS are the reason this matters. A side absent from `windows` has no opening there at
   * all, so a vehicle drafted without the field is a sealed box — and a witness seated inside one
   * sees grey where the sky should be, which is exactly what the first real draft rendered. The
   * editor's own Add never had the problem because it spreads defaultWindows in; a draft has no
   * business inventing per-side opacities, so it gets the same defaults rather than a question.
   */
  private static decor(object: DecorObject, index: number): DecorObject {
    const kind = object.kind ?? "vehicle"
    return {
      ...(hasWindows(kind) ? { windows: defaultWindows(kind) } : {}),
      ...(kind === "building" ? { floors: DEFAULT_BUILDING_FLOORS } : {}),
      ...object,
      id: object.id ?? `decor-${index + 1}`,
      kind,
      eastM: object.eastM ?? 0,
      northM: object.northM ?? 0
    }
  }

  private static shape(shape: DraftShape): unknown {
    const kind = shape?.kind === "polygon" ? "polygon" : "oval"
    return {
      // A polygon needs its outline, and a draft that named the kind without giving one gets the
      // box's four corners — a quad, which is exactly what the editor's own Polygon preset starts
      // from and what the author then drags into shape.
      ...(kind === "polygon"
        ? { points: [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }, { x: 0, y: 1 }] }
        : {}),
      ...shape,
      kind,
      bounds: { ...NEUTRAL_BOUNDS },
      color: typeof shape?.color === "string" ? shape.color : "#e8e6df",
      angle: 0,
      transparency: 0,
      haloScale: 0,
      selected: false
    }
  }
}
