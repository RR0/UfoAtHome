import { describe, expect, it, beforeAll, vi } from "vitest"
import { register, ELEMENT_NAME } from "../../src/component/SightingEditorElement.js"
import type { SightingEditorElement } from "../../src/component/SightingEditorElement.js"
import type { WeatherProvider } from "../../src/engine/weather/WeatherProvider.js"

register()

/*
 * Picking scenery on the picture. Apart from SightingEditorElement.test.ts, whose jsdom worker
 * already uses about 4 GB of the 4 GB the CI gives Node: more tests there take it over (heap out of memory), where
 * here they cost a fresh worker.
 */
// SightingEditorElement now nests a <rr0-scene> (see its own class doc comment) instead of a bare
// <rr0-ufo>, so mounting it also constructs a SceneRenderer — which jsdom's <canvas> can't back
// with a real WebGL context (no native `canvas` package here, same reason as the 2D mock below).
// Stubbed out entirely: these tests exercise the 2D shape/appearance/observer/time editing logic,
// not 3D rendering, which has no unit tests of its own for the same jsdom-has-no-WebGL reason
// (see SceneRenderer.ts's own lack of a dedicated test file).
/** What the picture says is under the pointer: set by each test. */
let pickedDecor: string | undefined

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
    pickDecorAt(): string | undefined {
      return pickedDecor
    }
    /** The object's frame: the middle of the picture, half of it across and up. */
    decorScreenBox() {
      return { minX: -0.5, minY: -0.5, maxX: 0.5, maxY: 0.5 }
    }
    /** Where the pointer meets the ground: east and south from it, as the picture's own coordinates say. */
    decorGrabHeightAt() {
      return 0
    }
    decorGroundPointAt(_id: string, ndcX: number, ndcY: number) {
      return { x: ndcX * 100, z: -ndcY * 100 }
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

function nestedCanvas(element: SightingEditorElement): HTMLCanvasElement {
  const scene = element.shadowRoot!.querySelector("rr0-scene") as unknown as { ufoElement: HTMLElement }
  const canvas = scene.ufoElement.shadowRoot!.getElementById("canvas") as HTMLCanvasElement
  canvas.getBoundingClientRect = () => ({ left: 0, top: 0, width: 640, height: 360 } as DOMRect)
  return canvas
}

function press(canvas: HTMLCanvasElement, init: MouseEventInit = {}): void {
  canvas.dispatchEvent(new MouseEvent("pointerdown", { clientX: 300, clientY: 200, bubbles: true, composed: true, ...init }))
  document.dispatchEvent(new MouseEvent("pointerup", { clientX: 300, clientY: 200, ...init }))
}

function openGroups(element: SightingEditorElement): string[] {
  return [...element.shadowRoot!.querySelectorAll<HTMLButtonElement>(".group-tab")]
    .filter(tab => tab.getAttribute("aria-expanded") === "true").map(tab => tab.getAttribute("aria-controls")!)
}

function twoBuildings(): SightingEditorElement {
  const element = mount()
  const add = element.shadowRoot!.getElementById("add-decor-building") as HTMLButtonElement
  add.click()
  add.click()
  // Nothing open: the picture is the scene, as when the author has just loaded a recording.
  for (const tab of element.shadowRoot!.querySelectorAll<HTMLButtonElement>(".group-tab")) {
    if (tab.getAttribute("aria-expanded") === "true") tab.click()
  }
  return element
}

describe("picking scenery on the picture", () => {
  it("selects it with a plain click, and opens the Environment group where it is framed, without the author going there first", () => {
    pickedDecor = "decor-1"
    const element = twoBuildings()
    expect(openGroups(element)).toEqual([])
    expect((element.shadowRoot!.getElementById("decor") as HTMLSelectElement).value).toBe("decor-2")

    press(nestedCanvas(element))

    expect((element.shadowRoot!.getElementById("decor") as HTMLSelectElement).value).toBe("decor-1")
    expect(openGroups(element)).toEqual(["group-decor"])
  })

  it("leaves it alone when a key is held with the press, so that the press turns the view as over bare ground", () => {
    for (const modifier of ["shiftKey", "ctrlKey", "altKey", "metaKey"] as const) {
      pickedDecor = "decor-1"
      const element = twoBuildings()
      press(nestedCanvas(element), { [modifier]: true })
      expect((element.shadowRoot!.getElementById("decor") as HTMLSelectElement).value, modifier).toBe("decor-2")
      expect(openGroups(element), modifier).toEqual([])
    }
  })

  it("selects nothing where nothing stands", () => {
    pickedDecor = undefined
    const element = twoBuildings()
    press(nestedCanvas(element))
    expect((element.shadowRoot!.getElementById("decor") as HTMLSelectElement).value).toBe("decor-2")
    expect(openGroups(element)).toEqual([])
  })

  it("carries the selected object from anywhere in its frame, even where the picture shows only the ground behind it", () => {
    pickedDecor = undefined
    const element = twoBuildings()
    ;[...element.shadowRoot!.querySelectorAll<HTMLButtonElement>(".group-tab")].find(tab => tab.getAttribute("aria-controls") === "group-decor")!.click()
    const east = element.shadowRoot!.getElementById("decorEast") as HTMLInputElement
    const before = east.value
    const canvas = nestedCanvas(element)

    canvas.dispatchEvent(new MouseEvent("pointerdown", { clientX: 320, clientY: 180, bubbles: true, composed: true }))
    document.dispatchEvent(new MouseEvent("pointermove", { clientX: 420, clientY: 180, bubbles: true }))
    document.dispatchEvent(new MouseEvent("pointerup", { clientX: 420, clientY: 180, bubbles: true }))

    expect(east.value).not.toBe(before)
  })

  it("does not carry it when another object stands in front of that point, nor when a key is held", () => {
    const element = twoBuildings()
    ;[...element.shadowRoot!.querySelectorAll<HTMLButtonElement>(".group-tab")].find(tab => tab.getAttribute("aria-controls") === "group-decor")!.click()
    const east = element.shadowRoot!.getElementById("decorEast") as HTMLInputElement
    const before = east.value
    const canvas = nestedCanvas(element)
    const drag = (init: MouseEventInit) => {
      canvas.dispatchEvent(new MouseEvent("pointerdown", { clientX: 320, clientY: 180, bubbles: true, composed: true, ...init }))
      document.dispatchEvent(new MouseEvent("pointermove", { clientX: 420, clientY: 180, bubbles: true, ...init }))
      document.dispatchEvent(new MouseEvent("pointerup", { clientX: 420, clientY: 180, bubbles: true, ...init }))
    }

    pickedDecor = "decor-1" // not the selected one (decor-2, the last added): a nearer object
    drag({})
    expect(east.value).toBe(before)

    pickedDecor = undefined
    drag({ shiftKey: true })
    expect(east.value).toBe(before)
  })
})
