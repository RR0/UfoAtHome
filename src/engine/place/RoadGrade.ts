import type { Sighting } from "../model/Sighting.js"
import { geoToLocalMeters } from "../../render3d/terrain/GeoProjection.js"

/** The relief, as the scene reads it: metres east and north of the recording's first position, the height there. */
export interface ReliefHeight {
  heightAt(eastM: number, northM: number): number
}

/**
 * How much the road tilts the view of an observer who drives (or walks) along it.
 *
 * A recording says where the observer looked (`pitchDeg`) in the frame of the vehicle they sat in;
 * on a level road that is the horizon, on a climb the whole view is raised by the grade. Without it
 * the Socorro chase, which is mostly uphill, was drawn and stated as a constant 5° down.
 *
 * Worked out from the relief under the track rather than stated in the file, since it is a fact about
 * the ground and not a testimony: the height ahead of the observer against the height behind, over
 * the distance between the two. Zero when they hardly move (a view held at a standstill is not tilted
 * by the hill it stands on), and shrunk by the cosine of how far the view turns from the way they go
 * (looking out of the side window sees no more of the slope than the side of the road has).
 */
export class RoadGrade {

  /** Half the span the grade is read over, in ms: the slope the vehicle is on, not every bump of it. */
  static readonly HALF_SPAN_MS = 2000

  /** Slower than this over the span (m/s) the observer is taken to be standing. */
  static readonly MIN_SPEED_MS = 1

  /** The grade, in degrees (uphill positive) the view is raised by at `tMs`. */
  static at(sighting: Sighting, tMs: number, relief: ReliefHeight): number {
    const origin = sighting.event.place?.[0]
    const track = sighting.observerTrack
    if (!origin) return 0
    const at = (t: number) => {
      const pose = track.getInterpolatedPoseAt(Math.max(0, t))
      if (!pose || pose.lat === undefined || pose.lng === undefined) return undefined
      const local = geoToLocalMeters(pose.lat, pose.lng, origin.lat, origin.lng)
      return { eastM: local.x, northM: -local.z, heading: pose.headingDeg }
    }
    const from = at(tMs - RoadGrade.HALF_SPAN_MS)
    const to = at(tMs + RoadGrade.HALF_SPAN_MS)
    const now = at(tMs)
    if (!from || !to || !now) return 0
    const distanceM = Math.hypot(to.eastM - from.eastM, to.northM - from.northM)
    const seconds = 2 * RoadGrade.HALF_SPAN_MS / 1000
    if (distanceM / seconds < RoadGrade.MIN_SPEED_MS) return 0
    const rise = relief.heightAt(to.eastM, to.northM) - relief.heightAt(from.eastM, from.northM)
    const gradeDeg = Math.atan2(rise, distanceM) * 180 / Math.PI
    if (now.heading === undefined) return gradeDeg
    const travelDeg = Math.atan2(to.eastM - from.eastM, to.northM - from.northM) * 180 / Math.PI
    return gradeDeg * Math.max(0, Math.cos((now.heading - travelDeg) * Math.PI / 180))
  }
}
