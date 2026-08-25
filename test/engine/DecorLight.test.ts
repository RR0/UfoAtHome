import { describe, expect, it } from "vitest"
import { isLightOnAt, lightOnFractionBetween, resolveDecorPlacementAt } from "../../src/engine/model/Decor.js"
import type { DecorLight, DecorObject } from "../../src/engine/model/Decor.js"
import { LightRigs } from "../../src/engine/model/LightRig.js"

function flashing(perMinute: number, dutyCycle: number, phase = 0): DecorLight {
  return { id: "l", offsetM: { x: 0, y: 0, z: 0 }, color: "#fff", pattern: { kind: "flash", perMinute, dutyCycle, phase } }
}

const steady: DecorLight = { id: "s", offsetM: { x: 0, y: 0, z: 0 }, color: "#fff", pattern: { kind: "steady" } }

describe("DecorLight patterns", () => {
  it("a steady lamp is lit, always and entirely", () => {
    expect(isLightOnAt(steady, 0)).toBe(true)
    expect(isLightOnAt(steady, 987_654)).toBe(true)
    expect(lightOnFractionBetween(steady, 0, 10_000)).toBe(1)
  })

  it("a flasher is a square wave, not a fade — which is what puts dots on a streak", () => {
    // 60 a minute at half duty: on for the first 500 ms of every second, off for the rest.
    const light = flashing(60, 0.5)
    expect(isLightOnAt(light, 0)).toBe(true)
    expect(isLightOnAt(light, 400)).toBe(true)
    expect(isLightOnAt(light, 600)).toBe(false)
    expect(isLightOnAt(light, 1400)).toBe(true)
  })

  it("integrates to exactly the duty cycle over a whole number of cycles", () => {
    for (const duty of [0.01, 0.18, 0.5, 0.9]) {
      expect(lightOnFractionBetween(flashing(45, duty), 0, 60_000)).toBeCloseTo(duty, 9)
    }
  })

  it("never loses a strobe between two samples, however coarse they are", () => {
    // The reason this exists. A wingtip strobe is lit for a hundredth of its cycle; asking "is it
    // on?" once per frame would miss it almost every time, and the dots it did draw would be an
    // artefact of the sampling rate rather than of the light.
    const strobe = flashing(60, 0.01)
    let integrated = 0
    // Ten seconds sampled at a lazy 250 ms — a quarter of a period, 25 times the flash itself.
    for (let t = 0; t < 10_000; t += 250) integrated += lightOnFractionBetween(strobe, t, t + 250) * 250
    // Ten flashes of 10 ms each: 100 ms of light, recovered exactly.
    expect(integrated).toBeCloseTo(100, 6)
  })

  it("phase separates two lamps that must not fire together", () => {
    const port = flashing(60, 0.1, 0)
    const starboard = flashing(60, 0.1, 0.5)
    expect(isLightOnAt(port, 0)).toBe(true)
    expect(isLightOnAt(starboard, 0)).toBe(false)
    expect(isLightOnAt(starboard, 500)).toBe(true)
  })

  it("a lamp that is never lit stays dark, and an impossible rate does not divide by zero", () => {
    expect(lightOnFractionBetween(flashing(60, 0), 0, 10_000)).toBe(0)
    expect(lightOnFractionBetween(flashing(0, 0.5), 0, 10_000)).toBe(0)
  })

  it("clamps a duty cycle stated outside its own range", () => {
    expect(lightOnFractionBetween(flashing(60, 5), 0, 10_000)).toBeCloseTo(1, 9)
    expect(lightOnFractionBetween(flashing(60, -1), 0, 10_000)).toBe(0)
  })
})

