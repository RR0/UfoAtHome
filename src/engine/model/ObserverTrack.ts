import type { SaidPosition } from "./SaidPosition.js"

/**
 * The observer's (observer's) own pose over time — geographic position, elevation, and viewing
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
   * observer's heading/pitch was set before a lat/lng) — callers needing an actual position for
   * astronomy math must supply their own fallback (never silently default to 0,0 as if that were
   * a real place); camera orientation alone (heading/pitch/fov) doesn't need lat/lng at all.
   */
  lat?: number
  lng?: number
  /** How `lat`/`lng` were said, when not as degrees: from a decor object (see SaidPosition). */
  saidPosition?: SaidPosition
  /** Metres above the local ground under the observer, not above sea level: 0 for someone standing on
   * it, the height of a window or a cliff top otherwise. The eye's own height is added on top. */
  elevationM: number
  /**
   * Degrees clockwise from true north. undefined means the heading is unknown — callers must
   * fall back to azimuth-agnostic rendering in that case, never default to 0, which would
   * silently claim "facing north" for data that never actually recorded a heading.
   */
  headingDeg?: number
  /** Degrees above (positive) or below (negative) the local horizontal — how far up/down the
   * observer was looking, e.g. craning their neck to look overhead. */
  pitchDeg: number
  /**
   * How far the instrument itself was tilted about its own line of sight, degrees, positive
   * clockwise as the observer saw it — a camera held askew, a head leaned over.
   *
   * A property of the INSTRUMENT, not of the place. Latitude and heading say where the observer
   * stood and which way they faced; this says nothing about either, only how the device was held —
   * which is why the editor keeps it beside the focal length and the aperture whose own spikes it
   * turns, and not beside the coordinates.
   *
   * Not a way of looking somewhere, either: heading and pitch already say where it pointed, and
   * roll changes none of that. What it changes is the IMAGE — the horizon runs downhill, and
   * a bright light's diffraction spikes turn with the aperture that throws them (see
   * CanvasRenderer.setStarPoints, and LensFlareEffect for the Sun's own). A tilted horizon is one
   * of the commonest things about a real photograph, and a reconstruction that cannot tilt one is
   * a reconstruction that cannot be laid beside the picture it is about.
   *
   * Absent means upright, which is what every recording made before this said by saying nothing.
   */
  rollDeg?: number
  /** Vertical field of view in degrees, as a Three.js PerspectiveCamera would take it. For a
   * camera this IS the focal length, written the way every projection here is anchored (see
   * Instruments.focalLengthMmFor, which converts it back to millimetres for the editor). */
  fovDeg: number
  /**
   * How far the lens was stopped down — undefined for anything the recording did not state, which
   * then falls back to the instrument's own setting (see Instrument.fNumber).
   *
   * On the POSE rather than on the instrument because it is a fact about this observation and not
   * about the device: the same camera is stopped down differently from one photograph to the next,
   * and a recording that keeps it can say the lens was opened up as the light failed. HELD rather
   * than blended between keyframes — an aperture does not pass through the values between two
   * settings on its way from one to the other, unlike a observer turning round.
   *
   * The SHUTTER is not here, and that is a statement: it belongs to the recording as a whole
   * (see Sighting.exposureSeconds). One observation was photographed one way.
   */
  fNumber?: number
  /**
   * How far away the lens was focused, metres — undefined meaning at infinity, which is where a
   * camera pointed at the sky sits and the only setting under which everything celestial comes out
   * sharp.
   *
   * It is what turns the aperture into evidence: a photograph focused at infinity that shows the
   * object sharp says the object was beyond the hyperfocal distance (see DepthOfField), and one
   * focused close that shows it sharp says it was NOT.
   */
  focusDistanceM?: number
  /**
   * What was held in front of the instrument — a FILTERS id, a solar filter for an eclipse. Absent
   * means none, which is every recording made before this existed.
   *
   * On the POSE, like the aperture, because it is a fact about this moment of the observation and
   * not about the device: eclipse glasses are put on for the partial phases and taken off for the
   * two minutes of totality, and a recording that keeps it can say exactly when. HELD between
   * keyframes, not blended — nobody wears half a pair of glasses — and so to say "taken off" a pose
   * states "none" outright, which is the one case where that id is written down.
   */
  filter?: string
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
    rollDeg: lerpNumber(a.rollDeg ?? 0, b.rollDeg ?? 0, t),
    fovDeg: lerpNumber(a.fovDeg, b.fovDeg, t),
    // Held, not blended — see ObserverPose's own doc comment: a camera setting is discrete, and a
    // lens on its way from f/2 to f/16 was never really at f/7.3.
    fNumber: a.fNumber,
    focusDistanceM: a.focusDistanceM,
    filter: a.filter
  }
}

