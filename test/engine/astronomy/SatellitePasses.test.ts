import { describe, expect, it } from "vitest"
import { eciToGeodetic, gstime, propagate, twoline2satrec } from "satellite.js"
import { SatelliteMagnitude, SatellitePasses } from "../../../src/engine/astronomy/SatellitePasses.js"
import { Satellites } from "../../../src/engine/astronomy/Satellites.js"
import { computeBodyPosition } from "../../../src/engine/astronomy/CelestialPositions.js"
import type { ElementSet, OrbitingObject } from "../../../src/engine/astronomy/TleArchive.js"

/** Real element sets, from the 2026-08-07 17:35 UTC snapshot of the ufowaves.org archive. */
const ISS_TLE = [
  "1 25544U 98067A   26219.02141064  .00004539  00000+0  89363-4 0  9991",
  "2 25544  51.6324  48.5171 0007293  20.5996 339.5285 15.49370096579630"
]
const STARLINK_TLE = [
  "1 44714U 19074B   26219.18328097  .00017756  00000+0  22608-3 0  9995",
  "2 44714  53.1486 183.1305 0006448  28.3616 331.7747 15.59441108372145"
]

const PARIS = { lat: 48.8566, lng: 2.3522, elevationM: 35 }

/** Reads a TLE the way scripts/build-tle-archive.ts stores it, float32 fields included. */
function stored(lines: string[]): ElementSet {
  const [line1, line2] = lines
  const dayOfYear = Number(line1.slice(20, 32))
  const bstarField = line1.slice(53, 61)
  return {
    norad: Number(line1.slice(2, 7)),
    epochMs: Date.UTC(2000 + Number(line1.slice(18, 20)), 0, 1) + (dayOfYear - 1) * 86_400_000,
    bstar: Math.fround(Number(`${bstarField[0]}.${bstarField.slice(1, 6)}e${bstarField.slice(6)}`.replace(" ", ""))),
    inclinationDeg: Math.fround(Number(line2.slice(8, 16))),
    raanDeg: Math.fround(Number(line2.slice(17, 25))),
    eccentricity: Math.fround(Number(`0.${line2.slice(26, 33)}`)),
    argOfPerigeeDeg: Math.fround(Number(line2.slice(34, 42))),
    meanAnomalyDeg: Math.fround(Number(line2.slice(43, 51))),
    meanMotion: Number(line2.slice(52, 63))
  }
}

function objectOf(lines: string[], name: string, extra: Partial<OrbitingObject> = {}): OrbitingObject {
  return { norad: Number(lines[0].slice(2, 7)), name, kind: "visual", elements: stored(lines), ageDays: 0, ...extra }
}

