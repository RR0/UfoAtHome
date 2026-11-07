import { afterEach, describe, expect, it } from "vitest"
import { ObserverProviders } from "../../src/engine/observer/ObserverProviders.js"
import type { ObserverProvider } from "../../src/engine/observer/ObserverProvider.js"
import { Perceptions } from "../../src/engine/observer/Perception.js"
import { ModuleRegistry } from "../../src/modules/ModuleRegistry.js"

/** A glare of the eye after a camera flash: the contrast halved, for as long as it is stated. */
const AFTER_FLASH: ObserverProvider = {
  id: "after-flash", label: "After a flash", hint: "", sources: ["Test"],
  settings: [{ id: "share", label: "Share", kind: "number", default: 1, min: 0, max: 1, step: 0.1 }],
  perceive: values => ({ ...Perceptions.NONE, contrastGain: Number(values.share ?? 1) })
}

afterEach(() => ModuleRegistry.uninstall("flash"))

describe("what bends an observer's perception, brought by a module", () => {
  it("comes after the built-in providers, adds its effect to theirs, and is kept in a recording", () => {
    expect(ObserverProviders.ALL.map(provider => provider.id)).toEqual(["color-vision", "intoxication", "fatigue"])
    ModuleRegistry.install({ id: "flash", name: "Flash", contributes: { perception: [{ id: "after-flash", name: "After a flash", credit: "Test", creditUrl: "https://example.org", create: () => AFTER_FLASH }] } })

    expect(ObserverProviders.ALL.map(provider => provider.id)).toEqual(["color-vision", "intoxication", "fatigue", "after-flash"])
    const alone = ObserverProviders.perceptionOf({ "after-flash": { share: 0.5 } }).contrastGain
    expect(alone).toBe(0.5)
    expect(ObserverProviders.perceptionOf({ "after-flash": { share: 0.5 }, intoxication: { bloodAlcohol: 0.08 } }).contrastGain).toBeLessThan(alone)
    expect(ObserverProviders.compact({ "after-flash": { share: 0.5 } })).toEqual({ "after-flash": { share: 0.5 } })
  })

  it("is no longer applied once the module is gone", () => {
    ModuleRegistry.install({ id: "flash", name: "Flash", contributes: { perception: [{ id: "after-flash", name: "After a flash", credit: "Test", creditUrl: "https://example.org", create: () => AFTER_FLASH }] } })
    ModuleRegistry.uninstall("flash")
    expect(Perceptions.isNone(ObserverProviders.perceptionOf({ "after-flash": { share: 0.5 } }))).toBe(true)
    // Not applied, and not lost either: a recording keeps what this page cannot read.
    expect(ObserverProviders.compact({ "after-flash": { share: 0.5 }, fatigue: { hoursAwake: 0 } })).toEqual({ "after-flash": { share: 0.5 } })
  })
})
