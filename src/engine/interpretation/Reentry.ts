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
   * describe. 4 when absent (see ReentrySighting.DEFAULT_TRAIN_S). */
  trainS?: number
  /**
   * The smaller pieces it sheds as it breaks up, each of which burns, brakes and drifts away on its own (see ReentrySheds): a slow
   * crumbling over its flight, and the bursts of its break-up events, a few seconds each, when hundreds come off at once (Hayabusa's bus:
   * over 800 at about 68 km, some 1800 at 56.7 km seven seconds later; Zander & Löhle, CEAS Space Journal 2025).
   *
   * Absent, every piece comes apart as a burning piece does (see ReentrySighting.DEFAULT_CRUMBLING and flareBursts): a slow crumbling,
   * and a burst at each flare of its light curve, a flare being a fragmentation. An empty list is a piece that sheds nothing.
   */
  sheds?: ReentrySheds[]
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
  /** How much fainter than its piece a shed one is, magnitudes, on average: half of it at least, and the rest spread as a falling
   * exponential, so that the faint ones are many and the bright few, as the sizes of a break-up's fragments are (a power law). */
  magnitudeDrop: number
  /**
   * How hard a shed piece is braked, on average (between 0.5 and 1.5 times this): its speed along the path falls off as e^(−2·dropBack·s)
   * of its piece's, s seconds after it broke off, so that it falls behind by dropBack·s² seconds at first, and never more than it has
   * flown: braked, a fragment slows down to nothing, it does not turn back.
   */
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

/** A detonation of a re-entry, heard (see ReentrySighting.detonationsOf). */
export interface ReentryDetonation {
  reentryId: string
  /** When it was seen, ms of the recording. */
  flashT: number
  /** When it is heard, ms. */
  t: number
  distanceKm: number
  /** How loud, 0 to 1. */
  loudness: number
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
  /**
   * The streak behind a piece when its recording states none, seconds of its path: several, as the photographs of re-entries show (ATV-1,
   * Jules Verne, 2008; the Falcon 9 stage over Washington, 2021) and as the Aerospace Corporation describes one: "a bright central body
   * followed by a long, dazzling tail" (CORDS, Did I see a meteor or a reentry?).
   */
  static readonly DEFAULT_TRAIN_S = 4

  /**
   * How a burning piece crumbles when its recording says nothing of it: what every recorded break-up shows behind its heads, small pieces
   * with streaks of their own, falling back and spreading, "a tight cluster of bright points all moving in the same direction at similar
   * speeds, and all leaving streaks behind them" (Aerospace Corporation, CORDS), far more of them faint than bright (a power law of sizes,
   * Watanabe on Hayabusa, in Zander & Löhle 2025).
   */
  static readonly DEFAULT_CRUMBLING: ReentrySheds = { perS: 1.2, lifeS: 4, magnitudeDrop: 3, dropBack: 0.3, spreadKmS: 1, sinkKmS: 0.6, trainS: 2.5 }

  /**
   * The burst of a break-up event, at a flare of a piece's light curve when its recording says nothing of its shedding: some thirty pieces in
   * two and a half seconds round the peak, each fainter than the flare by more than they do when crumbling, braked and scattered harder.
   * Hundreds come off a spacecraft at once (Hayabusa, in Zander & Löhle 2025); those an eye picks out are the brightest of them.
   */
  static readonly DEFAULT_BURST: ReentrySheds = { perS: 12, lifeS: 3.5, magnitudeDrop: 3.5, dropBack: 0.5, spreadKmS: 1.5, sinkKmS: 0.9, trainS: 2 }

  /** How much brighter than its neighbours a point of a light curve must be to be a flare, magnitudes. */
  static readonly FLARE_MAGNITUDES = 0.5

  /** What a fragment sheds: what it states, or how a burning piece comes apart (see ReentryFragment.sheds). */
  static shedsOf(fragment: ReentryFragment): ReentrySheds[] {
    if (fragment.sheds) return fragment.sheds
    return [ReentrySighting.DEFAULT_CRUMBLING, ...ReentrySighting.flareBursts(fragment)]
  }

