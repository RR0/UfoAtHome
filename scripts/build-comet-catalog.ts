/**
 * One-off build step (not part of `build`/`prepublishOnly`) that turns the list of naked-eye comet
 * apparitions below into `src/engine/astronomy/cometCatalog.ts`.
 *
 * Run with: npm run build:comets
 *
 * Two kinds of number meet here, and keeping them apart is the whole point of generating the
 * catalog rather than typing it:
 *
 * - THE ORBIT is fetched from JPL Horizons (https://ssd.jpl.nasa.gov/horizons/), asked for
 *   osculating elements AT that apparition's own perihelion. Not a modern element set propagated
 *   backwards: Horizons integrates the real, perturbed orbit, and the elements it reports for
 *   20 April 1910 are the ones Halley was actually on that day. A two-body propagation from them
 *   then holds to about a thousandth of a degree across the months either side — verified against
 *   Horizons' own state vectors in test/engine/astronomy/Orbit.test.ts.
 *
 * - THE BRIGHTNESS is an OBSERVATION, hand-entered below with the date it was made on, because
 *   there is no reliable machine-readable source for it. JPL's own M1/K1 and the Minor Planet
 *   Center's H/G are fits to astrometry, and spot-checking them against what people actually saw
 *   put NEOWISE four magnitudes and Hyakutake nearly three magnitudes too faint; the MPC file does
 *   not carry the historical comets at all. So what is stored is the peak magnitude somebody
 *   recorded, and the absolute magnitude is DERIVED from it below. The derivation is the model; the
 *   peak is the fact.
 *
 * Responses are cached under scripts/data/horizons/ (gitignored) so a re-run costs nothing and can
 * be done offline. Delete a file there to refetch it.
 */
