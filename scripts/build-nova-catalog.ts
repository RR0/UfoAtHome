/**
 * One-off build step (not part of `build`/`prepublishOnly`) that turns the novae and supernovae
 * below into `src/engine/astronomy/novaCatalog.ts`.
 *
 * Run with: npm run build:novae  (plain node, which strips the types itself — tsx cannot run here)
 *
 * A nova is the easy half of a comet: it does not move. Where it stood is a remnant or a quiescent
 * star that SIMBAD places to a fraction of an arcsecond. Everything that matters is WHEN it was how
 * bright, and that is a LIGHT CURVE — a list of dated magnitudes, interpolated between, and nothing
 * outside them. Not a formula: the t2/t3 decline laws describe barely a third of real novae, and DQ
 * Herculis, which lost ten magnitudes in a few weeks when dust condensed around it and then came
 * back, would be drawn at naked-eye brightness for a year by any of them.
 *
 * FOUR KINDS OF CURVE, from the best-observed to the least, and each entry says which it has:
 *
 * - MEASURED (every nova up to 2006). The AAVSO's own observations, binned by Strope, Schaefer &
 *   Henden, "Catalog of 93 Nova Light Curves: Classification and Properties", AJ 140, 34 (2010) —
 *   VizieR J/AJ/140/34, tables 1 and 2. Every nova there that reached magnitude 5 is taken.
 *
 * - RECONSTRUCTED from the observers' own words (SN 1572, SN 1604). Tycho, Kepler, Fabricius, Maestlin
 *   and the Korean court astronomers compared the new star with planets and stars of known brightness,
 *   and Ruiz-Lapuente turned those comparisons into V magnitudes with error bars: "Tycho Brahe's
 *   Supernova: Light from Centuries Past", ApJ 612, 357 (2004); "The Light Curve and Distance of the
 *   Kepler Supernova", ApJ 842, 112 (2017). Half a magnitude either way is ordinary.
 *
 * - ANCHORED on what was recorded and nothing else (SN 1006, 1054, 1181; V339 Del; V1280 Sco). A peak,
 *   the day daylight stopped showing it, the day it was last seen: a few points with straight lines
 *   between. The chronicles do not say more, so neither does the curve.
 *
 * - BORROWED from a sibling (SN 1006's decline; RS Oph 2021; T CrB 1866). A recurrent nova repeats its
 *   own light curve from one eruption to the next closely enough that Schaefer's catalogue treats the
 *   eruptions as one, so the measured one is shifted onto the recorded peak of the other. SN 1006 was a
 *   Type Ia like SN 1572, and has only a peak on record: Tycho's curve gives it a decline.
 *
 * - READ OUT OF A PUBLISHED FIGURE (V1369 Cen, 2013). Its AAVSO curve sits behind a browser challenge a
 *   build script must not pass, and no table of it is published. Izzo's review (arXiv:1704.07214,
 *   figure 1) plots the AAVSO V magnitudes binned by day, and the figure is vector: each marker is a
 *   circle whose centre, against the plot's own tick marks, gives the day and the magnitude exactly
 *   as drawn. Only what the figure SHOWS is kept, days 0 to 55: the PDF carries markers past the
 *   plot's clipping rectangle too, which nobody reviewing that figure ever saw.
 *
 * WHAT IS NOT HERE, and why:
 * - T CrB: expected since 2024, and not erupted as of September 2026. When it does, it is one entry
 *   borrowing its 1946 curve.
 * - Anything before 1006. SN 185 and SN 393 are in the chronicles; their dates and brightness are too
 *   loose to put a point in a particular night's sky.
 *
 * INPUTS, in scripts/data/novae/ — versioned, unlike the rest of scripts/data/, so that the catalog
 * can be regenerated exactly if a source moves or disappears (see the README there):
 * - strope2010-table1.dat, strope2010-table2.dat: https://cdsarc.cds.unistra.fr/ftp/J/AJ/140/34/
 * - v1369cen-izzo2017-fig1.json: [days from 2 December 2013, V] read from that figure's vector markers
 *   (source at https://arxiv.org/src/1704.07214, file lightcurve_all_epochs.pdf).
 * - sn1987a-V.csv: the Open Supernova Catalog's V photometry,
 *   https://api.astrocats.space/SN1987A/photometry/time+magnitude+band+source?band=V&format=csv
 * `curl -k` fetches all three (Node's own fetch does not go through the proxy on this machine).
 */
import { readFileSync, writeFileSync } from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

type Kind = "nova" | "supernova"
type Calendar = "gregorian" | "julian"

/** A day, as the record gives it, with the calendar the record was kept in. */
interface RecordedDay {
  on: string
  calendar?: Calendar
}

interface RecordedMagnitude extends RecordedDay {
  magnitude: number
}

interface Coordinates {
  /** J2000, as SIMBAD gives them: "hh mm ss.s" and "±dd mm ss". */
  ra: string
  dec: string
}

