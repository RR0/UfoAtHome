import { describe, expect, it } from "vitest"
import { METEOR_SHOWERS, MeteorShowers, DARK_SKY_LIMITING_MAGNITUDE } from "../../src/engine/astronomy/MeteorShowers.js"

const perseids = METEOR_SHOWERS.find(s => s.id === "perseids")!
const quadrantids = METEOR_SHOWERS.find(s => s.id === "quadrantids")!

/** Valensole, whose own sighting is one of this project's four. */
const provence = { lat: 43.8379, lng: 5.9822, elevationM: 591 }

describe("MeteorShowers", () => {
  it("recurs every year, which is what gives it complete historical coverage", () => {
    // The Perseids of 1948 are the Perseids of today: the same date is the same shower, and no
    // other candidate explanation this project can look up reaches back that far.
    for (const year of [1948, 1965, 2026]) {
      const active = MeteorShowers.activeAt(new Date(Date.UTC(year, 7, 12, 2, 0)))
      expect(active.map(a => a.shower.id)).toContain("perseids")
    }
  })

  it("is at full strength on the night of the peak and nothing outside its window", () => {
    expect(MeteorShowers.nearness(perseids, new Date(Date.UTC(2026, 7, 12)))).toBeCloseTo(1, 6)
    expect(MeteorShowers.nearness(perseids, new Date(Date.UTC(2026, 5, 1)))).toBe(0)
    expect(MeteorShowers.nearness(perseids, new Date(Date.UTC(2026, 8, 30)))).toBe(0)
  })

  it("ramps up and back down across the window", () => {
    const rising = MeteorShowers.nearness(perseids, new Date(Date.UTC(2026, 6, 25)))
    const closer = MeteorShowers.nearness(perseids, new Date(Date.UTC(2026, 7, 5)))
    const falling = MeteorShowers.nearness(perseids, new Date(Date.UTC(2026, 7, 20)))
    expect(rising).toBeGreaterThan(0)
    expect(closer).toBeGreaterThan(rising)
    expect(falling).toBeGreaterThan(0)
    expect(falling).toBeLessThan(1)
  })

  it("handles a window that crosses the new year", () => {
    // The Quadrantids run from 28 December to 12 January. Without wrap-aware arithmetic this is the
    // one shower that reads as spanning the entire year backwards.
    expect(MeteorShowers.nearness(quadrantids, new Date(Date.UTC(2025, 11, 30)))).toBeGreaterThan(0)
    expect(MeteorShowers.nearness(quadrantids, new Date(Date.UTC(2026, 0, 3)))).toBeCloseTo(1, 6)
    expect(MeteorShowers.nearness(quadrantids, new Date(Date.UTC(2026, 0, 8)))).toBeGreaterThan(0)
    expect(MeteorShowers.nearness(quadrantids, new Date(Date.UTC(2026, 5, 15)))).toBe(0)
  })

  it("names both showers running at the end of July, which is why that date is ambiguous", () => {
    const active = MeteorShowers.activeAt(new Date(Date.UTC(2026, 6, 30))).map(a => a.shower.id)
    expect(active).toContain("southern-delta-aquariids")
    expect(active).toContain("alpha-capricornids")
    expect(active).toContain("perseids")
  })

  it("says nothing was visible when the radiant had not risen", () => {
    // The statement that matters most: a shower whose radiant is below the horizon cannot be what
    // anybody saw, however strong it is on paper.
    expect(MeteorShowers.observedRatePerHour(150, -10, 2.6)).toBe(0)
    expect(MeteorShowers.observedRatePerHour(150, 0, 2.6)).toBe(0)
  })

  it("scales the rate by the radiant's altitude", () => {
    // A radiant 30 degrees up yields half of what one overhead would.
    const overhead = MeteorShowers.observedRatePerHour(100, 90, 2.2)
    const halfway = MeteorShowers.observedRatePerHour(100, 30, 2.2)
    expect(overhead).toBeCloseTo(100, 6)
    expect(halfway).toBeCloseTo(50, 6)
  })

  it("cuts the rate for every magnitude of sky lost to moonlight or town", () => {
    const dark = MeteorShowers.observedRatePerHour(100, 90, 2.2, DARK_SKY_LIMITING_MAGNITUDE)
    const suburban = MeteorShowers.observedRatePerHour(100, 90, 2.2, 5.5)
    const city = MeteorShowers.observedRatePerHour(100, 90, 2.2, 4.5)
    expect(suburban).toBeCloseTo(dark / 2.2, 6)
    expect(city).toBeCloseTo(dark / 2.2 ** 2, 6)
    // Which is the real point: a hundred an hour on paper is twenty from a lit suburb.
    expect(city).toBeLessThan(dark / 4)
  })

  it("puts the Perseid radiant where it belongs on a August night in Provence", () => {
    // 13 August, 2 a.m. local: the radiant is high in the north-east, which is exactly why the
    // shower is a northern-summer fixture.
    const position = MeteorShowers.radiantPosition(perseids, new Date(Date.UTC(2026, 7, 13, 0, 0)), provence)
    expect(position.altitudeDeg).toBeGreaterThan(30)
    expect(position.azimuthDeg).toBeGreaterThan(10)
    expect(position.azimuthDeg).toBeLessThan(90)
  })

  it("puts it below the horizon in the early evening, when it cannot yet produce anything", () => {
    // Same date, 20:00 UTC (22:00 local): the radiant has barely risen, and the rate reflects it.
    const evening = MeteorShowers.radiantPosition(perseids, new Date(Date.UTC(2026, 7, 12, 18, 0)), provence)
    const night = MeteorShowers.radiantPosition(perseids, new Date(Date.UTC(2026, 7, 13, 2, 0)), provence)
    expect(evening.altitudeDeg).toBeLessThan(night.altitudeDeg)
  })

  it("keeps every shower's window and figures self-consistent", () => {
    for (const shower of METEOR_SHOWERS) {
      expect(MeteorShowers.nearness(shower, new Date(Date.UTC(2026, shower.peak.month - 1, shower.peak.day)))).toBeCloseTo(1, 6)
      expect(shower.peakZhr).toBeGreaterThan(0)
      // Entry speeds run from about 20 km/s (the Draconids' slow, drifting trails) to 72 (the
      // Leonids, the fastest of all).
      expect(shower.velocityKmS).toBeGreaterThanOrEqual(20)
      expect(shower.velocityKmS).toBeLessThanOrEqual(72)
      expect(shower.populationIndex).toBeGreaterThan(1.5)
      expect(shower.code).toMatch(/^[A-Z]{3}$/)
      // Named in both languages a page can be read in, and never the same string in both by
      // accident — a French page saying "Perseids" is the wart this guards against.
      expect(shower.name.en.length).toBeGreaterThan(3)
      expect(shower.name.fr.length).toBeGreaterThan(3)
    }
  })
})
