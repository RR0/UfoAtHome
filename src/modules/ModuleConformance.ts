import type { DataSource } from "../engine/source/DataSource.js"
import type { WeatherObservation, WeatherProvider, WeatherQuery } from "../engine/weather/WeatherProvider.js"
import type { BodyJson } from "../engine/interpretation/Interpretation.js"
import type { ExtensionPointId, UfoAtHomeModule } from "./ModuleRegistry.js"
import type { InterpretationKind } from "./interpretations/InterpretationKind.js"
import type { SkyEventFrame, SkyEventKind, SkyEventSimulation } from "./sky-events/SkyEventKind.js"

/** What a check can find: its words are in the Modules panel's messages (ModulesPanelMessages.checks), one for each. */
export type ConformanceCode =
  | "scriptNotRun" | "notAList" | "unknownPoint" | "entryField" | "duplicateId" | "createMissing" | "createThrew" | "createAsked" | "createEmpty"
  | "missingMember" | "weatherNotAsked" | "weatherNoRecord" | "weatherThrew" | "weatherSamples" | "weatherOrder" | "weatherValue" | "weatherWindHigh"
  | "weatherSource" | "kindKey" | "kindMessages" | "simulationFailed" | "secondThree" | "updateThrew" | "drawnWithoutEvents" | "disposeThrew"
  | "disposeLeft" | "readingNotTried" | "readingThrew" | "readingNotAList"

/** One thing found: `failed` breaks the contract, `note` is what was not tried or deserves a look. */
export interface ConformanceFinding {
  level: "failed" | "note"
  code: ConformanceCode
  point?: string
  source?: string
  /** What the words need besides: a field's name, what the code threw. */
  detail?: string
}

/** What the page can give a check to go further. Without it, what needs it is not tried, and is said not to have been. */
export interface ConformanceContext {
  /** What to ask a weather source: a real request to its service, which is why a check is run only when somebody asks. */
  weatherQuery?: WeatherQuery
  /** The readings stated by the recording on show, by kind's key: what `bodiesOf` can be tried on. */
  interpretation?: Readonly<Record<string, unknown>>
  /** How long an answer is waited for. */
  timeoutMs?: number
}

/** What a loaded module is checked from (see LoadedModule). */
export interface ConformanceSubject {
  module: Pick<UfoAtHomeModule, "contributes">
  hasScript?: boolean
  scriptRun?: boolean
}

/**
 * Whether a module keeps the contract of the extension points it adds to, whatever it does: what is the same for every module, and what a
 * typing error or a misread interface breaks without a word (a key misspelt, a wind in the wrong sense, an object made with a second three.js).
 *
 * Not whether what it says is right, which is for its own tests, and not whether it is safe: the script has already run with everything the
 * page can do. The Modules panel runs it when asked, in the browser, where a service that refuses other sites shows; the project's own tests
 * run it on every built-in implementation (test/modules/ModuleConformance.test.ts).
 */
export class ModuleConformance {
  /** What an implementation of each point has to have, for what is not tried further: compiled against the points, so that a new one is listed. */
  private static readonly MEMBERS: Readonly<Record<ExtensionPointId, readonly string[]>> = {
    weather: ["getWeather"],
    place: ["attribution", "search", "reverse"],
    timeZone: ["zoneAt"],
    narrative: ["settings", "draft"],
    assessment: ["assess"],
    lightPollution: ["year", "citation", "lookUp"],
    aircraft: ["citation", "between"],
    upperAir: ["between"],
    elevation: ["getElevationGrid"],
    imagery: ["attribution", "getImageryTexture"],
    surroundings: ["id", "name", "attribution", "creditUrl", "contemporary", "covers", "getSurroundings"],
    decorModels: ["attribution", "entries", "entry"],
    skyEvents: ["key", "messages", "simulation"],
    interpretations: ["key", "messages", "bodiesOf"],
    perception: ["id", "messages", "sources", "settings", "perceive"]
  }

  /** The fields of a weather that go from 0 to 1, when they are there. */
  private static readonly WEATHER_SHARES = ["cloudCover", "cloudDarkness", "precipitationIntensity", "highCloudCover", "lowerCloudCover", "iceCrystalAlignment", "rareIceCrystals", "relativeHumidity"] as const
  private static readonly WEATHER_REQUIRED = ["cloudCover", "cloudDarkness", "precipitationIntensity"] as const
  private static readonly PRECIPITATIONS: readonly unknown[] = ["none", "rain", "snow", "hail"]
  /** Metres a second: beyond the strongest winds measured at the ground, what is written here is likely to be in other units. */
  private static readonly HIGH_WIND_MS = 60
  private static readonly TIMEOUT_MS = 30_000

