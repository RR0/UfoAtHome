import type { SaidPosition } from "../model/SaidPosition.js"
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
  /** How it was said, when not as degrees (see SaidPosition). */
  saidPosition?: SaidPosition
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
  /**
   * How its brightness ran through its flight, when that is known: absolute magnitudes at instants of the recording (ms), joined
   * linearly in magnitude between them, and held past either end. A great fireball is not one brightness: it brightens as it plunges
   * into denser air, flares as it breaks up, and dies away (Chelyabinsk went from a faint streak at 95 km to brighter than the Sun at 30).
   * `absoluteMagnitude` stands when absent.
   */
  lightCurve?: { t: number, absoluteMagnitude: number }[]
  /** Its colour, as a CSS hex colour. A fire-orange when absent. */
  color?: string
  /** How long a stretch of its own past path still glows behind it, seconds: the tail observers
   * describe. 1.5 when absent. */
  trainS?: number
  /** The smaller pieces it sheds as it breaks up, each of which burns, brakes and drifts away on its own (see ReentrySheds). */
  sheds?: ReentrySheds
}

/**
 * How a burning piece comes apart: the cloud of small fragments every photograph of a re-entry shows behind its few bright heads, each with
 * its own streak, dropping back as the air brakes it harder than the piece it came from, and drifting a little to one side, so that the
 * whole spreads into a narrow fan. Stated as rates and means; the pieces themselves are drawn from them, the same at every replay (see
 * ReentrySighting.shedPieces).
 */
export interface ReentrySheds {
  /** When it begins and stops shedding, ms of the recording. Its own life when absent. */
  fromT?: number
  untilT?: number
  /** How many pieces it sheds a second, on average. */
  perS: number
  /** How long a shed piece burns, seconds, on average: between 0.4 and 1.6 times this. */
  lifeS: number
  /** How much fainter than its piece a shed one is, magnitudes, on average: between 0.6 and 1.4 times this. */
  magnitudeDrop: number
  /** How fast a shed piece falls behind, seconds of lag gained per second of its life squared (half its deceleration against its
   * piece's, in time along the path), on average: between 0.5 and 1.5 times this. */
  dropBack: number
  /** How fast it drifts off the path sideways, km a second, at most: either side, anything up to this. 0.3 when absent. */
  spreadKmS?: number
  /** How fast it sinks below the path, km a second, on average (between 0.5 and 1.5 times this): braked harder, it falls more steeply. Seen
   * from the side, this is what opens the fan; a drift sideways is mostly along the line of sight. 0.3 when absent. */
  sinkKmS?: number
  /** Its streak, seconds of its own past path. Two thirds of its piece's when absent. */
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

/** A burning piece as it flies: a fragment of the re-entry, or one a fragment shed (see ReentrySheds). */
export interface ReentryPiece {
  id: string
  fromT: number
  untilT: number
  /** How far behind the leading point it is along the path at `t`, ms. */
  lagMsAt(t: number): number
  /** How far off the path, km, to its right. */
  acrossKmAt(t: number): number
  /** How far below the path, km. */
  belowKmAt(t: number): number
  /** Its absolute magnitude at `t` (see ReentryFragment.absoluteMagnitude). */
  magnitudeAt(t: number): number
  color: string
  trainMs: number
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
   * Whether any piece of `reentry` can be bright enough, at its nearest, to leave an afterimage in an eye: brighter than magnitude −11, a
   * little under the full Moon, which is where a point's light on the retina starts to bleach it at all (see RetinalBleaching.FAINTEST_CD_M2).
   * Seen no nearer than its lowest height. Zond IV's pieces, at −3, cannot; Chelyabinsk, at −27, can.
   */
  static mayDazzle(reentry: ReentryJson): boolean {
    const lowestKm = Math.max(1, Math.min(...reentry.track.map(keyframe => keyframe.altitudeKm)))
    const nearest = 5 * Math.log10(lowestKm / ReentrySighting.STANDARD_DISTANCE_KM)
    return reentry.fragments.some(fragment => {
      const brightest = Math.min(fragment.absoluteMagnitude, ...(fragment.lightCurve ?? []).map(point => point.absoluteMagnitude))
      return brightest + nearest <= ReentrySighting.DAZZLING_MAGNITUDE
    })
  }

  /** The faintest a point may be and still leave an afterimage: see mayDazzle. */
  static readonly DAZZLING_MAGNITUDE = -11