interface OutburstInput extends Coordinates {
  id: string
  kind: Kind
  designation: string
  /** WITHOUT a leading article, the comets' rule: the readout supplies it. */
  name: { en: string; fr: string }
  curve: CurveInput
  /** Where the numbers come from, short enough to show a reader. */
  source: string
  note?: string
}

type CurveInput =
  | { from: "strope"; nova: string }
  | { from: "recorded"; points: RecordedMagnitude[] }
  | {
      from: "figure"
      /** [days since dayZero, magnitude] pairs, in scripts/data/novae/. */
      file: string
      /** The instant the figure's time axis counts from. */
      dayZero: string
      /** The last day the plot actually shows; markers beyond its clipping rectangle are dropped. */
      lastShownDay: number
    }
  | {
      from: "borrowed"
      /** The id of the entry whose curve is shifted. */
      sibling: string
      /** The recorded peak of THIS outburst; the sibling's curve is moved to pass through it. */
      peak: RecordedMagnitude
      /** Nothing is drawn before this day: a borrowed curve may rise earlier than anybody looked. */
      firstSeen?: RecordedDay
      /** Recorded points of this outburst that come before the borrowed part begins. */
      before?: RecordedMagnitude[]
    }

/** The novae in Strope et al. that reached magnitude 5, with the constellation they are named by. */
const STROPE_NOVAE: { nova: string; year: number; ra: string; dec: string; constellation: Constellation }[] = [
  { nova: "T Aur", year: 1891, ra: "05 31 59.12", dec: "+30 26 45.0", constellation: "Aur" },
  { nova: "GK Per", year: 1901, ra: "03 31 12.01", dec: "+43 54 15.5", constellation: "Per" },
  { nova: "DN Gem", year: 1912, ra: "06 54 54.35", dec: "+32 08 27.9", constellation: "Gem" },
  { nova: "V603 Aql", year: 1918, ra: "18 48 54.64", dec: "+00 35 02.9", constellation: "Aql" },
  { nova: "V476 Cyg", year: 1920, ra: "19 58 24.51", dec: "+53 37 06.9", constellation: "Cyg" },
  { nova: "RR Pic", year: 1925, ra: "06 35 36.06", dec: "-62 38 24.3", constellation: "Pic" },
  { nova: "DQ Her", year: 1934, ra: "18 07 30.25", dec: "+45 51 32.6", constellation: "Her" },
  { nova: "CP Lac", year: 1936, ra: "22 15 41.10", dec: "+55 37 01.3", constellation: "Lac" },
  { nova: "CP Pup", year: 1942, ra: "08 11 46.06", dec: "-35 21 05.0", constellation: "Pup" },
  { nova: "T CrB", year: 1946, ra: "15 59 30.16", dec: "+25 55 12.6", constellation: "CrB" },
  { nova: "V446 Her", year: 1960, ra: "18 57 21.59", dec: "+13 14 29.3", constellation: "Her" },
  { nova: "V533 Her", year: 1963, ra: "18 14 20.48", dec: "+41 51 22.1", constellation: "Her" },
  { nova: "HR Del", year: 1967, ra: "20 42 20.35", dec: "+19 09 39.3", constellation: "Del" },
  { nova: "LV Vul", year: 1968, ra: "19 48 00.44", dec: "+27 10 17.4", constellation: "Vul" },
  { nova: "FH Ser", year: 1970, ra: "18 30 47.04", dec: "+02 36 52.0", constellation: "Ser" },
  { nova: "V1500 Cyg", year: 1975, ra: "21 11 36.58", dec: "+48 09 02.0", constellation: "Cyg" },
  { nova: "V842 Cen", year: 1986, ra: "14 35 52.57", dec: "-57 37 35.4", constellation: "Cen" },
  { nova: "V1974 Cyg", year: 1992, ra: "20 30 31.65", dec: "+52 37 50.8", constellation: "Cyg" },
  { nova: "V382 Vel", year: 1999, ra: "10 44 48.40", dec: "-52 25 31.2", constellation: "Vel" },
  { nova: "V1494 Aql", year: 1999, ra: "19 23 05.36", dec: "+04 57 19.8", constellation: "Aql" },
  { nova: "V4743 Sgr", year: 2002, ra: "19 01 09.34", dec: "-22 00 06.0", constellation: "Sgr" },
  { nova: "RS Oph", year: 2006, ra: "17 50 13.16", dec: "-06 42 28.5", constellation: "Oph" }
]

type Constellation = "Aql" | "Aur" | "Cen" | "CrB" | "Cyg" | "Del" | "Gem" | "Her" | "Lac" | "Oph" | "Per" | "Pic" | "Pup" | "Sco" | "Ser" | "Sgr" | "Vel" | "Vul"

/** How a nova is named by its constellation: the Latin genitive in English ("Nova Aquilae 1918"),
 * and in French the constellation with its own article ("nova de l'Aigle 1918"). */
