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
