import { describe, expect, it } from "vitest"
import { CandidateSearch } from "../../../src/engine/witness/CandidateSearch.js"
import type { CandidateTrack } from "../../../src/engine/witness/CandidateSearch.js"
import { WitnessError } from "../../../src/engine/witness/WitnessError.js"

const still = (id: string, azimuthDeg: number, altitudeDeg: number, widthDeg = 0.01): CandidateTrack =>
  ({ id, label: id, at: () => ({ aim: { azimuthDeg, altitudeDeg }, widthDeg }) })

describe("CandidateSearch", () => {
  const search = new CandidateSearch(WitnessError.byId("consolidated"))
  const account = { aim: { azimuthDeg: 205, altitudeDeg: 12 } }

  it("finds a candidate a little lower and turned within the heading law compatible with consolidated biases", () => {
    const variant = search.fit(account, still("helicopter", 225, 7))
    expect(variant.verdict).toBe("consolidated")
    expect(variant.parameters.headingDeg).toBeCloseTo(20)
    expect(variant.moved.map(value => value.field)).toEqual(["heading", "elevation"])
    expect(variant.moved[1]).toMatchObject({ stated: 12, variant: 7, status: "consolidated", z: 0 })
  })

  it("says a candidate higher than the account puts it needs the tail of the elevation law", () => {
    const variant = search.fit(account, still("venus", 205, 30))
    expect(variant.moved.find(value => value.field === "elevation")!.status).toBe("argued")
    expect(variant.verdict).toBe("incompatible")
    expect(variant.reason).toBe("direction")
  })

  it("makes a candidate never seen incompatible, and says why", () => {
    const variant = search.fit(account, { id: "below", label: "below", at: () => undefined })
    expect(variant).toMatchObject({ verdict: "incompatible", reason: "never-seen" })
  })

  it("calls a size that needs the arm's-length overestimate contested", () => {
    const variant = search.fit({ ...account, widthDeg: 2 }, still("moon", 205, 10, 0.52))
    expect(variant.moved.find(value => value.field === "size")!.status).toBe("contested")
    expect(variant.verdict).toBe("contested")
  })

  it("orders the variants by verdict, then by cost", () => {
    const variants = search.search(account, [still("venus", 205, 30), still("near", 210, 10), still("far", 240, 8)])
    expect(variants.map(variant => variant.candidate)).toEqual(["near", "far", "venus"])
  })
})

describe("CandidateSearch structural readings", () => {
  const search = new CandidateSearch(WitnessError.byId("consolidated"))
  // A light the account moves 10° across the sky in 2 minutes, from where the candidate stands.
  const moving = { aim: { azimuthDeg: 205, altitudeDeg: 12 }, motion: { sweepDeg: 10, spanMinutes: 2 } }
  const crossing = (readings?: CandidateTrack["readings"]): CandidateTrack => ({
    id: "aircraft", label: "aircraft", readings,
    at: (offsetMinutes: number) => ({ aim: { azimuthDeg: 205 + offsetMinutes * 5, altitudeDeg: 12 }, widthDeg: 0.05 })
  })

  it("reads a still light seen moving when the candidate offers it, as a consolidated effect", () => {
    const variant = search.fit(moving, { ...still("venus", 205, 12), readings: ["still-seen-moving"] })
    expect(variant.readings).toEqual([{ reading: "still-seen-moving", status: "consolidated" }])
    expect(variant.verdict).toBe("consolidated")
  })

  it("reads no still light as one crossing a large part of the sky", () => {
    const variant = search.fit({ ...moving, motion: { sweepDeg: 140, spanMinutes: 0.1 } }, { ...still("star", 205, 12), readings: ["still-seen-moving"] })
    expect(variant).toMatchObject({ verdict: "incompatible", reason: "motion" })
  })

  it("makes a still candidate that offers no such reading incompatible with a moving account, and says why", () => {
    const variant = search.fit(moving, still("lamp", 205, 12))
    expect(variant).toMatchObject({ verdict: "incompatible", reason: "motion" })
  })

  it("needs a moving candidate seen hovering for a still account, an argued reading", () => {
    const hovering = { aim: { azimuthDeg: 205, altitudeDeg: 12 }, motion: { sweepDeg: 0.1, spanMinutes: 2 } }
    expect(search.fit(hovering, crossing()).reason).toBe("motion")
    const variant = search.fit(hovering, crossing(["moving-seen-still"]))
    expect(variant.readings).toEqual([{ reading: "moving-seen-still", status: "argued" }])
    expect(variant.verdict).toBe("contested")
  })

  it("asks nothing of how a candidate moves when it moves as the account says", () => {
    expect(search.fit(moving, crossing()).readings).toEqual([])
  })

  it("reads growing as coming nearer only of a candidate that grows brighter", () => {
    const growing = { aim: { azimuthDeg: 205, altitudeDeg: 12 }, motion: { sweepDeg: 0, spanMinutes: 1 }, growth: 3 }
    const steady: CandidateTrack = { id: "star", label: "star", readings: ["brightening-as-approach"], at: () => ({ aim: { azimuthDeg: 205, altitudeDeg: 12 }, widthDeg: 0.01, magnitude: 1 }) }
    expect(search.fit(growing, steady)).toMatchObject({ verdict: "incompatible", reason: "growth" })
    const flaring: CandidateTrack = { ...steady, at: (offsetMinutes: number) => ({ aim: { azimuthDeg: 205, altitudeDeg: 12 }, widthDeg: 0.01, magnitude: 2 - offsetMinutes * 2 }) }
    expect(search.fit(growing, flaring).readings).toContainEqual({ reading: "brightening-as-approach", status: "argued" })
  })

  it("says the lights of a candidate made of several are read as one body", () => {
    expect(search.fit(moving, crossing(["grouped"])).readings).toEqual([{ reading: "grouped", status: "consolidated" }])
  })
})

