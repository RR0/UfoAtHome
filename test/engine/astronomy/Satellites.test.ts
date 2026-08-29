import { describe, expect, it } from "vitest"
import { SATELLITE_ERAS, Satellites } from "../../../src/engine/astronomy/Satellites.js"

/** Valensole, whose own sighting is one of this project's four. */
const PROVENCE = { lat: 43.8379, lng: 5.9822, elevationM: 591 }

describe("Satellites", () => {
  describe("the Earth's shadow above the witness", () => {
    it("matches the heights the standard twilights are known to put it at", () => {
      // Independent reference points, not this formula restated: the shadow reaches about 35 km at
      // the end of civil twilight, 140 at the end of nautical and 330 at the end of astronomical.
      // A test that only asserted the code agrees with itself would pass on any monotonic curve.
      expect(Satellites.shadowHeightKm(-6)!).toBeCloseTo(35, 0)
      expect(Satellites.shadowHeightKm(-12)!).toBeCloseTo(142, 0)
      expect(Satellites.shadowHeightKm(-18)!).toBeCloseTo(328, 0)
    })

    it("puts the Space Station's own visibility limit where observers actually find it", () => {
      // The rule of thumb every satellite spotter uses: the ISS, at about 420 km, stops being lit
      // once the Sun is roughly twenty degrees down. If this drifts, the model has stopped
      // describing the sky people watch.
      const issAltitudeKm = 420
      expect(Satellites.isLitOverhead(issAltitudeKm, -20)).toBe(true)
      expect(Satellites.isLitOverhead(issAltitudeKm, -21)).toBe(false)
    })

    it("stands at zero while the Sun is up, because everything overhead is then lit", () => {
      // The correction the Iridium flares forced. This used to answer "no shadow, and nothing to
      // see either", which stated the opposite of the physics: an observer in daylight has the
      // Earth's shadow BEHIND them, so everything above them is in sunlight right down to the
      // ground. Whether anybody can pick it out of a bright sky is a different question, settled
      // elsewhere and against a magnitude — not here, and not by geometry.
      expect(Satellites.shadowHeightKm(0)).toBe(0)
      expect(Satellites.shadowHeightKm(30)).toBe(0)
      expect(Satellites.isLitOverhead(500, 5)).toBe(true)
      expect(Satellites.isLitOverhead(500, 45)).toBe(true)
      // Right down to a balloon: by day nothing is shadowed at any height.
      expect(Satellites.isLitOverhead(1, 45)).toBe(true)
    })

    it("rises without a step, and never turns back", () => {
      let previous = 0
      for (let depression = 0.1; depression <= 80; depression += 0.1) {
        const height = Satellites.shadowHeightKm(-depression)!
        expect(height).toBeGreaterThan(previous)
        previous = height
      }
    })

    it("is the statement that disposes of a light crossing the sky at two in the morning", () => {
      // The negative worth having, and the one available for every date this project reconstructs.
      // Forty degrees down is an ordinary depth of night, and the shadow is then nearly two
      // thousand kilometres up — far above anything in low orbit.
      expect(Satellites.shadowHeightKm(-40)!).toBeGreaterThan(1900)
      expect(Satellites.isLitOverhead(Satellites.LOW_ORBIT_KM, -40)).toBe(false)
      expect(Satellites.isLitOverhead(1000, -40)).toBe(false)
    })
  })

  describe("what class of object existed", () => {
    it("has nothing at all before Sputnik", () => {
      // The hardest coverage floor in the project, and the whole reason this family is stated by
      // date rather than looked up.
      expect(Satellites.erasAt(new Date("1948-07-24T02:45:00Z"))).toEqual([])
      expect(Satellites.visibilityAt(new Date("1948-07-24T02:45:00Z"), PROVENCE).anythingInOrbit).toBe(false)
      expect(Satellites.visibilityAt(new Date("1957-10-03T23:00:00Z"), PROVENCE).anythingInOrbit).toBe(false)
      expect(Satellites.visibilityAt(new Date("1957-10-05T23:00:00Z"), PROVENCE).anythingInOrbit).toBe(true)
    })

    it("puts the Echo balloons in the sixties, where this project's own cases are", () => {
      // Deliberately visible 30-metre reflective balloons, announced in newspapers, crossing the
      // sky as brightly as the brightest stars — and up throughout the wave years.
      expect(Satellites.erasAt(new Date("1965-07-01T03:45:00Z")).map(era => era.id)).toContain("echo")
      expect(Satellites.erasAt(new Date("1964-04-25T00:45:00Z")).map(era => era.id)).toContain("echo")
      // And gone before the seventies, which is what makes the window mean something.
      expect(Satellites.erasAt(new Date("1975-01-01T00:00:00Z")).map(era => era.id)).not.toContain("echo")
    })

    it("bounds the Iridium flares on both sides", () => {
      // A phenomenon with a hard start AND a hard end: the replacement satellites have no mirror
      // panels, so a flare reported in 2021 was not one.
      expect(Satellites.erasAt(new Date("2005-06-01T21:00:00Z")).map(era => era.id)).toContain("iridium-flares")
      expect(Satellites.erasAt(new Date("1996-06-01T21:00:00Z")).map(era => era.id)).not.toContain("iridium-flares")
      expect(Satellites.erasAt(new Date("2021-06-01T21:00:00Z")).map(era => era.id)).not.toContain("iridium-flares")
    })

    it("starts the Starlink trains at the first launch and not before", () => {
      expect(Satellites.erasAt(new Date("2019-05-23T21:00:00Z")).map(era => era.id)).not.toContain("starlink-trains")
      expect(Satellites.erasAt(new Date("2019-05-25T21:00:00Z")).map(era => era.id)).toContain("starlink-trains")
    })

    it("gives every era a name in both languages and a window that makes sense", () => {
      for (const era of SATELLITE_ERAS) {
        expect(era.name.en.length).toBeGreaterThan(0)
        expect(era.name.fr.length).toBeGreaterThan(0)
        expect(Date.parse(era.from)).not.toBeNaN()
        expect(Date.parse(era.from)).toBeGreaterThanOrEqual(Date.parse(Satellites.FIRST_ORBIT))
        if (era.to !== undefined) expect(Date.parse(era.to)).toBeGreaterThan(Date.parse(era.from))
      }
    })
  })

  describe("over a real place on a real night", () => {
    it("finds the window just after dusk, and closes it later on", () => {
      // Provence in July: an hour after sunset low orbit is still catching the Sun, and by the
      // middle of the night it is not. The same night, the same place, opposite answers — which is
      // the entire usefulness of this file.
      const dusk = Satellites.visibilityAt(new Date("2020-07-15T20:45:00Z"), PROVENCE)
      const deepNight = Satellites.visibilityAt(new Date("2020-07-16T00:30:00Z"), PROVENCE)
      expect(dusk.sunAltitudeDeg).toBeLessThan(0)
      expect(dusk.lowOrbitLit).toBe(true)
      expect(deepNight.lowOrbitLit).toBe(false)
      expect(deepNight.shadowHeightKm!).toBeGreaterThan(dusk.shadowHeightKm!)
    })

    it("reports everything lit in broad daylight, and leaves the seeing to the sky", () => {
      const noon = Satellites.visibilityAt(new Date("2020-07-15T12:00:00Z"), PROVENCE)
      expect(noon.sunAltitudeDeg).toBeGreaterThan(0)
      expect(noon.shadowHeightKm).toBe(0)
      expect(noon.lowOrbitLit).toBe(true)
      expect(noon.anythingInOrbit).toBe(true)
      expect(noon.eras.length).toBeGreaterThan(0)
    })

    it("keeps the flare that beat a daylit sky distinguishable from the satellite that did not", () => {
      // The whole point of storing a magnitude per era rather than a yes or no. A daylit sky hides
      // everything fainter than about -4; an Iridium flare reached -8 and was genuinely watched at
      // noon, while a Starlink train at magnitude 1 was not and never could be.
      const iridium = SATELLITE_ERAS.find(era => era.id === "iridium-flares")!
      const starlink = SATELLITE_ERAS.find(era => era.id === "starlink-trains")!
      const daylightLimit = -4
      expect(iridium.peakMagnitude).toBeLessThan(daylightLimit)
      expect(starlink.peakMagnitude).toBeGreaterThan(daylightLimit)
    })
  })
})
