import { describe, expect, it, afterEach, beforeAll, vi } from "vitest"

import { register } from "../../src/component/CaseEditorElement.js"
import type { CaseEditorElement } from "../../src/component/CaseEditorElement.js"

register()

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
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockImplementation(function (this: HTMLCanvasElement) {
    // mockImplementation, not mockReturnValue: a renderer that sizes itself from its own canvas
    // (see ObserverMapRenderer) reads ctx.canvas, and one shared object makes every canvas claim to
    // be the same one.
    return {
      canvas: this,
      save: vi.fn(),
      restore: vi.fn(),
      beginPath: vi.fn(),
      closePath: vi.fn(),
      fill: vi.fn(),
      ellipse: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      translate: vi.fn(),
      rotate: vi.fn(),
      clearRect: vi.fn(),
      strokeRect: vi.fn(),
      stroke: vi.fn(),
      fillRect: vi.fn(),
      arc: vi.fn(),
      fillText: vi.fn(),
      strokeText: vi.fn(),
      drawImage: vi.fn(),
      createRadialGradient: vi.fn(() => ({ addColorStop: vi.fn() })),
      measureText: vi.fn((text: string) => ({ width: text.length * 5 })),
    } as unknown as CanvasRenderingContext2D
  })
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


const account = { version: 1, id: "x-1", observer: { id: "x", title: "Witness" }, timeline: { keyframes: [] } }
const reading = { version: 1, id: "x-1-interpretation-1", tags: ["interpretation"], timeline: { keyframes: [] }, interpretation: { title: { en: "A model" }, bodies: [] } }
const caseJson = () => ({
  id: "X",
  events: [
    { type: "event", eventType: "sighting", title: "An account", url: "account.json" },
    { type: "event", eventType: "sighting", interpretationOf: "x-1", time: "2013-04", title: { en: "A model" }, url: "reading.json" }
  ]
})
const files: Record<string, unknown> = {}
const wait = (ms = 30) => new Promise(resolve => setTimeout(resolve, ms))

const open = async (track?: string, own?: Record<string, unknown>): Promise<CaseEditorElement> => {
  files["https://example.org/d/case.json"] = { ...caseJson(), ...own }
  files["https://example.org/d/account.json"] = account
  files["https://example.org/d/reading.json"] = reading
  vi.stubGlobal("fetch", vi.fn(async (url: string) => ({
    ok: true, json: () => Promise.resolve(structuredClone(files[url])), arrayBuffer: () => Promise.resolve(new ArrayBuffer(0))
  })))
  const element = document.createElement("rr0-case-editor") as CaseEditorElement
  if (track) element.setAttribute("track", track)
  document.body.appendChild(element)
  element.setAttribute("src", "https://example.org/d/case.json")
  await wait()
  return element
}

const parts = (element: CaseEditorElement) => {
  const root = element.shadowRoot!
  const get = <T extends HTMLElement>(id: string) => root.getElementById(id) as T
  return {
    row: get("case-panel"), select: get<HTMLSelectElement>("track"), interpret: get<HTMLButtonElement>("interpret"),
    add: get<HTMLButtonElement>("add"), remove: get<HTMLButtonElement>("delete"), exportButton: get<HTMLButtonElement>("export"),
    form: get<HTMLFormElement>("form"), field: (id: string) => get<HTMLInputElement>(id), error: get("dialog-error")
  }
}

const submit = async (element: CaseEditorElement) => {
  parts(element).form.dispatchEvent(new Event("submit", { cancelable: true }))
  await wait()
}