/**
 * How a person moves between two stated poses: not at a constant speed that starts and stops dead,
 * the way a robot turns its head, but the way a body does — gathering speed, carrying it through a
 * movement that goes on, and losing it before a pause.
 *
 * A monotone cubic Hermite curve per channel (Fritsch and Butland's tangents): it passes through
 * every keyframe exactly, so what the recording states is still what it states at its instants; it
 * never overshoots between them, so it never invents a look further round than the observer went;
 * its speed is continuous through a series of keyframes that keep moving; and wherever the data
 * pauses — two keyframes with the same heading, the same place — its speed there is zero, so the
 * movement into the pause slows down and the one out of it picks up.
 *
 * At the two ends of the track the two kinds of channel part company. A place already changing at
 * the first keyframe is a walk or a drive already under way (a van at 130 km/h did not start from
 * rest when the recording did), so it carries on at its first speed. A look is a gesture: a head
 * turn stated by two keyframes starts from still and ends still.
 */
export class HumanMotion {
  /**
   * The value at `t` of a channel sampled at `times`/`values` (at least two), for `t` between the
   * keyframes `index` and `index + 1`. `endsAtRest` is whether the curve starts and ends still.
   */
  static at(times: readonly number[], values: readonly number[], index: number, t: number, endsAtRest: boolean): number {
    const t0 = times[index]
    const t1 = times[index + 1]
    const h = t1 - t0
    if (h <= 0) return values[index]
    const m0 = HumanMotion.tangent(times, values, index, endsAtRest)
    const m1 = HumanMotion.tangent(times, values, index + 1, endsAtRest)
    const s = (t - t0) / h
    const s2 = s * s
    const s3 = s2 * s
    return (2 * s3 - 3 * s2 + 1) * values[index] + (s3 - 2 * s2 + s) * h * m0
      + (-2 * s3 + 3 * s2) * values[index + 1] + (s3 - s2) * h * m1
  }

  /**
   * How long a look takes to settle once it has reached what it turned to, ms: the time constant of the small overshoot and the return
   * that end a turn of the head or the eyes (see gaze). About a tenth of a second, the time of a corrective saccade.
   */
  static readonly SETTLE_MS = 120

  /** What is left of a look's mean pace as it reaches what it turned to (see gaze). */
  static readonly ARRIVAL = 0.5

  /**
   * A look (a heading, a pitch) at `t`, between the keyframes `index` and `index + 1`: as `at` with ends at rest, but a look does not stop
   * dead where it was turning to, the way a camera on a motor does. It arrives still moving, at the pace it turned at, goes a little past,
   * and comes back to settle where the recording says it looked, as a head and eyes do (see SETTLE_MS). Every keyframe is still met
   * exactly, and the speed is continuous through it; the swing beyond is a few percent of the turn, and has died away long before the next
   * keyframe of a pause, which it never moves.
   *
   * Applied to every recording, with nothing to state: a turn that ends in a pause is a gaze that settles.
   */
  static gaze(times: readonly number[], values: readonly number[], index: number, t: number): number {
    const t0 = times[index]
    const t1 = times[index + 1]
    const h = t1 - t0
    if (h <= 0) return values[index]
    const pause = (k: number) => k + 1 < values.length ? values[k + 1] === values[k] : true
    const moving = values[index + 1] !== values[index]
    if (moving && pause(index + 1)) {
      // Arriving still moving, at half the turn's mean pace, instead of slowing to nothing: the speed of a turn of the eyes and the head
      // rises and falls about its middle, and what is left of it at the end is what carries the look past.
      const m0 = HumanMotion.tangent(times, values, index, true)
      const m1 = HumanMotion.ARRIVAL * (values[index + 1] - values[index]) / h
      return HumanMotion.hermite(values[index], m0, values[index + 1], m1, h, (t - t0) / h)
    }
    if (!moving && index > 0 && values[index - 1] !== values[index]) {
      // Just arrived: the swing past, and back.
      return values[index] + HumanMotion.settle(times, values, index, t - t0, h)
    }
    return HumanMotion.at(times, values, index, t, true)
  }

