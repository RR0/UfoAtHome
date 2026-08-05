import { describe, expect, it, afterEach, beforeAll, vi } from "vitest"
import { register, ELEMENT_NAME } from "../../src/component/UfoRecorderElement.js"
import type { UfoRecorderElement } from "../../src/component/UfoRecorderElement.js"

register()

// UfoRecorderElement now nests a <rr0-scene> (see its own class doc comment) instead of a bare
// <rr0-ufo>, so mounting it also constructs a SceneRenderer — which jsdom's <canvas> can't back
// with a real WebGL context (no native `canvas` package here, same reason as the 2D mock below).
// Stubbed out entirely: these tests exercise the 2D shape/appearance/observer/time editing logic,
// not 3D rendering, which has no unit tests of its own for the same jsdom-has-no-WebGL reason
// (see SceneRenderer.ts's own lack of a dedicated test file).
vi.mock("../../src/render3d/SceneRenderer.js", () => ({
  SceneRenderer: class {
    resize(): void {}
    setObserverPose(): void {}
    setTerrainOrigin(): void {}
    get currentTerrainAttribution(): undefined {
      return undefined
    }
    setAstronomy(): void {}
    setShowCompass(): void {}
    setCompassHovered(): void {}
    setCompassForced(): void {}
    setWeather(): void {}
    pickBodyAt(): undefined {
      return undefined
    }
    render(): void {}
    dispose(): void {}
    startTwinkle(): void {}
    stopTwinkle(): void {}
  }
}))

