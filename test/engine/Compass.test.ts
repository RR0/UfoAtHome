import { describe, expect, it } from "vitest"
import { Compass } from "../../src/engine/astronomy/Compass.js"

describe("Compass", () => {
  it("names the cardinals", () => {
    expect(Compass.point(0, "en")).toBe("N")
    expect(Compass.point(90, "en")).toBe("E")
    expect(Compass.point(180, "en")).toBe("S")
    expect(Compass.point(270, "en")).toBe("W")
  })

  it("uses O for ouest in French, like the scene's own compass", () => {
    expect(Compass.point(270, "fr")).toBe("O")
    expect(Compass.point(225, "fr")).toBe("SO")
    expect(Compass.point(315, "fr")).toBe("NO")
  })

  it("has sixteen points, so a bearing between the cardinals is not dragged onto one", () => {
    // The case that prompted it: the Geminid radiant at 206 degrees is south-south-west, and
    // calling that "south-west" would move it by a fifth of a right angle.
    expect(Compass.point(206, "fr")).toBe("SSO")
    expect(Compass.point(206, "en")).toBe("SSW")
  })

  it("rounds to the nearest point, including across north", () => {
    expect(Compass.point(11, "en")).toBe("N")
    expect(Compass.point(12, "en")).toBe("NNE")
    expect(Compass.point(354, "en")).toBe("N")
  })

  it("accepts any angle without the caller normalising it first", () => {
    expect(Compass.point(-90, "en")).toBe("W")
    expect(Compass.point(450, "en")).toBe("E")
  })

  describe("towards", () => {
    it("elides in French where the point's own name begins with a vowel", () => {
      // The wart this exists for: an abbreviation is read as the words it stands for, so OSO is
      // "à l'ouest-sud-ouest" and NO is "au nord-ouest". A message with a fixed "au " in front of
      // the placeholder wrote "au OSO" and "au ESE", which is how a page reads as machine output.
      expect(Compass.towards(247.5, "fr")).toBe("à l'OSO")
      expect(Compass.towards(112.5, "fr")).toBe("à l'ESE")
      expect(Compass.towards(90, "fr")).toBe("à l'E")
      expect(Compass.towards(270, "fr")).toBe("à l'O")
      expect(Compass.towards(67.5, "fr")).toBe("à l'ENE")
      expect(Compass.towards(292.5, "fr")).toBe("à l'ONO")
    })

    it("does not elide before nord or sud", () => {
      expect(Compass.towards(0, "fr")).toBe("au N")
      expect(Compass.towards(180, "fr")).toBe("au S")
      expect(Compass.towards(315, "fr")).toBe("au NO")
      expect(Compass.towards(202.5, "fr")).toBe("au SSO")
    })

    it("covers all sixteen points, each with exactly one of the two articles", () => {
      // The rule is the leading letter, so it must hold for every point rather than for the four
      // anybody thought to list.
      for (let i = 0; i < 16; i++) {
        const phrase = Compass.towards(i * Compass.POINT_DEG, "fr")
        expect(phrase).toMatch(/^(au |à l')[NSEO]/)
        expect(phrase.startsWith("à l'")).toBe(/^[EO]/.test(Compass.point(i * Compass.POINT_DEG, "fr")))
      }
    })

    it("keeps English plain", () => {
      expect(Compass.towards(315, "en")).toBe("to the NW")
      expect(Compass.towards(247.5, "en")).toBe("to the WSW")
    })
  })
})
