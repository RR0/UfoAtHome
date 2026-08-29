import { computeBodyPosition } from "./CelestialPositions.js"
import type { ObserverGeo } from "./CelestialPositions.js"
import { FIRST_TRACKED_MONTH, SATELLITE_CLASSES, TRACKED_OBJECTS_BY_MONTH } from "./satelliteCatalog.js"
import type { SatelliteClass } from "./satelliteCatalog.js"

/**
 * Whether anything in orbit could have been seen from here, at this hour, on this date.
 *
 * The third candidate explanation, and the one whose record is most obviously incomplete — so it is
 * worth saying at the outset what this file does NOT do. It does not know which satellites were
 * overhead. Historical orbital elements are not obtainable: CelesTrak serves only current ones, and
 * the archive that goes back to 1957 (Space-Track) needs an account and cannot be called from a
 * browser at all. Propagating today's elements back to 1965 would produce a confident, precise,
 * entirely invented pass. This project does not do that.
 *
 * What it does instead is the part that IS complete, and it turns out to be the part that decides
 * most cases anyway: THE ILLUMINATION. A satellite shines by reflected sunlight and nothing else, so
 * where the Earth's shadow stands decides what is lit. That is pure geometry from the real Sun, it
 * needs no catalogue, and it holds for every date since Sputnik.
 *
 * And it cuts both ways hard, which is the point. Deep in the night the Earth's shadow stands
 * thousands of kilometres above the witness, and NOTHING in low orbit is lit — so a light crossing
 * the sky at two in the morning was not a satellite, whatever else it was. That single fact
 * disposes of a great many attributions, and it is available for every report this project will
 * ever reconstruct.
 *
 * BEING LIT AND BEING SEEN ARE NOT THE SAME QUESTION, and conflating them is a mistake this file
 * made and no longer makes. In DAYLIGHT everything above the observer is sunlit — the Earth's shadow
 * is behind them, not over them — so the geometry says "lit", and it is the sky's own brightness
 * that decides whether anybody could pick the object out of it. Usually nothing can: an ordinary
 * satellite is magnitude 2 against a sky that hides everything fainter than -4. But an Iridium flare
 * reached -8, and those really were watched in broad daylight. So the geometry is reported here and
 * the contrast is settled by the caller, against the same visibleMagnitudeLimit every star and every
 * comet in this scene already goes through. A satellite does NOT require a dark observer; it
 * requires more light than the sky it stands in.
 *
 * HOW MANY there were is also complete, and it came as a surprise: CelesTrak's SATCAT registers
 * every object ever tracked, with the date it went up and the date it came down, back to Sputnik and
 * open to a browser. That gives a real, dated count for any night — two the month Sputnik launched,
 * a hundred and sixty-one the month of the Socorro landing, twenty-two thousand now — which bears
 * directly on how plausible an attribution is. What it does NOT give is where any of them was.
 *
 * What individual objects there were is therefore handled the way the aircraft are: placed by hand,
 * because that part of the record does not exist. What CLASS of object existed is a matter of dates,
 * and those dates now come from the catalogue rather than from anybody's memory — see
 * satelliteCatalog.ts.
 */
export interface SatelliteVisibility {
  /** The Sun's real altitude, degrees. Negative once it has set. */
  sunAltitudeDeg: number
  /**
   * How high above the witness the Earth's own shadow stood, in kilometres — the lowest an object
   * directly overhead could be and still be in sunlight.
   *
   * ZERO while the Sun is up, and that is the physical answer rather than a placeholder: an
   * observer in daylight has the Earth's shadow behind them, so everything above them, down to the
   * ground, is in sunlight.
   */
  shadowHeightKm: number
  /** Whether an object at a typical low orbit, directly overhead, was catching the Sun. True all
   * day, which is what the geometry says; whether anybody could SEE it is a separate question the
   * caller settles against the sky's own brightness. */
  lowOrbitLit: boolean
  /** The classes of visible object that existed on that date. Empty before Sputnik, and that is a
   * complete answer rather than a missing one. */
  classes: SatelliteClass[]
  /** How many tracked objects — payloads and spent rocket bodies, never debris — were in orbit that
   * month. Undefined before the first launch, which is a different statement from zero. */
  trackedObjects?: number
  /** Whether anything at all was in orbit yet. */
  anythingInOrbit: boolean
}

export class Satellites {
  /** Sputnik 1. Before this date the sky had nothing artificial in it, and no amount of geometry
   * changes that — the hardest coverage floor in this project. */
  static readonly FIRST_ORBIT = "1957-10-04"

  /** Mean Earth radius, kilometres. */
  static readonly EARTH_RADIUS_KM = 6371

  /**
   * The height this file means by "low orbit", in kilometres.
   *
   * Between the Space Station at about 420 and a Starlink at about 550, and near enough to both to
   * answer the question either would raise. Stated as one number rather than left implicit because
   * the whole lit/unlit verdict turns on it: an object at 1000 km stays lit an hour longer.
   */
  static readonly LOW_ORBIT_KM = 500

