import { describe, expect, it } from "vitest"
import { Instruments } from "../../../src/engine/instrument/Instrument.js"
import { LensGhosts } from "../../../src/engine/instrument/LensGhost.js"

describe("LensGhosts", () => {
  it("gives an eye, and binoculars an eye looks through, no ghosts", () => {
    expect(LensGhosts.of(Instruments.byId("eye"))).toEqual([])
    expect(LensGhosts.of({ category: "binoculars" })).toEqual([])
  })

  it("gives a phone its mirrored ghost, and a camera its string of them", () => {
    const phone = LensGhosts.of(Instruments.byId("phone-landscape"))
    expect(phone).toBe(LensGhosts.PHONE)
    expect(phone[0].scale).toBe(-1)
    expect(LensGhosts.of(Instruments.byId("slr-35mm-50"))).toBe(LensGhosts.CAMERA)
  })

  it("keeps an instrument's own ghosts", () => {
    const own = [{ scale: -0.5, share: 1e-3, blur: 0.01 }]
    expect(LensGhosts.of({ category: "camera", ghosts: own })).toBe(own)
  })

  it("puts a ghost on the line through the centre, mirrored for a negative scale", () => {
    expect(LensGhosts.positionOf({ scale: -1, share: 1e-3, blur: 0.01 }, { x: -0.4, y: -0.2 })).toEqual({ x: 0.4, y: 0.2 })
    expect(LensGhosts.positionOf({ scale: 0.5, share: 1e-3, blur: 0.01 }, { x: -0.4, y: 0.2 })).toEqual({ x: -0.2, y: 0.1 })
  })

  it("keeps every ghost a small share of the light", () => {
    for (const ghost of [...LensGhosts.PHONE, ...LensGhosts.CAMERA]) {
      expect(ghost.share).toBeGreaterThan(0)
      expect(ghost.share).toBeLessThan(0.01)
      expect(ghost.scale).not.toBe(0)
    }
  })
})
