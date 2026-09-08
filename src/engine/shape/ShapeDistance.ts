import { ApparentSize } from "./ApparentSize.js"
import type { Sighting } from "../model/Sighting.js"
import { resolveObserverPoseAt } from "../model/Sighting.js"

/** Metres per degree of latitude. Equirectangular, like GeoProjection's own: a witness's walk is
 * tens of metres, and no projection error at that scale reaches the first decimal. */
const METERS_PER_DEG_LAT = 111320
const DEG_TO_RAD = Math.PI / 180

/** How much the apparent size has to change before the arithmetic below is worth trusting. Under
 * this the two instants are effectively one, `r - 1` approaches zero, and the distance it yields
 * runs away to infinity on rounding alone. */
const MIN_ANGULAR_RATIO = 1.02

/** How far the witness must have closed for the baseline to mean anything, metres. A witness who
 * shifted their weight is not a witness who walked. */
const MIN_CLOSED_M = 1

/** What the approach establishes. */
export interface ApproachEstimate {
  /** The object's real width, metres — the same arithmetic yields it, and it is the value every
   * other instant's distance is then read from. */
  widthM: number
  /** How far away it was at each instant that states an apparent size. */
  distanceM: { t: number, m: number }[]
  /** The closest it ever came, metres — what a close-encounter tier turns on. */
  nearestM: number
  /** The two instants the baseline was measured between, and how far the witness closed along the
   * line of sight in that time. Reported so the whole derivation can be checked by hand. */
  fromT: number
  toT: number
  closedM: number
}

/**
 * How far away a phenomenon was, worked out from the witness walking towards it.
 *
 * The one thing this format has always refused to store, and it turns out not to need storing. A
 * thing of unchanging real width subtends an angle inversely proportional to its distance, so two
 * instants give the RATIO of two distances; the witness's own track gives the DIFFERENCE between
 * them in metres; and a ratio plus a difference is both distances. No metre is asserted anywhere,
 * and the result is checkable against the account by anyone who cares to.
 *
 * On Valensole it returns 90.0 m and 6.5 m, and a craft 3.49 m wide. Maurice Masse said ninety
 * metres, six metres, and three and a half — none of which is anywhere in the file.
 *
 * Two assumptions, both stated rather than hidden, and both false in cases this must not be used on:
 *
 * - The object kept its size. Anything that swelled or shrank breaks the proportionality outright.
 * - The object held still while the witness moved. Otherwise the closing distance is not the
 *   witness's alone and the difference is somebody else's. The baseline is taken across the pair of
 *   instants the witness moved most between, which is usually the approach and before anything
 *   departs — at Valensole the craft lifts off at 254 s and the walk ends at 55 s — but nothing here
 *   can verify it, so what comes out is derived and never stated.
 *
 * Where the witness never moved there is no baseline and the answer is undefined, which is correct
 * and common: a driver who stopped their car has established nothing about distance, and that is
 * exactly why a light in an empty sky stays a light at an unknown distance.
 */
export class ShapeDistance {

  /** What the approach establishes about `sourceId`, or undefined when the recording establishes
   * nothing — no track, no movement, or an apparent size that never changed. */
  static of(sighting: Sighting, sourceId: string): ApproachEstimate | undefined {
    const seen = ShapeDistance.sightings(sighting, sourceId)
    if (seen.length < 2) {
      return undefined
    }
    const baseline = ShapeDistance.baseline(seen)
    if (!baseline) {
      return undefined
    }
    const { near, far, closedM } = baseline
    // Two distances whose ratio and difference are both known: d_far / d_near = r, and
    // d_far - d_near = closedM, so d_near = closedM / (r - 1).
    const ratio = Math.tan(far.widthDeg / 2 * DEG_TO_RAD) === 0
      ? 0
      : Math.tan(near.widthDeg / 2 * DEG_TO_RAD) / Math.tan(far.widthDeg / 2 * DEG_TO_RAD)
    if (ratio < MIN_ANGULAR_RATIO) {
      return undefined
    }
    const nearestOfPair = closedM / (ratio - 1)
    const widthM = ApparentSize.sizeMAt(nearestOfPair, near.widthDeg)
    // Every other instant follows from the width, which does not change: the object subtends less,
    // so it is further, in exactly that proportion.
    const distanceM = seen.map(instant => ({
      t: instant.t,
      m: ApparentSize.distanceMAt(widthM, instant.widthDeg)
    }))
    return {
      widthM,
      distanceM,
      nearestM: Math.min(...distanceM.map(instant => instant.m)),
      fromT: far.t,
      toT: near.t,
      closedM
    }
  }

