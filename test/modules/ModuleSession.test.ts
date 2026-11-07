import { afterEach, describe, expect, it } from "vitest"
import { ModuleLoader } from "../../src/modules/ModuleLoader.js"
import { ModuleManifest, ModuleManifestError } from "../../src/modules/ModuleManifest.js"
import { ModuleRegistry } from "../../src/modules/ModuleRegistry.js"
import { ModuleSession } from "../../src/modules/ModuleSession.js"
import { ModuleConfig } from "../../src/modules/ModuleConfig.js"
import { ModelCatalogues } from "../../src/modules/models/ModelCatalogues.js"
import { IMAGERY_SOURCES, ELEVATION_SOURCES } from "../../src/modules/providers/terrain/terrainSources.js"
import { DECOR_MODEL_SOURCES } from "../../src/modules/models/decorModelSources.js"
import { XyzImageryProvider } from "../../src/modules/providers/terrain/XyzImageryProvider.js"

const MANIFEST = "https://acme.example/ufo/ufoathome-module.json"
const manifest = {
  format: 1, id: "acme", name: "ACME", credit: "© ACME", creditUrl: "https://acme.example",
  contributes: {
    imagery: [{ id: "acme-ortho", name: "ACME ortho", credit: "© ACME ortho", creditUrl: "https://acme.example/ortho", tiles: "tiles/{z}/{x}/{y}.jpg" }],
    elevation: [{ id: "acme-relief", name: "ACME relief", credit: "© ACME relief", creditUrl: "https://acme.example/relief", tiles: "https://dem.example/{z}/{x}/{y}.png" }],
    models: [{ id: "acme-saucer", kind: "entity", name: "Saucer", file: "models/saucer.glb", credit: { title: "Saucer", author: "ACME", license: "CC0 1.0", sourceUrl: "https://acme.example" } }]
  },
  script: "module.js"
}

const fetchOf = (files: Record<string, unknown>): typeof fetch => (async (input: RequestInfo | URL) => {
  const body = files[String(input)]
  return body === undefined ? new Response("", { status: 404 }) : new Response(JSON.stringify(body))
}) as typeof fetch

class MemoryStorage implements Storage {
  private readonly map = new Map<string, string>()
  get length() { return this.map.size }
  clear() { this.map.clear() }
  getItem(key: string) { return this.map.get(key) ?? null }
  key(i: number) { return [...this.map.keys()][i] ?? null }
  removeItem(key: string) { this.map.delete(key) }
  setItem(key: string, value: string) { this.map.set(key, value) }
}

const scriptRuns: string[] = []
const importImpl = async (url: string) => ({
  default: () => {
    scriptRuns.push(url)
    return { weather: [{ id: "acme-weather", name: "ACME weather", credit: "©", creditUrl: "https://acme.example", create: () => ({}) as never }] }
  }
})

const session = (storage = new MemoryStorage()) => new ModuleSession(new ModuleLoader({ fetchImpl: fetchOf({ [MANIFEST]: manifest }), importImpl }), storage)

afterEach(() => {
  for (const module of ModuleRegistry.installed()) ModuleRegistry.uninstall(module.id)
  scriptRuns.length = 0
})

describe("ModuleManifest", () => {
  it("says what is wrong with a manifest that is not one", () => {
    expect(() => ModuleManifest.check({ format: 1, id: "Bad Id", name: "x" }, MANIFEST)).toThrow(ModuleManifestError)
    expect(() => ModuleManifest.check({ format: 2, id: "a", name: "x" }, MANIFEST)).toThrow(/newer/)
    expect(() => ModuleManifest.check({ ...manifest, contributes: { imagery: [{ ...manifest.contributes.imagery[0], tiles: "x.jpg" }] } }, MANIFEST)).toThrow(/\{z\}/)
    expect(() => ModuleManifest.check({ ...manifest, contributes: { models: [{ ...manifest.contributes.models[0], credit: undefined }] } }, MANIFEST)).toThrow(/credit/)
  })

  it("reads relative tile and model addresses from the manifest's, keeping the placeholders", async () => {
    const module = ModuleManifest.module(ModuleManifest.check(manifest, MANIFEST), MANIFEST)
    const imagery = module.contributes.imagery![0].create() as XyzImageryProvider
    expect(imagery.attribution).toBe("© ACME ortho")
    expect(XyzImageryProvider.tileUrl((imagery as unknown as { tileUrlTemplate: string }).tileUrlTemplate, { z: 3, x: 4, y: 5 }))
      .toBe("https://acme.example/ufo/tiles/3/4/5.jpg")
    const models = module.contributes.decorModels![0].create()
    expect((await models.entry("acme-saucer"))?.url).toBe("https://acme.example/ufo/models/saucer.glb")
  })
})