const CONSTELLATIONS: Record<Constellation, { en: string; fr: string }> = {
  Aql: { en: "Aquilae", fr: "de l'Aigle" },
  Aur: { en: "Aurigae", fr: "du Cocher" },
  Cen: { en: "Centauri", fr: "du Centaure" },
  CrB: { en: "Coronae Borealis", fr: "de la Couronne boréale" },
  Cyg: { en: "Cygni", fr: "du Cygne" },
  Del: { en: "Delphini", fr: "du Dauphin" },
  Gem: { en: "Geminorum", fr: "des Gémeaux" },
  Her: { en: "Herculis", fr: "d'Hercule" },
  Lac: { en: "Lacertae", fr: "du Lézard" },
  Oph: { en: "Ophiuchi", fr: "d'Ophiuchus" },
  Per: { en: "Persei", fr: "de Persée" },
  Pic: { en: "Pictoris", fr: "du Peintre" },
  Pup: { en: "Puppis", fr: "de la Poupe" },
  Sco: { en: "Scorpii", fr: "du Scorpion" },
  Ser: { en: "Serpentis", fr: "du Serpent" },
  Sgr: { en: "Sagittarii", fr: "du Sagittaire" },
  Vel: { en: "Velorum", fr: "des Voiles" },
  Vul: { en: "Vulpeculae", fr: "du Petit Renard" }
}

const NOVA_NOTES: Record<string, string> = {
  "GK Per": "Discovered on 21 February 1901 by Thomas Anderson in Edinburgh, and the brightest nova of the century until V603 Aql.",
  "V603 Aql": "The brightest nova of the modern era, at magnitude -0.5 on 9-10 June 1918: as bright as Vega, in a summer evening sky, in wartime.",
  "RR Pic": "A slow nova, and a southern one: more than two months within two magnitudes of its peak.",
  "DQ Her": "Lost about ten magnitudes in a few weeks from April 1935, when dust condensed around it, then came back to naked-eye brightness.",
  "CP Pup": "One of the fastest bright novae: two magnitudes gone in four days.",
  "T CrB": "A recurrent nova. It erupted in 1866 and in 1946, and a third eruption was expected from 2024 on.",
  "HR Del": "An exceptionally slow nova: rose over months and stayed near magnitude 4 to 5 for most of 1967 and 1968.",
  "V1500 Cyg": "One of the fastest novae on record: discovered on 29 August 1975, at its peak of magnitude 1.9 within two days, and two magnitudes down again two days later.",
  "RS Oph": "A recurrent nova, erupting every twenty years or so (1898, 1907, 1933, 1945, 1958, 1967, 1985, 2006, 2021)."
}

