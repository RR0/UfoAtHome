import { describe, expect, it } from "vitest"
import { Hvs, type HvsReading } from "../../../src/engine/assessment/hvs/Hvs.js"
import { Iqi } from "../../../src/engine/assessment/hvs/Iqi.js"
import type { CaseElementJson, HvsJson } from "../../../src/engine/assessment/hvs/HvsJson.js"
import type { SightingRecordingJson } from "../../../src/engine/persistence/sightingJson.js"

const element = (id: string, status: CaseElementJson["status"] = "observed", more: Partial<CaseElementJson> = {}): CaseElementJson => ({ id, status, ...more })
const five = ["E1", "E2", "E3", "E4", "E5"].map(id => element(id))
const one = (elements: CaseElementJson[], hvs: HvsJson, readings: HvsReading[] = []) => Hvs.of(elements, hvs, "a", readings, true)
const reading = (id: string, phenomena: string[], outcomes?: Record<string, boolean>): HvsReading => ({ id, phenomena: new Set(phenomena), ...(outcomes ? { outcomes } : {}) })

describe("Weighing a case's hypotheses by the HVS protocol", () => {
  it("gives the figures of Stéphane Baron's example: raw coverage 0.80, discriminating 0.67, PS 0.70, HVS 0.47", () => {
    const hvs: HvsJson = {
      hypotheses: [
        { id: "lantern", code: "T1.4", explains: ["E1", "E2", "E3", "E4"], plausibility: { existence: 0.7, frequency: 0.7, compatibility: 0.7, context: 1 } },
        { id: "aircraft", explains: ["E1", "E2", "E5"] }
      ]
    }
    const result = one(five, hvs)
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
    const result = one(elements, { hypotheses: [{ id: "h", explains: ["E1", "E2", "E3"] }] })
    expect(result.counted).toEqual(["E1", "E2", "E4"])
    expect(result.hypotheses[0].csRaw).toEqual({ preferred: 2 / 3, envelope: [1 / 3, 2 / 3] })
  })

  it("admits no hypothesis that covers less than half the elements, and has it dominate nothing", () => {
    const result = one(five, { hypotheses: [{ id: "h", explains: ["E1", "E2"] }] })
    expect(result.hypotheses[0]).toMatchObject({ admissible: false, dominant: false })
    expect(result.hypotheses[0].csDiscriminating).toBeUndefined()
  })

  it("settles a direction by the reading's confrontation with the account, whatever is declared", () => {
    const elements = [element("E1"), element("E2", "observed", { phenomenon: { sourceId: "light", t: 0 } }), element("E3", "observed", { phenomenon: { sourceId: "light" } })]
    const outcomes = { "0/light": true, "180000/light": false }
    const result = one(elements, { hypotheses: [{ id: "h", readings: ["r"], explains: ["E1", "E3"] }] }, [reading("r", [], outcomes)])
    expect(result.hypotheses[0].explanations).toEqual({
      E1: { explained: true, by: "declared" },
      E2: { explained: true, by: "confrontation" },
      // Every instant, and the reading misses the last one: declaring it explained does not make it so.
      E3: { explained: false, by: "confrontation" }
    })
  })

  it("falls back on what is declared for a phenomenon no reading of the hypothesis compared", () => {
    const elements = [element("E1", "observed", { phenomenon: { sourceId: "light" } })]
    const result = one(elements, { hypotheses: [{ id: "et", explains: ["E1"] }] })
    expect(result.hypotheses[0].explanations.E1).toEqual({ explained: true, by: "declared" })
  })

  it("takes the geometric mean when a rating collapses under a strong one, and draws the envelope from the ranges", () => {
    const result = one(five, {
      hypotheses: [{
        id: "ball-lightning", explains: ["E1", "E2", "E3"],
        plausibility: { existence: 0.8, frequency: 0.05, compatibility: { value: 0.5, range: [0.3, null] }, context: { value: 1, range: [0.9, 1] } }
      }]
    })
    const h = result.hypotheses[0]
    expect(h.geometric).toBe(true)
    expect(h.ps!.preferred).toBeCloseTo(Math.cbrt(0.8 * 0.05 * 0.5))
    expect(h.ps!.envelope[0]).toBeCloseTo(Math.cbrt(0.8 * 0.05 * 0.3) * 0.9)
    expect(h.ps!.envelope[1]).toBeCloseTo(Math.cbrt(0.8 * 0.05 * 1))
    expect(h.hvs!.preferred).toBeCloseTo(0.6 * h.ps!.preferred)
  })

  it("says which ratings were not given, the context counting as 1", () => {
    const result = one(five, { hypotheses: [{ id: "h", explains: ["E1", "E2", "E3"], plausibility: { existence: 0.9, frequency: 0.6 } }] })
    expect(result.hypotheses[0].missing).toEqual(["compatibility", "context"])
    expect(result.hypotheses[0].ps!.preferred).toBeCloseTo(0.75)
  })
})

