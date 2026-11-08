import { describe, expect, it, afterEach, beforeAll, vi } from "vitest"
import { WordsAudit } from "./WordsAudit.js"

/* Every word <rr0-sighting-editor> shows of its own is one of its messages: mounted with pseudo-words (see WordsAudit), it shows nothing
 * else. The scene inside it is audited with <rr0-sighting>. The scene and the canvas are stubbed as in SightingEditorElement.test.ts. */

// Every module of English words in the project, pseudo-words instead (see WordsAudit).
vi.mock("../../src/component/messages/BodyEditorMessages_en.js", async original => {
  const { WordsAudit } = await import("./WordsAudit.js")
  const actual = await original<typeof import("../../src/component/messages/BodyEditorMessages_en.js")>()
  return { ...actual, bodyEditorMessages_en: WordsAudit.pseudo(actual.bodyEditorMessages_en) }
})
vi.mock("../../src/component/messages/CaseEditorMessages_en.js", async original => {
  const { WordsAudit } = await import("./WordsAudit.js")
  const actual = await original<typeof import("../../src/component/messages/CaseEditorMessages_en.js")>()
  return { ...actual, caseEditorMessages_en: WordsAudit.pseudo(actual.caseEditorMessages_en) }
})
vi.mock("../../src/component/messages/CloudEditorMessages_en.js", async original => {
  const { WordsAudit } = await import("./WordsAudit.js")
  const actual = await original<typeof import("../../src/component/messages/CloudEditorMessages_en.js")>()
  return { ...actual, cloudEditorMessages_en: WordsAudit.pseudo(actual.cloudEditorMessages_en) }
})
vi.mock("../../src/component/messages/EventsMessages_en.js", async original => {
  const { WordsAudit } = await import("./WordsAudit.js")
  const actual = await original<typeof import("../../src/component/messages/EventsMessages_en.js")>()
  return { ...actual, eventsMessages_en: WordsAudit.pseudo(actual.eventsMessages_en) }
})
vi.mock("../../src/component/messages/InterviewMessages_en.js", async original => {
  const { WordsAudit } = await import("./WordsAudit.js")
  const actual = await original<typeof import("../../src/component/messages/InterviewMessages_en.js")>()
  return { ...actual, interviewMessages_en: WordsAudit.pseudo(actual.interviewMessages_en) }
})
vi.mock("../../src/component/messages/ModulesPanelMessages_en.js", async original => {
  const { WordsAudit } = await import("./WordsAudit.js")
  const actual = await original<typeof import("../../src/component/messages/ModulesPanelMessages_en.js")>()
  return { ...actual, modulesPanelMessages_en: WordsAudit.pseudo(actual.modulesPanelMessages_en) }
})
vi.mock("../../src/component/messages/SceneNames_en.js", async original => {
  const { WordsAudit } = await import("./WordsAudit.js")
  const actual = await original<typeof import("../../src/component/messages/SceneNames_en.js")>()
  return { ...actual, sceneNames_en: WordsAudit.pseudo(actual.sceneNames_en) }
})
vi.mock("../../src/component/messages/ShareMessages_en.js", async original => {
  const { WordsAudit } = await import("./WordsAudit.js")
  const actual = await original<typeof import("../../src/component/messages/ShareMessages_en.js")>()
  return { ...actual, shareMessages_en: WordsAudit.pseudo(actual.shareMessages_en) }
})
vi.mock("../../src/component/messages/SightingEditorMessages_en.js", async original => {
  const { WordsAudit } = await import("./WordsAudit.js")
  const actual = await original<typeof import("../../src/component/messages/SightingEditorMessages_en.js")>()
  return { ...actual, sightingEditorMessages_en: WordsAudit.pseudo(actual.sightingEditorMessages_en) }
})
vi.mock("../../src/component/messages/SightingLabels_en.js", async original => {
  const { WordsAudit } = await import("./WordsAudit.js")
  const actual = await original<typeof import("../../src/component/messages/SightingLabels_en.js")>()
  return { ...actual, sightingLabels_en: WordsAudit.pseudo(actual.sightingLabels_en) }
})
vi.mock("../../src/component/messages/SightingMessages_en.js", async original => {
  const { WordsAudit } = await import("./WordsAudit.js")
  const actual = await original<typeof import("../../src/component/messages/SightingMessages_en.js")>()
  return { ...actual, sightingMessages_en: WordsAudit.pseudo(actual.sightingMessages_en) }
})
vi.mock("../../src/component/messages/UfoMessages_en.js", async original => {
  const { WordsAudit } = await import("./WordsAudit.js")
  const actual = await original<typeof import("../../src/component/messages/UfoMessages_en.js")>()
  return { ...actual, ufoMessages_en: WordsAudit.pseudo(actual.ufoMessages_en) }
})
vi.mock("../../src/component/messages/WitnessErrorMessages_en.js", async original => {
  const { WordsAudit } = await import("./WordsAudit.js")
  const actual = await original<typeof import("../../src/component/messages/WitnessErrorMessages_en.js")>()
  return { ...actual, witnessErrorMessages_en: WordsAudit.pseudo(actual.witnessErrorMessages_en) }
})
vi.mock("../../src/engine/interpretation/messages/BodyParameterTexts_en.js", async original => {
  const { WordsAudit } = await import("./WordsAudit.js")
  const actual = await original<typeof import("../../src/engine/interpretation/messages/BodyParameterTexts_en.js")>()
  return { ...actual, bodyParameterTexts_en: WordsAudit.pseudo(actual.bodyParameterTexts_en) }
})
vi.mock("../../src/engine/model/messages/CloudParameterTexts_en.js", async original => {
  const { WordsAudit } = await import("./WordsAudit.js")
  const actual = await original<typeof import("../../src/engine/model/messages/CloudParameterTexts_en.js")>()
  return { ...actual, cloudParameterTexts_en: WordsAudit.pseudo(actual.cloudParameterTexts_en) }
})
vi.mock("../../src/engine/model/messages/DecorParameterTexts_en.js", async original => {
  const { WordsAudit } = await import("./WordsAudit.js")
  const actual = await original<typeof import("../../src/engine/model/messages/DecorParameterTexts_en.js")>()
  return { ...actual, decorParameterTexts_en: WordsAudit.pseudo(actual.decorParameterTexts_en) }
})
vi.mock("../../src/modules/interpretations/flares/messages/FlareKindMessages_en.js", async original => {
  const { WordsAudit } = await import("./WordsAudit.js")
  const actual = await original<typeof import("../../src/modules/interpretations/flares/messages/FlareKindMessages_en.js")>()
  return { ...actual, flareKindMessages_en: WordsAudit.pseudo(actual.flareKindMessages_en) }
})
vi.mock("../../src/modules/interpretations/lanterns/messages/LanternEditorMessages_en.js", async original => {
  const { WordsAudit } = await import("./WordsAudit.js")
  const actual = await original<typeof import("../../src/modules/interpretations/lanterns/messages/LanternEditorMessages_en.js")>()
  return { ...actual, lanternEditorMessages_en: WordsAudit.pseudo(actual.lanternEditorMessages_en) }
})
vi.mock("../../src/modules/interpretations/lanterns/messages/LanternKindMessages_en.js", async original => {
  const { WordsAudit } = await import("./WordsAudit.js")
  const actual = await original<typeof import("../../src/modules/interpretations/lanterns/messages/LanternKindMessages_en.js")>()
  return { ...actual, lanternKindMessages_en: WordsAudit.pseudo(actual.lanternKindMessages_en) }
})
vi.mock("../../src/modules/interpretations/lanterns/messages/LanternParameterTexts_en.js", async original => {
  const { WordsAudit } = await import("./WordsAudit.js")
  const actual = await original<typeof import("../../src/modules/interpretations/lanterns/messages/LanternParameterTexts_en.js")>()
  return { ...actual, lanternParameterTexts_en: WordsAudit.pseudo(actual.lanternParameterTexts_en) }
})
vi.mock("../../src/modules/perception/messages/PerceptionMessages_en.js", async original => {
  const { WordsAudit } = await import("./WordsAudit.js")
  const actual = await original<typeof import("../../src/modules/perception/messages/PerceptionMessages_en.js")>()
  return { ...actual, perceptionMessages_en: WordsAudit.pseudo(actual.perceptionMessages_en) }
})
vi.mock("../../src/modules/providers/narrative/messages/ClaudeNarrativeTexts_en.js", async original => {
  const { WordsAudit } = await import("./WordsAudit.js")
  const actual = await original<typeof import("../../src/modules/providers/narrative/messages/ClaudeNarrativeTexts_en.js")>()
  return { ...actual, claudeNarrativeTexts_en: WordsAudit.pseudo(actual.claudeNarrativeTexts_en) }
})
vi.mock("../../src/modules/sky-events/beams/messages/BeamEditorMessages_en.js", async original => {
  const { WordsAudit } = await import("./WordsAudit.js")
  const actual = await original<typeof import("../../src/modules/sky-events/beams/messages/BeamEditorMessages_en.js")>()
  return { ...actual, beamEditorMessages_en: WordsAudit.pseudo(actual.beamEditorMessages_en) }
})
vi.mock("../../src/modules/sky-events/beams/messages/BeamKindMessages_en.js", async original => {
  const { WordsAudit } = await import("./WordsAudit.js")
  const actual = await original<typeof import("../../src/modules/sky-events/beams/messages/BeamKindMessages_en.js")>()
  return { ...actual, beamKindMessages_en: WordsAudit.pseudo(actual.beamKindMessages_en) }
})
vi.mock("../../src/modules/sky-events/beams/messages/BeamParameterTexts_en.js", async original => {
  const { WordsAudit } = await import("./WordsAudit.js")
  const actual = await original<typeof import("../../src/modules/sky-events/beams/messages/BeamParameterTexts_en.js")>()
  return { ...actual, beamParameterTexts_en: WordsAudit.pseudo(actual.beamParameterTexts_en) }
})
vi.mock("../../src/modules/sky-events/launches/messages/LaunchEditorMessages_en.js", async original => {
  const { WordsAudit } = await import("./WordsAudit.js")
  const actual = await original<typeof import("../../src/modules/sky-events/launches/messages/LaunchEditorMessages_en.js")>()
  return { ...actual, launchEditorMessages_en: WordsAudit.pseudo(actual.launchEditorMessages_en) }
})
vi.mock("../../src/modules/sky-events/launches/messages/LaunchKindMessages_en.js", async original => {
  const { WordsAudit } = await import("./WordsAudit.js")
  const actual = await original<typeof import("../../src/modules/sky-events/launches/messages/LaunchKindMessages_en.js")>()
  return { ...actual, launchKindMessages_en: WordsAudit.pseudo(actual.launchKindMessages_en) }
})
vi.mock("../../src/modules/sky-events/launches/messages/LaunchParameterTexts_en.js", async original => {
  const { WordsAudit } = await import("./WordsAudit.js")
  const actual = await original<typeof import("../../src/modules/sky-events/launches/messages/LaunchParameterTexts_en.js")>()
  return { ...actual, launchParameterTexts_en: WordsAudit.pseudo(actual.launchParameterTexts_en) }
})
vi.mock("../../src/modules/sky-events/reentries/messages/ReentryEditorMessages_en.js", async original => {
  const { WordsAudit } = await import("./WordsAudit.js")
  const actual = await original<typeof import("../../src/modules/sky-events/reentries/messages/ReentryEditorMessages_en.js")>()
  return { ...actual, reentryEditorMessages_en: WordsAudit.pseudo(actual.reentryEditorMessages_en) }
})
vi.mock("../../src/modules/sky-events/reentries/messages/ReentryKindMessages_en.js", async original => {
  const { WordsAudit } = await import("./WordsAudit.js")
  const actual = await original<typeof import("../../src/modules/sky-events/reentries/messages/ReentryKindMessages_en.js")>()
  return { ...actual, reentryKindMessages_en: WordsAudit.pseudo(actual.reentryKindMessages_en) }
})
vi.mock("../../src/modules/sky-events/reentries/messages/ReentryParameterTexts_en.js", async original => {
  const { WordsAudit } = await import("./WordsAudit.js")
  const actual = await original<typeof import("../../src/modules/sky-events/reentries/messages/ReentryParameterTexts_en.js")>()
  return { ...actual, reentryParameterTexts_en: WordsAudit.pseudo(actual.reentryParameterTexts_en) }
})

