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

vi.mock("../../src/component/messages/SightingMessages_en.js", async original => {
  const { WordsAudit } = await import("./WordsAudit.js")
  const actual = await original<typeof import("../../src/component/messages/SightingMessages_en.js")>()
  return { sightingMessages_en: WordsAudit.pseudo(actual.sightingMessages_en) }
})
vi.mock("../../src/component/messages/UfoMessages_en.js", async original => {
  const { WordsAudit } = await import("./WordsAudit.js")
  const actual = await original<typeof import("../../src/component/messages/UfoMessages_en.js")>()
  return { ufoMessages_en: WordsAudit.pseudo(actual.ufoMessages_en) }
})
vi.mock("../../src/component/messages/ShareMessages_en.js", async original => {
  const { WordsAudit } = await import("./WordsAudit.js")
  const actual = await original<typeof import("../../src/component/messages/ShareMessages_en.js")>()
  return { shareMessages_en: WordsAudit.pseudo(actual.shareMessages_en) }
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
    // The project's name is no word to translate; the scene's loader and credits are written in English in SceneElement still (step 3).
    const still = new Set(["UFO@home", "This is not a video", "It is a real-time simulation.", "Credits"])
    expect(WordsAudit.leftovers(element, text => still.has(text))).toEqual([])
  })
})