  /**
   * How far past where it arrived at keyframe `k` a look is, `elapsedMs` after: it carries the speed it arrived at, and loses it as a
   * critically damped spring does, `speed × τ × e^(−τ/T)`, faded out to nothing by the next keyframe `spanMs` later (Infinity for none).
   */
  static settle(times: readonly number[], values: readonly number[], k: number, elapsedMs: number, spanMs: number): number {
    const before = times[k] - times[k - 1]
    if (before <= 0 || elapsedMs <= 0) return 0
    const speed = HumanMotion.ARRIVAL * (values[k] - values[k - 1]) / before
    // Never more than about a tenth of the turn past it, whatever its pace.
    const settleMs = Math.min(HumanMotion.SETTLE_MS, 0.4 * before)
    const fade = Number.isFinite(spanMs) ? (1 - Math.min(1, elapsedMs / spanMs)) ** 2 : 1
    return speed * elapsedMs * Math.exp(-elapsedMs / settleMs) * fade
  }

  private static hermite(p0: number, m0: number, p1: number, m1: number, h: number, s: number): number {
    const s2 = s * s
    const s3 = s2 * s
    return (2 * s3 - 3 * s2 + 1) * p0 + (s3 - 2 * s2 + s) * h * m0 + (-2 * s3 + 3 * s2) * p1 + (s3 - s2) * h * m1
  }

  /**
   * How long a walker takes to stop from a walk, or to get into one: under a second. A movement
   * that ends in a pause keeps its pace until then and brakes over this, whatever the time between
   * the two keyframes — a curve spread over the whole stretch would have someone stopping dead
   * spend ten seconds slowing down.
   */
  static readonly BRAKE_S = 0.8

  /**
   * The fraction of a stretch's distance covered at the fraction `s` of its time, for a move that
   * starts from a pause (`fromRest`), ends in one (`toRest`), or both: steady pace, with the braking
   * and the pick-up each lasting BRAKE_S (or half the stretch, if it is shorter than two of them).
   */
  static paced(s: number, durationS: number, fromRest: boolean, toRest: boolean): number {
    if (!fromRest && !toRest) return s
    const b = durationS > 0 ? Math.min(0.5, HumanMotion.BRAKE_S / durationS) : 0.5
    if (fromRest && toRest) {
      const v = 1 / (1 - b)
      if (s <= b) return (v * s * s) / (2 * b)
      if (s >= 1 - b) return 1 - (v * (1 - s) * (1 - s)) / (2 * b)
      return v * (s - b / 2)
    }
    const stopping = (x: number) => {
      const v = 1 / (1 - b / 2)
      if (x <= 1 - b) return v * x
      const u = x - (1 - b)
      return v * (1 - b) + v * (u - (u * u) / (2 * b))
    }
    return toRest ? stopping(s) : 1 - stopping(1 - s)
  }

  private static tangent(times: readonly number[], values: readonly number[], k: number, endsAtRest: boolean): number {
    const last = times.length - 1
    const secant = (a: number) => (values[a + 1] - values[a]) / (times[a + 1] - times[a] || 1)
    if (k === 0) return endsAtRest ? 0 : secant(0)
    if (k === last) return endsAtRest ? 0 : secant(last - 1)
    const before = secant(k - 1)
    const after = secant(k)
    if (before * after <= 0) return 0
    const hBefore = times[k] - times[k - 1]
    const hAfter = times[k + 1] - times[k]
    const w1 = 2 * hAfter + hBefore
    const w2 = hAfter + 2 * hBefore
    return (w1 + w2) / (w1 / before + w2 / after)
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
    if (!after) return this.settledAfterEnd(index - 1, t)
    const linear = lerpObserverPose(atOrBefore.pose, after.pose, clamp((t - atOrBefore.t) / (after.t - atOrBefore.t), 0, 1))
    return this.humanly(index - 1, t, linear)
  }

