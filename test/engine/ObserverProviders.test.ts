import { describe, expect, it } from "vitest"
import { ObserverProviders } from "../../src/engine/observer/ObserverProviders.js"
import { Perceptions } from "../../src/engine/observer/Perception.js"

const apply = (matrix: readonly number[], rgb: number[]) => [0, 1, 2].map(row => matrix[row * 3] * rgb[0] + matrix[row * 3 + 1] * rgb[1] + matrix[row * 3 + 2] * rgb[2])

describe("ObserverProviders", () => {
  it("leaves a recording that states nothing untouched", () => {
    expect(Perceptions.isNone(ObserverProviders.perceptionOf(undefined))).toBe(true)
    expect(Perceptions.isNone(ObserverProviders.perceptionOf({ "color-vision": { type: "normal" } }))).toBe(true)
  })

  it("keeps greys grey for every colour deficiency, which is what the published matrices do", () => {
    for (const type of ["protan", "deutan", "tritan"]) {
      const grey = apply(ObserverProviders.perceptionOf({ "color-vision": { type } }).colorMatrix, [0.5, 0.5, 0.5])
      for (const channel of grey) expect(channel, type).toBeCloseTo(0.5, 2)
    }
  })

  it("makes a deuteranope see red and green alike, and scales the effect with severity", () => {
    const full = ObserverProviders.perceptionOf({ "color-vision": { type: "deutan" } }).colorMatrix
    const [r, g] = apply(full, [1, 0, 0])
    const [r2, g2] = apply(full, [0, 1, 0])
    expect(Math.abs(r - g)).toBeLessThan(0.1)
    expect(Math.abs(r2 - g2)).toBeLessThan(0.2)
    const half = ObserverProviders.perceptionOf({ "color-vision": { type: "deutan", severity: 50 } }).colorMatrix
    expect(apply(half, [1, 0, 0])[0]).toBeGreaterThan(apply(full, [1, 0, 0])[0])
    expect(ObserverProviders.perceptionOf({ "color-vision": { type: "deutan", severity: 0 } }).colorMatrix).toEqual(Perceptions.IDENTITY)
  })

  it("turns blood alcohol into the measured contrast loss, and refuses to extrapolate", () => {
    const at08 = ObserverProviders.perceptionOf({ intoxication: { bloodAlcohol: 0.08 } }).contrastGain
    expect(at08).toBeCloseTo(10 ** (-0.9 / 20), 6)
    const capped = ObserverProviders.perceptionOf({ intoxication: { bloodAlcohol: 5 } }).contrastGain
    expect(capped).toBeCloseTo(10 ** (-(0.1 / 0.08) * 0.9 / 20), 6)
  })

  it("records a level past what was measured but draws it as the highest measured one", () => {
    const at01 = ObserverProviders.perceptionOf({ intoxication: { bloodAlcohol: 0.1 } }).contrastGain
    expect(ObserverProviders.perceptionOf({ intoxication: { bloodAlcohol: 0.2 } }).contrastGain).toBe(at01)
    const setting = ObserverProviders.ALL.find(provider => provider.id === "intoxication")!.settings[0]
    expect(setting.max).toBe(0.5)
    expect(setting.also).toEqual({ unit: "g/L", factor: 10, digits: 1 })
  })

  it("states fatigue without changing the picture", () => {
    expect(Perceptions.isNone(ObserverProviders.perceptionOf({ fatigue: { hoursAwake: 40 } }))).toBe(true)
  })

  it("combines providers, and stores only what differs from the default", () => {
    const both = ObserverProviders.perceptionOf({ "color-vision": { type: "protan" }, intoxication: { bloodAlcohol: 0.08 } })
    expect(both.contrastGain).toBeLessThan(1)
    expect(both.colorMatrix).not.toEqual(Perceptions.IDENTITY)
    expect(ObserverProviders.compact({ "color-vision": { type: "normal", severity: 100 }, fatigue: { hoursAwake: 0 } })).toBeUndefined()
    expect(ObserverProviders.compact({ "color-vision": { type: "deutan", severity: 100 } })).toEqual({ "color-vision": { type: "deutan" } })
  })
})