// jsdom's <canvas> has no real 2D context (getContext("2d") returns null without the
// native `canvas` package) — stub it, same as test/render/CanvasRenderer.test.ts's mock,
// so mounting the component doesn't throw when it paints its initial preview.
beforeAll(() => {
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({
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
    fillRect: vi.fn()
  } as unknown as CanvasRenderingContext2D)
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

function mount(): UfoRecorderElement {
  const element = document.createElement(ELEMENT_NAME) as UfoRecorderElement
  document.body.appendChild(element)
  return element
}

/** The nested <rr0-ufo> now lives inside the recorder's own nested <rr0-scene> (see
 * UfoRecorderElement's class doc comment) instead of being a direct shadow child — this centralizes
 * the extra hop so test call sites don't all need to know that. */
function nestedUfo(element: UfoRecorderElement): Element {
  return element.shadowRoot!.querySelector("rr0-scene")!.shadowRoot!.querySelector("rr0-ufo")!
}

async function waitFor(check: () => boolean, timeoutMs = 500): Promise<void> {
  const start = Date.now()
  while (!check()) {
    if (Date.now() - start > timeoutMs) throw new Error("waitFor timed out")
    await new Promise(resolve => setTimeout(resolve, 5))
  }
}

describe("UfoRecorderElement appearance toolbar", () => {
  afterEach(() => {
    document.body.innerHTML = ""
  })

  it("defaults to an oval, opaque, green appearance", () => {
    const element = mount()
    expect(element.appearance).toEqual({ presetId: "oval", color: "#39ff14", transparency: 0, haloScale: 1.5 })
  })

  it("clicking a preset button updates the appearance and its pressed state", () => {
    const element = mount()
    const saucerButton = element.shadowRoot!.getElementById("preset-saucer") as HTMLButtonElement
    saucerButton.click()

    expect(element.appearance.presetId).toBe("saucer")
    expect(saucerButton.getAttribute("aria-pressed")).toBe("true")
    const ovalButton = element.shadowRoot!.getElementById("preset-oval") as HTMLButtonElement
    expect(ovalButton.getAttribute("aria-pressed")).toBe("false")
  })

  it("changing color/transparency/halo inputs updates the appearance", () => {
    const element = mount()
    const shadow = element.shadowRoot!
    const colorInput = shadow.getElementById("color") as HTMLInputElement
    const transparencyInput = shadow.getElementById("transparency") as HTMLInputElement
    const haloInput = shadow.getElementById("haloScale") as HTMLInputElement

    colorInput.value = "#ff8800"
    colorInput.dispatchEvent(new Event("input"))
    transparencyInput.value = "0.6"
    transparencyInput.dispatchEvent(new Event("input"))
    haloInput.value = "2.5"
    haloInput.dispatchEvent(new Event("input"))

    expect(element.appearance).toEqual({ presetId: "oval", color: "#ff8800", transparency: 0.6, haloScale: 2.5 })
  })

  it("the appearance setter merges partial updates", () => {
    const element = mount()
    element.appearance = { color: "#0000ff" }
    expect(element.appearance).toEqual({ presetId: "oval", color: "#0000ff", transparency: 0, haloScale: 1.5 })
  })
})

describe("UfoRecorderElement observer/time fields", () => {
  afterEach(() => {
    document.body.innerHTML = ""
  })

  function setInput(shadow: ShadowRoot, id: string, value: string): void {
    const input = shadow.getElementById(id) as HTMLInputElement
    input.value = value
    input.dispatchEvent(new Event("input"))
  }

  it("writes lat/lng/heading into both place and a t=0 observerTrack keyframe", () => {
    const element = mount()
    const shadow = element.shadowRoot!
    setInput(shadow, "lat", "43.837")
    setInput(shadow, "lng", "5.993")
    setInput(shadow, "heading", "270")

    expect(element.sightingData.place).toEqual([{ lat: 43.837, lng: 5.993 }])
    expect(element.sightingData.observerTrack?.keyframes).toEqual([
      { t: 0, pose: { lat: 43.837, lng: 5.993, elevationM: 0, headingDeg: 270, pitchDeg: 0, fovDeg: 60 } }
    ])
  })

  it("leaves heading undefined (not defaulted to north) when left blank", () => {
    const element = mount()
    const shadow = element.shadowRoot!
    setInput(shadow, "lat", "43.837")
    setInput(shadow, "lng", "5.993")

    expect(element.sightingData.observerTrack?.keyframes[0].pose.headingDeg).toBeUndefined()
  })

  it("clearing every field removes both place and the observerTrack keyframe", () => {
    const element = mount()
    const shadow = element.shadowRoot!
    setInput(shadow, "lat", "43.837")
    setInput(shadow, "lng", "5.993")
    setInput(shadow, "lat", "")
    setInput(shadow, "lng", "")

    expect(element.sightingData.place).toBeUndefined()
    expect(element.sightingData.observerTrack?.keyframes).toEqual([])
  })

  it("clearing only lat drops place (needs both) but keeps a partial observerTrack pose (lng alone is still meaningful)", () => {
    const element = mount()
    const shadow = element.shadowRoot!
    setInput(shadow, "lat", "43.837")
    setInput(shadow, "lng", "5.993")
    setInput(shadow, "lat", "")

    expect(element.sightingData.place).toBeUndefined()
    expect(element.sightingData.observerTrack?.keyframes).toEqual([
      { t: 0, pose: { lat: undefined, lng: 5.993, elevationM: 0, headingDeg: undefined, pitchDeg: 0, fovDeg: 60 } }
    ])
  })

  it("setting only heading (no lat/lng at all) still writes an observerTrack keyframe, not silently discarded", () => {
    const element = mount()
    const shadow = element.shadowRoot!
    setInput(shadow, "heading", "270")

    expect(element.sightingData.place).toBeUndefined()
    expect(element.sightingData.observerTrack?.keyframes).toEqual([
      { t: 0, pose: { lat: undefined, lng: undefined, elevationM: 0, headingDeg: 270, pitchDeg: 0, fovDeg: 60 } }
    ])
  })

  it("writes the observation-start date/time fields into event.time", () => {
    const element = mount()
    const shadow = element.shadowRoot!
    setInput(shadow, "obs-year", "1965")
    setInput(shadow, "obs-month", "7")
    setInput(shadow, "obs-day", "1")
    setInput(shadow, "obs-hour", "5")
    setInput(shadow, "obs-minute", "0")

    expect(element.sightingData.time).toEqual({ year: 1965, month: 7, day: 1, hour: 5, minute: 0 })
  })

  it("clears event.time entirely once every date/time field is emptied", () => {
    const element = mount()
    const shadow = element.shadowRoot!
    setInput(shadow, "obs-year", "1965")
    setInput(shadow, "obs-year", "")

    expect(element.sightingData.time).toBeUndefined()
  })

  it("loading sightingData re-populates the observer/time fields", () => {
    const element = mount()
    element.sightingData = {
      version: 1,
      time: { year: 1948, month: 7, day: 24, hour: 2, minute: 45 },
      place: [{ lat: 32.3792, lng: -86.3077 }],
      observerTrack: { keyframes: [{ t: 0, pose: { lat: 32.3792, lng: -86.3077, elevationM: 0, headingDeg: 45, pitchDeg: 0, fovDeg: 60 } }] },
      timeline: { keyframes: [] }
    }

    const shadow = element.shadowRoot!
    expect((shadow.getElementById("lat") as HTMLInputElement).value).toBe("32.3792")
    expect((shadow.getElementById("lng") as HTMLInputElement).value).toBe("-86.3077")
    expect((shadow.getElementById("heading") as HTMLInputElement).value).toBe("45")
    expect((shadow.getElementById("obs-year") as HTMLInputElement).value).toBe("1948")
    expect((shadow.getElementById("obs-hour") as HTMLInputElement).value).toBe("2")
  })
})

describe("UfoRecorderElement observer keyframes over time", () => {
  afterEach(() => {
    document.body.innerHTML = ""
  })

  function setInput(shadow: ShadowRoot, id: string, value: string): void {
    const input = shadow.getElementById(id) as HTMLInputElement
    input.value = value
    input.dispatchEvent(new Event("input"))
  }

  function seekNestedUfoTo(element: UfoRecorderElement, t: number): void {
    const seekInput = nestedUfo(element)!.shadowRoot!.getElementById("seek") as HTMLInputElement
    seekInput.value = String(t)
    seekInput.dispatchEvent(new Event("input"))
  }

  it("records a keyframe at the scrubbed-to instant, not always at t=0", () => {
    const element = mount()
    element.sightingData = {
      version: 1,
      observerTrack: { keyframes: [{ t: 0, pose: { lat: 43.837, lng: 5.993, elevationM: 0, headingDeg: undefined, pitchDeg: 0, fovDeg: 60 } }] },
      timeline: { keyframes: [] },
      durationSeconds: 5
    }
    const shadow = element.shadowRoot!
    seekNestedUfoTo(element, 2000)
    setInput(shadow, "lat", "44.0")
    setInput(shadow, "lng", "6.5")

    expect(element.sightingData.observerTrack?.keyframes).toEqual([
      { t: 0, pose: { lat: 43.837, lng: 5.993, elevationM: 0, headingDeg: undefined, pitchDeg: 0, fovDeg: 60 } },
      { t: 2000, pose: { lat: 44.0, lng: 6.5, elevationM: 0, headingDeg: undefined, pitchDeg: 0, fovDeg: 60 } }
    ])
  })

  it("editing at two different scrubbed instants produces two independent keyframes", () => {
    const element = mount()
    element.sightingData = { version: 1, timeline: { keyframes: [] }, durationSeconds: 5 }
    const shadow = element.shadowRoot!

    seekNestedUfoTo(element, 0)
    setInput(shadow, "lat", "43.837")
    setInput(shadow, "lng", "5.993")
    seekNestedUfoTo(element, 3000)
    setInput(shadow, "lat", "43.9")
    setInput(shadow, "lng", "6.1")

    expect(element.sightingData.observerTrack?.keyframes.map(k => k.t)).toEqual([0, 3000])
  })

  it("blanking fields at a scrubbed instant removes just that keyframe, leaving others intact", () => {
    const element = mount()
    element.sightingData = { version: 1, timeline: { keyframes: [] }, durationSeconds: 5 }
    const shadow = element.shadowRoot!

    seekNestedUfoTo(element, 0)
    setInput(shadow, "lat", "43.837")
    setInput(shadow, "lng", "5.993")
    seekNestedUfoTo(element, 3000)
    setInput(shadow, "lat", "43.9")
    setInput(shadow, "lng", "6.1")
    setInput(shadow, "lat", "")
    setInput(shadow, "lng", "")

    expect(element.sightingData.observerTrack?.keyframes).toEqual([
      { t: 0, pose: { lat: 43.837, lng: 5.993, elevationM: 0, headingDeg: undefined, pitchDeg: 0, fovDeg: 60 } }
    ])
  })

  it("scrubbing between two observer keyframes repopulates the fields with the interpolated pose", () => {
    const element = mount()
    element.sightingData = {
      version: 1,
      observerTrack: {
        keyframes: [
          { t: 0, pose: { lat: 40, lng: 0, elevationM: 0, headingDeg: 0, pitchDeg: 0, fovDeg: 60 } },
          { t: 1000, pose: { lat: 42, lng: 2, elevationM: 0, headingDeg: 90, pitchDeg: 0, fovDeg: 60 } }
        ]
      },
      timeline: { keyframes: [] },
      durationSeconds: 5
    }
    seekNestedUfoTo(element, 500)

    const shadow = element.shadowRoot!
    expect((shadow.getElementById("lat") as HTMLInputElement).value).toBe("41")
    expect((shadow.getElementById("lng") as HTMLInputElement).value).toBe("1")
    expect((shadow.getElementById("heading") as HTMLInputElement).value).toBe("45")
  })

  it("does not write or resync observer fields while the nested player is playing", () => {
    const element = mount()
    element.sightingData = {
      version: 1,
      observerTrack: { keyframes: [{ t: 0, pose: { lat: 43.837, lng: 5.993, elevationM: 0, headingDeg: undefined, pitchDeg: 0, fovDeg: 60 } }] },
      timeline: {
        keyframes: [
          { t: 0, shapes: [{ sourceId: "ufo-1", shape: { kind: "oval", bounds: { x: 0, y: 0, width: 10, height: 10 }, color: "#39ff14", angle: 0, transparency: 0, haloScale: 1.5, selected: false } }] },
          { t: 1000, shapes: [{ sourceId: "ufo-1", shape: { kind: "oval", bounds: { x: 100, y: 0, width: 10, height: 10 }, color: "#39ff14", angle: 0, transparency: 0, haloScale: 1.5, selected: false } }] }
        ]
      }
    }
    const ufo = nestedUfo(element) as unknown as { playbackState: string }
    const playButton = nestedUfo(element)!.shadowRoot!.getElementById("play-pause") as HTMLButtonElement
    playButton.click()
    expect(ufo.playbackState).toBe("playing")

    const before = JSON.stringify(element.sightingData)
    const shadow = element.shadowRoot!
    setInput(shadow, "lat", "0")
    setInput(shadow, "lng", "0")

    expect(JSON.stringify(element.sightingData)).toBe(before)
  })

  it("does not clobber a field's in-progress value while it's focused (regression: typing a decimal lat/lng)", () => {
    const element = mount()
    element.sightingData = {
      version: 1,
      observerTrack: { keyframes: [{ t: 0, pose: { lat: 40, lng: 0, elevationM: 0, headingDeg: undefined, pitchDeg: 0, fovDeg: 60 } }] },
      timeline: { keyframes: [] }
    }
    const shadow = element.shadowRoot!
    const latInput = shadow.getElementById("lat") as HTMLInputElement
    latInput.focus()
    // "43.50" round-trips through Number()/String() as "43.5" (its trailing zero dropped) — every
    // keystroke used to trigger a full resync from the just-parsed (and therefore reformatted)
    // stored pose, silently stripping whatever the user had typed past the significant digits on
    // every single character, making it impossible to ever finish typing a value like this.
    latInput.value = "43.50"
    latInput.dispatchEvent(new Event("input"))

    expect(latInput.value).toBe("43.50")
  })

  it("wraps orientation to 0 once it reaches 360, both in the field and the stored pose", () => {
    const element = mount()
    const shadow = element.shadowRoot!
    setInput(shadow, "heading", "360")

    const headingInput = shadow.getElementById("heading") as HTMLInputElement
    expect(headingInput.value).toBe("0")
    expect(element.sightingData.observerTrack?.keyframes[0].pose.headingDeg).toBe(0)
  })
})

describe("UfoRecorderElement composes a nested rr0-ufo", () => {
  afterEach(() => {
    document.body.innerHTML = ""
  })

  it("nests a real, upgraded UfoElement instance", () => {
    const element = mount()
    const ufo = nestedUfo(element)
    expect(ufo).not.toBeNull()
    // Would be undefined on a not-yet-upgraded element (see the constructor's
    // document.createElement comment) — asserting it's present proves the fix.
    expect((ufo as unknown as { canvasElement: unknown }).canvasElement).toBeDefined()
  })

  it("disables the nested ufo element's click-to-play (the canvas is used for drag-to-record instead)", () => {
    const element = mount()
    const ufo = nestedUfo(element) as unknown as { enableClickToPlay: boolean }
    expect(ufo.enableClickToPlay).toBe(false)
  })

  it("sightingData get/set delegates to the nested ufo element", () => {
    const element = mount()
    const json = {
      version: 1 as const,
      timeline: {
        keyframes: [
          { t: 0, shapes: [{ sourceId: "ufo-1", shape: { kind: "oval" as const, bounds: { x: 1, y: 2, width: 3, height: 4 }, color: "#fff", angle: 0, transparency: 0, haloScale: 0, selected: false } }] }
        ]
      },
      observerTrack: { keyframes: [] }
    }
    element.sightingData = json
    expect(element.sightingData).toEqual(json)
  })

  it("recording appends a keyframe to the nested ufo element's timeline", async () => {
    // Uses real timers deliberately: RafSamplingClock drives recording via the real
    // requestAnimationFrame/performance.now (jsdom's own rAF polyfill, not a sinon-fake-timer
    // concept — see engine/record/SamplingClock.ts's IntervalSamplingClock, which is the
    // fake-timer-friendly variant already covered by test/engine/Recorder.test.ts).
    const element = mount()
    const shadow = element.shadowRoot!
    const recordButton = shadow.getElementById("record") as HTMLButtonElement
    const canvas = nestedUfo(element).shadowRoot!.getElementById("canvas") as HTMLCanvasElement
    vi.spyOn(canvas, "getBoundingClientRect").mockReturnValue({ left: 0, top: 0 } as DOMRect)

    recordButton.click()
    // jsdom has no global PointerEvent; onPointerMove only reads clientX/clientY, so a
    // plain MouseEvent dispatched as "pointermove" exercises the same handler.
    canvas.dispatchEvent(new MouseEvent("pointermove", { clientX: 50, clientY: 60 }))
    await new Promise(resolve => setTimeout(resolve, 150))
    recordButton.click()

    expect(element.sightingData.timeline.keyframes.length).toBeGreaterThan(0)
  })
})

describe("UfoRecorderElement post-hoc appearance editing + multi-shape authoring", () => {
  afterEach(() => {
    document.body.innerHTML = ""
  })

  function seekNestedUfoTo(element: UfoRecorderElement, t: number): void {
    const seekInput = nestedUfo(element)!.shadowRoot!.getElementById("seek") as HTMLInputElement
    seekInput.value = String(t)
    seekInput.dispatchEvent(new Event("input"))
  }

  it("changing color while paused at a scrubbed instant writes a keyframe there, leaving other sources at that t untouched", () => {
    const element = mount()
    element.sightingData = {
      version: 1,
      timeline: {
        keyframes: [
          {
            t: 500,
            shapes: [
              { sourceId: "ufo-1", shape: { kind: "oval", bounds: { x: 0, y: 0, width: 10, height: 10 }, color: "#39ff14", angle: 0, transparency: 0, haloScale: 1.5, selected: false } },
              { sourceId: "ufo-2", shape: { kind: "oval", bounds: { x: 50, y: 0, width: 10, height: 10 }, color: "#ff0000", angle: 0, transparency: 0, haloScale: 1.5, selected: false } }
            ]
          }
        ]
      }
    }
    seekNestedUfoTo(element, 500)

    const colorInput = element.shadowRoot!.getElementById("color") as HTMLInputElement
    colorInput.value = "#0000ff"
    colorInput.dispatchEvent(new Event("input"))

    const keyframe = element.sightingData.timeline.keyframes.find(k => k.t === 500)!
    expect(keyframe.shapes.find(s => s.sourceId === "ufo-1")?.shape.color).toBe("#0000ff")
    expect(keyframe.shapes.find(s => s.sourceId === "ufo-2")?.shape.color).toBe("#ff0000")
  })

  it("preserves an existing shape's title when editing its appearance", () => {
    const element = mount()
    element.sightingData = {
      version: 1,
      timeline: {
        keyframes: [
          { t: 0, shapes: [{ sourceId: "ufo-1", shape: { kind: "oval", bounds: { x: 0, y: 0, width: 10, height: 10 }, color: "#39ff14", angle: 0, transparency: 0, haloScale: 1.5, selected: false, title: "Witness A" } }] }
        ]
      }
    }
    const colorInput = element.shadowRoot!.getElementById("color") as HTMLInputElement
    colorInput.value = "#abcdef"
    colorInput.dispatchEvent(new Event("input"))

    expect(element.sightingData.timeline.keyframes[0].shapes[0].shape.title).toBe("Witness A")
  })

  it("does not write an appearance keyframe while recording", () => {
    const element = mount()
    const keyframesBefore = element.sightingData.timeline.keyframes.length
    const recordButton = element.shadowRoot!.getElementById("record") as HTMLButtonElement
    recordButton.click()

    const colorInput = element.shadowRoot!.getElementById("color") as HTMLInputElement
    colorInput.value = "#0000ff"
    colorInput.dispatchEvent(new Event("input"))

    expect(element.sightingData.timeline.keyframes).toHaveLength(keyframesBefore)
    recordButton.click()
  })

  it("does not write or resync appearance while the nested player is playing", () => {
    const element = mount()
    element.sightingData = {
      version: 1,
      timeline: {
        keyframes: [
          { t: 0, shapes: [{ sourceId: "ufo-1", shape: { kind: "oval", bounds: { x: 0, y: 0, width: 10, height: 10 }, color: "#39ff14", angle: 0, transparency: 0, haloScale: 1.5, selected: false } }] },
          { t: 1000, shapes: [{ sourceId: "ufo-1", shape: { kind: "oval", bounds: { x: 100, y: 0, width: 10, height: 10 }, color: "#39ff14", angle: 0, transparency: 0, haloScale: 1.5, selected: false } }] }
        ]
      }
    }
    const ufo = nestedUfo(element) as unknown as { playbackState: string }
    const playButton = nestedUfo(element)!.shadowRoot!.getElementById("play-pause") as HTMLButtonElement
    playButton.click()
    expect(ufo.playbackState).toBe("playing")

    const before = JSON.stringify(element.sightingData)
    const colorInput = element.shadowRoot!.getElementById("color") as HTMLInputElement
    colorInput.value = "#abcdef"
    colorInput.dispatchEvent(new Event("input"))

    expect(JSON.stringify(element.sightingData)).toBe(before)
  })

  it("disables the source select and add-shape button while recording", () => {
    const element = mount()
    const sourceSelect = element.shadowRoot!.getElementById("source") as HTMLSelectElement
    const addShapeButton = element.shadowRoot!.getElementById("add-shape") as HTMLButtonElement
    const recordButton = element.shadowRoot!.getElementById("record") as HTMLButtonElement

    recordButton.click()
    expect(sourceSelect.disabled).toBe(true)
    expect(addShapeButton.disabled).toBe(true)

    recordButton.click()
    expect(sourceSelect.disabled).toBe(false)
    expect(addShapeButton.disabled).toBe(false)
  })

  it("Escape stops an in-progress recording, same as clicking Stop", () => {
    const element = mount()
    const recordButton = element.shadowRoot!.getElementById("record") as HTMLButtonElement
    recordButton.click()
    expect(element.shadowRoot!.getElementById("source")!.hasAttribute("disabled")).toBe(true)

    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }))

    expect(element.shadowRoot!.getElementById("source")!.hasAttribute("disabled")).toBe(false)
  })

  it("Escape does nothing while not recording", () => {
    const element = mount()
    const recordButton = element.shadowRoot!.getElementById("record") as HTMLButtonElement

    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }))

    expect(recordButton.title).toBe("Record")
  })

  it("Add shape creates a genuinely new source instead of silently reusing the still-unused default", () => {
    const element = mount()
    const addShapeButton = element.shadowRoot!.getElementById("add-shape") as HTMLButtonElement
    addShapeButton.click()

    // "ufo-1" already exists (construction places an immediately selectable initial keyframe —
    // see the "au démarrage" fix) — Add shape must create an ADDITIONAL "ufo-2", not collide
    // with or replace it.
    const sourceIds = element.sightingData.timeline.keyframes.flatMap(k => k.shapes.map(s => s.sourceId))
    expect(sourceIds).toEqual(["ufo-1", "ufo-2"])
  })

  it("loading sightingData with different source ids resets the editing target instead of using the stale default", () => {
    const element = mount()
    element.sightingData = {
      version: 1,
      timeline: {
        keyframes: [
          { t: 0, shapes: [{ sourceId: "witness-a", shape: { kind: "oval", bounds: { x: 5, y: 5, width: 10, height: 10 }, color: "#123456", angle: 0, transparency: 0, haloScale: 1, selected: false } }] }
        ]
      }
    }
    const sourceSelect = element.shadowRoot!.getElementById("source") as HTMLSelectElement
    expect(sourceSelect.value).toBe("witness-a")

    const colorInput = element.shadowRoot!.getElementById("color") as HTMLInputElement
    colorInput.value = "#abcdef"
    colorInput.dispatchEvent(new Event("input"))

    const sourceIds = element.sightingData.timeline.keyframes.flatMap(k => k.shapes.map(s => s.sourceId))
    expect(sourceIds).toEqual(["witness-a"])
    expect(element.sightingData.timeline.keyframes[0].shapes[0].shape.color).toBe("#abcdef")
  })

  it("selecting a different source syncs the toolbar from that source's shape at the current playhead", () => {
    const element = mount()
    element.sightingData = {
      version: 1,
      timeline: {
        keyframes: [
          {
            t: 0,
            shapes: [
              { sourceId: "ufo-1", shape: { kind: "oval", bounds: { x: 0, y: 0, width: 10, height: 10 }, color: "#39ff14", angle: 0, transparency: 0, haloScale: 1.5, selected: false } },
              {
                sourceId: "ufo-2",
                shape: {
                  kind: "polygon",
                  bounds: { x: 20, y: 0, width: 10, height: 10 },
                  points: [{ x: 0, y: 0 }, { x: 10, y: 5 }, { x: 0, y: 10 }],
                  color: "#ff8800",
                  angle: 0,
                  transparency: 0.5,
                  haloScale: 2,
                  selected: false
                }
              }
            ]
          }
        ]
      }
    }
    const sourceSelect = element.shadowRoot!.getElementById("source") as HTMLSelectElement
    sourceSelect.value = "ufo-2"
    sourceSelect.dispatchEvent(new Event("change"))

    expect(element.appearance).toEqual({ presetId: "triangle", color: "#ff8800", transparency: 0.5, haloScale: 2 })
  })
})

