import { describe, expect, it } from "vitest"
import type { BodyJson } from "../../../src/engine/interpretation/Interpretation.js"
import { ReadingSensitivity } from "../../../src/engine/interpretation/ReadingSensitivity.js"
import { Provenance } from "../../../src/engine/persistence/Provenance.js"
import { fromSightingJson, type SightingRecordingJson } from "../../../src/engine/persistence/sightingJson.js"

const DEG = Math.PI / 180

/** A phenomenon a degree across, 10° up, due north at first and then, when `moving`, 10° further east a second later; or where
 * `azimuths` puts it at each of as many seconds. */
const account = (moving = false, azimuths?: number[]) => fromSightingJson({
  version: 4,
  place: { locations: [{ lat: 48, lng: 2 }] },
  timeline: {
    keyframes: (azimuths ? azimuths.map((_, i) => i * 1000) : [0, 1000]).map(t => ({
      t,
      shapes: [{
        sourceId: "ufo",
        shape: {
          kind: "oval", bounds: { x: 0, y: 0, width: 1, height: 1 }, color: "#fff", angle: 0, transparency: 0, haloScale: 0, selected: false,
          angular: { widthDeg: 1, heightDeg: 1 },
          aim: { azimuthDeg: azimuths ? azimuths[t / 1000] : moving ? t / 100 : 0, altitudeDeg: 10 }
        }
      }]
    }))
  },
  observerTrack: { keyframes: [{ t: 0, pose: { lat: 48, lng: 2, elevationM: 0, headingDeg: 0, pitchDeg: 10, fovDeg: 60 } }] }
} as unknown as SightingRecordingJson)

/** A sphere 100 m off where the phenomenon is, as wide as it looks there. */
const sphere = (moving = false, azimuthOffDeg = 0): BodyJson => ({
  id: "balloon",
  model: { id: "ellipsoid" },
  explains: ["ufo"],
  track: [0, 1000, 2000].map(t => {
    const diameter = 2 * 100 * Math.tan(0.5 * DEG)
    return { t, azimuthDeg: (moving ? t / 100 : 0) + azimuthOffDeg, altitudeDeg: 10, distanceM: 100, sizeM: { widthM: diameter, lengthM: diameter, heightM: diameter } }
  })
} as BodyJson)

/** The reading's provenance: its body's whole track supposed, or nothing said of it. */
const supposed = () => Provenance.strip({ interpretation: { bodies: [{ track: { value: [], basis: "assumed" } }] } }).provenance

describe("How much a reading's likeness owes to what it chose", () => {
  it("measures how far each free value can be turned before the account contradicts it", () => {
    const result = new ReadingSensitivity(account(), [0, 1000]).of([sphere()], supposed())
    expect(result.holds).toBe(true)
    expect(result.freeBodies).toEqual(["balloon"])
    const margin = (knob: string) => result.margins.find(m => m.knob === knob)!
    // A direction is contradicted beyond a degree (see BodyConfrontation.DIRECTION_TOLERANCE_DEG): about a degree each way, a little more
    // across at 10° up.
    expect(margin("azimuth").upper).toBeGreaterThan(0.9)
    expect(margin("azimuth").upper).toBeLessThan(1.2)
    expect(margin("azimuth").lower).toBeLessThan(-0.9)
    expect(margin("altitude").upper).toBeCloseTo(1, 0)
    // A size beyond half again either way: as far, or as large, by the same factor.
    expect(margin("distance").upper).toBeCloseTo(1.5, 1)
    expect(margin("distance").lower).toBeCloseTo(1 / 1.5, 1)
    expect(margin("size").upper).toBeCloseTo(1.5, 1)
    // Still: when it is does not matter, as far as the search looks one way. Moved later, it is not there yet when it is first seen.
    expect(margin("time").lowerReached).toBe(true)
    expect(margin("time").upper).toBeLessThan(50)
    expect(result.margins[0].share).toBeLessThanOrEqual(result.margins[result.margins.length - 1].share)
  })

  it("finds a moving likeness tied to its timing", () => {
    const result = new ReadingSensitivity(account(true), [0, 500, 1000]).of([sphere(true)], supposed())
    const time = result.margins.find(m => m.knob === "time")!
    // 10° a second, a degree's tolerance: a tenth of a second off and it points elsewhere.
    expect(time.lower).toBeGreaterThan(-200)
    expect(time.lowerReached).toBe(false)
  })

  it("turns nothing the reading did not choose", () => {
    const result = new ReadingSensitivity(account(), [0, 1000]).of([sphere()], Provenance.empty())
    expect(result.holds).toBe(true)
    expect(result.fixedBodies).toEqual(["balloon"])
    expect(result.margins).toEqual([])
  })

  it("has no margin to measure for a reading that does not hold as written", () => {
    const result = new ReadingSensitivity(account(), [0, 1000]).of([sphere(false, 5)], supposed())
    expect(result.holds).toBe(false)
    expect(result.medianSeparationDeg).toBeCloseTo(5 * Math.cos(10 * DEG), 0)
    expect(result.margins).toEqual([])
  })

  it("keeps, for a reading that reproduces part of the account, how much of it it does", () => {
    // Said due north, then 2° east twice: a body that stays due north reproduces the first instant only.
    const result = new ReadingSensitivity(account(false, [0, 2, 2]), [0, 1000, 2000]).of([sphere()], supposed())
    expect(result.holds).toBe(false)
    expect(result.agreement).toBeCloseTo(1 / 3, 6)
    expect(result.margins.length).toBeGreaterThan(0)
    // Turned 2° east, it reproduces the two later instants and loses the first: it was not at its best.
    expect(result.better).toMatchObject({ bodyId: "balloon", knob: "azimuth", agreement: 2 / 3 })
    expect(result.better!.amount).toBeGreaterThan(0)
  })

  it("has nothing to confront when no body explains what the account draws", () => {
    const result = new ReadingSensitivity(account(), [0, 1000]).of([{ ...sphere(), explains: [] }], supposed())
    expect(result.instants).toBe(0)
    expect(result.holds).toBe(false)
  })
})
