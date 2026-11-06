import { BodyPlacement } from "../interpretation/BodyPlacement.js"
import type { ObserverKeyframe, ObserverPose } from "../model/ObserverTrack.js"
import type { Sighting } from "../model/Sighting.js"
import type { EventPlace, FollowParams, HoldLookParams, RecordingEventJson, WalkParams } from "./RecordingEvent.js"
import { RecordingActors } from "./RecordingActors.js"
import { SkyPath } from "./SkyPath.js"

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

  /** The look on a body at each of its keyframes while it is followed; on a phenomenon going across the sky, every FOLLOW_SKY_MS. */
  private follow(event: RecordingEventJson, from: HoldLookParams): void {
    const params = event.params as unknown as FollowParams
    if (this.followSky(event, from)) return
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

  /** How often the look on a phenomenon going across the sky is written, ms; worked out twice as often, for where it is overhead. */
  private static readonly FOLLOW_SKY_MS = 50
  /** How long the eyes take to catch up with it once they react, ms (see FollowParams.reactionS). */
  private static readonly CATCH_UP_MS = 900
  /** Above this altitude, the head goes back and the body turns: the heading is spread over the time it is that high, degrees. */
  private static readonly OVERHEAD_DEG = 78
  /** As far back as a head looks up, degrees. */
  private static readonly HIGHEST_PITCH_DEG = 88

  /**
   * The look on a phenomenon going across the sky (see TravelParams), when that is what is followed: where it was `lagS` before, the eyes
   * reaching it from the look they held `reactionS` after they start following, over CATCH_UP_MS; overhead, the heading spread over the time
   * it is there, as the body turns under a head thrown back. False when the target is not one.
   */
  private followSky(event: RecordingEventJson, from: HoldLookParams): boolean {
    const params = event.params as unknown as FollowParams
    const within = RecordingActors.within(this.sighting, params.target)
    const all = this.sighting.events ?? []
    const travel = all.find(candidate => candidate.eventType === "travel" && candidate.who !== undefined && within.has(candidate.who))
    if (!travel) return false
    const end = this.sighting.event.durationSeconds !== undefined ? this.sighting.event.durationSeconds * 1000 : travel.until ?? event.t
    const path = new SkyPath(travel, all.filter(candidate => candidate.eventType === "turn" && candidate.who !== undefined && within.has(candidate.who)), end)
    const until = event.until ?? end
    const lagMs = (params.lagS ?? 0) * 1000, reactionMs = (params.reactionS ?? 0) * 1000
    const times: number[] = []
    for (let t = event.t; t <= until; t += FootExpansion.FOLLOW_SKY_MS / 2) times.push(t)
    const seen = times.map(t => path.at(Math.max(travel.t, t - lagMs)))
    const headings = seen.map(direction => direction.azimuthDeg)
    const over = seen.flatMap((direction, index) => direction.altitudeDeg > FootExpansion.OVERHEAD_DEG ? [index] : [])
    if (over.length > 0) {
      const first = Math.max(0, over[0] - 1), last = Math.min(times.length - 1, over[over.length - 1] + 1)
      const h0 = headings[first], delta = ((headings[last] - h0 + 540) % 360) - 180
      for (let index = first; index <= last; index++) headings[index] = ((h0 + delta * SkyPath.smooth((index - first) / (last - first))) % 360 + 360) % 360
    }
    times.forEach((t, index) => {
      if ((t - event.t) % FootExpansion.FOLLOW_SKY_MS !== 0) return
      const k = SkyPath.smooth((t - event.t - reactionMs) / FootExpansion.CATCH_UP_MS)
      const d = ((headings[index] - from.headingDeg + 540) % 360) - 180
      const pitch = Math.min(seen[index].altitudeDeg, FootExpansion.HIGHEST_PITCH_DEG)
      const pose = this.sighting.observerTrack.getInterpolatedPoseAt(t) ?? this.sighting.observerTrack.getLatestPoseAt(t)
      if (!pose) return
      const round = (value: number) => Math.round(value * 100) / 100
      this.sighting.observerTrack.addKeyframe(t, {
        ...pose,
        headingDeg: round(((from.headingDeg + d * k) % 360 + 360) % 360),
        pitchDeg: round(from.pitchDeg + (pitch - from.pitchDeg) * k)
      })
    })
    return true
  }

  private static pose(place: EventPlace, headingDeg: number, pitchDeg: number, fovDeg = FootExpansion.FOV_DEG): ObserverPose {
    return { lat: place.lat, lng: place.lng, elevationM: 0, headingDeg, pitchDeg, fovDeg }
  }
}