  /** A piece's absolute magnitude at `t`: from its light curve when it has one (see ReentryFragment.lightCurve), its one magnitude otherwise. */
  static absoluteMagnitudeAt(fragment: ReentryFragment, t: number): number {
    const curve = fragment.lightCurve
    if (!curve || curve.length === 0) return fragment.absoluteMagnitude
    if (t <= curve[0].t) return curve[0].absoluteMagnitude
    for (let i = 1; i < curve.length; i++) {
      const from = curve[i - 1], to = curve[i]
      if (t <= to.t) return from.absoluteMagnitude + (to.absoluteMagnitude - from.absoluteMagnitude) * (t - from.t) / Math.max(to.t - from.t, 1)
    }
    return curve[curve.length - 1].absoluteMagnitude
  }

  /**
   * Every piece of every re-entry the observer at `observer` sees at `t`: above their horizon, lit
   * by its own burning. A piece below the horizon, or not yet broken off, or burned out, is absent.
   */
  static viewsAt(reentries: readonly ReentryJson[], t: number, observer: GeoPoint): ReentryFragmentView[] {
    const views: ReentryFragmentView[] = []
    for (const reentry of reentries) {
      for (const piece of ReentrySighting.piecesOf(reentry)) {
        if (t < piece.fromT || t > piece.untilT) continue
        const at = ReentrySighting.pieceAt(reentry, piece, t)
        if (!at) continue
        const head = ReentrySighting.seenFrom(observer, at)
        if (head.altitudeDeg < 0) continue
        // A quarter of its life at most, so a meteor burning one second still reaches its peak.
        const fadeMs = Math.min(ReentrySighting.FADE_MS, (piece.untilT - piece.fromT) / 4)
        const fade = fadeMs > 0 ? Math.min(1, (t - piece.fromT) / fadeMs, (piece.untilT - t) / fadeMs) : 1
        // A fraction of its light, as a magnitude: 2.5 log of the share. Floored so a piece at the
        // very instant it appears is merely too faint, not infinitely so.
        const fadeMagnitudes = -2.5 * Math.log10(Math.max(fade, 1e-3))
        const magnitude = piece.magnitudeAt(t) + 5 * Math.log10(head.distanceKm / ReentrySighting.STANDARD_DISTANCE_KM) + fadeMagnitudes
        const train: SkyPoint[] = [head]
        for (let k = 1; k <= ReentrySighting.TRAIN_POINTS; k++) {
          // Never further back than where it broke off: a piece has no tail from before it existed.
          const back = Math.min((piece.trainMs * k) / ReentrySighting.TRAIN_POINTS, t - piece.fromT)
          const past = ReentrySighting.pieceAt(reentry, piece, t - back)
          if (!past) break
          train.push(ReentrySighting.seenFrom(observer, past))
          if (back >= t - piece.fromT) break
        }
        views.push({ reentryId: reentry.id, fragmentId: piece.id, head, magnitude, color: piece.color, train })
      }
    }
    return views
  }

  /** Every piece of a re-entry: its fragments, and what each sheds (see ReentrySheds), worked out once per re-entry. */
  static piecesOf(reentry: ReentryJson): readonly ReentryPiece[] {
    const known = ReentrySighting.pieces.get(reentry)
    if (known) return known
    const first = reentry.track[0]?.t ?? 0
    const last = reentry.track[reentry.track.length - 1]?.t ?? 0
    const pieces: ReentryPiece[] = []
    reentry.fragments.forEach((fragment, index) => {
      const lagMs = (fragment.lagS ?? 0) * 1000
      const piece: ReentryPiece = {
        id: fragment.id ?? String(index),
        fromT: fragment.fromT ?? first,
        untilT: fragment.untilT ?? last,
        lagMsAt: () => lagMs,
        acrossKmAt: () => 0,
        belowKmAt: () => 0,
        magnitudeAt: at => ReentrySighting.absoluteMagnitudeAt(fragment, at),
        color: fragment.color ?? ReentrySighting.DEFAULT_COLOR,
        trainMs: (fragment.trainS ?? ReentrySighting.DEFAULT_TRAIN_S) * 1000
      }
      pieces.push(piece)
      if (fragment.sheds) pieces.push(...ReentrySighting.shedPieces(piece, fragment.sheds))
    })
    ReentrySighting.pieces.set(reentry, pieces)
    return pieces
  }

  private static readonly pieces = new WeakMap<ReentryJson, readonly ReentryPiece[]>()