  /**
   * The pose at `t` past the last keyframe `index`: the last one's, but for a look that turned to it, which settles there as it would
   * before a pause (see HumanMotion.gaze).
   */
  private settledAfterEnd(index: number, t: number): ObserverPose {
    const last = this.keyframes[index]
    if (index < 1) return last.pose
    const before = this.keyframes[index - 1]
    const times = [before.t, last.t]
    const swing = (a: number | undefined, b: number | undefined) =>
      a === undefined || b === undefined ? 0 : HumanMotion.settle(times, [a, b], 1, t - last.t, Infinity)
    const turn = before.pose.headingDeg === undefined || last.pose.headingDeg === undefined ? undefined
      : ((((last.pose.headingDeg - before.pose.headingDeg) % 360) + 540) % 360) - 180
    const heading = last.pose.headingDeg === undefined || turn === undefined ? last.pose.headingDeg
      : (((last.pose.headingDeg + swing(0, turn)) % 360) + 360) % 360
    const pitch = last.pose.pitchDeg + swing(before.pose.pitchDeg, last.pose.pitchDeg)
    return heading === last.pose.headingDeg && pitch === last.pose.pitchDeg ? last.pose : { ...last.pose, headingDeg: heading, pitchDeg: pitch }
  }

  /**
   * The pose at `t`, between keyframes `index` and `index + 1`, moved the way a person moves (see
   * HumanMotion) over the keyframes either side. Channels a neighbouring keyframe leaves unstated
   * (no place, no heading) keep the plain blend.
   */
  private humanly(index: number, t: number, linear: ObserverPose): ObserverPose {
    const from = Math.max(0, index - 1)
    const to = Math.min(this.keyframes.length - 1, index + 2)
    const window = this.keyframes.slice(from, to + 1)
    const at = index - from
    const times = window.map(keyframe => keyframe.t)
    const channel = (read: (pose: ObserverPose) => number | undefined, endsAtRest: boolean): number | undefined => {
      const values = window.map(keyframe => read(keyframe.pose))
      if (values.some(value => value === undefined)) return undefined
      return HumanMotion.at(times, values as number[], at, t, endsAtRest)
    }
    // A look settles where it turned to (see HumanMotion.gaze).
    const look = (read: (pose: ObserverPose) => number | undefined): number | undefined => {
      const values = window.map(keyframe => read(keyframe.pose))
      if (values.some(value => value === undefined)) return undefined
      return HumanMotion.gaze(times, values as number[], at, t)
    }
    // Headings unwrapped along the window, so that a turn through north is a turn and not a spin.
    const headings = window.map(keyframe => keyframe.pose.headingDeg)
    let heading: number | undefined
    if (headings.every(value => value !== undefined)) {
      const unwrapped = [headings[0]!]
      for (let k = 1; k < headings.length; k++) {
        unwrapped.push(unwrapped[k - 1] + ((((headings[k]! - headings[k - 1]!) % 360) + 540) % 360) - 180)
      }
      heading = ((HumanMotion.gaze(times, unwrapped, at, t) % 360) + 360) % 360
    }
    // A move into or out of a pause: straight between the two places, at a walker's own pace and
    // braking (see HumanMotion.paced). Anything else: the curve.
    const a = this.keyframes[index]
    const b = this.keyframes[index + 1]
    const still = (p: ObserverPose, q: ObserverPose) => p.lat === q.lat && p.lng === q.lng && p.elevationM === q.elevationM
    const moving = !still(a.pose, b.pose)
    const fromRest = moving && index > 0 && still(this.keyframes[index - 1].pose, a.pose)
    const toRest = moving && index + 2 < this.keyframes.length && still(b.pose, this.keyframes[index + 2].pose)
    let place: Pick<ObserverPose, "lat" | "lng" | "elevationM"> | undefined
    if (fromRest || toRest) {
      const f = HumanMotion.paced((t - a.t) / (b.t - a.t), (b.t - a.t) / 1000, fromRest, toRest)
      const blend = (p?: number, q?: number) => (p === undefined || q === undefined ? undefined : p + (q - p) * f)
      place = { lat: blend(a.pose.lat, b.pose.lat), lng: blend(a.pose.lng, b.pose.lng), elevationM: blend(a.pose.elevationM, b.pose.elevationM)! }
    }
    return {
      ...linear,
      lat: place ? place.lat : channel(pose => pose.lat, false) ?? linear.lat,
      lng: place ? place.lng : channel(pose => pose.lng, false) ?? linear.lng,
      elevationM: place ? place.elevationM : channel(pose => pose.elevationM, false) ?? linear.elevationM,
      headingDeg: heading ?? linear.headingDeg,
      pitchDeg: look(pose => pose.pitchDeg) ?? linear.pitchDeg,
      rollDeg: channel(pose => pose.rollDeg ?? 0, true) ?? linear.rollDeg,
      fovDeg: channel(pose => pose.fovDeg, true) ?? linear.fovDeg
    }
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
