import { describe, expect, it } from "vitest"
import { Group, Vector3 } from "three"
import lanternsDemo from "../../public/demo-data/sky-test-lanterns.json"
import "../../src/modules/assessors/assessmentSources.js"
import "../../src/modules/interpretations/interpretationSources.js"
import "../../src/modules/models/decorModelSources.js"
import "../../src/modules/perception/perceptionSources.js"
import "../../src/modules/providers/light-pollution/lightPollutionSources.js"
import "../../src/modules/providers/narrative/narrativeSources.js"
import "../../src/modules/providers/place/placeSources.js"
import "../../src/modules/providers/terrain/surroundingsSources.js"
import "../../src/modules/providers/terrain/terrainSources.js"
import "../../src/modules/providers/time-zone/timeZoneSources.js"
import "../../src/modules/providers/traffic/aircraftSources.js"
import "../../src/modules/providers/traffic/upperAirSources.js"
import "../../src/modules/providers/weather/weatherSources.js"
import "../../src/modules/sky-events/skyEventSources.js"
import { ModuleConformance } from "../../src/modules/ModuleConformance.js"
import type { ConformanceCode, ConformanceContext, ConformanceFinding } from "../../src/modules/ModuleConformance.js"
import { ModuleRegistry } from "../../src/modules/ModuleRegistry.js"
import type { ExtensionPointId, ModuleContributions } from "../../src/modules/ModuleRegistry.js"

const POINTS: Record<ExtensionPointId, true> = {
  weather: true, place: true, timeZone: true, narrative: true, assessment: true, lightPollution: true, aircraft: true, upperAir: true,
  elevation: true, imagery: true, surroundings: true, decorModels: true, skyEvents: true, interpretations: true, perception: true
}

const entry = (id: string, built: unknown) => ({ id, name: id, credit: "© ACME", creditUrl: "https://acme.example", create: () => built })
const failed = (findings: ConformanceFinding[]): ConformanceCode[] => findings.filter(finding => finding.level === "failed").map(finding => finding.code)
const check = (contributes: unknown, context?: ConformanceContext) => ModuleConformance.check({ module: { contributes: contributes as ModuleContributions } }, context)

const QUERY = { points: [{ lat: 48.8, lng: 2.2, time: new Date("2026-10-09T18:00:00Z") }, { lat: 48.8, lng: 2.2, time: new Date("2026-10-09T19:00:00Z") }] }
const CALM = { cloudCover: 0.5, cloudDarkness: 0.2, precipitationType: "none", precipitationIntensity: 0, windSpeed: 4, windDirectionDeg: 90, storm: false }
const SOURCE = { id: "acme-weather", name: "ACME", url: "https://api.acme.example/history" }
const answering = (weather: unknown = CALM, source: unknown = SOURCE) => ({
  getWeather: async ({ points }: { points: { time: Date }[] }) => ({ source, samples: points.map(({ time }) => ({ time, weather })) })
})
const weatherOf = (provider: unknown, context: ConformanceContext = { weatherQuery: QUERY }) => check({ weather: [entry(SOURCE.id, provider)] }, context)

const TEXTS = { load: async () => ({ title: "Balls", name: "Ball" }) }
const simulation = (overrides: object = {}) => {
  const object = new Group()
  return { object, drawnCount: 0, update() {}, dispose() { object.removeFromParent() }, ...overrides }
}
const kindOf = (overrides: object = {}, build: () => unknown = () => simulation()) => ({ key: "balls", messages: TEXTS, simulation: async () => build, ...overrides })

