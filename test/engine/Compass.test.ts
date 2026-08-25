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
})
