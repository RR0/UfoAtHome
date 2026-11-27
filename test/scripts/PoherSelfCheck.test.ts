import { existsSync, readdirSync, readFileSync } from "node:fs"
import { resolve } from "node:path"
import { describe, expect, it } from "vitest"
import { PoherMatrix, type PoherMatrixEntry } from "../../src/engine/witness/PoherMatrix.js"
import { PoherAccountFacts, PoherSelfCheck, type PoherSelfRank } from "../../src/engine/witness/PoherSelfCheck.js"
import { fromSightingJson, type SightingRecordingJson } from "../../src/engine/persistence/sightingJson.js"
import { Provenance } from "../../src/engine/persistence/Provenance.js"
import type { CaseJson } from "../../src/engine/persistence/caseJson.js"
import { InterpretationKinds } from "../../src/modules/interpretations/InterpretationKind.js"
import { InterpretationRegistry } from "../../src/modules/interpretations/interpretationSources.js"

/** The versions of the matrix as rr0.org holds them, beside this repository: measured when it is there. */
const RR0 = resolve(process.cwd(), "../rr0.org")
const present = existsSync(resolve(RR0, `${PoherMatrix.VERSIONS["poher-1977"]}matrix.json`))
const matrixOf = (version: keyof typeof PoherMatrix.VERSIONS) =>
  new PoherMatrix(JSON.parse(readFileSync(resolve(RR0, `${PoherMatrix.VERSIONS[version]}matrix.json`), "utf8")) as PoherMatrixEntry[])

/** One reading the matrix is asked about, as though it were a testimony. */
interface Checked {
  reading: string
  phenomena: string[]
  poher: PoherSelfRank
  rr0: PoherSelfRank
}

/** Every reading of the demo cases whose kinds say which phenomenon its bodies are, set against both versions of the matrix. */
async function checkAll(directory: string, cases: string[]): Promise<Checked[]> {
  const kinds = InterpretationRegistry.kinds()
  const poher = matrixOf("poher-1977")
  const rr0 = matrixOf("rr0-2026")
  const read = (file: string) => JSON.parse(readFileSync(resolve(directory, file), "utf8"))
  const checked: Checked[] = []
  for (const file of cases) {
    const json = read(file) as CaseJson
    const events = json.events ?? []
    for (const event of events) {
      const account = events.find(candidate => candidate.id === [event.interpretationOf].flat()[0])
      if (!event.interpretationOf || !event.url || !account?.url) continue
      const reading = read(event.url) as SightingRecordingJson
      const interpretation = Provenance.strip(reading).recording.interpretation
      const phenomena = InterpretationKinds.phenomena(interpretation, kinds)
      if (phenomena.size === 0) continue
      await InterpretationKinds.load(interpretation, kinds)
      const bodies = InterpretationKinds.expand(interpretation, kinds)?.bodies ?? []
      const sighting = fromSightingJson(read(account.url))
      const facts = PoherSelfCheck.facts(sighting, PoherAccountFacts.of(sighting), bodies, sighting.timeline.allKeyframes.map(keyframe => keyframe.t))
      checked.push({ reading: event.url, phenomena: [...phenomena], poher: PoherSelfCheck.rank(poher, facts, phenomena), rr0: PoherSelfCheck.rank(rr0, facts, phenomena) })
    }
  }
  return checked
}

describe("Poher's matrix asked about the readings themselves", () => {
  it.skipIf(!present)("ranks the fictitious HVS case's lantern reading as a lantern, and rules it out in neither version", async () => {
    const [lantern] = await checkAll(resolve(process.cwd(), "docs/hvs"), ["case.json"])
    expect(lantern.phenomena).toEqual(["SkyLantern"])
    expect(lantern.rr0.excludedBy).toEqual([])
    expect(lantern.rr0.rank).toBeLessThanOrEqual(5)
  })

  it.skipIf(!present)("measures both versions on every reading of the demo cases whose kinds name a phenomenon", async () => {
    const directory = resolve(process.cwd(), "public/demo-data")
    const cases = readdirSync(directory).filter(file => file.startsWith("case-") && file.endsWith(".json"))
    const checked = await checkAll(directory, cases)
    const summary = (key: "poher" | "rr0") => {
      const ranked = checked.filter(found => found[key].rank !== undefined)
      return {
        listed: ranked.length,
        first: ranked.filter(found => found[key].rank === 1).length,
        topFive: ranked.filter(found => found[key].rank! <= 5).length,
        excluded: ranked.filter(found => found[key].excludedBy.length > 0).map(found => `${found.reading} (${found[key].excludedBy.join(", ")})`)
      }
    }
    // What the measure is, written out: kept in the test's output rather than asserted, being a finding about the matrix.
    console.log(JSON.stringify({ readings: checked.length, poher1977: summary("poher"), rr02026: summary("rr0") }, null, 2))
    if (process.env.POHER_DETAIL) for (const found of checked) console.log(found.reading, found.phenomena.join("+"), `1977 ${found.poher.rank}(=${found.poher.tied})/${found.poher.of}`, `rr0 ${found.rr0.rank}(=${found.rr0.tied})/${found.rr0.of}`, found.rr0.answers.map(answer => answer.question).join(" "))
    expect(checked.length).toBeGreaterThan(0)
  })
})