describe("UfoRecorderElement click-to-select", () => {
  afterEach(() => {
    document.body.innerHTML = ""
  })

  function nestedCanvas(element: UfoRecorderElement): HTMLCanvasElement {
    const canvas = nestedUfo(element)!.shadowRoot!.getElementById("canvas") as HTMLCanvasElement
    // 1:1 scale (matches the canvas's own 640x360 drawing buffer) so click coordinates map
    // directly onto Shape.bounds without needing to account for scaling in the test itself.
    vi.spyOn(canvas, "getBoundingClientRect").mockReturnValue({ left: 0, top: 0, width: 640, height: 360 } as DOMRect)
    return canvas
  }

  // jsdom has no global PointerEvent — a plain MouseEvent dispatched as "pointerdown"/
  // "pointerup" exercises the same handlers, which only read clientX/clientY.
  function clickAt(canvas: HTMLCanvasElement, x: number, y: number): void {
    canvas.dispatchEvent(new MouseEvent("pointerdown", { clientX: x, clientY: y }))
    document.dispatchEvent(new MouseEvent("pointerup", { clientX: x, clientY: y }))
  }

  function twoShapesJson() {
    return {
      version: 1 as const,
      timeline: {
        keyframes: [
          {
            t: 0,
            shapes: [
              { sourceId: "ufo-1", shape: { kind: "oval" as const, bounds: { x: 0, y: 0, width: 20, height: 20 }, color: "#39ff14", angle: 0, transparency: 0, haloScale: 0, selected: false } },
              { sourceId: "ufo-2", shape: { kind: "oval" as const, bounds: { x: 100, y: 100, width: 20, height: 20 }, color: "#ff0000", angle: 0, transparency: 0, haloScale: 0, selected: false } }
            ]
          }
        ]
      }
    }
  }

  it("the default shape shown at construction (before any recording/loading) is immediately selectable", () => {
    const element = mount()
    const canvas = nestedCanvas(element)
    // Centered default bounds: canvas 640x360, DEFAULT_SHAPE_SIZE 48x28 (see defaultBounds()).
    const centerX = 640 / 2
    const centerY = 360 / 2

    clickAt(canvas, centerX, centerY)

    const ufo = nestedUfo(element) as unknown as { selectedSourceId: string }
    expect(ufo.selectedSourceId).toBe("ufo-1")
  })

  it("clicking inside a shape's bounds selects it: updates the dropdown and the nested ufo's highlight", () => {
    const element = mount()
    element.sightingData = twoShapesJson()
    const canvas = nestedCanvas(element)

    clickAt(canvas, 105, 105) // inside ufo-2's bounds, outside ufo-1's

    const sourceSelect = element.shadowRoot!.getElementById("source") as HTMLSelectElement
    expect(sourceSelect.value).toBe("ufo-2")
    const ufo = nestedUfo(element) as unknown as { selectedSourceId: string }
    expect(ufo.selectedSourceId).toBe("ufo-2")
  })

  it("clicking empty canvas is a no-op — keeps the previous selection", () => {
    const element = mount()
    element.sightingData = twoShapesJson()
    const canvas = nestedCanvas(element)
    clickAt(canvas, 105, 105) // select ufo-2 first

    clickAt(canvas, 300, 300) // empty space

    const sourceSelect = element.shadowRoot!.getElementById("source") as HTMLSelectElement
    expect(sourceSelect.value).toBe("ufo-2")
  })

  it("clicking while recording is a no-op", () => {
    const element = mount()
    element.sightingData = twoShapesJson()
    const canvas = nestedCanvas(element)
    const recordButton = element.shadowRoot!.getElementById("record") as HTMLButtonElement
    recordButton.click()

    clickAt(canvas, 105, 105)

    const sourceSelect = element.shadowRoot!.getElementById("source") as HTMLSelectElement
    expect(sourceSelect.value).toBe("ufo-1")
    recordButton.click()
  })

  it("clicking where two shapes overlap selects the topmost (later-added) one", () => {
    const element = mount()
    element.sightingData = {
      version: 1,
      timeline: {
        keyframes: [
          {
            t: 0,
            shapes: [
              { sourceId: "ufo-1", shape: { kind: "oval", bounds: { x: 0, y: 0, width: 20, height: 20 }, color: "#39ff14", angle: 0, transparency: 0, haloScale: 0, selected: false } },
              { sourceId: "ufo-2", shape: { kind: "oval", bounds: { x: 5, y: 5, width: 20, height: 20 }, color: "#ff0000", angle: 0, transparency: 0, haloScale: 0, selected: false } }
            ]
          }
        ]
      }
    }
    const canvas = nestedCanvas(element)

    clickAt(canvas, 10, 10) // inside both bounds

    const sourceSelect = element.shadowRoot!.getElementById("source") as HTMLSelectElement
    expect(sourceSelect.value).toBe("ufo-2")
  })

  it("selecting via the dropdown also propagates to the nested ufo's highlight", () => {
    const element = mount()
    element.sightingData = twoShapesJson()
    const sourceSelect = element.shadowRoot!.getElementById("source") as HTMLSelectElement
    sourceSelect.value = "ufo-2"
    sourceSelect.dispatchEvent(new Event("change"))

    const ufo = nestedUfo(element) as unknown as { selectedSourceId: string }
    expect(ufo.selectedSourceId).toBe("ufo-2")
  })

  it("addShape also propagates the new shape's selection to the nested ufo's highlight", () => {
    const element = mount()
    const addShapeButton = element.shadowRoot!.getElementById("add-shape") as HTMLButtonElement
    addShapeButton.click()

    const ufo = nestedUfo(element) as unknown as { selectedSourceId: string }
    expect(ufo.selectedSourceId).toBe("ufo-2")
  })
})

