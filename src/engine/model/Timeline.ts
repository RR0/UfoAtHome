import type { Keyframe, ShapeState } from "./Keyframe.js"
import type { Shape } from "../shape/Shape.js"
import { shapeContains } from "../shape/Shape.js"

export interface TimelineJson {
  keyframes: Keyframe[]
}

/**
 * A keyframe store, sorted by time, replacing the original DrawModel's
 * Hashtable<formatted-date-string, Vector<DrawEvent>> with a plain numeric
 * millisecond-offset clock.
 */
export class Timeline {
  private readonly keyframes: Keyframe[] = []

  addKeyframe(t: number, shapes: ShapeState[]): void {
    const index = this.findInsertIndex(t)
    if (this.keyframes[index]?.t === t) {
      this.keyframes[index] = { t, shapes }
    } else {
      this.keyframes.splice(index, 0, { t, shapes })
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

  hitTest(t: number, x: number, y: number): ShapeState | undefined {
    const keyframe = this.getKeyframeAt(t)
    if (!keyframe) return undefined
    for (let i = keyframe.shapes.length - 1; i >= 0; i--) {
      if (shapeContains(keyframe.shapes[i].shape, x, y)) {
        return keyframe.shapes[i]
      }
    }
    return undefined
  }

  get duration(): number {
    return this.keyframes.length === 0 ? 0 : this.keyframes[this.keyframes.length - 1].t
  }

  get sourceIds(): string[] {
    const ids = new Set<string>()
    for (const keyframe of this.keyframes) {
      for (const shape of keyframe.shapes) {
        ids.add(shape.sourceId)
      }
    }
    return [...ids]
  }

  get allKeyframes(): ReadonlyArray<Keyframe> {
    return this.keyframes
  }

  toJSON(): TimelineJson {
    return { keyframes: this.keyframes }
  }

  static fromJSON(json: TimelineJson): Timeline {
    const timeline = new Timeline()
    for (const keyframe of json.keyframes) {
      timeline.addKeyframe(keyframe.t, keyframe.shapes)
    }
    return timeline
  }
}