const { register, ELEMENT_NAME } = await import("../../src/component/SightingEditorElement.js")
register()
vi.mock("../../src/render3d/SceneRenderer.js", () => ({
  SceneRenderer: class {
    resize(): void {}
    setObserverPose(): void {}
    cloudDirectionAt() { return { x: 0, y: 0.4, z: -0.9165 } }
    setCloudRendering(): void {}
    setCloudOffset(): void {}
    setGait(): void {}
    setTerrainOrigin(): void {}
    setObserverRoute(): void {}
    setObserverHeadlights(): void {}
    setStatedRoads(): void {}
    setTraces(): void {}
    setTracesShown(): void {}
    setTerrainProviders(): void {}
    get currentTerrainAttribution(): undefined {
      return undefined
    }
    setDecorModelProvider(): void {}
    entryOfDecorModel(): Promise<undefined> { return Promise.resolve(undefined) }
    get currentDecorModelCredits(): never[] {
      return []
    }
    setAstronomy(): void {}
    setShowCompass(): void {}
    setCompassPoints(): void {}
    setCompassHovered(): void {}
    setCompassForced(): void {}
    setIndoorLook(): void {}
    setWeather(): void {}
    setDecor(): void {}
    groundAltitudeM = 0
    setDecorPresence(): void {}
    setDecorSunlight(): void {}
    setContrails(): void {}
    setContrailSunlight(): void {}
    setReferences(): void {}
    setReferencesShown(): void {}
    setReferencesTime(): void {}
    setReferenceView(): void {}
    referenceFailure(): undefined {
      return undefined
    }
    /** A loaded 3:2 photograph, so the editor can tell the picture from the scene around it. */
    referenceAspect(): number {
      return 1.5
    }
    directionAt(): { x: number; y: number; z: number } {
      return { x: 0, y: 0, z: -1 }
    }
    setPhenomena(): void {}
    screenPointOf(): undefined {
      return undefined
    }
    updateDecorAnchoring(): void {}
    setBodies(): void {}
    pickPlacedBodyAt(): undefined { return undefined }
    /** Every body covers the middle of the picture, a fifth of it across. */
    bodyScreenBox() { return { minX: -0.1, minY: -0.1, maxX: 0.1, maxY: 0.1 } }
    get bodyGround() { return { heightAt: () => 0 } }
    updateDecorLitState(): void {}
    pickBodyAt(): undefined {
      return undefined
    }
    pickDecorAt(): undefined {
      return undefined
    }
    decorDistanceM() {
      return undefined
    }
    decorScreenBox(): undefined {
      return undefined
    }
    decorGrabHeightAt(): number {
      return 0
    }
    decorMetresPerNdcY(): number {
      return 0
    }
    setLightning(): void {}
    updateLightning(): void {}
    setSatellites(): void {}
    setSkyEvents(): void {}
    pickTrafficAt(): undefined {
      return undefined
    }
    pickOpticsAt(): undefined {
      return undefined
    }
    pickRailwayAt(): undefined {
      return undefined
    }
    pickSatelliteAt(): undefined {
      return undefined
    }
    pickStarAt(): undefined {
      return undefined
    }
    decorDistancesAt(): { behindM?: number; inFrontM?: number } {
      return {}
    }
    setInstrument(): void {}
    setInstrumentGain(): void {}
    setLightPollution(): void {}
    setRecordingTime(): void {}
    setRetinaHistory(): void {}
    setMedium(): void {}
    setLensGhosts(): void {}
    pickGhostAt(): undefined { return undefined }
    pickAfterimageAt(): boolean { return false }
    pickDropAt(): boolean { return false }
    setPerception(): void {}
    setSkyUnknown(): void {}
    setLensOptics(): void {}
    setExposure(): void {}
    private meteors: { t: number; durationMs: number }[] = []
    setMeteorShower(meteors: { t: number; durationMs: number }[]): void {
      this.meteors = meteors
    }
    get meteorSchedule(): { t: number; durationMs: number }[] {
      return this.meteors
    }
    groundHidesDirection(altitudeDeg: number): boolean {
      return altitudeDeg < 0
    }
    get groundKey(): string {
      return ""
    }
    meteorMidpoint(): { altitudeDeg: number; azimuthDeg: number } {
      return { altitudeDeg: 42, azimuthDeg: 137 }
    }
    updateMeteors(): void {}
    render(): void {}
    dispose(): void {}
    startTwinkle(): void {}
    frame(): void {}
    compileNextFrameOffThread(): void {}
    holdForNewScene(): void {}
    releaseContext(): void {}
    restoreContext(): void {}
    stopTwinkle(): void {}
    setAnimationsRunning(): void {}
  }
}))

