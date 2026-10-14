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
    decorDistanceM() {
      return undefined
    }
    decorScreenBox(): undefined {
      return undefined
    }
    setLightning(): void {}
    updateLightning(): void {}
    setSatellites(): void {}
    setReentries(): void {}
    setLaunchPlumes(): void {}
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

function openGroups(element: SightingEditorElement): string[] {
  return [...element.shadowRoot!.querySelectorAll<HTMLButtonElement>(".group-tab")]
    .filter(tab => tab.getAttribute("aria-expanded") === "true").map(tab => tab.getAttribute("aria-controls")!)
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
    await waitFor(() => !undo.disabled && inside.fileEditor!.revealedText?.includes('"building"') === true, 5000)

    undo.click()
    expect(inside.fileEditor!.revealedText).toBeDefined()
    expect(inside.fileEditor!.revealedText).not.toContain('"building"')

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
    await waitFor(() => !undo.disabled && inside.fileEditor!.revealedText?.includes('"building"') === true, 5000)
    openGroup(element, "group-decor")

    undo.click()

    // What was shown of the edit went with the lines the undo took away, and nothing was shown in their place.
    expect(inside.fileEditor!.revealedText).toBe("")
  })
})

describe("editing with the text on show", () => {
  it("shows where the edit was written, once the form has put it in the text", async () => {
    const element = mount()
    const inside = await fileOpened(element)
    expect(inside.fileEditor!.revealedText).toBeUndefined()

    addBuildings(element, 1)

    await waitFor(() => inside.fileEditor!.revealedText !== undefined, 5000)
    expect(inside.fileEditor!.revealedText).toContain('"building"')
  })
})

describe("going from one changed zone to the next", () => {
  it("goes to the next with F7 and the previous with Shift+F7, round the text", async () => {
    const { SightingFileEditor } = await import("../../src/component/SightingFileEditor.js")
    const lines = Array.from({ length: 40 }, (_, i) => `line ${i}`)
    const editor = new SightingFileEditor(document.body.appendChild(document.createElement("div")), lines.join("\n"), () => undefined, "text")
    expect(editor.gotoChange(1)).toBe(false)

    const edited = [...lines]
    edited[5] = "changed 5"
    edited[6] = "changed 6"
    edited[30] = "changed 30"
    editor.replaceText(edited.join("\n"), false)
    const view = (editor as unknown as { view: { state: { selection: { main: { from: number, to: number } }, doc: { lineAt(position: number): { number: number } } } } }).view
    const at = () => view.state.doc.lineAt(view.state.selection.main.from).number - 1

    expect(editor.gotoChange(1)).toBe(true)
    expect(at()).toBe(5)
    // The whole zone, two lines, is what is selected.
    expect(view.state.doc.lineAt(view.state.selection.main.to).number - 1).toBe(6)
    expect(editor.gotoChange(1)).toBe(true)
    expect(at()).toBe(30)
    expect(editor.gotoChange(1)).toBe(true)
    expect(at()).toBe(5)
    expect(editor.gotoChange(-1)).toBe(true)
    expect(at()).toBe(30)
    expect(editor.gotoChange(-1)).toBe(true)
    expect(at()).toBe(5)
    editor.destroy()
  })
})

describe("a body of the interpretation clicked on the picture", () => {
  it("is shown in the text, where it is written, when the text is on show", async () => {
    const element = mount()
    const json = element.sightingData
    element.sightingData = { ...json, interpretation: { bodies: [{ id: "craft", title: "The craft", model: { id: "x" }, track: [{ t: 0, eastM: 10, northM: -20 }] }] } } as unknown as typeof json
    const inside = await fileOpened(element)

    ;(element as unknown as { showBody(id: string): void }).showBody("craft")

    expect(inside.fileEditor!.revealedText).toContain('"id": "craft"')
    expect(openGroups(element)).toEqual(["group-file"])
  })
})

