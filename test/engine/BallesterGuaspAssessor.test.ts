import { describe, expect, it } from "vitest"
import { ASSESSMENT_SOURCES } from "../../src/engine/assessment/assessmentSources.js"
import type { Assessment } from "../../src/engine/assessment/Assessor.js"
import { fromSightingJson } from "../../src/engine/persistence/sightingJson.js"
import type { SightingRecordingJsonV1 } from "../../src/engine/persistence/sightingJson.js"

const ballesterGuasp = ASSESSMENT_SOURCES.find(source => source.id === "ballester-guasp")!

const assess = (json: Partial<SightingRecordingJsonV1>): Promise<Assessment> =>
  ballesterGuasp.create().assess(fromSightingJson({ version: 1, timeline: { keyframes: [] }, ...json } as SightingRecordingJsonV1))

const of = (assessment: Assessment, id: string) => assessment.criteria.find(criterion => criterion.id === id)!

describe("BallesterGuaspAssessor", () => {
  it("scores the method's own worked example as it does: 0.9 × 3/7 × 0.68", async () => {
    // rr0.org's page of the method: a married couple in their car, interviewed in person for over an hour, a "spool of thread" closer
    // than 100 feet that sped, followed them, and vanished; she is 43, both graduates.
    const assessment = await assess({
      decor: [{ id: "mari", kind: "observer" as const, eastM: 1, northM: 0 }],
      account: {
        source: "interview",
        enquiryMinutes: 75,
        observerAgeYears: 43,
        observerOccupationKind: "homemaker",
        observerGraduate: true,
        observersRelation: "family",
        activity: "travelling",
        strangeness: { appearance: true, movement: true, close: true }
      }
    })
    expect(assessment.factors!.q).toBeCloseTo(0.9)
    expect(assessment.factors!.sigma).toBeCloseTo(3 / 7)
    expect(assessment.factors!.pi).toBeCloseTo(0.68)
    expect(assessment.score).toBeCloseTo(0.2623, 4)
  })

  it("counts what is not known as 0, the method's own rule, and says it is unanswered", async () => {
    const assessment = await assess({})
    expect(assessment.factors!.q).toBe(0)
    // No score rather than a 0 a reader would take for a verdict, while the account does not say how it was obtained, or its
    // strangeness is not judged: "pending".
    expect(assessment.score).toBeUndefined()
    expect(assessment.verdict).toBe("pending")
    expect((await assess({ account: { source: "press" } })).verdict).toBe("pending")
    expect((await assess({ account: { source: "press", strangeness: { appearance: false } } })).score).toBe(0)
    for (const id of ["bg-information", "bg-occupation", "bg-activity", "bg-age", "bg-appearance", "bg-traces"]) {
      expect(of(assessment, id).basis, id).toBeUndefined()
    }
    // A lone observer: rated as one of a family and as together, which the method says of one witness.
    expect(of(assessment, "bg-relation")).toMatchObject({ value: 0.6, basis: "derived" })
    expect(of(assessment, "bg-geography")).toMatchObject({ value: 0.5, basis: "derived" })
    expect(of(assessment, "bg-witnesses")).toMatchObject({ value: 0.3, basis: "derived" })
  })

  it("reads the shorter band, and so an assumption, when the length of the enquiry is not said", async () => {
    const short = await assess({ account: { source: "on-site" } })
    expect(of(short, "bg-information")).toMatchObject({ value: 0.9, basis: "assumed" })
    const long = await assess({ account: { source: "on-site", enquiryMinutes: 180 } })
    expect(of(long, "bg-information")).toMatchObject({ value: 1, basis: "stated" })
  })

  it("rates a press account by the length of its text", async () => {
    const words = (count: number) => Array.from({ length: count }, () => "mot").join(" ")
    expect((await assess({ account: { source: "press" }, description: words(100) })).factors!.q).toBe(0.1)
    expect((await assess({ account: { source: "press" }, description: words(600) })).factors!.q).toBe(0.2)
  })

  it("reads detection off the instrument and beings off the scene, unless the investigators judged them", async () => {
    const filmed = await assess({ instrument: "phone-landscape" })
    expect(of(filmed, "bg-detection")).toMatchObject({ value: 1, basis: "derived" })
    const beings = await assess({
      decor: [{ id: "etre", kind: "entity" as const, eastM: 5, northM: 12, sizeM: { heightM: 1 } }]
    })
    // Beings without an anomalous object count for nothing.
    expect(of(beings, "bg-beings")).toMatchObject({ value: 0, basis: "stated" })
    const anomalous = await assess({
      decor: [{ id: "etre", kind: "entity" as const, eastM: 5, northM: 12, sizeM: { heightM: 1 } }],
      account: { strangeness: { appearance: true } }
    })
    expect(of(anomalous, "bg-beings").value).toBe(1)
    const judged = await assess({ account: { strangeness: { detection: true } } })
    expect(of(judged, "bg-detection")).toMatchObject({ value: 1, basis: "stated" })
    const eye = await assess({})
    expect(of(eye, "bg-detection")).toMatchObject({ value: 0, basis: "derived" })
  })

  it("reads a close approach off where the interpretation stands what explains the phenomenon, as an assumption", async () => {
    const at = (distanceM: number) => assess({
      timeline: { keyframes: [] },
      interpretation: { bodies: [{ id: "sphere", explains: ["boule"], model: { id: "sphere" }, track: [{ t: 0, eastM: distanceM, northM: 0, onGround: true }] }] }
    } as Partial<SightingRecordingJsonV1>)
    expect(of(await at(82), "bg-close")).toMatchObject({ value: 1, basis: "assumed", paths: ["interpretation.bodies.0"] })
    expect(of(await at(400), "bg-close")).toMatchObject({ value: 0, basis: "assumed" })
  })
})
