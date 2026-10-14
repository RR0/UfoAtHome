import { geoToLocalMeters } from "./GeoProjection.js"

/** A place, decimal degrees. */
export interface GeoPoint {
  lat: number
  lng: number
}

/**
 * Whether a route goes ALONG a way, as opposed to across it or beside it.
 *
 * What a bridge deck is to an observer depends on which road he is on: the deck of the road he drives is his ground, and the deck of the one he
 * drives under is a roof (see IgnMntElevationProvider.layBridgeDecks). A height field cannot tell the two apart, since at a crossing the deck is
 * over the other road whichever is which; the observer's own track can, by going the way of one of them. The route follows a way where, for some
 * distance, it stays close to it and points the same way (either way along it: a road is not one-way for this).
 */
export class RouteFollowing {
  /** How close the route has to stay, metres: a track is a few points two seconds apart, a long way from a road's own line. */
  static readonly NEAR_M = 15
  /** How far from parallel it may go, degrees. */
  static readonly ALIGNED_DEG = 30
  /** How much of the way the route has to go along it, metres. */
  static readonly LONG_ENOUGH_M = 15
  private static readonly SAMPLE_M = 5

  /** Whether `route` runs along `way` for long enough: both as lists of places. */
  static follows(route: readonly GeoPoint[], way: readonly GeoPoint[]): boolean {
    if (route.length < 2 || way.length < 2) return false
    const origin = way[0]
    const wayM = way.map(point => geoToLocalMeters(point.lat, point.lng, origin.lat, origin.lng))
    const routeM = route.map(point => geoToLocalMeters(point.lat, point.lng, origin.lat, origin.lng))
    let alongM = 0
    for (let i = 0; i < routeM.length - 1; i++) {
      const from = routeM[i]
      const to = routeM[i + 1]
      const length = Math.hypot(to.x - from.x, to.z - from.z)
      if (length < 1e-6) continue
      const steps = Math.max(1, Math.ceil(length / RouteFollowing.SAMPLE_M))
      const heading = Math.atan2(to.x - from.x, -(to.z - from.z))
      for (let s = 0; s <= steps; s++) {
        const t = s / steps
        const near = RouteFollowing.nearest(wayM, from.x + (to.x - from.x) * t, from.z + (to.z - from.z) * t)
        if (near.distanceM > RouteFollowing.NEAR_M) continue
        if (RouteFollowing.angleBetween(heading, near.heading) <= RouteFollowing.ALIGNED_DEG) alongM += length / steps
      }
    }
    return alongM >= RouteFollowing.LONG_ENOUGH_M
  }

  /** The nearest point of a polyline to (x, z), how far it is, and the heading of the segment it is on (radians clockwise from north). */
  private static nearest(path: readonly { x: number, z: number }[], x: number, z: number): { distanceM: number, heading: number } {
    let best = { distanceM: Infinity, heading: 0 }
    for (let i = 0; i < path.length - 1; i++) {
      const a = path[i]
      const b = path[i + 1]
      const dx = b.x - a.x
      const dz = b.z - a.z
      const lengthSquared = dx * dx + dz * dz
      const t = lengthSquared < 1e-9 ? 0 : Math.max(0, Math.min(1, ((x - a.x) * dx + (z - a.z) * dz) / lengthSquared))
      const distanceM = Math.hypot(x - (a.x + dx * t), z - (a.z + dz * t))
      if (distanceM < best.distanceM) best = { distanceM, heading: Math.atan2(dx, -dz) }
    }
    return best
  }

  /** The angle between two headings, as lines (a road is not one-way here), degrees from 0 to 90. */
  private static angleBetween(a: number, b: number): number {
    const degrees = Math.abs(((a - b) * 180 / Math.PI) % 180)
    return Math.min(degrees, 180 - degrees)
  }
}
