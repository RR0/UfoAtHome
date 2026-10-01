/**
 * One-off build step (not part of `build`/`prepublishOnly`) that turns the re-entry records into
 * `public/reentries/`: an index and one file per year, fetched by the editor for the year of a
 * recording only.
 *
 * Run with: npm run build:reentries [cords.csv] [satcat.csv]
 * (defaults: the newest scripts/data/reentries/Reentry_History_Spreadsheet_*.csv, and
 * scripts/data/satcat.csv)
 *
 * Two sources, of very different precision, and each entry says which it came from:
 *
 * - CORDS, the Aerospace Corporation's re-entry database (https://aerospace.org/reentries), since
 *   2000. Every re-entry it followed, with its predicted time and the uncertainty Aerospace stated
 *   for it — hours, typically — and, for a hundred or so, the time it was OBSERVED and where from.
 *   The site sits behind Cloudflare, so its CSV export is archived by hand into scripts/data.
 * - The SATCAT (CelesTrak, https://celestrak.org/pub/satcat.csv, CC BY 4.0), for every year since
 *   1957 and for whatever CORDS does not list: the DAY each payload and rocket body decayed, and
 *   nothing finer. Debris is left out, as in build-satellite-catalog.ts: thousands of fragments,
 *   almost none of them seen.
 *
 * WHAT IS TAKEN FROM THE SATCAT'S ORBIT COLUMNS: the inclination, and only it. Those columns hold
 * an object's last state, which is why build-satellite-catalog.ts reads none of them — a height on
 * the way down says nothing of the height it lived at. The inclination is the exception: drag
 * lowers and circularises an orbit but leaves its plane where it was, so the last inclination is the
 * one it came down on, and it says which latitudes its track could ever cross.
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import type { ReentryRecord } from "../src/engine/astronomy/ReentryArchive.js"

class ReentryCatalogBuild {
  private static readonly ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
  private static readonly OUT = path.join(ReentryCatalogBuild.ROOT, "public", "reentries")
  private static readonly CORDS_URL = "https://aerospace.org/reentries"
  private static readonly SATCAT_URL = "https://celestrak.org/pub/satcat.csv"

  run(cordsPath: string, satcatPath: string): void {
    const cords = this.fromCords(this.rows(readFileSync(cordsPath, "utf8")))
    const satcat = this.rows(readFileSync(satcatPath, "utf8"))
    const inclinations = new Map(satcat.filter(row => row.INCLINATION).map(row => [Number(row.NORAD_CAT_ID), Number(row.INCLINATION)]))
    for (const record of cords) {
      const inclination = record.norad !== undefined ? inclinations.get(record.norad) : undefined
      if (inclination !== undefined) record.inclinationDeg = inclination
    }
    const inCords = new Set(cords.map(record => record.norad).filter(norad => norad !== undefined))
    const days = this.fromSatcat(satcat).filter(record => !inCords.has(record.norad))
    const all = [...cords, ...days].sort((a, b) => a.time.localeCompare(b.time))
    const byYear = new Map<string, ReentryRecord[]>()
    for (const record of all) {
      const year = record.time.slice(0, 4)
      byYear.set(year, [...(byYear.get(year) ?? []), record])
    }
    if (existsSync(ReentryCatalogBuild.OUT)) rmSync(ReentryCatalogBuild.OUT, { recursive: true })
    mkdirSync(ReentryCatalogBuild.OUT, { recursive: true })
    for (const [year, records] of byYear) {
      writeFileSync(path.join(ReentryCatalogBuild.OUT, `${year}.json`), JSON.stringify(records))
    }
    const index = {
      credit: "CORDS, The Aerospace Corporation; SATCAT, CelesTrak (CC BY 4.0)",
      sources: { cords: ReentryCatalogBuild.CORDS_URL, satcat: ReentryCatalogBuild.SATCAT_URL },
      cordsFile: path.basename(cordsPath),
      years: [...byYear.keys()].sort()
    }
    writeFileSync(path.join(ReentryCatalogBuild.OUT, "index.json"), JSON.stringify(index, null, 2) + "\n")
    const observed = cords.filter(record => record.precision === "minute").length
    console.log(`public/reentries: ${cords.length} from CORDS (${observed} observed), ${days.length} days from the SATCAT, ${byYear.size} years`)
  }

  private fromCords(rows: Record<string, string>[]): ReentryRecord[] {
    const records: ReentryRecord[] = []
    for (const row of rows) {
      const observed = row["Observed Reentry Date (UTC)"]
      const predicted = row["Aerospace Reentry Prediction (UTC)"]
      const norad = Number(row.SSN)
      const base = {
        name: row["Object Name"].trim(),
        cosparId: row["International Designator"].trim() || undefined,
        norad: Number.isFinite(norad) && norad > 0 ? norad : undefined,
        type: this.typeOf(row.Type),
        source: "cords" as const
      }
      if (observed && observed !== "N/A") {
        const lat = Number(row["Sighting Latitude"])
        const lng = Number(row["Sighting Longitude"])
        const place = row["Sighting Location"].trim()
        records.push({
          ...base,
          time: observed.replace(/:00Z$/, "Z"),
          precision: "minute",
          ...(place ? { seenFrom: place } : {}),
          ...(row["Sighting Latitude"] && Number.isFinite(lat) && Number.isFinite(lng) ? { seenLat: lat, seenLng: lng } : {})
        })
      } else if (predicted) {
        const hours = Number(row["Aerospace Stated Uncertainty 20% Rule (+/- hrs)"])
        records.push({ ...base, time: predicted.replace(/:\d\d(\.\d+)?Z$/, "Z"), precision: "hours", uncertaintyHours: Number.isFinite(hours) ? hours : undefined })
      }
    }
    return records
  }

  private fromSatcat(rows: Record<string, string>[]): ReentryRecord[] {
    return rows
      .filter(row => row.DECAY_DATE && row.ORBIT_CENTER === "EA" && (row.OBJECT_TYPE === "PAY" || row.OBJECT_TYPE === "R/B"))
      .map(row => ({
        name: row.OBJECT_NAME,
        cosparId: row.OBJECT_ID || undefined,
        norad: Number(row.NORAD_CAT_ID),
        type: row.OBJECT_TYPE === "PAY" ? "payload" as const : "rocket" as const,
        time: row.DECAY_DATE,
        precision: "day" as const,
        ...(row.INCLINATION ? { inclinationDeg: Number(row.INCLINATION) } : {}),
        source: "satcat" as const
      }))
  }

  private typeOf(type: string): ReentryRecord["type"] {
    const t = type.toLowerCase()
    if (t.startsWith("payload")) return "payload"
    if (t.startsWith("r/b") || t.startsWith("rocket")) return "rocket"
    if (t.startsWith("debris")) return "debris"
    return "unknown"
  }

  /** RFC 4180 rows as records keyed by the header. */
  private rows(text: string): Record<string, string>[] {
    const lines: string[][] = []
    let field = ""
    let line: string[] = []
    let quoted = false
    const body = text.replace(/^﻿/, "")
    for (let i = 0; i < body.length; i++) {
      const c = body[i]
      if (quoted) {
        if (c === '"' && body[i + 1] === '"') {
          field += '"'
          i++
        } else if (c === '"') quoted = false
        else field += c
      } else if (c === '"') quoted = true
      else if (c === ",") {
        line.push(field)
        field = ""
      } else if (c === "\n" || c === "\r") {
        if (c === "\r" && body[i + 1] === "\n") i++
        line.push(field)
        if (line.some(value => value !== "")) lines.push(line)
        line = []
        field = ""
      } else field += c
    }
    if (field !== "" || line.length > 0) {
      line.push(field)
      lines.push(line)
    }
    const [header, ...data] = lines
    return data.map(values => Object.fromEntries(header.map((name, i) => [name.trim(), values[i] ?? ""])))
  }

  static newestCords(): string {
    const dir = path.join(ReentryCatalogBuild.ROOT, "scripts", "data", "reentries")
    const files = readdirSync(dir).filter(name => /^Reentry_History_Spreadsheet_.*\.csv$/.test(name)).sort()
    if (files.length === 0) throw new Error(`No CORDS export in ${dir}: download it from ${ReentryCatalogBuild.CORDS_URL}`)
    return path.join(dir, files[files.length - 1])
  }
}

const [cords, satcat] = process.argv.slice(2)
new ReentryCatalogBuild().run(cords ?? ReentryCatalogBuild.newestCords(),
  satcat ?? path.join(path.resolve(path.dirname(fileURLToPath(import.meta.url)), ".."), "scripts", "data", "satcat.csv"))
