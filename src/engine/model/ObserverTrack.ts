/**
 * The observer's (witness's) own pose over time — geographic position, elevation, and viewing
 * orientation — as a keyframe track alongside the UFO's Timeline. Kept as its own class rather
 * than folded into Timeline/Keyframe: an ObserverPose isn't a ShapeState (no sourceId dimension,
 * exactly one observer per recording), so reusing Timeline's per-source merge logic would only
 * add complexity Timeline needs and this doesn't. The binary-search/hold-last/interpolate pattern
 * is intentionally mirrored from Timeline.ts, not shared, since sharing it would mean generalizing
 * Timeline over a type parameter for no consumer other than this one.
 */
export interface ObserverPose {
  /**
   * Decimal degrees. undefined means no real location is known yet (e.g. an editor where the
   * witness's heading/pitch was set before a lat/lng) — callers needing an actual position for
   * astronomy math must supply their own fallback (never silently default to 0,0 as if that were
   * a real place); camera orientation alone (heading/pitch/fov) doesn't need lat/lng at all.
   */
  lat?: number
  lng?: number
  elevationM: number
  /**
   * Degrees clockwise from true north. undefined means the heading is unknown — callers must
   * fall back to azimuth-agnostic rendering in that case, never default to 0, which would
   * silently claim "facing north" for data that never actually recorded a heading.
   */
  headingDeg?: number
  /** Degrees above (positive) or below (negative) the local horizontal — how far up/down the
   * witness was looking, e.g. craning their neck to look overhead. */
  pitchDeg: number
  /** Vertical field of view in degrees, as a Three.js PerspectiveCamera would take it. */
  fovDeg: number
}

export interface ObserverKeyframe {
  t: number
  pose: ObserverPose
}

export interface ObserverTrackJson {
  keyframes: ObserverKeyframe[]
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

/**
 * Interpolates degrees along the shorter arc, e.g. 350deg -> 10deg passes through 0deg (a 20deg
 * turn), not back down through 180deg (a 340deg turn) as a naive linear lerp would.
 */
function lerpAngleDeg(a: number, b: number, t: number): number {
  const delta = ((((b - a) % 360) + 540) % 360) - 180
  return (((a + delta * t) % 360) + 360) % 360
}

function lerpNumber(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

export function lerpObserverPose(a: ObserverPose, b: ObserverPose, t: number): ObserverPose {
  return {
    lat: a.lat === undefined || b.lat === undefined ? undefined : lerpNumber(a.lat, b.lat, t),
    lng: a.lng === undefined || b.lng === undefined ? undefined : lerpNumber(a.lng, b.lng, t),
    elevationM: lerpNumber(a.elevationM, b.elevationM, t),
    headingDeg:
      a.headingDeg === undefined || b.headingDeg === undefined ? undefined : lerpAngleDeg(a.headingDeg, b.headingDeg, t),
    pitchDeg: lerpNumber(a.pitchDeg, b.pitchDeg, t),
    fovDeg: lerpNumber(a.fovDeg, b.fovDeg, t)
  }
}

/**
 * A keyframe store for the observer's pose, sorted by time — same binary-search-insert/hold-
 * last-value/interpolate shape as Timeline, scoped to a single track instead of per-sourceId.
 */
export class ObserverTrack {
  private readonly keyframes: ObserverKeyframe[] = []

  addKeyframe(t: number, pose: ObserverPose): void {
    const index = this.findInsertIndex(t)
    if (this.keyframes[index]?.t === t) {
      this.keyframes[index] = { t, pose }
    } else {
      this.keyframes.splice(index, 0, { t, pose })
    }
  }

  /** Removes every keyframe. */
  clear(): void {
    this.keyframes.length = 0
  }

  /** Removes the keyframe at exactly time t, if one exists — leaves keyframes at every other time
   * untouched, unlike clear(). E.g. an editor's lat/lng/heading/pitch fields blanked out at a
   * specific point on the timeline should un-record just that instant, not erase the observer's
   * whole recorded path. */
  removeKeyframeAt(t: number): void {
    const index = this.findInsertIndex(t)
    if (this.keyframes[index]?.t === t) {
      this.keyframes.splice(index, 1)
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

  /** Hold-last-value: the most recently recorded pose at-or-before t. */
  getLatestPoseAt(t: number): ObserverPose | undefined {
    let index = this.findInsertIndex(t)
    if (this.keyframes[index]?.t !== t) {
      index -= 1
    }
    return index >= 0 ? this.keyframes[index].pose : undefined
  }

  /** Like getLatestPoseAt, but blends toward the next keyframe instead of holding the last one —
   * falls back to hold-last-value at the ends of the recorded range. */
  getInterpolatedPoseAt(t: number): ObserverPose | undefined {
    const index = this.findInsertIndex(t)
    const atOrBefore = this.keyframes[index]?.t === t ? this.keyframes[index] : this.keyframes[index - 1]
    if (atOrBefore?.t === t) return atOrBefore.pose
    const after = this.keyframes[index]?.t === t ? undefined : this.keyframes[index]
    if (!atOrBefore) return after?.pose
    if (!after) return atOrBefore.pose
    return lerpObserverPose(atOrBefore.pose, after.pose, clamp((t - atOrBefore.t) / (after.t - atOrBefore.t), 0, 1))
  }

  get duration(): number {
    return this.keyframes.length === 0 ? 0 : this.keyframes[this.keyframes.length - 1].t
  }

  get allKeyframes(): ReadonlyArray<ObserverKeyframe> {
    return this.keyframes
  }

  toJSON(): ObserverTrackJson {
    return { keyframes: this.keyframes }
  }

  static fromJSON(json: ObserverTrackJson): ObserverTrack {
    const track = new ObserverTrack()
    for (const keyframe of json.keyframes) {
      track.addKeyframe(keyframe.t, keyframe.pose)
    }
    return track
  }
}
