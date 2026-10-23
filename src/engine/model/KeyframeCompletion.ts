import type { Keyframe, ShapeState } from "./Keyframe.js"
import type { Shape } from "../shape/Shape.js"
import { ApparentSize } from "../shape/ApparentSize.js"
import type { RecordingIssue } from "../persistence/RecordingIssue.js"

/**
 * Fills in what a keyframe's shape left out, so that a file written by hand (or by a language model
 * following the format page) loads as its author meant it rather than crashing or vanishing.
 *
 * The format has always said that what a keyframe does not restate is held from before. That was
 * true of whole shapes — a source left out of a keyframe keeps its last state — but not of the
 * fields inside one: a polygon keyframe without `points` threw on load ("reading 'map'"), and one
 * without `haloScale` or `brightness` painted nothing, because NaN reached the canvas. The first
 * outsider to build a recording from the documentation alone hit both, and repeated every field of
 * every keyframe to get past them. Holding per field is the rule the page states, so it is the rule
 * the loader now follows.
 *
 * Two fields travel as pairs with the pixel box, and are NOT held across a restated box: `aim` is
 * authoritative over `bounds.x/y` and `angular` over `bounds.width/height` (see BaseShape). A
 * keyframe that restates the box in pixels without the direction is moving the shape by its pixels,
 * and holding the previous direction would silently put it back where it was.
 *
 * A shape's first appearance has nothing to hold from, so it gets values that assert nothing: a
 * one-pixel box at the middle of the frame (replaced on load by the stated angle and direction, see
 * SightingShapes), opaque, no halo, and — for a polygon without an outline — the four corners of its
 * box, which is what the editor's own Polygon preset starts from.
 *
 * Holding is the format's rule and goes unremarked. Everything else this does is a value nobody
 * stated, or a stated one set aside, and each is reported in `issues` (see RecordingIssue): a file
 * that loads should not be taken for a file that says what its author meant.
 */
export class KeyframeCompletion {

  /** The colour a shape gets when none was ever stated: the off-white the drafting path uses. */
  static readonly DEFAULT_COLOR = "#e8e6df"

  /** `keyframes`, sorted by time, with every shape state complete. Returns new objects; what had to
   * be made up or set aside is pushed onto `issues`, with paths counted in the file as written. */
  static complete(keyframes: ReadonlyArray<Keyframe>, issues: RecordingIssue[] = []): Keyframe[] {
    const last = new Map<string, Shape>()
    return keyframes
      .map((keyframe, index) => ({ keyframe, index }))
      .sort((a, b) => a.keyframe.t - b.keyframe.t)
      .map(({ keyframe, index }) => ({
        t: keyframe.t,
        shapes: (keyframe.shapes ?? []).map((state, shapeIndex) => {
          const path = `timeline.keyframes.${index}.shapes.${shapeIndex}.shape`
          const shape = KeyframeCompletion.completed(state, last.get(state.sourceId), path, issues)
          last.set(state.sourceId, shape)
          return { sourceId: state.sourceId, shape }
        })
      }))
  }

  /**
   * The inverse of complete: each shape as a keyframe has to state it for complete to give it back, which is the whole of it where
   * it first appears, and afterwards only what is not what it was. A polygon's outline, which rarely changes, is then written once
   * rather than at every keyframe (a recording of five outlines over two hundred keyframes was half a million lines, and is thirty
   * thousand). A box restated takes its direction and angular size with it, which complete would drop otherwise (see completed).
   */
  static thin(keyframes: ReadonlyArray<Keyframe>, boxDrawnAgain?: (keyframe: number, sourceId: string) => boolean):
    Array<{ t: number, shapes: Array<{ sourceId: string, shape: Partial<Shape> }> }> {
    const last = new Map<string, Shape>()
    // The shapes whose box and outline were left out since they were last written: what loading holds of them is not what memory did.
    const drawnAgain = new Set<string>()
    return keyframes.map((keyframe, index) => ({
      t: keyframe.t,
      shapes: keyframe.shapes.map(state => {
        const previous = last.get(state.sourceId)
        last.set(state.sourceId, state.shape)
        if (!previous) return { sourceId: state.sourceId, shape: state.shape }
        const shape = KeyframeCompletion.thinned(state.shape, previous)
        if (boxDrawnAgain) {
          // Where loading draws the box and the outline again (see SightingShapes.derivable), they are not written. Where it does not
          // after they were left out, they are, whether or not they changed: what loading holds of them is not what memory held.
          const box = shape as Record<string, unknown>
          if (boxDrawnAgain(index, state.sourceId)) {
            delete box.bounds
            delete box.points
            drawnAgain.add(state.sourceId)
          } else if (drawnAgain.delete(state.sourceId)) {
            box.bounds = state.shape.bounds
            if (state.shape.kind === "polygon") box.points = state.shape.points
            if (state.shape.aim) box.aim = state.shape.aim
            if (state.shape.angular) box.angular = state.shape.angular
          }
        }
        return { sourceId: state.sourceId, shape }
      })
    }))
  }