describe("lines taken away", () => {
  it("are shown where they were, and F7 goes there", async () => {
    const { SightingFileEditor } = await import("../../src/component/SightingFileEditor.js")
    const lines = Array.from({ length: 30 }, (_, i) => `line ${i}`)
    const host = document.body.appendChild(document.createElement("div"))
    const editor = new SightingFileEditor(host, lines.join("\n"), () => undefined, "text")
    const edited = lines.filter((_, i) => i !== 12 && i !== 13)
    editor.replaceText(edited.join("\n"), false)

    // Nothing is changed or new in what is left, yet the place where two lines were is marked.
    expect(host.querySelectorAll(".cm-changed-line")).toHaveLength(0)
    expect(host.querySelector(".cm-removed-above")?.textContent).toBe("line 14")
    expect(host.querySelector(".cm-removed-tick")).not.toBeNull()
    const view = (editor as unknown as { view: { state: { selection: { main: { from: number } }, doc: { lineAt(position: number): { number: number } } } } }).view
    expect(editor.gotoChange(1)).toBe(true)
    expect(view.state.doc.lineAt(view.state.selection.main.from).number - 1).toBe(12)
    editor.destroy()
  })

  it("are shown under the last line when they were at the end", async () => {
    const { SightingFileEditor } = await import("../../src/component/SightingFileEditor.js")
    const lines = Array.from({ length: 10 }, (_, i) => `line ${i}`)
    const host = document.body.appendChild(document.createElement("div"))
    const editor = new SightingFileEditor(host, lines.join("\n"), () => undefined, "text")

    editor.replaceText(lines.slice(0, 7).join("\n"), false)

    expect(host.querySelector(".cm-removed-below")?.textContent).toBe("line 6")
    editor.destroy()
  })
})

describe("editing an object that is named in several languages", () => {
  it("keeps the other languages of its name when something else about it is edited", async () => {
    const element = mount()
    addBuildings(element, 1)
    const json = element.sightingData
    element.sightingData = { ...json, decor: json.decor!.map(decor => ({ ...decor, title: { fr: "Arbre", en: "Tree", es: "Árbol" } })) }
    const inside = element as unknown as { selectDecor(id: string): void }
    inside.selectDecor(element.sightingData.decor![0].id)
    const east = element.shadowRoot!.getElementById("decorBase.eastM") as HTMLInputElement
    east.value = "12.5"
    east.dispatchEvent(new Event("input", { bubbles: true }))

    const decor = element.sightingData.decor![0]
    expect(decor.eastM).toBe(12.5)
    expect(decor.title).toEqual({ fr: "Arbre", en: "Tree", es: "Árbol" })
  })
})