  static async check(subject: ConformanceSubject, context: ConformanceContext = {}): Promise<ConformanceFinding[]> {
    const findings: ConformanceFinding[] = []
    if (subject.hasScript && !subject.scriptRun) findings.push({ level: "note", code: "scriptNotRun" })
    for (const [point, sources] of Object.entries(subject.module.contributes as Record<string, unknown>)) {
      if (!Object.hasOwn(ModuleConformance.MEMBERS, point)) {
        findings.push({ level: "failed", code: "unknownPoint", point })
      } else if (!Array.isArray(sources)) {
        findings.push({ level: "failed", code: "notAList", point })
      } else {
        await ModuleConformance.checkPoint(point as ExtensionPointId, sources as DataSource<unknown>[], context, findings)
      }
    }
    return findings
  }

  private static async checkPoint(point: ExtensionPointId, sources: readonly DataSource<unknown>[], context: ConformanceContext, findings: ConformanceFinding[]): Promise<void> {
    const seen = new Set<unknown>()
    for (const source of sources) {
      const say = (code: ConformanceCode, detail?: string, level: ConformanceFinding["level"] = "failed"): void => {
        findings.push({ level, code, point, source: typeof source?.id === "string" ? source.id : undefined, detail })
      }
      if (seen.has(source?.id)) say("duplicateId")
      seen.add(source?.id)
      ModuleConformance.checkEntry(source, say)
      if (typeof source?.create !== "function") {
        say("createMissing")
        continue
      }
      const built = ModuleConformance.build(source, say)
      if (built === undefined) continue
      const missing = ModuleConformance.MEMBERS[point].filter(member => (built as Record<string, unknown>)[member] === undefined)
      for (const member of missing) say("missingMember", member)
      if (missing.length > 0) continue
      if (point === "weather") await ModuleConformance.checkWeather(source.id, built as WeatherProvider, context, say)
      if (point === "skyEvents") await ModuleConformance.checkSkyEventKind(source.id, built as SkyEventKind, context, say)
      if (point === "interpretations") await ModuleConformance.checkInterpretationKind(source.id, built as InterpretationKind, context, say)
    }
  }

  private static checkEntry(source: DataSource<unknown>, say: Say): void {
    for (const field of ["id", "name", "credit", "creditUrl"] as const) {
      const value = source?.[field]
      if (typeof value !== "string" || value.trim() === "") say("entryField", field)
    }
    if (typeof source?.creditUrl === "string" && source.creditUrl !== "" && !URL.canParse(source.creditUrl)) say("entryField", "creditUrl")
  }

  /** What a source builds, its building watched: a picker lists a source without using it, so `create` is to cost nothing, least of all a request. */
  private static build(source: DataSource<unknown>, say: Say): unknown {
    let asked = false
    const watching = (async () => {
      asked = true
      return new Response("", { status: 503 })
    }) as typeof fetch
    const page = globalThis.fetch
    globalThis.fetch = watching
    try {
      const built = source.create(watching)
      if (asked) say("createAsked")
      if (built === undefined || built === null) {
        say("createEmpty")
        return undefined
      }
      return built
    } catch (error) {
      say("createThrew", ModuleConformance.told(error))
      return undefined
    } finally {
      globalThis.fetch = page
    }
  }

  private static async checkWeather(id: string, provider: WeatherProvider, context: ConformanceContext, say: Say): Promise<void> {
    const query = context.weatherQuery
    if (!query) {
      say("weatherNotAsked", undefined, "note")
      return
    }
    let observation: WeatherObservation | undefined
    try {
      observation = await ModuleConformance.within(provider.getWeather(query), context)
    } catch (error) {
      say("weatherThrew", ModuleConformance.told(error))
      return
    }
    if (observation === undefined) {
      say("weatherNoRecord", undefined, "note")
      return
    }
    const samples = observation?.samples
    if (!Array.isArray(samples) || samples.length !== query.points.length) {
      say("weatherSamples", `${Array.isArray(samples) ? samples.length : 0}/${query.points.length}`)
      return
    }
    if (samples.some((sample, i) => sample?.time?.getTime?.() !== query.points[i].time.getTime())) say("weatherOrder")
    const wrong = new Set<string>()
    let highWind = false
    for (const sample of samples) {
      const weather = (sample?.weather ?? {}) as unknown as Record<string, unknown>
      for (const field of ModuleConformance.WEATHER_SHARES) {
        const value = weather[field]
        const required = (ModuleConformance.WEATHER_REQUIRED as readonly string[]).includes(field)
        if ((value !== undefined || required) && !ModuleConformance.between(value, 0, 1)) wrong.add(`${field} = ${String(value)}`)
      }
      if (!ModuleConformance.between(weather.windDirectionDeg, 0, 360)) wrong.add(`windDirectionDeg = ${String(weather.windDirectionDeg)}`)
      if (!ModuleConformance.between(weather.windSpeed, 0, Infinity)) wrong.add(`windSpeed = ${String(weather.windSpeed)}`)
      else if ((weather.windSpeed as number) > ModuleConformance.HIGH_WIND_MS) highWind = true
      if (!ModuleConformance.PRECIPITATIONS.includes(weather.precipitationType)) wrong.add(`precipitationType = ${String(weather.precipitationType)}`)
      if (typeof weather.storm !== "boolean") wrong.add(`storm = ${String(weather.storm)}`)
    }
    for (const value of wrong) say("weatherValue", value)
    if (highWind) say("weatherWindHigh", undefined, "note")
    // The editor tells a lookup of its own from a weather a report names by this id (see isRecordSource): another one is not asked again.
    if (observation.source?.id !== id) say("weatherSource", "id")
    if (typeof observation.source?.name !== "string" || observation.source.name === "") say("weatherSource", "name")
    if (typeof observation.source?.url !== "string" || observation.source.url === "") say("weatherSource", "url")
  }

