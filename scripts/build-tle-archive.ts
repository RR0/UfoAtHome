/**
 * One-off build step (not part of `build`/`prepublishOnly`) that turns an archive of dated TLE
 * snapshots into the compact files the browser fetches to compute real satellite passes.
 *
 * Run with: npm run build:tle
 *
 * THE SOURCE. Historical orbital elements are what Satellites.ts once said could not be had: CelesTrak
 * serves only current ones and Space-Track needs an account a browser cannot use. Laurent Chabin
 * (SCEAU) has been saving the public element sets once or twice a day since February 2021, for
 * exactly that reason, and publishes them at https://ufowaves.org/gp/my_tles/. This script reads a
 * local copy of that archive, expected in scripts/data/tle/<year>/ as it is laid out there:
 *
 * - `Visible/Visible-YYYYMMDDTHHMM.zip` (2021 to early 2025): one 3LE file, the ~200 objects
 *   bright enough to be seen with the naked eye.
 * - `tle/YYYYMMDD_HHMMSS_visual.tle` (from late 2024): the same list, served as plain text.
 * - `tle/YYYYMMDD_HHMMSS_starlink.tle` (from late 2024): every Starlink.
 *
 * The `Full Catalog` zips are not read: two gigabytes of debris and payloads nobody can see, and the
 * Starlinks they carry before 2025 would need the same treatment as below to be worth serving.
 *
 * WHAT IS KEPT. A snapshot repeats most of the element sets of the one before, so the archive is
 * reduced to distinct sets, and then to the ones a pass computation needs:
 *
 * - Visible objects: the latest set of each UTC day per object. A day-old set puts a low orbit a
 *   kilometre or two off along its track, a fraction of a second of timing.
 * - Starlink, operational: one set per object per week, the one nearest the middle of the week.
 *   The nearest set to any instant is then at most three and a half days old, which puts the
 *   satellite a few seconds early or late along a path that is itself right. Keeping every day
 *   would take half a gigabyte for that last few seconds.
 * - Starlink, in its first 60 days after launch: every day. That is when the satellites fly low in
 *   the tight "train" that gets reported, and when their orbits change fastest.
 *
 * Every line goes through its TLE checksum. The archive has at least one snapshot that is not text
 * at all (2026-06-12 09:43 visual) and one empty file; a checksum rejects both without a special case.
 *
 * WHAT IS WRITTEN, into public/tle/, committed: ufoathome.org is built from the repository, and serves
 * the archive at /tle/ to every page embedding a scene, the way it serves the 3D models:
 *
 * - `<kind>/<YYYY-MM-DD>.bin`: the sets whose epoch falls in the 7-day bin starting that day, as
 *   44-byte little-endian records (see RECORD_BYTES). Bins are counted from the Unix epoch.
 * - `objects-<kind>.json`: per NORAD id, the name, the launch date (SATCAT) and the standard
 *   magnitude (McCants, then Stellarium), where known.
 * - `index.json`: the bins that exist and the gaps in the archive, so a reader can say "no elements
 *   for that date" rather than propagate a stale set across a three-month hole.
 */
import { execFileSync } from "node:child_process"
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import path from "node:path"

type Kind = "visual" | "starlink" | "catalog"

interface ElementSet {
  norad: number
  name: string
  /** Epoch, Unix milliseconds UTC. */
  epochMs: number
  bstar: number
  inclinationDeg: number
  raanDeg: number
  eccentricity: number
  argOfPerigeeDeg: number
  meanAnomalyDeg: number
  /** Revolutions per day. */
  meanMotion: number
}

interface ObjectInfo {
  name: string
  launch?: string
  /** McCants standard magnitude: at 1000 km, half illuminated. */
  stdMag?: number
}

const here = path.dirname(fileURLToPath(import.meta.url))
const SOURCE_DIR = path.join(here, "data", "tle")
const SATCAT_FILE = path.join(here, "data", "satcat.csv")
/** https://www.mmccants.org/programs/qsmag.zip, unzipped. */
const QSMAG_FILE = path.join(here, "data", "qs.mag")
/** https://github.com/Stellarium/stellarium/blob/master/plugins/Satellites/resources/satellites.json */
const STELLARIUM_FILE = path.join(here, "data", "stellarium-satellites.json")
const OUT_DIR = path.join(here, "..", "public", "tle")

