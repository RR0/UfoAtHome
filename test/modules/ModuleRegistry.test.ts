import { afterEach, describe, expect, it } from "vitest"
import { ModuleConflictError, ModuleRegistry } from "../../src/modules/ModuleRegistry.js"
import type { DataSource } from "../../src/engine/source/DataSource.js"
import { IMAGERY_SOURCES } from "../../src/modules/providers/terrain/terrainSources.js"
import { WEATHER_SOURCES } from "../../src/modules/providers/weather/weatherSources.js"
import type { ImageryProvider } from "../../src/render3d/terrain/ImageryProvider.js"

const source = <T>(id: string): DataSource<T> => ({ id, name: id, credit: "©", creditUrl: "https://example.org", create: () => ({}) as T })

afterEach(() => {
  for (const module of ModuleRegistry.installed()) ModuleRegistry.uninstall(module.id)
})

describe("ModuleRegistry", () => {
  it("gives the built-in registries as its points' own lists", () => {
    expect(ModuleRegistry.point("imagery").sources).toBe(IMAGERY_SOURCES)
    expect(ModuleRegistry.point("weather").sources).toBe(WEATHER_SOURCES)
    expect(IMAGERY_SOURCES.map(entry => ModuleRegistry.point("imagery").ownerOf(entry.id))).toEqual(IMAGERY_SOURCES.map(() => ModuleRegistry.BUILT_IN))
  })

  it("adds a module's entries after the built-in ones, in the list a registry already holds, and removes them", () => {
    const builtIn = IMAGERY_SOURCES.map(entry => entry.id)
    const changes: string[] = []
    const listen = (event: Event) => changes.push((event as CustomEvent).detail)
    ModuleRegistry.changes.addEventListener("change", listen)

    ModuleRegistry.install({ id: "acme", name: "ACME", contributes: { imagery: [source<ImageryProvider>("acme-ortho")] } })
    expect(IMAGERY_SOURCES.map(entry => entry.id)).toEqual([...builtIn, "acme-ortho"])
    expect(ModuleRegistry.installed().map(module => module.id)).toEqual(["acme"])

    ModuleRegistry.uninstall("acme")
    expect(IMAGERY_SOURCES.map(entry => entry.id)).toEqual(builtIn)
    expect(changes).toEqual(["imagery", "imagery"])
    ModuleRegistry.changes.removeEventListener("change", listen)
  })

  it("replaces what a module gave when it is installed again, at every point it gave to", () => {
    ModuleRegistry.install({ id: "acme", name: "ACME", contributes: { imagery: [source("acme-ortho")], weather: [source("acme-weather")] } })
    ModuleRegistry.install({ id: "acme", name: "ACME", contributes: { imagery: [source("acme-ortho-2")] } })

    expect(IMAGERY_SOURCES.map(entry => entry.id)).toContain("acme-ortho-2")
    expect(IMAGERY_SOURCES.map(entry => entry.id)).not.toContain("acme-ortho")
    expect(WEATHER_SOURCES.map(entry => entry.id)).not.toContain("acme-weather")
  })

  it("refuses a whole module that gives an id another module gives at the same point", () => {
    const before = [...WEATHER_SOURCES]
    const install = () => ModuleRegistry.install({
      id: "copycat", name: "Copycat",
      contributes: { weather: [source("copycat-weather")], imagery: [source(IMAGERY_SOURCES[0].id)] }
    })

    expect(install).toThrow(ModuleConflictError)
    expect(WEATHER_SOURCES).toEqual(before)
    expect(ModuleRegistry.installed()).toEqual([])
  })

  it("keeps the built-in entries first even when they are given after another module's", () => {
    ModuleRegistry.install({ id: "early", name: "Early", contributes: { place: [source("early-place")] } })
    const point = ModuleRegistry.point("place")
    point.withdraw(ModuleRegistry.BUILT_IN)
    point.provide(ModuleRegistry.BUILT_IN, [source("built-in-place")])

    expect(point.sources.map(entry => entry.id)).toEqual(["built-in-place", "early-place"])
  })

  it("does not let a module take the built-in id", () => {
    expect(() => ModuleRegistry.install({ id: ModuleRegistry.BUILT_IN, name: "Fake", contributes: {} })).toThrow()
  })
})
