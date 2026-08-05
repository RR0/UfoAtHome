import type { Keyframe, ShapeState } from "./Keyframe.js"
import type { Shape } from "../shape/Shape.js"
import { lerpShape, shapeContains } from "../shape/Shape.js"

export interface TimelineJson {
  keyframes: Keyframe[]
  /** Back-to-front paint/hit-test order — see Timeline's own `order` field. Optional: absent on
   * anything saved before z-order control existed, or hand-written JSON; fromJSON() then falls
   * back to first-appearance order (the old implicit behavior), same as if this were `[]`. */
  order?: string[]
}

/**
 * A keyframe store, sorted by time, replacing the original DrawModel's
 * Hashtable<formatted-date-string, Vector<DrawEvent>> with a plain numeric
 * millisecond-offset clock.
 */
export class Timeline {
  private readonly keyframes: Keyframe[] = []
  /** Explicit back-to-front paint/hit-test order (index 0 = bottommost/backmost, last = topmost/
   * frontmost) — see sourceIds, bringToFront, sendToBack. A source joins at the front (pushed to
   * the end) the first time it's ever written, matching the old implicit "most recently added
   * paints on top" behavior; from then on this array, not keyframe insertion order, is the
   * single source of truth for both painting (Player) and click hit-testing (below) — the two
   * MUST agree, or a click could hit a shape while its own paint order shows something else on
   * top of it. */
  private order: string[] = []

  /**
   * Merges `shapes` into any existing keyframe at `t` by sourceId — untouched sources keep
   * their prior entry, incoming ones replace/add theirs — rather than replacing the whole
   * keyframe wholesale. This matters once more than one source can be recorded/edited
   * independently: two takes recorded separately very likely sample the same elapsed `t`
   * (both start at 0), and a naive full-replace would silently wipe one source's data
   * whenever the other's write landed on the same instant.
   */
  addKeyframe(t: number, shapes: ShapeState[]): void {
    const index = this.findInsertIndex(t)
    if (this.keyframes[index]?.t === t) {
      const incomingIds = new Set(shapes.map(s => s.sourceId))
      this.keyframes[index] = {
        t,
        shapes: [...this.keyframes[index].shapes.filter(s => !incomingIds.has(s.sourceId)), ...shapes]
      }
    } else {
      this.keyframes.splice(index, 0, { t, shapes: [...shapes] })
    }
    for (const shape of shapes) {
      if (!this.order.includes(shape.sourceId)) this.order.push(shape.sourceId)
    }
  }

  private findInsertIndex(t: number): number {
    let low = 0
    let high = this.keyframes.length
    while (low < high) {
      const mid = (low + high) >>> 1
      if (this.keyframes[mid].t < t) {
        low = mid + 1
      } else {
        high = mid
      }
    }
    return low
  }

  getKeyframeAt(t: number): Keyframe | undefined {
    const index = this.findInsertIndex(t)
    const candidate = this.keyframes[index]
    return candidate?.t === t ? candidate : undefined
  }

  getShapeAt(t: number, sourceId: string): Shape | undefined {
    return this.getKeyframeAt(t)?.shapes.find(s => s.sourceId === sourceId)?.shape
  }

  /**
   * Finds the most recent shape recorded at-or-before t for that source (hold-last-value),
   * which is what playback needs since not every source has a keyframe at every sampled tick.
   */
  getLatestShapeAt(t: number, sourceId: string): Shape | undefined {
    let index = this.findInsertIndex(t)
    if (this.keyframes[index]?.t !== t) {
      index -= 1
    }
    for (; index >= 0; index--) {
      const found = this.keyframes[index].shapes.find(s => s.sourceId === sourceId)
      if (found) return found.shape
    }
    return undefined
  }

  /**
   * Like getLatestShapeAt, but blends toward the source's next keyframe instead of holding the
   * last one — this is what Player uses for smooth motion. Falls back to hold-last-value at the
   * ends of the source's recorded range (before its first keyframe, or after its last).
   */
  getInterpolatedShapeAt(t: number, sourceId: string): Shape | undefined {
    const from = this.findShapeAtOrBefore(t, sourceId)
    if (from?.t === t) return from.shape
    const to = this.findShapeAtOrAfter(t, sourceId)
    if (!from) return to?.shape
    if (!to) return from.shape
    return lerpShape(from.shape, to.shape, (t - from.t) / (to.t - from.t))
  }

