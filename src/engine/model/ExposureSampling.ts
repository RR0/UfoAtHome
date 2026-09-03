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
   * Measured from the witness standing at the local origin, which is where decor's own eastM/northM
   * are measured from (see DecorObject) — a witness who ALSO moved during the pose shifts it a
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

  /** Which way an object lies from the witness at that instant, as a unit vector. */
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
}
