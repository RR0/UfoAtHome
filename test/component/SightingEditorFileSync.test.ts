import { describe, expect, it, beforeAll, vi } from "vitest"
import { register, ELEMENT_NAME } from "../../src/component/SightingEditorElement.js"
import type { SightingEditorElement } from "../../src/component/SightingEditorElement.js"
import type { WeatherProvider } from "../../src/engine/weather/WeatherProvider.js"

register()

/*
 * The File group's text and the picture following each other, and its marks of what changed. Not in
 * SightingEditorElement.test.ts, for the reason given in SightingEditorHistory.test.ts.
 *
 * (Deleting scenery, and taking back what was edited. Apart from SightingEditorElement.test.ts, whose jsdom worker
 * already uses about 4 GB of the 4 GB the CI gives Node: more tests there take it over (heap out of memory), where
 * here they cost a fresh worker.)
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

function addBuildings(element: SightingEditorElement, count: number): void {
  const add = element.shadowRoot!.getElementById("add-decor-building") as HTMLButtonElement
  for (let i = 0; i < count; i++) add.click()
}

function openGroup(element: SightingEditorElement, id: string): void {
  const tab = [...element.shadowRoot!.querySelectorAll<HTMLButtonElement>(".group-tab")].find(candidate => candidate.getAttribute("aria-controls") === id)!
  tab.click()
}

interface Private {
  fileEditor?: { text: string, revealedText?: string, reveal(path: (string | number)[]): boolean, view: { state: { selection: { main: { from: number, to: number } } } } }
  focusFromFile(path: (string | number)[]): void
  selectDecor(id: string): void
  canvasMode(): string
  fileFocus?: string
}

async function fileOpened(element: SightingEditorElement): Promise<Private> {
  const inside = element as unknown as Private
  openGroup(element, "group-file")
  await waitFor(() => inside.fileEditor !== undefined)
  return inside
}

describe("the text and the picture", () => {
  it("frames on the picture what the text's caret is in, and nothing when it is in something else", async () => {
    const element = mount()
    addBuildings(element, 2)
    const inside = await fileOpened(element)

    inside.focusFromFile(["decor", 1])
    expect(inside.canvasMode()).toBe("decor")
    expect(inside.fileFocus).toBe("decor")
    expect((element.shadowRoot!.getElementById("decor") as HTMLSelectElement).value).toBe(element.sightingData.decor![1].id)

    inside.focusFromFile(["version"])
    expect(inside.canvasMode()).toBe("scene")
  })

  it("shows in the text what is selected on the picture, and leaves the group it is in", async () => {
    const element = mount()
    addBuildings(element, 2)
    const inside = await fileOpened(element)
    const first = element.sightingData.decor![0].id
    const before = inside.fileEditor!.view.state.selection.main.from

    inside.selectDecor(first)

    expect(inside.fileEditor!.revealedText).toContain(`"id": "${first}"`)
    // Shown, not selected: the caret is the author's, and the text does not need the focus to show it.
    expect(inside.fileEditor!.view.state.selection.main.from).toBe(before)
    const open = [...element.shadowRoot!.querySelectorAll<HTMLButtonElement>(".group-tab")].filter(tab => tab.getAttribute("aria-expanded") === "true")
    expect(open.map(tab => tab.getAttribute("aria-controls"))).toEqual(["group-file"])
  })

  it("does nothing of the kind while the text is not on show", async () => {
    const element = mount()
    addBuildings(element, 2)
    const inside = await fileOpened(element)
    openGroup(element, "group-decor")

    inside.selectDecor(element.sightingData.decor![1].id)

    expect(inside.fileEditor!.revealedText).toBeUndefined()
  })
})

describe("the lines changed since the last save", () => {
  it("marks what the form changed, and takes the marks back when the recording is saved", async () => {
    // Exporting downloads a file: there is no object URL in jsdom, and nothing to download to.
    URL.createObjectURL = () => "blob:test"
    URL.revokeObjectURL = () => undefined
    const element = mount()
    const inside = await fileOpened(element)
    const view = (inside.fileEditor as unknown as { view: { dom: HTMLElement } }).view
    expect(view.dom.querySelectorAll(".cm-changed-line")).toHaveLength(0)

    addBuildings(element, 1)
    await waitFor(() => view.dom.querySelectorAll(".cm-changed-line").length > 0, 5000)

    ;(element.shadowRoot!.getElementById("export") as HTMLButtonElement).click()
    await waitFor(() => view.dom.querySelectorAll(".cm-changed-line").length === 0, 5000)
  })
})

describe("undo and redo with the text on show", () => {
  it("shows where the step changed the text", async () => {
    const element = mount()
    const inside = await fileOpened(element)
    const shadow = element.shadowRoot!
    shadow.getElementById("add-decor-building")!.dispatchEvent(new Event("pointerdown", { bubbles: true, composed: true }))
    await new Promise(resolve => setTimeout(resolve, 50))
    addBuildings(element, 1)
    const undo = shadow.getElementById("undo") as HTMLButtonElement
    await waitFor(() => !undo.disabled)
    expect(inside.fileEditor!.revealedText).toBeUndefined()

    undo.click()
    expect(inside.fileEditor!.revealedText).toBeDefined()

    ;(shadow.getElementById("redo") as HTMLButtonElement).click()
    expect(inside.fileEditor!.revealedText).toContain('"building"')
  })

  it("shows nothing when the text is not on show", async () => {
    const element = mount()
    const inside = await fileOpened(element)
    const shadow = element.shadowRoot!
    shadow.getElementById("add-decor-building")!.dispatchEvent(new Event("pointerdown", { bubbles: true, composed: true }))
    await new Promise(resolve => setTimeout(resolve, 50))
    addBuildings(element, 1)
    const undo = shadow.getElementById("undo") as HTMLButtonElement
    await waitFor(() => !undo.disabled)
    openGroup(element, "group-decor")

    undo.click()

    expect(inside.fileEditor!.revealedText).toBeUndefined()
  })
})
