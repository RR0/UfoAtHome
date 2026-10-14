import { describe, expect, it } from "vitest"
import { Headlights } from "../../../src/engine/model/Headlights.js"
import { resolveDecorHeadlightsAt } from "../../../src/engine/model/Decor.js"
import type { DecorObject } from "../../../src/engine/model/Decor.js"

const car = (overrides: Partial<DecorObject> = {}): DecorObject => ({ id: "car", kind: "vehicle", eastM: 0, northM: 0, ...overrides })

describe("Headlights", () => {
  it("has the five settings of a driver, and knows them", () => {
    expect(Headlights.MODES).toEqual(["off", "position", "dipped", "main", "fog"])
    expect(Headlights.isMode("main")).toBe(true)
    expect(Headlights.isMode("full")).toBe(false)
    expect(Headlights.isMode(undefined)).toBe(false)
  })

  it("lights the ground with a dipped beam, a main beam and the fog lamps only: off and the position lights light nothing", () => {
    expect(Headlights.BEAMS.off).toBeUndefined()
    expect(Headlights.BEAMS.position).toBeUndefined()
    for (const mode of ["dipped", "main", "fog"] as const) expect(Headlights.BEAMS[mode]!.candela).toBeGreaterThan(0)
  })

  it("makes the main beam far and narrow, the dipped beam wider and lower, and the fog lamps the lowest and widest", () => {
    const { dipped, main, fog } = Headlights.BEAMS
    expect(main!.candela).toBeGreaterThan(dipped!.candela)
    expect(main!.halfAngleDeg).toBeLessThan(dipped!.halfAngleDeg)
    expect(main!.pitchDeg).toBeLessThan(dipped!.pitchDeg)
    expect(fog!.halfAngleDeg).toBeGreaterThan(dipped!.halfAngleDeg)
    expect(fog!.pitchDeg).toBeGreaterThan(dipped!.pitchDeg)
    expect(fog!.candela).toBeLessThan(dipped!.candela)
  })

  it("holds the last setting a keyframe gave, and the first before any", () => {
    const keys = [{ t: 1000, mode: "dipped" as const }, { t: 5000, mode: "main" as const }, { t: 9000, mode: "off" as const }]
    expect(Headlights.at("position", keys, 0)).toBe("dipped")
    expect(Headlights.at("position", keys, 1000)).toBe("dipped")
    expect(Headlights.at("position", keys, 4999)).toBe("dipped")
    expect(Headlights.at("position", keys, 5000)).toBe("main")
    expect(Headlights.at("position", keys, 12000)).toBe("off")
    expect(Headlights.at("position", [], 0)).toBe("position")
    expect(Headlights.at(undefined, undefined, 0)).toBeUndefined()
  })

  it("puts the dipped beam on at dusk for a vehicle that is not told, and nothing by day", () => {
    expect(Headlights.auto(30)).toBe("off")
    expect(Headlights.auto(-0.5)).toBe("off")
    expect(Headlights.auto(-3)).toBe("dipped")
    expect(Headlights.auto(-40)).toBe("dipped")
  })

  it("lights the lamps for any setting but off", () => {
    expect(Headlights.lamps("off")).toBe(false)
    for (const mode of ["position", "dipped", "main", "fog"] as const) expect(Headlights.lamps(mode)).toBe(true)
  })
})

describe("resolveDecorHeadlightsAt", () => {
  it("says what the old `lit` switch said where nothing else is stated: lit is the dipped beam", () => {
    expect(resolveDecorHeadlightsAt(car({ lit: true }), 0)).toBe("dipped")
    expect(resolveDecorHeadlightsAt(car({ lit: false }), 0)).toBe("off")
    expect(resolveDecorHeadlightsAt(car(), 0)).toBe("off")
  })

  it("follows the lit keyframes of a recording written before the settings", () => {
    const old = car({ litKeyframes: [{ t: 0, lit: false }, { t: 3000, lit: true }] })
    expect(resolveDecorHeadlightsAt(old, 1000)).toBe("off")
    expect(resolveDecorHeadlightsAt(old, 4000)).toBe("dipped")
  })

  it("prefers the setting a recording states to the lit switch, and its keyframes to both", () => {
    expect(resolveDecorHeadlightsAt(car({ lit: false, headlights: "position" }), 0)).toBe("position")
    expect(resolveDecorHeadlightsAt(car({ lit: true, headlights: "main", headlightKeyframes: [{ t: 2000, mode: "fog" }] }), 0)).toBe("fog")
    expect(resolveDecorHeadlightsAt(car({ headlights: "main", headlightKeyframes: [{ t: 0, mode: "dipped" }, { t: 2000, mode: "main" }] }), 2500)).toBe("main")
  })
})
