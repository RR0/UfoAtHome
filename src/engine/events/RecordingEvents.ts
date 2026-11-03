import type { DecorPlacementKeyframe } from "../model/Decor.js"
import type { ObserverKeyframe } from "../model/ObserverTrack.js"
import type { Sighting } from "../model/Sighting.js"
import { DriveExpansion } from "./DriveExpansion.js"
import { GazeExpansion } from "./GazeExpansion.js"
import { FootExpansion } from "./FootExpansion.js"
import { PhenomenonExpansion } from "./PhenomenonExpansion.js"
import { Timeline } from "../model/Timeline.js"
import { SightingShapes } from "../persistence/SightingShapes.js"
import type { DriveParams, FlyParams, LeanParams, LookAheadParams, RecordingEventJson, StandParams, WatchParams } from "./RecordingEvent.js"

/** What the events of a recording were worked out into, as it was: what is written back as events alone if nothing has changed it since. */
export interface EventsExpansion {
  observerTrack?: string
  /** The account's shapes, once they have been drawn as a recording writes them (see settle). */
  timeline?: string
  /** Whether the account's shapes are the events', and are still to be taken as they are once drawn. */
  timelinePending?: boolean
  decorTracks: Record<string, string>
}

/**
 * Works out the values a recording's events imply (see RecordingEventJson) when it is read, and says which of its values are theirs when it is
 * written, so that a recording states its events and not their values.
 *
 * What the file states itself wins: an observer's track with keyframes of its own is played as it is, and the events that would have moved
 * them are not applied (a recording written before them, or one exported expanded, reads as it did); a vehicle with a track of its own keeps
 * it. What the events give is written back as the events alone as long as it is what they give: an edit of the poses keeps the edited poses.
 *
 * The observer's kinds on foot: look (a look held), walk (see WalkParams), follow (see FollowParams). In a vehicle, all needing a `drive` (its
 * motion):
 * - drive: see DriveParams;
 * - lookAhead: see LookAheadParams;
 * - lean: see LeanParams;
 * - watch: see WatchParams.
 *
 * A decor object's (`who` its id): fly, see FlyParams.
 */
export class RecordingEvents {
  /** A standing observer's eye above the ground, m: a seated one's elevation is counted from it (see BodyPlacement.EYE_HEIGHT_M). */
  private static readonly STANDING_EYE_M = 1.6
  /** Metres in a degree, as the scene places a decor object from the observer's first pose (see SceneRenderer.updateDecorAnchoring). */
  private static readonly METERS_PER_DEGREE = 111320

  /** Gives `sighting` the values of its events, where it states none of its own. */
  static expand(sighting: Sighting): void {
    RecordingEvents.expandObserver(sighting)
    RecordingEvents.expandFlights(sighting)
    RecordingEvents.expandPhenomenon(sighting)
  }

  /** The account's shapes, from what the phenomenon did (see PhenomenonExpansion), when the recording draws none itself. */
  private static expandPhenomenon(sighting: Sighting): void {
    const events = (sighting.events ?? []).filter(event => event.who === "phenomenon")
    const stand = events.find(event => event.eventType === "stand")
    if (!stand || sighting.timeline.allKeyframes.length > 0) return
    const json = new PhenomenonExpansion(sighting, stand, events, stand.until ?? RecordingEvents.endOf(sighting)).timeline()
    for (const keyframe of Timeline.fromJSON(json).allKeyframes) sighting.timeline.addKeyframe(keyframe.t, keyframe.shapes)
    sighting.eventsExpansion ??= { decorTracks: {} }
    sighting.eventsExpansion.timelinePending = true
  }

  /**
   * Takes the account's shapes the events gave as they are once the recording is read: drawn (their boxes), and stated again as a recording
   * writes them, which is what they are compared with when it is written.
   */
  static settle(sighting: Sighting): void {
    if (!sighting.eventsExpansion?.timelinePending) return
    SightingShapes.toAngular(sighting)
    SightingShapes.toAim(sighting)
    sighting.eventsExpansion.timeline = JSON.stringify(sighting.timeline.toJSON())
    sighting.eventsExpansion.timelinePending = false
  }

  /** Whether the account's shapes are still what the events gave: written back as the events alone, then. */
  static timelineIsExpanded(sighting: Sighting): boolean {
    return sighting.eventsExpansion?.timeline !== undefined && sighting.eventsExpansion.timeline === JSON.stringify(sighting.timeline.toJSON())
  }

