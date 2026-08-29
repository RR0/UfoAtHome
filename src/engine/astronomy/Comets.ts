import * as Astronomy from "astronomy-engine"
import { equatorialToHorizontal } from "./CelestialPositions.js"
import type { HorizontalPosition, ObserverGeo } from "./CelestialPositions.js"
import { KeplerOrbit } from "./Orbit.js"
import type { Vector3 } from "./Orbit.js"
import { BRIGHT_COMETS } from "./cometCatalog.js"
import type { CometApparition } from "./cometCatalog.js"

/**
 * The bright comets, and what one of them would really have looked like from a given place on a
 * given night.
 *
 * The second of the candidate explanations, after the meteor showers, and it earns its place for
 * the same reason: no lookup, no key, no coverage floor that starts in 1957 or 2013. A comet's
 * orbit is a solved problem for as far back as anybody wrote a report, and a naked-eye comet is the
 * one thing in the sky that is unmistakably NOT a star, NOT a planet and NOT an aircraft — a bright
 * object with a tail, hanging in the same place for weeks, that most people have never seen and
 * will not recognise. It has been mistaken for a great many things.
 *
 * It cuts both ways in exactly the way the showers do. A comet below the horizon cannot be what
 * anybody saw, and saying so is worth as much as saying the opposite.
 *
 * WHAT IS KNOWN AND WHAT IS MODELLED, since the two are not the same here:
 *
 * - WHERE it was is known, to a thousandth of a degree. The orbits come from JPL Horizons at each
 *   apparition's own perihelion and are propagated by two-body Kepler (see Orbit.ts), checked
 *   against Horizons' own integration.
 * - HOW BRIGHT it was is modelled, from one or two magnitudes somebody recorded at the time. The
 *   standard comet light curve is a rough instrument — a single power law standing in for a body
 *   whose activity switches on and off — and a magnitude of error either way is ordinary. It is
 *   never allowed to claim MORE than was recorded (see magnitudeAt), so its errors run toward
 *   understating a candidate rather than manufacturing one.
 * - THE TAIL is the roughest part, and half the apparitions have none at all because no length is
 *   on record for them. Where there is one it is drawn straight and exactly anti-solar, which is
 *   the ion tail; the dust tail is broader, curved, and lags behind along the orbit. See tailEndAt.
 */
export interface CometAppearance {
  apparition: CometApparition
  /** Where the head stood in the observer's own sky. */
  position: HorizontalPosition
  /** Where the far end of the tail stood, and how far that is from the head across the sky. Absent
   * for an apparition with no recorded tail length — most of them. */
  tailEnd?: HorizontalPosition
  tailLengthDeg?: number
  /** Distance from the Sun, astronomical units — the `r` of the light curve. */
  heliocentricDistanceAu: number
  /** Distance from the observer, astronomical units. */
  earthDistanceAu: number
  /** Degrees from the Sun as seen from here. A small elongation is why several of these apparitions
   * reached their recorded peak with hardly anybody on the ground seeing that peak — though not
   * always: Ikeya-Seki was watched two degrees from the Sun in broad daylight. Reported rather than
   * ruled on. */
  elongationDeg: number
  /** Modelled apparent visual magnitude. */
  magnitude: number
}

export class Comets {
  /**
   * How far either side of perihelion an apparition is considered at all, in days.
   *
   * Two things run out at about the same place, which is why one number serves for both. The
   * two-body propagation drifts as the date leaves the epoch its elements osculate at, and a comet
   * more than half a year from perihelion is far away, inactive and faint. Beyond this the honest
   * answer is that this catalog says nothing.
   */
  static readonly WINDOW_DAYS = 200

  /** Close enough to the Sun that where the comet stood is no longer the whole story, and a reader
   * being told it was up needs telling that too. NOT a visibility cutoff, here or anywhere else in
   * this class: whether an ordinary comet is lost in the glare and a magnitude-nine one is watched
   * through a shielding hand is a difference of nine magnitudes, and this number knows nothing about
   * magnitude. It marks the geometry worth reporting; the scene's own limit decides what is drawn. */
  static readonly TWILIGHT_ELONGATION_DEG = 15

  /** The speed of light in the units the geometry is in: astronomical units per day. What makes the
   * difference between where a comet is and where it is seen. */
  private static readonly LIGHT_SPEED_AU_PER_DAY = 173.144632674

  /** One orbit per apparition, built once. The elements never change, and the propagation is pure,
   * so there is nothing to invalidate. */
  private static readonly orbits = new Map<string, KeplerOrbit>()

