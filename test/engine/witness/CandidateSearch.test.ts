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