describe("DecorObject placement over time", () => {
  const still: DecorObject = { id: "d", kind: "building", eastM: 10, northM: -20, headingDeg: 45 }

  it("scenery without a track stays where it was put, at ground level", () => {
    expect(resolveDecorPlacementAt(still, 5000)).toEqual({ eastM: 10, northM: -20, altitudeM: 0, headingDeg: 45 })
  })

  it("interpolates a crossing, altitude included", () => {
    const plane: DecorObject = {
      id: "p",
      kind: "aircraft",
      eastM: 0,
      northM: 0,
      track: [
        { t: 0, eastM: -4000, northM: 2000, altitudeM: 3000, headingDeg: 90 },
        { t: 20_000, eastM: 4000, northM: 2000, altitudeM: 3000, headingDeg: 90 }
      ]
    }
    expect(resolveDecorPlacementAt(plane, 10_000)).toEqual({ eastM: 0, northM: 2000, altitudeM: 3000, headingDeg: 90 })
    // Clamped at both ends rather than extrapolated: the recording says nothing beyond them.
    expect(resolveDecorPlacementAt(plane, -5000).eastM).toBe(-4000)
    expect(resolveDecorPlacementAt(plane, 99_000).eastM).toBe(4000)
  })

  it("a single keyframe is a still object placed somewhere — including above the ground", () => {
    const hovering: DecorObject = {
      id: "h",
      kind: "aircraft",
      eastM: 0,
      northM: 15,
      track: [{ t: 0, eastM: 200, northM: -50, altitudeM: 400, headingDeg: 270 }]
    }
    // Whatever the instant, and never the unused static fields it was created with.
    for (const t of [0, 5000, 99_000]) {
      expect(resolveDecorPlacementAt(hovering, t)).toEqual({ eastM: 200, northM: -50, altitudeM: 400, headingDeg: 270 })
    }
  })

  it("holds a heading rather than blending it", () => {
    const turning: DecorObject = {
      id: "p",
      kind: "aircraft",
      eastM: 0,
      northM: 0,
      track: [
        { t: 0, eastM: 0, northM: 0, headingDeg: 350 },
        { t: 1000, eastM: 100, northM: 0, headingDeg: 10 }
      ]
    }
    // Blending would sweep 350 -> 10 the long way round, through south. Nothing here knows which
    // way it actually turned, so it states neither.
    expect(resolveDecorPlacementAt(turning, 500).headingDeg).toBe(350)
  })
})

describe("LightRigs", () => {
  it("offers only the rigs that make sense on a kind", () => {
    expect(LightRigs.forKind("aircraft").map(r => r.id)).toEqual(["airliner", "helicopter"])
    expect(LightRigs.forKind("vehicle").map(r => r.id)).toEqual(["car-headlights", "car-hazards", "emergency-beacons"])
    expect(LightRigs.forKind("tree")).toEqual([])
  })

  it("gives every object its own lamps, so editing one never edits another's", () => {
    const a = LightRigs.byId("airliner")!.create()
    const b = LightRigs.byId("airliner")!.create()
    a[0].color = "#000000"
    expect(b[0].color).not.toBe("#000000")
  })

  it("states flash rates inside the ranges real lights are required to keep", () => {
    for (const rig of LightRigs.forKind("aircraft")) {
      for (const light of rig.create()) {
        if (light.pattern.kind !== "flash") continue
        // Aircraft anticollision lights: 40 to 100 flashes a minute.
        expect(light.pattern.perMinute).toBeGreaterThanOrEqual(40)
        expect(light.pattern.perMinute).toBeLessThanOrEqual(100)
      }
    }
    for (const light of LightRigs.byId("car-hazards")!.create()) {
      if (light.pattern.kind !== "flash") continue
      // Road vehicle hazard flashers: 60 to 120 a minute.
      expect(light.pattern.perMinute).toBeGreaterThanOrEqual(60)
      expect(light.pattern.perMinute).toBeLessThanOrEqual(120)
    }
  })

  it("puts an airliner's two wingtip strobes out of phase with each other", () => {
    const lights = LightRigs.byId("airliner")!.create()
    const port = lights.find(l => l.id === "strobe-port")!.pattern
    const starboard = lights.find(l => l.id === "strobe-starboard")!.pattern
    expect(port.kind).toBe("flash")
    expect(starboard.kind).toBe("flash")
    if (port.kind === "flash" && starboard.kind === "flash") {
      expect(starboard.phase ?? 0).not.toBe(port.phase ?? 0)
    }
  })
})
