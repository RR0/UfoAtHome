import { afterAll, describe, expect, it, vi } from "vitest"
import type { Group } from "three"
import { DocsModulesPage } from "../../site/content/DocsModulesPage.js"
import { ModuleConformance } from "../../src/modules/ModuleConformance.js"
import { ModuleManifest } from "../../src/modules/ModuleManifest.js"
import type { ModuleScript } from "../../src/modules/ModuleManifest.js"
import type { ExtensionPointId } from "../../src/modules/ModuleRegistry.js"
import { MODULE_THREE } from "../../src/modules/sky-events/ModuleThree.js"
import type { SkyEventFrame, SkyEventJson, SkyEventKind, SkyEventKindMessages } from "../../src/modules/sky-events/SkyEventKind.js"

/** What the guide shows is run: somebody is going to copy it. */
describe("the excerpts of the guide to modules", () => {
  afterAll(() => vi.unstubAllGlobals())

  /** The default export of a module's script, run as the page would: its `import()` of its texts stays unasked. */
  const scriptOf = (code: string): ModuleScript => new Function(code.replace("export default", "return"))() as ModuleScript
  const context = { manifestUrl: "https://acme.example/ufo/ufoathome-module.json", three: MODULE_THREE }

  it("states manifests that are read as such", () => {
    expect(ModuleManifest.check(JSON.parse(DocsModulesPage.WEATHER_MANIFEST), context.manifestUrl).script).toBe("module.js")
    const noCode = ModuleManifest.check(JSON.parse(DocsModulesPage.NO_CODE_MANIFEST), context.manifestUrl)
    expect(Object.keys(ModuleManifest.contributions(noCode, context.manifestUrl)).sort()).toEqual(["decorModels", "elevation", "imagery"])
  })

  it("translates a weather service's answers into what a recording holds, one sample per point", async () => {
    const asked: string[] = []
    vi.stubGlobal("fetch", async (url: string) => {
      asked.push(url)
      return new Response(JSON.stringify({ cloudPercent: 70, rainMm: 0, windKmh: 36, windFromDeg: 270, thunder: false }))
    })
    const contributions = await scriptOf(DocsModulesPage.WEATHER_SCRIPT)(context)
    const source = contributions.weather![0]
    const times = [new Date("2026-10-09T18:00:00Z"), new Date("2026-10-09T19:00:00Z")]
    const observation = await source.create().getWeather({ points: times.map(time => ({ lat: 48.8, lng: 2.2, time })) })

    expect(asked).toHaveLength(2)
    expect(observation!.samples.map(sample => sample.time)).toEqual(times)
    expect(observation!.samples[0].weather).toEqual({
      cloudCover: 0.7, cloudDarkness: 0.35, precipitationType: "none", precipitationIntensity: 0, windSpeed: 10, windDirectionDeg: 90, storm: false
    })
    expect(observation!.source).toEqual({ id: source.id, name: "ACME Weather", url: asked[1] })
  })

  it("says there is no record, and that the service could not be asked, as two different things", async () => {
    const contributions = await scriptOf(DocsModulesPage.WEATHER_SCRIPT)(context)
    const provider = contributions.weather![0].create()
    const query = { points: [{ lat: 48.8, lng: 2.2, time: new Date("1900-01-01T00:00:00Z") }] }
    vi.stubGlobal("fetch", async () => new Response("", { status: 404 }))
    await expect(provider.getWeather(query)).resolves.toBeUndefined()
    vi.stubGlobal("fetch", async () => new Response("", { status: 500 }))
    await expect(provider.getWeather(query)).rejects.toThrow("500")
  })

  it("places a stated event of the sky in the scene while it lasts, as the recording's excerpt states it", async () => {
    const contributions = await scriptOf(DocsModulesPage.SKY_SCRIPT)(context)
    const source = contributions.skyEvents![0]
    const kind = source.create() as SkyEventKind
    expect(source.id).toBe(kind.key)
    const events = (JSON.parse(DocsModulesPage.SKY_RECORDING).skyEvents as Record<string, SkyEventJson[]>)[kind.key]
    const simulation = (await kind.simulation())()
    const frame = {
      reference: { lat: 48.8062, lng: 2.2355 }, origin: { x: 10, z: 20 }, eastScale: 1, siteElevationM: 200, relativeScale: 2,
      transmittanceTo: () => [1, 1, 1]
    } as unknown as SkyEventFrame

    simulation.update(events, 0, frame)
    expect(simulation.drawnCount).toBe(0)

    simulation.update(events, 2000, frame)
    expect(simulation.drawnCount).toBe(1)
    const ball = (simulation.object as Group).children[0]
    expect(ball.visible).toBe(true)
    expect(ball.position.toArray()).toEqual([10, 30, 20])
    expect(ball.scale.x).toBe(3)

    simulation.update(events, 19000, frame)
    expect(simulation.drawnCount).toBe(0)
    expect(ball.visible).toBe(false)
    simulation.dispose()
  })

  it("passes the check the page tells its readers to run", async () => {
    vi.stubGlobal("fetch", async () => new Response(JSON.stringify({ cloudPercent: 70, rainMm: 0, windKmh: 36, windFromDeg: 270, thunder: false })))
    const weather = await scriptOf(DocsModulesPage.WEATHER_SCRIPT)(context)
    const weatherQuery = { points: [{ lat: 48.8, lng: 2.2, time: new Date("2026-10-09T18:00:00Z") }] }
    expect(await ModuleConformance.check({ module: { contributes: weather } }, { weatherQuery })).toEqual([])

    const sky = await scriptOf(DocsModulesPage.SKY_SCRIPT)(context)
    // Its texts are files beside the module, which nothing serves here: what the reader writes from the page's excerpt.
    const texts = new Function(DocsModulesPage.SKY_MESSAGES.replace("export default", "return"))() as SkyEventKindMessages
    const source = sky.skyEvents![0]
    const kind = source.create()
    const served = { ...source, create: () => ({ ...kind, messages: { load: async () => texts } }) }
    expect(await ModuleConformance.check({ module: { contributes: { skyEvents: [served] } } })).toEqual([])
  })

  it("lists every extension point, each with an interface that exists", () => {
    const points: Record<ExtensionPointId, true> = {
      weather: true, place: true, timeZone: true, narrative: true, assessment: true, lightPollution: true, aircraft: true, upperAir: true,
      elevation: true, imagery: true, surroundings: true, decorModels: true, skyEvents: true, interpretations: true, perception: true
    }
    expect(DocsModulesPage.POINTS.map(row => row.point).sort()).toEqual(Object.keys(points).sort())
    const sources = import.meta.glob("/src/**/*.ts")
    for (const row of DocsModulesPage.POINTS) expect(sources[`/${row.interfacePath}`], row.interfacePath).toBeDefined()
  })
})
