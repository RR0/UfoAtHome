import * as Astronomy from "astronomy-engine"
import { DARK_SKY_LIMITING_MAGNITUDE } from "./MeteorShowers.js"
import { equatorialToHorizontal } from "./CelestialPositions.js"
import type { HorizontalPosition, ObserverGeo } from "./CelestialPositions.js"
import { MeteorFall, Rng } from "./MeteorFall.js"
import type { Meteor, MeteorFallOptions } from "./MeteorFall.js"

/**
 * The meteors that belong to no shower at all — which is most of them, most nights.
 *
 * A hole in this scene until now, and a plainly wrong one: on any date with no shower running the
 * sky rendered with nothing falling in it whatsoever, when in reality a few meteors an hour arrive
 * on every night of the year. Since a brief light crossing the sky is one of the commonest things a
 * report describes, an empty sky was quietly removing the likeliest explanation there is.
 *
 * COMPLETE COVERAGE, like the showers and for a better reason: the sporadic background is not a
 * date in the calendar at all, it is the Earth ploughing through dust that is there all the time.
 * There is no year it did not happen and no record to look up.
 *
 * WHAT IS COMPUTED AND WHAT IS CALIBRATED:
 *
 * - WHERE the rate peaks is computed, and it is the useful half. Meteors arrive mostly from the
 *   APEX of the Earth's way — the direction it is moving in, ninety degrees of ecliptic longitude
 *   behind the Sun — the same reason a car's windscreen collects more rain than its rear window.
 *   That apex rises about six hours before the Sun does, which is why rates climb all night and
 *   peak just before dawn. It is real geometry, and it discriminates: a streak at four in the
 *   morning is a far likelier sporadic than the same streak at nine in the evening.
 * - HOW MANY is calibrated against what observers report, because a first-principles flux is not
 *   something this project can derive. The documented range for a single observer under a dark sky
 *   runs from about two an hour in the early evening to ten or so before dawn, and the two constants
 *   below are set to reproduce exactly that and nothing more.
 *
 * The model is deliberately one term, not three. The real background has an antihelion source and
 * two toroidal ones as well as the apex, which is why the rate never actually falls to nothing when
 * the apex is down — hence the floor rather than a bare sine.
 */
export class Sporadics {
  /**
   * What an observer still sees per hour with the apex below the horizon, under a dark sky.
   *
   * Not zero, and that is the whole point of it being a separate number: the antihelion and toroidal
   * sources go on producing meteors all evening. Set from the low end of the documented range.
   */
  static readonly QUIET_RATE_PER_HOUR = 2

  /** What the apex adds when it stands overhead. Two plus eight is ten an hour before dawn, which
   * is the high end of what observers report. */
  static readonly APEX_RATE_PER_HOUR = 8

  /**
   * The population index of the sporadic background — how much more numerous the faint ones are.
   *
   * Steeper than a shower's (most run 2.1 to 2.6), which matters here rather than being trivia: a
   * steeper index means a sky that has lost a magnitude to moonlight or town loses proportionally
   * more of its sporadics than of its Perseids.
   */
  static readonly POPULATION_INDEX = 3

  /**
   * Where the apex of the Earth's way stood in the observer's sky.
   *
   * Ninety degrees of ecliptic longitude behind the Sun, on the ecliptic itself — the direction the
   * planet is travelling. Taken through the equator of date and the observer's own horizon, the same
   * path every other body in this scene goes through.
   *
   * Exactly ninety is itself an approximation, and a named one: the Earth's orbit is an ellipse, so
   * its velocity is only perpendicular to its radius at perihelion and aphelion, and the true apex
   * wanders up to about a degree either side across the year. A degree of radiant position moves the
   * rate below by well under a meteor an hour, which is a good deal less than the spread between one
   * observer's count and the next.
   */
  static apexPosition(date: Date, observer: ObserverGeo): HorizontalPosition {
    const time = Astronomy.MakeTime(date)
    // ECT, not ECL: SunPosition returns the ecliptic OF DATE, and the J2000 route would then apply
    // precession a second time — a third of a degree in 2024 and two thirds in 1948, silently.
    const ecliptic = new Astronomy.Spherical(0, Astronomy.SunPosition(date).elon - 90, 1)
    const ofDate = Astronomy.RotateVector(Astronomy.Rotation_ECT_EQD(time), Astronomy.VectorFromSphere(ecliptic, time))
    const equatorial = Astronomy.EquatorFromVector(ofDate)
    return equatorialToHorizontal(equatorial.ra, equatorial.dec, date, observer)
  }

