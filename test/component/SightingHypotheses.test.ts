import { describe, expect, it } from "vitest"
import { SightingHypotheses } from "../../src/component/SightingHypotheses.js"
import { sightingLabels_fr } from "../../src/component/messages/SightingLabels_fr.js"
import type { HvsHypothesisResult, HvsResult } from "../../src/engine/assessment/hvs/Hvs.js"
import type { PoherRanking } from "../../src/engine/witness/PoherMatrix.js"

const row = (phenomenon: string, mean: number, excludedBy: string[] = []): PoherRanking => ({ phenomenon, mean, excludedBy, doubtedBy: [], added: false })
const score = (preferred: number) => ({ preferred, envelope: [preferred, preferred] as [number, number] })
const found = (id: string, dominant: boolean): HvsHypothesisResult => ({
  id, readings: [], linkedBy: "phenomenon", explanations: {}, csRaw: score(1), ps: score(0.7), hvs: score(0.7), admissible: true, dominant
})

describe("SightingHypotheses", () => {
  const hypotheses = new SightingHypotheses(sightingLabels_fr, "fr")

  it("states the phenomenon the matrix ranks first, and says a tie rather than breaking it", () => {
    const chip = hypotheses.poher([row("SkyLantern", 0.9), row("Venus", 0.9), row("Birds", 0.5), row("Meteor", 1, ["Duration.AFewMn"])], 3, { SkyLantern: "lanterne céleste" }, "rr0-2026")
    expect(chip).toMatchObject({ group: "hypothesis", field: SightingHypotheses.CANDIDATES_SECTION, label: "Matrice de Poher étendue", value: "lanterne céleste (+1 à égalité)" })
    expect(chip?.detail).toContain("3 phénomènes non exclus sur 4")
  })

  it("says nothing of a testimony that answers none of the matrix's questions, and says when it rules everything out", () => {
    expect(hypotheses.poher([row("SkyLantern", 0)], 0, {}, "rr0-2026")).toBeUndefined()
    expect(hypotheses.poher([row("SkyLantern", 0, ["Hour.Day"])], 1, {}, "poher-1977")?.value).toBe("toutes exclues")
  })

  it("states the dominant hypothesis and its score, or that none dominates", () => {
    const result = (hypotheses: HvsHypothesisResult[]): HvsResult => ({ account: "temoin", counted: [], discriminating: [], hypotheses })
    const chip = hypotheses.hvs(result([found("lantern", true), found("plane", false)]), id => (id === "lantern" ? "ballon / lanterne" : id))
    expect(chip).toMatchObject({ label: "HVS", value: "ballon / lanterne 0,70", field: SightingHypotheses.HVS_SECTION, detail: "HVS 0,70 = CS 1,00 × PS 0,70" })
    expect(hypotheses.hvs(result([found("plane", false)]), id => id)?.value).toBe("aucune dominante")
    expect(hypotheses.hvs(result([]), id => id)).toBeUndefined()
  })
})