describe("CaseEditorElement", () => {
  afterEach(() => {
    document.body.innerHTML = ""
    vi.unstubAllGlobals()
    globalThis.fetch = vi.fn().mockResolvedValue({ arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)) }) as typeof fetch
  })

  it("lists the case's recordings, accounts and readings, and opens on the first account", async () => {
    const element = await open()
    const { row, select } = parts(element)
    expect(row.hidden).toBe(false)
    expect([...select.options]).toHaveLength(2)
    expect(element.sightingData.id).toBe("x-1")
  })

  it("opens on the recording the track attribute names", async () => {
    const element = await open("reading.json")
    expect(element.sightingData.id).toBe("x-1-interpretation-1")
    expect(element.sightingEditor.reading).toBe(true)
  })

  it("shows no case row for a recording that is not a case", async () => {
    files["https://example.org/d/plain.json"] = { version: 1, id: "plain", timeline: { keyframes: [] } }
    vi.stubGlobal("fetch", vi.fn(async (url: string) => ({ ok: true, json: () => Promise.resolve(structuredClone(files[url])), arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)) })))
    const element = document.createElement("rr0-case-editor") as CaseEditorElement
    document.body.appendChild(element)
    element.setAttribute("src", "https://example.org/d/plain.json")
    await wait()
    expect(parts(element).row.hidden).toBe(true)
    expect(element.sightingData.id).toBe("plain")
  })

  it("asks for the reading's fields, adds it as a recording of its own, and deletes it once confirmed", async () => {
    const element = await open()
    const { select, interpret, remove, field } = parts(element)
    interpret.click()
    field("title").value = "A hubcap"
    field("author").value = "Cousyn"
    field("date").value = "2013-06-01"
    await submit(element)
    expect([...select.options]).toHaveLength(3)
    expect(element.sightingData.id).toBe("x-1-interpretation-2")
    expect(element.sightingData.interpretation?.title).toBe("A hubcap")
    expect(interpret.hidden).toBe(true)
    remove.click()
    expect([...select.options]).toHaveLength(3)
    await submit(element)
    expect([...select.options]).toHaveLength(2)
    expect(element.sightingData.id).toBe("x-1")
  })

  it("offers to interpret an account but not a reading", async () => {
    const element = await open()
    const { select, interpret } = parts(element)
    expect(interpret.hidden).toBe(false)
    select.value = "1"
    select.dispatchEvent(new Event("change"))
    await wait()
    expect(interpret.hidden).toBe(true)
  })

  it("shows the case above the recording being edited, which stands inside a frame of its own", async () => {
    const element = await open()
    const root = element.shadowRoot!
    const panel = root.getElementById("case-panel")!
    const frame = root.getElementById("recording")!
    expect(panel.hidden).toBe(false)
    // One container for the case, holding the case's own part and the recording's, which is a container of its own.
    const container = root.getElementById("case")!
    expect(container.classList.contains("in-case")).toBe(true)
    expect(container.contains(panel) && container.contains(frame)).toBe(true)
    expect(frame.parentElement).toBe(container)
    expect(panel.compareDocumentPosition(frame) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(frame.classList.contains("in-case")).toBe(true)
    expect(frame.contains(root.getElementById("editor"))).toBe(true)
    expect(panel.contains(parts(element).exportButton)).toBe(true)
    expect(root.getElementById("recording-heading")!.textContent).toContain("An account")
  })

  it("edits the case's own fields, and writes them with the case", async () => {
    const element = await open(undefined, { id: "X", title: "Old", time: "1950" })
    const { field } = parts(element)
    expect(field("case-title").value).toBe("Old")
    field("case-title").value = "New"
    field("case-title").dispatchEvent(new Event("input"))
    field("case-time").value = ""
    field("case-time").dispatchEvent(new Event("input"))
    const json = element.caseSession!.json as unknown as Record<string, unknown>
    expect(json.title).toBe("New")
    expect("time" in json).toBe(false)
  })

  it("adds a blank observation to the case and opens it", async () => {
    const element = await open()
    const { add, select, field } = parts(element)
    add.click()
    field("observer").value = "Second Witness"
    field("observed").value = "1950-05-11"
    await submit(element)
    expect([...select.options]).toHaveLength(3)
    expect(element.sightingData.observer?.title).toBe("Second Witness")
    const event = element.caseSession!.json.events!.at(-1)!
    expect(event.eventType).toBe("sighting")
    expect(event.interpretationOf).toBeUndefined()
    expect(element.caseSession!.tracks.at(-1)!.kind).toBe("observer")
  })

  it("adds an observation read from an address", async () => {
    const element = await open()
    files["https://example.org/other.json"] = { version: 1, id: "other-1", observer: { title: "Other" }, timeline: { keyframes: [] } }
    const { add, select, field } = parts(element)
    add.click()
    const source = element.shadowRoot!.getElementById("source") as HTMLSelectElement
    source.value = "url"
    source.dispatchEvent(new Event("change"))
    field("url").value = "https://example.org/other.json"
    await submit(element)
    expect([...select.options]).toHaveLength(3)
    expect(element.sightingData.id).toBe("other-1")
  })

  it("refuses to add a case as an observation, and says so in the dialog", async () => {
    const element = await open()
    files["https://example.org/another-case.json"] = caseJson()
    const { add, field, error } = parts(element)
    add.click()
    const source = element.shadowRoot!.getElementById("source") as HTMLSelectElement
    source.value = "url"
    source.dispatchEvent(new Event("change"))
    field("url").value = "https://example.org/another-case.json"
    await submit(element)
    expect(error.hidden).toBe(false)
    expect(parts(element).select.options).toHaveLength(2)
  })

  it("refuses to delete an observation a reading still interprets, and deletes it once none does", async () => {
    const element = await open()
    const { select, remove } = parts(element)
    remove.click()
    await submit(element)
    expect([...select.options]).toHaveLength(2) // the reading still interprets it
    select.value = "1"
    select.dispatchEvent(new Event("change"))
    await wait()
    remove.click()
    await submit(element) // the reading goes
    expect([...select.options]).toHaveLength(1)
    remove.click()
    expect(remove.hidden).toBe(true) // the last recording stays
  })

  it("leaves case mode when a plain recording is loaded into the editor", async () => {
    const element = await open()
    files["https://example.org/d/plain.json"] = { version: 1, id: "plain", timeline: { keyframes: [] } }
    const editorRoot = element.sightingEditor.shadowRoot!
    ;(editorRoot.getElementById("import-url") as HTMLInputElement).value = "https://example.org/d/plain.json"
    ;(editorRoot.getElementById("import-url-button") as HTMLButtonElement).click()
    await wait()
    expect(parts(element).row.hidden).toBe(true)
    expect(element.sightingData.id).toBe("plain")
  })
})
