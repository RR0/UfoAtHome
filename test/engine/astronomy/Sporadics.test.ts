import { describe, expect, it } from "vitest"
import { Sporadics } from "../../../src/engine/astronomy/Sporadics.js"
import { computeBodyPosition } from "../../../src/engine/astronomy/CelestialPositions.js"
import * as Astronomy from "astronomy-engine"

/** Valensole, whose own sighting is one of this project's four. */
const PROVENCE = { lat: 43.8379, lng: 5.9822, elevationM: 591 }

describe("Sporadics", () => {
  describe("the apex of the Earth's way", () => {
    it("stands highest before dawn and lowest in the early evening", () => {
      // The one fact this file exists to reproduce, and it is real geometry rather than a curve
      // anybody fitted: the apex is ninety degrees of ecliptic longitude behind the Sun, so it
      // rises about six hours before it does. Every observer knows the consequence — rates climb
      // all night — and it discriminates between a streak at four in the morning and the same
      // streak at nine in the evening.
      const hourly = [18, 21, 0, 3, 6].map(hour => ({
        hour,
        altitude: Sporadics.apexPosition(new Date(Date.UTC(2024, 2, 20, hour, 0)), PROVENCE).altitudeDeg
      }))
      const evening = hourly.find(entry => entry.hour === 21)!.altitude
      const beforeDawn = hourly.find(entry => entry.hour === 6)!.altitude
      expect(beforeDawn).toBeGreaterThan(evening)
      expect(beforeDawn).toBeGreaterThan(0)
      // Monotonic through the night, which is what "climbs all night" means.
      const overnight = [21, 0, 3, 6].map(hour => hourly.find(entry => entry.hour === hour)!.altitude)
      for (let i = 1; i < overnight.length; i++) expect(overnight[i]).toBeGreaterThan(overnight[i - 1])
    })

    it("sits exactly a quarter turn from the Sun, which is what makes all of the above true", () => {
      // Checked against the Sun's own position through an independent path — astronomy-engine's own
      // ephemeris rather than this file's arithmetic restated. Both lie on the ecliptic, ninety
      // degrees apart in longitude, so their separation on the sky is ninety degrees, always.
      //
      // Compared AIRLESS. Both positions come back refracted, and refraction bends each by a
      // different amount because they sit at different altitudes — which distorts the separation
      // between them by up to half a degree, most of it astronomy-engine's own below-horizon
      // taper. Comparing the bent angles would be measuring the atmosphere, not the geometry.
      const airless = (position: { altitudeDeg: number; azimuthDeg: number }) => ({
        azimuthDeg: position.azimuthDeg,
        altitudeDeg: position.altitudeDeg + Astronomy.InverseRefraction("normal", position.altitudeDeg)
      })
      const separation = (a: { altitudeDeg: number; azimuthDeg: number }, b: { altitudeDeg: number; azimuthDeg: number }): number => {
        const toRadians = (degrees: number) => (degrees * Math.PI) / 180
        const dot =
          Math.sin(toRadians(a.altitudeDeg)) * Math.sin(toRadians(b.altitudeDeg)) +
          Math.cos(toRadians(a.altitudeDeg)) * Math.cos(toRadians(b.altitudeDeg)) * Math.cos(toRadians(a.azimuthDeg - b.azimuthDeg))
        return (Math.acos(Math.min(1, Math.max(-1, dot))) * 180) / Math.PI
      }
      for (const when of ["1965-07-01T03:45:00Z", "2024-03-20T00:00:00Z", "2024-09-23T18:00:00Z", "1948-07-24T02:45:00Z", "2024-01-03T00:00:00Z"]) {
        const date = new Date(when)
        const apart = separation(airless(Sporadics.apexPosition(date, PROVENCE)), airless(computeBodyPosition("Sun", date, PROVENCE)))
        // Within a hundredth of a degree, which is the Sun's apparent place carrying aberration and
        // light-time that the geometric apex direction does not.
        //
        // This tolerance is doing real work. At a twentieth of a degree it caught a genuine bug:
        // SunPosition returns the ecliptic OF DATE, and running it through the J2000 rotations
        // applied precession twice — a third of a degree in 2024, two thirds in 1948, and no
        // symptom anywhere else. Rotation_ECT_EQD is the transform that belongs there.
        expect(Math.abs(apart - 90)).toBeLessThan(0.01)
      }
    })
  })

  describe("how many an observer would really see", () => {
    it("reproduces the range observers report, and neither end of it by accident", () => {
      // Calibrated, and the only two numbers in this file that are: about two an hour with the apex
      // down, about ten with it overhead. Anything outside that is a model that has stopped
      // describing what people count.
      expect(Sporadics.observedRatePerHour(-30)).toBeCloseTo(2, 5)
      expect(Sporadics.observedRatePerHour(0)).toBeCloseTo(2, 5)
      expect(Sporadics.observedRatePerHour(90)).toBeCloseTo(10, 5)
      expect(Sporadics.observedRatePerHour(30)).toBeCloseTo(6, 5)
    })

    it("never falls to nothing, however low the apex", () => {
      // The floor, and the reason it is a separate constant rather than a bare sine: the antihelion
      // and toroidal sources go on producing meteors all evening. A sky that reported zero would be
      // back to the empty sky this file was written to fix.
      for (const altitude of [-90, -45, -1, 0]) expect(Sporadics.observedRatePerHour(altitude)).toBeGreaterThan(0)
    })

    it("loses more to a bright sky than a shower would", () => {
      // The steeper population index, made to matter. A magnitude of moonlight costs the sporadics
      // a third of their rate; the same magnitude costs the Perseids, at index 2.2, rather less.
      const dark = Sporadics.observedRatePerHour(60)
      const moonlit = Sporadics.observedRatePerHour(60, 5.5)
      expect(moonlit).toBeLessThan(dark)
      expect(moonlit).toBeCloseTo(dark / Sporadics.POPULATION_INDEX, 5)
    })
  })

  describe("what falls", () => {
    it("gives every sporadic its own radiant, which is what makes it sporadic", () => {
      // A shower is recognised by every streak tracing back to one point. The background is
      // recognised by their not doing so, and a scatter drawn from one shared radiant would render
      // the commonest meteors in the sky as the rarest kind.
      const meteors = Sporadics.schedule({ ratePerHour: 200, durationMs: 600_000, velocityKmS: 40, seed: 7 })
      expect(meteors.length).toBeGreaterThan(10)
      for (const meteor of meteors) expect(meteor.radiant).toBeDefined()
      const azimuths = meteors.map(meteor => meteor.radiant!.azimuthDeg)
      expect(Math.max(...azimuths) - Math.min(...azimuths)).toBeGreaterThan(180)
      // A radiant may sit below the horizon — that is real, and is how a low-radiant sporadic
      // climbs into view — but the METEOR must appear above it, because the rate these are drawn
      // from is already what an observer SEES. Scattering them over the whole sphere halved that
      // rate silently, and aimed the "show me one" control sixty-six degrees into the ground.
      expect(Math.min(...meteors.map(meteor => meteor.radiant!.altitudeDeg))).toBeLessThan(0)
      for (const meteor of meteors) {
        expect(Sporadics.appearanceOf(meteor).altitudeDeg).toBeGreaterThanOrEqual(-1e-6)
      }
      // Not "almost all": every one. The first attempt rejected bad draws and left one in thirty
      // under the ground, which is exactly the kind of nearly-right that a count of a hundred would
      // never have shown up in.
      expect(meteors.filter(meteor => Sporadics.appearanceOf(meteor).altitudeDeg < 0)).toHaveLength(0)
    })

    it("stays deterministic, like everything else that falls in this sky", () => {
      // Same rule as the showers: a paused recording must freeze, and a long exposure must be able
      // to integrate the same sky thousands of times without it shifting underneath.
      const options = { ratePerHour: 50, durationMs: 300_000, velocityKmS: 40, seed: 12345 }
      expect(Sporadics.schedule(options)).toEqual(Sporadics.schedule(options))
      expect(Sporadics.schedule({ ...options, seed: 12346 })).not.toEqual(Sporadics.schedule(options))
    })
  })
})