describe("UfoRecorderElement drag-to-move/resize/rotate", () => {
  afterEach(() => {
    document.body.innerHTML = ""
  })

  function nestedCanvas(element: UfoRecorderElement): HTMLCanvasElement {
    const canvas = nestedUfo(element)!.shadowRoot!.getElementById("canvas") as HTMLCanvasElement
    vi.spyOn(canvas, "getBoundingClientRect").mockReturnValue({ left: 0, top: 0, width: 640, height: 360 } as DOMRect)
    return canvas
  }

  // jsdom has no global PointerEvent — plain MouseEvents dispatched as "pointerdown"/
  // "pointermove"/"pointerup" exercise the same handlers, which only read clientX/clientY.
  // pointermove/pointerup are dispatched on `document` (not the canvas), matching how the
  // real drag listeners are wired, so this also proves the drag ends correctly even when the
  // pointer isn't over the canvas at release.
  function clickAt(canvas: HTMLCanvasElement, x: number, y: number): void {
    canvas.dispatchEvent(new MouseEvent("pointerdown", { clientX: x, clientY: y }))
    document.dispatchEvent(new MouseEvent("pointerup", { clientX: x, clientY: y }))
  }

  function dragFromTo(canvas: HTMLCanvasElement, from: { x: number; y: number }, to: { x: number; y: number }): void {
    canvas.dispatchEvent(new MouseEvent("pointerdown", { clientX: from.x, clientY: from.y }))
    document.dispatchEvent(new MouseEvent("pointermove", { clientX: to.x, clientY: to.y }))
    document.dispatchEvent(new MouseEvent("pointerup", { clientX: to.x, clientY: to.y }))
  }

  function oneShapeJson(overrides: Partial<{ angle: number; transparency: number; haloScale: number }> = {}) {
    return {
      version: 1 as const,
      timeline: {
        keyframes: [
          {
            t: 0,
            shapes: [
              {
                sourceId: "ufo-1",
                shape: {
                  kind: "oval" as const,
                  bounds: { x: 100, y: 100, width: 20, height: 20 },
                  color: "#39ff14",
                  angle: 0,
                  transparency: 0,
                  haloScale: 0,
                  selected: false,
                  ...overrides
                }
              }
            ]
          }
        ]
      }
    }
  }

  it("dragging the shape's body moves it, appearance unchanged", () => {
    const element = mount()
    element.sightingData = oneShapeJson({ transparency: 0.2, haloScale: 1 })
    const canvas = nestedCanvas(element)

    dragFromTo(canvas, { x: 110, y: 110 }, { x: 150, y: 130 }) // pointerdown inside the body

    const shape = element.sightingData.timeline.keyframes[0].shapes[0].shape
    // toBeCloseTo, not toEqual: the CSS-px -> 640x360-buffer conversion (rect.height=360 not
    // a power of 2) introduces sub-pixel float rounding, not a logic bug.
    expect(shape.bounds.x).toBeCloseTo(140)
    expect(shape.bounds.y).toBeCloseTo(120)
    expect(shape.bounds.width).toBe(20)
    expect(shape.bounds.height).toBe(20)
    expect(shape.color).toBe("#39ff14")
    expect(shape.transparency).toBe(0.2)
    expect(shape.haloScale).toBe(1)
  })

  it("dragging the 'e' resize handle changes only bounds, not appearance", () => {
    const element = mount()
    element.sightingData = oneShapeJson()
    const canvas = nestedCanvas(element)

    dragFromTo(canvas, { x: 120, y: 110 }, { x: 150, y: 110 }) // "e" handle at (x+width, y+height/2)

    const shape = element.sightingData.timeline.keyframes[0].shapes[0].shape
    expect(shape.bounds).toEqual({ x: 100, y: 100, width: 50, height: 20 })
    expect(shape.color).toBe("#39ff14")
  })

  it("dragging the rotate handle changes only angle", () => {
    const element = mount()
    element.sightingData = oneShapeJson()
    const canvas = nestedCanvas(element)

    dragFromTo(canvas, { x: 110, y: 76 }, { x: 150, y: 100 }) // rotate handle at (x+width/2, y-24)

    const shape = element.sightingData.timeline.keyframes[0].shapes[0].shape
    expect(shape.angle).not.toBe(0)
    expect(shape.bounds).toEqual({ x: 100, y: 100, width: 20, height: 20 })
    expect(shape.color).toBe("#39ff14")
  })

  it("a plain click (pointerdown+pointerup, no movement) selects but writes nothing", () => {
    const element = mount()
    element.sightingData = oneShapeJson()
    const canvas = nestedCanvas(element)

    clickAt(canvas, 110, 110) // shape center — inside the body, not near any handle

    expect(element.sightingData.timeline.keyframes).toHaveLength(1)
    expect(element.sightingData.timeline.keyframes[0].shapes[0].shape.bounds).toEqual({
      x: 100,
      y: 100,
      width: 20,
      height: 20
    })
  })

  it("dragging while recording is a no-op", () => {
    const element = mount()
    element.sightingData = oneShapeJson()
    const canvas = nestedCanvas(element)
    const recordButton = element.shadowRoot!.getElementById("record") as HTMLButtonElement
    recordButton.click()

    dragFromTo(canvas, { x: 110, y: 110 }, { x: 200, y: 200 })

    recordButton.click()
    expect(element.sightingData.timeline.keyframes[0].shapes[0].shape.bounds).toEqual({
      x: 100,
      y: 100,
      width: 20,
      height: 20
    })
  })

  it("dragging while playing is a no-op", () => {
    const element = mount()
    element.sightingData = oneShapeJson()
    const canvas = nestedCanvas(element)
    // Play is disabled for a genuinely zero-duration recording (see UfoElement's own "disables
    // Play..." test) — oneShapeJson() has just the one keyframe, so a real duration has to be
    // declared for the click below to actually start playback at all.
    const ufo = nestedUfo(element) as unknown as { durationSeconds: number }
    ufo.durationSeconds = 5
    const playButton = nestedUfo(element)!.shadowRoot!.getElementById("play-pause") as HTMLButtonElement
    playButton.click()

    dragFromTo(canvas, { x: 110, y: 110 }, { x: 300, y: 300 })

    expect(element.sightingData.timeline.keyframes[0].shapes[0].shape.bounds).toEqual({
      x: 100,
      y: 100,
      width: 20,
      height: 20
    })
  })

  it("loading new sightingData mid-drag cancels the drag instead of writing into the new timeline", () => {
    const element = mount()
    element.sightingData = oneShapeJson()
    const canvas = nestedCanvas(element)
    canvas.dispatchEvent(new MouseEvent("pointerdown", { clientX: 110, clientY: 110 })) // begin a move-drag

    element.sightingData = {
      version: 1,
      timeline: {
        keyframes: [
          { t: 0, shapes: [{ sourceId: "other", shape: { kind: "oval", bounds: { x: 5, y: 5, width: 10, height: 10 }, color: "#000", angle: 0, transparency: 0, haloScale: 0, selected: false } }] }
        ]
      }
    }

    document.dispatchEvent(new MouseEvent("pointermove", { clientX: 300, clientY: 300 }))
    document.dispatchEvent(new MouseEvent("pointerup", { clientX: 300, clientY: 300 }))

    expect(element.sightingData.timeline.keyframes[0].shapes[0].shape.bounds).toEqual({ x: 5, y: 5, width: 10, height: 10 })
  })

  it("starting a recording mid-drag cancels the drag instead of writing into the shape being recorded", () => {
    const element = mount()
    element.sightingData = oneShapeJson()
    const canvas = nestedCanvas(element)
    canvas.dispatchEvent(new MouseEvent("pointerdown", { clientX: 110, clientY: 110 })) // begin a move-drag

    const recordButton = element.shadowRoot!.getElementById("record") as HTMLButtonElement
    recordButton.click() // starts recording — should cancel the drag

    document.dispatchEvent(new MouseEvent("pointermove", { clientX: 300, clientY: 300 }))
    document.dispatchEvent(new MouseEvent("pointerup", { clientX: 300, clientY: 300 }))

    recordButton.click() // stop
    expect(element.sightingData.timeline.keyframes[0].shapes[0].shape.bounds).toEqual({
      x: 100,
      y: 100,
      width: 20,
      height: 20
    })
  })

  it("dragging empty canvas (the 'landscape') sets heading/pitch instead of moving a shape", () => {
    const element = mount()
    element.sightingData = oneShapeJson() // shape sits at (100,100)-(120,120) — well away from the drag below
    const canvas = nestedCanvas(element)

    dragFromTo(canvas, { x: 300, y: 300 }, { x: 400, y: 250 }) // dx=+100 (right), dy=-50 (up)

    expect(element.sightingData.observerTrack?.keyframes).toEqual([{ t: 0, pose: { lat: undefined, lng: undefined, elevationM: 0, headingDeg: 20, pitchDeg: 10, fovDeg: 60 } }])
    // The shape itself must be untouched — this was a landscape drag, not a shape drag.
    expect(element.sightingData.timeline.keyframes[0].shapes[0].shape.bounds).toEqual({ x: 100, y: 100, width: 20, height: 20 })
  })

  it("a landscape drag wraps heading past 360 back to 0, same as typing it", () => {
    const element = mount()
    element.sightingData = {
      version: 1,
      observerTrack: { keyframes: [{ t: 0, pose: { lat: undefined, lng: undefined, elevationM: 0, headingDeg: 350, pitchDeg: 0, fovDeg: 60 } }] },
      timeline: { keyframes: [] }
    }
    const canvas = nestedCanvas(element)

    dragFromTo(canvas, { x: 300, y: 300 }, { x: 400, y: 300 }) // +100px right = +20deg: 350 -> 370 -> wraps to 10

    expect(element.sightingData.observerTrack?.keyframes[0].pose.headingDeg).toBe(10)
  })

  it("a landscape drag clamps pitch to [-90, 90]", () => {
    const element = mount()
    const canvas = nestedCanvas(element)

    dragFromTo(canvas, { x: 300, y: 300 }, { x: 300, y: -300 }) // dy=-600 (far up) = +120deg, clamped to 90

    expect(element.sightingData.observerTrack?.keyframes[0].pose.pitchDeg).toBe(90)
  })

  it("does not start a landscape drag while playing", () => {
    const element = mount()
    element.sightingData = {
      version: 1,
      observerTrack: { keyframes: [{ t: 0, pose: { lat: undefined, lng: undefined, elevationM: 0, headingDeg: 0, pitchDeg: 0, fovDeg: 60 } }] },
      timeline: {
        keyframes: [
          { t: 0, shapes: [{ sourceId: "ufo-1", shape: { kind: "oval", bounds: { x: 0, y: 0, width: 10, height: 10 }, color: "#39ff14", angle: 0, transparency: 0, haloScale: 1.5, selected: false } }] },
          { t: 1000, shapes: [{ sourceId: "ufo-1", shape: { kind: "oval", bounds: { x: 100, y: 0, width: 10, height: 10 }, color: "#39ff14", angle: 0, transparency: 0, haloScale: 1.5, selected: false } }] }
        ]
      }
    }
    const ufo = nestedUfo(element) as unknown as { playbackState: string }
    const playButton = nestedUfo(element)!.shadowRoot!.getElementById("play-pause") as HTMLButtonElement
    playButton.click()
    expect(ufo.playbackState).toBe("playing")

    const canvas = nestedCanvas(element)
    dragFromTo(canvas, { x: 300, y: 300 }, { x: 400, y: 250 })

    expect(element.sightingData.observerTrack?.keyframes[0].pose.headingDeg).toBe(0)
  })
})