/** Names of the constellations SatelliteMagnitude.MEASURED_CONSTELLATIONS has a published magnitude
 * for — kept in step with it by hand, since this script runs without the browser sources. */
const MEASURED_CONSTELLATION_PREFIXES = ["ONEWEB-", "SPACEMOBILE-"]

const DAY_MS = 86_400_000
const BIN_DAYS = 7
/** Size of one record in a bin file: u32 NORAD id, f64 epoch (Unix ms), then f32 bstar,
 * inclination, RAAN, eccentricity, argument of perigee, mean anomaly, then f64 mean motion. */
const RECORD_BYTES = 4 + 8 + 4 * 6 + 8
const STARLINK_DAILY_DAYS = 60
/** A pause between two snapshots longer than this is reported as a gap in the archive. */
const GAP_DAYS = 2

class TleArchiveBuilder {
  private readonly sets: Record<Kind, Map<string, ElementSet>> = { visual: new Map(), starlink: new Map(), catalog: new Map() }
  private readonly snapshots: Record<Kind, number[]> = { visual: [], starlink: [], catalog: [] }
  private rejectedLines = 0
  private unreadableFiles: string[] = []

  private readonly launches: Map<number, string>
  private readonly stdMags: Map<number, number>
  private readonly stdMagsByName: Map<string, number[]>

  constructor(launches: Map<number, string>, stdMags: Map<number, number>, stdMagsByName: Map<string, number[]>) {
    this.launches = launches
    this.stdMags = stdMags
    this.stdMagsByName = stdMagsByName
  }

  build() {
    for (const year of readdirSync(SOURCE_DIR).sort()) {
      this.readVisibleZips(path.join(SOURCE_DIR, year, "Visible"))
      this.readTleFiles(path.join(SOURCE_DIR, year, "tle"))
      this.readFullCatalogZips(path.join(SOURCE_DIR, year, "Full Catalog"))
    }
    rmSync(OUT_DIR, { recursive: true, force: true })
    const index: Record<string, unknown> = {
      generated: new Date().toISOString(),
      source: "https://ufowaves.org/gp/my_tles/",
      credit: "TLE archive: Laurent Chabin (SCEAU), from public CelesTrak/Space-Track element sets",
      binDays: BIN_DAYS,
      recordBytes: RECORD_BYTES,
      kinds: {}
    }
    const visualObjects = new Set([...this.sets.visual.values()].map(set => set.norad))
    for (const kind of ["visual", "starlink", "catalog"] as Kind[]) {
      // An object on the naked-eye list is served from there, every day, and not a second time here.
      const kept = [...this.sets[kind].values()].filter(set => kind !== "catalog" || !visualObjects.has(set.norad))
      if (kept.length === 0) continue
      const bins = this.writeBins(kind, kept)
      this.writeObjects(kind, kept)
      const snapshots = this.snapshots[kind].sort((a, b) => a - b)
      ;(index.kinds as Record<string, unknown>)[kind] = {
        from: new Date(snapshots[0]).toISOString(),
        to: new Date(snapshots[snapshots.length - 1]).toISOString(),
        snapshots: snapshots.length,
        sets: kept.length,
        bins,
        gaps: this.gaps(snapshots)
      }
      console.log(`${kind}: ${snapshots.length} snapshots, ${kept.length} sets kept, ${bins.length} bins`)
    }
    writeFileSync(path.join(OUT_DIR, "index.json"), JSON.stringify(index, null, 1))
    console.log(`rejected ${this.rejectedLines} lines failing their checksum; unreadable: ${this.unreadableFiles.join(", ") || "none"}`)
  }

  private readVisibleZips(dir: string) {
    if (!existsSync(dir)) return
    for (const file of readdirSync(dir).filter(name => name.endsWith(".zip"))) {
      const match = /(\d{8})T(\d{4})/.exec(file)
      if (!match) continue
      const text = execFileSync("unzip", ["-p", path.join(dir, file)], { maxBuffer: 64 << 20 }).toString("latin1")
      this.readSnapshot(["visual"], this.snapshotTime(match[1], match[2]), text, file, () => "visual")
    }
  }