const OUTBURSTS: OutburstInput[] = [
  {
    id: "sn-1006",
    kind: "supernova",
    designation: "SN 1006",
    name: { en: "Supernova of 1006", fr: "supernova de 1006" },
    ra: "15 02 22.1",
    dec: "-42 05 49",
    // Peak from Winkler, Gupta & Long (2003), from the remnant's distance and the chronicles. The
    // decline is Tycho's supernova's, the same kind of explosion, since nothing dated survives past
    // the first weeks except that it was followed, on and off, for about three years.
    curve: { from: "borrowed", sibling: "sn-1572", peak: { on: "1006-05-01", calendar: "julian", magnitude: -7.5 } },
    source: "Winkler, Gupta & Long 2003 (peak); decline borrowed from SN 1572",
    note: "The brightest stellar event in recorded history, seen in daylight, low in the southern sky from Europe and the Near East. The decline is modelled, not recorded, and falls below the naked eye after about two years where the chronicles speak of three."
  },
  {
    id: "sn-1054",
    kind: "supernova",
    designation: "SN 1054",
    name: { en: "Supernova of 1054", fr: "supernova de 1054" },
    ra: "05 34 31.8",
    dec: "+22 01 03",
    curve: {
      from: "recorded",
      points: [
        // First recorded at dawn on 4 July 1054, "visible by day like Venus".
        { on: "1054-07-04", calendar: "julian", magnitude: -6 },
        // Seen in daylight for 23 days: at the end of it, no brighter than a point a daylit sky lets
        // through — the same -4 this scene's own visibility limit uses by day.
        { on: "1054-07-27", calendar: "julian", magnitude: -4 },
        // Last seen by night on 6 April 1056, 642 days after it was first recorded.
        { on: "1056-04-06", calendar: "julian", magnitude: 6 }
      ]
    },
    source: "Chinese chronicles (Song huiyao), via Stephenson & Green 2002",
    note: "The explosion that left the Crab Nebula. Its magnitude is an estimate; the two durations are recorded."
  },
  {
    id: "sn-1181",
    kind: "supernova",
    designation: "SN 1181",
    name: { en: "Supernova of 1181", fr: "supernova de 1181" },
    // Pa 30, now the accepted remnant (Ritter et al. 2021), rather than 3C 58.
    ra: "00 53 11.21",
    dec: "+67 30 02.4",
    curve: {
      from: "recorded",
      points: [
        { on: "1181-08-06", calendar: "julian", magnitude: 0 },
        // Followed for 185 days in China and Japan.
        { on: "1182-02-07", calendar: "julian", magnitude: 6 }
      ]
    },
    source: "Chinese and Japanese chronicles, via Stephenson & Green 2002",
    note: "Circumpolar from Europe and China, so never set. Its peak magnitude is uncertain by at least a magnitude."
  },
  {
    id: "sn-1572",
    kind: "supernova",
    designation: "SN 1572",
    name: { en: "Tycho's Supernova", fr: "supernova de Tycho" },
    ra: "00 25 21.5",
    dec: "+64 08 27",
    curve: {
      from: "recorded",
      // Ruiz-Lapuente 2004, table 1: the adopted magnitude of each dated comparison. Julian calendar.
      // Not seen on 2 November 1572, so the curve starts with the first record.
      points: [
        { on: "1572-11-11", calendar: "julian", magnitude: -3.0 },
        { on: "1572-11-16", calendar: "julian", magnitude: -4.0 },
        { on: "1572-12-15", calendar: "julian", magnitude: -2.4 },
        { on: "1573-01-15", calendar: "julian", magnitude: -1.4 },
        { on: "1573-03-02", calendar: "julian", magnitude: 0.3 },
        { on: "1573-05-01", calendar: "julian", magnitude: 1.6 },
        { on: "1573-08-01", calendar: "julian", magnitude: 2.5 },
        { on: "1573-11-01", calendar: "julian", magnitude: 4.0 },
        { on: "1573-11-15", calendar: "julian", magnitude: 4.2 },
        { on: "1574-01-01", calendar: "julian", magnitude: 4.7 },
        { on: "1574-02-15", calendar: "julian", magnitude: 5.3 },
        // Invisible by mid-March 1574.
        { on: "1574-03-15", calendar: "julian", magnitude: 6.0 }
      ]
    },
    source: "Tycho Brahe and contemporaries, reduced by Ruiz-Lapuente 2004",
    note: "Circumpolar from northern Europe. Tycho showed it had no parallax, so it was not in the air: a new star, beyond the Moon."
  },
  {
    id: "sn-1604",
    kind: "supernova",
    designation: "SN 1604",
    name: { en: "Kepler's Supernova", fr: "supernova de Kepler" },
    ra: "17 30 40.51",
    dec: "-21 29 14.4",
    curve: {
      from: "recorded",
      // Ruiz-Lapuente 2017, tables 2 (Korean) and 3 (European), Gregorian calendar; merged by
      // mergeNearby below. Not seen on 8 October 1604.
      points: [
        { on: "1604-10-09", magnitude: 0.9 },
        { on: "1604-10-10", magnitude: 0.5 },
        { on: "1604-10-11", magnitude: -0.7 },
        { on: "1604-10-12", magnitude: -1.5 },
        { on: "1604-10-14", magnitude: -1.1 },
        { on: "1604-10-15", magnitude: -2.2 },
        { on: "1604-10-16", magnitude: -1.45 },
        { on: "1604-10-17", magnitude: -2.6 },
        { on: "1604-10-18", magnitude: -1.8 },
        { on: "1604-10-19", magnitude: -2.55 },
        { on: "1604-10-28", magnitude: -2.95 },
        { on: "1604-11-05", magnitude: -2.95 },
        { on: "1604-11-10", magnitude: -1.95 },
        { on: "1604-11-14", magnitude: -1.7 },
        { on: "1604-11-16", magnitude: -1.35 },
        { on: "1605-01-03", magnitude: 0.9 },
        { on: "1605-01-13", magnitude: 0.0 },
        { on: "1605-01-14", magnitude: 0.9 },
        { on: "1605-01-20", magnitude: 0.8 },
        { on: "1605-01-21", magnitude: 1.2 },
        { on: "1605-01-31", magnitude: 1.2 },
        { on: "1605-02-04", magnitude: 1.55 },
        { on: "1605-02-19", magnitude: 1.95 },
        { on: "1605-02-23", magnitude: 2.3 },
        { on: "1605-03-28", magnitude: 2.25 },
        { on: "1605-04-12", magnitude: 2.25 },
        { on: "1605-04-21", magnitude: 2.4 },
        { on: "1605-04-24", magnitude: 2.9 },
        { on: "1605-08-13", magnitude: 4.45 },
        { on: "1605-08-29", magnitude: 4.45 },
        { on: "1605-09-13", magnitude: 4.95 },
        { on: "1605-10-08", magnitude: 4.7 }
      ]
    },
    source: "Kepler, Fabricius, Maestlin and the Korean court astronomers, reduced by Ruiz-Lapuente 2017",
    note: "The last supernova in our Galaxy seen with the naked eye. It went behind the Sun from mid-November 1604 to January 1605, which is the gap in its record."
  },
  {
    id: "sn-1987a",
    kind: "supernova",
    designation: "SN 1987A",
    name: { en: "Supernova 1987A", fr: "supernova 1987A" },
    ra: "05 35 27.99",
    dec: "-69 16 11.1",
    curve: { from: "recorded", points: [] },
    source: "V photometry compiled by the Open Supernova Catalog (Sternberg catalogue, IAU circulars, CTIO)",
    note: "In the Large Magellanic Cloud, 160 000 light years away: the nearest supernova since Kepler's, and invisible north of about 20° N."
  },
  {
    id: "t-crb-1866",
    kind: "nova",
    designation: "T CrB",
    name: { en: "Nova Coronae Borealis 1866", fr: "nova de la Couronne boréale 1866" },
    ra: "15 59 30.16",
    dec: "+25 55 12.6",
    // Discovered by John Birmingham on 12 May 1866 at magnitude 2.
    curve: { from: "borrowed", sibling: "t-crb-1946", peak: { on: "1866-05-12", magnitude: 2.0 } },
    source: "Recorded peak (Birmingham); curve borrowed from its 1946 eruption",
    note: "The first eruption of the recurrent nova T CrB to be seen. The decline is its 1946 one."
  },
  {
    id: "rs-oph-2021",
    kind: "nova",
    designation: "RS Oph",
    name: { en: "Nova Ophiuchi 2021", fr: "nova d'Ophiuchus 2021" },
    ra: "17 50 13.16",
    dec: "-06 42 28.5",
    curve: {
      from: "borrowed",
      sibling: "rs-oph-2006",
      peak: { on: "2021-08-09", magnitude: 4.6 },
      firstSeen: { on: "2021-08-08" },
      before: [{ on: "2021-08-08", magnitude: 5.0 }]
    },
    source: "Recorded discovery and peak (8 and 9 August 2021); curve borrowed from its 2006 eruption",
    note: "RS Oph's latest eruption, discovered on 8 August 2021. The decline is its 2006 one."
  },
  {
    id: "v1280-sco-2007",
    kind: "nova",
    designation: "V1280 Sco",
    name: { en: "Nova Scorpii 2007", fr: "nova du Scorpion 2007" },
    ra: "16 57 41.22",
    dec: "-32 20 35.7",
    curve: {
      from: "recorded",
      points: [
        { on: "2007-02-04", magnitude: 9.7 },
        { on: "2007-02-17", magnitude: 3.8 },
        // t2 of about 21 days, then a dust dip to magnitude 15 about three months after the peak.
        { on: "2007-03-10", magnitude: 5.8 },
        { on: "2007-05-18", magnitude: 15 }
      ]
    },
    source: "AAVSO (discovery, peak, dust minimum); t2 from Das et al. 2008",
    note: "Faded from sight quickly when dust formed around it, three weeks after its peak."
  },
  {
    id: "v1369-cen-2013",
    kind: "nova",
    designation: "V1369 Cen",
    name: { en: "Nova Centauri 2013", fr: "nova du Centaure 2013" },
    ra: "13 54 45.35",
    dec: "-59 09 04.1",
    curve: { from: "figure", file: "v1369cen-izzo2017-fig1.json", dayZero: "2013-12-02T00:00:00Z", lastShownDay: 55 },
    source: "AAVSO, binned by day, as plotted by Izzo 2017 (arXiv:1704.07214, figure 1)",
    note: "Discovered on 2 December 2013 by John Seach at magnitude 5.5, it flared several times, reaching about 3.3 around 14 December: the brightest nova of the century so far, and a southern one."
  },
  {
    id: "v339-del-2013",
    kind: "nova",
    designation: "V339 Del",
    name: { en: "Nova Delphini 2013", fr: "nova du Dauphin 2013" },
    ra: "20 23 30.69",
    dec: "+20 46 03.8",
    curve: {
      from: "recorded",
      // Peak visual magnitude 4.4 at JD 2456521.4, t2 about 11 days and t3 about 20 (Gehrz et al. 2015,
      // ApJ 812, 132, from Munari et al.'s photometry).
      points: [
        { on: "2013-08-16T21:36:00Z", magnitude: 4.4 },
        { on: "2013-08-27T21:36:00Z", magnitude: 6.4 },
        { on: "2013-09-05T21:36:00Z", magnitude: 7.4 }
      ]
    },
    source: "Gehrz et al. 2015 (peak, t2, t3)",
    note: "High in the summer evening sky of the northern hemisphere, and widely photographed."
  }
]

