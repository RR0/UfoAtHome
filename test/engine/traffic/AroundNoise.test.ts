import { describe, expect, test } from "vitest"
import { Arounds } from "../../../src/engine/model/Around.js"
import { AmbientNoise } from "../../../src/engine/traffic/AmbientNoise.js"
import { AroundNoise } from "../../../src/engine/traffic/AroundNoise.js"
import { fromSightingJson, toSightingJson, type SightingRecordingJson } from "../../../src/engine/persistence/sightingJson.js"

const CALM = { windSpeed: 0, precipitationType: "none", precipitationIntensity: 0 }

describe("what is around the observer", () => {
  describe("as a file says it", () => {
    test("keeps the figures that are figures, and nothing when nothing is left", () => {
      expect(Arounds.read({ cars: 6, trucks: -1, people: "many", talking: 2, roads: [{ distanceM: 50, vehiclesPerMinute: 10, speedKmh: 70 }, { distanceM: 20 }] }))
        .toEqual({ cars: 6, talking: 2, roads: [{ distanceM: 50, vehiclesPerMinute: 10, speedKmh: 70 }] })
      expect(Arounds.read({ cars: Number.NaN, roads: [] })).toBeUndefined()
      expect(Arounds.read(undefined)).toBeUndefined()
    })

    test("is written to a recording and read back, and not written when nothing is said", () => {
      const recording: SightingRecordingJson = { version: 4, timeline: { keyframes: [] }, around: { cars: 6, withinM: 150, roads: [{ distanceM: 40, vehiclesPerMinute: 12, trucksPerMinute: 1 }] } }
      const written = JSON.parse(JSON.stringify(toSightingJson(fromSightingJson(recording))))
      expect(written.around).toEqual(recording.around)
      const none = JSON.parse(JSON.stringify(toSightingJson(fromSightingJson({ version: 4, timeline: { keyframes: [] } }))))
      expect(none.around).toBeUndefined()
    })
  })

  describe("as it sounds, by CNOSSOS-EU and Pearsons", () => {
    test("a car at 50 km/h is some 98 dB(A) of power, which is 73 dB(A) at 7.5 m from it: what a car in a town measures", () => {
      const power = AroundNoise.vehiclePowerDbA(false, 50)
      expect(power).toBeCloseTo(98.4, 1)
      expect(power - 10 * Math.log10(2 * Math.PI * 7.5 * 7.5)).toBeCloseTo(73, 0)
    })

    test("a truck is some 9 dB louder than a car, and both louder the faster they go", () => {
      expect(AroundNoise.vehiclePowerDbA(true, 50) - AroundNoise.vehiclePowerDbA(false, 50)).toBeCloseTo(8.8, 0)
      expect(AroundNoise.vehiclePowerDbA(false, 90)).toBeGreaterThan(AroundNoise.vehiclePowerDbA(false, 50) + 6)
    })

    test("a road is a line: twice as many vehicles is 3 dB, twice as far is 3 dB less", () => {
      const road = (vehiclesPerMinute: number, distanceM: number) => AroundNoise.dbA({ roads: [{ distanceM, vehiclesPerMinute }] })
      expect(road(20, 50) - road(10, 50)).toBeCloseTo(10 * Math.log10(2), 6)
      expect(road(10, 50) - road(10, 100)).toBeCloseTo(10 * Math.log10(2), 6)
      // A busy street of a thousand vehicles an hour, heard from 10 m: some 66 dB(A).
      expect(road(1000 / 60, 10)).toBeCloseTo(66.4, 0)
    })

    test("things counted at once are as loud as so many spread over the disc they were counted in: twice as many, 3 dB", () => {
      expect(AroundNoise.dbA({ cars: 12 }) - AroundNoise.dbA({ cars: 6 })).toBeCloseTo(10 * Math.log10(2), 6)
      // The wider the disc for as many, the quieter: they are farther off on average.
      expect(AroundNoise.dbA({ cars: 6, withinM: 400 })).toBeLessThan(AroundNoise.dbA({ cars: 6, withinM: 200 }))
    })

    test("people talking near by are heard, people silent are not", () => {
      // Two talking within 10 m: some 43 dB(A), a conversation at the next table.
      expect(AroundNoise.dbA({ talking: 2, withinM: 10 })).toBeCloseTo(43.3, 0)
      expect(AroundNoise.dbA({ people: 5 })).toBe(-Infinity)
      expect(AroundNoise.dbA({ talking: 2, withinM: 10 }, false)).toBe(-Infinity)
    })

    test("the bed of the vehicles has their spectrum, as the air carries it, whose root sum of squares is one", () => {
      const shape = AroundNoise.vehicleShape({ cars: 6 })!
      expect(Math.hypot(...shape)).toBeCloseTo(1, 9)
      // A car's noise is a rumble with a tyre's roar: most of it under 2 kHz, little at 8.
      expect(shape[7]).toBeLessThan(shape[4])
      expect(AroundNoise.vehicleShape({ talking: 3 })).toBeUndefined()
    })
  })

  describe("as the ambient noise an aircraft is heard against", () => {
    test("adds to the weather's as energies, and a quiet place stays quiet when nothing is said", () => {
      expect(AmbientNoise.dbA(CALM)).toBeCloseTo(AmbientNoise.dbA(CALM, undefined), 9)
      const town = AmbientNoise.dbA(CALM, { cars: 6 })
      expect(town).toBeGreaterThan(55)
      expect(town).toBeCloseTo(10 * Math.log10(10 ** (AmbientNoise.dbA(CALM) / 10) + 10 ** (AroundNoise.dbA({ cars: 6 }) / 10)), 6)
    })

    test("is not played as a bed, which was a hiss over the aircraft; an aircraft over it is referred as over a field", () => {
      expect(AmbientNoise.AROUND_BED_PLAYED).toBe(false)
      const street = { roads: [{ distanceM: 50, vehiclesPerMinute: 4 }] }
      expect(AmbientNoise.aroundBedRms(street)).toBe(0)
      // An aircraft at the street's level is referred to the faint minimum raised as far as the street stands over the base: as loud as over a field.
      const level = AroundNoise.dbA(street)
      expect(AmbientNoise.referenceAmplitude(CALM, street)).toBeCloseTo(AmbientNoise.MINIMUM_REFERENCE * 10 ** ((level - AmbientNoise.BASE_DB_A) / 20), 9)
    })

    test("a road's noise is spread as vehicles' is, mostly from 500 Hz to 2 kHz: it masks an aircraft's mids and leaves its rumble", () => {
      const field = AmbientNoise.shapeDb(CALM)
      field.forEach((level, band) => expect(level).toBeCloseTo(AmbientNoise.OUTDOOR_SHAPE_DB[band] - 10 * Math.log10(AmbientNoise.OUTDOOR_SHAPE_DB.reduce((sum, l) => sum + 10 ** (l / 10), 0)), 6))
      const town = AmbientNoise.shapeDb(CALM, { roads: [{ distanceM: 50, vehiclesPerMinute: 10 }] })
      expect(10 * Math.log10(town.reduce((sum, level) => sum + 10 ** (level / 10), 0))).toBeCloseTo(0, 6)
      // Against the outdoor shape, the town's has less in the lows and more at a kilohertz.
      expect(town[0]).toBeLessThan(field[0] - 6)
      expect(town[4]).toBeGreaterThan(field[4] + 3)
    })

    test("says whether a bed is played: a wind or rain; not a calm field, nor what is around, which is not played", () => {
      expect(AmbientNoise.bedPlays(CALM)).toBe(false)
      expect(AmbientNoise.bedPlays({ ...CALM, windSpeed: 6 })).toBe(true)
      expect(AmbientNoise.bedPlays(CALM, { cars: 3 })).toBe(false)
    })
  })
})
