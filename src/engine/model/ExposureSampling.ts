import type { BodyJson } from "../interpretation/Interpretation.js"
import type { DecorObject } from "./Decor.js"
import { resolveDecorPlacementAt } from "./Decor.js"

/**
 * How finely a long pose has to be sampled for what is IN the scene, as opposed to the sky it
 * stands against (see SkyDrift, which answers for the sky).
 *
 * The photograph this exists for is the one at rr0.org/…/meprise/aeronef/avion: Gennevilliers,
 * 5 November 1990, an airliner on a ten- or thirty-second pose, published as a monumental craft.
 * Its steady lamps drew LINES and its flashing ones drew DOTS AT REGULAR INTERVALS, and both of
 * those are sampling statements: the line needs instants close enough together that the lamp's
 * paintings touch, and the dots need instants short enough to tell one flash from the next. Sampled
 * the way the sky asks to be — a pixel of drift in ten seconds, so two instants — an aircraft
 * crossing the frame would be drawn twice, and the picture would say nothing at all.
 *
 * Both rules come out as a COUNT of instants, and the whole pose is drawn at the coarsest demand
 * any of them makes.
 */
export class ExposureSampling {
  /** How far apart two paintings of a moving lamp may land before its line reads as beads — the
   * same two pixels the object's own streak uses (see UfoElement.exposureTimes). */
  static readonly PIXELS_PER_INSTANT = 2

  /**
   * Instants per flash, so a rhythm survives being sampled.
   *
   * Two is Nyquist, and it is enough BECAUSE the lamps are integrated rather than tested: each
   * instant asks what fraction of its own interval the lamp was lit (see lightOnFractionBetween),
   * so a flash lands in exactly one instant with its own energy instead of being hit or missed.
   * What two samples a period buys is that the next flash lands in a DIFFERENT instant, which is
   * the difference between dots at the light's rate and a dotted line at the sampler's.
   */
  static readonly INSTANTS_PER_FLASH = 2

  /**
   * However much the scene asks for, this many instants at most.
   *
   * Far above the sky's own cap of 64, and affordable for the same reason it has to be: an instant
   * that only moves the decor costs about 0.05 ms, where one that restates the whole sky costs 7.8
   * (see SceneElement, which refreshes the sky only on the instants the sky itself asks for).
   */
  static readonly MAX_INSTANTS = 512

  /**
   * The span of the pose a picture timed at `tMs` holds: the `exposureSeconds` BEFORE it.
   *
   * A plate accumulates the light that has already reached it, so the photograph on screen at the
   * playhead is the one whose shutter has just closed: the trail stands behind the aeroplane and
   * ends where the aeroplane is now, the stars' arcs end where the stars are now. It used to be
   * the other way round — the shutter opening AT the playhead — and a paused replay then showed
   * the object at the start of its own future. Before the pose is old enough, the shutter opened
   * at the start of the observation and the picture is what the plate has gathered so far: the
   * trail builds up from nothing and rolls once it is whole. Its brightness follows the instants
   * drawn, not the seconds, so a half-built picture reads as well as a whole one.
   */
  static windowEndingAt(tMs: number, exposureSeconds: number): { fromMs: number; toMs: number; ms: number; seconds: number } {
    const seconds = Number.isFinite(exposureSeconds) ? Math.max(0, exposureSeconds) : 0
    const fromMs = Math.max(0, tMs - seconds * 1000)
    const ms = Math.max(0, tMs - fromMs)
    return { fromMs, toMs: tMs, ms, seconds: ms / 1000 }
  }

  /**
   * How many instants the moving and flashing things in `decor` ask for, over a pose of
   * `exposureSeconds` beginning at `atMs`.
   *
   * One if nothing moves and nothing flashes — a still scene is the same picture at every instant,
   * and paying for it twice buys nothing.
   */
  static instants(
    decor: readonly DecorObject[],
    observerElevationM: number,
    atMs: number,
    exposureSeconds: number,
    degPerPixel: number
  ): number {
    if (!(exposureSeconds > 0)) return 1
    const travel = degPerPixel > 0
      ? ExposureSampling.travelDegOver(decor, observerElevationM, atMs, atMs + exposureSeconds * 1000) / degPerPixel /
        ExposureSampling.PIXELS_PER_INSTANT
      : 0
    const flashes = ExposureSampling.flashesOver(decor, exposureSeconds) * ExposureSampling.INSTANTS_PER_FLASH
    const asked = Math.ceil(Math.max(travel, flashes))
    if (asked < 2) return 1
    return Math.min(ExposureSampling.MAX_INSTANTS, asked)
  }

  /**
   * The widest angle any decor object crossed while the shutter was open, degrees.
   *
   * Measured from the observer standing at the local origin, which is where decor's own eastM/northM
   * are measured from (see DecorObject) — a observer who ALSO moved during the pose shifts it a
   * little, and that is a rounding error in a sampling rate rather than a claim about the picture.
   */
  static travelDegOver(
    decor: readonly DecorObject[],
    observerElevationM: number,
    t0: number,
    t1: number
  ): number {
    let widest = 0
    for (const object of decor) {
      if (!object.track || object.track.length < 2) continue
      const from = ExposureSampling.directionAt(object, observerElevationM, t0)
      const to = ExposureSampling.directionAt(object, observerElevationM, t1)
      const dot = Math.min(1, Math.max(-1, from.x * to.x + from.y * to.y + from.z * to.z))
      widest = Math.max(widest, (Math.acos(dot) * 180) / Math.PI)
    }
    return widest
  }