describe("UfoRecorderElement arrow-key move/resize", () => {
  afterEach(() => {
    document.body.innerHTML = ""
  })

  function oneShapeJson() {
    return {
      version: 1 as const,
      timeline: {
        keyframes: [
          {
            t: 0,
            shapes: [
              { sourceId: "ufo-1", shape: { kind: "oval" as const, bounds: { x: 100, y: 100, width: 20, height: 20 }, color: "#39ff14", angle: 0, transparency: 0, haloScale: 1.5, selected: false } }
            ]
          }
        ]
      }
    }
  }

  function pressKey(key: string, options: { shiftKey?: boolean; target?: EventTarget } = {}): void {
    document.dispatchEvent(new KeyboardEvent("keydown", { key, shiftKey: options.shiftKey ?? false, bubbles: true, composed: true }))
  }

  it("arrow keys move the selected shape by a fixed step", () => {
    const element = mount()
    element.sightingData = oneShapeJson()
    pressKey("ArrowRight")
    pressKey("ArrowDown")

    expect(element.sightingData.timeline.keyframes[0].shapes[0].shape.bounds).toEqual({ x: 104, y: 104, width: 20, height: 20 })
  })

  it("Shift+arrow resizes the selected shape instead, growing/shrinking around its center", () => {
    const element = mount()
    element.sightingData = oneShapeJson()
    pressKey("ArrowRight", { shiftKey: true }) // widen
    pressKey("ArrowUp", { shiftKey: true }) // shrink height

    expect(element.sightingData.timeline.keyframes[0].shapes[0].shape.bounds).toEqual({ x: 98, y: 102, width: 24, height: 16 })
  })

  it("Shift+arrow never shrinks a shape below MIN_SHAPE_SIZE", () => {
    const element = mount()
    element.sightingData = {
      version: 1,
      timeline: {
        keyframes: [{ t: 0, shapes: [{ sourceId: "ufo-1", shape: { kind: "oval", bounds: { x: 100, y: 100, width: 10, height: 10 }, color: "#39ff14", angle: 0, transparency: 0, haloScale: 1.5, selected: false } }] }]
      }
    }
    pressKey("ArrowLeft", { shiftKey: true })
    pressKey("ArrowUp", { shiftKey: true })

    expect(element.sightingData.timeline.keyframes[0].shapes[0].shape.bounds.width).toBe(8)
    expect(element.sightingData.timeline.keyframes[0].shapes[0].shape.bounds.height).toBe(8)
  })

  it("does not move the shape when an arrow key originates from a text input (e.g. editing lat/lng)", () => {
    const element = mount()
    element.sightingData = oneShapeJson()
    const latInput = element.shadowRoot!.getElementById("lat") as HTMLInputElement
    latInput.focus()
    latInput.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true, composed: true }))

    expect(element.sightingData.timeline.keyframes[0].shapes[0].shape.bounds).toEqual({ x: 100, y: 100, width: 20, height: 20 })
  })

  it("does nothing while recording or playing", () => {
    const element = mount()
    element.sightingData = oneShapeJson()

    const recordButton = element.shadowRoot!.getElementById("record") as HTMLButtonElement
    recordButton.click()
    pressKey("ArrowRight")
    recordButton.click()

    expect(element.sightingData.timeline.keyframes[0].shapes[0].shape.bounds).toEqual({ x: 100, y: 100, width: 20, height: 20 })
  })
})