import { mkdirSync, existsSync, readFileSync, writeFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import path from "node:path"
import * as Astronomy from "astronomy-engine"
import { KeplerOrbit } from "../src/engine/astronomy/Orbit.js"
import type { OrbitalElements, Vector3 } from "../src/engine/astronomy/Orbit.js"

/**
 * What a witness could have seen, and when somebody wrote it down.
 *
 * `query` is what Horizons is asked for, and it is not always the plain designation: a comet that
 * split has one record per fragment (C/1965 S1-A and -B for Ikeya-Seki), and the API refuses an
 * ambiguous request rather than guessing. The primary fragment is the one that was the comet.
 */
interface ApparitionInput {
  id: string
  /** The Horizons target designation, without the `DES=` and the trailing semicolon. */
  query: string
  designation: string
  /** WITHOUT a leading article in French: the readout supplies "La " itself, since a clause opening
   * with the comet reads as an apposition and one stating that it was there does not. English needs
   * no such care and keeps the article where the name has one. */
  name: { en: string; fr: string }
  /** Roughly when perihelion fell — only used to ask Horizons for elements near the right date. The
   * exact time of perihelion comes back in the answer. */
  perihelionQueryDate: string
  /** Brightest recorded visual magnitude, and the date it was recorded on. The date matters as much
   * as the magnitude: Hyakutake's own peak was at its closest approach to Earth, five weeks BEFORE
   * perihelion, and anchoring it at perihelion instead would make it several magnitudes too bright
   * everywhere. */
  peakMagnitude: number
  peakOn: string
  /**
   * A SECOND recorded magnitude, on a second date — present only where the first one alone cannot
   * describe the apparition.
   *
   * It buys the activity exponent, which is otherwise assumed. One observation fixes only where the
   * light curve passes; two fix how steeply it falls, and there is exactly one family of comets
   * where the assumed slope is catastrophically wrong. A sungrazer's peak is recorded at a
   * perihelion distance of a few thousandths of an astronomical unit, and the standard fourth-power
   * law then has the brightness collapsing by ten magnitudes within days — so Comet Lovejoy, which
   * thousands of people in the southern hemisphere watched in the dawn sky a week after perihelion,
   * comes out of a one-point fit at magnitude nine. That is not a small error, it is a candidate
   * explanation being denied on the very dates it explains something.
   */
  alsoRecorded?: { magnitude: number; on: string }
  /** Greatest recorded tail length, in degrees of sky, around the peak date — entered only where
   * the figure is genuinely on record. Left out otherwise, and an apparition without one is drawn
   * as a coma and nothing else: a plausible-looking tail is exactly the sort of thing this project
   * must not invent. */
  tailLengthDeg?: number
  /** Why this apparition is in the list, in the terms a reader of a case file would want. */
  note?: string
}

/**
 * The naked-eye comets, 1910 onwards — the ones bright enough that somebody with no instrument and
 * no warning could have looked up and seen them.
 *
 * The list is deliberately not "every comet": a magnitude-8 comet is a fact about a telescope, not
 * about a witness. It starts at Halley 1910 because that is about as far back as this project ever
 * reconstructs a report, and every entry is one apparition — 1P/Halley appears twice, with the
 * orbit it was actually on each time.
 */
const APPARITIONS: ApparitionInput[] = [
  {
    id: "halley-1910", query: "1P", designation: "1P/Halley", name: { en: "Halley's Comet", fr: "comète de Halley" },
    perihelionQueryDate: "1910-04-20", peakMagnitude: 0, peakOn: "1910-05-20", tailLengthDeg: 100,
    note: "Passed 0.15 au from Earth on 20 May 1910, and the Earth crossed the outer tail the day before — the apparition that produced a genuine public panic."
  },
  {
    id: "brooks-1911", query: "C/1911 O1", designation: "C/1911 O1", name: { en: "Comet Brooks", fr: "comète Brooks" },
    perihelionQueryDate: "1911-10-28", peakMagnitude: 2, peakOn: "1911-10-25"
  },
  {
    id: "skjellerup-maristany-1927", query: "C/1927 X1", designation: "C/1927 X1", name: { en: "Comet Skjellerup-Maristany", fr: "comète Skjellerup-Maristany" },
    perihelionQueryDate: "1927-12-18", peakMagnitude: -6, peakOn: "1927-12-15",
    note: "One of the few comets of the century seen in full daylight."
  },
  {
    id: "de-kock-paraskevopoulos-1941", query: "C/1941 B2", designation: "C/1941 B2", name: { en: "Comet de Kock-Paraskevopoulos", fr: "comète de Kock-Paraskevopoulos" },
    perihelionQueryDate: "1941-01-27", peakMagnitude: 2, peakOn: "1941-02-05"
  },
  {
    id: "southern-1947", query: "C/1947 X1-A", designation: "C/1947 X1", name: { en: "the Southern Comet", fr: "comète australe" },
    perihelionQueryDate: "1947-12-02", peakMagnitude: -3, peakOn: "1947-12-08",
    note: "A bright southern-hemisphere comet of December 1947, the month the American sighting wave of that year was still being argued over."
  },
  {
    id: "eclipse-1948", query: "C/1948 V1", designation: "C/1948 V1", name: { en: "the Eclipse Comet", fr: "comète de l'éclipse" },
    perihelionQueryDate: "1948-10-27", peakMagnitude: -2, peakOn: "1948-11-01",
    note: "Found during the total solar eclipse of 1 November 1948, which is how a comet that bright had gone unnoticed: it had been hidden in the Sun's glare."
  },
  {
    id: "arend-roland-1957", query: "C/1956 R1", designation: "C/1956 R1", name: { en: "Comet Arend-Roland", fr: "comète Arend-Roland" },
    perihelionQueryDate: "1957-04-08", peakMagnitude: 0.5, peakOn: "1957-04-25",
    note: "Showed a spike pointing back TOWARD the Sun in late April 1957 — a real anti-tail, and much reported at the time."
  },
  {
    id: "mrkos-1957", query: "C/1957 P1", designation: "C/1957 P1", name: { en: "Comet Mrkos", fr: "comète Mrkos" },
    perihelionQueryDate: "1957-08-01", peakMagnitude: 1, peakOn: "1957-08-05",
    note: "The second bright naked-eye comet of 1957, four months after Arend-Roland."
  },
  {
    id: "seki-lines-1962", query: "C/1962 C1", designation: "C/1962 C1", name: { en: "Comet Seki-Lines", fr: "comète Seki-Lines" },
    perihelionQueryDate: "1962-04-01", peakMagnitude: -2.5, peakOn: "1962-04-01"
  },
  {
    id: "ikeya-seki-1965", query: "C/1965 S1-A", designation: "C/1965 S1", name: { en: "Comet Ikeya-Seki", fr: "comète Ikeya-Seki" },
    perihelionQueryDate: "1965-10-21", peakMagnitude: -10, peakOn: "1965-10-21",
    alsoRecorded: { magnitude: 2, on: "1965-10-30" }, tailLengthDeg: 25,
    note: "A sungrazer that passed 450 000 km above the Sun's surface and was seen beside it in broad daylight — the brightest comet of the twentieth century. It then stood in the dawn sky for a fortnight with a tail some 25 degrees long, which is the second magnitude recorded here."
  },
  {
    id: "bennett-1970", query: "C/1969 Y1", designation: "C/1969 Y1", name: { en: "Comet Bennett", fr: "comète Bennett" },
    perihelionQueryDate: "1970-03-20", peakMagnitude: 0, peakOn: "1970-03-26"
  },
  {
    id: "white-ortiz-bolelli-1970", query: "C/1970 K1", designation: "C/1970 K1", name: { en: "Comet White-Ortiz-Bolelli", fr: "comète White-Ortiz-Bolelli" },
    perihelionQueryDate: "1970-05-14", peakMagnitude: 1, peakOn: "1970-05-22"
  },
  {
    id: "kohoutek-1973", query: "C/1973 E1", designation: "C/1973 E1", name: { en: "Comet Kohoutek", fr: "comète Kohoutek" },
    perihelionQueryDate: "1973-12-28", peakMagnitude: 0, peakOn: "1974-01-05",
    note: "Announced in advance as the comet of the century and remembered for disappointing: it was an ordinary naked-eye object, not the spectacle the press had promised."
  },
  {
    id: "west-1976", query: "C/1975 V1-A", designation: "C/1975 V1", name: { en: "Comet West", fr: "comète West" },
    perihelionQueryDate: "1976-02-25", peakMagnitude: -3, peakOn: "1976-02-25", tailLengthDeg: 30,
    note: "Broke into four pieces at perihelion. Barely reported at the time — the press had been burned by Kohoutek two years earlier."
  },
  {
    id: "iras-araki-alcock-1983", query: "C/1983 H1", designation: "C/1983 H1", name: { en: "Comet IRAS-Araki-Alcock", fr: "comète IRAS-Araki-Alcock" },
    perihelionQueryDate: "1983-05-21", peakMagnitude: 1.7, peakOn: "1983-05-11",
    note: "Passed 0.031 au from Earth on 11 May 1983, one of the closest cometary approaches on record: it crossed a quarter of the sky in a night, which no other comet in this list did."
  },
  {
    id: "halley-1986", query: "1P", designation: "1P/Halley", name: { en: "Halley's Comet", fr: "comète de Halley" },
    perihelionQueryDate: "1986-02-09", peakMagnitude: 2.1, peakOn: "1986-03-10",
    note: "The worst-placed return in two thousand years — famous, expected, and for most observers a faint smudge."
  },
  {
    id: "hyakutake-1996", query: "C/1996 B2", designation: "C/1996 B2", name: { en: "Comet Hyakutake", fr: "comète Hyakutake" },
    perihelionQueryDate: "1996-05-01", peakMagnitude: 0, peakOn: "1996-03-25", tailLengthDeg: 80,
    note: "Passed 0.10 au from Earth in March 1996, five weeks BEFORE perihelion, with a tail measured at some 80 degrees — the longest of the modern era."
  },
  {
    id: "hale-bopp-1997", query: "C/1995 O1", designation: "C/1995 O1", name: { en: "Comet Hale-Bopp", fr: "comète Hale-Bopp" },
    perihelionQueryDate: "1997-04-01", peakMagnitude: -0.8, peakOn: "1997-04-01", tailLengthDeg: 20,
    note: "Visible to the naked eye for about eighteen months, longer than any comet on record."
  },
  {
    id: "mcnaught-2007", query: "C/2006 P1", designation: "C/2006 P1", name: { en: "Comet McNaught", fr: "comète McNaught" },
    perihelionQueryDate: "2007-01-12", peakMagnitude: -5.5, peakOn: "2007-01-13", tailLengthDeg: 35,
    note: "The brightest comet since Ikeya-Seki, seen in daylight beside the Sun in January 2007."
  },
  {
    id: "lovejoy-2011", query: "C/2011 W3", designation: "C/2011 W3", name: { en: "Comet Lovejoy", fr: "comète Lovejoy" },
    perihelionQueryDate: "2011-12-16", peakMagnitude: -3, peakOn: "2011-12-16",
    alsoRecorded: { magnitude: 1.5, on: "2011-12-22" },
    note: "A sungrazer that was expected to be destroyed at perihelion and came out the other side, to stand in the southern dawn sky for the rest of December — which is the second magnitude recorded here."
  },
  {
    id: "panstarrs-2013", query: "C/2011 L4", designation: "C/2011 L4", name: { en: "Comet PANSTARRS", fr: "comète PANSTARRS" },
    perihelionQueryDate: "2013-03-10", peakMagnitude: 1, peakOn: "2013-03-10"
  },
  {
    id: "neowise-2020", query: "C/2020 F3", designation: "C/2020 F3", name: { en: "Comet NEOWISE", fr: "comète NEOWISE" },
    perihelionQueryDate: "2020-07-03", peakMagnitude: 0.9, peakOn: "2020-07-08", tailLengthDeg: 10,
    note: "The first comet since Hale-Bopp that ordinary observers in the northern hemisphere saw without being told where to look."
  },
  {
    id: "tsuchinshan-atlas-2024", query: "C/2023 A3", designation: "C/2023 A3", name: { en: "Comet Tsuchinshan-ATLAS", fr: "comète Tsuchinshan-ATLAS" },
    perihelionQueryDate: "2024-09-27", peakMagnitude: 0, peakOn: "2024-10-14", tailLengthDeg: 20,
    note: "Briefly reported far brighter around 9 October 2024, when it stood almost between the observer and the Sun and forward-scattered the light through its own dust — a geometry this catalog's brightness model does not attempt, so what is stored is the ordinary evening-sky peak a few days later."
  }
]

/** The exponent of the standard comet light curve, `m = H + 5·log(delta) + 2.5·n·log(r)`. Four is
 * the conventional value, and it is what an apparition with a single recorded magnitude gets: one
 * observation cannot fix two parameters, and assuming the conventional slope is a great deal more
 * honest than fitting a number to a curve that has one point on it. */
const DEFAULT_ACTIVITY_EXPONENT = 4

/**
 * The longest a tail is allowed to be in space, in astronomical units.
 *
 * A ceiling is needed because the recorded figure is an ANGLE and the stored one is a LENGTH, and
 * the conversion between them has a limit the recorded angle can exceed. A straight tail pointing
 * directly away from the Sun can never appear longer, from here, than the angle between the comet
 * and the anti-solar point — however long it is, its far end tends to that one spot in the sky. For
 * Hyakutake in March 1996 that ceiling was about 65 degrees, and the tail was measured at 80: real
 * tails curve, and a length measured ALONG a curve is not the separation of its two ends.
 *
 * So an unreachable angle is met with the longest physically defensible tail instead of a number
 * fitted to an impossible requirement. One astronomical unit is at the upper end of what has
 * actually been measured (Hyakutake's ion tail was tracked, by Ulysses, considerably further); it
 * draws a tail that reaches most of the way to the anti-solar point, which is what an eighty-degree
 * tail looked like, and it stays a real length at every other date rather than a hundred au of
 * nothing.
 */
const MAX_TAIL_LENGTH_AU = 1

/** The speed of light in the units the geometry is in, astronomical units per day. */
const LIGHT_SPEED_AU_PER_DAY = 173.144632674

const scriptDir = path.dirname(fileURLToPath(import.meta.url))
const cacheDir = path.join(scriptDir, "data", "horizons")
const outPath = path.join(scriptDir, "..", "src", "engine", "astronomy", "cometCatalog.ts")

class CometCatalogBuilder {
  /** Horizons wants a range rather than an instant, so every element query asks for the day of
   * perihelion and the day after and reads the first row. */
  private async elementsText(apparition: ApparitionInput): Promise<string> {
    const cached = path.join(cacheDir, `${apparition.id}.elements.txt`)
    if (existsSync(cached)) return readFileSync(cached, "utf8")
    const start = apparition.perihelionQueryDate
    const stop = new Date(new Date(`${start}T00:00:00Z`).getTime() + 86_400_000).toISOString().slice(0, 10)
    const url = new URL("https://ssd.jpl.nasa.gov/api/horizons.api")
    for (const [key, value] of Object.entries({
      format: "text",
      // The trailing CAP asks for the apparition closest to the requested date, which is what makes
      // two entries for 1P/Halley resolve to two different orbits.
      COMMAND: `'DES=${apparition.query};CAP;'`,
      OBJ_DATA: "NO",
      MAKE_EPHEM: "YES",
      EPHEM_TYPE: "ELEMENTS",
      CENTER: "500@10",
      START_TIME: start,
      STOP_TIME: stop,
      STEP_SIZE: "1d",
      OUT_UNITS: "AU-D",
      REF_PLANE: "ECLIPTIC"
    })) {
      url.searchParams.set(key, value)
    }
    const response = await fetch(url)
    if (!response.ok) throw new Error(`Horizons refused ${apparition.id}: ${response.status}`)
    const text = await response.text()
    mkdirSync(cacheDir, { recursive: true })
    writeFileSync(cached, text)
    return text
  }

  /** Pulls the six elements out of the fixed-format block Horizons prints between $$SOE and $$EOE.
   * Deliberately strict: a missing field means the request resolved to something other than a
   * single comet (an ambiguous designation prints a list of fragments instead), and the right
   * answer to that is to stop, not to build a catalog entry out of nothing. */
  private parseElements(text: string, apparition: ApparitionInput): OrbitalElements {
    const start = text.indexOf("$$SOE")
    const end = text.indexOf("$$EOE")
    if (start < 0 || end < 0) throw new Error(`No ephemeris for ${apparition.id} — Horizons said:\n${text.slice(0, 1200)}`)
    const block = text.slice(start, end)
    const read = (name: string): number => {
      const match = new RegExp(`${name}\\s*=\\s*(-?[\\d.]+(?:E[+-]?\\d+)?)`).exec(block)
      if (!match) throw new Error(`${apparition.id}: no ${name} in the Horizons answer`)
      return Number(match[1])
    }
    return {
      eccentricity: read("EC"),
      perihelionAu: read("QR"),
      inclinationDeg: read("IN"),
      ascendingNodeDeg: read("OM"),
      argumentOfPerihelionDeg: read("W "),
      perihelionJd: read("Tp")
    }
  }

  /** The Julian day in dynamical time of a calendar date, through astronomy-engine's own delta-T
   * model — a minute and a bit in the twentieth century, which no comet in this catalog cares
   * about, but free to get right. */
  private julianDayOf(isoDate: string): number {
    return 2451545 + Astronomy.MakeTime(new Date(`${isoDate}T00:00:00Z`)).tt
  }

  /** Where the Earth was, heliocentric ecliptic J2000, in the same frame the orbit propagates in. */
  private earthPositionAt(isoDate: string): Vector3 {
    const time = Astronomy.MakeTime(new Date(`${isoDate}T00:00:00Z`))
    const equatorial = Astronomy.HelioVector(Astronomy.Body.Earth, time)
    return Astronomy.RotateVector(Astronomy.Rotation_EQJ_ECL(), equatorial)
  }

  /**
   * The light curve that reproduces what was recorded — the absolute magnitude, and the exponent
   * when there is a second observation to pin it with.
   *
   * Inverting `m = H + 5·log(delta) + 2.5·n·log(r)` at the geometry of the night each magnitude was
   * recorded on. Neither number that comes out is a datum, and neither is presented as one: they
   * are what the model has to be set to for it to agree with what people actually wrote down.
   */
  private lightCurveOf(orbit: KeplerOrbit, apparition: ApparitionInput): { absoluteMagnitude: number; activityExponent: number } {
    const peak = this.geometryAt(orbit, apparition.peakOn)
    const activityExponent = this.activityExponentOf(orbit, apparition, peak)
    return {
      activityExponent,
      absoluteMagnitude:
        apparition.peakMagnitude -
        5 * Math.log10(peak.earthDistanceAu) -
        2.5 * activityExponent * Math.log10(peak.heliocentricDistanceAu)
    }
  }

  /** Two magnitudes on two nights are two equations; subtracting one from the other cancels the
   * absolute magnitude and leaves the exponent alone. Falls back to the conventional slope when
   * there is only one observation, or when the two happen to fall at the same distance from the Sun
   * and so say nothing about how the brightness varies with it. */
  private activityExponentOf(orbit: KeplerOrbit, apparition: ApparitionInput, peak: ReturnType<CometCatalogBuilder["geometryAt"]>): number {
    if (!apparition.alsoRecorded) return DEFAULT_ACTIVITY_EXPONENT
    const other = this.geometryAt(orbit, apparition.alsoRecorded.on)
    const sunRatio = Math.log10(other.heliocentricDistanceAu / peak.heliocentricDistanceAu)
    if (Math.abs(sunRatio) < 1e-6) return DEFAULT_ACTIVITY_EXPONENT
    const brightnessDrop =
      apparition.alsoRecorded.magnitude - apparition.peakMagnitude - 5 * Math.log10(other.earthDistanceAu / peak.earthDistanceAu)
    return brightnessDrop / (2.5 * sunRatio)
  }

  /** Where the comet was seen to be, and how far away — through the same light-time correction the
   * runtime applies (see Comets.apparentPositionOf). It has to be the same one: the absolute
   * magnitude derived here is the number that makes the RENDERED magnitude match the recorded peak,
   * and for a sungrazer eight light-minutes is a tenth of a magnitude. */
  private geometryAt(orbit: KeplerOrbit, isoDate: string) {
    const julianDay = this.julianDayOf(isoDate)
    const earth = this.earthPositionAt(isoDate)
    let comet = orbit.positionAt(julianDay)
    for (let i = 0; i < 2; i++) {
      const lightDays = Math.hypot(comet.x - earth.x, comet.y - earth.y, comet.z - earth.z) / LIGHT_SPEED_AU_PER_DAY
      comet = orbit.positionAt(julianDay - lightDays)
    }
    return {
      heliocentricDistanceAu: Math.hypot(comet.x, comet.y, comet.z),
      earthDistanceAu: Math.hypot(comet.x - earth.x, comet.y - earth.y, comet.z - earth.z),
      comet,
      earth
    }
  }

  /**
   * How long the tail was in space, given how long it looked from here.
   *
   * The stored figure is an ANGLE somebody measured, and an angle is not a length: the same tail
   * subtends eighty degrees when it lies across the line of sight and almost nothing when it points
   * at the observer. Converting once, here, means the renderer can project the real thing and let
   * the foreshortening fall out of the geometry instead of pretending the angle is a constant.
   *
   * Solved by bisection on the tail's physical length, since the apparent angle grows with it
   * monotonically and nothing about this needs to be quick.
   */
  private tailLengthAuOf(orbit: KeplerOrbit, apparition: ApparitionInput): number | undefined {
    if (apparition.tailLengthDeg === undefined) return undefined
    const { comet, earth, heliocentricDistanceAu } = this.geometryAt(orbit, apparition.peakOn)
    const angleFor = (lengthAu: number): number => {
      const stretch = 1 + lengthAu / heliocentricDistanceAu
      const head = { x: comet.x - earth.x, y: comet.y - earth.y, z: comet.z - earth.z }
      const tip = { x: comet.x * stretch - earth.x, y: comet.y * stretch - earth.y, z: comet.z * stretch - earth.z }
      const dot = head.x * tip.x + head.y * tip.y + head.z * tip.z
      const cosine = dot / (Math.hypot(head.x, head.y, head.z) * Math.hypot(tip.x, tip.y, tip.z))
      return (Math.acos(Math.min(1, Math.max(-1, cosine))) * 180) / Math.PI
    }
    if (angleFor(MAX_TAIL_LENGTH_AU) < apparition.tailLengthDeg) {
      console.warn(
        `  ${apparition.id}: a straight anti-solar tail cannot subtend ${apparition.tailLengthDeg}° from where the Earth stood on ` +
          `${apparition.peakOn} — the most that geometry allows is ${angleFor(MAX_TAIL_LENGTH_AU).toFixed(1)}° at the ` +
          `${MAX_TAIL_LENGTH_AU} au ceiling, which is what is stored.`
      )
      return MAX_TAIL_LENGTH_AU
    }
    let low = 0
    let high = MAX_TAIL_LENGTH_AU
    for (let i = 0; i < 200; i++) {
      const middle = (low + high) / 2
      if (angleFor(middle) < apparition.tailLengthDeg) low = middle
      else high = middle
    }
    return (low + high) / 2
  }

  private round(value: number, decimals: number): number {
    return Number(value.toFixed(decimals))
  }

  private quote(text: string): string {
    return JSON.stringify(text)
  }

  async build(): Promise<void> {
    const entries: string[] = []
    for (const apparition of APPARITIONS) {
      const elements = this.parseElements(await this.elementsText(apparition), apparition)
      const orbit = new KeplerOrbit(elements)
      const { absoluteMagnitude, activityExponent } = this.lightCurveOf(orbit, apparition)
      const peak = this.geometryAt(orbit, apparition.peakOn)
      console.log(
        `${apparition.id.padEnd(30)} q=${elements.perihelionAu.toFixed(4)} e=${elements.eccentricity.toFixed(6)} ` +
          `peak r=${peak.heliocentricDistanceAu.toFixed(3)} delta=${peak.earthDistanceAu.toFixed(3)} ` +
          `-> H=${absoluteMagnitude.toFixed(2)} n=${activityExponent.toFixed(2)}`
      )
      const tailLengthAu = this.tailLengthAuOf(orbit, apparition)
      entries.push(
        `  {\n` +
          `    id: ${this.quote(apparition.id)},\n` +
          `    designation: ${this.quote(apparition.designation)},\n` +
          `    name: { en: ${this.quote(apparition.name.en)}, fr: ${this.quote(apparition.name.fr)} },\n` +
          `    orbit: {\n` +
          `      eccentricity: ${elements.eccentricity},\n` +
          `      perihelionAu: ${elements.perihelionAu},\n` +
          `      inclinationDeg: ${elements.inclinationDeg},\n` +
          `      ascendingNodeDeg: ${elements.ascendingNodeDeg},\n` +
          `      argumentOfPerihelionDeg: ${elements.argumentOfPerihelionDeg},\n` +
          `      perihelionJd: ${elements.perihelionJd}\n` +
          `    },\n` +
          `    peakMagnitude: ${apparition.peakMagnitude},\n` +
          `    peakOn: ${this.quote(apparition.peakOn)},\n` +
          (apparition.alsoRecorded === undefined
            ? ""
            : `    alsoRecordedMagnitude: ${apparition.alsoRecorded.magnitude},\n    alsoRecordedOn: ${this.quote(apparition.alsoRecorded.on)},\n`) +
          `    absoluteMagnitude: ${this.round(absoluteMagnitude, 2)},\n` +
          `    activityExponent: ${this.round(activityExponent, 3)},\n` +
          (apparition.tailLengthDeg === undefined
            ? ""
            : `    tailLengthDeg: ${apparition.tailLengthDeg},\n    tailLengthAu: ${this.round(tailLengthAu!, 4)},\n`) +
          (apparition.note === undefined ? "" : `    note: ${this.quote(apparition.note)}\n`) +
          `  }`
      )
    }
    writeFileSync(outPath, this.render(entries))
    console.log(`\nWrote ${APPARITIONS.length} apparitions to ${outPath}`)
  }

  private render(entries: string[]): string {
    return `/**
 * The naked-eye comets, one entry per apparition.
 *
 * GENERATED by scripts/build-comet-catalog.ts — edit that script, not this file. The orbits come
 * from JPL Horizons, asked for osculating elements at each apparition's own perihelion; the peak
 * magnitudes are recorded observations entered by hand there, and every other photometric number
 * here is derived from them. See the script's own doc comment for why the two are kept apart.
 */
import type { OrbitalElements } from "./Orbit.js"

export interface CometApparition {
  /** Stable id, what a case file would name. */
  id: string
  /** The IAU designation. Two apparitions of the same comet share it and differ by \`id\`. */
  designation: string
  /** The comet's name in each language a page can be read in — the same "translate the label, keep
   * the identifier" rule the meteor showers and the decor kinds follow. Most comets are named after
   * whoever found them and read the same in both; the descriptive ones do not. */
  name: { en: string; fr: string }
  orbit: OrbitalElements
  /** The brightest visual magnitude on record for this apparition, and the date it was recorded.
   * An OBSERVATION — everything else about the brightness is worked out from it. */
  peakMagnitude: number
  peakOn: string
  /** A second recorded magnitude and its date, where one was needed to pin the activity exponent
   * down — see the build script. Absent for every apparition whose exponent is the assumed one. */
  alsoRecordedMagnitude?: number
  alsoRecordedOn?: string
  /** What the light curve has to be anchored at, and how steeply it has to fall, to reproduce the
   * recorded magnitudes above. Model parameters, not measurements: see Comets.magnitudeAt. */
  absoluteMagnitude: number
  activityExponent: number
  /** The greatest tail length on record, in degrees of sky, and the physical length in astronomical
   * units that subtends it from where the Earth stood that night. Both absent when no figure is on
   * record, and an apparition without one is drawn with no tail at all rather than a guessed one. */
  tailLengthDeg?: number
  tailLengthAu?: number
  /** What is worth knowing about this apparition, in the terms a case file would want. */
  note?: string
}

export const BRIGHT_COMETS: CometApparition[] = [
${entries.join(",\n")}
]
`
  }
}

await new CometCatalogBuilder().build()
