import { computeBodyPosition } from "./CelestialPositions.js"
import type { ObserverGeo } from "./CelestialPositions.js"

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
 * What individual objects there were is handled the way the aircraft are: placed by hand, because
 * the record does not exist. What CLASS of object existed is a matter of dates, and that is what
 * SATELLITE_ERAS below is for.
 */
export interface SatelliteEra {
  id: string
  name: { en: string; fr: string }
  /** When objects of this kind started being visible overhead. */
  from: string
  /** When they stopped, where they have. Absent means they are still up there. */
  to?: string
  /**
   * The brightest this class is recorded as getting, apparent visual magnitude.
   *
   * Here because being SUNLIT and being SEEABLE are two different questions, and only the first is
   * geometry. An Iridium flare at magnitude -8 outshines a daylit sky; an ordinary satellite at
   * magnitude 2 needs a dark one. Nothing in this file decides which — it reports the number, and
   * the caller compares it against whatever that sky allowed (the scene's own visibleMagnitudeLimit,
   * the same rule every star and the comets already go through).
   */
  peakMagnitude: number
  /** What made this class worth naming — in the terms a report of the period would have used. */
  note: string
}

/**
 * The datable classes of orbiting object bright enough to be reported by somebody who was not
 * looking for them.
 *
 * Dates, not counts. How many objects were in orbit in a given year is a real number and a
 * misleading one — most of them were never visible to anybody — whereas "Iridium flares did not
 * exist before 1997 and stopped in 2019" is a fact that settles reports on both sides of it. Every
 * entry here is a window a report can be inside or outside of, which is the only thing this list is
 * for.
 */
export const SATELLITE_ERAS: SatelliteEra[] = [
  {
    id: "echo",
    name: { en: "the Echo balloons", fr: "les ballons Echo" },
    from: "1960-08-12",
    to: "1969-06-07",
    peakMagnitude: -1,
    note: "Echo 1 and 2 were 30- and 40-metre reflective balloons, as bright as the brightest stars and moving slowly enough to be watched — deliberately visible, widely announced in newspapers, and the first objects most people ever saw crossing the night sky. They fall squarely inside the sighting waves this project reconstructs."
  },
  {
    id: "iridium-flares",
    name: { en: "the Iridium flares", fr: "les flashes d'Iridium" },
    from: "1997-05-05",
    to: "2019-12-27",
    peakMagnitude: -8,
    note: "The original Iridium satellites carried flat, mirror-finish antennas that threw a sunbeam a few kilometres wide across the ground: a still point of sky flaring to magnitude -8 over five seconds and vanishing again. Nothing else in the sky does that. The replacement Iridium NEXT satellites have no such panels, so the phenomenon has a hard end date as well as a hard start."
  },
  {
    id: "iss",
    name: { en: "the International Space Station", fr: "la Station spatiale internationale" },
    from: "1998-11-20",
    peakMagnitude: -5.9,
    note: "Since its first modules, and much brighter as it grew: at its best it outshines everything in the sky but the Sun and the Moon, crossing in a straight silent line in about four minutes."
  },
  {
    id: "starlink-trains",
    name: { en: "the Starlink trains", fr: "les trains de Starlink" },
    from: "2019-05-24",
    peakMagnitude: 1,
    note: "In the days after a launch, sixty satellites still bunched in their deployment string cross as an evenly spaced line of lights — the single most reported 'formation of UFOs' of the era. They spread out within weeks, so a train is a fact about the days after a launch rather than about the year."
  }
]

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
  eras: SatelliteEra[]
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

  /** The classes of visible object that existed on that date — see SATELLITE_ERAS. */
  static erasAt(date: Date): SatelliteEra[] {
    const day = date.getTime()
    return SATELLITE_ERAS.filter(era => {
      const from = Date.parse(`${era.from}T00:00:00Z`)
      const to = era.to === undefined ? Infinity : Date.parse(`${era.to}T23:59:59Z`)
      return day >= from && day <= to
    })
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
      eras: Satellites.erasAt(date),
      anythingInOrbit: date.getTime() >= Date.parse(`${Satellites.FIRST_ORBIT}T00:00:00Z`)
    }
  }
}