  /** The tracks of the decor objects that fly (see FlyParams), placed from the observer's first pose as every decor object is. */
  private static expandFlights(sighting: Sighting): void {
    const origin = sighting.observerTrack.allKeyframes[0]?.pose ?? sighting.event.place?.[0]
    if (origin?.lat === undefined || origin.lng === undefined) return
    const cosOrigin = Math.cos(origin.lat * Math.PI / 180)
    for (const event of sighting.events ?? []) {
      if (event.eventType !== "fly" || event.who === undefined) continue
      const object = sighting.decor.find(candidate => candidate.id === event.who)
      if (!object || object.track?.length) continue
      const params = event.params as unknown as FlyParams
      const until = event.until ?? RecordingEvents.endOf(sighting)
      const h = params.headingDeg * Math.PI / 180
      const fromEast = (params.from.lng - origin.lng) * Math.PI / 180 * RecordingEvents.R * cosOrigin
      const fromNorth = (params.from.lat - origin.lat) * Math.PI / 180 * RecordingEvents.R
      const speeds = params.speeds.map(({ t, kmh }) => ({ t, value: kmh / 3.6 }))
      const heights = params.heights.map(({ t, altitudeM }) => ({ t, value: altitudeM }))
      // How far it has flown from `at.t` to `t`, m: the speeds integrated, either way in time.
      const flown = (t: number) => {
        const step = Math.sign(t - params.at.t) * RecordingEvents.FLY_STEP_MS
        let metres = 0
        for (let u = params.at.t; step !== 0 && (step > 0 ? u < t : u > t); u += step) {
          const next = step > 0 ? Math.min(t, u + step) : Math.max(t, u + step)
          metres += (DriveExpansion.linear(speeds, u) + DriveExpansion.linear(speeds, next)) / 2 * (next - u) / 1000
        }
        return metres
      }
      const track: DecorPlacementKeyframe[] = []
      for (let t = event.t; t <= until; t += DriveExpansion.SAMPLE_MS) {
        const before = params.at.metresBefore - flown(t)
        track.push({
          t,
          eastM: fromEast - Math.sin(h) * before,
          northM: fromNorth - Math.cos(h) * before,
          altitudeM: DriveExpansion.linear(heights, t),
          headingDeg: params.headingDeg
        })
      }
      object.track = track
      object.eastM = track[0].eastM
      object.northM = track[0].northM
      object.headingDeg = params.headingDeg
      sighting.eventsExpansion ??= { decorTracks: {} }
      sighting.eventsExpansion.decorTracks[object.id] = JSON.stringify(track)
    }
  }

  /** The Earth's mean radius, m, as the surveys' frame uses it. */
  private static readonly R = 6371008.8
  /** The integration step of a flight's speeds, ms. */
  private static readonly FLY_STEP_MS = 100

  /** Gives the observer, and the vehicle they are in, the values of their events. */
  private static expandObserver(sighting: Sighting): void {
    const events = (sighting.events ?? []).filter(event => (event.who ?? "observer") === "observer")
    const drive = events.find(event => event.eventType === "drive")
    const lookAhead = events.find(event => event.eventType === "lookAhead")
    if (sighting.observerTrack.allKeyframes.length > 0) return
    if (!drive) {
      // On foot: where they walk, what they look at, what they follow.
      if (new FootExpansion(sighting, events).keyframes().length > 0) {
        sighting.eventsExpansion = { observerTrack: JSON.stringify(sighting.observerTrack.toJSON()), decorTracks: {} }
      }
      return
    }
    if (!lookAhead) return
    const until = drive.until ?? RecordingEvents.endOf(sighting)
    const driveParams = drive.params as unknown as DriveParams
    const expansion = new DriveExpansion(driveParams, drive.t, until)
    const lean = events.find(event => event.eventType === "lean")
    const watch = events.find(event => event.eventType === "watch")
    const gaze = new GazeExpansion(
      expansion, driveParams.eye, lookAhead.params as unknown as LookAheadParams,
      lean && { t: lean.t, params: lean.params as unknown as LeanParams },
      watch && { t: watch.t, params: watch.params as unknown as WatchParams },
      t => {
        // Its height from where it stands, when the recording says, seen from the vehicle's place then; from the account's shapes otherwise.
        const stand = sighting.events?.find(event => event.who === "phenomenon" && event.eventType === "stand")
        if (!stand) return RecordingEvents.phenomenonPitchAt(sighting, t)
        const place = expansion.stateAt(t)
        return PhenomenonExpansion.seenFrom(stand.params as unknown as StandParams, { lat: place.lat, lng: place.lng }, t).altitudeDeg
      }
    )
    const poses = gaze.poses(drive.t, until)
    const keyframes: ObserverKeyframe[] = poses.map(pose => ({
      t: pose.t,
      pose: {
        lat: pose.lat, lng: pose.lng,
        elevationM: pose.eye.y - RecordingEvents.STANDING_EYE_M,
        headingDeg: pose.headingDeg, pitchDeg: pose.pitchDeg, fovDeg: driveParams.fovDeg ?? 60
      }
    }))
    for (const keyframe of keyframes) sighting.observerTrack.addKeyframe(keyframe.t, keyframe.pose)
    const result: EventsExpansion = { observerTrack: JSON.stringify(sighting.observerTrack.toJSON()), decorTracks: {} }
    const vehicle = driveParams.vehicle === undefined ? undefined : sighting.decor.find(object => object.id === driveParams.vehicle)
    if (vehicle && !vehicle.track?.length) {
      const start = poses[0]
      const cosStartLat = (lat: number) => Math.cos(lat * Math.PI / 180)
      // The centre of the vehicle, from the eye: the eye is eye.x to the right and −eye.z ahead of it, turned with the road. Counted as the
      // scene places a decor object (see METERS_PER_DEGREE), the longitude scaled by the cosine of the current latitude: the eye's own metres,
      // counted otherwise, drift a metre a kilometre from the seat.
      const track: DecorPlacementKeyframe[] = poses.map(pose => {
        const h = pose.roadDeg * Math.PI / 180
        const forward = -pose.eye.z, right = pose.eye.x
        const eyeEast = (pose.lng - start.lng) * RecordingEvents.METERS_PER_DEGREE * cosStartLat(pose.lat)
        const eyeNorth = (pose.lat - start.lat) * RecordingEvents.METERS_PER_DEGREE
        return {
          t: pose.t,
          eastM: eyeEast - forward * Math.sin(h) - right * Math.cos(h),
          northM: eyeNorth - forward * Math.cos(h) + right * Math.sin(h),
          altitudeM: 0,
          headingDeg: pose.roadDeg
        }
      })
      vehicle.track = track
      vehicle.eastM = track[0].eastM
      vehicle.northM = track[0].northM
      vehicle.headingDeg = track[0].headingDeg
      result.decorTracks[vehicle.id] = JSON.stringify(track)
    }
    sighting.eventsExpansion = result
  }