describe("UfoRecorderElement duration input", () => {
  afterEach(() => {
    document.body.innerHTML = ""
  })

  it("defaults to empty (no known real duration)", () => {
    const element = mount()
    const durationInput = element.shadowRoot!.getElementById("durationSeconds") as HTMLInputElement
    expect(durationInput.value).toBe("")
  })

  it("typing a value sets the nested ufo's durationSeconds", () => {
    const element = mount()
    const durationInput = element.shadowRoot!.getElementById("durationSeconds") as HTMLInputElement

    durationInput.value = "45.5"
    durationInput.dispatchEvent(new Event("input"))

    expect(element.sightingData.durationSeconds).toBe(45.5)
  })

  it("clearing the input clears durationSeconds", () => {
    const element = mount()
    const durationInput = element.shadowRoot!.getElementById("durationSeconds") as HTMLInputElement
    durationInput.value = "45"
    durationInput.dispatchEvent(new Event("input"))

    durationInput.value = ""
    durationInput.dispatchEvent(new Event("input"))

    expect(element.sightingData.durationSeconds).toBeUndefined()
  })

  it("loading sightingData with a known durationSeconds pre-fills the input", () => {
    const element = mount()
    element.sightingData = {
      version: 1,
      durationSeconds: 120,
      timeline: { keyframes: [{ t: 0, shapes: [] }] }
    }

    const durationInput = element.shadowRoot!.getElementById("durationSeconds") as HTMLInputElement
    expect(durationInput.value).toBe("120")
  })

  it("loading sightingData with no durationSeconds resets the input to empty", () => {
    const element = mount()
    const durationInput = element.shadowRoot!.getElementById("durationSeconds") as HTMLInputElement
    durationInput.value = "45"
    durationInput.dispatchEvent(new Event("input"))

    element.sightingData = { version: 1, timeline: { keyframes: [{ t: 0, shapes: [] }] } }

    expect(durationInput.value).toBe("")
  })
})

