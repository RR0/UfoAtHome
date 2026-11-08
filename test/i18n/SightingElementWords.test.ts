import { describe, expect, it, beforeAll, vi } from "vitest"
import { WordsAudit } from "./WordsAudit.js"

/* Every word <rr0-sighting> shows is one of its messages: mounted with pseudo-words (see WordsAudit), it shows nothing else. The scene and
 * the canvas are stubbed as in SightingElement.test.ts. */

vi.mock("../../src/render3d/SceneRenderer.js", () => ({
  SceneRenderer: class {
    resize(): void {}
    setObserverPose(): void {}
    setCloudRendering(): void {}
    setCloudOffset(): void {}
    setGait(): void {}
    setTerrainOrigin(): void {}
    setObserverRoute(): void {}
    setObserverHeadlights(): void {}
    setStatedRoads(): void {}
    setTraces(): void {}
    setTracesShown(): void {}
    get currentTerrainAttribution(): undefined {
      return undefined
    }
    setDecorModelProvider(): void {}
    get currentDecorModelCredits(): never[] {
      return []
    }
    setAstronomy(): void {}
    setShowCompass(): void {}
    setCompassPoints(): void {}
    setCompassHovered(): void {}
    setCompassForced(): void {}
    setWeather(): void {}
    setDecor(): void {}
    groundAltitudeM = 0
    setDecorPresence(): void {}
    setDecorSunlight(): void {}
    setContrails(): void {}
    setContrailSunlight(): void {}
    setReferences(): void {}
    setReferencesShown(): void {}
    setReferenceView(): void {}
    referenceFailure(): undefined {
      return undefined
    }
    referenceAspect(): undefined {
      return undefined
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
    get bodyGround() { return { heightAt: () => 0 } }
    updateDecorLitState(): void {}
    pickBodyAt(): undefined {
      return undefined
    }
    pickDecorAt(): undefined {
      return undefined
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
    setMeteorShower(): void {}
    get meteorSchedule(): unknown[] {
      return []
    }
    groundHidesDirection(altitudeDeg: number): boolean {
      return altitudeDeg < 0
    }
    get groundKey(): string {
      return ""
    }
    meteorMidpoint(): undefined {
      return undefined
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

const { registerSighting, SIGHTING_ELEMENT_NAME } = await import("../../src/component/SightingElement.js")
registerSighting()

beforeAll(() => {
  HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement) {
    // A fresh object per canvas, not one shared: a renderer that sizes itself from its own canvas
    // (see ObserverMapRenderer) reads ctx.canvas, and one shared object makes every canvas claim to
    // be the same one.
    // Plain no-ops, not vi.fn(): vitest keeps every mock it ever made, and the `this` each was called on
    // (here the context, so its canvas and the element around it), for the life of the worker.
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
  // The nested <rr0-scene> lazily fetches the star catalog on connect — a safe default so that
  // fire-and-forget fetch resolves instead of rejecting whenever a test's own stubFetch() (below)
  // isn't active yet/covers other URLs. Plain assignment, not vi.stubGlobal, so per-test
  // vi.stubGlobal("fetch", ...) calls (via stubFetch) restore back to *this* on their own
  // afterEach's vi.unstubAllGlobals(), same reasoning as SightingEditorElement.test.ts's identical stub.
  globalThis.fetch = vi.fn().mockResolvedValue({ arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)) }) as typeof fetch
  // jsdom has no ResizeObserver — SceneElement.connectedCallback() (also nested now) uses one to
  // track its canvas size.
  globalThis.ResizeObserver = class {
    observe(): void {}
    unobserve(): void {}
    disconnect(): void {}
  } as unknown as typeof ResizeObserver
})

Range.prototype.getClientRects ??= () => [] as unknown as DOMRectList
Range.prototype.getBoundingClientRect ??= () => new DOMRect()

describe("the words of <rr0-sighting>", () => {
  it("all come from its messages", async () => {
    document.documentElement.lang = "en"
    const element = document.createElement(SIGHTING_ELEMENT_NAME)
    document.body.appendChild(element)
    await new Promise(resolve => setTimeout(resolve, 300))
    // The project's name is no word to translate.
    expect(WordsAudit.leftovers(element, text => text === "UFO@home")).toEqual([])
  })
})