// The chunks the editor loads only when asked (the scenery's registry, the assessors, the File group's text editor, the other languages...),
// loaded once before any test. On a Windows runner (Node 22, since 0.133.0) the worker running this long file stopped being sent any
// module it had not had yet, after a few hundred tests: every mount's import() then waited until the run ended (407 "Timeout calling
// fetch"), and the 14 tests that wait on one of them (the assessment's marks, the File group) ran out of time.
beforeAll(async () => {
  await Promise.all([
    import("../../src/modules/providers/terrain/surroundingsSources.js"),
    import("../../src/modules/assessors/CoverageAssessor.js"),
    import("../../src/modules/assessors/HynekAssessor.js"),
    import("../../src/component/SightingFileEditor.js"),
    import("../../src/component/BodyEditor.js"),
    import("../../src/modules/sky-events/beams/BeamEditor.js"),
    import("../../src/modules/sky-events/launches/LaunchEditor.js"),
    import("../../src/component/InputFileElement.js"),
    import("../../src/render3d/decor/ModelViewer.js"),
    import("../../src/render3d/decor/ModelThumbnails.js"),
    import("../../src/component/trafficRuntime.js"),
    import("../../src/engine/interop/KmlImport.js"),
    import("../../src/engine/astronomy/SatellitePasses.js"),
    import("../../src/generated/sightingSchema.json"),
    import("fflate"),
    ...Object.values(import.meta.glob("../../src/component/messages/*_{en,fr,es,it}.ts")).map(load => load())
  ])
}, 120_000)