  /**
   * How high the Earth's shadow reaches directly above an observer whose Sun is `depression`
   * degrees below the horizon, in kilometres.
   *
   * `h = R·(sec β − 1)`, which falls out of the geometry in one line: an object overhead at radius
   * `R + h` lies a perpendicular distance `(R + h)·cos β` from the Earth-Sun axis, and it clears the
   * shadow exactly when that exceeds the Earth's own radius.
   *
   * The shadow is taken as a CYLINDER of the Earth's radius rather than the true cone, and the
   * approximation is worth naming only to say how small it is: the umbra tapers to nothing at about
   * 1.4 million kilometres, so at 500 km its radius has narrowed by two kilometres out of six
   * thousand. What the model really leaves out is softer — the penumbra, where an object is lit by
   * part of the Sun's disc and dims rather than vanishing, and the sunlight that the atmosphere
   * refracts into the shadow, which is the same light that reddens a lunar eclipse. Both make the
   * real edge a gradient a few tens of kilometres deep instead of the line drawn here.
   *
   * Zero while the Sun is up. That falls out of the same derivation rather than being special-cased
   * away: the shadow requires the object to be on the night side of the Earth-Sun plane at all, and
   * with the Sun above the horizon nothing overhead is. An observer in daylight stands with the
   * shadow BEHIND them, and everything above them is lit right down to the ground.
   */
  static shadowHeightKm(sunAltitudeDeg: number): number {
    if (sunAltitudeDeg >= 0) return 0
    const depression = (-sunAltitudeDeg * Math.PI) / 180
    return Satellites.EARTH_RADIUS_KM * (1 / Math.cos(depression) - 1)
  }

  /**
   * Whether an object at `heightKm` directly overhead was in sunlight.
   *
   * Illumination only. True all through the day, which is the literal answer AND the correct one:
   * this used to return false in daylight, on the reasoning that nobody could see it anyway, and
   * that was two mistakes at once — it stated the opposite of the physics, and it buried a
   * judgement about contrast inside a predicate about geometry. The Iridium flares settle it: at
   * magnitude -8 they were picked out of a daylit sky by people who knew where to look.
   */
  static isLitOverhead(heightKm: number, sunAltitudeDeg: number): boolean {
    return heightKm > Satellites.shadowHeightKm(sunAltitudeDeg)
  }

  /** The classes of visible object that existed on that date — see satelliteCatalog.ts. */
  static classesAt(date: Date): SatelliteClass[] {
    const day = date.getTime()
    return SATELLITE_CLASSES.filter(satelliteClass => {
      const from = Date.parse(`${satelliteClass.from}T00:00:00Z`)
      const to = satelliteClass.to === undefined ? Infinity : Date.parse(`${satelliteClass.to}T23:59:59Z`)
      return day >= from && day <= to
    })
  }

  /**
   * How many tracked objects were in orbit that month.
   *
   * Payloads and spent rocket bodies, never debris — a fragment is a fact about radar, not about
   * what a witness could have seen. Undefined before the first launch, which says "there was no
   * such thing" rather than "none that month".
   *
   * Monthly, and the readout says so: the count moves by a handful over a fortnight, and quoting it
   * against one particular night would be precision this does not carry. Counted at the END of the
   * month — an object launched during it counts, one that came down during it does not.
   */
  static trackedInOrbitAt(date: Date): number | undefined {
    const month = date.getUTCFullYear() * 12 + date.getUTCMonth() - FIRST_TRACKED_MONTH
    if (month < 0) return undefined
    // Past the end of the table is the last month it has, not nothing: a catalogue built today
    // cannot know about next year, and the honest answer for a future date is the latest count.
    return TRACKED_OBJECTS_BY_MONTH[Math.min(month, TRACKED_OBJECTS_BY_MONTH.length - 1)]
  }

  /**
   * Everything this file can say about that sky, in one answer.
   *
   * Note what is NOT in it: whether any of this could have been seen. That needs the sky's own
   * limiting magnitude, which lives with the renderer because it is the same rule the star field is
   * drawn by — see the class comment. Keeping it out means this file states geometry and dates, and
   * nothing that is a judgement.
   */
  static visibilityAt(date: Date, observer: ObserverGeo): SatelliteVisibility {
    const sunAltitudeDeg = computeBodyPosition("Sun", date, observer).altitudeDeg
    return {
      sunAltitudeDeg,
      shadowHeightKm: Satellites.shadowHeightKm(sunAltitudeDeg),
      lowOrbitLit: Satellites.isLitOverhead(Satellites.LOW_ORBIT_KM, sunAltitudeDeg),
      classes: Satellites.classesAt(date),
      trackedObjects: Satellites.trackedInOrbitAt(date),
      anythingInOrbit: date.getTime() >= Date.parse(`${Satellites.FIRST_ORBIT}T00:00:00Z`)
    }
  }
}
