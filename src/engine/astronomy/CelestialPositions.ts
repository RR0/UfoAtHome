import * as Astronomy from "astronomy-engine"
import type { SightingTime } from "../model/Sighting.js"

/**
 * Sun/Moon/planet positions and the star catalog's RA/dec -> alt/az transform, via the
 * `astronomy-engine` library (pure TS, no runtime dependencies, MIT). Unlike SunPosition.ts (its
 * neighbor, kept dependency-free), a real lunar/planetary ephemeris needs topocentric parallax,
 * light-travel-time correction and aberration that aren't worth hand-rolling once a vetted
 * library is a dependency anyway — and since it's needed regardless for the star catalog's RA/dec
 * transform, the live rendering path also uses it for the Sun (single source of truth, and the
 * Sun's azimuth comes "for free" from the same call used for the sky's azimuth-aware gradient).
 * SunPosition.ts itself stays as-is: it's still correct, still tested, and skyBrightness() is
 * still reused (a pure altitude -> twilight-band classifier, independent of which engine computed
 * the altitude).
 */

export type CelestialBody = "Sun" | "Moon" | "Venus" | "Mars" | "Jupiter" | "Saturn"

export const TRACKED_PLANETS: readonly CelestialBody[] = ["Venus", "Mars", "Jupiter", "Saturn"]

export interface ObserverGeo {
  lat: number
  lng: number
  elevationM: number
}

export interface HorizontalPosition {
  /** Degrees above (positive) or below (negative) the horizon. */
  altitudeDeg: number
  /** Degrees clockwise from true north. */
  azimuthDeg: number
}

export interface MoonPhase {
  /** 0 = new moon, 0.5 = full moon, 1 = new again. */
  phaseFraction: number
  /** Fraction of the Moon's disc illuminated as seen from Earth, 0..1 — distinct from
   * phaseFraction: e.g. first/third quarter both have phaseFraction 0.25/0.75 but
   * illuminatedFraction ~0.5. */
  illuminatedFraction: number
}

function toObserver(observer: ObserverGeo): Astronomy.Observer {
  return new Astronomy.Observer(observer.lat, observer.lng, observer.elevationM)
}

/**
 * RA/dec (equatorial, as stored in the star catalog) -> alt/az for a given observer/time. Also
 * used internally by computeBodyPosition for planets/Moon. Uses astronomy-engine's own Horizon()
 * rather than hand-rolling sidereal-time + spherical trig by hand: the library already carries
 * this and it's needed for the star catalog regardless of what's used for Sun/planets.
 */
export function equatorialToHorizontal(raHours: number, decDeg: number, date: Date, observer: ObserverGeo): HorizontalPosition {
  const horizontal = Astronomy.Horizon(date, toObserver(observer), raHours, decDeg, "normal")
  return { altitudeDeg: horizontal.altitude, azimuthDeg: horizontal.azimuth }
}

export function computeBodyPosition(body: CelestialBody, date: Date, observer: ObserverGeo): HorizontalPosition {
  const obs = toObserver(observer)
  const equatorial = Astronomy.Equator(Astronomy.Body[body], date, obs, true, true)
  const horizontal = Astronomy.Horizon(date, obs, equatorial.ra, equatorial.dec, "normal")
  return { altitudeDeg: horizontal.altitude, azimuthDeg: horizontal.azimuth }
}

/** Real apparent visual magnitude (e.g. Venus around -4, Saturn around 0.5) — lets rendering tell
 * planets apart by brightness instead of drawing them all identically. */
export function computeBodyMagnitude(body: CelestialBody, date: Date): number {
  return Astronomy.Illumination(Astronomy.Body[body], date).mag
}

export function computeMoonPhase(date: Date): MoonPhase {
  const longitudeDeg = Astronomy.MoonPhase(date)
  const illumination = Astronomy.Illumination(Astronomy.Body.Moon, date)
  return { phaseFraction: longitudeDeg / 360, illuminatedFraction: illumination.phase_fraction }
}

/** Year/month/day substituted when a time-of-day is known but no date at all is (e.g. a witness
 * recalls "around 2am" but not the date) — a fixed spring equinox instant, not "today", so day/
 * night balance isn't skewed by an arbitrary/seasonal guess and the same sighting always previews
 * the same way regardless of when someone happens to view it. This is a *rendering* fallback only,
 * same spirit as SceneElement's own DEFAULT_OBSERVER_POSE lat/lng=0,0 for a missing location —
 * never written back into the sighting's own `time` field, which stays exactly what was entered. */
const REFERENCE_YEAR_FOR_TIME_ONLY = 2000
const REFERENCE_MONTH_FOR_TIME_ONLY = 3
const REFERENCE_DAY_FOR_TIME_ONLY = 20

/**
 * Approximates the real UTC instant a witness's local clock reading corresponds to, by inferring
 * a timezone from longitude (round(lng/15) hours) — the same crude approximation SunPosition.ts
 * documents and uses (historical sightings essentially never record a UTC offset, and
 * reconstructing the exact historical timezone/DST rules for a given date/place is its own can of
 * worms). Needed here, unlike in SunPosition.ts, because a real ephemeris library operates on
 * true UTC instants rather than a self-contained local hour-angle formula.
 *
 * `SightingTime`'s fields are already independently optional the same way `@rr0/time`'s
 * `Level2Date`/EDTF are — this function's job is turning that fuzziness into *some* renderable
 * instant, not modeling the fuzziness itself. A known year still anchors month/day to Jan 1 when
 * they're missing (unchanged, existing behavior); only when there's no year at all does a missing
 * month/day fall back to the reference equinox above, so a witness's known hour still renders a
 * plausible day/night sky instead of nothing. undefined only when literally no date/time field at
 * all is known — there's nothing left to approximate from.
 */
export function sightingTimeToDate(time: SightingTime, lngForTimezoneApprox: number): Date | undefined {
  if (time.year === undefined && time.month === undefined && time.day === undefined && time.hour === undefined) {
    return undefined
  }
  const yearKnown = time.year !== undefined
  const year = time.year ?? REFERENCE_YEAR_FOR_TIME_ONLY
  const month = time.month ?? (yearKnown ? 1 : REFERENCE_MONTH_FOR_TIME_ONLY)
  const day = time.day ?? (yearKnown ? 1 : REFERENCE_DAY_FOR_TIME_ONLY)
  const timezoneOffsetHours = Math.round(lngForTimezoneApprox / 15)
  return new Date(
    Date.UTC(year, month - 1, day, (time.hour ?? 12) - timezoneOffsetHours, time.minute ?? 0, time.second ?? 0)
  )
}
