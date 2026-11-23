import { describe, expect, it } from "vitest"
import { ScenarioSweepWords } from "../../src/component/ScenarioSweepWords.js"
import { scenarioSweepMessages_en } from "../../src/component/messages/ScenarioSweepMessages_en.js"
import { scenarioSweepMessages_fr } from "../../src/component/messages/ScenarioSweepMessages_fr.js"
import { scenarioSweepMessages_es } from "../../src/component/messages/ScenarioSweepMessages_es.js"
import { scenarioSweepMessages_it } from "../../src/component/messages/ScenarioSweepMessages_it.js"

const names: Record<string, string> = { own: "le lieu supposé", groom: "la route de Groom Lake" }
const fr = new ScenarioSweepWords(scenarioSweepMessages_fr, id => names[id] ?? id, "fr")

describe("The words of the sweep's verdicts", () => {
  it("says a robust verdict and how it moved from the one as written", () => {
    expect(fr.sentence({ robustness: "robust-plausible", asWritten: "plausible", holds: 4, played: 4 }))
      .toBe("explication plausible robuste : plausible telle qu'écrite, devient robuste (tient dans 4 scénarios sur 4)")
    expect(fr.evolution({ robustness: "robust-exclusion", asWritten: "plausible", holds: 0, played: 4 })).toMatch(/seul son propre choix la rendait plausible/)
    expect(fr.evolution({ robustness: "robust-plausible", asWritten: "excluded", holds: 0, played: 0, independent: true })).toBe("exclue telle qu'écrite, ne dépend d'aucune des conditions jouées")
  })

  it("says where a conditional verdict holds: at places, on dates, in scenarios", () => {
    expect(fr.robustness({ robustness: "conditional", asWritten: "plausible", holds: 2, played: 4, onlyIf: { places: ["own"] } })).toBe("conditionnelle (seulement si au lieu supposé)")
    expect(fr.where({ dates: ["2023-10-15", "2023-10-16"] })).toBe("le 15 octobre 2023 ou le 16 octobre 2023")
    expect(fr.where({ scenarios: ["groom@2023-10-16T05:30"] })).toBe("dans la route de Groom Lake, 16 octobre 2023 à 05:30")
  })

  it("says the alert of the sky", () => {
    expect(fr.alert({ candidate: "Venus", label: "Vénus", robustness: "robust-exclusion" })).toBe("Vénus incompatible dans tous les scénarios")
    expect(fr.alert({ candidate: "Jupiter", label: "Jupiter", robustness: "conditional", onlyIf: { dates: ["2023-10-15"] } })).toBe("Jupiter compatible seulement le 15 octobre 2023")
  })

  it("has the same words in every language", () => {
    const keys = Object.keys(scenarioSweepMessages_en).sort()
    for (const other of [scenarioSweepMessages_fr, scenarioSweepMessages_es, scenarioSweepMessages_it]) expect(Object.keys(other).sort()).toEqual(keys)
  })
})