describe("the weather of a recording", () => {
  const record = {
    getWeather: () => Promise.resolve({
      samples: [{ time: new Date(), weather: { cloudCover: 0.99, cloudBaseM: 1000, relativeHumidity: 0.5, precipitationType: "none", precipitationIntensity: 0, windDirectionDeg: 0, windSpeed: 0 } }],
      source: { id: "era5", name: "Open-Meteo" }
    })
  } as unknown as WeatherProvider

  const station = {
    version: 1, id: "case", time: { value: { year: 1981, month: 1, day: 8, hour: 17, minute: 0, second: 0 }, basis: "stated", rationale: "r" },
    durationSeconds: 40, timeline: { keyframes: [{ t: 0, shapes: [] }, { t: 40000, shapes: [] }] }, place: [{ lat: 43.4, lng: 6.5 }],
    weatherSource: { id: "station", name: "A station" },
    weatherTrack: { keyframes: [{ t: 0, weather: { cloudCover: 0.25, cloudBaseM: 3000, relativeHumidity: 0.3, precipitationType: "none", precipitationIntensity: 0, windDirectionDeg: 0, windSpeed: 0 } }] }
  }

  it("is not replaced by a record's when the report gave it, whatever else loading sets", async () => {
    const element = document.createElement(ELEMENT_NAME) as SightingEditorElement
    element.weatherProvider = record
    document.body.appendChild(element)
    element.sightingData = station as unknown as typeof element.sightingData
    // Time zone, duration, place: each asked a lookup once, and the lookup answers within a second or so.
    await new Promise(resolve => setTimeout(resolve, 2500))

    expect(element.sightingData.weatherSource?.id).toBe("station")
    expect(element.sightingData.weatherTrack?.keyframes[0].weather.cloudCover).toBe(0.25)
  })

  /** A recording whose weather a record gave, with the text edited where it is read from the record. */
  async function editedWeather(): Promise<{ element: SightingEditorElement, ask: HTMLDialogElement }> {
    const element = document.createElement(ELEMENT_NAME) as SightingEditorElement
    element.weatherProvider = record
    document.body.appendChild(element)
    element.sightingData = { ...station, weatherSource: { id: "era5", name: "Open-Meteo" } } as unknown as typeof element.sightingData
    const edited = JSON.parse(JSON.stringify(element.sightingData))
    edited.weatherTrack.keyframes[0].weather.cloudCover = 0.8
    // The text the author is editing was in step with the form: what the file editor holds once it has opened.
    ;(element as unknown as { fileTextApplied: string }).fileTextApplied = JSON.stringify(element.sightingData)
    ;(element as unknown as { applyFileText(text: string): void }).applyFileText(JSON.stringify(edited))
    return { element, ask: element.shadowRoot!.getElementById("file-ask") as HTMLDialogElement }
  }

  it("asks what is meant when the text is edited where it is read from a record, and lets no lookup undo the edit meanwhile", async () => {
    const { element, ask } = await editedWeather()
    await new Promise(resolve => setTimeout(resolve, 2500))

    expect(ask.open).toBe(true)
    expect(ask.textContent).toContain("Open-Meteo")
    expect(element.sightingData.weatherTrack?.keyframes[0].weather.cloudCover).toBe(0.8)
    expect(element.edited).toBe(true)
  })

  it("makes the weather the author's when they say they mean it", async () => {
    const { element, ask } = await editedWeather()

    ;(element.shadowRoot!.getElementById("file-ask-stop") as HTMLButtonElement).click()
    await new Promise(resolve => setTimeout(resolve, 2500))

    expect(ask.open).toBe(false)
    expect(element.sightingData.weatherSource).toBeUndefined()
    expect(element.sightingData.weatherTrack?.keyframes[0].weather.cloudCover).toBe(0.8)
  })

  it("puts the record's weather back when they say they do not", async () => {
    const { element, ask } = await editedWeather()

    ;(element.shadowRoot!.getElementById("file-ask-keep") as HTMLButtonElement).click()

    expect(ask.open).toBe(false)
    expect(element.sightingData.weatherSource?.id).toBe("era5")
    expect(element.sightingData.weatherTrack?.keyframes[0].weather.cloudCover).toBe(0.25)
  })

  it("takes Escape for the safe answer: what was read is put back", async () => {
    const { element, ask } = await editedWeather()

    ask.dispatchEvent(new Event("cancel", { cancelable: true }))

    expect(ask.open).toBe(false)
    expect(element.sightingData.weatherTrack?.keyframes[0].weather.cloudCover).toBe(0.25)
  })

  it("does not ask when the text differs from the form's weather for a reason that is not the author's", async () => {
    const element = document.createElement(ELEMENT_NAME) as SightingEditorElement
    element.weatherProvider = record
    document.body.appendChild(element)
    element.sightingData = { ...station, weatherSource: { id: "era5", name: "Open-Meteo" } } as unknown as typeof element.sightingData
    const inside = element as unknown as { applyFileText(text: string, history?: boolean): void, fileTextApplied?: string }
    inside.fileTextApplied = JSON.stringify(element.sightingData)
    // The form's weather moves on by itself (a lookup answered): the text the author is typing in is stale, but they changed another thing.
    const typed = JSON.parse(JSON.stringify(element.sightingData))
    typed.description = "something else"

    inside.applyFileText(JSON.stringify(typed))

    expect((element.shadowRoot!.getElementById("file-ask") as HTMLDialogElement).open).toBe(false)
  })

  it("does not ask when an undo or a redo gives back a text with another weather", async () => {
    const element = document.createElement(ELEMENT_NAME) as SightingEditorElement
    element.weatherProvider = record
    document.body.appendChild(element)
    element.sightingData = { ...station, weatherSource: { id: "era5", name: "Open-Meteo" } } as unknown as typeof element.sightingData
    const inside = element as unknown as { applyFileText(text: string, history?: boolean): void, fileTextApplied?: string }
    inside.fileTextApplied = JSON.stringify(element.sightingData)
    const older = JSON.parse(JSON.stringify(element.sightingData))
    older.weatherTrack.keyframes[0].weather.cloudCover = 0.6

    inside.applyFileText(JSON.stringify(older), true)

    expect((element.shadowRoot!.getElementById("file-ask") as HTMLDialogElement).open).toBe(false)
    expect(element.sightingData.weatherTrack?.keyframes[0].weather.cloudCover).toBe(0.6)
  })

  it("does not ask for a weather that no record owns", async () => {
    const element = document.createElement(ELEMENT_NAME) as SightingEditorElement
    element.weatherProvider = record
    document.body.appendChild(element)
    element.sightingData = { ...station, weatherSource: undefined } as unknown as typeof element.sightingData
    const edited = JSON.parse(JSON.stringify(element.sightingData))
    edited.weatherTrack.keyframes[0].weather.cloudCover = 0.8

    ;(element as unknown as { fileTextApplied: string }).fileTextApplied = JSON.stringify(element.sightingData)
    ;(element as unknown as { applyFileText(text: string): void }).applyFileText(JSON.stringify(edited))
    await new Promise(resolve => setTimeout(resolve, 2500))

    expect((element.shadowRoot!.getElementById("file-ask") as HTMLDialogElement).open).toBe(false)
    expect(element.sightingData.weatherTrack?.keyframes[0].weather.cloudCover).toBe(0.8)
  })
})