/** The faintest a curve is kept to. An instrument's own limit reaches past the naked eye's 6.5, and
 * the star catalogue stops at 9; a nova a little fainter than both is still worth a point for the
 * long exposures. */
const FAINTEST_KEPT = 11

/** How far a thinned curve may stray from the binned one, in magnitudes. The AAVSO bins themselves
 * scatter by more than this from day to day. */
const THINNING_TOLERANCE_MAG = 0.15

/** Curve points closer together than this in time are averaged — two observers a day apart
 * comparing the same star to different references are one estimate with a wider error, not a
 * one-day flicker of a magnitude. */
const MERGE_WITHIN_DAYS = 2.5

class NovaCatalogBuilder {
  private readonly dataDirectory: string
  private readonly curves = new Map<string, [number, number][]>()

  constructor(dataDirectory: string) {
    this.dataDirectory = dataDirectory
  }

  build(): string {
    const entries = [...this.stropeInputs(), ...OUTBURSTS]
    // Borrowed curves need their siblings resolved first.
    const ordered = [...entries.filter(entry => entry.curve.from !== "borrowed"), ...entries.filter(entry => entry.curve.from === "borrowed")]
    const built = ordered.map(entry => this.entryOf(entry))
    built.sort((a, b) => a.startJd - b.startJd)
    return this.render(built)
  }