  /**
   * The full catalogue, snapshotted from February 2021 to early January 2025: every tracked object.
   * Three quarters of it is not kept, and on purpose:
   *
   * - DEBRIS, over half the catalogue, is a fact about radar and not about what a observer could see.
   * - An object with no measured brightness could only be propagated to be left undrawn.
   * - A Starlink goes to the Starlink list, which this is the only source of before late 2024.
   *
   * What stays is what the naked-eye list leaves out and somebody measured: OneWeb, BlueBird, and
   * some three thousand payloads and stages in McCants' and Stellarium's magnitudes.
   */
  private readFullCatalogZips(dir: string) {
    if (!existsSync(dir)) return
    for (const file of readdirSync(dir).filter(name => name.endsWith(".zip"))) {
      const match = /(\d{8})T(\d{4})/.exec(file)
      if (!match) continue
      const text = execFileSync("unzip", ["-p", path.join(dir, file)], { maxBuffer: 256 << 20 }).toString("latin1")
      this.readSnapshot(["starlink", "catalog"], this.snapshotTime(match[1], match[2]), text, file, set => {
        if (set.name.includes("STARLINK")) return "starlink"
        if (/\bDEB\b/.test(set.name)) return undefined
        return this.hasBrightness(set) ? "catalog" : undefined
      })
    }
  }

  /** Whether a magnitude will be known for this object: measured, same-stage, or a measured constellation. */
  private hasBrightness(set: ElementSet): boolean {
    return this.stdMags.has(set.norad) || this.sameStageMagnitude(set.name) !== undefined
      || MEASURED_CONSTELLATION_PREFIXES.some(prefix => set.name.startsWith(prefix))
  }

  private readTleFiles(dir: string) {
    if (!existsSync(dir)) return
    for (const file of readdirSync(dir)) {
      const match = /^(\d{8})_(\d{4})\d{2}_(visual|starlink)\.tle$/.exec(file)
      if (!match) continue
      const kind = match[3] as Kind
      this.readSnapshot([kind], this.snapshotTime(match[1], match[2]), readFileSync(path.join(dir, file), "latin1"), file, () => kind)
    }
  }

  private snapshotTime(yyyymmdd: string, hhmm: string): number {
    return Date.parse(`${yyyymmdd.slice(0, 4)}-${yyyymmdd.slice(4, 6)}-${yyyymmdd.slice(6)}T${hhmm.slice(0, 2)}:${hhmm.slice(2)}:00Z`)
  }

  private readSnapshot(kinds: Kind[], time: number, text: string, file: string, route: (set: ElementSet) => Kind | undefined) {
    const lines = text.split(/\r?\n/)
    let read = 0
    for (let i = 0; i < lines.length - 1; i++) {
      const line1 = lines[i].trimEnd()
      const line2 = lines[i + 1].trimEnd()
      if (!line1.startsWith("1 ") || !line2.startsWith("2 ")) continue
      if (!TleArchiveBuilder.checksumOk(line1) || !TleArchiveBuilder.checksumOk(line2)) {
        this.rejectedLines++
        continue
      }
      const nameLine = i > 0 ? lines[i - 1].trim() : ""
      const name = nameLine.startsWith("0 ") ? nameLine.slice(2).trim() : nameLine
      const set = this.parse(name, line1, line2)
      const kind = route(set)
      if (kind) this.add(kind, set)
      read++
      i++
    }
    if (read === 0) {
      this.unreadableFiles.push(file)
      return
    }
    for (const kind of kinds) this.snapshots[kind].push(time)
  }

  /** Modulo-10 checksum of a TLE line: digits count their value, minus signs count one. */
  static checksumOk(line: string): boolean {
    if (line.length < 69) return false
    let sum = 0
    for (let i = 0; i < 68; i++) {
      const c = line[i]
      if (c >= "0" && c <= "9") sum += c.charCodeAt(0) - 48
      else if (c === "-") sum += 1
    }
    return sum % 10 === Number(line[68])
  }

  /**
   * A catalogue number, including the Alpha-5 form (a letter for the leading digits, I and O
   * skipped) that Space-Track introduced for objects past 99999.
   */
  static catalogNumber(field: string): number {
    const first = field[0]
    if (first >= "0" && first <= "9") return Number(field)
    const letters = "ABCDEFGHJKLMNPQRSTUVWXYZ"
    return (letters.indexOf(first.toUpperCase()) + 10) * 10000 + Number(field.slice(1))
  }

