import { describe, expect, test } from "vitest"
import { DecorAircraftHearing } from "../../../src/engine/place/DecorAircraftHearing.js"
import type { DecorObject } from "../../../src/engine/model/Decor.js"
import type { Sighting } from "../../../src/engine/model/Sighting.js"

const ORIGIN = { lat: 48.85, lng: 2.35 }
const OBSERVER = { ...ORIGIN, heightM: 0 }
/** A calm night: what is heard is what the physics lets through, not what a town covers. */
const CALM = { ambientDbA: 30 }

/** The part of a recording the hearing reads: where it stands, how long it lasts, what it places. */
const recording = (...decor: Partial<DecorObject>[]) => ({
  event: { place: [ORIGIN], durationSeconds: 60 },
  observerTrack: { duration: 60000 },
  decor: decor.map((object, i) => ({ id: `a${i}`, kind: "aircraft", eastM: 0, northM: 0, ...object }))
}) as unknown as Sighting

/** Flies from 4 km west of the observer to 4 km east, 2000 m up, at 130 m/s, over the minute. */
const overhead: Partial<DecorObject> = {
  track: [
    { t: 0, eastM: -4000, northM: 0, altitudeM: 2000, headingDeg: 90 },
    { t: 60000, eastM: 4000, northM: 0, altitudeM: 2000, headingDeg: 90 }
  ]
}

describe("DecorAircraftHearing", () => {
  test("an aircraft that flies is heard, from where it was, and rising in pitch as it comes", () => {
    const hearing = new DecorAircraftHearing()
    const voices = hearing.voices(recording(overhead), 5000, OBSERVER, CALM)
    expect(voices).toHaveLength(1)
    expect(voices[0].kind).toBe("airliner-narrow")
    expect(voices[0].dopplerRatio).toBeGreaterThan(1)
    // It is coming from the west, and the sound that arrives left it earlier still.
    expect(voices[0].azimuthDeg).toBeGreaterThan(250)
    expect(voices[0].azimuthDeg).toBeLessThan(290)
  })

  test("it drops in pitch once it has gone by", () => {
    const voices = new DecorAircraftHearing().voices(recording(overhead), 50000, OBSERVER, CALM)
    expect(voices[0].dopplerRatio).toBeLessThan(1)
  })

  test("the sound is late: it is heard where the aircraft WAS", () => {
    const voices = new DecorAircraftHearing().voices(recording(overhead), 30000, OBSERVER, CALM)
    // At 30 s it is overhead; what arrives left it about nine seconds before, from the west, lower in the sky.
    expect(voices[0].azimuthDeg).toBeGreaterThan(180)
    expect(voices[0].azimuthDeg).toBeLessThan(360)
    expect(voices[0].elevationDeg).toBeLessThan(90)
  })

  test("the nearer it is the louder it is", () => {
    const hearing = new DecorAircraftHearing()
    const far = hearing.voices(recording(overhead), 1000, OBSERVER, CALM)[0]
    const near = hearing.voices(recording(overhead), 29000, OBSERVER, CALM)[0]
    expect(near.levelDbA).toBeGreaterThan(far.levelDbA)
  })

  test("a machine placed on the ground, or placed nowhere in flight, is heard of nobody", () => {
    expect(new DecorAircraftHearing().voices(recording({ eastM: 500 }), 1000, OBSERVER)).toEqual([])
    expect(DecorAircraftHearing.kindOf({ id: "x", kind: "aircraft", eastM: 0, northM: 0 } as DecorObject)).toBeUndefined()
  })

  test("a recording that says it is silent, or whose model says so, makes no noise", () => {
    expect(new DecorAircraftHearing().voices(recording({ ...overhead, aircraftSound: "silent" }), 5000, OBSERVER, CALM)).toEqual([])
    expect(new DecorAircraftHearing().voices(recording(overhead), 5000, OBSERVER, CALM, () => "silent")).toEqual([])
  })

  test("what the object says wins over its model, which wins over an airliner", () => {
    const decor = { id: "x", kind: "aircraft", eastM: 0, northM: 0, ...overhead } as DecorObject
    expect(DecorAircraftHearing.kindOf(decor)).toBe("airliner-narrow")
    expect(DecorAircraftHearing.kindOf(decor, "airliner-wide")).toBe("airliner-wide")
    expect(DecorAircraftHearing.kindOf({ ...decor, aircraftSound: "helicopter-light" }, "airliner-wide")).toBe("helicopter-light")
  })

  test("a vehicle placed in the air is not an aircraft", () => {
    expect(new DecorAircraftHearing().voices(recording({ ...overhead, kind: "vehicle" }), 5000, OBSERVER, CALM)).toEqual([])
  })

  test("an aircraft too far to be heard over the noise of the place is not played", () => {
    const far: Partial<DecorObject> = { track: [{ t: 0, eastM: 90000, northM: 0, altitudeM: 3000 }, { t: 60000, eastM: 100000, northM: 0, altitudeM: 3000 }] }
    expect(new DecorAircraftHearing().voices(recording(far), 5000, OBSERVER, { ambientDbA: 45 })).toEqual([])
  })

  test("a hovering aircraft placed up there, with a single keyframe, is heard", () => {
    const sitting: Partial<DecorObject> = { track: [{ t: 0, eastM: 1500, northM: 0, altitudeM: 800 }] }
    expect(new DecorAircraftHearing().voices(recording(sitting), 5000, OBSERVER, CALM)).toHaveLength(1)
  })
})