  /**
   * How many sporadic meteors an observer would really have seen per hour.
   *
   * The apex term is a sine of its altitude, exactly as a shower's radiant term is, and for the same
   * geometric reason: a source halfway up the sky delivers half as much. The floor stays whatever
   * the apex is doing. Both are then divided down by however many magnitudes of sky the observer has
   * lost — the same correction the showers use, with the sporadics' own steeper population index.
   */
  static observedRatePerHour(apexAltitudeDeg: number, limitingMagnitude = DARK_SKY_LIMITING_MAGNITUDE): number {
    const fromApex = Sporadics.APEX_RATE_PER_HOUR * Math.max(0, Math.sin((apexAltitudeDeg * Math.PI) / 180))
    const lost = DARK_SKY_LIMITING_MAGNITUDE - limitingMagnitude
    return (Sporadics.QUIET_RATE_PER_HOUR + fromApex) / Math.pow(Sporadics.POPULATION_INDEX, lost)
  }

  /**
   * The background falling during a recording, each meteor with its own direction.
   *
   * The timing, duration and brightness come from the same machinery a shower uses; what is added
   * here is the one thing that makes a sporadic sporadic — it belongs to no stream, so it arrives
   * from its own point instead of all of them tracing back to one.
   *
   * EACH APPEARS ABOVE THE HORIZON, and that is a correction rather than a convenience. The rate
   * these are drawn from is `observedRatePerHour`, which is already what an OBSERVER SEES, so
   * scattering radiants over the whole sphere and letting half the meteors land under the ground
   * quietly halved it — and the control offering to show one aimed the witness sixty-six degrees
   * into the earth. Meteors do fall on the other side of the world; they are simply not part of a
   * count of what somebody saw.
   *
   * Done by drawing a radiant and keeping it only if the meteor it produces comes out above the
   * horizon. Rejection rather than construction, because the appearance point is decided by the
   * renderer's own geometry and the honest way to respect that is to ask it (see appearanceOf)
   * rather than to re-derive an inverse that might not agree with it.
   */
  static schedule(options: MeteorFallOptions): Meteor[] {
    const rng = new Rng(options.seed ^ 0x5bf03635)
    return MeteorFall.schedule(options).map(meteor => {
      // Where it is seen, drawn first and uniformly over the visible half — the sine of the
      // altitude, not the altitude, or everything would crowd toward the zenith.
      const appears = Sporadics.toCartesian({ altitudeDeg: (Math.asin(rng.next()) * 180) / Math.PI, azimuthDeg: rng.between(0, 360) })
      // Its radiant is then that point rotated back by however far off it appeared, in some
      // direction — constructed rather than searched for, so it cannot fail to land somewhere the
      // meteor is visible. An earlier version drew radiants and rejected the bad ones, which was
      // right in principle and left one meteor in thirty under the ground when the draw ran out.
      const angle = (meteor.fromRadiantDeg * Math.PI) / 180
      const away = Sporadics.turnAround(appears, rng.between(0, 360))
      const radiant = {
        x: appears.x * Math.cos(angle) + away.x * Math.sin(angle),
        y: appears.y * Math.cos(angle) + away.y * Math.sin(angle),
        z: appears.z * Math.cos(angle) + away.z * Math.sin(angle)
      }
      // And the bearing is whatever the RENDERER's own basis calls the direction from that radiant
      // back to where the meteor appears. Read off rather than reused: the bearing that placed the
      // radiant is measured in the appearance point's tangent plane, and the renderer measures its
      // own in the radiant's. They are not the same angle.
      return { ...meteor, radiant: Sporadics.toHorizontal(radiant), bearingDeg: Sporadics.bearingFrom(radiant, appears) }
    })
  }

  /** A unit vector perpendicular to `axis`, turned by `angleDeg` within the plane perpendicular to
   * it — the renderer's own `turn`, over the basis its own `basisAround` builds. */
  private static turnAround(axis: { x: number; y: number; z: number }, angleDeg: number) {
    const [right, up] = Sporadics.basisAround(axis)
    const angle = (angleDeg * Math.PI) / 180
    return {
      x: right.x * Math.cos(angle) + up.x * Math.sin(angle),
      y: right.y * Math.cos(angle) + up.y * Math.sin(angle),
      z: right.z * Math.cos(angle) + up.z * Math.sin(angle)
    }
  }

