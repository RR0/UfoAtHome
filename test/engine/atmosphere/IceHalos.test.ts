import { describe, expect, it } from "vitest"
import { IceHalos } from "../../../src/engine/atmosphere/IceHalos.js"

describe("IceHalos", () => {
  describe("the angles, which are derived and not stored", () => {
    it("puts the common halo where every observer measures it", () => {
      // Twenty-two degrees is not a constant of this file — it is what falls out of ice's
      // refractive index and the sixty-degree angle between alternate faces of a hexagonal prism.
      // Measured values run 21.7 red to 22.4 blue.
      const halo = IceHalos.halo22()
      expect(halo.redAngleDeg!).toBeGreaterThan(21.3)
      expect(halo.redAngleDeg!).toBeLessThan(21.9)
      expect(halo.blueAngleDeg!).toBeGreaterThan(22.1)
      expect(halo.blueAngleDeg!).toBeLessThan(22.7)
    })

    it("puts red INSIDE blue, which is why a halo looks the way it does", () => {
      // The sharp red inner edge and diffuse blue outside is the single most recognisable thing
      // about a halo, and it is nothing but the two indices being different. Getting this backwards
      // would draw a rainbow's ordering, which is a different phenomenon entirely.
      const halo = IceHalos.halo22()
      expect(halo.redAngleDeg!).toBeLessThan(halo.blueAngleDeg!)
      expect(halo.blueAngleDeg! - halo.redAngleDeg!).toBeGreaterThan(0.4)
      expect(halo.blueAngleDeg! - halo.redAngleDeg!).toBeLessThan(1.2)
    })

    it("gets the rare large halo from the same formula and the other prism angle", () => {
      // Ninety degrees between a side face and an end face, and nothing else changes. Measured
      // around 46.
      const halo = IceHalos.halo46()
      expect(halo.redAngleDeg!).toBeGreaterThan(44)
      expect(halo.redAngleDeg!).toBeLessThan(46.5)
      expect(halo.angleDeg!).toBeGreaterThan(IceHalos.halo22().angleDeg! * 2)
    })

    it("moves with the index rather than sitting where it was told to", () => {
      // The test that this is physics and not a picture pasted at 22 degrees: change the index and
      // the angle must follow. Water's 1.33 is not ice, and must not give ice's halo.
      const asIce = IceHalos.minimumDeviationDeg(60, IceHalos.ICE_INDEX_RED)
      const asWater = IceHalos.minimumDeviationDeg(60, 1.333)
      expect(asWater).toBeGreaterThan(asIce + 1)
    })
  })

  describe("the deck outliving the witness's own sunset", () => {
    it("keeps ice at eight kilometres in sunlight for nearly three degrees past the horizon", () => {
      // The Earth's own shadow, as an angle: acos(R/(R+h)). It is why a pillar is a sunset sight —
      // the crystals are still lit for a quarter of an hour after the ground is not.
      const lit = IceHalos.deckLitUntilDeg(8000)
      expect(lit).toBeGreaterThan(2.7)
      expect(lit).toBeLessThan(3.0)
      // And a lower deck goes dark sooner, which is the whole content of the formula.
      expect(IceHalos.deckLitUntilDeg(2000)).toBeLessThan(lit)
      expect(IceHalos.deckLitUntilDeg(0)).toBe(0)
    })

    it("puts the display out from below rather than switching it off at the horizon", () => {
      const lit = IceHalos.deckLitUntilDeg(8000)
      expect(IceHalos.strength(1, 0, 5, lit)).toBe(1)
      expect(IceHalos.strength(1, 0, 0, lit)).toBe(1)
      const halfWay = IceHalos.strength(1, 0, -lit / 2, lit)
      expect(halfWay).toBeGreaterThan(0.4)
      expect(halfWay).toBeLessThan(0.6)
      expect(IceHalos.strength(1, 0, -lit - 0.5, lit)).toBe(0)
    })
  })

  describe("what the rings would be CALLED", () => {
    it("comes out 22 and 46 to a whole degree, which is how everybody names them", () => {
      // Worth pinning, because the big ring's red edge is at 45.0 and quoting that would have the
      // scene reporting "a 45-degree halo" for a thing every reference calls the 46-degree halo.
      // Its band is two degrees wide, and the name is the middle of it.
      expect(Math.round(IceHalos.halo22().angleDeg!)).toBe(22)
      expect(Math.round(IceHalos.halo46().angleDeg!)).toBe(46)
      // And the edges are still the edges, which is what a display is drawn from.
      expect(IceHalos.halo46().blueAngleDeg! - IceHalos.halo46().redAngleDeg!).toBeGreaterThan(2)
      expect(IceHalos.halo22().blueAngleDeg! - IceHalos.halo22().redAngleDeg!).toBeLessThan(1)
    })
  })

  describe("the sundogs", () => {
    it("stands them at the halo's own radius when the Sun is on the horizon", () => {
      // With the Sun level, the skew ray is not skew at all and the effective index is just the
      // index — so the dogs sit exactly on the 22-degree halo. That coincidence is why they are
      // usually described as being "on" it.
      expect(IceHalos.parheliaDistanceDeg(0)!).toBeCloseTo(IceHalos.halo22().redAngleDeg!, 6)
    })

    it("slides them outward as the Sun climbs, by what an observer would MEASURE", () => {
      // What separates a sundog from a halo in a photograph, and what a reconstruction has to get
      // right if it is going to place them at all.
      const distances = [0, 10, 20, 30, 40, 50].map(altitude => IceHalos.parheliaDistanceDeg(altitude)!)
      for (let i = 1; i < distances.length; i++) expect(distances[i]).toBeGreaterThan(distances[i - 1])
      // How observers describe the slide, and what this got wrong until a traced simulation of the
      // same crystals disagreed with it: barely off the ring at ten degrees, a couple of degrees
      // out by thirty, and running away from it thereafter. The old code reported the deviation
      // instead of the separation and had them a degree and a half too far out through the middle
      // of that range — the range nearly every photographed display sits in.
      expect(distances[1] - distances[0]).toBeLessThan(0.6)
      expect(IceHalos.parheliaDistanceDeg(30)! - distances[0]).toBeGreaterThan(2)
      expect(IceHalos.parheliaDistanceDeg(30)! - distances[0]).toBeLessThan(4)
      expect(IceHalos.parheliaDistanceDeg(50)! - distances[0]).toBeGreaterThan(9)
    })

    it("swings them further round in BEARING than it moves them across the sky", () => {
      // The distinction the numbers above turn on, and the one this file got wrong until a traced
      // simulation of the same crystals disagreed with it. The prism turns the ray about the
      // crystal's vertical edge, so the deviation it produces is a change of BEARING; the angle an
      // observer measures between Sun and sundog is smaller, because a circle of altitude is
      // shorter than a great circle. The two agree only with the Sun on the horizon, where the
      // circle of altitude IS a great circle.
      expect(IceHalos.parheliaAzimuthDeg(0)!).toBeCloseTo(IceHalos.parheliaDistanceDeg(0)!, 6)
      expect(IceHalos.parheliaAzimuthDeg(40)!).toBeGreaterThan(IceHalos.parheliaDistanceDeg(40)! + 2)
    })

    it("loses them above about sixty degrees, and does not choose that number", () => {
      // The cutoff is where the effective index reaches 2, so that n·sin(30°) reaches 1 and the ray
      // can no longer leave the far face of the prism. Observers put the disappearance of sundogs
      // at about sixty degrees of solar elevation; this formula puts it at 60.9 without being told.
      expect(IceHalos.PARHELIA_MAX_SUN_ALTITUDE_DEG).toBeGreaterThan(59)
      expect(IceHalos.PARHELIA_MAX_SUN_ALTITUDE_DEG).toBeLessThan(63)
      expect(IceHalos.parheliaDistanceDeg(58)).toBeDefined()
      expect(IceHalos.parheliaDistanceDeg(62)).toBeUndefined()
      expect(IceHalos.formsAt(70).map(form => form.id)).not.toContain("parhelia")
      expect(IceHalos.formsAt(30).map(form => form.id)).toContain("parhelia")
    })
  })

  describe("whether the sky could have shown any of it", () => {
    it("grows with the ice cloud, all the way to a sky full of it", () => {
      // The correction a reader found by doing the obvious thing. This used to peak at half cover
      // and return NOTHING at full, on the reasoning that a solid deck had ground the light out —
      // which confuses coverage with optical depth. A cirrostratus veil over the whole sky is the
      // classic halo-maker, and the old curve handed back zero at exactly the setting somebody
      // reaching for "more of this please" would choose.
      expect(IceHalos.strength(0, 0)).toBe(0)
      expect(IceHalos.strength(1, 0)).toBe(1)
      expect(IceHalos.strength(1, 0)).toBeGreaterThan(IceHalos.strength(0.5, 0))
      let previous = -1
      for (let cover = 0; cover <= 1.0001; cover += 0.05) {
        const strength = IceHalos.strength(cover, 0)
        expect(strength).toBeGreaterThanOrEqual(previous)
        previous = strength
      }
    })

    it("is put out by a lower deck between the witness and the crystals", () => {
      // Cirrus is above six kilometres. A layer of stratocumulus under it hides the whole display,
      // and this is the difference between "the ingredients were there" and "somebody saw it".
      expect(IceHalos.strength(0.5, 1)).toBe(0)
      expect(IceHalos.strength(0.5, 0.5)).toBeCloseTo(IceHalos.strength(0.5, 0) / 2, 6)
    })

    it("shows nothing once the light source has set", () => {
      // A halo is the source's own light bent through crystals, so it goes when the source does.
      // There is no such thing as a halo around a Sun that is down.
      expect(IceHalos.formsAt(-1)).toEqual([])
      expect(IceHalos.formsAt(0)).toEqual([])
      expect(IceHalos.formsAt(5).length).toBeGreaterThan(0)
    })

    it("keeps pillars to a low source, where the geometry actually sends light down", () => {
      // A pillar is a reflection off the flat faces of falling plates, not a refraction: no index,
      // no colour, and only near sunrise and sunset.
      expect(IceHalos.formsAt(5).map(form => form.id)).toContain("pillar")
      expect(IceHalos.formsAt(40).map(form => form.id)).not.toContain("pillar")
      expect(IceHalos.formsAt(5).find(form => form.id === "pillar")!.angleDeg).toBeUndefined()
    })
  })
})
