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
    row: get("case-panel"), select: get<HTMLSelectElement>("track"),
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

  const chooseAccount = (element: CaseEditorElement, index: string) => {
    const of = element.shadowRoot!.getElementById("of") as HTMLSelectElement
    of.value = index
    of.dispatchEvent(new Event("change"))
  }

  it("makes a case around a recording that is open, without giving the editor the recording again", async () => {
    files["https://example.org/d/plain.json"] = { version: 1, id: "1965-07-01-Plain", observer: { id: "Plain", title: "A witness" }, time: { year: 1965, month: 7, day: 1, hour: 5, minute: 0 }, timeline: { keyframes: [] } }
    vi.stubGlobal("fetch", vi.fn(async (url: string) => ({ ok: true, json: () => Promise.resolve(structuredClone(files[url])), arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)) })))
    const element = document.createElement("rr0-case-editor") as CaseEditorElement
    document.body.appendChild(element)
    element.setAttribute("src", "https://example.org/d/plain.json")
    await wait()
    const root = element.shadowRoot!
    expect((root.getElementById("make-case-row") as HTMLElement).hidden).toBe(false)
    expect(parts(element).row.hidden).toBe(true)
    // An edit in progress, which must survive the case being made.
    element.sightingEditor.sightingData = { ...element.sightingData, description: "Edited, not saved" }
    const editorBefore = element.sightingEditor
    ;(root.getElementById("make-case") as HTMLButtonElement).click()
    expect(parts(element).row.hidden).toBe(false)
    expect((root.getElementById("make-case-row") as HTMLElement).hidden).toBe(true)
    expect(element.sightingEditor).toBe(editorBefore)
    expect(element.sightingData.description).toBe("Edited, not saved")
    expect([...parts(element).select.options]).toHaveLength(1)
    const written = element.caseSession!.files()
    expect(written.map(file => file.path)).toEqual(["case.json", "observer-plain.json"])
    expect(JSON.parse(written[0].content).time).toBe("1965-07-01 05:00")
    expect(JSON.parse(written[1].content).description).toBe("Edited, not saved")
  })

  it("adds a reading through the one + button: naming the account it interprets, with a title and an author", async () => {
    const element = await open()
    const { select, add, remove, field } = parts(element)
    add.click()
    chooseAccount(element, "0")
    field("title").value = "A hubcap"
    field("author").value = "Cousyn"
    field("date").value = "2013-06-01"
    await submit(element)
    expect([...select.options]).toHaveLength(3)
    expect(element.sightingData.id).toBe("x-1-interpretation-2")
    expect(element.sightingData.interpretation?.title).toBe("A hubcap")
    const event = element.caseSession!.json.events!.at(-1)!
    expect(event.interpretationOf).toBe("x-1")
    remove.click()
    expect([...select.options]).toHaveLength(3)
    await submit(element)
    expect([...select.options]).toHaveLength(2)
    expect(element.sightingData.id).toBe("x-1")
  })

  it("asks only for an observer and a date when no account is named, and for a title and an author when one is", async () => {
    const element = await open()
    const root = element.shadowRoot!
    parts(element).add.click()
    expect((root.getElementById("row-observer") as HTMLElement).hidden).toBe(false)
    expect((root.getElementById("row-title") as HTMLElement).hidden).toBe(true)
    chooseAccount(element, "0")
    expect((root.getElementById("row-observer") as HTMLElement).hidden).toBe(true)
    expect((root.getElementById("row-title") as HTMLElement).hidden).toBe(false)
    expect((root.getElementById("row-author") as HTMLElement).hidden).toBe(false)
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
    // The export stands last on the heading's line: top right of the case's own part, before its observations.
    const header = root.querySelector(".case-panel .header")!
    expect(header.lastElementChild).toBe(parts(element).exportButton)
    // What is selected is not repeated inside the observation's container.
    expect(root.getElementById("recording-heading")).toBeNull()
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

  it("dates the case as a recording is dated: a picker for a full instant, the text for less, written as RR0 writes", async () => {
    const full = await open(undefined, { time: "1950-05-11 19:45" })
    const root = full.shadowRoot!
    const picker = root.querySelector("rr0-date-input input[type=datetime-local]") as HTMLInputElement
    const text = root.getElementById("case-time") as HTMLInputElement
    expect(picker.hidden).toBe(false)
    expect(picker.value).toBe("1950-05-11T19:45")
    picker.value = "1950-05-12T20:10"
    picker.dispatchEvent(new Event("change"))
    expect((full.caseSession!.json as unknown as Record<string, unknown>).time).toBe("1950-05-12 20:10")
    document.body.innerHTML = ""

    const bare = await open(undefined, { time: "1954" })
    const bareText = bare.shadowRoot!.getElementById("case-time") as HTMLInputElement
    expect(bareText.hidden).toBe(false)
    expect(bareText.value).toBe("1954")
    bareText.value = "1954-03"
    bareText.dispatchEvent(new Event("input"))
    expect((bare.caseSession!.json as unknown as Record<string, unknown>).time).toBe("1954-03")
    expect(text).not.toBe(bareText)
  })

  it("adds a blank observation to the case and opens it", async () => {
    const element = await open()
    const { add, select, field } = parts(element)
    add.click()
    field("observer").value = "Second Witness"
    field("date").value = "1950-05-11"
    await submit(element)
    expect([...select.options]).toHaveLength(3)
    expect(element.sightingData.observer?.title).toBe("Second Witness")
    const event = element.caseSession!.json.events!.at(-1)!
    expect(event.eventType).toBe("sighting")
    expect(event.interpretationOf).toBeUndefined()
    expect(element.caseSession!.tracks.at(-1)!.kind).toBe("observer")
  })

  it("asks, in a dialog, whether to export the observations too, and exports the case alone as a plain file", async () => {
    const element = await open()
    const downloads: string[] = []
    const click = HTMLAnchorElement.prototype.click
    HTMLAnchorElement.prototype.click = function (this: HTMLAnchorElement) { downloads.push(this.download) }
    vi.stubGlobal("URL", Object.assign(URL, { createObjectURL: () => "blob:x", revokeObjectURL: () => {} }))
    try {
      const { exportButton, field } = parts(element)
      exportButton.click()
      expect(element.shadowRoot!.getElementById("dialog-title")!.textContent).toBeTruthy()
      expect(field("export-recordings").checked).toBe(true)
      field("export-recordings").checked = false
      await submit(element)
      await wait()
      expect(downloads).toEqual(["case.json"])
    } finally {
      HTMLAnchorElement.prototype.click = click
    }
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

  describe("leaving with changes not exported", () => {
    const leave = (): BeforeUnloadEvent => {
      const event = new Event("beforeunload", { cancelable: true }) as BeforeUnloadEvent
      window.dispatchEvent(event)
      return event
    }

    it("lets a case that was only opened be left, and warns once a field of it, or a recording, has changed", async () => {
      const element = await open()
      expect(element.dirty).toBe(false)
      expect(leave().defaultPrevented).toBe(false)
      const { field } = parts(element)
      field("case-title").value = "Another title"
      field("case-title").dispatchEvent(new Event("input"))
      expect(element.dirty).toBe(true)
      expect(leave().defaultPrevented).toBe(true)
    })

    it("shows that there is something to lose, and stops once the case is exported", async () => {
      const element = await open()
      const root = element.shadowRoot!
      const indicator = root.getElementById("dirty")!
      expect(indicator.hidden).toBe(true)
      parts(element).field("case-title").value = "Another title"
      parts(element).field("case-title").dispatchEvent(new Event("input"))
      await wait(700)
      expect(indicator.hidden).toBe(false)
      const click = HTMLAnchorElement.prototype.click
      HTMLAnchorElement.prototype.click = () => {}
      vi.stubGlobal("URL", Object.assign(URL, { createObjectURL: () => "blob:x", revokeObjectURL: () => {} }))
      try {
        parts(element).exportButton.click()
        ;(root.getElementById("export-recordings") as HTMLInputElement).checked = true
        await submit(element)
        await wait()
      } finally {
        HTMLAnchorElement.prototype.click = click
      }
      expect(element.dirty).toBe(false)
      expect(indicator.hidden).toBe(true)
    })

    it("asks before replacing what is open by what the editor loads, and loads nothing if the author declines", async () => {
      const element = await open()
      parts(element).field("case-title").value = "Another title"
      parts(element).field("case-title").dispatchEvent(new Event("input"))
      files["https://example.org/d/plain.json"] = { version: 1, id: "plain", timeline: { keyframes: [] } }
      const editorRoot = element.sightingEditor.shadowRoot!
      const load = () => {
        ;(editorRoot.getElementById("import-url") as HTMLInputElement).value = "https://example.org/d/plain.json"
        ;(editorRoot.getElementById("import-url-button") as HTMLButtonElement).click()
      }
      load()
      await wait()
      expect((element.shadowRoot!.getElementById("dialog") as HTMLDialogElement).open).toBe(true)
      expect(element.sightingData.id).toBe("x-1") // nothing was replaced
      element.shadowRoot!.getElementById("cancel")!.click()
      await wait()
      expect(parts(element).row.hidden).toBe(false)
      expect(element.sightingData.id).toBe("x-1")
      // And once the author agrees, the load goes on and the case is left.
      load()
      await wait()
      await submit(element)
      await wait(60)
      expect(element.sightingData.id).toBe("plain")
      expect(parts(element).row.hidden).toBe(true)
    })

    it("warns for a recording alone as well, and not for one that was only opened", async () => {
      files["https://example.org/d/plain.json"] = { version: 1, id: "plain", observer: { id: "p" }, timeline: { keyframes: [] } }
      vi.stubGlobal("fetch", vi.fn(async (url: string) => ({ ok: true, json: () => Promise.resolve(structuredClone(files[url])), arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)) })))
      const element = document.createElement("rr0-case-editor") as CaseEditorElement
      document.body.appendChild(element)
      element.setAttribute("src", "https://example.org/d/plain.json")
      await wait()
      expect(element.dirty).toBe(false)
      expect(leave().defaultPrevented).toBe(false)
      const description = element.sightingEditor.shadowRoot!.getElementById("description") as HTMLTextAreaElement
      description.value = "Something the author typed"
      description.dispatchEvent(new Event("input"))
      expect(element.dirty).toBe(true)
      expect(leave().defaultPrevented).toBe(true)
    })

    it("exports every observation next to the case, the ones never opened included, when asked", async () => {
      const element = await open()
      const fetched: string[] = []
      const before = globalThis.fetch
      vi.stubGlobal("fetch", vi.fn(async (url: string) => {
        fetched.push(url)
        return { ok: true, json: () => Promise.resolve(structuredClone(files[url])), arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)) }
      }))
      const written: string[] = []
      const click = HTMLAnchorElement.prototype.click
      HTMLAnchorElement.prototype.click = function (this: HTMLAnchorElement) { written.push(this.download) }
      vi.stubGlobal("URL", Object.assign(URL, { createObjectURL: () => "blob:x", revokeObjectURL: () => {} }))
      try {
        parts(element).exportButton.click()
        await submit(element)
        await wait(100)
      } finally {
        HTMLAnchorElement.prototype.click = click
        void before
      }
      expect(fetched).toContain("https://example.org/d/reading.json") // never opened, fetched to be written
      expect(written).toEqual(["X.zip"])
      expect(element.dirty).toBe(false)
    })

    it("marks a recording that was changed, in a case or alone, apart from the case", async () => {
      const element = await open()
      const root = element.shadowRoot!
      const recordingMark = root.getElementById("recording-dirty")!
      expect(recordingMark.hidden).toBe(true)
      const description = element.sightingEditor.shadowRoot!.getElementById("description") as HTMLTextAreaElement
      description.value = "Something the author typed"
      // As a browser sends it: it crosses the editor's shadow root.
      description.dispatchEvent(new Event("input", { bubbles: true, composed: true }))
      await wait(700)
      expect(recordingMark.hidden).toBe(false)
      expect(root.getElementById("dirty")!.hidden).toBe(false)
    })

    it("asks in the page before one of its links is followed with changes not exported, and follows nothing if declined", async () => {
      const element = await open()
      parts(element).field("case-title").value = "Another title"
      parts(element).field("case-title").dispatchEvent(new Event("input"))
      const link = document.createElement("a")
      link.href = "https://example.org/elsewhere"
      document.body.appendChild(link)
      const event = new MouseEvent("click", { bubbles: true, cancelable: true, button: 0 })
      link.dispatchEvent(event)
      expect(event.defaultPrevented).toBe(true)
      expect((element.shadowRoot!.getElementById("dialog") as HTMLDialogElement).open).toBe(true)
      expect(element.shadowRoot!.getElementById("dialog-message")!.textContent).toContain("Leave anyway")
      element.shadowRoot!.getElementById("cancel")!.click()
    })

    it("lets a link be followed when nothing would be lost", async () => {
      const element = await open()
      const link = document.createElement("a")
      link.href = "https://example.org/elsewhere"
      document.body.appendChild(link)
      const event = new MouseEvent("click", { bubbles: true, cancelable: true, button: 0 })
      link.addEventListener("click", e => e.preventDefault()) // so that jsdom does not try to navigate
      link.dispatchEvent(event)
      expect((element.shadowRoot!.getElementById("dialog") as HTMLDialogElement).open).toBe(false)
    })
  })
})
