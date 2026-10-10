import { describe, expect, it, beforeAll, vi } from "vitest"
import { register, ELEMENT_NAME } from "../../src/component/SightingEditorElement.js"
import type { SightingEditorElement } from "../../src/component/SightingEditorElement.js"
import type { WeatherProvider } from "../../src/engine/weather/WeatherProvider.js"

register()

/*
 * Deleting scenery, and taking back what was edited. Apart from SightingEditorElement.test.ts, whose jsdom worker
 * already uses about 4 GB of the 4 GB the CI gives Node: more tests there take it over (heap out of memory), where
 * here they cost a fresh worker.
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
    referenceFailedToLoad(): boolean {
      return false
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
    decorScreenBox(): undefined {
      return undefined
    }
    setLightning(): void {}
    updateLightning(): void {}
    setSatellites(): void {}
    setReentries(): void {}
    pickTrafficAt(): undefined {
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
    setMedium(): void {}
    setLensOptics(): void {}
    setExposure(): void {}
    private meteors: { t: number; durationMs: number }[] = []
    setMeteorShower(meteors: { t: number; durationMs: number }[]): void {
      this.meteors = meteors
    }
    get meteorSchedule(): { t: number; durationMs: number }[] {
      return this.meteors
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
  ;(element.shadowRoot!.getElementById("add-shape") as HTMLButtonElement).click()
  return element
}

async function waitFor(check: () => boolean, timeoutMs = 20000): Promise<void> {
  const start = Date.now()
  while (!check()) {
    if (Date.now() - start > timeoutMs) throw new Error("waitFor timed out")
    await new Promise(resolve => setTimeout(resolve, 5))
  }
}

function confirmQuestion(element: SightingEditorElement): string | null {
  const shadow = element.shadowRoot!
  const overlay = shadow.getElementById("confirm-overlay") as HTMLElement
  return overlay.hidden ? null : shadow.getElementById("confirm-message")!.textContent
}

function answerConfirm(element: SightingEditorElement, accept: boolean): void {
  ;(element.shadowRoot!.getElementById(accept ? "confirm-ok" : "confirm-cancel") as HTMLButtonElement).click()
}

function addBuildings(element: SightingEditorElement, count: number): void {
  const add = element.shadowRoot!.getElementById("add-decor-building") as HTMLButtonElement
  for (let i = 0; i < count; i++) add.click()
}

function openEnvironment(element: SightingEditorElement): void {
  const tab = [...element.shadowRoot!.querySelectorAll<HTMLButtonElement>(".group-tab")].find(candidate => candidate.getAttribute("aria-controls") === "group-decor")!
  tab.click()
}

describe("deleting scenery", () => {
  it("asks first when the bin is pressed, deletes only once it is accepted, and keeps it when it is declined", () => {
    const element = mount()
    addBuildings(element, 2)
    const bin = element.shadowRoot!.getElementById("delete-decor") as HTMLButtonElement
    bin.click()
    expect(confirmQuestion(element)).toContain("Building")
    expect(element.sightingData.decor ?? []).toHaveLength(2)
    answerConfirm(element, false)
    expect(element.sightingData.decor ?? []).toHaveLength(2)
    bin.click()
    answerConfirm(element, true)
    expect(element.sightingData.decor ?? []).toHaveLength(1)
  })

  it("is deleted by the Delete key and by Backspace when it is the scenery being edited, with the same question", () => {
    for (const key of ["Delete", "Backspace"]) {
      const element = mount()
      addBuildings(element, 2)
      openEnvironment(element)
      element.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true, composed: true }))
      expect(confirmQuestion(element), key).toContain("Building")
      expect(element.sightingData.decor ?? []).toHaveLength(2)
      answerConfirm(element, true)
      expect(element.sightingData.decor ?? [], key).toHaveLength(1)
    }
  })

  it("leaves the shapes alone when the key is pressed over the scenery, and the scenery alone when it is pressed over a shape", () => {
    const element = mount()
    addBuildings(element, 1)
    openEnvironment(element)
    element.dispatchEvent(new KeyboardEvent("keydown", { key: "Delete", bubbles: true, composed: true }))
    expect(confirmQuestion(element)).toContain("Building")
    answerConfirm(element, false)
    expect(element.sightingData.timeline.keyframes.length).toBeGreaterThan(0)
  })
})

describe("undo and redo", () => {
  /** The step that is taken once the form has been quiet for a moment (see SightingEditorElement.scheduleHistoryRecord). */
  async function edited(element: SightingEditorElement, change: () => void): Promise<void> {
    const shadow = element.shadowRoot!
    // The press that comes before any change: it is what takes the recording as it stood.
    shadow.getElementById("add-decor-building")!.dispatchEvent(new Event("pointerdown", { bubbles: true, composed: true }))
    const undo = shadow.getElementById("undo") as HTMLButtonElement
    await new Promise(resolve => setTimeout(resolve, 50))
    change()
    await waitFor(() => !undo.disabled)
  }

  it("starts with nothing to take back, and takes back the last change, then puts it back", async () => {
    const element = mount()
    const shadow = element.shadowRoot!
    const undo = shadow.getElementById("undo") as HTMLButtonElement
    const redo = shadow.getElementById("redo") as HTMLButtonElement
    expect(undo.disabled).toBe(true)
    expect(redo.disabled).toBe(true)
    await edited(element, () => addBuildings(element, 1))
    expect(element.sightingData.decor ?? []).toHaveLength(1)
    expect(redo.disabled).toBe(true)

    undo.click()
    expect(element.sightingData.decor ?? []).toHaveLength(0)
    expect(redo.disabled).toBe(false)
    redo.click()
    expect(element.sightingData.decor ?? []).toHaveLength(1)
  })

  it("answers Ctrl+Z and Ctrl+Shift+Z on the editor, but leaves the keys to a field that has its own", async () => {
    const element = mount()
    await edited(element, () => addBuildings(element, 1))
    const key = (init: KeyboardEventInit, target: EventTarget = element) =>
      target.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, composed: true, ...init }))
    const field = element.shadowRoot!.getElementById("decorTitle") as HTMLInputElement
    key({ key: "z", ctrlKey: true }, field)
    expect(element.sightingData.decor ?? []).toHaveLength(1)
    key({ key: "z", ctrlKey: true })
    expect(element.sightingData.decor ?? []).toHaveLength(0)
    key({ key: "z", ctrlKey: true, shiftKey: true })
    expect(element.sightingData.decor ?? []).toHaveLength(1)
  })

  it("forgets the history when another recording is loaded", async () => {
    const element = mount()
    const undo = element.shadowRoot!.getElementById("undo") as HTMLButtonElement
    await edited(element, () => addBuildings(element, 1))
    expect(undo.disabled).toBe(false)
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true, json: () => Promise.resolve({ version: 1, timeline: { keyframes: [] }, decor: [] })
    }) as unknown as typeof fetch
    ;(element.shadowRoot!.getElementById("import-url") as HTMLInputElement).value = "https://example.org/other.json"
    ;(element.shadowRoot!.getElementById("import-url-button") as HTMLButtonElement).click()
    await waitFor(() => (element.sightingData.decor ?? []).length === 0)
    expect(undo.disabled).toBe(true)
  })
})
