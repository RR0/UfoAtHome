import { afterEach, describe, expect, it, beforeAll, vi } from "vitest"
import { register, ELEMENT_NAME } from "../../src/component/SightingEditorElement.js"
import type { SightingEditorElement } from "../../src/component/SightingEditorElement.js"
import type { WeatherProvider } from "../../src/engine/weather/WeatherProvider.js"

register()
import { ModuleRegistry } from "../../src/modules/ModuleRegistry.js"
import type { SkyEventEditor, SkyEventEditorHost, SkyEventKind } from "../../src/modules/sky-events/SkyEventKind.js"
import { SkyEvents } from "../../src/engine/model/SkyEvents.js"

/*
 * A kind of event of the sky brought by a module (see SkyEventKind): the editor gives it a part of the Sky group, built from the kind alone,
 * and loads its editor when the part is opened; the recording keeps its events under its key. The setup is SightingEditorSky.test.ts's.
 */
// SightingEditorElement now nests a <rr0-scene> (see its own class doc comment) instead of a bare
// <rr0-ufo>, so mounting it also constructs a SceneRenderer — which jsdom's <canvas> can't back
// with a real WebGL context (no native `canvas` package here, same reason as the 2D mock below).
// Stubbed out entirely: these tests exercise the 2D shape/appearance/observer/time editing logic,
// not 3D rendering, which has no unit tests of its own for the same jsdom-has-no-WebGL reason
// (see SceneRenderer.ts's own lack of a dedicated test file).
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
    // be the same one. Plain no-ops, not vi.fn(): vitest keeps every mock it ever made, and the `this` each
    // was called on (here the context, so its canvas and the editor around it), for the life of the worker.
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
  globalThis.fetch = vi.fn().mockResolvedValue({ arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)) }) as typeof fetch
  // jsdom has no ResizeObserver — SceneElement.connectedCallback() (also nested now) uses one to
  // track its canvas size.
  globalThis.ResizeObserver = class {
    observe(): void {}
    unobserve(): void {}
    disconnect(): void {}
  } as unknown as typeof ResizeObserver
})

/** No meteorological record: the suite never reaches the network (see SightingEditorElement.test.ts). */
const NO_RECORD_PROVIDER: WeatherProvider = { getWeather: () => Promise.resolve(undefined) }

/** An editor holding one shape, as an author would add it with +. */
function mount(): SightingEditorElement {
  const element = document.createElement(ELEMENT_NAME) as SightingEditorElement
  element.weatherProvider = NO_RECORD_PROVIDER
  document.body.appendChild(element)
  return element
}

const synced: string[] = []
const BALL_LIGHTNING: SkyEventKind = {
  key: "ballLightning",
  title: { en: "Ball lightning", fr: "Foudre en boule" },
  simulation: () => Promise.reject(new Error("not drawn in this test")),
  editor: async () => (container: HTMLElement, host: SkyEventEditorHost): SkyEventEditor => {
    container.textContent = `${SkyEvents.isEmpty(host.sighting().skyEvents) ? 0 : (host.sighting().skyEvents!.ballLightning ?? []).length} ball(s)`
    return { sync: () => synced.push("sync"), refresh: () => undefined, setTime: () => undefined, setLanguage: async () => undefined }
  }
}

afterEach(() => {
  document.body.replaceChildren()
  ModuleRegistry.uninstall("ball-lightning")
  synced.length = 0
})

describe("a model of a module's catalogue", () => {
  it("makes the recording name its module once an edit has used it, and not when the recording is only opened", async () => {
    const url = "https://acme.example/ufoathome-module.json"
    const catalogue = { attribution: "", entries: async () => [], entry: async (id: string) => id === "acme-saucer" ? { id, kind: "entity", name: "Saucer", url: "https://acme.example/s.glb", credit: { title: "S", license: "CC0" } } as never : undefined }
    ModuleRegistry.install({ id: "acme", name: "ACME", url, contributes: { decorModels: [{ id: "acme-models", name: "ACME", credit: "©", creditUrl: url, create: () => catalogue }] } })
    try {
      const element = mount()
      element.sightingData = { version: 3, timeline: { keyframes: [] }, decor: [{ id: "s", kind: "entity", eastM: 0, northM: 10, model: { id: "acme-saucer" } }] } as never
      await new Promise(resolve => setTimeout(resolve, 600))
      expect(element.sightingData.modules).toBeUndefined()

      element.shadowRoot!.querySelector("input")!.dispatchEvent(new Event("input", { bubbles: true }))
      await waitFor(() => element.sightingData.modules !== undefined)
      expect(element.sightingData.modules).toEqual([url])
    } finally {
      ModuleRegistry.uninstall("acme")
    }
  })
})