  /** How many times the fastest declared lamp flashed while the shutter was open. */
  static flashesOver(decor: readonly DecorObject[], exposureSeconds: number): number {
    let fastest = 0
    for (const object of decor) {
      for (const light of object.lights ?? []) {
        if (light.pattern.kind !== "flash") continue
        fastest = Math.max(fastest, light.pattern.perMinute)
      }
    }
    return (fastest / 60) * exposureSeconds
  }

  /** Which way an object lies from the observer at that instant, as a unit vector. */
  private static directionAt(
    object: DecorObject,
    observerElevationM: number,
    t: number
  ): { x: number; y: number; z: number } {
    const at = resolveDecorPlacementAt(object, t)
    const x = at.eastM
    const y = at.altitudeM - observerElevationM
    const z = at.northM
    const length = Math.hypot(x, y, z)
    // Standing exactly where the object is: no direction to speak of, and nothing to sample.
    if (length === 0) return { x: 0, y: 1, z: 0 }
    return { x: x / length, y: y / length, z: z / length }
  }

  /**
   * How many instants the bodies of an interpretation ask for over a pose from `t0` to `t1` (ms): as for the decor, enough that what crosses
   * the frame is painted every PIXELS_PER_INSTANT pixels, and as well enough that what moves ON a body (a bird's wings, see
   * BodyKeyframe.motions) is: a gull a few metres from a phone at a sixtieth of a second is a smear of its wingbeat as much as of its flight,
   * the "saucer" of so many photographs.
   *
   * Read from the keyframes stated in the world (eastM, northM, altitudeM), blended linearly: a sampling rate, not a placement, so neither
   * the relief nor a keyframe stated from the observer is looked into (such a body asks for nothing here).
   */
  static bodyInstants(bodies: readonly BodyJson[], observerElevationM: number, t0: number, t1: number, degPerPixel: number): number {
    if (!(t1 > t0) || !(degPerPixel > 0)) return 1
    let widest = 0
    for (const body of bodies) {
      const from = ExposureSampling.bodyAt(body, t0)
      const to = ExposureSampling.bodyAt(body, t1)
      if (!from || !to) continue
      const a = { x: from.eastM, y: from.upM - observerElevationM, z: from.northM }
      const b = { x: to.eastM, y: to.upM - observerElevationM, z: to.northM }
      const la = Math.hypot(a.x, a.y, a.z), lb = Math.hypot(b.x, b.y, b.z)
      if (la === 0 || lb === 0) continue
      const dot = Math.min(1, Math.max(-1, (a.x * b.x + a.y * b.y + a.z * b.z) / la / lb))
      let travelDeg = Math.acos(dot) * 180 / Math.PI
      // A movement of its own: a whole cycle sweeps a part of half its width through about a radian and back.
      let cycles = 0
      for (const name of Object.keys(to.motions)) cycles = Math.max(cycles, Math.abs(to.motions[name] - (from.motions[name] ?? to.motions[name])))
      if (cycles > 0) travelDeg += cycles * 2 * (to.halfWidthM / Math.max(lb, 1e-3)) * 180 / Math.PI
      widest = Math.max(widest, travelDeg)
    }
    const asked = Math.ceil(widest / degPerPixel / ExposureSampling.PIXELS_PER_INSTANT)
    return asked < 2 ? 1 : Math.min(ExposureSampling.MAX_INSTANTS, asked)
  }

  /** Where a body's world keyframes put it at `t`, and how far along its movements: undefined outside its track or when not so stated. */
  private static bodyAt(body: BodyJson, t: number): { eastM: number, northM: number, upM: number, halfWidthM: number, motions: Record<string, number> } | undefined {
    const track = body.track
    if (track.length === 0 || t < track[0].t || t > track[track.length - 1].t) return undefined
    let low = 0, high = track.length - 1
    while (high - low > 1) {
      const middle = (low + high) >> 1
      if (track[middle].t <= t) low = middle
      else high = middle
    }
    const a = track[low], b = track[high]
    if (a.eastM === undefined || a.northM === undefined || b.eastM === undefined || b.northM === undefined) return undefined
    const share = b.t > a.t ? (t - a.t) / (b.t - a.t) : 0
    const mix = (x: number, y: number) => x + (y - x) * share
    const motions: Record<string, number> = {}
    for (const name of Object.keys(b.motions ?? {})) {
      const x = a.motions?.[name], y = b.motions![name]
      motions[name] = x === undefined ? y : mix(x, y)
    }
    const width = track.find(key => key.sizeM)?.sizeM?.widthM ?? 1
    return {
      eastM: mix(a.eastM, b.eastM), northM: mix(a.northM, b.northM), upM: mix(a.altitudeM ?? 0, b.altitudeM ?? 0),
      halfWidthM: width / 2, motions
    }
  }
}