describe("ModuleSession", () => {
  it("installs a module the person adds, runs its script, keeps its address, and forgets it when removed", async () => {
    const storage = new MemoryStorage()
    const modules = session(storage)
    const state = await modules.add(MANIFEST)

    expect(state.status).toBe("installed")
    expect(state.loaded?.scriptRun).toBe(true)
    expect(scriptRuns).toEqual(["https://acme.example/ufo/module.js"])
    expect(IMAGERY_SOURCES.map(source => source.id)).toContain("acme-ortho")
    expect(ELEVATION_SOURCES.map(source => source.id)).toContain("acme-relief")
    expect(ModuleRegistry.point("weather").sources.map(source => source.id)).toContain("acme-weather")
    expect(ModuleConfig.read(storage).modules).toEqual([{ url: MANIFEST, enabled: true }])

    await modules.remove(MANIFEST)
    expect(IMAGERY_SOURCES.map(source => source.id)).not.toContain("acme-ortho")
    expect(ModuleConfig.read(storage).modules).toEqual([])
  })

  it("installs a module a recording names without running its script", async () => {
    const modules = session()
    await modules.require(["ufo/ufoathome-module.json"], "https://acme.example/sighting.json")

    const state = modules.state(MANIFEST)!
    expect(state.status).toBe("installed")
    expect(state.addedByPerson).toBe(false)
    expect(state.loaded?.hasScript).toBe(true)
    expect(state.loaded?.scriptRun).toBe(false)
    expect(scriptRuns).toEqual([])
    expect(IMAGERY_SOURCES.map(source => source.id)).toContain("acme-ortho")
  })

  it("turns a module off and on again, and loads what is on from what the browser keeps", async () => {
    const storage = new MemoryStorage()
    await session(storage).add(MANIFEST)
    for (const module of ModuleRegistry.installed()) ModuleRegistry.uninstall(module.id)

    const later = session(storage)
    await later.start()
    expect(later.state(MANIFEST)?.status).toBe("installed")

    await later.setEnabled(MANIFEST, false)
    expect(later.state(MANIFEST)?.status).toBe("off")
    expect(IMAGERY_SOURCES.map(source => source.id)).not.toContain("acme-ortho")
  })

  it("exports the person's modules to a file and imports them back", async () => {
    const modules = session()
    await modules.add(MANIFEST)
    const text = modules.exportText()
    expect(JSON.parse(text)).toEqual({ format: 1, modules: [{ url: MANIFEST, enabled: true }] })

    const elsewhere = session()
    await elsewhere.importText(text)
    expect(elsewhere.state(MANIFEST)?.status).toBe("installed")
    expect(() => ModuleConfig.parse("{\"x\":1}")).toThrow()
  })

  it("says why a module could not be loaded", async () => {
    const state = await session().add("https://nowhere.example/ufoathome-module.json")
    expect(state.status).toBe("failed")
    expect(state.error).toMatch(/404/)
  })
})

describe("ModelCatalogues", () => {
  it("finds a model of a module's catalogue while the built-in one is browsed, and names the module", async () => {
    ModuleRegistry.install(ModuleManifest.module(ModuleManifest.check(manifest, MANIFEST), MANIFEST))
    const builtIn = { id: "builtin", name: "b", credit: "©", creditUrl: "https://x", create: () => ({ attribution: "", entries: async () => [], entry: async () => undefined }) }
    const catalogues = new ModelCatalogues(undefined, [builtIn, ...DECOR_MODEL_SOURCES.filter(source => source.id === "acme-models")])

    expect(await catalogues.entries()).toEqual([])
    expect((await catalogues.entry("acme-saucer"))?.name).toBe("Saucer")
    expect(await catalogues.moduleOf("acme-saucer")).toBe("acme")
    expect(await catalogues.entry("nothing")).toBeUndefined()
  })
})