  private findShapeAtOrBefore(t: number, sourceId: string): { t: number; shape: Shape } | undefined {
    let index = this.findInsertIndex(t)
    if (this.keyframes[index]?.t !== t) {
      index -= 1
    }
    for (; index >= 0; index--) {
      const found = this.keyframes[index].shapes.find(s => s.sourceId === sourceId)
      if (found) return { t: this.keyframes[index].t, shape: found.shape }
    }
    return undefined
  }

  private findShapeAtOrAfter(t: number, sourceId: string): { t: number; shape: Shape } | undefined {
    for (let index = this.findInsertIndex(t); index < this.keyframes.length; index++) {
      const found = this.keyframes[index].shapes.find(s => s.sourceId === sourceId)
      if (found) return { t: this.keyframes[index].t, shape: found.shape }
    }
    return undefined
  }

  /**
   * Hit-tests against each source's INTERPOLATED shape at `t`, not just a literal keyframe —
   * otherwise clicking a shape at any scrubbed instant that isn't an exact keyframe (the
   * normal case) would find nothing. Iterates sourceIds in reverse so the most-recently-added
   * source — painted last/on top by Player/onFrame — wins when shapes overlap.
   */
  hitTest(t: number, x: number, y: number): ShapeState | undefined {
    const ids = this.sourceIds
    for (let i = ids.length - 1; i >= 0; i--) {
      const shape = this.getInterpolatedShapeAt(t, ids[i])
      if (shape && shapeContains(shape, x, y)) {
        return { sourceId: ids[i], shape }
      }
    }
    return undefined
  }

  /**
   * Strips one source out of every keyframe it appears in — the counterpart to addKeyframe's
   * own per-source merge, so deleting a shape can't touch any other source's data. Keyframes
   * left with no shapes at all are dropped entirely rather than kept as empty entries, matching
   * addKeyframe never producing one in the first place.
   */
  removeSource(sourceId: string): void {
    for (let i = this.keyframes.length - 1; i >= 0; i--) {
      const shapes = this.keyframes[i].shapes.filter(s => s.sourceId !== sourceId)
      if (shapes.length === 0) {
        this.keyframes.splice(i, 1)
      } else if (shapes.length !== this.keyframes[i].shapes.length) {
        this.keyframes[i] = { t: this.keyframes[i].t, shapes }
      }
    }
    this.order = this.order.filter(id => id !== sourceId)
  }

  /** Moves a source to the front (painted/hit-tested last, i.e. on top of everything else) — a
   * no-op for an unknown sourceId, same as removeSource. */
  bringToFront(sourceId: string): void {
    const index = this.order.indexOf(sourceId)
    if (index === -1) return
    this.order.splice(index, 1)
    this.order.push(sourceId)
  }

  /** Moves a source to the back (painted/hit-tested first, i.e. behind everything else). */
  sendToBack(sourceId: string): void {
    const index = this.order.indexOf(sourceId)
    if (index === -1) return
    this.order.splice(index, 1)
    this.order.unshift(sourceId)
  }

  get duration(): number {
    return this.keyframes.length === 0 ? 0 : this.keyframes[this.keyframes.length - 1].t
  }

  /** Back-to-front: index 0 is bottommost/backmost, the last entry is topmost/frontmost — see
   * the `order` field's own doc comment. Player paints in this order (later = on top); hitTest
   * (above) walks it in reverse so the topmost shape wins a click. */
  get sourceIds(): string[] {
    return [...this.order]
  }

  get allKeyframes(): ReadonlyArray<Keyframe> {
    return this.keyframes
  }

  toJSON(): TimelineJson {
    return { keyframes: this.keyframes, order: this.order }
  }

  static fromJSON(json: TimelineJson): Timeline {
    const timeline = new Timeline()
    for (const keyframe of json.keyframes) {
      timeline.addKeyframe(keyframe.t, keyframe.shapes)
    }
    if (json.order) {
      // Respects a saved custom arrangement, but never silently drops a source the keyframes
      // actually contain just because an incomplete/stale `order` list omitted it — appended at
      // the end (arbitrary but safe) rather than left unpaintable.
      const missing = timeline.order.filter(id => !json.order!.includes(id))
      timeline.order = [...json.order, ...missing]
    }
    return timeline
  }
}