  private static thinned(shape: Shape, previous: Shape): Partial<Shape> {
    const was = previous as unknown as Record<string, unknown>
    const stated: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(shape)) {
      // A value said with what it rests on (`{ value, basis }`, see Provenance) is said again: what it rests on is said of this keyframe,
      // and would not be held as the value is.
      const said = typeof value === "object" && value !== null && !Array.isArray(value) && "value" in value
      // The same object first: a held field is shared from keyframe to keyframe, and an outline is long to compare.
      if (said || (value !== was[key] && JSON.stringify(value) !== JSON.stringify(was[key]))) stated[key] = value
    }
    if ("bounds" in stated) {
      if (shape.aim) stated.aim = shape.aim
      if (shape.angular) stated.angular = shape.angular
    }
    return stated as Partial<Shape>
  }

  private static completed(state: ShapeState, previous: Shape | undefined, path: string, issues: RecordingIssue[]): Shape {
    const stated = (state.shape ?? {}) as Partial<Shape>
    const base: Partial<Shape> = previous ?? KeyframeCompletion.firstAppearance(stated, path, issues)
    const held: Partial<Shape> = { ...base }
    if (stated.bounds && previous && (previous.aim || previous.angular) && !stated.aim && !stated.angular) {
      issues.push({ kind: "pixels-over-angles", path })
    }
    if (stated.bounds) {
      if (!stated.aim) delete held.aim
      if (!stated.angular) delete held.angular
    }
    const kind = stated.kind ?? base.kind ?? "oval"
    const shape = { ...held, ...stated, kind } as Shape
    if (kind === "polygon" && !(shape as { points?: unknown }).points) {
      issues.push({ kind: "defaulted", path: `${path}.points`, expected: "rectangle" })
      const { width, height } = shape.bounds
      const corners = [{ x: 0, y: 0 }, { x: width, y: 0 }, { x: width, y: height }, { x: 0, y: height }]
      return { ...shape, points: corners } as Shape
    }
    return shape
  }

  private static firstAppearance(stated: Partial<Shape>, path: string, issues: RecordingIssue[]): Partial<Shape> {
    if (!stated.kind) issues.push({ kind: "defaulted", path: `${path}.kind`, expected: "\"oval\"" })
    if (!stated.color) issues.push({ kind: "defaulted", path: `${path}.color`, expected: `"${KeyframeCompletion.DEFAULT_COLOR}"` })
    if (!stated.bounds && !stated.aim) issues.push({ kind: "unplaced", path })
    if (!stated.bounds && !stated.angular) issues.push({ kind: "unsized", path })
    return {
      kind: stated.kind ?? "oval",
      bounds: { ...KeyframeCompletion.NEUTRAL_BOUNDS },
      color: KeyframeCompletion.DEFAULT_COLOR,
      angle: 0,
      transparency: 0,
      haloScale: 0,
      selected: false
    }
  }

  private static readonly NEUTRAL_BOUNDS = {
    x: ApparentSize.CANVAS_WIDTH_PX / 2,
    y: ApparentSize.CANVAS_HEIGHT_PX / 2,
    width: 1,
    height: 1
  }
}
