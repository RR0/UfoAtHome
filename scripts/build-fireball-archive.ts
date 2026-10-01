/**
 * One-off build step (not part of `build`/`prepublishOnly`) that turns the Global Meteor Network's
 * trajectory summary into `public/fireballs/`: an index and one file per month, fetched by a scene
 * for the month of its recording only.
 *
 * Run with: npm run build:fireballs [traj_summary_all.txt]
 * (default: scripts/data/gmn/traj_summary_all.txt, from
 * https://globalmeteornetwork.org/data/traj_summary_data/traj_summary_all.txt, CC BY 4.0)
 *
 * Every meteor the network triangulated since December 2018: where it began and ended, at what
 * height, for how long, and its peak brightness as an absolute magnitude (at 100 km). Three and a
 * half million of them, nearly all too faint to matter here: the sporadic background the scene
 * already computes stands for those. What is kept is a fireball, absolute magnitude -3 or brighter —
 * from 300 km still about as bright as the brightest stars, and Venus-bright from under 100 km —
 * which is what somebody looks up at and reports. Sixty-odd thousand, less the implausibly bright
 * (see BRIGHTEST_ABSOLUTE_MAGNITUDE).
 *
 * WHAT IS NOT KEPT, AND WHY: FRIPON's detections, archived beside it in scripts/data/fripon. Its
 * site asks to be contacted for any use of its data, so nothing derived from it is published until
 * it agrees.
 */
import { createReadStream, existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs"
import path from "node:path"
import { createInterface } from "node:readline"
import { fileURLToPath } from "node:url"
import type { FireballRecord } from "../src/engine/astronomy/FireballArchive.js"

class FireballArchiveBuild {
  private static readonly ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
  private static readonly OUT = path.join(FireballArchiveBuild.ROOT, "public", "fireballs")
  private static readonly SOURCE_URL = "https://globalmeteornetwork.org/data/traj_summary_data/traj_summary_all.txt"
  /** The faintest absolute magnitude kept — see the doc comment above. */
  private static readonly FAINTEST_ABSOLUTE_MAGNITUDE = -3
  /**
   * The brightest believed. Counted per magnitude, the archive falls by a factor of three to five at
   * each step from -3 to -7, as meteors do; from -8 on it stops falling and levels into a tail that
   * reaches -45, brighter than the Sun. A camera saturates on a fireball and the photometric fit runs
   * away: those are artefacts, and a real one of that class (Geminids at -20 over Belgium) would have
   * made the news. Past -9 the counts are many times what the slope predicts, so they are dropped
   * rather than drawn as bright as their number says.
   */
  private static readonly BRIGHTEST_ABSOLUTE_MAGNITUDE = -9

  async run(source: string): Promise<void> {
    const byMonth = new Map<string, FireballRecord[]>()
    let read = 0
    const lines = createInterface({ input: createReadStream(source, "utf8"), crlfDelay: Infinity })
    for await (const line of lines) {
      if (line.startsWith("#") || line.trim() === "") continue
      read++
      const record = this.recordOf(line.split(";").map(field => field.trim()))
      if (!record) continue
      const month = new Date(record.t).toISOString().slice(0, 7)
      let list = byMonth.get(month)
      if (!list) byMonth.set(month, list = [])
      list.push(record)
    }
    if (existsSync(FireballArchiveBuild.OUT)) rmSync(FireballArchiveBuild.OUT, { recursive: true })
    mkdirSync(FireballArchiveBuild.OUT, { recursive: true })
    let kept = 0
    let merged = 0
    for (const [month, list] of byMonth) {
      list.sort((a, b) => a.t - b.t)
      const records = this.withoutDuplicates(list)
      merged += list.length - records.length
      byMonth.set(month, records)
      kept += records.length
      writeFileSync(path.join(FireballArchiveBuild.OUT, `${month}.json`), JSON.stringify(records))
    }
    const months = [...byMonth.keys()].sort()
    const index = {
      credit: "Global Meteor Network (CC BY 4.0)",
      source: FireballArchiveBuild.SOURCE_URL,
      faintestAbsoluteMagnitude: FireballArchiveBuild.FAINTEST_ABSOLUTE_MAGNITUDE,
      brightestAbsoluteMagnitude: FireballArchiveBuild.BRIGHTEST_ABSOLUTE_MAGNITUDE,
      from: months[0],
      to: months[months.length - 1],
      months
    }
    writeFileSync(path.join(FireballArchiveBuild.OUT, "index.json"), JSON.stringify(index, null, 2) + "\n")
    console.log(`public/fireballs: ${kept} fireballs of ${read} trajectories (${merged} duplicates merged), ${months.length} months (${index.from} to ${index.to})`)
  }

  /**
   * One fireball once, when the network solved it twice — two trajectories starting within 5 s and
   * 50 km of each other, from overlapping sets of stations, each dating the start from the cameras
   * that saw it (two distinct fireballs that close are not something a sky does). The one more
   * stations agree on is kept.
   */
  private withoutDuplicates(sorted: FireballRecord[]): FireballRecord[] {
    const kept: FireballRecord[] = []
    for (const record of sorted) {
      const twin = kept.findLast(other => record.t - other.t <= 5000 &&
        Math.hypot(record.from[0] - other.from[0], (record.from[1] - other.from[1]) * Math.cos((record.from[0] * Math.PI) / 180)) * 111.2 <= 50)
      if (!twin) kept.push(record)
      else if ((record.stations ?? 0) > (twin.stations ?? 0)) kept[kept.indexOf(twin)] = record
    }
    return kept
  }

  /**
   * One trajectory, or undefined when too faint or incomplete. The summary's columns are read from
   * its END, where the positions sit, since the orbit columns before them vary in count with the
   * format's versions: ... LatBeg; ±; LonBeg; ±; HtBeg; ±; LatEnd; ±; LonEnd; ±; HtEnd; ±; Duration;
   * Peak; Peak Ht; F; Mass kg; Qc; MedianFitErr; Beg in; End in; Num; Participating.
   */
  private recordOf(f: string[]): FireballRecord | undefined {
    const at = (fromEnd: number) => Number(f[f.length - fromEnd])
    const peak = at(10)
    if (!Number.isFinite(peak) || peak > FireballArchiveBuild.FAINTEST_ABSOLUTE_MAGNITUDE || peak < FireballArchiveBuild.BRIGHTEST_ABSOLUTE_MAGNITUDE) return undefined
    const t = Date.parse(f[2].replace(" ", "T") + "Z")
    const values = [at(23), at(21), at(19), at(17), at(15), at(13), at(11), at(9)]
    if (!Number.isFinite(t) || values.some(value => !Number.isFinite(value))) return undefined
    const [latBeg, lngBeg, htBeg, latEnd, lngEnd, htEnd, duration, peakHt] = values
    const round = (value: number, digits: number) => Number(value.toFixed(digits))
    return {
      id: f[0],
      t,
      from: [round(latBeg, 4), round(lngBeg, 4), round(htBeg, 1)],
      to: [round(latEnd, 4), round(lngEnd, 4), round(htEnd, 1)],
      durationS: round(duration, 2),
      peakMagnitude: round(peak, 2),
      peakHeightKm: round(peakHt, 1),
      stations: Number(f[f.length - 2]) || undefined
    }
  }
}

const [source] = process.argv.slice(2)
await new FireballArchiveBuild().run(source ?? path.join(path.resolve(path.dirname(fileURLToPath(import.meta.url)), ".."), "scripts", "data", "gmn", "traj_summary_all.txt"))