describe("ModuleConformance", () => {
  it("passes every implementation UFO@home is built with, at every point", async () => {
    const points = Object.keys(POINTS) as ExtensionPointId[]
    for (const point of points) expect(ModuleRegistry.point(point).sources.length, point).toBeGreaterThan(0)
    const contributes = Object.fromEntries(points.map(point => [point, ModuleRegistry.point(point).sources]))
    const lanterns = lanternsDemo.interpretation
    expect(lanterns.lanterns.length).toBeGreaterThan(0)

    const findings = await check(contributes, { interpretation: lanterns })

    expect(findings.filter(finding => finding.level === "failed")).toEqual([])
    expect(findings.map(finding => finding.code)).toContain("weatherNotAsked")
  })

  it("says that the code of a module whose script was not run has not been checked", async () => {
    const findings = await ModuleConformance.check({ module: { contributes: {} }, hasScript: true, scriptRun: false })
    expect(findings).toEqual([{ level: "note", code: "scriptNotRun" }])
  })

  describe("for any module", () => {
    it("finds a point that does not exist, as a misspelt key is", async () => {
      expect(await check({ wether: [entry("a", {})] })).toEqual([{ level: "failed", code: "unknownPoint", point: "wether" }])
    })

    it("does not take a property every object has for a point", async () => {
      expect(failed(await check({ toString: [] }))).toEqual(["unknownPoint"])
    })

    it("finds a point that is not given a list", async () => {
      expect(failed(await check({ timeZone: entry("a", {}) }))).toEqual(["notAList"])
    })

    it("names the field an entry lacks", async () => {
      const findings = await check({ timeZone: [{ id: "a", name: " ", credit: "©", creditUrl: "not an address", create: () => ({ zoneAt() {} }) }] })
      expect(findings.map(finding => finding.detail)).toEqual(["name", "creditUrl"])
      expect(findings[0].code).toBe("entryField")
    })

    it("finds the same id given twice at a point", async () => {
      const zone = { zoneAt() {} }
      expect(failed(await check({ timeZone: [entry("a", zone), entry("a", zone)] }))).toEqual(["duplicateId"])
    })

    it("finds a create that is missing, throws or builds nothing", async () => {
      expect(failed(await check({ timeZone: [{ id: "a", name: "a", credit: "©", creditUrl: "https://a.example" }] }))).toEqual(["createMissing"])
      const throwing = { ...entry("a", {}), create: () => { throw new Error("no key") } }
      expect(await check({ timeZone: [throwing] })).toEqual([{ level: "failed", code: "createThrew", point: "timeZone", source: "a", detail: "no key" }])
      expect(failed(await check({ timeZone: [entry("a", undefined)] }))).toEqual(["createEmpty"])
    })

    it("finds a create that asks the network, and leaves the page's fetch as it was", async () => {
      const page = globalThis.fetch
      const asking = { ...entry("a", { zoneAt() {} }), create: () => { void fetch("https://a.example"); return { zoneAt() {} } } }
      expect(failed(await check({ timeZone: [asking] }))).toEqual(["createAsked"])
      expect(globalThis.fetch).toBe(page)
    })

    it("names what an implementation lacks", async () => {
      expect(await check({ place: [entry("a", { attribution: "©", search() {} })] })).toEqual([
        { level: "failed", code: "missingMember", point: "place", source: "a", detail: "reverse" }
      ])
    })
  })

  describe("for a weather source", () => {
    it("passes one that keeps the contract", async () => {
      expect(await weatherOf(answering())).toEqual([])
    })

    it("says it was not asked with no place and date to ask about", async () => {
      expect((await weatherOf(answering(), {})).map(finding => [finding.level, finding.code])).toEqual([["note", "weatherNotAsked"]])
    })

    it("takes no record for an answer, and says nothing of its values was seen", async () => {
      const findings = await weatherOf({ getWeather: async () => undefined })
      expect(findings.map(finding => [finding.level, finding.code])).toEqual([["note", "weatherNoRecord"]])
    })

    it("says what a service that could not be asked threw, as a refusal of CORS does", async () => {
      const findings = await weatherOf({ getWeather: async () => { throw new TypeError("Failed to fetch") } })
      expect(findings.map(finding => [finding.code, finding.detail])).toEqual([["weatherThrew", "Failed to fetch"]])
    })

    it("does not wait for ever", async () => {
      const findings = await weatherOf({ getWeather: () => new Promise(() => undefined) }, { weatherQuery: QUERY, timeoutMs: 5 })
      expect(failed(findings)).toEqual(["weatherThrew"])
    })

    it("finds samples missing or out of order", async () => {
      const one = { getWeather: async () => ({ source: SOURCE, samples: [{ time: QUERY.points[0].time, weather: CALM }] }) }
      expect((await weatherOf(one)).map(finding => [finding.code, finding.detail])).toEqual([["weatherSamples", "1/2"]])
      const swapped = { getWeather: async () => ({ source: SOURCE, samples: [...QUERY.points].reverse().map(({ time }) => ({ time, weather: CALM })) }) }
      expect(failed(await weatherOf(swapped))).toEqual(["weatherOrder"])
    })

    it("finds a value out of its bounds, or missing, or no number", async () => {
      const findings = await weatherOf(answering({ ...CALM, cloudCover: 70, windDirectionDeg: -90, windSpeed: Number.NaN, storm: undefined, precipitationType: "drizzle", relativeHumidity: 55 }))
      expect(findings.map(finding => finding.detail)).toEqual([
        "cloudCover = 70", "relativeHumidity = 55", "windDirectionDeg = -90", "windSpeed = NaN", "precipitationType = drizzle", "storm = undefined"
      ])
    })

    it("leaves out nothing required, and does not ask what is optional", async () => {
      const { cloudDarkness: _, ...lacking } = CALM
      expect((await weatherOf(answering(lacking))).map(finding => finding.detail)).toEqual(["cloudDarkness = undefined"])
    })

    it("only points at a wind likely to be in other units", async () => {
      expect((await weatherOf(answering({ ...CALM, windSpeed: 90 }))).map(finding => [finding.level, finding.code])).toEqual([["note", "weatherWindHigh"]])
    })

    it("finds a source that is not named as the entry is", async () => {
      expect((await weatherOf(answering(CALM, { ...SOURCE, id: "other" }))).map(finding => finding.detail)).toEqual(["id"])
      expect((await weatherOf(answering(CALM, { id: SOURCE.id }))).map(finding => finding.detail)).toEqual(["name", "url"])
    })
  })

  describe("for a kind of event of the sky", () => {
    const skyOf = (kind: unknown) => check({ skyEvents: [entry("balls", kind)] })

    it("passes one that keeps the contract", async () => {
      expect(await skyOf(kindOf())).toEqual([])
    })

    it("finds a key that is not the entry's id", async () => {
      expect((await skyOf(kindOf({ key: "ball" }))).map(finding => [finding.code, finding.detail])).toEqual([["kindKey", "ball"]])
    })

    it("names the text that is missing, in which language", async () => {
      const findings = await skyOf(kindOf({ messages: { load: async (language: string) => language === "en" ? { title: "Balls", name: "Ball" } : { title: "Boules" } } }))
      expect(findings.map(finding => finding.detail)).toEqual(["fr: name"])
    })

    it("says that a catalog failed to load, as a file not found does", async () => {
      const findings = await skyOf(kindOf({ messages: { load: async () => { throw new Error("404") } } }))
      expect(findings.map(finding => finding.detail)).toEqual(["en: 404", "fr: 404"])
    })

    it("finds a simulation that cannot be built", async () => {
      const findings = await skyOf(kindOf({}, () => { throw new Error("no shader") }))
      expect(findings.map(finding => [finding.code, finding.detail])).toEqual([["simulationFailed", "no shader"]])
    })

    it("finds what a second three.js builds, which the scene's renderer would not take for its own", async () => {
      class OtherObject3D {
        isObject3D = true
      }
      expect(failed(await skyOf(kindOf({}, () => simulation({ object: new OtherObject3D() }))))).toEqual(["secondThree"])
    })

    it("finds an update that fails with no events or draws with none", async () => {
      expect(failed(await skyOf(kindOf({}, () => simulation({ update() { throw new Error("no") } }))))).toEqual(["updateThrew"])
      expect(failed(await skyOf(kindOf({}, () => simulation({ drawnCount: 3 }))))).toEqual(["drawnWithoutEvents"])
    })

    it("gives update a frame with an eye in the page's three.js", async () => {
      let eye: unknown
      await skyOf(kindOf({}, () => simulation({ update(_events: unknown, _t: number, frame: { eye: unknown }) { eye = frame.eye } })))
      expect(eye).toBeInstanceOf(Vector3)
    })

    it("finds a dispose that leaves its object in the scene, or fails", async () => {
      expect(failed(await skyOf(kindOf({}, () => simulation({ dispose() {} }))))).toEqual(["disposeLeft"])
      expect(failed(await skyOf(kindOf({}, () => simulation({ dispose() { throw new Error("no") } }))))).toEqual(["disposeThrew"])
    })
  })

  describe("for a kind of interpretation", () => {
    const reading = (bodiesOf: (item: unknown) => unknown) => ({ key: "lights", messages: { load: async () => ({ title: "Lights" }) }, bodiesOf })
    const readingOf = (kind: unknown, context?: ConformanceContext) => check({ interpretations: [entry("lights", kind)] }, context)

    it("says it was not tried when the recording on show states none", async () => {
      expect((await readingOf(reading(() => []))).map(finding => [finding.level, finding.code])).toEqual([["note", "readingNotTried"]])
    })

    it("tries it on what the recording states", async () => {
      expect(await readingOf(reading(() => []), { interpretation: { lights: [{}] } })).toEqual([])
    })

    it("finds bodies given late or not at all, since they are asked for synchronously", async () => {
      expect(failed(await readingOf(reading(async () => []), { interpretation: { lights: [{}] } }))).toEqual(["readingNotAList"])
      expect(failed(await readingOf(reading(() => { throw new Error("no") }), { interpretation: { lights: [{}] } }))).toEqual(["readingThrew"])
    })
  })
})
