import { describe, expect, it } from "vitest"
import { BRIGHT_STARS } from "../../src/engine/astronomy/brightStarCatalog.js"

/**
 * The generated table itself, which is data rather than behaviour — but data a build script writes
 * from a 34 MB CSV nobody reads, so these are the assertions that would notice the day that script
 * silently starts emitting something else.
 */
describe("bright star catalog", () => {
  it("carries every star this side of magnitude 3 that can be named at all", () => {
    // 179 stars are brighter than magnitude 3; exactly one of them has neither a proper name nor a
    // Bayer or Flamsteed designation, and a catalog row number identifies nothing for a witness.
    expect(BRIGHT_STARS.length).toBe(178)
    expect(BRIGHT_STARS.every(star => star.mag <= 3)).toBe(true)
  })

  it("names them in both languages, and differs only where French really does", () => {
    expect(BRIGHT_STARS.every(star => star.name.en !== "" && star.name.fr !== "")).toBe(true)
    const byName = (en: string) => BRIGHT_STARS.find(star => star.name.en === en)!
    // Arabic-derived and written identically in both — an invented translation would be worse
    // than none, so most entries carry the same string twice on purpose.
    expect(byName("Sirius").name.fr).toBe("Sirius")
    expect(byName("Rigel").name.fr).toBe("Rigel")
    // The handful that do differ, and they differ by accents.
    expect(byName("Betelgeuse").name.fr).toBe("Bételgeuse")
    expect(byName("Vega").name.fr).toBe("Véga")
    expect(byName("Antares").name.fr).toBe("Antarès")
  })

  it("falls back to the designation a star chart prints when there is no proper name", () => {
    const designated = BRIGHT_STARS.filter(star => /^[α-ω]|^\d/.test(star.name.en))
    // A minority at this cut, unlike at magnitude 4: 145 of the 178 brightest have a proper name.
    expect(designated.length).toBe(33)
    // Greek letter plus the IAU genitive, not HYG's own "Alp"/"Ori" abbreviations.
    expect(BRIGHT_STARS.some(star => star.name.en === "ε Centauri")).toBe(true)
    expect(BRIGHT_STARS.some(star => star.name.en.includes("Alp "))).toBe(false)
  })

  it("is sorted brightest first, so the nearest-match scan meets the likeliest answer soonest", () => {
    for (let i = 1; i < BRIGHT_STARS.length; i++) {
      expect(BRIGHT_STARS[i].mag).toBeGreaterThanOrEqual(BRIGHT_STARS[i - 1].mag)
    }
    expect(BRIGHT_STARS[0].name.en).toBe("Sirius")
  })

  it("states positions in the same frame and units as the binary catalog", () => {
    expect(BRIGHT_STARS.every(star => star.raHours >= 0 && star.raHours < 24)).toBe(true)
    expect(BRIGHT_STARS.every(star => star.decDeg >= -90 && star.decDeg <= 90)).toBe(true)
    const sirius = BRIGHT_STARS[0]
    expect(sirius.raHours).toBeCloseTo(6.75, 1)
    expect(sirius.decDeg).toBeCloseTo(-16.72, 1)
    expect(sirius.mag).toBeCloseTo(-1.44, 2)
  })
})
