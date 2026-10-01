import type { SaidText } from "../model/SaidText.js"

/**
 * An atmospheric re-entry an interpretation claims was what the observer saw: a decaying satellite
 * or rocket stage breaking up into a train of burning fragments, as Zond IV's did over the eastern
 * United States on 3 March 1968.
 *
 * It is not a body (see BodyJson), and cannot be one. A body stands in metres round the observer,
 * on a flat ground a few kilometres across; a re-entry burns 70 to 100 km up and is seen from
 * hundreds of kilometres away, where the Earth's curvature alone drops it by several kilometres.
 * So it is placed where it really was — latitude, longitude, height — and seen from the observer
 * through the Earth's actual shape (see ReentrySighting), the way the satellites already are.
 *
 * Everything is stated by the interpretation and nothing here is computed from an orbit: a track
 * propagated from orbital elements to its last minutes is off by minutes, hence by thousands of
 * kilometres, so the path is what somebody established — from the sightings, an orbit's
 * inclination, an official decay time — with its provenance saying how.
 *
 * Its light is its own. A re-entry glows from being heated by the air it ploughs through, so it is
 * seen whether or not the Sun reaches it — Zond IV burned at 22h local time, its height deep in the
 * Earth's shadow — and a fragment goes out when it has burned or slowed down, at the instant
 * `untilT` says, not when it enters any shadow.
 */
export interface ReentryJson {
  id: string
  title?: SaidText
  /** The phenomena of the account (their `sourceId`s) this re-entry claims to be — see BodyJson.explains. */
  explains?: string[]
  /** The object that came down, when it is known — the catalogue says which piece it was. */
  object?: ReentryObject
  /** Where the leading point of the break-up was, at instants of the recording. At least two. */
  track: ReentryKeyframe[]
  /** The pieces seen, each following the same path some seconds behind the leading point. */
  fragments: ReentryFragment[]
}

/** Which object re-entered, as the satellite catalogue names it. */
export interface ReentryObject {
  /** Its catalogue name — "SL-12 R/B". */
  name?: string
  /** International designator — "1968-013C". */
  cosparId?: string
  /** US Space Surveillance Network catalogue number — 3136. */
  norad?: number
}

/**
 * Where the leading point of a re-entry stood at one instant of the recording.
 *
 * Between two keyframes it moves along the great circle joining them, its height blending linearly:
 * a keyframe every ten seconds or so follows an orbit's own ground track closely enough.
 */
export interface ReentryKeyframe {
  t: number
  lat: number
  lng: number
  /** Height above the ellipsoid, km. */
  altitudeKm: number
}

/**
 * One burning piece of a re-entry.
 *
 * It travels the track `lagS` seconds behind the leading point, which is how a break-up looks from
 * the ground: the pieces strung out along one path, the lighter ones dropping back as the air brakes
 * them harder. Seen from the side, a constant lag is the "formation" so many observers reported.
 */
export interface ReentryFragment {
  id?: string
  /** Seconds behind the leading point, along the same path. 0 when absent: the leading piece itself. */
  lagS?: number
  /** When it is first seen, ms of the recording — when it broke off, or when it began to glow. The
   * start of the track when absent. */
  fromT?: number
  /** When it goes out, ms — burned up, or slowed below glowing. The end of the track when absent. */
  untilT?: number
  /**
   * Its brightness as a magnitude at 100 km — the meteor astronomers' absolute magnitude, which a
   * fireball report gives — from which the brightness at the observer's actual distance follows.
   */
  absoluteMagnitude: number
  /** Its colour, as a CSS hex colour. A fire-orange when absent. */
  color?: string
  /** How long a stretch of its own past path still glows behind it, seconds: the tail observers
   * describe. 1.5 when absent. */
  trainS?: number
}

/** A point of the Earth, or above it. */
export interface GeoPoint {
  lat: number
  lng: number
  /** Height above the ellipsoid, metres. */
  heightM: number
}

/** Where something is in an observer's sky, and how far. */
export interface SkyPoint {
  altitudeDeg: number
  azimuthDeg: number
  distanceKm: number
}

