import type { DecorPlacementKeyframe } from "../model/Decor.js"
import type { ObserverKeyframe } from "../model/ObserverTrack.js"
import type { Sighting } from "../model/Sighting.js"
import { DriveExpansion } from "./DriveExpansion.js"
import { GazeExpansion } from "./GazeExpansion.js"
import type { DriveParams, LeanParams, LookAheadParams, RecordingEventJson, WatchParams } from "./RecordingEvent.js"

/** What the events of a recording were worked out into, as it was: what is written back as events alone if nothing has changed it since. */
export interface EventsExpansion {
  observerTrack?: string
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
 * The observer's kinds, all needing a `drive` (the motion of the vehicle they are in):
 * - drive: see DriveParams;
 * - lookAhead: see LookAheadParams;
 * - lean: see LeanParams;
 * - watch: see WatchParams.
 */
export class RecordingEvents {
  /** A standing observer's eye above the ground, m: a seated one's elevation is counted from it (see BodyPlacement.EYE_HEIGHT_M). */
  private static readonly STANDING_EYE_M = 1.6
  /** Metres in a degree, as the scene places a decor object from the observer's first pose (see SceneRenderer.updateDecorAnchoring). */
  private static readonly METERS_PER_DEGREE = 111320

  /** Gives `sighting` the values of its events, where it states none of its own. */
  static expand(sighting: Sighting): void {
    const events = (sighting.events ?? []).filter(event => (event.who ?? "observer") === "observer")
    const drive = events.find(event => event.eventType === "drive")
    const lookAhead = events.find(event => event.eventType === "lookAhead")
    if (!drive || !lookAhead || sighting.observerTrack.allKeyframes.length > 0) return
    const until = drive.until ?? RecordingEvents.endOf(sighting)
    const driveParams = drive.params as unknown as DriveParams
    const expansion = new DriveExpansion(driveParams, drive.t, until)
    const lean = events.find(event => event.eventType === "lean")
    const watch = events.find(event => event.eventType === "watch")
    const gaze = new GazeExpansion(
      expansion, driveParams.eye, lookAhead.params as unknown as LookAheadParams,
      lean && { t: lean.t, params: lean.params as unknown as LeanParams },
      watch && { t: watch.t, params: watch.params as unknown as WatchParams },
      t => RecordingEvents.phenomenonPitchAt(sighting, t)
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
   * Works the events' values out again after an event was edited: the poses they gave (and the vehicle's track) are replaced by what they give
   * now. Poses the author wrote themselves are kept, and keep winning (see reset).
   */
  static refresh(sighting: Sighting): void {
    if (sighting.observerTrack.allKeyframes.length > 0 && !RecordingEvents.observerTrackIsExpanded(sighting)) return
    RecordingEvents.reset(sighting)
  }

  /** Gives the observer, and the vehicle they are in, the values of their events again, whatever poses or track they were given since. */
  static reset(sighting: Sighting): void {
    for (const id of Object.keys(sighting.eventsExpansion?.decorTracks ?? {})) {
      const object = sighting.decor.find(candidate => candidate.id === id)
      if (object) delete object.track
    }
    sighting.observerTrack.clear()
    sighting.eventsExpansion = undefined
    RecordingEvents.expand(sighting)
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