  /** Which bearing the renderer would need, at `radiant`, to send a meteor toward `target`. The
   * inverse of turnAround, read out of the same basis. */
  private static bearingFrom(radiant: { x: number; y: number; z: number }, target: { x: number; y: number; z: number }): number {
    const [right, up] = Sporadics.basisAround(radiant)
    const alongAxis = radiant.x * target.x + radiant.y * target.y + radiant.z * target.z
    const tangent = Sporadics.normalise({
      x: target.x - radiant.x * alongAxis,
      y: target.y - radiant.y * alongAxis,
      z: target.z - radiant.z * alongAxis
    })
    const bearing = Math.atan2(
      tangent.x * up.x + tangent.y * up.y + tangent.z * up.z,
      tangent.x * right.x + tangent.y * right.y + tangent.z * right.z
    )
    return (((bearing * 180) / Math.PI) % 360 + 360) % 360
  }

  /** The two axes the renderer turns a bearing within — see MeteorSystem.basisAround, which this
   * must agree with exactly or a meteor lands somewhere else entirely. */
  private static basisAround(axis: { x: number; y: number; z: number }) {
    const seed = Math.abs(axis.y) < 0.9 ? { x: 0, y: 1, z: 0 } : { x: 1, y: 0, z: 0 }
    const right = Sporadics.normalise(Sporadics.cross(axis, seed))
    return [right, Sporadics.normalise(Sporadics.cross(axis, right))] as const
  }

  /** A unit vector back to altitude and azimuth — the inverse of toCartesian. */
  private static toHorizontal(v: { x: number; y: number; z: number }): HorizontalPosition {
    const length = Math.hypot(v.x, v.y, v.z) || 1
    return {
      altitudeDeg: (Math.asin(Math.min(1, Math.max(-1, v.y / length))) * 180) / Math.PI,
      azimuthDeg: (((Math.atan2(v.x, -v.z) * 180) / Math.PI) % 360 + 360) % 360
    }
  }

  /**
   * Where a meteor first appears, given the radiant it belongs to.
   *
   * This is the RENDERER'S construction, reproduced exactly rather than approximated: a basis built
   * around the radiant, a bearing turned within it, and a rotation of `fromRadiantDeg` along the
   * resulting great circle (compare MeteorSystem's basisAround, turn and onSphere). A geodesic
   * azimuth formula looks like the same thing and is not — the renderer's "bearing" is an angle in
   * the radiant's own tangent plane, not an azimuth measured from north, and the two disagree by
   * enough to put a meteor on the wrong side of the horizon.
   */
  static appearanceOf(meteor: Meteor): HorizontalPosition {
    const radiant = Sporadics.toCartesian(meteor.radiant ?? { altitudeDeg: 90, azimuthDeg: 0 })
    const along = Sporadics.turnAround(radiant, meteor.bearingDeg)
    const angle = (meteor.fromRadiantDeg * Math.PI) / 180
    return Sporadics.toHorizontal({
      x: radiant.x * Math.cos(angle) + along.x * Math.sin(angle),
      y: radiant.y * Math.cos(angle) + along.y * Math.sin(angle),
      z: radiant.z * Math.cos(angle) + along.z * Math.sin(angle)
    })
  }

  /** Altitude and azimuth to a unit vector, in the scene's own convention: +x east, +y up, north
   * along -z. Kept in step with the renderer's horizontalToCartesian, which the engine must not
   * import from. */
  private static toCartesian(position: HorizontalPosition): { x: number; y: number; z: number } {
    const altitude = (position.altitudeDeg * Math.PI) / 180
    const azimuth = (position.azimuthDeg * Math.PI) / 180
    const horizontal = Math.cos(altitude)
    return { x: horizontal * Math.sin(azimuth), y: Math.sin(altitude), z: -horizontal * Math.cos(azimuth) }
  }

  private static cross(a: { x: number; y: number; z: number }, b: { x: number; y: number; z: number }) {
    return { x: a.y * b.z - a.z * b.y, y: a.z * b.x - a.x * b.z, z: a.x * b.y - a.y * b.x }
  }

  private static normalise(v: { x: number; y: number; z: number }) {
    const length = Math.hypot(v.x, v.y, v.z) || 1
    return { x: v.x / length, y: v.y / length, z: v.z / length }
  }

  /**
   * The atmospheric entry speed to draw them at, kilometres per second.
   *
   * A single figure for a population whose real speeds run from 11 to 72, and named as the average
   * it is. It decides how long a trail is drawn for (see MeteorFall), which is the only thing this
   * number reaches.
   */
  static readonly TYPICAL_VELOCITY_KM_S = 40
}
