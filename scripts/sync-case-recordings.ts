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
import { readFileSync, existsSync, mkdirSync, writeFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import path from "node:path"

/** One recording — or a file a recording points at by a relative address — and where each host
 * keeps it. */
interface CaseRecording {
  /** Under public/demo-data/ here. */
  published: string
  /** Under science/crypto/ufo/enquete/dossier/ there. */
  dossier: string
}

/**
 * Every file that exists on both hosts.
 *
 * The names differ between them and always will: this project names a file after the OBSERVER
 * (several may share a case), while a dossier names it after what the page beside it embeds. Only
 * the bytes have to match.
 *
 * A case.json is NOT copied: it is RR0's record of the case (its title, its classification, its
 * events), written on rr0.org. What each host's case lists are these recordings, by the same
 * relative names on both, so the recordings are what must not drift.
 */
const RECORDINGS: CaseRecording[] = [
  { published: "observer-socorro.json", dossier: "Socorro/sighting.json" },
  { published: "observer-valensole.json", dossier: "Valensole/sighting.json" },
  { published: "observer-valensole-pv-1965-07-02.json", dossier: "Valensole/observer-valensole-pv-1965-07-02.json" },
  { published: "observer-wilcox.json", dossier: "Wilcox/sighting.json" },
  { published: "observer-cussac.json", dossier: "Cussac/sighting.json" },
  { published: "observer-chiles.json", dossier: "ChilesWhitted/observer-chiles.json" },
  { published: "observer-whitted.json", dossier: "ChilesWhitted/observer-whitted.json" },
  { published: "observer-maffliers.json", dossier: "Maffliers/observer-maffliers.json" },
  // What that recording lays over the scene, at the address it states: relative to the file, so
  // it has to sit at the same place beside it on both hosts.
  { published: "maffliers/vue-p024-2012-09-09.jpg", dossier: "Maffliers/maffliers/vue-p024-2012-09-09.jpg" },
  { published: "observer-silly-le-long.json", dossier: "SillyLeLong/observer-silly-le-long.json" },
  { published: "observer-mcminnville.json", dossier: "McMinnville/observer-mcminnville.json" },
  { published: "observer-mcminnville-closeup.json", dossier: "McMinnville/observer-mcminnville-closeup.json" },
  // The readings of a case are recordings too (see InterpretationEventJson): the ones its case.json lists.
  { published: "interpretation-silly-le-long-1.json", dossier: "SillyLeLong/interpretation-silly-le-long-1.json" },
  { published: "interpretation-braine-le-comte-akh-1.json", dossier: "BraineLeComte/interpretation-braine-le-comte-akh-1.json" },
  { published: "interpretation-braine-le-comte-akh-2.json", dossier: "BraineLeComte/interpretation-braine-le-comte-akh-2.json" },
  { published: "interpretation-braine-le-comte-bjn-1.json", dossier: "BraineLeComte/interpretation-braine-le-comte-bjn-1.json" },
  { published: "interpretation-braine-le-comte-bjn-2.json", dossier: "BraineLeComte/interpretation-braine-le-comte-bjn-2.json" },
  { published: "interpretation-braine-le-comte-fwy-1.json", dossier: "BraineLeComte/interpretation-braine-le-comte-fwy-1.json" },
  { published: "interpretation-braine-le-comte-fwy-2.json", dossier: "BraineLeComte/interpretation-braine-le-comte-fwy-2.json" },
  { published: "interpretation-mcminnville-1.json", dossier: "McMinnville/interpretation-mcminnville-1.json" },
  { published: "interpretation-mcminnville-2.json", dossier: "McMinnville/interpretation-mcminnville-2.json" },
  { published: "interpretation-mcminnville-3.json", dossier: "McMinnville/interpretation-mcminnville-3.json" },
  { published: "interpretation-mcminnville-4.json", dossier: "McMinnville/interpretation-mcminnville-4.json" },
  { published: "interpretation-mcminnville-5.json", dossier: "McMinnville/interpretation-mcminnville-5.json" },
  // The two plates the recording lays over the scene, at the address it states.
  { published: "mcminnville/mm1.jpg", dossier: "McMinnville/mcminnville/mm1.jpg" },
  { published: "mcminnville/mm2.jpg", dossier: "McMinnville/mcminnville/mm2.jpg" },
  { published: "observer-braine-le-comte-akh.json", dossier: "BraineLeComte/observer-braine-le-comte-akh.json" },
  { published: "observer-braine-le-comte-bjn.json", dossier: "BraineLeComte/observer-braine-le-comte-bjn.json" },
  { published: "observer-braine-le-comte-fwy.json", dossier: "BraineLeComte/observer-braine-le-comte-fwy.json" },
  { published: "observer-trans-en-provence.json", dossier: "TransEnProvence/observer-trans-en-provence.json" }
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
      mkdirSync(path.dirname(target), { recursive: true })
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