  private parse(name: string, line1: string, line2: string): ElementSet {
    const year = Number(line1.slice(18, 20))
    const dayOfYear = Number(line1.slice(20, 32))
    const fullYear = year < 57 ? 2000 + year : 1900 + year
    const bstarField = line1.slice(53, 61)
    const bstar = Number(`${bstarField[0]}.${bstarField.slice(1, 6)}e${bstarField.slice(6)}`.replace(" ", ""))
    return {
      norad: TleArchiveBuilder.catalogNumber(line1.slice(2, 7)),
      name,
      epochMs: Date.UTC(fullYear, 0, 1) + (dayOfYear - 1) * DAY_MS,
      bstar: Number.isFinite(bstar) ? bstar : 0,
      inclinationDeg: Number(line2.slice(8, 16)),
      raanDeg: Number(line2.slice(17, 25)),
      eccentricity: Number(`0.${line2.slice(26, 33)}`),
      argOfPerigeeDeg: Number(line2.slice(34, 42)),
      meanAnomalyDeg: Number(line2.slice(43, 51)),
      meanMotion: Number(line2.slice(52, 63))
    }
  }

  /**
   * Keeps what a pass computation needs, as the sets arrive, rather than every set of every day: the
   * full catalogue holds millions of them.
   *
   * The latest set of each UTC day for the naked-eye list and for a Starlink in its first 60 days;
   * one set a week, the nearest the middle of the week, for everything else.
   */
  private add(kind: Kind, set: ElementSet) {
    const daily = kind === "visual" || (kind === "starlink" && this.isYoung(set))
    if (daily) {
      const key = `${set.norad}:d${Math.floor(set.epochMs / DAY_MS)}`
      const existing = this.sets[kind].get(key)
      if (!existing || existing.epochMs < set.epochMs) this.sets[kind].set(key, set)
      return
    }
    const bin = Math.floor(set.epochMs / DAY_MS / BIN_DAYS)
    const middle = (bin + 0.5) * BIN_DAYS * DAY_MS
    const key = `${set.norad}:w${bin}`
    const existing = this.sets[kind].get(key)
    if (!existing || Math.abs(set.epochMs - middle) < Math.abs(existing.epochMs - middle)) this.sets[kind].set(key, set)
  }

  private isYoung(set: ElementSet): boolean {
    const launch = this.launches.get(set.norad)
    return launch !== undefined && set.epochMs - Date.parse(`${launch}T00:00:00Z`) < STARLINK_DAILY_DAYS * DAY_MS
  }

  private writeBins(kind: Kind, sets: ElementSet[]): string[] {
    const byBin = new Map<number, ElementSet[]>()
    for (const set of sets) {
      const bin = Math.floor(set.epochMs / DAY_MS / BIN_DAYS)
      byBin.get(bin)?.push(set) ?? byBin.set(bin, [set])
    }
    mkdirSync(path.join(OUT_DIR, kind), { recursive: true })
    const names: string[] = []
    let bytes = 0
    for (const bin of [...byBin.keys()].sort((a, b) => a - b)) {
      const binSets = byBin.get(bin)!.sort((a, b) => a.norad - b.norad || a.epochMs - b.epochMs)
      const view = new DataView(new ArrayBuffer(binSets.length * RECORD_BYTES))
      binSets.forEach((set, i) => {
        let o = i * RECORD_BYTES
        view.setUint32(o, set.norad, true); o += 4
        view.setFloat64(o, set.epochMs, true); o += 8
        for (const value of [set.bstar, set.inclinationDeg, set.raanDeg, set.eccentricity, set.argOfPerigeeDeg, set.meanAnomalyDeg]) {
          view.setFloat32(o, value, true); o += 4
        }
        view.setFloat64(o, set.meanMotion, true)
      })
      const name = new Date(bin * BIN_DAYS * DAY_MS).toISOString().slice(0, 10)
      writeFileSync(path.join(OUT_DIR, kind, `${name}.bin`), new Uint8Array(view.buffer))
      bytes += view.byteLength
      names.push(name)
    }
    console.log(`${kind}: ${(bytes / 1e6).toFixed(1)} MB in ${names.length} bins`)
    return names
  }

  private writeObjects(kind: Kind, sets: ElementSet[]) {
    const objects: Record<number, ObjectInfo> = {}
    for (const set of sets) {
      const info: ObjectInfo = { name: set.name }
      const launch = this.launches.get(set.norad)
      if (launch) info.launch = launch
      const stdMag = this.stdMags.get(set.norad) ?? this.sameStageMagnitude(set.name)
      if (stdMag !== undefined) info.stdMag = stdMag
      objects[set.norad] = info
    }
    writeFileSync(path.join(OUT_DIR, `objects-${kind}.json`), JSON.stringify(objects))
  }