  /** A burst (see DEFAULT_BURST) round each flare of a fragment's light curve: a point brighter than both its neighbours by FLARE_MAGNITUDES. */
  static flareBursts(fragment: ReentryFragment): ReentrySheds[] {
    const curve = fragment.lightCurve ?? []
    const bursts: ReentrySheds[] = []
    for (let i = 1; i < curve.length - 1; i++) {
      const point = curve[i]
      if (curve[i - 1].absoluteMagnitude - point.absoluteMagnitude < ReentrySighting.FLARE_MAGNITUDES) continue
      if (curve[i + 1].absoluteMagnitude - point.absoluteMagnitude < ReentrySighting.FLARE_MAGNITUDES) continue
      bursts.push({ ...ReentrySighting.DEFAULT_BURST, fromT: point.t - 1000, untilT: point.t + 1500 })
    }
    return bursts
  }
  /** How long a piece takes to brighten when it appears and to go out when it ends, ms: a burning
   * piece flares and dies over a moment, not between two frames. A quarter of its life when that is
   * shorter. Judged, not measured: the end of a fireball's light on video takes about a second. */
  static readonly FADE_MS = 1000
  /** The magnitude a piece fades to and from: fainter than the eye sees under the darkest sky, so
   * whatever its brightness it is gone at its end, not cut off while still dazzling. */
  static readonly FADED_MAGNITUDE = 8
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

  /**
   * The detonations of a re-entry an observer hears, and when: each flare of a piece's light curve (a fragmentation, the energy of a part
   * of it given up at once) and each bright piece's end, low enough for its shock to reach the ground as a bang, arriving the time sound
   * takes to cover the distance after the flash. Chelyabinsk's break-up at 30 km was heard in the city about two and a half minutes after
   * it was seen, and broke windows; a re-entering stage at 70 km and hundreds of kilometres is not heard at all.
   */
  static detonationsOf(reentries: readonly ReentryJson[], observer: GeoPoint): ReentryDetonation[] {
    const detonations: ReentryDetonation[] = []
    for (const reentry of reentries) {
      reentry.fragments.forEach((fragment, index) => {
        const piece = ReentrySighting.piecesOf(reentry).find(candidate => candidate.id === (fragment.id ?? String(index)))
        if (!piece) return
        const flashes = (fragment.lightCurve ?? [])
          .filter((point, i, curve) => (i === 0 || curve[i - 1].absoluteMagnitude >= point.absoluteMagnitude)
            && (i === curve.length - 1 || curve[i + 1].absoluteMagnitude > point.absoluteMagnitude))
          .map(point => ({ t: point.t, magnitude: point.absoluteMagnitude }))
        // A piece that ends bright ends in a burst: it does not fade, it goes.
        flashes.push({ t: piece.untilT, magnitude: piece.magnitudeAt(piece.untilT) })
        for (const flash of flashes) {
          if (flash.magnitude > ReentrySighting.DETONATING_MAGNITUDE || flash.t < piece.fromT || flash.t > piece.untilT) continue
          const at = ReentrySighting.pieceAt(reentry, piece, flash.t)
          if (!at || at.heightM > ReentrySighting.AUDIBLE_BELOW_KM * 1000) continue
          if (detonations.some(other => other.flashT === flash.t && other.reentryId === reentry.id)) continue
          const distanceKm = ReentrySighting.seenFrom(observer, at).distanceKm
          detonations.push({
            reentryId: reentry.id,
            flashT: flash.t,
            t: flash.t + (distanceKm / ReentrySighting.SOUND_KM_S) * 1000,
            distanceKm,
            // Louder for a brighter flash and a nearer one: a tenth for every five magnitudes under the threshold short of full, halved
            // with every doubling of the distance past 30 km.
            loudness: Math.min(1, (0.3 + (ReentrySighting.DETONATING_MAGNITUDE - flash.magnitude) / 15) * Math.min(1, 30 / distanceKm))
          })
        }
      })
    }
    return detonations.sort((a, b) => a.t - b.t)
  }

