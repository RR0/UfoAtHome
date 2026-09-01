import { describe, expect, it } from "vitest"
import { Rainbows } from "../../../src/engine/atmosphere/Rainbows.js"

/**
 * The closed forms, checked against what observers measure rather than against the trace — the
 * trace has its own tests (RainbowSky.test.ts), and the whole value of keeping two derivations is
 * that neither is allowed to be the other's authority.
 */
describe("Rainbows, derived from the refractive index of water and nothing else", () => {
  describe("where the bows stand", () => {
    it("puts the primary at the 42 degrees everybody measures, red outside and violet inside", () => {
      const bow = Rainbows.primary()
      expect(bow.redRadiusDeg).toBeCloseTo(42.3, 1)
      expect(bow.violetRadiusDeg).toBeCloseTo(41.0, 1)
      // Red OUTSIDE: the longer the wavelength, the less water bends it, and the wider the bow.
      expect(bow.redRadiusDeg).toBeGreaterThan(bow.violetRadiusDeg)
      // Nearly a degree and a half of spread, against a 22° halo's two thirds of one — which is why
      // a bow reads as coloured and a halo mostly reads as white with a red lining.
      expect(bow.redRadiusDeg - bow.violetRadiusDeg).toBeGreaterThan(1.2)
    })

    it("puts the secondary further out with its colours the other way up", () => {
      const bow = Rainbows.secondary()
      expect(bow.redRadiusDeg).toBeCloseTo(50.4, 1)
      expect(bow.violetRadiusDeg).toBeCloseTo(52.8, 1)
      // Reversed, and not by a rule that says so: the extra bounce turns the ray past the fold, so
      // the order comes out of the arithmetic.
      expect(bow.redRadiusDeg).toBeLessThan(bow.violetRadiusDeg)
      expect(bow.radiusDeg).toBeGreaterThan(Rainbows.primary().radiusDeg)
    })

    it("leaves a dark band between them that neither bow's light can enter", () => {
      const band = Rainbows.alexandersBandDeg()
      expect(band.fromDeg).toBeCloseTo(Rainbows.primary().redRadiusDeg, 6)
      expect(band.toDeg).toBeCloseTo(Rainbows.secondary().redRadiusDeg, 6)
      expect(band.toDeg - band.fromDeg).toBeGreaterThan(7)
    })

    it("moves every angle together when the index moves, which is what makes it physics", () => {
      // A denser liquid — the drop is not water any more, and the whole sight closes in.
      const denser = Rainbows.radiusDeg(2, 1.4)
      expect(denser).toBeLessThan(Rainbows.radiusDeg(2, Rainbows.WATER_INDEX_RED))
      expect(Rainbows.radiusDeg(3, 1.4)).toBeGreaterThan(Rainbows.radiusDeg(3, Rainbows.WATER_INDEX_RED))
    })
  })

  describe("whether a witness on the ground could have seen one", () => {
    it("stands the bow highest at sunrise and takes it away by mid-morning", () => {
      const low = Rainbows.formsAt(2)
      expect(low.map(bow => bow.id)).toEqual(["primary", "secondary"])
      expect(low[0].topAltitudeDeg).toBeCloseTo(Rainbows.primary().radiusDeg - 2, 6)
      // The strongest thing this file says: above the primary's own radius there is no primary bow
      // from the ground at all, whatever the rain is doing.
      expect(Rainbows.formsAt(45).map(bow => bow.id)).toEqual(["secondary"])
      expect(Rainbows.formsAt(55)).toEqual([])
    })

    it("says nothing at all once the source has set, since a bow is its light", () => {
      expect(Rainbows.formsAt(-1)).toEqual([])
    })
  })

  describe("what the sky had to hold", () => {
    it("needs falling water and a source that reaches it, and grows with each", () => {
      expect(Rainbows.strength(0, 0, 20)).toBe(0)
      expect(Rainbows.strength(0.5, 1, 20)).toBe(0)
      expect(Rainbows.strength(0.5, 0.5, -1)).toBe(0)
      expect(Rainbows.strength(0.8, 0.2, 20)).toBeGreaterThan(Rainbows.strength(0.4, 0.2, 20))
      expect(Rainbows.strength(0.8, 0.2, 20)).toBeGreaterThan(Rainbows.strength(0.8, 0.6, 20))
    })

    it("hands back its most at the setting a reader would reach for, not at some middle", () => {
      // The mistake the ice family made once and is not making again: a curve that peaks halfway
      // and returns nothing at full rain in a clear break would be unreachable by anyone dragging a
      // slider to the end.
      expect(Rainbows.strength(1, 0, 20)).toBe(1)
    })
  })

  describe("what a moonbow needs", () => {
    it("costs a half Moon almost all of its light, which is why they are dated to the full", () => {
      expect(Rainbows.moonlightShare(Rainbows.FULL_MOON_MAGNITUDE)).toBeCloseTo(1, 6)
      // A half Moon is around magnitude -10: not half a full Moon's light but a twelfth of it.
      expect(Rainbows.moonlightShare(-10)).toBeLessThan(0.1)
      expect(Rainbows.moonlightShare(-13.5)).toBe(1)
    })
  })
})