  private stropeInputs(): OutburstInput[] {
    return STROPE_NOVAE.map(({ nova, year, ra, dec, constellation }) => ({
      id: `${nova.toLowerCase().replace(/\s+/g, "-")}-${year}`,
      kind: "nova" as const,
      designation: nova,
      name: { en: `Nova ${CONSTELLATIONS[constellation].en} ${year}`, fr: `nova ${CONSTELLATIONS[constellation].fr} ${year}` },
      ra,
      dec,
      curve: { from: "strope" as const, nova },
      source: "AAVSO, binned by Strope, Schaefer & Henden 2010",
      note: NOVA_NOTES[nova]
    }))
  }

  private entryOf(input: OutburstInput) {
    const absolute = this.absoluteCurveOf(input)
    this.curves.set(input.id, absolute)
    const startJd = absolute[0][0]
    const peak = absolute.reduce((best, point) => (point[1] < best[1] ? point : best))
    return {
      id: input.id,
      kind: input.kind,
      designation: input.designation,
      name: input.name,
      raHours: this.round(this.hoursOf(input.ra), 5),
      decDeg: this.round(this.degreesOf(input.dec), 5),
      peakMagnitude: this.round(peak[1], 2),
      peakJd: this.round(peak[0], 2),
      startJd: this.round(startJd, 2),
      lightCurve: absolute.map(([jd, magnitude]) => [this.round(jd - startJd, 2), this.round(magnitude, 2)] as [number, number]),
      source: input.source,
      note: input.note
    }
  }

  /** The curve as [Julian day, magnitude], time-ordered, thinned. */
  private absoluteCurveOf(input: OutburstInput): [number, number][] {
    const curve = input.curve
    switch (curve.from) {
      case "strope":
        return this.thinned(this.stropeCurve(curve.nova))
      case "recorded":
        if (input.id === "sn-1987a") return this.thinned(this.sn1987aCurve())
        return this.mergeNearby(curve.points.map(point => [this.julianDayOf(point), point.magnitude] as [number, number]).sort((a, b) => a[0] - b[0]))
      case "figure": {
        const dayZero = this.julianDayOf({ on: curve.dayZero })
        const points = JSON.parse(readFileSync(path.join(this.dataDirectory, curve.file), "utf8")) as [number, number][]
        return this.thinned(points
          .filter(([days]) => days <= curve.lastShownDay)
          .map(([days, magnitude]) => [dayZero + days, magnitude] as [number, number])
          .sort((a, b) => a[0] - b[0]))
      }
      case "borrowed": {
        const sibling = this.curves.get(curve.sibling)
        if (!sibling) throw new Error(`${input.id} borrows from ${curve.sibling}, which is not built yet`)
        const siblingPeak = sibling.reduce((best, point) => (point[1] < best[1] ? point : best))
        const shiftDays = this.julianDayOf(curve.peak) - siblingPeak[0]
        const shiftMag = curve.peak.magnitude - siblingPeak[1]
        const notBefore = curve.firstSeen ? this.julianDayOf(curve.firstSeen) : this.julianDayOf(curve.peak)
        const moved = sibling
          .map(([jd, magnitude]) => [jd + shiftDays, magnitude + shiftMag] as [number, number])
          .filter(([jd]) => jd >= notBefore - 1e-6)
        const before = (curve.before ?? []).map(point => [this.julianDayOf(point), point.magnitude] as [number, number])
        const joined = [...before, ...moved.filter(([jd]) => before.every(([beforeJd]) => jd > beforeJd + 0.25))].sort((a, b) => a[0] - b[0])
        return this.extendedTail(input, joined, sibling)
      }
    }
  }

