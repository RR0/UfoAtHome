import type { SightingRecordingJson } from "../persistence/sightingJson.js"

/** One shape as a digest states it — what it IS and where it was seen, never how it is drawn. */
interface ShapeDigest {
  sourceId: string
  kind: string
  title?: string
  /** How big it looked, degrees — see BaseShape.angular. */
  angular?: { widthDeg: number, heightDeg: number }
  /** Which way it was, degrees — see BaseShape.aim. */
  aim?: { azimuthDeg: number, altitudeDeg: number }
}

interface KeyframeDigest {
  t: number
  shapes: ShapeDigest[]
}

/** What a digest says about a recording. Every field but `timeline` is the recording's own. */
export interface RecordingDigestJson extends Omit<Partial<SightingRecordingJson>, "timeline"> {
  timeline?: { keyframes: KeyframeDigest[] }
}

/**
 * A recording, cut down to what a reader has to know to correct it.
 *
 * The Messages API remembers nothing, so every round of corrections resends the state of things,
 * and the state of things is large: Socorro's recording runs 62 KB, 44 of them keyframes whose
 * every shape carries a pixel box, a colour, a transparency, a halo scale and a selection flag.
 * None of that is testimony. It is how the drawing happens to be drawn today, derived on load from
 * the angles and directions that ARE the testimony (see SightingShapes.toBounds/toPosition), and
 * sending it round after round would pay for the timeline again on every correction.
 *
 * So a digest keeps the account whole — time, place, witness, description, tags, decor, weather,
 * instrument, the named moments — and reduces the timeline to what each shape looked like and
 * which way it was, at each moment there is a pose for. That is exactly the vocabulary a correction
 * is phrased in ("it was higher than that", "it was two Moons wide, not one"), and nothing else in
 * a keyframe can be corrected in words at all.
 */
export class RecordingDigest {

  /** The digest of `recording`, or undefined for an empty editor — a recording with no moment, no
   * place and no shape says nothing worth a round trip, and sending it would only invite a model to
   * treat its emptiness as a statement. */
  static of(recording: SightingRecordingJson): RecordingDigestJson | undefined {
    const { timeline, ...rest } = recording
    const keyframes = (timeline?.keyframes ?? []).map(keyframe => RecordingDigest.keyframe(keyframe))
    const stated = Object.entries(rest).filter(([key, value]) => key !== "version" && value !== undefined)
    if (stated.length === 0 && keyframes.every(keyframe => keyframe.shapes.length === 0)) {
      return undefined
    }
    return {
      ...Object.fromEntries(stated),
      ...(keyframes.length > 0 ? { timeline: { keyframes } } : {})
    }
  }

  private static keyframe(keyframe: { t: number, shapes: { sourceId: string, shape: unknown }[] }): KeyframeDigest {
    return { t: keyframe.t, shapes: keyframe.shapes.map(state => RecordingDigest.shape(state.sourceId, state.shape)) }
  }

  private static shape(sourceId: string, shape: unknown): ShapeDigest {
    // Read defensively rather than through the Shape union: a digest is built from whatever JSON
    // was loaded, including a hand-written file whose shape is missing fields the type promises.
    const source = (shape ?? {}) as {
      kind?: string
      title?: string
      angular?: { widthDeg?: number, heightDeg?: number }
      aim?: { azimuthDeg?: number, altitudeDeg?: number }
    }
    const angular = source.angular
    const aim = source.aim
    return {
      sourceId,
      kind: source.kind ?? "oval",
      ...(source.title === undefined ? {} : { title: source.title }),
      ...(angular?.widthDeg === undefined || angular.heightDeg === undefined
        ? {}
        : { angular: { widthDeg: angular.widthDeg, heightDeg: angular.heightDeg } }),
      ...(aim?.azimuthDeg === undefined || aim.altitudeDeg === undefined
        ? {}
        : { aim: { azimuthDeg: aim.azimuthDeg, altitudeDeg: aim.altitudeDeg } })
    }
  }
}
