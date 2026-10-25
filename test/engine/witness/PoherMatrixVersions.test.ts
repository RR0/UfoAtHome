import { existsSync, readFileSync } from "node:fs"
import { resolve } from "node:path"
import { describe, expect, it } from "vitest"
import { PoherMatrix } from "../../../src/engine/witness/PoherMatrix.js"
import type { PoherMatrixEntry, PoherReasons } from "../../../src/engine/witness/PoherMatrix.js"

/** The versions as rr0.org holds them, beside this repository: checked when it is there. */
const RR0 = resolve(process.cwd(), "../rr0.org")
const read = (path: string) => JSON.parse(readFileSync(resolve(RR0, path), "utf8"))
const present = existsSync(resolve(RR0, `${PoherMatrix.VERSIONS["rr0-2026"]}reasons.json`))
const scoresOf = (entry: PoherMatrixEntry) => entry.knownPhenomenaProbabilities ?? entry.knownPhenomenonProbabilities ?? {}

describe("RR0's version of the Poher matrix, as rr0.org holds it", () => {
  const poher = present ? read(`${PoherMatrix.VERSIONS["poher-1977"]}matrix.json`) as PoherMatrixEntry[] : []
  const rr0 = present ? read(`${PoherMatrix.VERSIONS["rr0-2026"]}matrix.json`) as PoherMatrixEntry[] : []
  const reasons = present ? read(`${PoherMatrix.VERSIONS["rr0-2026"]}reasons.json`) as PoherReasons : undefined

  it.skipIf(!present)("holds every score of Poher's unchanged, and gives a reason with known sources for every score of its own", () => {
    const poherScores = new Map(poher.map(entry => [entry.question, scoresOf(entry)]))
    for (const entry of rr0) {
      for (const [phenomenon, score] of Object.entries(scoresOf(entry))) {
        expect([0, 0.1, 0.5, 1]).toContain(score)
        const original = poherScores.get(entry.question)?.[phenomenon]
        if (original !== undefined) expect(score, `${phenomenon} / ${entry.question}`).toBe(original)
        else {
          const reason = reasons!.cells[phenomenon]?.[entry.question]
          expect(reason?.why, `${phenomenon} / ${entry.question}`).toBeTruthy()
          for (const source of reason!.sources) expect(reasons!.sources[source], source).toBeDefined()
        }
      }
    }
  })

  it.skipIf(!present)("rules out a lens flare seen with the naked eye, and keeps drones, lanterns and flares for red lights in a row", () => {
    const matrix = new PoherMatrix(rr0, reasons)
    const ranking = matrix.rank(["Hour.Night", "Color.RedOrange", "ObjectsCount.Several", "Formation.Line", "Noise.NotPerceived", "Detection.NakedEye"]
      .map(question => ({ question, firm: true })))
    const of = (phenomenon: string) => ranking.find(row => row.phenomenon === phenomenon)!
    expect(of("LensFlare").excludedBy).toContain("Detection.NakedEye")
    expect(matrix.reason("LensFlare", "Detection.NakedEye")?.why).toBeTruthy()
    for (const phenomenon of ["DroneLightShow", "SkyLantern", "ParachuteFlare"]) expect(of(phenomenon)).toMatchObject({ excludedBy: [], added: true })
    expect(of("Stars").added).toBe(false)
  })
})