  /**
   * A spent rocket body nobody measured, given the median of the identical stages that were.
   *
   * Same catalogue name, same hardware: a CZ-2C second stage is the same cylinder whichever launch
   * left it up there, and its brightness is mostly its size. Only for rocket bodies (a payload's
   * name says nothing of its shape) and only when at least three of them were measured, so that the
   * median is a population rather than one object: the four CZ-2C stages Stellarium lists run from
   * 2.5 to 3.5, and that spread is the uncertainty this carries. One measured Soyuz stage is not a
   * population, and a stage with none stays without a magnitude.
   */
  private sameStageMagnitude(name: string): number | undefined {
    if (!name.endsWith("R/B")) return undefined
    const measured = this.stdMagsByName.get(name)
    if (!measured || measured.length < 3) return undefined
    const sorted = [...measured].sort((a, b) => a - b)
    const middle = Math.floor(sorted.length / 2)
    return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2
  }

  private gaps(snapshots: number[]): [string, string][] {
    const gaps: [string, string][] = []
    for (let i = 1; i < snapshots.length; i++) {
      if (snapshots[i] - snapshots[i - 1] > GAP_DAYS * DAY_MS) {
        gaps.push([new Date(snapshots[i - 1]).toISOString(), new Date(snapshots[i]).toISOString()])
      }
    }
    return gaps
  }
}

class ReferenceData {
  /** Every measured standard magnitude in Stellarium's list, by catalogue name. */
  static stdMagsByName(): Map<string, number[]> {
    const byName = new Map<string, number[]>()
    if (!existsSync(STELLARIUM_FILE)) return byName
    const satellites = JSON.parse(readFileSync(STELLARIUM_FILE, "utf8")).satellites as Record<string, { name?: string; stdMag?: number }>
    for (const satellite of Object.values(satellites)) {
      if (!satellite.name || satellite.stdMag === undefined || satellite.stdMag === 99) continue
      byName.get(satellite.name)?.push(satellite.stdMag) ?? byName.set(satellite.name, [satellite.stdMag])
    }
    return byName
  }

  /** Launch date per NORAD id, from the SATCAT. */
  static launches(): Map<number, string> {
    const launches = new Map<number, string>()
    const lines = readFileSync(SATCAT_FILE, "utf8").split(/\r?\n/)
    const header = lines[0].split(",")
    const idColumn = header.indexOf("NORAD_CAT_ID")
    const launchColumn = header.indexOf("LAUNCH_DATE")
    for (const line of lines.slice(1)) {
      const cells = line.split(",")
      if (cells[launchColumn]) launches.set(Number(cells[idColumn]), cells[launchColumn])
    }
    return launches
  }

  /**
   * Mike McCants' standard magnitudes (qs.mag): the magnitude at 1000 km, half illuminated. The
   * file is fixed-width; an object without a magnitude leaves its column blank.
   */
  static stdMags(): Map<number, number> {
    const mags = new Map<number, number>()
    for (const line of readFileSync(QSMAG_FILE, "latin1").split(/\r?\n/).slice(1)) {
      const mag = Number(line.slice(33, 37))
      if (line.slice(33, 37).trim() && Number.isFinite(mag)) mags.set(Number(line.slice(0, 5)), mag)
    }
    // McCants' file dates from 2020. Stellarium's satellite list carries the same standard
    // magnitudes (identical on the 126 objects both have) and adds the ones launched since, the
    // Chinese station among them. 99 is its "unknown".
    if (existsSync(STELLARIUM_FILE)) {
      const satellites = JSON.parse(readFileSync(STELLARIUM_FILE, "utf8")).satellites as Record<string, { stdMag?: number }>
      for (const [id, satellite] of Object.entries(satellites)) {
        const norad = Number(id)
        if (!mags.has(norad) && satellite.stdMag !== undefined && satellite.stdMag !== 99) mags.set(norad, satellite.stdMag)
      }
    }
    return mags
  }
}

new TleArchiveBuilder(ReferenceData.launches(), ReferenceData.stdMags(), ReferenceData.stdMagsByName()).build()