  /**
   * A borrowed Type Ia curve that is still bright when the sibling's record stops is continued at the
   * slope of the sibling's own last recorded months, down to the eye's limit and a little past it.
   *
   * Only SN 1006 needs it: seven and a half magnitudes brighter than SN 1572 at its peak, it is still
   * at magnitude 2.5 where Tycho's star vanished. The Type Ia tail is powered by cobalt decaying at a
   * fixed rate, which is why its slope, and not its level, is the thing that carries over.
   */
  private extendedTail(input: OutburstInput, curve: [number, number][], sibling: [number, number][]): [number, number][] {
    if (input.kind !== "supernova") return curve
    const last = curve[curve.length - 1]
    if (last[1] >= 6.5) return curve
    const tailStart = sibling.find(([jd]) => jd >= sibling[sibling.length - 1][0] - 140) ?? sibling[0]
    const siblingLast = sibling[sibling.length - 1]
    const slope = (siblingLast[1] - tailStart[1]) / (siblingLast[0] - tailStart[0])
    const days = (7 - last[1]) / slope
    return [...curve, [last[0] + days, 7]]
  }

  private stropeCurve(nova: string): [number, number][] {
    const table1 = readFileSync(path.join(this.dataDirectory, "strope2010-table1.dat"), "latin1").split("\n")
    const row = table1.find(line => line.slice(0, 9).trim() === nova)
    if (!row) throw new Error(`${nova} is not in Strope table 1`)
    const peakJd = Number(row.slice(23, 30))
    const peakMagnitude = Number(row.slice(31, 35))
    const bins = readFileSync(path.join(this.dataDirectory, "strope2010-table2.dat"), "latin1")
      .split("\n")
      .filter(line => line.slice(0, 9).trim() === nova)
      .map(line => [Number(line.slice(10, 21)), Number(line.slice(31, 36))] as [number, number])
      .filter(([jd, magnitude]) => Number.isFinite(jd) && Number.isFinite(magnitude))
    // The tabulated peak is not always one of the bins (T CrB's first bin is a day and a half after
    // it, already a magnitude down): put it in where no bin is within half a day.
    if (!bins.some(([jd]) => Math.abs(jd - peakJd) < 0.5)) bins.push([peakJd, peakMagnitude])
    bins.sort((a, b) => a[0] - b[0])
    return this.untilFaint(bins)
  }

  /** The Open Supernova Catalog's V magnitudes, one median per day. */
  private sn1987aCurve(): [number, number][] {
    const rows = readFileSync(path.join(this.dataDirectory, "sn1987a-V.csv"), "utf8").split("\n").slice(1)
    const byDay = new Map<number, number[]>()
    for (const row of rows) {
      const [, time, magnitude] = row.split(",")
      if (!time || !magnitude) continue
      const jd = Number(time) + 2400000.5
      const day = Math.floor(jd)
      byDay.set(day, [...(byDay.get(day) ?? []), Number(magnitude)])
    }
    const daily = [...byDay.entries()]
      .map(([day, magnitudes]) => {
        const sorted = [...magnitudes].sort((a, b) => a - b)
        return [day + 0.5, sorted[Math.floor(sorted.length / 2)]] as [number, number]
      })
      .sort((a, b) => a[0] - b[0])
    return this.untilFaint(daily)
  }

  /** Everything up to the last point brighter than FAINTEST_KEPT — faint points in the middle (a dust
   * dip) stay, the long faint tail does not. */
  private untilFaint(curve: [number, number][]): [number, number][] {
    let last = curve.length - 1
    while (last > 0 && curve[last][1] > FAINTEST_KEPT) last--
    return curve.slice(0, last + 1)
  }

  private mergeNearby(curve: [number, number][]): [number, number][] {
    const merged: { jd: number; magnitudes: number[] }[] = []
    for (const [jd, magnitude] of curve) {
      const group = merged[merged.length - 1]
      if (group && jd - group.jd <= MERGE_WITHIN_DAYS) group.magnitudes.push(magnitude)
      else merged.push({ jd, magnitudes: [magnitude] })
    }
    return merged.map(({ jd, magnitudes }) => [jd, magnitudes.reduce((a, b) => a + b, 0) / magnitudes.length])
  }

  /** Ramer-Douglas-Peucker on the magnitude axis: keeps a point only where dropping it would move the
   * interpolated curve by more than the tolerance. */
  private thinned(curve: [number, number][]): [number, number][] {
    if (curve.length <= 2) return curve
    const keep = new Array<boolean>(curve.length).fill(false)
    keep[0] = keep[curve.length - 1] = true
    const stack: [number, number][] = [[0, curve.length - 1]]
    while (stack.length > 0) {
      const [first, last] = stack.pop()!
      let worst = -1
      let worstError = THINNING_TOLERANCE_MAG
      for (let i = first + 1; i < last; i++) {
        const fraction = (curve[i][0] - curve[first][0]) / (curve[last][0] - curve[first][0])
        const interpolated = curve[first][1] + fraction * (curve[last][1] - curve[first][1])
        const error = Math.abs(curve[i][1] - interpolated)
        if (error > worstError) {
          worst = i
          worstError = error
        }
      }
      if (worst >= 0) {
        keep[worst] = true
        stack.push([first, worst], [worst, last])
      }
    }
    return curve.filter((_, i) => keep[i])
  }