  /** The faintest flare that is a detonation heard on the ground: a fireball brighter than the full Moon many times over. */
  static readonly DETONATING_MAGNITUDE = -12
  /** Above this, km, a shock is too weak in air too thin to reach the ground as a bang. */
  static readonly AUDIBLE_BELOW_KM = 50
  /** The speed of sound along the way down, km/s: about 295 m/s in the stratosphere, 340 near the ground. */
  static readonly SOUND_KM_S = 0.31

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
        // Faded in magnitudes, not in a share of its light: a share floored at a thousandth is only
        // 7.5 magnitudes, which leaves a magnitude -15 piece still dazzling on its last frame. Joined
        // linearly in magnitude, its light falls off geometrically, as a cooling glow does.
        const full = piece.magnitudeAt(t) + 5 * Math.log10(head.distanceKm / ReentrySighting.STANDARD_DISTANCE_KM)
        const magnitude = full + (1 - fade) * Math.max(0, ReentrySighting.FADED_MAGNITUDE - full)
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
      ReentrySighting.shedsOf(fragment).forEach((sheds, phase) => pieces.push(...ReentrySighting.shedPieces(piece, sheds, phase)))
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
  static shedPieces(parent: ReentryPiece, sheds: ReentrySheds, phase = 0): ReentryPiece[] {
    const fromT = sheds.fromT ?? parent.fromT
    const untilT = Math.min(sheds.untilT ?? parent.untilT, parent.untilT)
    if (!(sheds.perS > 0) || untilT <= fromT) return []
    const count = Math.floor(((untilT - fromT) / 1000) * sheds.perS)
    const spread = sheds.spreadKmS ?? 0.3
    const sink = sheds.sinkKmS ?? 0.3
    const trainMs = sheds.trainS !== undefined ? sheds.trainS * 1000 : parent.trainMs * (2 / 3)
    const pieces: ReentryPiece[] = []
    for (let rank = 0; rank < count; rank++) {
      const random = (salt: number) => ReentrySighting.hash(`${parent.id}/${phase}/${rank}/${salt}`)
      const breakT = fromT + ((rank + random(1)) / sheds.perS) * 1000
      const lifeMs = sheds.lifeS * (0.4 + 1.2 * random(2)) * 1000
      // Half the stated drop at least, then exponentially fainter: a mean of the drop stated, a long tail of faint ones.
      const drop = sheds.magnitudeDrop * (0.5 - 0.5 * Math.log(1 - 0.999 * random(3)))
      const dropBack = sheds.dropBack * (0.5 + random(4))
      const drift = spread * (2 * random(5) - 1)
      const sinking = sink * (0.5 + random(6))
      const lagAtBreak = parent.lagMsAt(breakT)
      const acrossAtBreak = parent.acrossKmAt(breakT)
      const belowAtBreak = parent.belowKmAt(breakT)
      const sinceS = (at: number) => Math.max(0, at - breakT) / 1000
      pieces.push({
        id: `${parent.id}.${phase}.${rank}`,
        fromT: breakT,
        untilT: Math.min(breakT + lifeMs, ReentrySighting.endOf(parent)),
        lagMsAt: at => lagAtBreak + 1000 * ReentrySighting.lagOfBraking(2 * dropBack, sinceS(at)),
        acrossKmAt: at => acrossAtBreak + drift * sinceS(at),
        belowKmAt: at => belowAtBreak + sinking * sinceS(at),
        magnitudeAt: at => parent.magnitudeAt(Math.min(at, parent.untilT)) + drop,
        color: parent.color,
        trainMs
      })
    }
    return pieces
  }

  /**
   * How far behind, seconds along the path, a piece braked at `rate` per second falls in `s` seconds: its speed is e^(−rate·s) of its parent's,
   * so the lag grows as s − (1 − e^(−rate·s))/rate, as rate·s²/2 at first and never faster than the time itself. A lag growing as the square
   * of the time, as it first did, outgrew the time within seconds, and the fragments of Chelyabinsk flew back along its path.
   */
  static lagOfBraking(rate: number, s: number): number {
    if (rate <= 0 || s <= 0) return 0
    return s - (1 - Math.exp(-rate * s)) / rate
  }

  /** How late a shed piece may burn: no later than the piece it came from, whose end is where the recording says the burning stopped. */
  private static endOf(parent: ReentryPiece): number {
    return parent.untilT
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
