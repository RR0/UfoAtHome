/**
 * One-off build step (not part of `build`) that fetches the GFZ's planetary indices of geomagnetic activity into `public/kp/`: an index
 * and one file per year, which a scene fetches for the year of its recording only (see GeomagneticArchive). Kp every three hours from 1932;
 * from 1985, Hp60 every hour, the same scale but open-ended: Kp stops at 9, and the great storms go past it (Hp60 reached 10⅔ on the night
 * of 10 May 2024), which is where the aurora comes furthest towards the equator.
 *
 * Run with: npm run build:kp [firstYear] [lastYear]
 * (from https://kp.gfz.de/app/json/, the GFZ German Research Centre for Geosciences' Kp, CC BY 4.0: Matzka et al. 2021,
 * doi:10.5880/Kp.0001). Its service sends no CORS header, so a page cannot ask it itself.
 *
 * A year's file is its values in thirds (0 for 0, 1 for 0+, 2 for 1-, 3 for 1, … 27 for 9, and on for Hp60), one every `stepHours`
 * from its first instant, -1 where the GFZ has none yet: some 3 kB a year of Kp, 25 of Hp60.
 */
import { mkdirSync, writeFileSync } from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

class KpArchiveBuild {
  private static readonly ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
  private static readonly OUT = path.join(KpArchiveBuild.ROOT, "public", "kp")
  private static readonly SERVICE = "https://kp.gfz.de/app/json/"
  static readonly CREDIT = "Kp and Hp60: GFZ German Research Centre for Geosciences (Matzka et al. 2021, doi:10.5880/Kp.0001; Yamazaki et al. 2022, doi:10.5880/Hpo.0003), CC BY 4.0"
  /** The first year of Hp60. */
  static readonly HP_FROM = 1985

  static async run(first = 1932, last = new Date().getUTCFullYear()): Promise<void> {
    mkdirSync(KpArchiveBuild.OUT, { recursive: true })
    const years: number[] = []
    for (let year = first; year <= last; year++) {
      const [index, stepHours] = year >= KpArchiveBuild.HP_FROM ? ["Hp60", 1] as const : ["Kp", 3] as const
      const thirds = await KpArchiveBuild.year(year, index, stepHours)
      if (!thirds.some(value => value >= 0)) continue
      writeFileSync(path.join(KpArchiveBuild.OUT, `${year}.json`), JSON.stringify({ year, index, stepHours, values: thirds }))
      years.push(year)
      process.stdout.write(`${year} `)
    }
    writeFileSync(path.join(KpArchiveBuild.OUT, "index.json"), JSON.stringify({ credit: KpArchiveBuild.CREDIT, years }, null, 1))
    console.log(`\n${years.length} years → public/kp/`)
  }

  private static async year(year: number, index: "Kp" | "Hp60", stepHours: number): Promise<number[]> {
    const start = Date.UTC(year, 0, 1)
    const stepMs = stepHours * 3_600_000
    const steps = Math.round((Date.UTC(year + 1, 0, 1) - start) / stepMs)
    const thirds = new Array<number>(steps).fill(-1)
    const url = `${KpArchiveBuild.SERVICE}?start=${year}-01-01T00:00:00Z&end=${year}-12-31T23:59:59Z&index=${index}`
    for (let attempt = 0; attempt < 3; attempt++) {
      const response = await fetch(url)
      if (!response.ok) {
        await new Promise(resolve => setTimeout(resolve, 2000))
        continue
      }
      const data = await response.json() as Record<string, number[] | undefined> & { datetime?: string[] }
      ;(data.datetime ?? []).forEach((instant, k) => {
        const step = Math.round((Date.parse(instant) - start) / stepMs)
        const kp = data[index]?.[k]
        if (step >= 0 && step < steps && typeof kp === "number" && kp >= 0) thirds[step] = Math.round(kp * 3)
      })
      return thirds
    }
    throw new Error(`Kp for ${year}: no answer`)
  }
}

await KpArchiveBuild.run(process.argv[2] ? Number(process.argv[2]) : undefined, process.argv[3] ? Number(process.argv[3]) : undefined)