  /** The apparitions whose window covers this date — usually none, occasionally one, and in a
   * handful of years (1957, 1970) two at once. */
  static aroundDate(date: Date): CometApparition[] {
    const julianDay = this.julianDayOf(date)
    return BRIGHT_COMETS.filter(apparition => Math.abs(julianDay - apparition.orbit.perihelionJd) <= this.WINDOW_DAYS)
  }

  /**
   * The brightest comet in that sky, if any was.
   *
   * By modelled magnitude rather than by fame, and without regard to whether it had risen: a reader
   * is owed "Hale-Bopp was up, and below the horizon" rather than silence. Callers that want only
   * what could be seen check the altitude themselves — the same division the meteor showers use.
   */
  static brightestAt(date: Date, observer: ObserverGeo): CometAppearance | undefined {
    return this.aroundDate(date)
      .map(apparition => this.appearanceOf(apparition, date, observer))
      .sort((a, b) => a.magnitude - b.magnitude)[0]
  }

  /** Everything about one apparition on one night, from where it stood to how long its tail looked
   * from there. */
  static appearanceOf(apparition: CometApparition, date: Date, observer: ObserverGeo): CometAppearance {
    const time = Astronomy.MakeTime(date)
    const earth = this.earthPositionAt(time)
    const comet = this.apparentPositionOf(apparition, 2451545 + time.tt, earth)
    const fromEarth = this.subtract(comet, earth)
    const heliocentricDistanceAu = this.length(comet)
    const earthDistanceAu = this.length(fromEarth)
    const tailEnd = this.tailEndAt(apparition, comet, earth, heliocentricDistanceAu, time, date, observer)
    const position = this.horizontalOf(fromEarth, time, date, observer)
    return {
      apparition,
      position,
      ...tailEnd,
      heliocentricDistanceAu,
      earthDistanceAu,
      // The Sun as seen from the observer is the direction opposite to where the Earth stands from
      // the Sun, which is why this needs no second ephemeris call.
      elongationDeg: this.angleBetween(fromEarth, this.subtract({ x: 0, y: 0, z: 0 }, earth)),
      magnitude: this.magnitudeAt(apparition, heliocentricDistanceAu, earthDistanceAu)
    }
  }

  /**
   * The apparent visual magnitude at that distance from the Sun and from here.
   *
   * `m = H + 5·log(delta) + 2.5·n·log(r)`, the standard comet light curve, with both parameters
   * anchored on magnitudes somebody actually recorded (see scripts/build-comet-catalog.ts).
   *
   * CAPPED AT THE RECORDED PEAK, and that is a deliberate piece of epistemology rather than a
   * safeguard against arithmetic. The formula happily extrapolates a sungrazer to magnitude −15 a
   * few hours from a perihelion nobody could look at; what the catalog knows is that the brightest
   * anybody wrote down was −10. Claiming more than that would be the model inventing an observation.
   * Understating, which this does instead, at worst withdraws a candidate explanation — and a
   * candidate that has to be argued for is the right way round.
   */
  static magnitudeAt(apparition: CometApparition, heliocentricDistanceAu: number, earthDistanceAu: number): number {
    const modelled =
      apparition.absoluteMagnitude +
      5 * Math.log10(earthDistanceAu) +
      2.5 * apparition.activityExponent * Math.log10(heliocentricDistanceAu)
    return Math.max(modelled, apparition.peakMagnitude)
  }

  /**
   * Where the far end of the tail appeared, and how far that is from the head.
   *
   * Modelled in space and then projected, never as a fixed number of degrees. A tail is a physical
   * thing of a physical length pointing directly away from the Sun; how long it LOOKS depends
   * entirely on where the observer stands relative to it, and the same tail that spans half the sky
   * one week is a stub pointing at the observer the next. Projecting the real length is the only
   * way to get that for free — and getting it wrong the other way, by drawing a stored angle
   * whatever the geometry, would draw a tail sticking out of a comet that was pointing away.
   *
   * Straight and exactly anti-solar, which is the ion tail. Real dust tails are broad, curved, and
   * trail behind along the orbit rather than along the Sun's line, so a real comet's tail is a fan
   * that begins where this line is drawn. Named as a simplification rather than hidden as one.
   */
  private static tailEndAt(
    apparition: CometApparition,
    comet: Vector3,
    earth: Vector3,
    heliocentricDistanceAu: number,
    time: Astronomy.AstroTime,
    date: Date,
    observer: ObserverGeo
  ): { tailEnd?: HorizontalPosition; tailLengthDeg?: number } {
    if (apparition.tailLengthAu === undefined) return {}
    // Straight out along the Sun-to-comet line: the tip is the head's own direction, further out.
    const stretch = 1 + apparition.tailLengthAu / heliocentricDistanceAu
    const tip = this.subtract({ x: comet.x * stretch, y: comet.y * stretch, z: comet.z * stretch }, earth)
    const head = this.subtract(comet, earth)
    return { tailEnd: this.horizontalOf(tip, time, date, observer), tailLengthDeg: this.angleBetween(head, tip) }
  }

