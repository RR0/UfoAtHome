/**
 * One-off build step (not part of `build`/`prepublishOnly`) that turns CelesTrak's satellite
 * catalogue into `src/engine/astronomy/satelliteCatalog.ts`.
 *
 * Run with: npm run build:satellites
 *
 * The SATCAT (https://celestrak.org/pub/satcat.csv, CC BY 4.0) is the register of every object
 * ever tracked in orbit — seventy thousand rows, one per object, going back to Sputnik. It is the
 * one satellite source with COMPLETE historical coverage, and the reason this exists: orbital
 * elements for 1965 cannot be had, but the fact that two hundred and eighty-one tracked objects were
 * in orbit that month can.
 *
 * WHAT IS TAKEN FROM IT, AND WHAT IS DELIBERATELY NOT:
 *
 * - LAUNCH_DATE and DECAY_DATE are catalogue facts and are used. Everything below is derived from
 *   them and nothing else.
 * - PERIOD, INCLINATION, APOGEE and PERIGEE are the object's CURRENT state, which for anything that
 *   has re-entered means its state on the way down. Echo 1 is listed at 419 x 394 km; it spent its
 *   life near 1500. Using those fields to describe a historical object's orbit would be quietly,
 *   confidently wrong, so they are not read at all — not for the counts, not for the classes.
 *
 * The result is one honest number per month and a handful of dated windows. What it cannot give is
 * a position, and nothing here pretends otherwise: see Satellites.ts.
 */
