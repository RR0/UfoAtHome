import { describe, expect, it } from "vitest"
import { Gait } from "../../src/engine/place/Gait.js"
import { Sighting } from "../../src/engine/model/Sighting.js"
import type { GaitOffset } from "../../src/engine/place/Gait.js"

/** Masse's own walk at Valensole, as public/demo-data/witness-valensole.json records it: due
 * south, 83.5 m in 55 s, so 1.52 m/s — an ordinary brisk walk. Then he stops. */
const METRES_PER_DEG_LAT = 111320

function walking(metresPerSecond: number, seconds: number, thenStandingSeconds = 0, instrumentId?: string): Sighting {
  const sighting = Sighting.create(undefined, [{ lat: 43.8378, lng: 5.993 }])
  sighting.instrumentId = instrumentId
  const pose = { elevationM: 0, pitchDeg: 0, fovDeg: 60 }
  sighting.witnessTrack.addKeyframe(0, { ...pose, lat: 43.8378, lng: 5.993 })
  const southDeg = (metresPerSecond * seconds) / METRES_PER_DEG_LAT
  sighting.witnessTrack.addKeyframe(seconds * 1000, { ...pose, lat: 43.8378 - southDeg, lng: 5.993 })
  if (thenStandingSeconds > 0) {
    sighting.witnessTrack.addKeyframe((seconds + thenStandingSeconds) * 1000, {
      ...pose,
      lat: 43.8378 - southDeg,
      lng: 5.993
    })
  }
  return sighting
}

/** Samples the whole walk finely enough to catch the extremes of a ~2 Hz cycle. */
function samples(gait: Gait, fromMs: number, toMs: number, stepMs = 5): GaitOffset[] {
  const out: GaitOffset[] = []
  for (let t = fromMs; t <= toMs; t += stepMs) out.push(gait.offsetAt(t))
  return out
}