  /**
   * The Julian day at the given instant, in either calendar.
   *
   * The Julian calendar is not optional here: the chronicles of 1006, 1054 and 1181 and Tycho's own
   * records are dated in it, and it stood ten days behind the Gregorian by 1572. A date alone is taken
   * at noon UT, which is where a day-level record is least wrong either way.
   */
  private julianDayOf(day: RecordedDay): number {
    if (day.on.includes("T")) return new Date(day.on).getTime() / 86400000 + 2440587.5
    const [year, month, date] = day.on.split("-").map(Number)
    const y = month <= 2 ? year - 1 : year
    const m = month <= 2 ? month + 12 : month
    const century = Math.floor(y / 100)
    const gregorianCorrection = day.calendar === "julian" ? 0 : 2 - century + Math.floor(century / 4)
    return Math.floor(365.25 * (y + 4716)) + Math.floor(30.6001 * (m + 1)) + date + gregorianCorrection - 1524.5 + 0.5
  }

  private hoursOf(sexagesimal: string): number {
    const [h, m, s] = sexagesimal.trim().split(/\s+/).map(Number)
    return h + m / 60 + (s ?? 0) / 3600
  }

  private degreesOf(sexagesimal: string): number {
    const negative = sexagesimal.trim().startsWith("-")
    const [d, m, s] = sexagesimal.trim().replace(/^[+-]/, "").split(/\s+/).map(Number)
    const value = d + m / 60 + (s ?? 0) / 3600
    return negative ? -value : value
  }

  private round(value: number, digits: number): number {
    const factor = 10 ** digits
    return Math.round(value * factor) / factor
  }

  private render(entries: ReturnType<NovaCatalogBuilder["entryOf"]>[]): string {
    const body = entries
      .map(entry => {
        const lines = [
          `    id: ${JSON.stringify(entry.id)},`,
          `    kind: ${JSON.stringify(entry.kind)},`,
          `    designation: ${JSON.stringify(entry.designation)},`,
          `    name: { en: ${JSON.stringify(entry.name.en)}, fr: ${JSON.stringify(entry.name.fr)} },`,
          `    raHours: ${entry.raHours},`,
          `    decDeg: ${entry.decDeg},`,
          `    peakMagnitude: ${entry.peakMagnitude},`,
          `    peakJd: ${entry.peakJd},`,
          `    startJd: ${entry.startJd},`,
          `    lightCurve: [${entry.lightCurve.map(([days, magnitude]) => `[${days}, ${magnitude}]`).join(", ")}],`,
          `    source: ${JSON.stringify(entry.source)},`,
          ...(entry.note ? [`    note: ${JSON.stringify(entry.note)}`] : [])
        ]
        return `  {\n${lines.join("\n")}\n  }`
      })
      .join(",\n")
    return `/**
 * The novae and supernovae bright enough to have been seen with the naked eye, one entry per
 * eruption.
 *
 * GENERATED by scripts/build-nova-catalog.ts — edit that script, not this file. It says where each
 * curve comes from and how far to trust it: measured by the AAVSO, reconstructed from what Tycho and
 * Kepler wrote, anchored on a few chronicled dates, or borrowed from a sibling eruption.
 */
export interface StellarOutburst {
  /** Stable id, what a case file would name. */
  id: string
  kind: "nova" | "supernova"
  /** The variable-star or supernova designation. A recurrent nova's eruptions share it. */
  designation: string
  /** WITHOUT a leading article; the readout supplies it. */
  name: { en: string; fr: string }
  /** J2000, like the star catalogue — see HorizontalFrame for the precession to the date. */
  raHours: number
  decDeg: number
  /** The brightest point of the curve, and when. */
  peakMagnitude: number
  peakJd: number
  /** The Julian day of the first point of the curve: nothing is drawn before it. */
  startJd: number
  /** [days since startJd, visual magnitude], time-ordered, interpolated linearly between points and
   * silent outside them. */
  lightCurve: ReadonlyArray<readonly [number, number]>
  /** Where the numbers come from, in words a reader can follow up. */
  source: string
  note?: string
}

export const STELLAR_OUTBURSTS: StellarOutburst[] = [
${body}
]
`
  }
}

const here = path.dirname(fileURLToPath(import.meta.url))
const output = path.join(here, "..", "src", "engine", "astronomy", "novaCatalog.ts")
writeFileSync(output, new NovaCatalogBuilder(path.join(here, "data", "novae")).build())
console.log(`Wrote ${output}`)
