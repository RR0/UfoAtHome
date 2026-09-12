/**
 * Keeps rr0.org's case dossiers holding exactly the recordings this project publishes.
 *
 * The same four cases are served from two hosts. ufoathome.org serves them because this is where
 * the demos live; rr0.org serves them because its own case pages embed `<rr0-sighting src="...">`
 * with a RELATIVE address, and a dossier that fetched its recording from another domain would stop
 * working the day that domain did. Both copies are wanted. What is not wanted is for them to drift:
 * a reconstruction improved here and not there means the dossier page quietly shows an older, worse
 * one, which is exactly how the Socorro decor came to be a warehouse on one host and a shack on the
 * other.
 *
 * So the copies are made by a command rather than by hand. The mapping below is the whole truth
 * about which file is which — there is no second list anywhere.
 *
 * Run with:
 *   npm run sync:cases          copies, reporting what changed
 *   npm run sync:cases -- --check   changes nothing, exits non-zero if anything has drifted
 *
 * The check mode is what belongs in a release routine: it answers "is what rr0.org serves the same
 * reconstruction I just improved?" without needing rr0.org's build to have run.
 */
import { readFileSync, existsSync, writeFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import path from "node:path"

/** One recording, and where each host keeps it. */
interface CaseRecording {
  /** Under public/demo-data/ here. */
  published: string
  /** Under science/crypto/ufo/enquete/dossier/ there. */
  dossier: string
}

/**
 * Every file that exists on both hosts.
 *
 * The names differ between them and always will: this project names a file after the WITNESS
 * (several may share a case), while a dossier names it after what the page beside it embeds. Only
 * the bytes have to match.
 *
 * Chiles-Whitted is the case with two witnesses, so what the dossier embeds is the manifest, and
 * the manifest names the files beside it — the same relative names on both hosts, which is what
 * lets that file be copied rather than translated (see SightingElement.loadFromSrc).
 */
const RECORDINGS: CaseRecording[] = [
  { published: "witness-socorro.json", dossier: "Socorro/sighting.json" },
  { published: "witness-valensole.json", dossier: "Valensole/sighting.json" },
  { published: "witness-wilcox.json", dossier: "Wilcox/sighting.json" },
  { published: "witness-cussac.json", dossier: "Cussac/sighting.json" },
  { published: "witness-chiles.json", dossier: "ChilesWhitted/witness-chiles.json" },
  { published: "witness-whitted.json", dossier: "ChilesWhitted/witness-whitted.json" },
  { published: "witnesses-manifest.json", dossier: "ChilesWhitted/witnesses-manifest.json" }
]

class CaseRecordingSync {

  private readonly here: string
  private readonly there: string

  constructor(root: string, private readonly checkOnly: boolean) {
    this.here = path.join(root, "public", "demo-data")
    // A sibling checkout, which is how this project's repositories sit next to each other — there
    // is no workspace tying them together, and none is wanted for two sites that deploy apart.
    this.there = path.join(root, "..", "rr0.org", "science", "crypto", "ufo", "enquete", "dossier")
  }

  run(): number {
    if (!existsSync(this.there)) {
      console.error(`No rr0.org checkout beside this one (looked in ${this.there}) — nothing to sync.`)
      return 1
    }
    let drifted = 0
    for (const recording of RECORDINGS) {
      const source = path.join(this.here, recording.published)
      const target = path.join(this.there, recording.dossier)
      const published = readFileSync(source)
      const served = existsSync(target) ? readFileSync(target) : undefined
      if (served && published.equals(served)) continue
      drifted++
      if (this.checkOnly) {
        console.error(`drifted: ${recording.dossier} ${served ? "differs from" : "is missing, against"} ${recording.published}`)
        continue
      }
      writeFileSync(target, published)
      console.log(`updated: ${recording.dossier} <- ${recording.published}`)
    }
    if (drifted === 0) {
      console.log(`${RECORDINGS.length} recordings, both hosts identical.`)
      return 0
    }
    // Copying is a success; finding drift in check mode is the failure the mode exists to report.
    return this.checkOnly ? 1 : 0
  }
}

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..")
process.exit(new CaseRecordingSync(root, process.argv.includes("--check")).run())