import { mkdirSync, existsSync, readFileSync, writeFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import path from "node:path"

const SATCAT_URL = "https://celestrak.org/pub/satcat.csv"

/**
 * What counts as an object somebody could have seen.
 *
 * Payloads and spent rocket bodies. A rocket body is often the brighter of the two — big, bare
 * metal and tumbling — so leaving it out would understate what was up there. DEBRIS is excluded,
 * and that is the whole reason this filter is named rather than implied: there are hundreds of
 * thousands of catalogued fragments, almost none of them visible to anybody, and counting them
 * would turn a fact about what a witness could have seen into a fact about radar.
 */
const VISIBLE_OBJECT_TYPES = new Set(["PAY", "R/B"])

/**
 * The classes of object worth naming, and the one thing the catalogue cannot supply about them.
 *
 * The split is the same one the comets use. WHICH objects belong to a class, and how bright they
 * got, is a judgement and a documented observation — hand-entered here. WHEN they were up is a
 * catalogue fact, derived below from the SATCAT's own launch and decay dates, so none of those
 * dates is typed by a human any more.
 */
interface SatelliteClassInput {
  id: string
  name: { en: string; fr: string }
  /** Brightest recorded apparent visual magnitude for this class — an observation, not a lookup. */
  peakMagnitude: number
  /** Which SATCAT rows belong to the class: explicit NORAD ids, or a test on the object's name. */
  noradIds?: string[]
  matches?: (objectName: string) => boolean
  /**
   * When the PHENOMENON ended, where that is not the same as when the objects came down.
   *
   * The Iridium flares are the case that needs it: a flare requires an attitude-controlled
   * satellite presenting its mirror panels, so the phenomenon ended when the original constellation
   * was retired — while several of those satellites are still in orbit, dead and tumbling, and the
   * catalogue therefore reports no decay date for them. Deriving the end from the objects would say
   * the flares are still happening.
   */
  endsOn?: string
  note: string
}

const SATELLITE_CLASSES: SatelliteClassInput[] = [
  {
    id: "echo",
    name: { en: "the Echo balloons", fr: "les ballons Echo" },
    peakMagnitude: -1,
    noradIds: ["49", "740"],
    note: "Echo 1 and 2 were 30- and 40-metre reflective balloons, as bright as the brightest stars and moving slowly enough to be watched — deliberately visible, widely announced in newspapers, and the first objects most people ever saw crossing the night sky. They fall squarely inside the sighting waves this project reconstructs."
  },
  {
    id: "iridium-flares",
    name: { en: "the Iridium flares", fr: "les flashes d'Iridium" },
    peakMagnitude: -8,
    // The original block only. The replacement Iridium NEXT satellites are numbered from 100 up and
    // carry no mirror panels, so including them would extend a phenomenon that had ended.
    matches: name => /^IRIDIUM (\d{1,2})$/.test(name),
    endsOn: "2019-12-27",
    note: "The original Iridium satellites carried flat, mirror-finish antennas that threw a sunbeam a few kilometres wide across the ground: a still point of sky flaring to magnitude -8 over five seconds and vanishing again. Nothing else in the sky does that."
  },
  {
    id: "iss",
    name: { en: "the International Space Station", fr: "la Station spatiale internationale" },
    peakMagnitude: -5.9,
    noradIds: ["25544"],
    note: "Since its first module, and much brighter as it grew: at its best it outshines everything in the sky but the Sun and the Moon, crossing in a straight silent line in about four minutes."
  },
  {
    id: "starlink-trains",
    name: { en: "the Starlink trains", fr: "les trains de Starlink" },
    peakMagnitude: 1,
    matches: name => name.startsWith("STARLINK"),
    note: "In the days after a launch, satellites still bunched in their deployment string cross as an evenly spaced line of lights — the most reported 'formation of UFOs' of the era. They spread out within weeks, so a train is a fact about the days after a launch rather than about the year."
  }
]

const scriptDir = path.dirname(fileURLToPath(import.meta.url))
const cachePath = path.join(scriptDir, "data", "satcat.csv")
const outPath = path.join(scriptDir, "..", "src", "engine", "astronomy", "satelliteCatalog.ts")

interface SatcatRow {
  name: string
  noradId: string
  type: string
  launch: string
  decay: string
}

class SatelliteCatalogBuilder {
  private async satcat(): Promise<SatcatRow[]> {
    if (!existsSync(cachePath)) {
      const response = await fetch(SATCAT_URL)
      if (!response.ok) throw new Error(`CelesTrak refused the SATCAT: ${response.status}`)
      mkdirSync(path.dirname(cachePath), { recursive: true })
      writeFileSync(cachePath, await response.text())
    }
    const lines = readFileSync(cachePath, "utf8").trim().split("\n")
    const header = lines[0].split(",")
    const column = (name: string): number => {
      const index = header.indexOf(name)
      if (index < 0) throw new Error(`The SATCAT has no ${name} column — its format has changed`)
      return index
    }
    const [nameAt, idAt, typeAt, launchAt, decayAt] = [
      column("OBJECT_NAME"),
      column("NORAD_CAT_ID"),
      column("OBJECT_TYPE"),
      column("LAUNCH_DATE"),
      column("DECAY_DATE")
    ]
    return lines.slice(1).map(line => {
      // Object names can contain commas inside brackets ("ECHO 1 DEB [METAL OBJ]") but never
      // quotes, and every column this reads sits at a fixed index, so a plain split is safe here in
      // a way it would not be for a general CSV.
      const fields = line.split(",")
      return { name: fields[nameAt] ?? "", noradId: fields[idAt] ?? "", type: fields[typeAt] ?? "", launch: fields[launchAt] ?? "", decay: fields[decayAt] ?? "" }
    })
  }

  /** Year and month as a single number, so a month is one comparison rather than two. */
  private monthIndex(isoDate: string): number | undefined {
    const match = /^(\d{4})-(\d{2})/.exec(isoDate)
    return match ? Number(match[1]) * 12 + Number(match[2]) - 1 : undefined
  }

  /**
   * How many tracked objects were in orbit at the END of each month since Sputnik.
   *
   * End of month, precisely: an object launched during the month is counted, one that came down
   * during it is not. Stated because the alternative reading differs by a couple either way, and a
   * count nobody can pin down is worse than one whose definition is written down.
   *
   * Counted from launch and decay dates alone, which is the only thing in the SATCAT that means the
   * same for an object that came down in 1962 as for one still up there. Monthly rather than daily
   * because that is the granularity the answer is worth stating at — a count that moves by three
   * over a fortnight does not support a claim about one particular night — and because it makes the
   * whole history a few hundred numbers instead of twenty-five thousand.
   */
  private monthlyCounts(rows: SatcatRow[], firstMonth: number, lastMonth: number): number[] {
    const counts = new Array<number>(lastMonth - firstMonth + 1).fill(0)
    for (const row of rows) {
      if (!VISIBLE_OBJECT_TYPES.has(row.type)) continue
      const launched = this.monthIndex(row.launch)
      if (launched === undefined) continue
      // Still in orbit: it counts to the end of the table.
      const decayed = this.monthIndex(row.decay) ?? lastMonth + 1
      const from = Math.max(launched, firstMonth)
      const to = Math.min(decayed - 1, lastMonth)
      for (let month = from; month <= to; month++) counts[month - firstMonth]++
    }
    return counts
  }

  private windowOf(rows: SatcatRow[], input: SatelliteClassInput): { from: string; to?: string } {
    const ids = new Set(input.noradIds ?? [])
    const members = rows.filter(row => VISIBLE_OBJECT_TYPES.has(row.type) && (ids.has(row.noradId) || (input.matches?.(row.name) ?? false)))
    if (members.length === 0) throw new Error(`${input.id}: nothing in the SATCAT matches it — the catalogue's names have changed`)
    const launches = members.map(member => member.launch).filter(Boolean).sort()
    const from = launches[0]
    if (input.endsOn) return { from, to: input.endsOn }
    // Only when every object of the class has come down does the class itself have an end.
    const stillUp = members.some(member => !member.decay)
    if (stillUp) return { from }
    return { from, to: members.map(member => member.decay).sort().at(-1) }
  }

  async build(): Promise<void> {
    const rows = await this.satcat()
    const launches = rows.map(row => this.monthIndex(row.launch)).filter((month): month is number => month !== undefined)
    const firstMonth = Math.min(...launches)
    const lastMonth = Math.max(...launches)
    const counts = this.monthlyCounts(rows, firstMonth, lastMonth)
    const classes = SATELLITE_CLASSES.map(input => ({ input, window: this.windowOf(rows, input) }))
    for (const { input, window } of classes) {
      console.log(`${input.id.padEnd(18)} ${window.from} -> ${window.to ?? "still up"}`)
    }
    const firstYear = Math.floor(firstMonth / 12)
    console.log(
      `\n${rows.length} SATCAT rows, ${counts.length} months from ${firstYear}-${String((firstMonth % 12) + 1).padStart(2, "0")}; ` +
        `count runs ${counts[0]} -> ${counts.at(-1)}`
    )
    writeFileSync(outPath, this.render(firstMonth, counts, classes))
    console.log(`Wrote ${outPath}`)
  }

  private render(firstMonth: number, counts: number[], classes: { input: SatelliteClassInput; window: { from: string; to?: string } }[]): string {
    const entries = classes.map(({ input, window }) =>
      `  {\n` +
      `    id: ${JSON.stringify(input.id)},\n` +
      `    name: { en: ${JSON.stringify(input.name.en)}, fr: ${JSON.stringify(input.name.fr)} },\n` +
      `    from: ${JSON.stringify(window.from)},\n` +
      (window.to === undefined ? "" : `    to: ${JSON.stringify(window.to)},\n`) +
      `    peakMagnitude: ${input.peakMagnitude},\n` +
      `    note: ${JSON.stringify(input.note)}\n` +
      `  }`
    )
    // Wrapped at a readable width; the numbers are the file.
    const numbers: string[] = []
    for (let i = 0; i < counts.length; i += 24) numbers.push(`  ${counts.slice(i, i + 24).join(", ")}`)
    return `/**
 * What was in orbit, month by month, and the classes of it worth naming.
 *
 * GENERATED by scripts/build-satellite-catalog.ts from CelesTrak's SATCAT
 * (https://celestrak.org/pub/satcat.csv, CC BY 4.0) — edit that script, not this file.
 *
 * Every date here is derived from the catalogue's own launch and decay dates. The SATCAT's orbital
 * fields are deliberately NOT used: they hold each object's CURRENT state, which for anything that
 * has re-entered is its state on the way down (Echo 1 is listed at 419 x 394 km, and spent its life
 * near 1500). See the script's own doc comment.
 */

export interface SatelliteClass {
  id: string
  /** The class's name in each language a page can be read in. */
  name: { en: string; fr: string }
  /** From the first launch of the class, to when it ended — absent while it is still up there. */
  from: string
  to?: string
  /**
   * The brightest this class is recorded as getting, apparent visual magnitude.
   *
   * Here because being SUNLIT and being SEEABLE are two different questions, and only the first is
   * geometry. An Iridium flare at magnitude -8 outshines a daylit sky; an ordinary satellite at
   * magnitude 2 needs a dark one.
   */
  peakMagnitude: number
  /** What made this class worth naming, in the terms a report of the period would have used. */
  note: string
}

export const SATELLITE_CLASSES: SatelliteClass[] = [
${entries.join(",\n")}
]

/** The month the table below starts at, as year * 12 + (month - 1). */
export const FIRST_TRACKED_MONTH = ${firstMonth}

/**
 * How many tracked objects — payloads and spent rocket bodies, never debris — were in orbit in each
 * month from the first launch onwards.
 *
 * The one number about satellites with complete historical coverage, and it carries more than it
 * looks: two the month Sputnik went up, a hundred and sixty-one by the end of the month of the Socorro landing,
 * two hundred and eighty-one for Valensole, and tens of thousands now. What a witness in 1964 could
 * possibly have mistaken for something else is a different sky from the one overhead today.
 */
export const TRACKED_OBJECTS_BY_MONTH: number[] = [
${numbers.join(",\n")}
]
`
  }
}

await new SatelliteCatalogBuilder().build()