// jsdom's <canvas> has no real 2D context (getContext("2d") returns null without the
// native `canvas` package) — stub it, same as test/render/CanvasRenderer.test.ts's mock,
// so mounting the component doesn't throw when it paints its initial preview.
beforeAll(() => {
  // jsdom lays nothing out and has no Range geometry; CodeMirror (the File group's text editor) measures with it.
  const emptyRects = () => ({ length: 0, item: () => null, [Symbol.iterator]: function* () {} }) as unknown as DOMRectList
  Range.prototype.getClientRects ??= emptyRects
  Range.prototype.getBoundingClientRect ??= () => new DOMRect()
  HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement) {
    // A fresh object per canvas, not one shared: a renderer that sizes itself from its own canvas
    // (see ObserverMapRenderer) reads ctx.canvas, and one shared object makes every canvas claim to
    // be the same one. Plain no-ops, not vi.fn(): vitest keeps every mock it ever made (and the `this` each
    // was called on, here the context and so its canvas and the whole editor around it) for the life of
    // the worker, which is what held every mounted editor in memory after its test.
    const noop = (): void => {}
    return {
      canvas: this,
      save: noop,
      restore: noop,
      beginPath: noop,
      closePath: noop,
      fill: noop,
      ellipse: noop,
      moveTo: noop,
      lineTo: noop,
      translate: noop,
      rotate: noop,
      clearRect: noop,
      strokeRect: noop,
      stroke: noop,
      fillRect: noop,
      arc: noop,
      fillText: noop,
      strokeText: noop,
      drawImage: noop,
      createRadialGradient: () => ({ addColorStop: noop }),
      measureText: (text: string) => ({ width: text.length * 5 }),
    } as unknown as CanvasRenderingContext2D
  } as unknown as typeof HTMLCanvasElement.prototype.getContext
  // The nested <rr0-scene> lazily fetches the star catalog on connect — stub a tiny valid
  // response so that fire-and-forget fetch resolves instead of rejecting (jsdom's fetch can't
  // resolve a relative URL against a real page origin anyway). Plain assignment, not
  // vi.stubGlobal: the "export button" describe block below calls vi.unstubAllGlobals() in its
  // own afterEach to clean up its own Blob/URL stubs, which would otherwise also wipe these two
  // needed by every other describe block's mount().
  globalThis.fetch = (() => Promise.resolve({ arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)) })) as unknown as typeof fetch
  // jsdom has no ResizeObserver — SceneElement.connectedCallback() (also nested now) uses one to
  // track its canvas size.
  globalThis.ResizeObserver = class {
    observe(): void {}
    unobserve(): void {}
    disconnect(): void {}
  } as unknown as typeof ResizeObserver
})