  /** Every instant that states both an apparent width and where the witness was, in time order. */
  private static sightings(
    sighting: Sighting, sourceId: string
  ): { t: number, widthDeg: number, lat: number, lng: number, sightAzimuthDeg?: number }[] {
    return sighting.timeline.allKeyframes
      .flatMap(keyframe => {
        const shape = keyframe.shapes.find(state => state.sourceId === sourceId)?.shape
        const widthDeg = shape?.angular?.widthDeg
        const pose = resolveObserverPoseAt(sighting, keyframe.t)
        if (widthDeg === undefined || widthDeg <= 0 || pose?.lat === undefined || pose.lng === undefined) {
          return []
        }
        return [{
          t: keyframe.t,
          widthDeg,
          lat: pose.lat,
          lng: pose.lng,
          // Where the witness was looking AT the object. Its own stated direction when it has one,
          // and otherwise the way the witness faced — which is where a shape they drew in front of
          // themselves was. Only used to project their walk onto the line of sight, so a few
          // degrees of error costs a cosine's worth and nothing more.
          sightAzimuthDeg: shape?.aim?.azimuthDeg ?? pose.headingDeg
        }]
      })
      .sort((a, b) => a.t - b.t)
  }

  /**
   * The pair of instants the witness closed the most distance between — the longest baseline the
   * recording offers, and so the best-conditioned answer it can give.
   *
   * Closed ALONG THE LINE OF SIGHT, not walked: a witness strolling past a thing at a constant
   * distance has covered ground and established nothing, and it is the component towards the object
   * that changes how big it looks.
   */
  private static baseline(
    seen: { t: number, widthDeg: number, lat: number, lng: number, sightAzimuthDeg?: number }[]
  ): { near: { t: number, widthDeg: number }, far: { t: number, widthDeg: number }, closedM: number } | undefined {
    let best: { near: typeof seen[number], far: typeof seen[number], closedM: number } | undefined
    for (const from of seen) {
      for (const to of seen) {
        if (from.t >= to.t) continue
        const closedM = ShapeDistance.closedAlongSight(from, to)
        // Positive means the witness got nearer between the two, which is the only direction the
        // arithmetic below reads; a retreat is the same pair the other way round.
        const [near, far, m] = closedM >= 0 ? [to, from, closedM] : [from, to, -closedM]
        if (m < MIN_CLOSED_M || near.widthDeg <= far.widthDeg) continue
        if (!best || m > best.closedM) {
          best = { near, far, closedM: m }
        }
      }
    }
    return best
  }

  /** How much nearer the witness got between two instants, along the direction they were looking
   * at the object — the projection of their displacement onto that line. */
  private static closedAlongSight(
    from: { lat: number, lng: number, sightAzimuthDeg?: number },
    to: { lat: number, lng: number }
  ): number {
    const northM = (to.lat - from.lat) * METERS_PER_DEG_LAT
    const eastM = (to.lng - from.lng) * METERS_PER_DEG_LAT * Math.cos(from.lat * DEG_TO_RAD)
    const azimuth = (from.sightAzimuthDeg ?? 0) * DEG_TO_RAD
    // Azimuth is clockwise from true north, so the unit vector along the line of sight is
    // (north, east) = (cos, sin) — and the dot product with the displacement is how much of the
    // walk went towards what they were looking at.
    return northM * Math.cos(azimuth) + eastM * Math.sin(azimuth)
  }
}
