import { BodyPlacement } from "../interpretation/BodyPlacement.js"
import type { ObserverKeyframe, ObserverPose } from "../model/ObserverTrack.js"
import type { Sighting } from "../model/Sighting.js"
import type { EventPlace, FollowParams, HoldLookParams, RecordingEventJson, WalkParams } from "./RecordingEvent.js"

/**
 * The poses of an observer on foot, from their events (see HoldLookParams, WalkParams, FollowParams): a keyframe where each event starts and
 * ends, the place they are at and the look they hold, and one at each of a followed body's keyframes. Between them the player moves them as
 * it moves anybody (HumanMotion: a walk at its pace, slowing down into a stop; a look that turns as a head does and settles), so nothing in
 * between is written.
 */
export class FootExpansion {
  /** A look's field of view when it says none: an eye's. */
  private static readonly FOV_DEG = 60

  constructor(private readonly sighting: Sighting, private readonly events: RecordingEventJson[]) {
  }

  /** The keyframes, in order. The followed bodies are placed on level ground, as the poses are worked out before the relief is known. */
  keyframes(): ObserverKeyframe[] {
    const looks = this.events.filter(event => event.eventType === "look").sort((a, b) => a.t - b.t)
    const walks = this.events.filter(event => event.eventType === "walk").sort((a, b) => a.t - b.t)
    const follows = this.events.filter(event => event.eventType === "follow").sort((a, b) => a.t - b.t)
    if (looks.length === 0 && walks.length === 0) return []
    const times = new Set<number>([0])
    for (const event of [...looks, ...walks, ...follows]) {
      times.add(event.t)
      if (event.until !== undefined) times.add(event.until)
    }
    const placeAt = (t: number): EventPlace | undefined => {
      let place: EventPlace | undefined
      for (const walk of walks) {
        const params = walk.params as unknown as WalkParams
        if (t <= walk.t) return place ?? params.from
        if (walk.until === undefined || t >= walk.until) place = params.to
        else return undefined
      }
      return place ?? this.sighting.event.place?.[0]
    }
    const lookAt = (t: number): HoldLookParams => {
      const held = [...looks].reverse().find(look => look.t <= t) ?? looks[0]
      return (held?.params ?? { headingDeg: 0, pitchDeg: 0 }) as unknown as HoldLookParams
    }
    // Where the observer is and how they look at the instants the events say, before any body is followed.
    const keyframes: ObserverKeyframe[] = [...times].sort((a, b) => a - b).flatMap(t => {
      const place = placeAt(t)
      if (!place) return []
      const look = lookAt(t)
      return [{ t, pose: FootExpansion.pose(place, look.headingDeg, look.pitchDeg, look.fovDeg) }]
    })
    for (const keyframe of keyframes) this.sighting.observerTrack.addKeyframe(keyframe.t, keyframe.pose)
    for (const follow of follows) this.follow(follow, lookAt(follow.t))
    return [...this.sighting.observerTrack.allKeyframes]
  }

  /** The look on a body at each of its keyframes while it is followed. */
  private follow(event: RecordingEventJson, from: HoldLookParams): void {
    const params = event.params as unknown as FollowParams
    const body = this.sighting.interpretation?.bodies.find(candidate => candidate.id === params.target)
    if (!body) return
    const ground = { heightAt: () => 0 }
    const eyeAt = (t: number) => BodyPlacement.eyeOf(this.sighting, t, ground)
    const placement = new BodyPlacement(body, ground, eyeAt)
    const until = event.until ?? Infinity
    let last: { headingDeg: number, pitchDeg: number } = from
    for (const key of body.track) {
      if (key.t <= event.t || key.t >= until) continue
      const state = placement.at(key.t)
      const eye = eyeAt(key.t)
      const pose = this.sighting.observerTrack.getInterpolatedPoseAt(key.t)
      if (!state || !eye || !pose) continue
      const east = state.eastM - eye.eastM, north = state.northM - eye.northM, up = state.upM - eye.upM
      last = {
        headingDeg: ((Math.atan2(east, north) * 180 / Math.PI) % 360 + 360) % 360,
        pitchDeg: Math.atan2(up, Math.hypot(east, north)) * 180 / Math.PI
      }
      this.sighting.observerTrack.addKeyframe(key.t, { ...pose, headingDeg: last.headingDeg, pitchDeg: last.pitchDeg })
    }
    // Where it was lost, the look stays.
    if (Number.isFinite(until)) {
      const pose = this.sighting.observerTrack.getInterpolatedPoseAt(until)
      if (pose) this.sighting.observerTrack.addKeyframe(until, { ...pose, headingDeg: last.headingDeg, pitchDeg: last.pitchDeg })
    }
  }

  private static pose(place: EventPlace, headingDeg: number, pitchDeg: number, fovDeg = FootExpansion.FOV_DEG): ObserverPose {
    return { lat: place.lat, lng: place.lng, elevationM: 0, headingDeg, pitchDeg, fovDeg }
  }
}