  /**
   * Where the comet WAS when the light now arriving left it.
   *
   * A comet several astronomical units out is minutes of light away, and near perihelion it can be
   * covering a degree of sky a day — so the correction is worth the two extra propagations it
   * costs. Iterated twice: the first pass has the distance wrong by however far the comet moved
   * during the light time, which is itself a tiny fraction of that distance, and the second closes
   * it well past anything else here is accurate to.
   */
  private static apparentPositionOf(apparition: CometApparition, julianDay: number, earth: Vector3): Vector3 {
    const orbit = this.orbitOf(apparition)
    let position = orbit.positionAt(julianDay)
    for (let i = 0; i < 2; i++) {
      const lightDays = this.length(this.subtract(position, earth)) / this.LIGHT_SPEED_AU_PER_DAY
      position = orbit.positionAt(julianDay - lightDays)
    }
    return position
  }

  /**
   * A geocentric direction, in the ecliptic frame the orbit works in, turned into the observer's own
   * altitude and azimuth.
   *
   * Through the equator OF DATE rather than of J2000, unlike the star catalog: precession is nearly
   * a degree across the span this catalog covers, and a comet is a single object somebody is being
   * pointed at by name rather than a background of ten thousand that all shift together.
   *
   * TOPOCENTRIC, from where the witness stood rather than from the Earth's center — the same thing
   * astronomy-engine already does for the Moon and the planets. Ordinarily that is arcseconds and
   * would not be worth the line, but a comet can pass very much closer than a planet ever does:
   * IRAS-Araki-Alcock came by at 0.031 au, where the two viewpoints differ by nearly a tenth of a
   * degree, and it crossed a quarter of the sky in one night precisely because it was that close.
   */
  private static horizontalOf(geocentricEcliptic: Vector3, time: Astronomy.AstroTime, date: Date, observer: ObserverGeo): HorizontalPosition {
    const equatorialJ2000 = Astronomy.RotateVector(
      Astronomy.Rotation_ECL_EQJ(),
      new Astronomy.Vector(geocentricEcliptic.x, geocentricEcliptic.y, geocentricEcliptic.z, time)
    )
    const ofDate = Astronomy.RotateVector(Astronomy.Rotation_EQJ_EQD(time), equatorialJ2000)
    const fromObserver = Astronomy.ObserverVector(time, new Astronomy.Observer(observer.lat, observer.lng, observer.elevationM), true)
    const topocentric = new Astronomy.Vector(ofDate.x - fromObserver.x, ofDate.y - fromObserver.y, ofDate.z - fromObserver.z, time)
    const equatorial = Astronomy.EquatorFromVector(topocentric)
    return equatorialToHorizontal(equatorial.ra, equatorial.dec, date, observer)
  }

  /** Where the Earth was, heliocentric and in the ecliptic frame the orbits are given in. */
  private static earthPositionAt(time: Astronomy.AstroTime): Vector3 {
    return Astronomy.RotateVector(Astronomy.Rotation_EQJ_ECL(), Astronomy.HelioVector(Astronomy.Body.Earth, time))
  }

  /** The Julian day in dynamical time, through astronomy-engine's own delta-T model — a minute or
   * so across the twentieth century, and free to get right. */
  private static julianDayOf(date: Date): number {
    return 2451545 + Astronomy.MakeTime(date).tt
  }

  private static orbitOf(apparition: CometApparition): KeplerOrbit {
    const existing = this.orbits.get(apparition.id)
    if (existing) return existing
    const orbit = new KeplerOrbit(apparition.orbit)
    this.orbits.set(apparition.id, orbit)
    return orbit
  }

  private static subtract(a: Vector3, b: Vector3): Vector3 {
    return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z }
  }

  private static length(v: Vector3): number {
    return Math.hypot(v.x, v.y, v.z)
  }

  private static angleBetween(a: Vector3, b: Vector3): number {
    const cosine = (a.x * b.x + a.y * b.y + a.z * b.z) / (this.length(a) * this.length(b) || 1)
    return (Math.acos(Math.min(1, Math.max(-1, cosine))) * 180) / Math.PI
  }
}