// Whatever a test spied on (a canvas' getBoundingClientRect, a window method) is released with it, and the
// editors it mounted go with the page. vitest keeps every spy in a registry for the life of the worker, and a
// spy holds what it was set on: a spied canvas kept its editor, and everything the editor nests, alive
// until the file ended, which took this file past 4 GB of heap.
afterEach(() => {
  document.body.innerHTML = ""
  vi.restoreAllMocks()
})

/** What the editor shows, wherever it is in the page: what it shows of a shape, a building, a reference or a moment once each is there. */
async function mounted(): Promise<HTMLElement> {
  document.documentElement.lang = "en"
  const element = document.createElement(ELEMENT_NAME) as HTMLElement & { ready: Promise<void> }
  document.body.appendChild(element)
  await element.ready
  for (const id of ["add-shape-oval", "option-decor-building", "add-reference", "add-milestone"]) (element.shadowRoot!.getElementById(id) as HTMLButtonElement | null)?.click()
  await new Promise(resolve => setTimeout(resolve, 300))
  return element
}

/**
 * What the providers say of themselves (see DataSource): a service's name and the attribution its licensor asks for, kept as written;
 * and the names of the assessors, which are their authors'.
 */
const PROVIDERS = Object.values(import.meta.glob([
  "../../src/modules/providers/**/*.ts", "../../src/modules/models/*.ts", "../../src/modules/assessors/*.ts"
], { query: "?raw", import: "default", eager: true }) as Record<string, string>)
const PROVIDERS_TEXTS = new Set([
  ...PROVIDERS.flatMap(source => [...source.matchAll(/"((?:[^"\\]|\\.)*)"/g)].map(match => match[1])),
  // The surroundings source made of two others, which the editor declares itself: a provider's name and credit like the others.
  "IGN BD TOPO / OpenStreetMap", "© IGN, BD TOPO (Licence Ouverte 2.0) in France; © OpenStreetMap contributors (ODbL) elsewhere"
])

/** Words that are no words to translate: the project's name, units, an example of an id, the time zones' names (see Intl). */
const NO_WORDS = new Set(["UFO@home", "ISO", "mag/arcsec²", "UTC±h", "1964-04-24-ZamoraLonnie"])

/** Whether `text` is not the editor's to say: no word, or what a provider says of itself (with the ellipsis of a choice). */
function notTheEditors(text: string): boolean {
  if (NO_WORDS.has(text) || text.startsWith("https://") || /^[A-Z][A-Za-z_]+\/[A-Za-z_/+-]+$/.test(text)) return true
  return PROVIDERS_TEXTS.has(text.replace(/ …$/, "")) || text.split(" ").every(part => PROVIDERS_TEXTS.has(part))
}

describe("the words of <rr0-sighting-editor>", () => {
  it("all come from its messages", async () => {
    const element = await mounted()
    const leftovers = WordsAudit.leftovers(element, notTheEditors, node => node.tagName === "RR0-SCENE")
    expect(leftovers).toEqual([])
  })
})
