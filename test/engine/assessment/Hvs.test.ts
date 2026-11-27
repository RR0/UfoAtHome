import { describe, expect, it } from "vitest"
import { Hvs } from "../../../src/engine/assessment/hvs/Hvs.js"
import { Iqi } from "../../../src/engine/assessment/hvs/Iqi.js"
import type { CaseElementJson, HvsJson } from "../../../src/engine/assessment/hvs/HvsJson.js"
import type { SightingRecordingJson } from "../../../src/engine/persistence/sightingJson.js"

const element = (id: string, status: CaseElementJson["status"] = "observed", more: Partial<CaseElementJson> = {}): CaseElementJson => ({ id, status, ...more })
const five = ["E1", "E2", "E3", "E4", "E5"].map(id => element(id))
const none = () => undefined

describe("Weighing a case's hypotheses by the HVS protocol", () => {
  it("gives the figures of Stéphane Baron's example: raw coverage 0.80, discriminating 0.67, PS 0.70, HVS 0.47", () => {
    const hvs: HvsJson = {
      hypotheses: [
        { id: "lantern", code: "T1.4", explains: ["E1", "E2", "E3", "E4"], plausibility: { existence: 0.7, frequency: 0.7, compatibility: 0.7, context: 1 } },
        { id: "aircraft", explains: ["E1", "E2", "E5"] }
      ]
    }
    const result = Hvs.of(five, hvs, none, none)
    expect(result.discriminating).toEqual(["E3", "E4", "E5"])
    const lantern = result.hypotheses[0]
    expect(lantern.csRaw.preferred).toBeCloseTo(0.8)
    expect(lantern.csDiscriminating!.preferred).toBeCloseTo(2 / 3)
    expect(lantern.ps!.preferred).toBeCloseTo(0.7)
    expect(lantern.hvs!.preferred).toBeCloseTo(0.467, 3)
    expect(lantern).toMatchObject({ admissible: true, dominant: true })
    // One without ratings has a coverage and no score: nothing here supplies a prior.
    expect(result.hypotheses[1].hvs).toBeUndefined()
    expect(result.hypotheses[1]).toMatchObject({ admissible: true, dominant: false })
  })

  it("counts no inference of association, and counts an inference only in the upper end of a coverage", () => {
    const elements = [element("E1"), element("E2", "inferred"), element("E3", "association"), element("E4")]
    const result = Hvs.of(elements, { hypotheses: [{ id: "h", explains: ["E1", "E2", "E3"] }] }, none, none)
    expect(result.counted).toEqual(["E1", "E2", "E4"])
    expect(result.hypotheses[0].csRaw).toEqual({ preferred: 2 / 3, envelope: [1 / 3, 2 / 3] })
  })

  it("admits no hypothesis that covers less than half the elements, and has it dominate nothing", () => {
    const result = Hvs.of(five, { hypotheses: [{ id: "h", explains: ["E1", "E2"] }] }, none, none)
    expect(result.hypotheses[0]).toMatchObject({ admissible: false, dominant: false })
    expect(result.hypotheses[0].csDiscriminating).toBeUndefined()
  })

  it("settles a direction by the reading's confrontation with the account, whatever is declared", () => {
    const elements = [element("E1"), element("E2", "observed", { phenomenon: { sourceId: "light", t: 0 } }), element("E3", "observed", { phenomenon: { sourceId: "light" } })]
    const outcomes = { "0/light": true, "180000/light": false }
    const result = Hvs.of(elements, { hypotheses: [{ id: "h", readings: ["r"], explains: ["E1", "E3"] }] },
      id => id === "r" ? outcomes : undefined, id => id === "r" ? "account" : undefined, "account")
    expect(result.hypotheses[0].explanations).toEqual({
      E1: { explained: true, by: "declared" },
      E2: { explained: true, by: "confrontation" },
      // Every instant, and the reading misses the last one: declaring it explained does not make it so.
      E3: { explained: false, by: "confrontation" }
    })
  })

  it("falls back on what is declared for a phenomenon no reading of the hypothesis compared", () => {
    const elements = [element("E1", "observed", { phenomenon: { sourceId: "light" } })]
    const result = Hvs.of(elements, { hypotheses: [{ id: "et", explains: ["E1"] }] }, none, none)
    expect(result.hypotheses[0].explanations.E1).toEqual({ explained: true, by: "declared" })
  })

  it("takes the geometric mean when a rating collapses under a strong one, and draws the envelope from the ranges", () => {
    const result = Hvs.of(five, {
      hypotheses: [{
        id: "ball-lightning", explains: ["E1", "E2", "E3"],
        plausibility: { existence: 0.8, frequency: 0.05, compatibility: { value: 0.5, range: [0.3, null] }, context: { value: 1, range: [0.9, 1] } }
      }]
    }, none, none)
    const h = result.hypotheses[0]
    expect(h.geometric).toBe(true)
    expect(h.ps!.preferred).toBeCloseTo(Math.cbrt(0.8 * 0.05 * 0.5))
    expect(h.ps!.envelope[0]).toBeCloseTo(Math.cbrt(0.8 * 0.05 * 0.3) * 0.9)
    expect(h.ps!.envelope[1]).toBeCloseTo(Math.cbrt(0.8 * 0.05 * 1))
    expect(h.hvs!.preferred).toBeCloseTo(0.6 * h.ps!.preferred)
  })

  it("says which ratings were not given, the context counting as 1", () => {
    const result = Hvs.of(five, { hypotheses: [{ id: "h", explains: ["E1", "E2", "E3"], plausibility: { existence: 0.9, frequency: 0.6 } }] }, none, none)
    expect(result.hypotheses[0].missing).toEqual(["compatibility", "context"])
    expect(result.hypotheses[0].ps!.preferred).toBeCloseTo(0.75)
  })
})

describe("The information quality index of a case's file", () => {
  const account = (more: Partial<SightingRecordingJson>): SightingRecordingJson => ({ version: 4, timeline: { keyframes: [] }, ...more }) as SightingRecordingJson

  it("suggests the date, the place and the enquiry from the accounts, and leaves who and how many to the analyst", () => {
    const ratings = Iqi.of(undefined, [account({
      time: "2026-08-14T22:42:00", place: { name: "x", locations: [{ lat: 48.9, lng: 2.6 }] }, account: { source: "on-site" }
    } as never)], false)
    expect(ratings).toEqual([
      { group: "dateTime", level: "complete", suggested: true },
      { group: "place", level: "complete", suggested: true },
      { group: "identification" },
      { group: "witnesses" },
      { group: "enquiry", level: "partial", suggested: true }
    ])
  })

  it("rates a supposed time or a day alone as partial, and puts the analyst's word before any suggestion", () => {
    const supposed = account({ time: { value: "2026-08-14T22:42:00", basis: "assumed" } as never })
    expect(Iqi.of(undefined, [supposed], false)[0].level).toBe("partial")
    expect(Iqi.of(undefined, [account({ time: "2026-08-14" })], false)[0].level).toBe("partial")
    const ratings = Iqi.of({ dateTime: "complete", witnesses: "partial" }, [supposed], true)
    expect(ratings[0]).toEqual({ group: "dateTime", level: "complete" })
    expect(ratings[4]).toEqual({ group: "enquiry", level: "complete", suggested: true })
    expect(Iqi.total(ratings)).toEqual({ sum: 2.5, of: 4 })
  })
})