describe("SatellitePasses", () => {
  describe("the stored elements", () => {
    it("propagate to where the original TLE does, to well under a kilometre a day either side", () => {
      // The archive keeps angles and eccentricity as float32 and drops the fields SGP4 does not
      // use. This compares against satellite.js reading the untouched TLE text, so a storage or
      // conversion slip (a degree/radian mix, a lost epoch fraction) shows up as kilometres.
      const iss = objectOf(ISS_TLE, "ISS (ZARYA)")
      const fromStorage = SatellitePasses.satrecOf(iss)!
      const fromText = twoline2satrec(ISS_TLE[0], ISS_TLE[1])
      for (const hours of [-24, -6, 0, 6, 24]) {
        const date = new Date(iss.elements.epochMs + hours * 3_600_000)
        const a = propagate(fromStorage, date)!.position
        const b = propagate(fromText, date)!.position
        expect(Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z)).toBeLessThan(0.5)
      }
    })
  })

  describe("where an object stands in the witness's sky", () => {
    it("points its azimuth at the ground under the satellite", () => {
      // Independent of the library's own topocentric transform: the bearing of the great circle
      // from the witness to the sub-satellite point, by the textbook formula.
      const iss = objectOf(ISS_TLE, "ISS (ZARYA)")
      const passes = new SatellitePasses([iss])
      const satrec = SatellitePasses.satrecOf(iss)!
      let checked = 0
      for (let minutes = 0; minutes < 24 * 60 && checked < 5; minutes++) {
        const date = new Date(iss.elements.epochMs + minutes * 60_000)
        const [position] = passes.positionsAt(date, PARIS, 5)
        if (!position) continue
        const ground = eciToGeodetic(propagate(satrec, date)!.position, gstime(date))
        const φ1 = (PARIS.lat * Math.PI) / 180, φ2 = ground.latitude
        const Δλ = ground.longitude - (PARIS.lng * Math.PI) / 180
        const bearing = (Math.atan2(Math.sin(Δλ) * Math.cos(φ2),
          Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ)) * 180 / Math.PI + 360) % 360
        const difference = Math.abs(((position.azimuthDeg - bearing + 540) % 360) - 180)
        expect(difference).toBeLessThan(1)
        expect(position.heightKm).toBeGreaterThan(380)
        expect(position.heightKm).toBeLessThan(450)
        checked++
        minutes += 20
      }
      expect(checked).toBeGreaterThan(0)
    })

    it("puts the station in the Earth's shadow exactly where the shadow-height formula does", () => {
      // Two separate models of the same fact: Satellites.shadowHeightKm (a cylinder above the
      // witness, from the Sun's altitude alone) and satellite.js's umbra and penumbra from the
      // object's own position. Close to the zenith they must agree, except in the few tens of
      // kilometres of penumbra the cylinder does not have.
      const iss = objectOf(ISS_TLE, "ISS (ZARYA)")
      const passes = new SatellitePasses([iss])
      let compared = 0
      for (let seconds = 0; seconds < 3 * 86400; seconds += 20) {
        const date = new Date(iss.elements.epochMs + seconds * 1000)
        const [position] = passes.positionsAt(date, PARIS, 70)
        if (!position) continue
        const sunAltitude = computeBodyPosition("Sun", date, PARIS).altitudeDeg
        const margin = position.heightKm - Satellites.shadowHeightKm(sunAltitude)
        if (Math.abs(margin) < 60) continue
        expect(position.sunlitFraction > 0.5).toBe(margin > 0)
        compared++
      }
      expect(compared).toBeGreaterThan(0)
    })
  })

  describe("the Earth's shadow on an object", () => {
    it("is full behind the Earth, absent before it, and fades across the penumbra in between", () => {
      // The Sun along +x. An object 500 km up on the day side sees all of it; one on the night side,
      // straight behind the Earth, none; one crossing the edge of the cylinder of shadow goes through
      // every fraction in order, over the few tens of kilometres the penumbra is deep there.
      const sun = { x: 1, y: 0, z: 0 }
      const r = 6378.137 + 500
      expect(SatellitePasses.shadowFraction({ x: r, y: 0, z: 0 }, sun)).toBe(0)
      expect(SatellitePasses.shadowFraction({ x: -r, y: 0, z: 0 }, sun)).toBe(1)
      const fractions = [-40, -20, 0, 20, 40].map(dy => {
        const y = 6378.137 + dy
        return SatellitePasses.shadowFraction({ x: -Math.sqrt(r * r - y * y), y, z: 0 }, sun)
      })
      for (let i = 1; i < fractions.length; i++) expect(fractions[i]).toBeLessThanOrEqual(fractions[i - 1])
      expect(fractions[0]).toBeGreaterThan(0.9)
      expect(fractions[4]).toBeLessThan(0.1)
      expect(fractions[2]).toBeGreaterThan(0.1)
      expect(fractions[2]).toBeLessThan(0.9)
    })
  })

  describe("how bright it looks", () => {
    it("returns the standard magnitude at 1000 km, half lit", () => {
      const iss = objectOf(ISS_TLE, "ISS (ZARYA)", { stdMag: -2.5 })
      expect(SatelliteMagnitude.of(iss, 1000, 90, 1)).toBeCloseTo(-2.5, 2)
      // Fully lit and overhead at 420 km: brighter by the inverse square and the phase.
      expect(SatelliteMagnitude.of(iss, 420, 0, 1)).toBeCloseTo(-2.5 - 15.75 + 2.5 * Math.log10(420 * 420), 2)
    })

    it("gives a Starlink Mallama's mean at its operational height", () => {
      // 5.93 at 1000 km for the original design is 4.63 at 550 km, the brightness observers of
      // those satellites reported.
      const starlink = objectOf(STARLINK_TLE, "STARLINK-1008", { kind: "starlink", launch: "2019-11-11" })
      expect(SatelliteMagnitude.of(starlink, 550, 60, 1)).toBeCloseTo(4.63, 1)
      const visorSat = { ...starlink, launch: "2021-03-04" }
      expect(SatelliteMagnitude.of(visorSat, 1000, 60, 1)).toBeCloseTo(7.21, 2)
    })

    it("makes a Starlink still raising its orbit three magnitudes brighter, as trains are", () => {
      // Mallama et al. 2024: below 357 km a V2 Mini averages an apparent 2.68. Overhead at 300 km
      // that is 4.58 + 5·log10(0.3) = 1.96, where the operational average would say 4.6 and leave
      // the train, the most reported Starlink sight of all, undrawn in any twilight.
      const young = objectOf(STARLINK_TLE, "STARLINK-99999", { kind: "starlink", launch: "2025-01-24" })
      expect(SatelliteMagnitude.of(young, 300, 60, 1, 300)).toBeCloseTo(1.96, 1)
      expect(SatelliteMagnitude.of(young, 550, 60, 1, 550)).toBeCloseTo(7.21 + 5 * Math.log10(0.55), 2)
    })

    it("dims an object in the penumbra and says nothing of one in the umbra", () => {
      const iss = objectOf(ISS_TLE, "ISS (ZARYA)", { stdMag: -2.5 })
      expect(SatelliteMagnitude.of(iss, 1000, 90, 0.1)).toBeCloseTo(0, 2)
      expect(SatelliteMagnitude.of(iss, 1000, 90, 0)).toBeUndefined()
    })

    it("gives a BlueBird the magnitude measured for its own generation", () => {
      // Block 1 (2024-09-12) at 3.77 and BlueBird 6, the first Block 2, fainter at 4.32 although
      // larger: the order is the finding, and a single constellation value would have hidden it.
      const block1 = objectOf(ISS_TLE, "SPACEMOBILE-003", { launch: "2024-09-12" })
      const block2 = objectOf(ISS_TLE, "SPACEMOBILE-006", { launch: "2025-12-24" })
      expect(SatelliteMagnitude.of(block1, 1000, 60, 1)).toBeCloseTo(3.77, 2)
      expect(SatelliteMagnitude.of(block2, 1000, 60, 1)).toBeCloseTo(4.32, 2)
      expect(SatelliteMagnitude.of(block1, 520, 60, 1)).toBeCloseTo(3.77 + 5 * Math.log10(0.52), 2)
    })

    it("does not invent a brightness for an object nobody measured", () => {
      const unknown = objectOf(ISS_TLE, "HTV-X1")
      expect(SatelliteMagnitude.of(unknown, 600, 40, 1)).toBeUndefined()
    })
  })

  describe("a pass", () => {
    it("spans the minutes the object was up and lit, with its brightest instant inside", () => {
      const iss = objectOf(ISS_TLE, "ISS (ZARYA)", { stdMag: -2.5 })
      const passes = new SatellitePasses([iss])
      const start = new Date(iss.elements.epochMs)
      const found = passes.passesDuring(start, new Date(start.getTime() + 86_400_000), PARIS, 20)
      // One day from Paris: the station is up several times, once per orbit when its track comes
      // near enough, and each time is its own pass of a few minutes, never one pass spanning hours.
      expect(found.length).toBeGreaterThan(1)
      for (const pass of found) {
        const minutes = (pass.end.getTime() - pass.start.getTime()) / 60_000
        expect(minutes).toBeLessThan(15)
        expect(pass.peak.date.getTime()).toBeGreaterThanOrEqual(pass.start.getTime())
        expect(pass.peak.date.getTime()).toBeLessThanOrEqual(pass.end.getTime())
      }
      expect(Math.min(...found.map(pass => pass.peak.magnitude!))).toBeLessThan(0)
    })
  })
})
