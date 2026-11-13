import { describe, expect, it } from "vitest"
import { ObserverRide } from "../../../src/engine/place/ObserverRide.js"
import { CabinHearing } from "../../../src/engine/traffic/CabinHearing.js"
import type { ObserverVehicle } from "../../../src/engine/model/Vehicle.js"

const ride = (vehicle: Partial<ObserverVehicle>) => ({ kind: "van", ...vehicle }) as ObserverVehicle

describe("ObserverRide", () => {
  it("tells what is driven from what is flown, one word doing for both", () => {
    expect(ObserverRide.isRoad("van")).toBe(true)
    expect(ObserverRide.isRoad("business-jet")).toBe(false)
    expect(ObserverRide.roadOf(ride({ kind: "van" }))).toBe("van")
    expect(ObserverRide.roadOf(ride({ kind: "business-jet" }))).toBeUndefined()
    expect(ObserverRide.aircraftOf(ride({ kind: "business-jet" }))).toBe("business-jet")
    expect(ObserverRide.aircraftOf(ride({ kind: "van" }))).toBeUndefined()
    expect(ObserverRide.aircraftOf(undefined)).toBeUndefined()
  })

  it("takes more off the highs than the lows, as a wall does, and nearly nothing through an open window", () => {
    const closed = ObserverRide.insulationDb(ride({ kind: "van" }))
    expect(closed[0]).toBeLessThan(closed[closed.length - 1])
    const open = ObserverRide.insulationDb(ride({ kind: "van", windowsOpen: true }))
    expect(open.every((level, band) => level < closed[band])).toBe(true)
    // A fuselage is a thicker shell than any car's; a canopy is barely one at all.
    const fuselage = ObserverRide.insulationDb(ride({ kind: "airliner-narrow" }))
    const canopy = ObserverRide.insulationDb(ride({ kind: "glider" }))
    expect(fuselage.every((level, band) => level > closed[band])).toBe(true)
    expect(canopy.every((level, band) => level < closed[band])).toBe(true)
    // Nobody aboard anything hears the world whole.
    expect(ObserverRide.insulationDb(undefined).every(level => level === 0)).toBe(true)
  })

  it("lets all of an outdoor noise through to someone standing in it, and a fraction of it to someone inside", () => {
    expect(ObserverRide.transmission(undefined)).toBe(1)
    const van = ObserverRide.transmission(ride({ kind: "van" }))
    const jet = ObserverRide.transmission(ride({ kind: "business-jet" }))
    expect(van).toBeLessThan(0.2)
    expect(jet).toBeLessThan(van)
    expect(jet).toBeGreaterThan(0)
  })
})

describe("CabinHearing", () => {
  it("gives no voice to a road vehicle, which is heard as its cylinders instead", () => {
    expect(CabinHearing.voice(ride({ kind: "van" }))).toBeUndefined()
    expect(CabinHearing.voice(undefined)).toBeUndefined()
  })

  it("roars around the ear at what a passenger measures, neither placed nor shifted", () => {
    const voice = CabinHearing.voice(ride({ kind: "business-jet" }))!
    expect(voice).toMatchObject({ id: "observer:cabin", kind: "business-jet", inside: true, distanceKm: 0, dopplerRatio: 1 })
    // The figure of its class, the shell's loss being already in it: not taken off a second time.
    expect(voice.levelDbA).toBeCloseTo(CabinHearing.levelDbA("business-jet"), 6)
    expect(voice.bandAmplitudes.some(amplitude => amplitude > 0)).toBe(true)
  })

  it("is duller inside than the machine is outside: the shell keeps the rumble and stops the whine", () => {
    const voice = CabinHearing.voice(ride({ kind: "airliner-narrow" }))!
    const open = CabinHearing.voice(ride({ kind: "airliner-narrow", windowsOpen: true }))!
    // Both are played at the same loudness; what differs is where that loudness sits in the octaves.
    const share = (played: readonly number[]) => played[played.length - 1] / played[0]
    expect(share(voice.bandAmplitudes)).toBeLessThan(share(open.bandAmplitudes))
  })

  it("is louder in a machine the recording calls noisy, and quieter in one it calls quiet", () => {
    const ordinary = CabinHearing.levelDbA("airliner-narrow")
    expect(CabinHearing.levelDbA("airliner-narrow", 2)).toBeCloseTo(ordinary + 6.02, 1)
    expect(CabinHearing.levelDbA("airliner-narrow", 0.5)).toBeCloseTo(ordinary - 6.02, 1)
  })
})