describe("One evaluation per observation", () => {
  const lantern = { id: "lantern", phenomenon: "SkyLantern", explains: ["A1", "B1"] }

  it("weighs the same hypotheses against each witness's own elements, two witnesses being two evaluations", () => {
    const elements = [element("A1", "observed", { of: "a" }), element("A2", "observed", { of: "a" }), element("B1", "observed", { of: "b" })]
    const a = Hvs.of(elements, { hypotheses: [lantern] }, "a", [], false)
    const b = Hvs.of(elements, { hypotheses: [lantern] }, "b", [], false)
    expect(a.counted).toEqual(["A1", "A2"])
    expect(a.hypotheses[0].csRaw.preferred).toBe(0.5)
    expect(b.counted).toEqual(["B1"])
    expect(b.hypotheses[0].csRaw.preferred).toBe(1)
  })

  it("says which elements of a case of several witnesses belong to none, and takes them for the only account of a case of one", () => {
    const elements = [element("E1"), element("A1", "observed", { of: "a" })]
    expect(Hvs.unassigned(elements, false).map(found => found.id)).toEqual(["E1"])
    expect(Hvs.elementsOf(elements, "a", true).map(found => found.id)).toEqual(["E1", "A1"])
  })

  it("finds the readings that test a hypothesis by the phenomenon it names, a combined one by all of its phenomena", () => {
    const readings = [reading("r1", ["SkyLantern"]), reading("r2", ["SkyLantern", "Aircraft"]), reading("r3", [])]
    expect(Hvs.readingsOf({ id: "l", phenomenon: "SkyLantern" }, readings)).toEqual({ readings: [readings[0]], linkedBy: "phenomenon" })
    expect(Hvs.readingsOf({ id: "c", phenomenon: ["Aircraft", "SkyLantern"] }, readings).readings).toEqual([readings[1]])
    // Chosen by hand: a reading of bodies of no kind, which no phenomenon finds, or none at all.
    expect(Hvs.readingsOf({ id: "l", phenomenon: "SkyLantern", readings: ["r3"] }, readings)).toEqual({ readings: [readings[2]], linkedBy: "chosen" })
    expect(Hvs.readingsOf({ id: "l", phenomenon: "SkyLantern", readings: [] }, readings).readings).toEqual([])
  })

  it("explains an element when one of several variants reproduces it, and says how many were confronted", () => {
    const elements = [element("E1", "observed", { phenomenon: { sourceId: "light" } })]
    const result = one(elements, { hypotheses: [{ id: "l", phenomenon: "SkyLantern" }] },
      [reading("v1", ["SkyLantern"], { "0/light": false }), reading("v2", ["SkyLantern"], { "0/light": true })])
    expect(result.hypotheses[0].explanations.E1).toEqual({ explained: true, by: "confrontation", readings: 2 })
  })

  it("takes the context factor said for an observation in place of the hypothesis's own", () => {
    const hvs: HvsJson = {
      hypotheses: [{ id: "drone", explains: ["E1", "E2", "E3"], plausibility: { existence: 0.8, frequency: 0.8, compatibility: 0.8, context: 0.5 } }],
      observations: { a: { context: { drone: 0 } } }
    }
    expect(one(five, hvs).hypotheses[0].ps!.preferred).toBe(0)
    expect(Hvs.of(five, hvs, "b", [], true).hypotheses[0].ps!.preferred).toBeCloseTo(0.4)
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
