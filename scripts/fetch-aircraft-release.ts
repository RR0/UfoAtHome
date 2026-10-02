/**
 * Fetches the ADSB.lol release of one or more days into scripts/data/adsb/<day>/<instance>/, from
 * the first instance that has it (prod-0, then staging-0: see AircraftReleaseFetch), then optionally
 * ingests it (see build-aircraft-archive.ts).
 *
 * Run with: npm run fetch:aircraft [--build] [--out dir] [--instances readsb-prod-0,readsb-staging-0] YYYY-MM-DD...
 *
 * Needs access to api.github.com, github.com and the release assets' CDN (objects.githubusercontent.com,
 * release-assets.githubusercontent.com). Each day is 3 to 4 GB; a download interrupted by the network is
 * resumed, and one already complete is not fetched again.
 */
import path from "node:path"
import { fileURLToPath } from "node:url"
import { AircraftArchiveBuild } from "./AircraftArchiveBuild.js"
import { AircraftReleaseFetch } from "./AircraftReleaseFetch.js"

class FetchAircraftCommand {
  private static readonly DATA = path.join(path.resolve(path.dirname(fileURLToPath(import.meta.url)), ".."), "scripts", "data", "adsb")

  static async main(args: string[]): Promise<void> {
    const build = args.includes("--build")
    const at = args.indexOf("--out")
    const out = at < 0 ? path.join(FetchAircraftCommand.DATA, "out") : args[at + 1]
    const only = args.indexOf("--instances")
    const instances = only < 0 ? undefined : args[only + 1].split(",")
    const days = args.filter((arg, i) => !arg.startsWith("--") && args[i - 1] !== "--out" && args[i - 1] !== "--instances")
    if (days.length === 0) throw new Error("Usage: npm run fetch:aircraft [--build] [--out dir] YYYY-MM-DD...")
    const fetcher = new AircraftReleaseFetch({ dir: FetchAircraftCommand.DATA, instances, log: message => console.log(message) })
    const missing: string[] = []
    for (const day of days) {
      const result = await fetcher.fetchDay(day)
      if (AircraftReleaseFetch.isMissing(result)) {
        console.log(`${day}: MISSING (${result.failures.join("; ")})`)
        missing.push(day)
        continue
      }
      console.log(`${day}: ${result.instance}, ${result.files.length} part(s)`)
      if (build) await new AircraftArchiveBuild(out, 5, result.instance).run(result.files)
    }
    if (missing.length > 0) process.exitCode = 1
  }
}

await FetchAircraftCommand.main(process.argv.slice(2))
