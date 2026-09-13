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

type Kind = "visual" | "starlink"

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

const DAY_MS = 86_400_000
const BIN_DAYS = 7
/** Size of one record in a bin file: u32 NORAD id, f64 epoch (Unix ms), then f32 bstar,
 * inclination, RAAN, eccentricity, argument of perigee, mean anomaly, then f64 mean motion. */
const RECORD_BYTES = 4 + 8 + 4 * 6 + 8
const STARLINK_DAILY_DAYS = 60
/** A pause between two snapshots longer than this is reported as a gap in the archive. */
const GAP_DAYS = 2

class TleArchiveBuilder {
  private readonly sets: Record<Kind, Map<string, ElementSet>> = { visual: new Map(), starlink: new Map() }
  private readonly snapshots: Record<Kind, number[]> = { visual: [], starlink: [] }
  private rejectedLines = 0
  private unreadableFiles: string[] = []

  private readonly launches: Map<number, string>
  private readonly stdMags: Map<number, number>

  constructor(launches: Map<number, string>, stdMags: Map<number, number>) {
    this.launches = launches
    this.stdMags = stdMags
  }

  build() {
    for (const year of readdirSync(SOURCE_DIR).sort()) {
      this.readVisibleZips(path.join(SOURCE_DIR, year, "Visible"))
      this.readTleFiles(path.join(SOURCE_DIR, year, "tle"))
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
    for (const kind of ["visual", "starlink"] as Kind[]) {
      const kept = kind === "starlink" ? this.thinStarlink([...this.sets[kind].values()]) : [...this.sets[kind].values()]
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
      console.log(`${kind}: ${snapshots.length} snapshots, ${this.sets[kind].size} daily sets, ${kept.length} kept, ${bins.length} bins`)
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
      this.readSnapshot("visual", this.snapshotTime(match[1], match[2]), text, file)
    }
  }

  private readTleFiles(dir: string) {
    if (!existsSync(dir)) return
    for (const file of readdirSync(dir)) {
      const match = /^(\d{8})_(\d{4})\d{2}_(visual|starlink)\.tle$/.exec(file)
      if (!match) continue
      this.readSnapshot(match[3] as Kind, this.snapshotTime(match[1], match[2]), readFileSync(path.join(dir, file), "latin1"), file)
    }
  }

  private snapshotTime(yyyymmdd: string, hhmm: string): number {
    return Date.parse(`${yyyymmdd.slice(0, 4)}-${yyyymmdd.slice(4, 6)}-${yyyymmdd.slice(6)}T${hhmm.slice(0, 2)}:${hhmm.slice(2)}:00Z`)
  }

  private readSnapshot(kind: Kind, time: number, text: string, file: string) {
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
      this.add(kind, this.parse(name, line1, line2))
      read++
      i++
    }
    if (read === 0) {
      this.unreadableFiles.push(file)
      return
    }
    this.snapshots[kind].push(time)
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

  /** Keeps the latest set of each UTC day per object. */
  private add(kind: Kind, set: ElementSet) {
    const key = `${set.norad}:${Math.floor(set.epochMs / DAY_MS)}`
    const existing = this.sets[kind].get(key)
    if (!existing || existing.epochMs < set.epochMs) this.sets[kind].set(key, set)
  }

  private thinStarlink(sets: ElementSet[]): ElementSet[] {
    const weekly = new Map<string, ElementSet>()
    const kept: ElementSet[] = []
    for (const set of sets) {
      const launch = this.launches.get(set.norad)
      const young = launch !== undefined && set.epochMs - Date.parse(`${launch}T00:00:00Z`) < STARLINK_DAILY_DAYS * DAY_MS
      if (young) {
        kept.push(set)
        continue
      }
      const bin = Math.floor(set.epochMs / DAY_MS / BIN_DAYS)
      const middle = (bin + 0.5) * BIN_DAYS * DAY_MS
      const key = `${set.norad}:${bin}`
      const existing = weekly.get(key)
      if (!existing || Math.abs(set.epochMs - middle) < Math.abs(existing.epochMs - middle)) weekly.set(key, set)
    }
    return kept.concat([...weekly.values()])
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
      const stdMag = this.stdMags.get(set.norad)
      if (stdMag !== undefined) info.stdMag = stdMag
      objects[set.norad] = info
    }
    writeFileSync(path.join(OUT_DIR, `objects-${kind}.json`), JSON.stringify(objects))
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

new TleArchiveBuilder(ReferenceData.launches(), ReferenceData.stdMags()).build()
