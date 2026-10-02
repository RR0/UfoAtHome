import type { GeoPoint, SkyPoint } from "../interpretation/Reentry.js"
import { ReentrySighting } from "../interpretation/Reentry.js"
import type { AircraftTrack } from "./AircraftProvider.js"

/** An aircraft as one observer sees it at one instant. */
export interface AircraftView {
  track: AircraftTrack
  sky: SkyPoint
  altitudeFt: number
  groundSpeedKt?: number
  trackDeg?: number
  /** How fast it crosses the sky, degrees of arc per second: what a witness reports as slow or fast. */
  angularRateDegPerS?: number
}

/**
 * The geometry of seeing an aircraft: a track on the Earth, and that track from an observer's place,
 * worked out on the WGS84 ellipsoid like a re-entry's (see ReentrySighting), whatever provider the track
 * came from.
 *
 * No brightness is modelled: what makes an aircraft visible (its lights, the Sun on its skin) is not in a
 * record of positions. Altitudes are barometric, taken as heights above the ellipsoid: a few hundred
 * feet of difference at most, under a degree at the distances where an aircraft is mistaken for
 * something else.
 */
export class AircraftSighting {
  /** The longest gap between two positions across which an aircraft is still taken to follow the line between them, s. */
  static readonly MAX_GAP_S = 60
  private static readonly FT_TO_M = 0.3048
  private static readonly EARTH_RADIUS_KM = 6371

  /**
   * How `track` looked from `observer` at `t`. Undefined when the track has no position around `t`
   * (before its first, after its last, or in a gap longer than MAX_GAP_S) or when it stood below the
   * observer's horizon.
   */
  static seenFrom(track: AircraftTrack, observer: GeoPoint, t: number): AircraftView | undefined {
    const at = AircraftSighting.positionAt(track, t)
    if (!at) return undefined
    const sky = ReentrySighting.seenFrom(observer, at.geo)
    if (sky.altitudeDeg < 0) return undefined
    return {
      track,
      sky,
      altitudeFt: at.altitudeFt,
      groundSpeedKt: at.groundSpeedKt,
      trackDeg: at.trackDeg,
      angularRateDegPerS: AircraftSighting.angularRate(track, observer, t)
    }
  }

  /** Every aircraft of `tracks` that is in the observer's sky at `t`. */
  static viewsAt(tracks: readonly AircraftTrack[], observer: GeoPoint, t: number): AircraftView[] {
    return tracks.flatMap(track => AircraftSighting.seenFrom(track, observer, t) ?? [])
  }

  /** The great-circle distance along the ground, km. */
  static groundDistanceKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
    const rad = Math.PI / 180
    const h = Math.sin(((b.lat - a.lat) * rad) / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(((b.lng - a.lng) * rad) / 2) ** 2
    return 2 * AircraftSighting.EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)))
  }

  /** A longitude brought to [-180, 180). */
  static wrapLongitude(lng: number): number {
    return ((((lng + 180) % 360) + 360) % 360) - 180
  }

  /** The position of a track at `t`: on the line between its two surrounding points, none across a long gap. */
  static positionAt(track: AircraftTrack, t: number): { geo: GeoPoint; altitudeFt: number; groundSpeedKt?: number; trackDeg?: number } | undefined {
    const points = track.points
    if (points.length === 0 || t < points[0].t || t > points[points.length - 1].t) return undefined
    let i = 0
    while (i < points.length - 1 && points[i + 1].t <= t) i++
    const from = points[i]
    const to = points[i + 1] ?? from
    const span = to.t - from.t
    if (span > AircraftSighting.MAX_GAP_S * 1000) return undefined
    const f = span > 0 ? (t - from.t) / span : 0
    const altitudeFt = from.altitudeFt + (to.altitudeFt - from.altitudeFt) * f
    // Across the antimeridian the short way round, not through zero.
    const dLng = ((to.lng - from.lng + 540) % 360) - 180
    return {
      geo: { lat: from.lat + (to.lat - from.lat) * f, lng: AircraftSighting.wrapLongitude(from.lng + dLng * f), heightM: altitudeFt * AircraftSighting.FT_TO_M },
      altitudeFt,
      groundSpeedKt: from.groundSpeedKt,
      trackDeg: from.trackDeg
    }
  }

  /** Degrees of arc per second across the observer's sky, measured over the second around `t`. */
  private static angularRate(track: AircraftTrack, observer: GeoPoint, t: number): number | undefined {
    const before = AircraftSighting.positionAt(track, t - 500)
    const after = AircraftSighting.positionAt(track, t + 500)
    if (!before || !after) return undefined
    const a = AircraftSighting.unit(ReentrySighting.seenFrom(observer, before.geo))
    const b = AircraftSighting.unit(ReentrySighting.seenFrom(observer, after.geo))
    const dot = Math.min(1, Math.max(-1, a[0] * b[0] + a[1] * b[1] + a[2] * b[2]))
    return (Math.acos(dot) * 180) / Math.PI
  }

  private static unit(sky: SkyPoint): [number, number, number] {
    const alt = (sky.altitudeDeg * Math.PI) / 180
    const az = (sky.azimuthDeg * Math.PI) / 180
    return [Math.cos(alt) * Math.sin(az), Math.cos(alt) * Math.cos(az), Math.sin(alt)]
  }
}