describe("CandidateSearch sweep and duration", () => {
  const search = new CandidateSearch(WitnessError.byId("consolidated"))
  // A candidate crossing the sky at 1° a second, eastward from where the account starts.
  const satellite: CandidateTrack = { id: "satellite", label: "satellite", at: (offsetMinutes: number) => ({ aim: { azimuthDeg: 205 + offsetMinutes * 60, altitudeDeg: 12 }, widthDeg: 0.01 }) }
  const account = (sweepDeg: number, spanS: number) => ({ aim: { azimuthDeg: 205, altitudeDeg: 12 }, motion: { sweepDeg, spanMinutes: spanS / 60 } })

  it("asks nothing when the candidate sweeps what the account says in the time it says", () => {
    const variant = search.fit(account(10, 10), satellite)
    expect(variant.moved.filter(moved => moved.field === "duration" || moved.field === "sweep")).toEqual([])
    expect(variant.verdict).toBe("consolidated")
  })

  it("stretches the duration within its law when the candidate is slower than the account says", () => {
    const variant = search.fit(account(20, 10), satellite)
    const duration = variant.moved.find(moved => moved.field === "duration")!
    expect(duration.status).toBe("consolidated")
    expect(duration.variant).toBeGreaterThan(15)
    expect(variant.parameters.durationFactor).toBeGreaterThan(1.5)
    expect(variant.verdict).not.toBe("incompatible")
  })

  it("makes a candidate far too slow for the account incompatible, by how it moved", () => {
    // 140° in 5 s: no duration the law allows lets a satellite sweep that.
    const variant = search.fit(account(140, 5), satellite)
    expect(variant).toMatchObject({ verdict: "incompatible", reason: "motion" })
    expect(variant.moved.find(moved => moved.field === "sweep")!.status).toBe("argued")
  })
})

describe("Variants kept in a recording", () => {
  it("are read and written back as interpretations carrying what makes them variants", async () => {
    const { fromSightingJson, toSightingJson } = await import("../../../src/engine/persistence/sightingJson.js")
    const variant = {
      title: "Variant: Venus", bodies: [],
      variant: { candidate: "Venus", label: "Venus", phenomenon: "Planets", parameters: { clockMinutes: 2, headingDeg: 20, elevationFactor: 0.6, sizeFactor: 1 },
        moved: [{ field: "heading" as const, stated: 205, variant: 225, parameter: "heading", amount: 20, z: 0.9, status: "consolidated" }],
        cost: 0.9, verdict: "consolidated" as const, modelId: "consolidated" }
    }
    const sighting = fromSightingJson({ version: 1, timeline: { keyframes: [] }, variants: [variant] } as never)
    expect(sighting.variants).toEqual([variant])
    expect(toSightingJson(sighting).variants).toEqual([variant])
    expect(toSightingJson(fromSightingJson({ version: 1, timeline: { keyframes: [] } } as never)).variants).toBeUndefined()
  })
})