/** One piece of a re-entry as an observer sees it at one instant. */
export interface ReentryFragmentView {
  reentryId: string
  fragmentId: string
  head: SkyPoint
  /** Its apparent visual magnitude from here, before any air or cloud: the absolute magnitude moved
   * to its real distance, and faded in or out at the ends of its life. */
  magnitude: number
  color: string
  /** The glowing stretch of path behind it, from the head back, oldest last. */
  train: SkyPoint[]
}

/**
 * The geometry of seeing a re-entry: its path on the Earth, and that path from an observer's place.
 *
 * Every position is worked out on the WGS84 ellipsoid, the observer's local horizon included, so a
 * piece 400 km off stands as low in the sky as the Earth's curvature really puts it — a flat
 * east/north reckoning would raise it by several degrees and keep it above a horizon it had sunk
 * under.
 */
export class ReentrySighting {
  /** WGS84 semi-major axis, metres, and first eccentricity squared. */
  private static readonly A = 6378137
  private static readonly E2 = 6.69437999014e-3
  private static readonly DEG = Math.PI / 180
  /** The distance an absolute magnitude is stated at, km. */
  static readonly STANDARD_DISTANCE_KM = 100
  static readonly DEFAULT_COLOR = "#ffb347"
  static readonly DEFAULT_TRAIN_S = 1.5
  /** How long a piece takes to brighten when it appears and to go out when it ends, ms: a burning
   * piece flares and dies over a moment, not between two frames. A quarter of its life when that is
   * shorter. */
  static readonly FADE_MS = 600
  /** How finely the train follows the path, points per train. */
  private static readonly TRAIN_POINTS = 8

  /**
   * Where the leading point of `reentry` is at `t`, or undefined outside its track.
   */
  static leadAt(reentry: ReentryJson, t: number): GeoPoint | undefined {
    const track = reentry.track
    if (track.length < 2 || t < track[0].t || t > track[track.length - 1].t) return undefined
    let i = 0
    while (i < track.length - 2 && track[i + 1].t < t) i++
    const from = track[i]
    const to = track[i + 1]
    const span = to.t - from.t
    const f = span > 0 ? (t - from.t) / span : 0
    const [lat, lng] = ReentrySighting.alongGreatCircle(from, to, f)
    return { lat, lng, heightM: (from.altitudeKm + (to.altitudeKm - from.altitudeKm) * f) * 1000 }
  }

  /**
   * Every piece of every re-entry the observer at `observer` sees at `t`: above their horizon, lit
   * by its own burning. A piece below the horizon, or not yet broken off, or burned out, is absent.
   */
  static viewsAt(reentries: readonly ReentryJson[], t: number, observer: GeoPoint): ReentryFragmentView[] {
    const views: ReentryFragmentView[] = []
    for (const reentry of reentries) {
      const first = reentry.track[0]?.t ?? 0
      const last = reentry.track[reentry.track.length - 1]?.t ?? 0
      reentry.fragments.forEach((fragment, index) => {
        const fromT = fragment.fromT ?? first
        const untilT = fragment.untilT ?? last
        if (t < fromT || t > untilT) return
        const lagMs = (fragment.lagS ?? 0) * 1000
        const at = ReentrySighting.leadAt(reentry, t - lagMs)
        if (!at) return
        const head = ReentrySighting.seenFrom(observer, at)
        if (head.altitudeDeg < 0) return
        // A quarter of its life at most, so a meteor burning one second still reaches its peak.
        const fadeMs = Math.min(ReentrySighting.FADE_MS, (untilT - fromT) / 4)
        const fade = fadeMs > 0 ? Math.min(1, (t - fromT) / fadeMs, (untilT - t) / fadeMs) : 1
        // A fraction of its light, as a magnitude: 2.5 log of the share. Floored so a piece at the
        // very instant it appears is merely too faint, not infinitely so.
        const fadeMagnitudes = -2.5 * Math.log10(Math.max(fade, 1e-3))
        const magnitude = fragment.absoluteMagnitude + 5 * Math.log10(head.distanceKm / ReentrySighting.STANDARD_DISTANCE_KM) + fadeMagnitudes
        const train: SkyPoint[] = [head]
        const trainMs = (fragment.trainS ?? ReentrySighting.DEFAULT_TRAIN_S) * 1000
        for (let k = 1; k <= ReentrySighting.TRAIN_POINTS; k++) {
          // Never further back than where it broke off: a piece has no tail from before it existed.
          const back = Math.min((trainMs * k) / ReentrySighting.TRAIN_POINTS, t - fromT)
          const past = ReentrySighting.leadAt(reentry, t - lagMs - back)
          if (!past) break
          train.push(ReentrySighting.seenFrom(observer, past))
          if (back >= t - fromT) break
        }
        views.push({
          reentryId: reentry.id,
          fragmentId: fragment.id ?? String(index),
          head,
          magnitude,
          color: fragment.color ?? ReentrySighting.DEFAULT_COLOR,
          train
        })
      })
    }
    return views
  }

