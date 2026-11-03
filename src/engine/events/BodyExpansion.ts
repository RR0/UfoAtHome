import type { BodyJson, BodyKeyframe } from "../interpretation/Interpretation.js"
import type { MotionParams, RecordingEventJson, RideParams, RiseParams, SpinParams, TurnParams } from "./RecordingEvent.js"

/** Where a body is, in the frame its keyframes place it in: metres east and north, and how high its bottom is above the ground. */
interface Place {
  eastM: number
  northM: number
  aboveGroundM: number
}

/**
 * A body's keyframes worked out from its events (see MotionParams, SpinParams, RiseParams, and `vanish`: it is no longer there), added to the ones
 * it states itself (where it is to begin with, its size, how it looks). A movement of its model gets a keyframe at each end; a rise one every
 * SAMPLE_MS, along its line.
 */
export class BodyExpansion {
  private static readonly SAMPLE_MS = 250

  constructor(private readonly body: BodyJson, private readonly events: RecordingEventJson[]) {
  }

  /** The body's track with its events' keyframes in it, in order. */
  track(): BodyKeyframe[] {
    const keys = new Map<number, BodyKeyframe>()
    const put = (key: BodyKeyframe) => {
      const at = keys.get(key.t)
      keys.set(key.t, at ? { ...at, ...key, motions: { ...at.motions, ...key.motions } } : key)
    }
    for (const key of this.body.track) put({ ...key })
    const ordered = [...this.events].sort((a, b) => a.t - b.t)
    // Where each movement and the heading stand before the events, as the body states them (a being crouched to begin with).
    const motions = new Map<string, number>()
    let headingDeg = 0
    for (const key of this.body.track) {
      for (const [name, value] of Object.entries(key.motions ?? {})) motions.set(name, value)
      if (key.attitude?.headingDeg !== undefined) headingDeg = key.attitude.headingDeg
    }
    let place = this.startPlace()
    for (const event of ordered) {
      if (event.eventType === "motion" || event.eventType === "spin") {
        const params = event.params as unknown as MotionParams & SpinParams
        const from = motions.get(params.motion) ?? 0
        const until = event.until ?? event.t
        const to = event.eventType === "motion" ? params.to : from + params.turnsPerS * (until - event.t) / 1000
        put({ t: event.t, motions: { [params.motion]: from } })
        put({ t: until, motions: { [params.motion]: to } })
        motions.set(params.motion, to)
      } else if (event.eventType === "rise" && place) {
        const params = event.params as unknown as RiseParams
        const until = event.until ?? event.t
        const angle = params.angleDeg * Math.PI / 180, heading = (params.headingDeg ?? 0) * Math.PI / 180
        const start = place
        const at = (f: number): Place => {
          // From still: slowing down into its stop (the minimum-jerk curve), or speeding up all the way (constant acceleration).
          const share = params.stops === false ? f * f : f * f * f * (10 - 15 * f + 6 * f * f)
          const along = params.distanceM * share
          return {
            eastM: start.eastM + along * Math.sin(angle) * Math.sin(heading),
            northM: start.northM + along * Math.sin(angle) * Math.cos(heading),
            aboveGroundM: start.aboveGroundM + along * Math.cos(angle)
          }
        }
        for (let t = event.t; t < until; t += BodyExpansion.SAMPLE_MS) put(BodyExpansion.key(t, at((t - event.t) / (until - event.t))))
        place = at(1)
        put(BodyExpansion.key(until, place))
      } else if (event.eventType === "turn") {
        const params = event.params as unknown as TurnParams
        put({ t: event.t, attitude: { headingDeg } })
        put({ t: event.until ?? event.t, attitude: { headingDeg: params.headingDeg } })
        headingDeg = params.headingDeg
      } else if (event.eventType === "vanish") {
        put({ t: event.t, present: false })
      }
    }
    return [...keys.values()].sort((a, b) => a.t - b.t)
  }

  /** The keyframes of a body carried by `carrier` (see RideParams): at each of the carrier's keyframes that places it, there too, higher. */
  static ride(body: BodyJson, event: RecordingEventJson, carrier: BodyJson): BodyKeyframe[] {
    const params = event.params as unknown as RideParams
    const until = event.until ?? Infinity
    const keys = new Map<number, BodyKeyframe>(body.track.map(key => [key.t, { ...key }]))
    for (const key of carrier.track) {
      if (key.t < event.t || key.t > until) continue
      if (key.present === false) keys.set(key.t, { ...keys.get(key.t), t: key.t, present: false })
      if (key.eastM === undefined || key.northM === undefined) continue
      const aboveGroundM = (key.onGround ? 0 : key.altitudeAboveGroundM ?? 0) + params.aboveM
      keys.set(key.t, { ...keys.get(key.t), t: key.t, eastM: key.eastM, northM: key.northM, altitudeAboveGroundM: aboveGroundM })
    }
    return [...keys.values()].sort((a, b) => a.t - b.t)
  }

  /** Where the body stands before its events: its first keyframe that places it in metres. */
  private startPlace(): Place | undefined {
    const key = this.body.track.find(candidate => candidate.eastM !== undefined && candidate.northM !== undefined)
    return key && { eastM: key.eastM!, northM: key.northM!, aboveGroundM: key.onGround ? 0 : key.altitudeAboveGroundM ?? 0 }
  }

  private static key(t: number, place: Place): BodyKeyframe {
    return place.aboveGroundM <= 0
      ? { t, eastM: place.eastM, northM: place.northM, onGround: true }
      : { t, eastM: place.eastM, northM: place.northM, altitudeAboveGroundM: place.aboveGroundM }
  }
}
