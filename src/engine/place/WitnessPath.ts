import type { Sighting } from "../model/Sighting.js"
import type { GeoBounds } from "../../render3d/terrain/GeoBounds.js"
import { geoToLocalMeters, localMetersToGeo } from "../../render3d/terrain/GeoProjection.js"

/** One recorded position along the witness's own path, with the direction they faced there when
 * the recording says (see ObserverPose.headingDeg — undefined is "nobody wrote it down", never
 * north). */
export interface WitnessPathPoint {
  t: number
  lat: number
  lng: number
  headingDeg?: number
}

/**
 * Where the witness stood, over the whole recording, as ground truth rather than as a camera.
 *
 * The same `witnessTrack` the scene reads to place its camera, asked a different question: not
 * "what does the witness see now" but "where were they, and where had they been". A witness who
 * walked, drove, or ran is the ordinary case in a real file — Zamora covered eleven hundred metres
 * of Socorro road in the eighty seconds he was reporting on — and until this, a recording that knew
 * all of it could only ever show one instant of it, from the inside.
 *
 * Coordinates ONLY, no invented positions: a recording that states no place has none (`of` returns
 * undefined), and a keyframe missing lat/lng is skipped rather than carried forward from the one
 * before, since holding a position is a claim that the witness stayed put and the file did not
 * make it.
 */
export class WitnessPath {
  /** Under this, the witness is standing still as far as any map at this scale can show — a GPS fix
   * is not better than this, and neither is a witness pointing at a spot on a map decades later. */
  private static readonly STATIONARY_M = 5

  private constructor(readonly points: ReadonlyArray<WitnessPathPoint>) {}

  /**
   * The path a recording states, or undefined when it states no coordinates at all — which is most
   * recordings, and the reason the map is offered rather than always shown.
   *
   * Falls back to the static `place[0]` exactly the way resolveObserverPoseAt does, so a recording
   * that names a spot but keyframes no track still gets a map with one point on it. That single
   * point is worth showing: where a sighting happened is half of what a reader wants to check.
   */
  static of(sighting: Sighting): WitnessPath | undefined {
    const points: WitnessPathPoint[] = []
    for (const keyframe of sighting.witnessTrack.allKeyframes) {
      const { lat, lng, headingDeg } = keyframe.pose
      if (lat === undefined || lng === undefined) continue
      points.push({ t: keyframe.t, lat, lng, headingDeg })
    }
    if (points.length === 0) {
      const location = sighting.event.place?.[0]
      if (!location) return undefined
      points.push({ t: 0, lat: location.lat, lng: location.lng })
    }
    return new WitnessPath(points)
  }

  /** Whether the witness actually went anywhere — a path whose points all fall within a few metres
   * of each other is one place recorded repeatedly, not a journey, and the map says so by not
   * drawing a line through it. */
  get moved(): boolean {
    return this.spanM > WitnessPath.STATIONARY_M
  }

  /** The longer side of the smallest north-up box containing every point, metres. */
  get spanM(): number {
    const box = this.box
    const centerLat = (box.south + box.north) / 2
    const centerLng = (box.west + box.east) / 2
    return Math.max(
      Math.abs(geoToLocalMeters(centerLat, box.east, centerLat, box.west).x),
      Math.abs(geoToLocalMeters(box.north, centerLng, box.south, centerLng).z)
    )
  }

  /** The midpoint of that box — where the map is centred, so a witness who walked across it stays
   * on it from the first frame to the last instead of the map chasing them. */
  get center(): { lat: number; lng: number } {
    const box = this.box
    return { lat: (box.south + box.north) / 2, lng: (box.west + box.east) / 2 }
  }

  /**
   * A square area around the path, `marginFraction` wider than the path itself and never narrower
   * than `minSpanM`.
   *
   * SQUARE IN METRES, not in degrees: a degree of longitude is shorter than a degree of latitude
   * everywhere but the equator, so a square-in-degrees box drawn on a square canvas stretches the
   * ground east-west by 1/cos(latitude) — 21% at Socorro, and enough further north to make a
   * straight road look like it bends.
   *
   * The floor matters as much as the margin. A witness who never moved has a span of zero, and a
   * map zoomed to a zero-metre box is a map of one blade of grass; a witness who covered eleven
   * hundred metres wants those and their surroundings. Both are the same request — "the place this
   * happened, with enough around it to recognise it".
   */
  boundsAround(minSpanM: number, marginFraction: number): GeoBounds {
    const { lat, lng } = this.center
    const half = Math.max(this.spanM * (1 + marginFraction), minSpanM) / 2
    return {
      north: localMetersToGeo(0, -half, lat, lng).lat,
      south: localMetersToGeo(0, half, lat, lng).lat,
      east: localMetersToGeo(half, 0, lat, lng).lng,
      west: localMetersToGeo(-half, 0, lat, lng).lng
    }
  }

  /** The smallest north-up box containing every point — degrees, so it says nothing yet about how
   * the ground it stands for is shaped. See boundsAround, which is where that is settled. */
  private get box(): GeoBounds {
    const lats = this.points.map(point => point.lat)
    const lngs = this.points.map(point => point.lng)
    return { south: Math.min(...lats), north: Math.max(...lats), west: Math.min(...lngs), east: Math.max(...lngs) }
  }
}