  /**
   * The pieces `parent` sheds: one every 1/perS seconds or so, each breaking off where its parent is, then burning on its own for its life,
   * fainter, dropping back along the path as the air brakes it harder, and drifting off it to one side. Drawn from a hash of the parent and
   * the piece's rank, so a replay sheds the same ones.
   */
  static shedPieces(parent: ReentryPiece, sheds: ReentrySheds): ReentryPiece[] {
    const fromT = sheds.fromT ?? parent.fromT
    const untilT = Math.min(sheds.untilT ?? parent.untilT, parent.untilT)
    if (!(sheds.perS > 0) || untilT <= fromT) return []
    const count = Math.floor(((untilT - fromT) / 1000) * sheds.perS)
    const spread = sheds.spreadKmS ?? 0.3
    const sink = sheds.sinkKmS ?? 0.3
    const trainMs = sheds.trainS !== undefined ? sheds.trainS * 1000 : parent.trainMs * (2 / 3)
    const pieces: ReentryPiece[] = []
    for (let rank = 0; rank < count; rank++) {
      const random = (salt: number) => ReentrySighting.hash(`${parent.id}/${rank}/${salt}`)
      const breakT = fromT + ((rank + random(1)) / sheds.perS) * 1000
      const lifeMs = sheds.lifeS * (0.4 + 1.2 * random(2)) * 1000
      const drop = sheds.magnitudeDrop * (0.6 + 0.8 * random(3))
      const dropBack = sheds.dropBack * (0.5 + random(4))
      const drift = spread * (2 * random(5) - 1)
      const sinking = sink * (0.5 + random(6))
      const lagAtBreak = parent.lagMsAt(breakT)
      const acrossAtBreak = parent.acrossKmAt(breakT)
      const belowAtBreak = parent.belowKmAt(breakT)
      const sinceS = (at: number) => Math.max(0, at - breakT) / 1000
      pieces.push({
        id: `${parent.id}.${rank}`,
        fromT: breakT,
        untilT: Math.min(breakT + lifeMs, ReentrySighting.endOf(parent)),
        lagMsAt: at => lagAtBreak + 500 * dropBack * sinceS(at) ** 2,
        acrossKmAt: at => acrossAtBreak + drift * sinceS(at),
        belowKmAt: at => belowAtBreak + sinking * sinceS(at),
        magnitudeAt: at => parent.magnitudeAt(Math.min(at, parent.untilT)) + drop,
        color: parent.color,
        trainMs
      })
    }
    return pieces
  }

  /** How late a shed piece may burn: a little past its parent, which goes out first when it slows down, not its fragments with it. */
  private static endOf(parent: ReentryPiece): number {
    return parent.untilT + 4000
  }

  /** A number in [0, 1) from a string, the same every time (FNV-1a). */
  private static hash(text: string): number {
    let h = 2166136261
    for (let i = 0; i < text.length; i++) {
      h ^= text.charCodeAt(i)
      h = Math.imul(h, 16777619)
    }
    return (h >>> 0) / 4294967296
  }

  /** Where a piece is at `t`: on the track its lag behind the leading point, then off it sideways by its drift and below it by its sinking. */
  static pieceAt(reentry: ReentryJson, piece: ReentryPiece, t: number): GeoPoint | undefined {
    const behind = t - piece.lagMsAt(t)
    const at = ReentrySighting.leadAt(reentry, behind)
    if (!at) return undefined
    const acrossKm = piece.acrossKmAt(t)
    const heightM = at.heightM - piece.belowKmAt(t) * 1000
    if (acrossKm === 0) return { ...at, heightM }
    // Which way the path runs here, from a point a second before, to step off it at right angles.
    const before = ReentrySighting.leadAt(reentry, behind - 1000) ?? at
    return { ...ReentrySighting.across(before, at, acrossKm), heightM }
  }

  /** The point `km` to the right of the path from `from` to `to`, at `to` (left for a negative distance), on the sphere. */
  private static across(from: { lat: number, lng: number }, to: { lat: number, lng: number }, km: number): { lat: number, lng: number } {
    const d = ReentrySighting.DEG
    const lat1 = from.lat * d, lat2 = to.lat * d, dLng = (to.lng - from.lng) * d
    const bearing = Math.atan2(Math.sin(dLng) * Math.cos(lat2), Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng))
      + Math.PI / 2
    const angle = km / 6371
    const lat = Math.asin(Math.sin(lat2) * Math.cos(angle) + Math.cos(lat2) * Math.sin(angle) * Math.cos(bearing))
    const lng = to.lng * d + Math.atan2(Math.sin(bearing) * Math.sin(angle) * Math.cos(lat2), Math.cos(angle) - Math.sin(lat2) * Math.sin(lat))
    return { lat: lat / d, lng: lng / d }
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
  static ecef(point: GeoPoint): [number, number, number] {
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