  private static async checkSkyEventKind(id: string, kind: SkyEventKind, context: ConformanceContext, say: Say): Promise<void> {
    if (kind.key !== id) say("kindKey", String(kind.key))
    await ModuleConformance.checkTexts(kind.messages, ["title", "name"], context, say)
    let simulation: SkyEventSimulation
    try {
      const build = await ModuleConformance.within(kind.simulation(), context)
      simulation = build()
    } catch (error) {
      say("simulationFailed", ModuleConformance.told(error))
      return
    }
    // Loaded as a module's script is: a kind asked for by nobody costs nobody its three.js.
    const { MODULE_THREE: three } = await import("./sky-events/ModuleThree.js")
    if (!(simulation?.object instanceof three.Object3D)) {
      say("secondThree")
      return
    }
    try {
      simulation.update([], 0, ModuleConformance.frame(new three.Vector3()))
      if (simulation.drawnCount !== 0) say("drawnWithoutEvents", String(simulation.drawnCount))
    } catch (error) {
      say("updateThrew", ModuleConformance.told(error))
    }
    // The scene only calls dispose (see SceneRenderer.disposeSkyEventLayer): what it leaves stays drawn.
    const scene = new three.Group()
    scene.add(simulation.object)
    try {
      simulation.dispose()
      if (simulation.object.parent === scene) say("disposeLeft")
    } catch (error) {
      say("disposeThrew", ModuleConformance.told(error))
    }
  }

  private static async checkInterpretationKind(id: string, kind: InterpretationKind, context: ConformanceContext, say: Say): Promise<void> {
    if (kind.key !== id) say("kindKey", String(kind.key))
    await ModuleConformance.checkTexts(kind.messages, ["title"], context, say)
    const items = context.interpretation?.[kind.key]
    if (!Array.isArray(items) || items.length === 0) {
      say("readingNotTried", undefined, "note")
      return
    }
    for (const item of items) {
      try {
        const bodies: BodyJson[] = kind.bodiesOf(item)
        if (!Array.isArray(bodies)) say("readingNotAList")
      } catch (error) {
        say("readingThrew", ModuleConformance.told(error))
      }
    }
  }

  private static async checkTexts(messages: { load(language: string): Promise<object> }, keys: readonly string[], context: ConformanceContext, say: Say): Promise<void> {
    // English, what a reader gets when the interface is not in their language, and French, which a catalog that only knows one forgets.
    for (const language of ["en", "fr"]) {
      try {
        const texts = await ModuleConformance.within(messages.load(language), context) as unknown as Record<string, unknown>
        for (const key of keys) {
          if (typeof texts?.[key] !== "string" || texts[key] === "") say("kindMessages", `${language}: ${key}`)
        }
      } catch (error) {
        say("kindMessages", `${language}: ${ModuleConformance.told(error)}`)
      }
    }
  }

  /** A frame nothing stands in: enough for a simulation given no events, which is all it can be given without knowing what its events state. */
  private static frame(eye: SkyEventFrame["eye"]): SkyEventFrame {
    return {
      reference: { lat: 0, lng: 0 }, origin: { x: 0, z: 0 }, eastScale: 1, siteElevationM: 0, eye, pixelRad: 0.001, relativeScale: 1,
      air: {} as SkyEventFrame["air"], transmittanceTo: () => [1, 1, 1], groundYAt: () => 0, wind: { eastMS: 0, northMS: 0 },
      observer: { lat: 0, lng: 0, heightM: 0 }, date: new Date(0), magnitudeLimit: 6, cloudTransmission: () => 1,
      arrivingIlluminance: () => [0, 0, 0], transmittanceFromSpace: () => [1, 1, 1], lightFrom: () => undefined, glareFrom: () => undefined
    }
  }

  private static between(value: unknown, least: number, most: number): boolean {
    return typeof value === "number" && !Number.isNaN(value) && value >= least && value <= most
  }

  private static told(error: unknown): string {
    return error instanceof Error ? error.message : String(error)
  }

  private static within<T>(answer: Promise<T>, context: ConformanceContext): Promise<T> {
    const timeoutMs = context.timeoutMs ?? ModuleConformance.TIMEOUT_MS
    let timer: ReturnType<typeof setTimeout>
    const late = new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new Error(`> ${timeoutMs / 1000} s`)), timeoutMs)
    })
    return Promise.race([answer, late]).finally(() => clearTimeout(timer))
  }
}

type Say = (code: ConformanceCode, detail?: string, level?: ConformanceFinding["level"]) => void