  /**
   * Works the events' values out again after an event was edited: what they gave (the observer's poses, the tracks of the decor they move, the
   * account's shapes) is replaced by what they give now. What the author wrote themselves is kept, and keeps winning (see reset).
   */
  static refresh(sighting: Sighting): void {
    const observer = sighting.observerTrack.allKeyframes.length === 0 || RecordingEvents.observerTrackIsExpanded(sighting)
    const shapes = sighting.timeline.allKeyframes.length === 0 || RecordingEvents.timelineIsExpanded(sighting)
    RecordingEvents.again(sighting, observer, shapes)
  }

  /** Gives the recording the values of its events again, whatever poses, tracks or shapes it was given since. */
  static reset(sighting: Sighting): void {
    RecordingEvents.again(sighting, true, (sighting.events ?? []).some(event => event.who === "phenomenon" && event.eventType === "stand"))
  }

  private static again(sighting: Sighting, observer: boolean, shapes: boolean): void {
    if (observer) {
      for (const id of Object.keys(sighting.eventsExpansion?.decorTracks ?? {})) {
        const object = sighting.decor.find(candidate => candidate.id === id)
        if (object) delete object.track
      }
      sighting.observerTrack.clear()
    }
    if (shapes) for (const id of [...sighting.timeline.sourceIds]) sighting.timeline.removeSource(id)
    sighting.eventsExpansion = undefined
    RecordingEvents.expand(sighting)
    if (shapes) {
      // Drawn as a recording read is (see fromSightingJson): their boxes from their angles, their places from their directions.
      SightingShapes.toBounds(sighting)
      SightingShapes.toPosition(sighting)
    }
    RecordingEvents.settle(sighting)
  }

  /** Whether the observer's track is still what the events gave: written back as the events alone, then. */
  static observerTrackIsExpanded(sighting: Sighting): boolean {
    return sighting.eventsExpansion?.observerTrack !== undefined
      && sighting.eventsExpansion.observerTrack === JSON.stringify(sighting.observerTrack.toJSON())
  }

  /** Whether a decor object's track is still what the events gave. */
  static decorTrackIsExpanded(sighting: Sighting, id: string, track: DecorPlacementKeyframe[] | undefined): boolean {
    const expanded = sighting.eventsExpansion?.decorTracks[id]
    return expanded !== undefined && expanded === JSON.stringify(track)
  }

  /**
   * The phenomenon's height in the observer's sky at `t`: where the largest of the account's shapes that can be seen then is aimed, its body
   * rather than its lights (Silly-le-Long's rear lights shine above its middle).
   */
  private static phenomenonPitchAt(sighting: Sighting, t: number): number {
    let largest: { area: number, altitude: number } | undefined
    for (const id of sighting.timeline.sourceIds) {
      const shape = sighting.timeline.getInterpolatedShapeAt(t, id)
      const altitude = shape?.aim?.altitudeDeg
      if (!shape || shape.transparency >= 1 || altitude === undefined) continue
      const area = (shape.angular?.widthDeg ?? 0) * (shape.angular?.heightDeg ?? 0)
      if (!largest || area > largest.area) largest = { area, altitude }
    }
    return largest?.altitude ?? 0
  }

  /** The end of the recording, ms: its stated duration, or the last of its events'. */
  private static endOf(sighting: Sighting): number {
    if (sighting.event.durationSeconds !== undefined) return sighting.event.durationSeconds * 1000
    return Math.max(...(sighting.events ?? []).map((event: RecordingEventJson) => event.until ?? event.t))
  }
}