describe("Gait", () => {
  it("is nothing at all for a recording that states no path", () => {
    expect(Gait.of(Sighting.create())).toBeUndefined()
  })

  it("is nothing for a witness who never left one spot", () => {
    const sighting = walking(0, 60)
    expect(Gait.of(sighting)).toBeUndefined()
  })

  it("steps about twice a second at an ordinary walking speed", () => {
    const gait = Gait.of(walking(1.52, 55))!
    // Counting the rises over the steady middle of the walk: the head rises once per step.
    const middle = samples(gait, 20_000, 30_000, 2)
    let rises = 0
    for (let index = 1; index < middle.length - 1; index++) {
      if (middle[index].upM > middle[index - 1].upM && middle[index].upM >= middle[index + 1].upM) rises++
    }
    // 10 s at 1.97 steps/s.
    expect(rises).toBeGreaterThanOrEqual(19)
    expect(rises).toBeLessThanOrEqual(20)
  })

  it("lifts the eye about five centimetres peak-to-peak at that speed", () => {
    const gait = Gait.of(walking(1.52, 55))!
    const middle = samples(gait, 20_000, 30_000)
    const highest = Math.max(...middle.map(offset => offset.upM))
    const lowest = Math.min(...middle.map(offset => offset.upM))
    expect(highest - lowest).toBeGreaterThan(0.045)
    expect(highest - lowest).toBeLessThan(0.06)
    // And about three and a half centimetres side to side, which is the smaller of the two.
    const east = middle.map(offset => offset.eastM)
    expect(Math.max(...east) - Math.min(...east)).toBeGreaterThan(0.03)
    expect(Math.max(...east) - Math.min(...east)).toBeLessThan(0.04)
  })

  it("rises further the faster the witness walks", () => {
    const strolling = samples(Gait.of(walking(0.8, 55))!, 20_000, 30_000)
    const brisk = samples(Gait.of(walking(1.9, 55))!, 20_000, 30_000)
    expect(Math.max(...brisk.map(offset => offset.upM))).toBeGreaterThan(
      2 * Math.max(...strolling.map(offset => offset.upM))
    )
  })

  it("sways across the direction of travel, never along it", () => {
    // Due south, so every centimetre of sway is east or west and none of it is north or south.
    const middle = samples(Gait.of(walking(1.52, 55))!, 20_000, 30_000)
    expect(Math.max(...middle.map(offset => Math.abs(offset.northM)))).toBe(0)
    expect(Math.max(...middle.map(offset => Math.abs(offset.eastM)))).toBeGreaterThan(0.015)
  })

  it("says nothing about a witness moving faster than anyone walks", () => {
    // A run (Zamora's own, at Socorro) and a vehicle are both gaits this does not claim to know.
    expect(Gait.of(walking(4, 20))).toBeUndefined()
    expect(Gait.of(walking(20, 20))).toBeUndefined()
  })

  it("starts and stops the eye where the path itself has it, with no jump", () => {
    const gait = Gait.of(walking(1.52, 55, 60))!
    for (const t of [0, 55_000]) {
      expect(Math.abs(gait.offsetAt(t).upM)).toBeLessThan(1e-9)
      expect(Math.abs(gait.offsetAt(t).eastM)).toBeLessThan(1e-9)
    }
    // And a millisecond either side of the stop is a millisecond's worth of movement, not a
    // centimetres-wide step.
    expect(Math.abs(gait.offsetAt(54_999).upM - gait.offsetAt(55_001).upM)).toBeLessThan(1e-4)
  })

  it("keeps counting steps across a keyframe the witness walked straight through", () => {
    // Two stretches at one speed: the second must pick the cycle up where the first left it, not
    // restart it — a witness does not break step because somebody wrote a keyframe down.
    const sighting = Sighting.create(undefined, [{ lat: 43.8378, lng: 5.993 }])
    const pose = { elevationM: 0, pitchDeg: 0, fovDeg: 60 }
    const perSecond = 1.52 / METRES_PER_DEG_LAT
    sighting.witnessTrack.addKeyframe(0, { ...pose, lat: 43.8378, lng: 5.993 })
    sighting.witnessTrack.addKeyframe(30_000, { ...pose, lat: 43.8378 - perSecond * 30, lng: 5.993 })
    sighting.witnessTrack.addKeyframe(60_000, { ...pose, lat: 43.8378 - perSecond * 60, lng: 5.993 })
    const gait = Gait.of(sighting)!
    // Crossing that keyframe must be no more of an event than any other two milliseconds of the
    // walk — which is a stronger statement than any threshold picked by hand, and the one that
    // actually fails if the cycle restarts.
    const across = Math.abs(gait.offsetAt(29_999).upM - gait.offsetAt(30_001).upM)
    let worstElsewhere = 0
    for (let t = 5_000; t < 55_000; t += 97) {
      if (Math.abs(t - 30_000) < 500) continue
      worstElsewhere = Math.max(worstElsewhere, Math.abs(gait.offsetAt(t - 1).upM - gait.offsetAt(t + 1).upM))
    }
    expect(across).toBeLessThanOrEqual(worstElsewhere)
    // And the walk really is at full stride there, so the check above is not passing on zeroes.
    expect(Math.abs(gait.offsetAt(30_000).upM)).toBeGreaterThan(0.02)
  })

  it("leaves an eye almost, but not quite, still", () => {
    // The head holds itself against the body's oscillation and the vestibulo-ocular reflex takes
    // most of what is left, so what a walking witness sees tips by a fraction of a degree — not by
    // nothing, and not by the couple of degrees their head really did turn through.
    const rolls = samples(Gait.of(walking(1.52, 55))!, 20_000, 30_000).map(offset => offset.rollDeg)
    const peakToPeak = Math.max(...rolls) - Math.min(...rolls)
    expect(peakToPeak).toBeGreaterThan(0.1)
    expect(peakToPeak).toBeLessThan(0.5)
  })

  it("gives a camera in the same walking hand the whole of it", () => {
    const eye = samples(Gait.of(walking(1.52, 55, 0, "eye"))!, 20_000, 30_000)
    const camera = samples(Gait.of(walking(1.52, 55, 0, "rectilinear-lens"))!, 20_000, 30_000)
    const swing = (rows: GaitOffset[], key: "rollDeg" | "pitchDeg" | "yawDeg") =>
      Math.max(...rows.map(row => row[key])) - Math.min(...rows.map(row => row[key]))
    expect(swing(camera, "rollDeg")).toBeGreaterThan(2.5)
    expect(swing(camera, "rollDeg")).toBeCloseTo(10 * swing(eye, "rollDeg"), 5)
    // And it is a rotation the instrument cancels, never a displacement: both are carried bodily by
    // the same legs, so the rise is identical whatever they were looking through.
    expect(swing(camera, "pitchDeg")).toBeGreaterThan(swing(eye, "pitchDeg"))
    expect(Math.max(...camera.map(row => row.upM))).toBeCloseTo(Math.max(...eye.map(row => row.upM)), 10)
  })

  it("rolls once per stride and nods twice, like the sway and the rise they follow", () => {
    const rows = samples(Gait.of(walking(1.52, 55, 0, "rectilinear-lens"))!, 20_000, 30_000, 2)
    const peaks = (values: number[]) => {
      let count = 0
      for (let index = 1; index < values.length - 1; index++) {
        if (values[index] > values[index - 1] && values[index] >= values[index + 1]) count++
      }
      return count
    }
    const nods = peaks(rows.map(row => row.pitchDeg))
    const rolls = peaks(rows.map(row => row.rollDeg))
    expect(nods).toBeGreaterThanOrEqual(2 * rolls - 1)
    expect(nods).toBeLessThanOrEqual(2 * rolls + 1)
    // The sway the roll goes with, and the rise the nod goes with, are on those same two rhythms.
    expect(rolls).toBe(peaks(rows.map(row => row.eastM)))
    expect(nods).toBe(peaks(rows.map(row => row.upM)))
  })

  it("gives the same answer every time it is asked", () => {
    const gait = Gait.of(walking(1.52, 55))!
    expect(gait.offsetAt(23_456)).toEqual(gait.offsetAt(23_456))
    expect(Gait.of(walking(1.52, 55))!.offsetAt(23_456)).toEqual(gait.offsetAt(23_456))
  })
})