describe("UfoRecorderElement export button", () => {
  afterEach(() => {
    document.body.innerHTML = ""
    vi.unstubAllGlobals()
  })

  it("downloads the current sightingData as a JSON file, named from the witness reference", () => {
    const element = mount()
    element.sightingData = {
      version: 1,
      witnessId: "chiles",
      timeline: { keyframes: [{ t: 0, shapes: [] }] }
    }

    // jsdom's own Blob doesn't implement .text() — capture the constructor's parts directly
    // instead of reading it back, so the test doesn't depend on that.
    class FakeBlob {
      constructor(
        public parts: BlobPart[],
        public options?: { type?: string }
      ) {}
    }
    vi.stubGlobal("Blob", FakeBlob)
    const createObjectURL = vi.fn().mockReturnValue("blob:fake-url")
    const revokeObjectURL = vi.fn()
    vi.stubGlobal("URL", { ...URL, createObjectURL, revokeObjectURL })
    let downloadedName: string | undefined
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (this: HTMLAnchorElement) {
      downloadedName = this.download
    })

    const exportButton = element.shadowRoot!.getElementById("export") as HTMLButtonElement
    exportButton.click()

    expect(createObjectURL).toHaveBeenCalledTimes(1)
    const blob = createObjectURL.mock.calls[0][0] as FakeBlob
    expect(blob.options?.type).toBe("application/json")
    expect(JSON.parse(blob.parts[0] as string)).toEqual(element.sightingData)
    expect(downloadedName).toBe("chiles-sighting.json")
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:fake-url")

    clickSpy.mockRestore()
  })

  it("falls back to a generic file name when there's no witnessId", () => {
    const element = mount()
    vi.stubGlobal("URL", { ...URL, createObjectURL: vi.fn().mockReturnValue("blob:fake-url"), revokeObjectURL: vi.fn() })
    let downloadedName: string | undefined
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (this: HTMLAnchorElement) {
      downloadedName = this.download
    })

    const exportButton = element.shadowRoot!.getElementById("export") as HTMLButtonElement
    exportButton.click()

    expect(downloadedName).toBe("sighting-sighting.json")
    clickSpy.mockRestore()
  })
})