  /**
   * Where `point` stands in the sky of `observer`: its altitude above their local horizon (the
   * plane tangent to the ellipsoid where they stand, no refraction), its azimuth from true north,
   * and its straight-line distance.
   */
  static seenFrom(observer: GeoPoint, point: GeoPoint): SkyPoint {
    const o = ReentrySighting.ecef(observer)
    const p = ReentrySighting.ecef(point)
    const dx = p[0] - o[0]
    const dy = p[1] - o[1]
    const dz = p[2] - o[2]
    const lat = observer.lat * ReentrySighting.DEG
    const lng = observer.lng * ReentrySighting.DEG
    const east = -Math.sin(lng) * dx + Math.cos(lng) * dy
    const north = -Math.sin(lat) * Math.cos(lng) * dx - Math.sin(lat) * Math.sin(lng) * dy + Math.cos(lat) * dz
    const up = Math.cos(lat) * Math.cos(lng) * dx + Math.cos(lat) * Math.sin(lng) * dy + Math.sin(lat) * dz
    const distance = Math.hypot(east, north, up)
    return {
      altitudeDeg: Math.asin(up / distance) / ReentrySighting.DEG,
      azimuthDeg: ((Math.atan2(east, north) / ReentrySighting.DEG) + 360) % 360,
      distanceKm: distance / 1000
    }
  }

  /** Earth-centred, Earth-fixed coordinates of a point, metres. */
  private static ecef(point: GeoPoint): [number, number, number] {
    const lat = point.lat * ReentrySighting.DEG
    const lng = point.lng * ReentrySighting.DEG
    const sinLat = Math.sin(lat)
    const n = ReentrySighting.A / Math.sqrt(1 - ReentrySighting.E2 * sinLat * sinLat)
    return [
      (n + point.heightM) * Math.cos(lat) * Math.cos(lng),
      (n + point.heightM) * Math.cos(lat) * Math.sin(lng),
      (n * (1 - ReentrySighting.E2) + point.heightM) * sinLat
    ]
  }

  /** The point a fraction `f` of the way from `a` to `b` along the great circle joining them, on
   * the sphere: [lat, lng] in degrees. */
  private static alongGreatCircle(a: { lat: number; lng: number }, b: { lat: number; lng: number }, f: number): [number, number] {
    const toVector = (p: { lat: number; lng: number }) => {
      const lat = p.lat * ReentrySighting.DEG
      const lng = p.lng * ReentrySighting.DEG
      return [Math.cos(lat) * Math.cos(lng), Math.cos(lat) * Math.sin(lng), Math.sin(lat)]
    }
    const va = toVector(a)
    const vb = toVector(b)
    const dot = Math.max(-1, Math.min(1, va[0] * vb[0] + va[1] * vb[1] + va[2] * vb[2]))
    const angle = Math.acos(dot)
    let v: number[]
    if (angle < 1e-12) {
      v = va
    } else {
      const sa = Math.sin((1 - f) * angle) / Math.sin(angle)
      const sb = Math.sin(f * angle) / Math.sin(angle)
      v = [va[0] * sa + vb[0] * sb, va[1] * sa + vb[1] * sb, va[2] * sa + vb[2] * sb]
    }
    return [Math.atan2(v[2], Math.hypot(v[0], v[1])) / ReentrySighting.DEG, Math.atan2(v[1], v[0]) / ReentrySighting.DEG]
  }
}