describe("a kind of event of the sky a module brings", () => {
  it("gets a part of the Sky group beside the beams, and its editor when the part is opened", async () => {
    ModuleRegistry.install({ id: "ball-lightning", name: "Ball lightning", contributes: { skyEvents: [{ id: "ballLightning", name: "Ball lightning", credit: "©", creditUrl: "https://example.org", create: () => BALL_LIGHTNING }] } })
    const element = mount()
    element.sightingData = { version: 3, timeline: { keyframes: [] }, skyEvents: { ballLightning: [{ id: "b1" }, { id: "b2" }] } }
    const shadow = element.shadowRoot!
    const tabs = [...shadow.querySelectorAll<HTMLButtonElement>("#weather-tabs .subgroup-tab")].map(tab => tab.getAttribute("aria-controls"))
    // The built-in kinds in the registry's order, then the module's.
    expect(tabs.slice(-4)).toEqual(["sky-event-launches", "sky-event-beams", "sky-event-reentries", "sky-event-ballLightning"])
    const tab = shadow.querySelector<HTMLButtonElement>('[aria-controls="sky-event-ballLightning"]')!
    expect(tab.textContent).toBe("Ball lightning")

    tab.click()
    await waitFor(() => synced.length > 0)
    expect(shadow.getElementById("sky-event-ballLightning")!.hidden).toBe(false)
    expect(shadow.getElementById("sky-event-ballLightning-editor")!.textContent).toBe("2 ball(s)")
    expect(element.sightingData.skyEvents).toEqual({ ballLightning: [{ id: "b1" }, { id: "b2" }] })
  })

  it("comes after the kinds of interpretation, whose parts are made the same way, a module's among them", async () => {
    ModuleRegistry.install({ id: "ball-lightning", name: "Ball lightning", contributes: {
      skyEvents: [{ id: "ballLightning", name: "Ball lightning", credit: "©", creditUrl: "https://example.org", create: () => BALL_LIGHTNING }],
      interpretations: [{ id: "balloons", name: "Balloons", credit: "©", creditUrl: "https://example.org", create: () => ({
        key: "balloons", title: { en: "Balloons" }, bodiesOf: () => [],
        editor: async () => () => ({ sync: () => undefined, refresh: () => undefined, setLanguage: async () => undefined })
      }) }]
    } })
    const element = mount()
    const tabs = [...element.shadowRoot!.querySelectorAll<HTMLButtonElement>("#weather-tabs .subgroup-tab")].map(tab => tab.getAttribute("aria-controls"))
    expect(tabs.slice(-6)).toEqual(["interpretation-lanterns", "interpretation-balloons", "sky-event-launches", "sky-event-beams", "sky-event-reentries", "sky-event-ballLightning"])
  })

  it("loses its part when the module is taken away, and the recording keeps its events", async () => {
    ModuleRegistry.install({ id: "ball-lightning", name: "Ball lightning", contributes: { skyEvents: [{ id: "ballLightning", name: "Ball lightning", credit: "©", creditUrl: "https://example.org", create: () => BALL_LIGHTNING }] } })
    const element = mount()
    element.sightingData = { version: 3, timeline: { keyframes: [] }, skyEvents: { ballLightning: [{ id: "b1" }] } }
    expect(element.shadowRoot!.getElementById("sky-event-ballLightning")).not.toBeNull()

    ModuleRegistry.uninstall("ball-lightning")
    expect(element.shadowRoot!.getElementById("sky-event-ballLightning")).toBeNull()
    expect(element.sightingData.skyEvents).toEqual({ ballLightning: [{ id: "b1" }] })
  })
})

async function waitFor(check: () => boolean, timeoutMs = 20000): Promise<void> {
  const start = Date.now()
  while (!check()) {
    if (Date.now() - start > timeoutMs) throw new Error("waitFor timed out")
    await new Promise(resolve => setTimeout(resolve, 5))
  }
}