describe("UfoRecorderElement i18n", () => {
  afterEach(() => {
    document.body.innerHTML = ""
  })

  it("loads French labels when navigator.languages prefers fr, with no language picker", async () => {
    const spy = vi.spyOn(navigator, "languages", "get").mockReturnValue(["fr-FR", "fr"])
    const element = mount()
    const addShapeButton = element.shadowRoot!.getElementById("add-shape") as HTMLButtonElement
    // The dynamic import() of the fr messages module resolves over more than one tick under
    // Vitest's transform pipeline — poll rather than assume a single setTimeout(0) is enough.
    await waitFor(() => addShapeButton.textContent === "Ajouter une forme")

    expect(element.shadowRoot!.getElementById("label-color")!.textContent).toBe("Couleur")
    expect(element.shadowRoot!.getElementById("label-duration")!.textContent).toBe("Durée (s)")
    expect(element.shadowRoot!.getElementById("export")!.textContent).toBe("Exporter le JSON")
    expect(element.shadowRoot!.getElementById("preset-oval")!.textContent).toBe("Ovale")
    const durationInput = element.shadowRoot!.getElementById("durationSeconds") as HTMLInputElement
    expect(durationInput.placeholder).toBe("durée de l'enregistrement")
    const recordButton = element.shadowRoot!.getElementById("record") as HTMLButtonElement
    expect(recordButton.title).toBe("Enregistrer")

    spy.mockRestore()
  })

  it("falls back to the English defaults when navigator.languages has no supported match", async () => {
    const spy = vi.spyOn(navigator, "languages", "get").mockReturnValue(["de-DE", "de"])
    const element = mount()
    await new Promise(resolve => setTimeout(resolve, 20)) // no fr/en module load is triggered; just let any microtasks settle

    expect(element.shadowRoot!.getElementById("add-shape")!.textContent).toBe("Add shape")
    spy.mockRestore()
  })
})
