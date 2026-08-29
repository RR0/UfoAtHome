import { describe, expect, it, afterEach, beforeAll, vi } from "vitest"
import { register, ELEMENT_NAME } from "../../src/component/UfoRecorderElement.js"
import type { UfoRecorderElement } from "../../src/component/UfoRecorderElement.js"
import type { PolygonShape, Shape } from "../../src/engine/shape/Shape.js"
import { ShapeHandles } from "../../src/engine/shape/ShapeHandles.js"
import { ApparentSize } from "../../src/engine/shape/ApparentSize.js"
import { ImageProjection } from "../../src/engine/instrument/ImageProjection.js"
import type { WeatherProvider } from "../../src/engine/weather/WeatherProvider.js"
import type { Weather } from "../../src/engine/model/Weather.js"
import { SOUND_KINDS } from "../../src/engine/model/Sound.js"
import type { PlaceMatch, PlaceProvider } from "../../src/engine/place/PlaceProvider.js"

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
    setTerrainProviders(): void {}
    get currentTerrainAttribution(): undefined {
      return undefined
    }
    setAstronomy(): void {}
    setShowCompass(): void {}
    setCompassHovered(): void {}
    setCompassForced(): void {}
    setIndoorLook(): void {}
    setWeather(): void {}
    setDecor(): void {}
    updateDecorAnchoring(): void {}
    updateDecorLitState(): void {}
    pickBodyAt(): undefined {
      return undefined
    }
    pickDecorAt(): undefined {
      return undefined
    }
    isScreenPointOccluded(): boolean {
      return false
    }
    decorDistancesAt(): { behindM?: number; inFrontM?: number } {
      return {}
    }
    setProjection(): void {}
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
    stopTwinkle(): void {}
    setAnimationsRunning(): void {}
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

/** Weather is looked up from a real meteorological record as soon as a recording states a date and
 * a place (see UfoRecorderElement.inferWeather), so every editor mounted here gets a provider that
 * answers "no record" — the suite must never reach the network, and the weather tests below
 * substitute their own answers. */
const NO_RECORD_PROVIDER: WeatherProvider = { getWeather: () => Promise.resolve(undefined) }

function mount(weatherProvider: WeatherProvider = NO_RECORD_PROVIDER): UfoRecorderElement {
  const element = document.createElement(ELEMENT_NAME) as UfoRecorderElement
  element.weatherProvider = weatherProvider
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
    const polygonButton = element.shadowRoot!.getElementById("preset-polygon") as HTMLButtonElement
    polygonButton.click()

    expect(element.appearance.presetId).toBe("polygon")
    expect(polygonButton.getAttribute("aria-pressed")).toBe("true")
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

  it("changing color/transparency/halo preserves a custom-edited polygon's own points — the real bug this fixes: appearance edits used to always rebuild geometry from the preset's default shape, silently discarding vertex edits", () => {
    const element = mount()
    const shadow = element.shadowRoot!
    ;(shadow.getElementById("preset-polygon") as HTMLButtonElement).click()

    // Reshape it: drag a vertex handle to a custom position (see the "polygon vertex editing"
    // describe block for the same drag mechanics, reused inline here since this test cares about
    // what happens to the RESULT after that edit, not the drag itself).
    const canvas = nestedUfo(element)!.shadowRoot!.getElementById("canvas") as HTMLCanvasElement
    vi.spyOn(canvas, "getBoundingClientRect").mockReturnValue({ left: 0, top: 0, width: 640, height: 360 } as DOMRect)
    const shapeBefore = element.sightingData.timeline.keyframes[0].shapes[0].shape as { bounds: { x: number; y: number } }
    canvas.dispatchEvent(new MouseEvent("pointerdown", { clientX: shapeBefore.bounds.x, clientY: shapeBefore.bounds.y }))
    document.dispatchEvent(new MouseEvent("pointermove", { clientX: shapeBefore.bounds.x - 15, clientY: shapeBefore.bounds.y - 10 }))
    document.dispatchEvent(new MouseEvent("pointerup", { clientX: shapeBefore.bounds.x - 15, clientY: shapeBefore.bounds.y - 10 }))
    const reshaped = element.sightingData.timeline.keyframes[0].shapes[0].shape as { points: unknown; bounds: unknown }
    expect(reshaped.points).not.toEqual([
      { x: 0, y: 0 },
      { x: 48, y: 0 },
      { x: 48, y: 28 },
      { x: 0, y: 28 }
    ]) // sanity check the drag actually reshaped it before testing the color-edit path

    const colorInput = shadow.getElementById("color") as HTMLInputElement
    colorInput.value = "#ff8800"
    colorInput.dispatchEvent(new Event("input"))

    const afterColorChange = element.sightingData.timeline.keyframes[0].shapes[0].shape as { kind: string; points: unknown; bounds: unknown; color: string }
    expect(afterColorChange.color).toBe("#ff8800")
    expect(afterColorChange.kind).toBe("polygon")
    expect(afterColorChange.points).toEqual(reshaped.points)
    expect(afterColorChange.bounds).toEqual(reshaped.bounds)
  })

  it("clicking a preset button still rebuilds geometry as before (only appearance-only edits preserve it)", () => {
    const element = mount() // default oval
    const shadow = element.shadowRoot!
    ;(shadow.getElementById("preset-polygon") as HTMLButtonElement).click()

    const shape = element.sightingData.timeline.keyframes[0].shapes[0].shape as { kind: string; points?: unknown[] }
    expect(shape.kind).toBe("polygon")
    expect(shape.points).toHaveLength(4)
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

  it("writes lat/lng/heading into both place and a t=0 witnessTrack keyframe", () => {
    const element = mount()
    const shadow = element.shadowRoot!
    setInput(shadow, "lat", "43.837")
    setInput(shadow, "lng", "5.993")
    setInput(shadow, "heading", "270")

    expect(element.sightingData.place).toEqual([{ lat: 43.837, lng: 5.993 }])
    expect(element.sightingData.witnessTrack?.keyframes).toEqual([
      { t: 0, pose: { lat: 43.837, lng: 5.993, elevationM: 0, headingDeg: 270, pitchDeg: 0, fovDeg: 60 } }
    ])
  })

  it("leaves heading undefined (not defaulted to north) when left blank", () => {
    const element = mount()
    const shadow = element.shadowRoot!
    setInput(shadow, "lat", "43.837")
    setInput(shadow, "lng", "5.993")

    expect(element.sightingData.witnessTrack?.keyframes[0].pose.headingDeg).toBeUndefined()
  })

  it("clearing every field removes both place and the witnessTrack keyframe", () => {
    const element = mount()
    const shadow = element.shadowRoot!
    setInput(shadow, "lat", "43.837")
    setInput(shadow, "lng", "5.993")
    setInput(shadow, "lat", "")
    setInput(shadow, "lng", "")

    expect(element.sightingData.place).toBeUndefined()
    expect(element.sightingData.witnessTrack?.keyframes).toEqual([])
  })

  it("clearing only lat drops place (needs both) but keeps a partial witnessTrack pose (lng alone is still meaningful)", () => {
    const element = mount()
    const shadow = element.shadowRoot!
    setInput(shadow, "lat", "43.837")
    setInput(shadow, "lng", "5.993")
    setInput(shadow, "lat", "")

    expect(element.sightingData.place).toBeUndefined()
    expect(element.sightingData.witnessTrack?.keyframes).toEqual([
      { t: 0, pose: { lat: undefined, lng: 5.993, elevationM: 0, headingDeg: undefined, pitchDeg: 0, fovDeg: 60 } }
    ])
  })

  it("setting only heading (no lat/lng at all) still writes an witnessTrack keyframe, not silently discarded", () => {
    const element = mount()
    const shadow = element.shadowRoot!
    setInput(shadow, "heading", "270")

    expect(element.sightingData.place).toBeUndefined()
    expect(element.sightingData.witnessTrack?.keyframes).toEqual([
      { t: 0, pose: { lat: undefined, lng: undefined, elevationM: 0, headingDeg: 270, pitchDeg: 0, fovDeg: 60 } }
    ])
  })

  it("writes the observation-start EDTF text field into event.time", () => {
    const element = mount()
    const shadow = element.shadowRoot!
    setInput(shadow, "obs-time", "1965-07-01T05:00")

    expect(element.sightingData.time).toEqual({
      year: 1965,
      month: 7,
      day: 1,
      hour: 5,
      minute: 0,
      second: undefined,
      raw: "1965-07-01T05:00"
    })
  })

  it("clears event.time entirely once the observation-start field is emptied", () => {
    const element = mount()
    const shadow = element.shadowRoot!
    setInput(shadow, "obs-time", "1965")
    setInput(shadow, "obs-time", "")

    expect(element.sightingData.time).toBeUndefined()
  })

  it("does not mark the observation-start field invalid while still typing garbage", () => {
    const element = mount()
    const shadow = element.shadowRoot!
    setInput(shadow, "obs-time", "1965-07-01T05:00")
    setInput(shadow, "obs-time", "not a date")

    const input = shadow.getElementById("obs-time") as HTMLInputElement
    expect(input.classList.contains("invalid")).toBe(false)
    expect(element.sightingData.time).toEqual({
      year: 1965,
      month: 7,
      day: 1,
      hour: 5,
      minute: 0,
      second: undefined,
      raw: "1965-07-01T05:00"
    })
  })

  it("marks the observation-start field invalid only on blur, leaving event.time unchanged", () => {
    const element = mount()
    const shadow = element.shadowRoot!
    setInput(shadow, "obs-time", "1965-07-01T05:00")
    setInput(shadow, "obs-time", "not a date")

    const input = shadow.getElementById("obs-time") as HTMLInputElement
    input.dispatchEvent(new Event("blur"))

    expect(input.classList.contains("invalid")).toBe(true)
    expect(input.validationMessage).not.toBe("")
    expect(element.sightingData.time).toEqual({
      year: 1965,
      month: 7,
      day: 1,
      hour: 5,
      minute: 0,
      second: undefined,
      raw: "1965-07-01T05:00"
    })
  })

  it("clears the invalid flag on blur once the text is fixed to something valid", () => {
    const element = mount()
    const shadow = element.shadowRoot!
    const input = shadow.getElementById("obs-time") as HTMLInputElement
    setInput(shadow, "obs-time", "not a date")
    input.dispatchEvent(new Event("blur"))
    expect(input.classList.contains("invalid")).toBe(true)

    setInput(shadow, "obs-time", "1965")

    expect(input.classList.contains("invalid")).toBe(false)
  })

  it("round-trips EDTF qualifiers (uncertain/approximate/masked year) verbatim through sightingData", () => {
    const element = mount()
    const shadow = element.shadowRoot!
    setInput(shadow, "obs-time", "2025-06?")

    expect(element.sightingData.time?.raw).toBe("2025-06?")
    expect(element.sightingData.time?.year).toBe(2025)
  })

  it("loading sightingData re-populates the observer/time fields", () => {
    const element = mount()
    element.sightingData = {
      version: 1,
      time: { year: 1948, month: 7, day: 24, hour: 2, minute: 45 },
      place: [{ lat: 32.3792, lng: -86.3077 }],
      witnessTrack: { keyframes: [{ t: 0, pose: { lat: 32.3792, lng: -86.3077, elevationM: 0, headingDeg: 45, pitchDeg: 0, fovDeg: 60 } }] },
      timeline: { keyframes: [] }
    }

    const shadow = element.shadowRoot!
    expect((shadow.getElementById("lat") as HTMLInputElement).value).toBe("32.3792")
    expect((shadow.getElementById("lng") as HTMLInputElement).value).toBe("-86.3077")
    expect((shadow.getElementById("heading") as HTMLInputElement).value).toBe("45")
    expect((shadow.getElementById("obs-time") as HTMLInputElement).value).toBe("1948-07-24T02:45")
  })
})

describe("UfoRecorderElement metadata fields", () => {
  afterEach(() => {
    document.body.innerHTML = ""
  })

  function setInput(shadow: ShadowRoot, id: string, value: string): void {
    const input = shadow.getElementById(id) as HTMLInputElement | HTMLTextAreaElement
    input.value = value
    input.dispatchEvent(new Event("input"))
  }

  it("writes the observation-end EDTF text field into event.endTime", () => {
    const element = mount()
    const shadow = element.shadowRoot!
    setInput(shadow, "obs-end-time", "1965-07-01T05:30")

    expect(element.sightingData.endTime).toEqual({
      year: 1965,
      month: 7,
      day: 1,
      hour: 5,
      minute: 30,
      second: undefined,
      raw: "1965-07-01T05:30"
    })
  })

  it("clears event.endTime entirely once the observation-end field is emptied", () => {
    const element = mount()
    const shadow = element.shadowRoot!
    setInput(shadow, "obs-end-time", "1965")
    setInput(shadow, "obs-end-time", "")

    expect(element.sightingData.endTime).toBeUndefined()
  })

  it("writes the 5 witness fields and caseId into a single witness object", () => {
    const element = mount()
    const shadow = element.shadowRoot!
    setInput(shadow, "witnessId", "chiles")
    setInput(shadow, "witnessDirName", "people/c/ChilesClarence")
    setInput(shadow, "witnessTitle", "Clarence Chiles")
    setInput(shadow, "witnessLastName", "Chiles")
    setInput(shadow, "witnessFirstNames", "Clarence")
    setInput(shadow, "caseId", "chiles-whitted")

    expect(element.sightingData.witness).toEqual({
      id: "chiles",
      dirName: "people/c/ChilesClarence",
      title: "Clarence Chiles",
      lastName: "Chiles",
      firstNames: ["Clarence"]
    })
    expect(element.sightingData.caseId).toBe("chiles-whitted")
  })

  it("splits witnessFirstNames on commas, trimming whitespace and dropping empties", () => {
    const element = mount()
    const shadow = element.shadowRoot!
    setInput(shadow, "witnessLastName", "Chiles")
    setInput(shadow, "witnessFirstNames", "Clarence,  Édouard , ")

    expect(element.sightingData.witness?.firstNames).toEqual(["Clarence", "Édouard"])
  })

  it("clearing every witness field back to empty clears witness to undefined", () => {
    const element = mount()
    const shadow = element.shadowRoot!
    setInput(shadow, "witnessTitle", "Clarence Chiles")
    setInput(shadow, "witnessTitle", "")

    expect(element.sightingData.witness).toBeUndefined()
  })

  it("writes description", () => {
    const element = mount()
    const shadow = element.shadowRoot!
    setInput(shadow, "description", "Bright light hovering over the field.")

    expect(element.sightingData.description).toBe("Bright light hovering over the field.")
  })

  it("splits tags on commas, trimming whitespace and dropping empties", () => {
    const element = mount()
    const shadow = element.shadowRoot!
    setInput(shadow, "tags", "hovering,  night , , silent")

    expect(element.sightingData.tags).toEqual(["hovering", "night", "silent"])
  })

  it("clearing tags back to empty clears it to undefined, not an empty array", () => {
    const element = mount()
    const shadow = element.shadowRoot!
    setInput(shadow, "tags", "hovering")
    setInput(shadow, "tags", "")

    expect(element.sightingData.tags).toBeUndefined()
  })

  it("loading sightingData re-populates the metadata fields", () => {
    const element = mount()
    element.sightingData = {
      version: 1,
      endTime: { year: 1948, month: 7, day: 24, hour: 3, minute: 0 },
      witness: { id: "chiles", dirName: "people/c/ChilesClarence", title: "Clarence Chiles", lastName: "Chiles", firstNames: ["Clarence"] },
      caseId: "chiles-whitted",
      description: "Bright light hovering over the field.",
      tags: ["hovering", "night"],
      timeline: { keyframes: [] }
    }

    const shadow = element.shadowRoot!
    expect((shadow.getElementById("obs-end-time") as HTMLInputElement).value).toBe("1948-07-24T03:00")
    expect((shadow.getElementById("witnessId") as HTMLInputElement).value).toBe("chiles")
    expect((shadow.getElementById("witnessDirName") as HTMLInputElement).value).toBe("people/c/ChilesClarence")
    expect((shadow.getElementById("witnessTitle") as HTMLInputElement).value).toBe("Clarence Chiles")
    expect((shadow.getElementById("witnessLastName") as HTMLInputElement).value).toBe("Chiles")
    expect((shadow.getElementById("witnessFirstNames") as HTMLInputElement).value).toBe("Clarence")
    expect((shadow.getElementById("caseId") as HTMLInputElement).value).toBe("chiles-whitted")
    expect((shadow.getElementById("description") as HTMLTextAreaElement).value).toBe("Bright light hovering over the field.")
    expect((shadow.getElementById("tags") as HTMLInputElement).value).toBe("hovering, night")
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
      witnessTrack: { keyframes: [{ t: 0, pose: { lat: 43.837, lng: 5.993, elevationM: 0, headingDeg: undefined, pitchDeg: 0, fovDeg: 60 } }] },
      timeline: { keyframes: [] },
      durationSeconds: 5
    }
    const shadow = element.shadowRoot!
    seekNestedUfoTo(element, 2000)
    setInput(shadow, "lat", "44.0")
    setInput(shadow, "lng", "6.5")

    expect(element.sightingData.witnessTrack?.keyframes).toEqual([
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

    expect(element.sightingData.witnessTrack?.keyframes.map(k => k.t)).toEqual([0, 3000])
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

    expect(element.sightingData.witnessTrack?.keyframes).toEqual([
      { t: 0, pose: { lat: 43.837, lng: 5.993, elevationM: 0, headingDeg: undefined, pitchDeg: 0, fovDeg: 60 } }
    ])
  })

  it("scrubbing between two observer keyframes repopulates the fields with the interpolated pose", () => {
    const element = mount()
    element.sightingData = {
      version: 1,
      witnessTrack: {
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
      witnessTrack: { keyframes: [{ t: 0, pose: { lat: 43.837, lng: 5.993, elevationM: 0, headingDeg: undefined, pitchDeg: 0, fovDeg: 60 } }] },
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
      witnessTrack: { keyframes: [{ t: 0, pose: { lat: 40, lng: 0, elevationM: 0, headingDeg: undefined, pitchDeg: 0, fovDeg: 60 } }] },
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
    expect(element.sightingData.witnessTrack?.keyframes[0].pose.headingDeg).toBe(0)
  })
})

describe("UfoRecorderElement weather keyframes over time", () => {
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

  it("records a weather keyframe at the scrubbed-to instant, not always at t=0", () => {
    const element = mount()
    element.sightingData = { version: 1, timeline: { keyframes: [] }, durationSeconds: 5 }
    const shadow = element.shadowRoot!
    seekNestedUfoTo(element, 2000)
    setInput(shadow, "precipitationType", "rain")
    setInput(shadow, "precipitationIntensity", "0.6")

    const keyframes = element.sightingData.weatherTrack?.keyframes
    expect(keyframes).toHaveLength(1)
    expect(keyframes?.[0].t).toBe(2000)
    expect(keyframes?.[0].weather.precipitationType).toBe("rain")
  })

  it("it starts raining then stops: editing weather at two different scrubbed instants produces two independent keyframes", () => {
    const element = mount()
    element.sightingData = { version: 1, timeline: { keyframes: [] }, durationSeconds: 5 }
    const shadow = element.shadowRoot!

    seekNestedUfoTo(element, 0)
    setInput(shadow, "precipitationType", "rain")
    setInput(shadow, "precipitationIntensity", "0.7")
    seekNestedUfoTo(element, 3000)
    setInput(shadow, "precipitationType", "none")
    setInput(shadow, "precipitationIntensity", "0")

    const keyframes = element.sightingData.weatherTrack?.keyframes
    expect(keyframes?.map(k => k.t)).toEqual([0, 3000])
    expect(keyframes?.[0].weather.precipitationType).toBe("rain")
    expect(keyframes?.[1].weather.precipitationType).toBe("none")
  })

  it("scrubbing between two weather keyframes blends continuous fields but holds precipitationType", () => {
    const element = mount()
    element.sightingData = {
      version: 1,
      weatherTrack: {
        keyframes: [
          { t: 0, weather: { cloudCover: 0, cloudDarkness: 0, precipitationType: "none", precipitationIntensity: 0, windDirectionDeg: 0, windSpeed: 0, storm: false } },
          { t: 1000, weather: { cloudCover: 1, cloudDarkness: 0, precipitationType: "rain", precipitationIntensity: 1, windDirectionDeg: 0, windSpeed: 10, storm: false } }
        ]
      },
      timeline: { keyframes: [] },
      durationSeconds: 5
    }
    seekNestedUfoTo(element, 500)

    const shadow = element.shadowRoot!
    expect((shadow.getElementById("cloudCover") as HTMLInputElement).value).toBe("0.5")
    expect((shadow.getElementById("windSpeed") as HTMLInputElement).value).toBe("5")
    // Held, not blended — there's no meaningful halfway point between "none" and "rain" (see
    // WeatherTrack.test.ts's own coverage of this at the model layer).
    expect((shadow.getElementById("precipitationType") as HTMLSelectElement).value).toBe("none")
  })

  it("does not write or resync weather fields while the nested player is playing", () => {
    const element = mount()
    element.sightingData = {
      version: 1,
      weatherTrack: { keyframes: [{ t: 0, weather: { cloudCover: 0, cloudDarkness: 0, precipitationType: "none", precipitationIntensity: 0, windDirectionDeg: 0, windSpeed: 0, storm: false } }] },
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
    setInput(shadow, "precipitationType", "hail")

    expect(JSON.stringify(element.sightingData)).toBe(before)
  })

  it("wraps wind direction to 0 once it reaches 360, both in the field and the stored weather", () => {
    const element = mount()
    const shadow = element.shadowRoot!
    setInput(shadow, "windDirection", "360")

    const windDirectionInput = shadow.getElementById("windDirection") as HTMLInputElement
    expect(windDirectionInput.value).toBe("0")
    expect(element.sightingData.weatherTrack?.keyframes[0].weather.windDirectionDeg).toBe(0)
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
      witnessTrack: { keyframes: [] },
      weatherTrack: { keyframes: [] }
    }
    element.sightingData = json
    // timeline.order/groups are always present on the way out (order: z-order support, groups:
    // multi-select grouping), even though the hand-written fixture above predates both and omits
    // them. decor is likewise always present (see Decor.ts), empty here since none was set, and so
    // is soundTrack (see SoundTrack.ts) — empty meaning nothing was recorded about sound.
    // Every shape also comes back stating the angle its box subtends — see BaseShape.angular.
    const angular = new ImageProjection("equidistant", ApparentSize.CANVAS_HEIGHT_PX, 60).ofBounds({ width: 3, height: 4 })
    const keyframesOut = json.timeline.keyframes.map(keyframe => ({
      ...keyframe,
      shapes: keyframe.shapes.map(state => ({ ...state, shape: { ...state.shape, angular } }))
    }))
    expect(element.sightingData).toEqual({
      ...json,
      timeline: { keyframes: keyframesOut, order: ["ufo-1"], groups: [] },
      soundTrack: { keyframes: [] },
      decor: []
    })
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

  it("writes the Name field into the shape's title at the current playhead", () => {
    const element = mount()
    const titleInput = element.shadowRoot!.getElementById("shapeTitle") as HTMLInputElement
    titleInput.value = "Vaisseau principal"
    titleInput.dispatchEvent(new Event("input"))

    expect(element.sightingData.timeline.keyframes[0].shapes[0].shape.title).toBe("Vaisseau principal")
  })

  it("clearing the Name field back to empty clears title to undefined", () => {
    const element = mount()
    const titleInput = element.shadowRoot!.getElementById("shapeTitle") as HTMLInputElement
    titleInput.value = "Vaisseau principal"
    titleInput.dispatchEvent(new Event("input"))
    titleInput.value = ""
    titleInput.dispatchEvent(new Event("input"))

    expect(element.sightingData.timeline.keyframes[0].shapes[0].shape.title).toBeUndefined()
  })

  it("shows the shape's title in the source dropdown, starting from its own auto-generated one", () => {
    const element = mount()
    const sourceSelect = element.shadowRoot!.getElementById("source") as HTMLSelectElement
    // Auto-filled from the start (see addShape's own nextShapeLabel) — no separate naming step
    // needed before the dropdown shows something real instead of the raw internal sourceId.
    expect(sourceSelect.options[0].textContent).toBe("Shape 1")

    const titleInput = element.shadowRoot!.getElementById("shapeTitle") as HTMLInputElement
    titleInput.value = "Vaisseau principal"
    titleInput.dispatchEvent(new Event("input"))

    expect(sourceSelect.options[0].textContent).toBe("Vaisseau principal")
  })

  it("derives the same 'Shape N' label from a standard sourceId loaded with no title, not the raw id — same formula addShape() itself fills in with, so clearing a title never jumps to different-looking text", () => {
    const element = mount()
    element.sightingData = {
      version: 1,
      timeline: {
        keyframes: [{ t: 0, shapes: [{ sourceId: "ufo-1", shape: { kind: "oval", bounds: { x: 0, y: 0, width: 10, height: 10 }, color: "#39ff14", angle: 0, transparency: 0, haloScale: 0, selected: false } }] }]
      }
    }
    const sourceSelect = element.shadowRoot!.getElementById("source") as HTMLSelectElement
    expect(sourceSelect.options[0].textContent).toBe("Shape 1")
  })

  it("falls back to the raw sourceId only when it doesn't follow the ufo-N convention at all (hand-written/older data)", () => {
    const element = mount()
    element.sightingData = {
      version: 1,
      timeline: {
        keyframes: [{ t: 0, shapes: [{ sourceId: "witness-drawing", shape: { kind: "oval", bounds: { x: 0, y: 0, width: 10, height: 10 }, color: "#39ff14", angle: 0, transparency: 0, haloScale: 0, selected: false } }] }]
      }
    }
    const sourceSelect = element.shadowRoot!.getElementById("source") as HTMLSelectElement
    expect(sourceSelect.options[0].textContent).toBe("witness-drawing")
  })

  it("keeps the exact same dropdown label after clearing an auto-filled title — no jarring jump to the raw sourceId", () => {
    const element = mount()
    const shadow = element.shadowRoot!
    ;(shadow.getElementById("add-shape") as HTMLButtonElement).click() // "ufo-2", auto-titled "Shape 2"
    const sourceSelect = shadow.getElementById("source") as HTMLSelectElement
    expect(sourceSelect.options[1].textContent).toBe("Shape 2")

    const titleInput = shadow.getElementById("shapeTitle") as HTMLInputElement
    titleInput.value = ""
    titleInput.dispatchEvent(new Event("input"))

    expect(sourceSelect.options[1].textContent).toBe("Shape 2")
    expect(element.sightingData.timeline.keyframes[0].shapes.find(s => s.sourceId === "ufo-2")?.shape.title).toBeUndefined()
  })

  it("names the shape in the delete-confirmation prompt once it has a title", () => {
    const element = mount()
    const shadow = element.shadowRoot!
    ;(shadow.getElementById("add-shape") as HTMLButtonElement).click()
    const titleInput = shadow.getElementById("shapeTitle") as HTMLInputElement
    titleInput.value = "Vaisseau principal"
    titleInput.dispatchEvent(new Event("input"))

    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(false)
    ;(shadow.getElementById("delete-shape") as HTMLButtonElement).click()

    expect(confirmSpy).toHaveBeenCalledWith(expect.stringContaining("Vaisseau principal"))
    confirmSpy.mockRestore()
  })

  it("does not clobber the Name field's in-progress value while it's focused", () => {
    const element = mount()
    const titleInput = element.shadowRoot!.getElementById("shapeTitle") as HTMLInputElement
    titleInput.focus()
    titleInput.value = "Vais"
    titleInput.dispatchEvent(new Event("input"))

    expect(titleInput.value).toBe("Vais")
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

  it("disables the source select, add-shape and delete-shape buttons while recording", () => {
    const element = mount()
    const addShapeButton = element.shadowRoot!.getElementById("add-shape") as HTMLButtonElement
    addShapeButton.click() // a 2nd shape, so delete-shape isn't disabled for an unrelated reason below
    const sourceSelect = element.shadowRoot!.getElementById("source") as HTMLSelectElement
    const deleteShapeButton = element.shadowRoot!.getElementById("delete-shape") as HTMLButtonElement
    const recordButton = element.shadowRoot!.getElementById("record") as HTMLButtonElement

    recordButton.click()
    expect(sourceSelect.disabled).toBe(true)
    expect(addShapeButton.disabled).toBe(true)
    expect(deleteShapeButton.disabled).toBe(true)

    recordButton.click()
    expect(sourceSelect.disabled).toBe(false)
    expect(addShapeButton.disabled).toBe(false)
    expect(deleteShapeButton.disabled).toBe(false)
  })

  it("Escape stops an in-progress recording, same as clicking Stop", () => {
    const element = mount()
    const recordButton = element.shadowRoot!.getElementById("record") as HTMLButtonElement
    recordButton.click()
    expect(element.shadowRoot!.getElementById("source")!.hasAttribute("disabled")).toBe(true)

    element.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }))

    expect(element.shadowRoot!.getElementById("source")!.hasAttribute("disabled")).toBe(false)
  })

  it("Escape does nothing while not recording", () => {
    const element = mount()
    const recordButton = element.shadowRoot!.getElementById("record") as HTMLButtonElement

    element.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }))

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

  it("Delete shape removes the selected source from every keyframe it appears in", () => {
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true)
    const element = mount()
    const addShapeButton = element.shadowRoot!.getElementById("add-shape") as HTMLButtonElement
    addShapeButton.click() // now "ufo-1" (construction default) + "ufo-2"
    const sourceSelect = element.shadowRoot!.getElementById("source") as HTMLSelectElement
    sourceSelect.value = "ufo-1"
    sourceSelect.dispatchEvent(new Event("change"))

    const deleteShapeButton = element.shadowRoot!.getElementById("delete-shape") as HTMLButtonElement
    deleteShapeButton.click()

    const sourceIds = element.sightingData.timeline.keyframes.flatMap(k => k.shapes.map(s => s.sourceId))
    expect(sourceIds).toEqual(["ufo-2"])
    confirmSpy.mockRestore()
  })

  it("Delete shape asks for confirmation first, and does nothing if it's declined", () => {
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(false)
    const element = mount()
    const addShapeButton = element.shadowRoot!.getElementById("add-shape") as HTMLButtonElement
    addShapeButton.click() // "ufo-1" + "ufo-2"

    const deleteShapeButton = element.shadowRoot!.getElementById("delete-shape") as HTMLButtonElement
    deleteShapeButton.click()

    expect(confirmSpy).toHaveBeenCalled()
    const sourceIds = element.sightingData.timeline.keyframes.flatMap(k => k.shapes.map(s => s.sourceId))
    expect(sourceIds).toEqual(["ufo-1", "ufo-2"])
    confirmSpy.mockRestore()
  })

  it("names the actual shape being deleted in the confirmation prompt, not a generic message", () => {
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(false)
    const element = mount()
    const addShapeButton = element.shadowRoot!.getElementById("add-shape") as HTMLButtonElement
    addShapeButton.click() // "ufo-1" + "ufo-2", "ufo-2" selected — auto-named "Shape 2" (see addShape's own nextShapeLabel)

    const deleteShapeButton = element.shadowRoot!.getElementById("delete-shape") as HTMLButtonElement
    deleteShapeButton.click()

    expect(confirmSpy).toHaveBeenCalledWith(expect.stringContaining("Shape 2"))
    confirmSpy.mockRestore()
  })

  it("auto-names a freshly added shape, matching the dropdown/tooltip label, instead of leaving it untitled", () => {
    const element = mount()
    const addShapeButton = element.shadowRoot!.getElementById("add-shape") as HTMLButtonElement

    addShapeButton.click()
    addShapeButton.click()

    const sourceIds = element.sightingData.timeline.keyframes[0].shapes.map(s => s.sourceId)
    const titles = element.sightingData.timeline.keyframes[0].shapes.map(s => s.shape.title)
    expect(sourceIds).toEqual(["ufo-1", "ufo-2", "ufo-3"])
    expect(titles).toEqual(["Shape 1", "Shape 2", "Shape 3"])
    const shapeTitleInput = element.shadowRoot!.getElementById("shapeTitle") as HTMLInputElement
    expect(shapeTitleInput.value).toBe("Shape 3") // the just-added, now-selected one
  })

  it("flags the shape Name field invalid when cleared, clears the flag once it's non-empty again", () => {
    const element = mount()
    const titleInput = element.shadowRoot!.getElementById("shapeTitle") as HTMLInputElement
    expect(titleInput.classList.contains("invalid")).toBe(false)

    titleInput.value = ""
    titleInput.dispatchEvent(new Event("input"))
    expect(titleInput.classList.contains("invalid")).toBe(true)
    expect(titleInput.getAttribute("aria-invalid")).toBe("true")

    titleInput.value = "Renamed"
    titleInput.dispatchEvent(new Event("input"))
    expect(titleInput.classList.contains("invalid")).toBe(false)
    expect(titleInput.getAttribute("aria-invalid")).toBe("false")
  })

  it("Delete shape falls back to the next remaining source and resyncs the toolbar to it", () => {
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true)
    const element = mount()
    element.sightingData = {
      version: 1,
      timeline: {
        keyframes: [
          { t: 0, shapes: [
            { sourceId: "ufo-1", shape: { kind: "oval", bounds: { x: 0, y: 0, width: 10, height: 10 }, color: "#39ff14", angle: 0, transparency: 0, haloScale: 1.5, selected: false } },
            { sourceId: "ufo-2", shape: { kind: "oval", bounds: { x: 50, y: 0, width: 10, height: 10 }, color: "#ff8800", angle: 0, transparency: 0.5, haloScale: 2, selected: false } }
          ] }
        ]
      }
    }
    const sourceSelect = element.shadowRoot!.getElementById("source") as HTMLSelectElement
    expect(sourceSelect.value).toBe("ufo-1")

    const deleteShapeButton = element.shadowRoot!.getElementById("delete-shape") as HTMLButtonElement
    deleteShapeButton.click()

    expect(sourceSelect.value).toBe("ufo-2")
    expect(element.appearance).toEqual({ presetId: "oval", color: "#ff8800", transparency: 0.5, haloScale: 2 })
    confirmSpy.mockRestore()
  })

  it("Delete shape is disabled for the only remaining shape — a recording always needs at least one", () => {
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true)
    const element = mount() // just the construction default, "ufo-1" — nothing else to fall back to
    const deleteShapeButton = element.shadowRoot!.getElementById("delete-shape") as HTMLButtonElement
    expect(deleteShapeButton.disabled).toBe(true)

    deleteShapeButton.click() // a stray click/event must be a no-op, not empty the recording out

    const sourceIds = element.sightingData.timeline.keyframes.flatMap(k => k.shapes.map(s => s.sourceId))
    expect(sourceIds).toEqual(["ufo-1"])
    confirmSpy.mockRestore()
  })

  it("Delete shape re-disables itself once deletion brings the count back down to one", () => {
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true)
    const element = mount()
    const addShapeButton = element.shadowRoot!.getElementById("add-shape") as HTMLButtonElement
    addShapeButton.click() // "ufo-1" + "ufo-2"
    const deleteShapeButton = element.shadowRoot!.getElementById("delete-shape") as HTMLButtonElement
    expect(deleteShapeButton.disabled).toBe(false)

    deleteShapeButton.click() // back down to just "ufo-1"

    expect(deleteShapeButton.disabled).toBe(true)
    const sourceIds = element.sightingData.timeline.keyframes.flatMap(k => k.shapes.map(s => s.sourceId))
    expect(sourceIds).toEqual(["ufo-1"])
    confirmSpy.mockRestore()
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

    expect(element.appearance).toEqual({ presetId: "polygon", color: "#ff8800", transparency: 0.5, haloScale: 2 })
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

    const ufo = nestedUfo(element) as unknown as { selectedSourceIds: Set<string> }
    expect([...ufo.selectedSourceIds]).toEqual(["ufo-1"])
  })

  it("clicking inside a shape's bounds selects it: updates the dropdown and the nested ufo's highlight", () => {
    const element = mount()
    element.sightingData = twoShapesJson()
    const canvas = nestedCanvas(element)

    clickAt(canvas, 105, 105) // inside ufo-2's bounds, outside ufo-1's

    const sourceSelect = element.shadowRoot!.getElementById("source") as HTMLSelectElement
    expect(sourceSelect.value).toBe("ufo-2")
    const ufo = nestedUfo(element) as unknown as { selectedSourceIds: Set<string> }
    expect([...ufo.selectedSourceIds]).toEqual(["ufo-2"])
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

    const ufo = nestedUfo(element) as unknown as { selectedSourceIds: Set<string> }
    expect([...ufo.selectedSourceIds]).toEqual(["ufo-2"])
  })

  it("addShape also propagates the new shape's selection to the nested ufo's highlight", () => {
    const element = mount()
    const addShapeButton = element.shadowRoot!.getElementById("add-shape") as HTMLButtonElement
    addShapeButton.click()

    const ufo = nestedUfo(element) as unknown as { selectedSourceIds: Set<string> }
    expect([...ufo.selectedSourceIds]).toEqual(["ufo-2"])
  })
})

describe("UfoRecorderElement right-click context menu", () => {
  afterEach(() => {
    document.body.innerHTML = ""
  })

  function nestedCanvas(element: UfoRecorderElement): HTMLCanvasElement {
    const canvas = nestedUfo(element)!.shadowRoot!.getElementById("canvas") as HTMLCanvasElement
    vi.spyOn(canvas, "getBoundingClientRect").mockReturnValue({ left: 0, top: 0, width: 640, height: 360 } as DOMRect)
    return canvas
  }

  function rightClickAt(canvas: HTMLCanvasElement, x: number, y: number): void {
    canvas.dispatchEvent(new MouseEvent("contextmenu", { clientX: x, clientY: y, bubbles: true, cancelable: true, composed: true }))
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

  it("right-clicking a shape opens the menu and selects that shape, suppressing the native menu", () => {
    const element = mount()
    element.sightingData = twoShapesJson()
    const canvas = nestedCanvas(element)
    const menu = element.shadowRoot!.getElementById("context-menu") as HTMLElement

    const event = new MouseEvent("contextmenu", { clientX: 105, clientY: 105, bubbles: true, cancelable: true, composed: true })
    const preventDefault = vi.spyOn(event, "preventDefault")
    canvas.dispatchEvent(event)

    expect(preventDefault).toHaveBeenCalled()
    expect(menu.hidden).toBe(false)
    const sourceSelect = element.shadowRoot!.getElementById("source") as HTMLSelectElement
    expect(sourceSelect.value).toBe("ufo-2") // the shape actually under the cursor, not whatever was selected before
  })

  it("right-clicking empty canvas suppresses the native menu but doesn't open ours", () => {
    const element = mount()
    const canvas = nestedCanvas(element)
    const menu = element.shadowRoot!.getElementById("context-menu") as HTMLElement

    rightClickAt(canvas, 600, 340) // well outside the default centered shape
    expect(menu.hidden).toBe(true)
  })

  it("Bring to front / Send to back reorder the timeline, and repaint immediately", () => {
    const element = mount()
    element.sightingData = twoShapesJson() // order: ufo-1, ufo-2 (ufo-2 in front)
    const canvas = nestedCanvas(element)
    const frontButton = element.shadowRoot!.getElementById("context-bring-to-front") as HTMLButtonElement
    const backButton = element.shadowRoot!.getElementById("context-send-to-back") as HTMLButtonElement

    rightClickAt(canvas, 5, 5) // selects ufo-1 (only ufo-1 covers this point)
    frontButton.click()

    expect(element.sightingData.timeline.order).toEqual(["ufo-2", "ufo-1"])
    const menu = element.shadowRoot!.getElementById("context-menu") as HTMLElement
    expect(menu.hidden).toBe(true) // clicking an item closes the menu

    rightClickAt(canvas, 5, 5) // ufo-1 is now on top at this point too
    backButton.click()

    expect(element.sightingData.timeline.order).toEqual(["ufo-1", "ufo-2"])
  })

  it("Delete in the context menu asks for confirmation, same as the toolbar button", () => {
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true)
    const element = mount()
    element.sightingData = twoShapesJson()
    const canvas = nestedCanvas(element)
    const contextDelete = element.shadowRoot!.getElementById("context-delete") as HTMLButtonElement

    rightClickAt(canvas, 105, 105) // selects ufo-2
    contextDelete.click()

    expect(confirmSpy).toHaveBeenCalled()
    const sourceIds = element.sightingData.timeline.keyframes.flatMap(k => k.shapes.map(s => s.sourceId))
    expect(sourceIds).toEqual(["ufo-1"])
    confirmSpy.mockRestore()
  })

  it("Escape closes the context menu", () => {
    const element = mount()
    const canvas = nestedCanvas(element)
    const menu = element.shadowRoot!.getElementById("context-menu") as HTMLElement
    rightClickAt(canvas, 320, 180) // hits the default centered shape
    expect(menu.hidden).toBe(false)

    element.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }))

    expect(menu.hidden).toBe(true)
  })

  it("a click outside the menu closes it", () => {
    const element = mount()
    const canvas = nestedCanvas(element)
    const menu = element.shadowRoot!.getElementById("context-menu") as HTMLElement
    rightClickAt(canvas, 320, 180)
    expect(menu.hidden).toBe(false)

    document.body.dispatchEvent(new MouseEvent("click", { bubbles: true, composed: true }))

    expect(menu.hidden).toBe(true)
  })

  it("all three items are disabled for the only remaining shape, with a title explaining why", () => {
    const element = mount() // just "ufo-1"
    const canvas = nestedCanvas(element)
    const frontButton = element.shadowRoot!.getElementById("context-bring-to-front") as HTMLButtonElement
    const backButton = element.shadowRoot!.getElementById("context-send-to-back") as HTMLButtonElement
    const contextDelete = element.shadowRoot!.getElementById("context-delete") as HTMLButtonElement

    rightClickAt(canvas, 320, 180) // hits the default centered shape

    expect(frontButton.disabled).toBe(true)
    expect(backButton.disabled).toBe(true)
    expect(contextDelete.disabled).toBe(true)
    expect(frontButton.title).toBe("There is only one shape")
    expect(backButton.title).toBe("There is only one shape")
    expect(contextDelete.title).toBe("There is only one shape")
  })

  it("Bring to front is disabled (with a title) for a shape that's already frontmost", () => {
    const element = mount()
    element.sightingData = twoShapesJson() // z-order: ufo-1 (back), ufo-2 (front)
    const canvas = nestedCanvas(element)
    const frontButton = element.shadowRoot!.getElementById("context-bring-to-front") as HTMLButtonElement
    const backButton = element.shadowRoot!.getElementById("context-send-to-back") as HTMLButtonElement

    rightClickAt(canvas, 105, 105) // selects ufo-2, already frontmost

    expect(frontButton.disabled).toBe(true)
    expect(frontButton.title).toBe("This shape is already at the front")
    expect(backButton.disabled).toBe(false) // not backmost — still a real reorder
    expect(backButton.title).toBe("")
  })

  it("Send to back is disabled (with a title) for a shape that's already backmost", () => {
    const element = mount()
    element.sightingData = twoShapesJson() // z-order: ufo-1 (back), ufo-2 (front)
    const canvas = nestedCanvas(element)
    const frontButton = element.shadowRoot!.getElementById("context-bring-to-front") as HTMLButtonElement
    const backButton = element.shadowRoot!.getElementById("context-send-to-back") as HTMLButtonElement

    rightClickAt(canvas, 5, 5) // selects ufo-1, already backmost

    expect(backButton.disabled).toBe(true)
    expect(backButton.title).toBe("This shape is already at the back")
    expect(frontButton.disabled).toBe(false) // not frontmost — still a real reorder
    expect(frontButton.title).toBe("")
  })

  it("both are enabled, with no leftover title, for a shape in the middle of the z-order", () => {
    const element = mount()
    element.sightingData = {
      version: 1,
      timeline: {
        keyframes: [
          { t: 0, shapes: [
            { sourceId: "ufo-1", shape: { kind: "oval", bounds: { x: 0, y: 0, width: 20, height: 20 }, color: "#39ff14", angle: 0, transparency: 0, haloScale: 0, selected: false } },
            { sourceId: "ufo-2", shape: { kind: "oval", bounds: { x: 40, y: 40, width: 20, height: 20 }, color: "#ff0000", angle: 0, transparency: 0, haloScale: 0, selected: false } },
            { sourceId: "ufo-3", shape: { kind: "oval", bounds: { x: 80, y: 80, width: 20, height: 20 }, color: "#0000ff", angle: 0, transparency: 0, haloScale: 0, selected: false } }
          ] }
        ]
      }
    } // z-order: ufo-1 (back), ufo-2 (middle), ufo-3 (front)
    const canvas = nestedCanvas(element)
    const frontButton = element.shadowRoot!.getElementById("context-bring-to-front") as HTMLButtonElement
    const backButton = element.shadowRoot!.getElementById("context-send-to-back") as HTMLButtonElement
    const contextDelete = element.shadowRoot!.getElementById("context-delete") as HTMLButtonElement

    rightClickAt(canvas, 45, 45) // selects ufo-2, the middle one

    expect(frontButton.disabled).toBe(false)
    expect(backButton.disabled).toBe(false)
    expect(contextDelete.disabled).toBe(false)
    expect(frontButton.title).toBe("")
    expect(backButton.title).toBe("")
    expect(contextDelete.title).toBe("")
  })

  it("does not open while recording or playing", () => {
    const element = mount()
    const canvas = nestedCanvas(element)
    const menu = element.shadowRoot!.getElementById("context-menu") as HTMLElement
    const recordButton = element.shadowRoot!.getElementById("record") as HTMLButtonElement

    recordButton.click()
    rightClickAt(canvas, 320, 180)
    expect(menu.hidden).toBe(true)
    recordButton.click() // stop

    const playButton = nestedUfo(element)!.shadowRoot!.getElementById("play-pause") as HTMLButtonElement
    const ufo = nestedUfo(element)! as unknown as { durationSeconds: number }
    ufo.durationSeconds = 5 // Play is disabled for a zero-duration recording — see UfoElement's own test
    playButton.click()
    rightClickAt(canvas, 320, 180)
    expect(menu.hidden).toBe(true)
  })
})

describe("UfoRecorderElement Delete/Backspace key", () => {
  afterEach(() => {
    document.body.innerHTML = ""
  })

  /** Dispatched ON the editor, which is where a key actually lands once it has the focus — it no
   * longer listens on document, so that a page's own forms keep their keys (see the two tests at
   * the end of this block). */
  function pressKey(element: UfoRecorderElement, key: string): void {
    element.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true, composed: true }))
  }

  it("deletes the selected shape, with the same confirmation as the toolbar button", () => {
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true)
    const element = mount()
    const addShapeButton = element.shadowRoot!.getElementById("add-shape") as HTMLButtonElement
    addShapeButton.click() // "ufo-1" + "ufo-2", "ufo-2" selected

    pressKey(element, "Delete")

    expect(confirmSpy).toHaveBeenCalled()
    const sourceIds = element.sightingData.timeline.keyframes.flatMap(k => k.shapes.map(s => s.sourceId))
    expect(sourceIds).toEqual(["ufo-1"])
    confirmSpy.mockRestore()
  })

  it("Backspace works the same as Delete", () => {
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true)
    const element = mount()
    const addShapeButton = element.shadowRoot!.getElementById("add-shape") as HTMLButtonElement
    addShapeButton.click()

    pressKey(element, "Backspace")

    const sourceIds = element.sightingData.timeline.keyframes.flatMap(k => k.shapes.map(s => s.sourceId))
    expect(sourceIds).toEqual(["ufo-1"])
    confirmSpy.mockRestore()
  })

  it("declining the confirmation leaves the shape in place", () => {
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(false)
    const element = mount()
    const addShapeButton = element.shadowRoot!.getElementById("add-shape") as HTMLButtonElement
    addShapeButton.click()

    pressKey(element, "Delete")

    const sourceIds = element.sightingData.timeline.keyframes.flatMap(k => k.shapes.map(s => s.sourceId))
    expect(sourceIds).toEqual(["ufo-1", "ufo-2"])
    confirmSpy.mockRestore()
  })

  it("refuses to delete the only remaining shape, even via the confirmed keyboard path", () => {
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true)
    const element = mount() // just "ufo-1"

    pressKey(element, "Delete")

    const sourceIds = element.sightingData.timeline.keyframes.flatMap(k => k.shapes.map(s => s.sourceId))
    expect(sourceIds).toEqual(["ufo-1"])
    confirmSpy.mockRestore()
  })

  it("does nothing when Delete/Backspace originates from a focused text input", () => {
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true)
    const element = mount()
    const addShapeButton = element.shadowRoot!.getElementById("add-shape") as HTMLButtonElement
    addShapeButton.click()
    const latInput = element.shadowRoot!.getElementById("lat") as HTMLInputElement
    latInput.focus()
    latInput.dispatchEvent(new KeyboardEvent("keydown", { key: "Delete", bubbles: true, composed: true }))

    expect(confirmSpy).not.toHaveBeenCalled()
    const sourceIds = element.sightingData.timeline.keyframes.flatMap(k => k.shapes.map(s => s.sourceId))
    expect(sourceIds).toEqual(["ufo-1", "ufo-2"])
    confirmSpy.mockRestore()
  })

  it("ignores a key pressed in another form on the same page", () => {
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true)
    const element = mount()
    ;(element.shadowRoot!.getElementById("add-shape") as HTMLButtonElement).click()
    const foreign = document.createElement("input")
    document.body.appendChild(foreign)
    foreign.focus()

    foreign.dispatchEvent(new KeyboardEvent("keydown", { key: "Backspace", bubbles: true, composed: true }))

    expect(confirmSpy).not.toHaveBeenCalled()
    const sourceIds = element.sightingData.timeline.keyframes.flatMap(k => k.shapes.map(s => s.sourceId))
    expect(sourceIds).toEqual(["ufo-1", "ufo-2"])
    confirmSpy.mockRestore()
  })

  it("ignores a key from a field inside a CLOSED shadow root elsewhere on the page", () => {
    // The bug this block exists for. rr0.org's own <rr0-search> attaches a closed shadow root, so
    // its input never appears in composedPath() — the path stops at the host. A document-level
    // listener testing "did this come from an input?" therefore saw a custom element, decided it
    // had not, and Backspace in the site's search box asked to delete the shape being edited.
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true)
    const element = mount()
    ;(element.shadowRoot!.getElementById("add-shape") as HTMLButtonElement).click()
    const host = document.createElement("div")
    document.body.appendChild(host)
    const closed = host.attachShadow({ mode: "closed" })
    const search = document.createElement("input")
    closed.appendChild(search)
    search.focus()

    search.dispatchEvent(new KeyboardEvent("keydown", { key: "Backspace", bubbles: true, composed: true }))

    expect(confirmSpy).not.toHaveBeenCalled()
    const sourceIds = element.sightingData.timeline.keyframes.flatMap(k => k.shapes.map(s => s.sourceId))
    expect(sourceIds).toEqual(["ufo-1", "ufo-2"])
    confirmSpy.mockRestore()
  })

  it("takes the focus when the canvas is used, so its own keys reach it at all", () => {
    const element = mount()
    const canvas = nestedUfo(element)!.shadowRoot!.getElementById("canvas") as HTMLCanvasElement
    vi.spyOn(canvas, "getBoundingClientRect").mockReturnValue({ left: 0, top: 0, width: 640, height: 360 } as DOMRect)
    const foreign = document.createElement("input")
    document.body.appendChild(foreign)
    foreign.focus()
    expect(document.activeElement).toBe(foreign)

    // jsdom has no global PointerEvent — a plain MouseEvent dispatched as "pointerdown" is what
    // the rest of this file uses, and what the element listens for.
    canvas.dispatchEvent(new MouseEvent("pointerdown", { clientX: 320, clientY: 180, bubbles: true }))

    // The canvas takes no focus of its own, so the editor has to be the thing that holds it.
    expect(document.activeElement).toBe(element)
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

    expect(element.sightingData.witnessTrack?.keyframes).toEqual([{ t: 0, pose: { lat: undefined, lng: undefined, elevationM: 0, headingDeg: 20, pitchDeg: 10, fovDeg: 60 } }])
    // The shape itself must be untouched — this was a landscape drag, not a shape drag.
    expect(element.sightingData.timeline.keyframes[0].shapes[0].shape.bounds).toEqual({ x: 100, y: 100, width: 20, height: 20 })
  })

  it("a landscape drag wraps heading past 360 back to 0, same as typing it", () => {
    const element = mount()
    element.sightingData = {
      version: 1,
      witnessTrack: { keyframes: [{ t: 0, pose: { lat: undefined, lng: undefined, elevationM: 0, headingDeg: 350, pitchDeg: 0, fovDeg: 60 } }] },
      timeline: { keyframes: [] }
    }
    const canvas = nestedCanvas(element)

    dragFromTo(canvas, { x: 300, y: 300 }, { x: 400, y: 300 }) // +100px right = +20deg: 350 -> 370 -> wraps to 10

    expect(element.sightingData.witnessTrack?.keyframes[0].pose.headingDeg).toBe(10)
  })

  it("a landscape drag clamps pitch to [-90, 90]", () => {
    const element = mount()
    const canvas = nestedCanvas(element)

    dragFromTo(canvas, { x: 300, y: 300 }, { x: 300, y: -300 }) // dy=-600 (far up) = +120deg, clamped to 90

    expect(element.sightingData.witnessTrack?.keyframes[0].pose.pitchDeg).toBe(90)
  })

  it("does not start a landscape drag while playing", () => {
    const element = mount()
    element.sightingData = {
      version: 1,
      witnessTrack: { keyframes: [{ t: 0, pose: { lat: undefined, lng: undefined, elevationM: 0, headingDeg: 0, pitchDeg: 0, fovDeg: 60 } }] },
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

    expect(element.sightingData.witnessTrack?.keyframes[0].pose.headingDeg).toBe(0)
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

  function pressKey(element: UfoRecorderElement, key: string, options: { shiftKey?: boolean } = {}): void {
    element.dispatchEvent(new KeyboardEvent("keydown", { key, shiftKey: options.shiftKey ?? false, bubbles: true, composed: true }))
  }

  it("arrow keys move the selected shape by a fixed step", () => {
    const element = mount()
    element.sightingData = oneShapeJson()
    pressKey(element, "ArrowRight")
    pressKey(element, "ArrowDown")

    expect(element.sightingData.timeline.keyframes[0].shapes[0].shape.bounds).toEqual({ x: 104, y: 104, width: 20, height: 20 })
  })

  it("Shift+arrow resizes the selected shape instead, growing/shrinking around its center", () => {
    const element = mount()
    element.sightingData = oneShapeJson()
    pressKey(element, "ArrowRight", { shiftKey: true }) // widen
    pressKey(element, "ArrowUp", { shiftKey: true }) // shrink height

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
    pressKey(element, "ArrowLeft", { shiftKey: true })
    pressKey(element, "ArrowUp", { shiftKey: true })

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
    pressKey(element, "ArrowRight")
    recordButton.click()

    expect(element.sightingData.timeline.keyframes[0].shapes[0].shape.bounds).toEqual({ x: 100, y: 100, width: 20, height: 20 })
  })
})

describe("UfoRecorderElement duration input", () => {
  afterEach(() => {
    document.body.innerHTML = ""
  })

  function setInput(shadow: ShadowRoot, id: string, value: string): void {
    const input = shadow.getElementById(id) as HTMLInputElement
    input.value = value
    input.dispatchEvent(new Event("input"))
  }

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

  it("flags Duration as invalid on a freshly mounted element (nothing set yet)", () => {
    const element = mount()
    const durationInput = element.shadowRoot!.getElementById("durationSeconds") as HTMLInputElement
    expect(durationInput.classList.contains("invalid")).toBe(true)
    expect(durationInput.getAttribute("aria-invalid")).toBe("true")
  })

  it("clears the invalid flag once a value is typed", () => {
    const element = mount()
    const durationInput = element.shadowRoot!.getElementById("durationSeconds") as HTMLInputElement
    durationInput.value = "45"
    durationInput.dispatchEvent(new Event("input"))

    expect(durationInput.classList.contains("invalid")).toBe(false)
    expect(durationInput.getAttribute("aria-invalid")).toBe("false")
  })

  it("auto-fills Duration from start/end dates when no explicit duration is set, and clears the invalid flag", () => {
    const element = mount()
    const shadow = element.shadowRoot!
    const durationInput = shadow.getElementById("durationSeconds") as HTMLInputElement
    setInput(shadow, "obs-time", "1965-07-01T05:00")
    setInput(shadow, "obs-end-time", "1965-07-01T05:10")

    expect(durationInput.value).toBe("600") // 10 minutes
    expect(durationInput.classList.contains("invalid")).toBe(false)
    expect(element.sightingData.durationSeconds).toBeUndefined() // derived, not persisted as explicit
  })

  it("an explicit Duration value overrides the one computed from start/end dates", () => {
    const element = mount()
    const shadow = element.shadowRoot!
    const durationInput = shadow.getElementById("durationSeconds") as HTMLInputElement
    setInput(shadow, "obs-time", "1965-07-01T05:00")
    setInput(shadow, "obs-end-time", "1965-07-01T05:10")

    durationInput.value = "30"
    durationInput.dispatchEvent(new Event("input"))

    expect(element.sightingData.durationSeconds).toBe(30)
  })

  it("leaves Duration invalid with an explanatory title when start/end are known to different precisions", () => {
    const element = mount()
    const shadow = element.shadowRoot!
    const durationInput = shadow.getElementById("durationSeconds") as HTMLInputElement
    setInput(shadow, "obs-time", "2025-06-15") // date only, no time of day
    setInput(shadow, "obs-end-time", "2025-06-15T14:50")

    expect(durationInput.value).toBe("")
    expect(durationInput.classList.contains("invalid")).toBe(true)
    expect(durationInput.title).not.toBe("")
  })

  it("still computes a duration when only one side has seconds — a missing second defaults to :00, not a blocking mismatch", () => {
    const element = mount()
    const shadow = element.shadowRoot!
    const durationInput = shadow.getElementById("durationSeconds") as HTMLInputElement
    setInput(shadow, "obs-time", "1926-08-12T10:18")
    setInput(shadow, "obs-end-time", "1926-08-12T10:20:30")

    expect(durationInput.value).toBe("150") // 2m30s
    expect(durationInput.classList.contains("invalid")).toBe(false)
  })

  it("does not clobber Duration's in-progress value while it's focused", () => {
    const element = mount()
    const durationInput = element.shadowRoot!.getElementById("durationSeconds") as HTMLInputElement
    durationInput.focus()
    durationInput.value = "4"
    durationInput.dispatchEvent(new Event("input"))

    expect(durationInput.value).toBe("4")
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
      witness: { id: "chiles" },
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

  it("falls back to a generic file name when there's no witness", () => {
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

describe("UfoRecorderElement import controls", () => {
  afterEach(() => {
    document.body.innerHTML = ""
    vi.unstubAllGlobals()
  })

  // `files` is normally read-only (only the browser's own file picker can set it) — this is the
  // standard jsdom/testing-library trick to inject a fake FileList for a "change" event.
  function setFile(input: HTMLInputElement, content: string): void {
    const file = new File([content], "sighting.json", { type: "application/json" })
    Object.defineProperty(input, "files", { value: [file], configurable: true })
    input.dispatchEvent(new Event("change"))
  }

  it("loads a sighting from a picked file, then resets the input", async () => {
    const element = mount()
    const fileInput = element.shadowRoot!.getElementById("import-file") as HTMLInputElement
    setFile(fileInput, JSON.stringify({ version: 1, witness: { id: "chiles" }, timeline: { keyframes: [] } }))
    // FileReader.readAsText is genuinely async (a task, not a microtask) — a single setTimeout(0)
    // isn't reliably enough ticks for it to have fired its "load" event yet.
    await waitFor(() => element.sightingData.witness !== undefined)

    expect(element.sightingData.witness).toEqual({ id: "chiles" })
    expect(fileInput.value).toBe("")
  })

  it("alerts and leaves sightingData unchanged when the picked file isn't valid JSON", async () => {
    const element = mount()
    const alertSpy = vi.spyOn(window, "alert").mockImplementation(() => {})
    const before = element.sightingData
    const fileInput = element.shadowRoot!.getElementById("import-file") as HTMLInputElement
    setFile(fileInput, "not json")
    await waitFor(() => alertSpy.mock.calls.length > 0)

    expect(alertSpy).toHaveBeenCalledOnce()
    expect(element.sightingData).toEqual(before)
  })

  it("loads a sighting fetched from the URL field", async () => {
    const element = mount()
    const json = { version: 1, witness: { id: "wilcox" }, timeline: { keyframes: [] } }
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve(json) }))
    const urlInput = element.shadowRoot!.getElementById("import-url") as HTMLInputElement
    urlInput.value = "https://example.org/sighting.json"
    const loadButton = element.shadowRoot!.getElementById("import-url-button") as HTMLButtonElement
    loadButton.click()
    await new Promise(resolve => setTimeout(resolve, 0))

    expect(element.sightingData.witness).toEqual({ id: "wilcox" })
  })

  it("does nothing when the URL field is empty", () => {
    const element = mount()
    const fetchMock = vi.fn()
    vi.stubGlobal("fetch", fetchMock)
    const loadButton = element.shadowRoot!.getElementById("import-url-button") as HTMLButtonElement
    loadButton.click()

    expect(fetchMock).not.toHaveBeenCalled()
  })

  it("alerts on a failed fetch (non-ok response)", async () => {
    const element = mount()
    const alertSpy = vi.spyOn(window, "alert").mockImplementation(() => {})
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 404 }))
    const urlInput = element.shadowRoot!.getElementById("import-url") as HTMLInputElement
    urlInput.value = "https://example.org/missing.json"
    const loadButton = element.shadowRoot!.getElementById("import-url-button") as HTMLButtonElement
    loadButton.click()
    await new Promise(resolve => setTimeout(resolve, 0))

    expect(alertSpy).toHaveBeenCalledOnce()
  })
})

describe("UfoRecorderElement sound keyframes over time", () => {
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

  it("offers every SoundKind, built from the model rather than from markup", () => {
    const element = mount()
    const options = [...(element.shadowRoot!.getElementById("soundKind") as HTMLSelectElement).options]
    expect(options.map(option => option.value)).toEqual(SOUND_KINDS)
    expect(options.every(option => option.textContent !== "")).toBe(true)
  })

  // The case this whole feature was asked for: an object silent on the ground, heard only once it
  // takes off — which is exactly two keyframes at two instants, not one sound for the sighting.
  it("records a sound keyframe at the scrubbed-to instant, not always at t=0", () => {
    const element = mount()
    element.sightingData = { version: 1, timeline: { keyframes: [] }, durationSeconds: 10 }
    const shadow = element.shadowRoot!
    setInput(shadow, "soundKind", "none")
    seekNestedUfoTo(element, 4000)
    setInput(shadow, "soundKind", "hum")
    setInput(shadow, "soundVolume", "0.8")

    const keyframes = element.sightingData.soundTrack?.keyframes ?? []
    expect(keyframes.map(keyframe => keyframe.t)).toEqual([0, 4000])
    expect(keyframes[0].sound.kind).toBe("none")
    expect(keyframes[1].sound).toMatchObject({ kind: "hum", volume: 0.8 })
  })

  it("resyncs the sound fields to whatever the track says at the scrubbed-to instant", () => {
    const element = mount()
    element.sightingData = {
      version: 1,
      durationSeconds: 10,
      timeline: { keyframes: [] },
      soundTrack: {
        keyframes: [
          { t: 0, sound: { kind: "none", volume: 0, pitchHz: 100 } },
          { t: 4000, sound: { kind: "whistle", volume: 1, pitchHz: 900 } }
        ]
      }
    }
    const shadow = element.shadowRoot!
    seekNestedUfoTo(element, 4000)
    expect((shadow.getElementById("soundKind") as HTMLSelectElement).value).toBe("whistle")
    expect((shadow.getElementById("soundVolume") as HTMLInputElement).value).toBe("1")
    expect((shadow.getElementById("soundPitch") as HTMLInputElement).value).toBe("900")
    expect(shadow.getElementById("sound-pitch-value")!.textContent).toBe("900 Hz")
  })

  it("disables the fields a silent sighting has no use for, and the pitch a real recording carries itself", () => {
    const element = mount()
    element.sightingData = { version: 1, timeline: { keyframes: [] }, durationSeconds: 10 }
    const shadow = element.shadowRoot!
    setInput(shadow, "soundKind", "none")
    expect((shadow.getElementById("soundVolume") as HTMLInputElement).disabled).toBe(true)
    expect((shadow.getElementById("soundPitch") as HTMLInputElement).disabled).toBe(true)

    setInput(shadow, "soundKind", "hum")
    expect((shadow.getElementById("soundVolume") as HTMLInputElement).disabled).toBe(false)
    expect((shadow.getElementById("soundPitch") as HTMLInputElement).disabled).toBe(false)

    setInput(shadow, "soundSrc", "https://example.org/hum.ogg")
    expect((shadow.getElementById("soundPitch") as HTMLInputElement).disabled).toBe(true)
    expect(element.sightingData.soundTrack?.keyframes[0].sound.src).toBe("https://example.org/hum.ogg")
  })

  it("treats a blank recording URL as no recording at all", () => {
    const element = mount()
    element.sightingData = { version: 1, timeline: { keyframes: [] }, durationSeconds: 10 }
    const shadow = element.shadowRoot!
    setInput(shadow, "soundKind", "hum")
    setInput(shadow, "soundSrc", "   ")
    expect(element.sightingData.soundTrack?.keyframes[0].sound.src).toBeUndefined()
  })
})

describe("UfoRecorderElement toolbar groups", () => {
  afterEach(() => {
    document.body.innerHTML = ""
  })

  it("renders each field group as a collapsible <details>, open by default", () => {
    const element = mount()
    const groups = element.shadowRoot!.querySelectorAll("details")
    expect(groups.length).toBe(7)
    for (const group of groups) {
      expect(group.hasAttribute("open")).toBe(true)
    }
  })

  it("orders groups observation, witness, location, temporal, circumstances, sound, shape — closest to the render last, recording merged into shape, decor's own fields folded into location/witness", () => {
    const element = mount()
    const summaries = [...element.shadowRoot!.querySelectorAll("details summary")].map(s => s.id)
    expect(summaries).toEqual([
      "label-observation-group",
      "label-witness-group",
      "label-location-group",
      "label-temporal-group",
      "label-circumstances-group",
      "label-sound-group",
      "label-shape-group"
    ])
  })

  it("keeps the record button and sampling rate inside the shape group", () => {
    const element = mount()
    const shapeDetails = element.shadowRoot!.getElementById("label-shape-group")!.closest("details")!
    expect(shapeDetails.querySelector("#record")).not.toBeNull()
    expect(shapeDetails.querySelector("#samplingRate")).not.toBeNull()
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
    await waitFor(() => addShapeButton.title === "Ajouter une forme")

    expect(element.shadowRoot!.getElementById("label-color")!.textContent).toBe("Couleur")
    expect(element.shadowRoot!.getElementById("label-duration")!.textContent).toBe("Durée")
    expect(element.shadowRoot!.getElementById("export")!.textContent).toBe("Exporter le JSON")
    expect(element.shadowRoot!.getElementById("preset-oval")!.textContent).toBe("Ovale")
    const durationInput = element.shadowRoot!.getElementById("durationSeconds") as HTMLInputElement
    expect(durationInput.placeholder).toBe("durée de l'observation")
    const recordButton = element.shadowRoot!.getElementById("record") as HTMLButtonElement
    expect(recordButton.title).toBe("Enregistrer")
    const deleteShapeButton = element.shadowRoot!.getElementById("delete-shape") as HTMLButtonElement
    expect(deleteShapeButton.title).toBe("Supprimer la forme")

    spy.mockRestore()
  })

  it("falls back to the English defaults when navigator.languages has no supported match", async () => {
    const spy = vi.spyOn(navigator, "languages", "get").mockReturnValue(["de-DE", "de"])
    const element = mount()
    await new Promise(resolve => setTimeout(resolve, 20)) // no fr/en module load is triggered; just let any microtasks settle

    expect(element.shadowRoot!.getElementById("add-shape")!.title).toBe("Add shape")
    expect(element.shadowRoot!.getElementById("delete-shape")!.title).toBe("Delete shape")
    spy.mockRestore()
  })
})

describe("UfoRecorderElement multi-select", () => {
  afterEach(() => {
    document.body.innerHTML = ""
  })

  function nestedCanvas(element: UfoRecorderElement): HTMLCanvasElement {
    const canvas = nestedUfo(element)!.shadowRoot!.getElementById("canvas") as HTMLCanvasElement
    vi.spyOn(canvas, "getBoundingClientRect").mockReturnValue({ left: 0, top: 0, width: 640, height: 360 } as DOMRect)
    return canvas
  }

  function clickAt(canvas: HTMLCanvasElement, x: number, y: number, options: { shiftKey?: boolean } = {}): void {
    canvas.dispatchEvent(new MouseEvent("pointerdown", { clientX: x, clientY: y, shiftKey: options.shiftKey ?? false }))
    document.dispatchEvent(new MouseEvent("pointerup", { clientX: x, clientY: y }))
  }

  function dragFromTo(canvas: HTMLCanvasElement, from: { x: number; y: number }, to: { x: number; y: number }, options: { shiftKey?: boolean } = {}): void {
    canvas.dispatchEvent(new MouseEvent("pointerdown", { clientX: from.x, clientY: from.y, shiftKey: options.shiftKey ?? false }))
    document.dispatchEvent(new MouseEvent("pointermove", { clientX: to.x, clientY: to.y }))
    document.dispatchEvent(new MouseEvent("pointerup", { clientX: to.x, clientY: to.y }))
  }

  function rightClickAt(canvas: HTMLCanvasElement, x: number, y: number): void {
    canvas.dispatchEvent(new MouseEvent("contextmenu", { clientX: x, clientY: y, bubbles: true, cancelable: true, composed: true }))
  }

  function pressKey(element: UfoRecorderElement, key: string, options: { shiftKey?: boolean } = {}): void {
    element.dispatchEvent(new KeyboardEvent("keydown", { key, shiftKey: options.shiftKey ?? false, bubbles: true }))
  }

  function selectedIdsOf(element: UfoRecorderElement): string[] {
    const ufo = nestedUfo(element) as unknown as { selectedSourceIds: Set<string> }
    return [...ufo.selectedSourceIds].sort()
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

  function threeShapesJson() {
    return {
      version: 1 as const,
      timeline: {
        keyframes: [
          {
            t: 0,
            shapes: [
              { sourceId: "ufo-1", shape: { kind: "oval" as const, bounds: { x: 0, y: 0, width: 20, height: 20 }, color: "#39ff14", angle: 0, transparency: 0, haloScale: 0, selected: false } },
              { sourceId: "ufo-2", shape: { kind: "oval" as const, bounds: { x: 100, y: 100, width: 20, height: 20 }, color: "#ff0000", angle: 0, transparency: 0, haloScale: 0, selected: false } },
              { sourceId: "ufo-3", shape: { kind: "oval" as const, bounds: { x: 200, y: 200, width: 20, height: 20 }, color: "#0000ff", angle: 0, transparency: 0, haloScale: 0, selected: false } }
            ]
          }
        ]
      }
    } // z-order: ufo-1 (back), ufo-2, ufo-3 (front)
  }

  it("shift-click adds a shape to the selection instead of replacing it", () => {
    const element = mount()
    element.sightingData = twoShapesJson()
    const canvas = nestedCanvas(element)
    clickAt(canvas, 10, 10) // selects ufo-1

    clickAt(canvas, 105, 105, { shiftKey: true }) // adds ufo-2

    expect(selectedIdsOf(element)).toEqual(["ufo-1", "ufo-2"])
  })

  it("shift-clicking an already-selected shape removes it from the selection", () => {
    const element = mount()
    element.sightingData = twoShapesJson()
    const canvas = nestedCanvas(element)
    clickAt(canvas, 10, 10)
    clickAt(canvas, 105, 105, { shiftKey: true }) // both selected

    clickAt(canvas, 105, 105, { shiftKey: true }) // removes ufo-2 again

    expect(selectedIdsOf(element)).toEqual(["ufo-1"])
  })

  it("shift-clicking away the last remaining selected shape is a no-op — the selection never empties", () => {
    const element = mount()
    element.sightingData = twoShapesJson()
    const canvas = nestedCanvas(element)
    clickAt(canvas, 10, 10) // only ufo-1 selected

    clickAt(canvas, 10, 10, { shiftKey: true })

    expect(selectedIdsOf(element)).toEqual(["ufo-1"])
  })

  it("plain click on a shape not already selected collapses the selection to just that shape", () => {
    const element = mount()
    element.sightingData = threeShapesJson()
    const canvas = nestedCanvas(element)
    clickAt(canvas, 10, 10)
    clickAt(canvas, 105, 105, { shiftKey: true }) // ufo-1 + ufo-2 selected

    clickAt(canvas, 205, 205) // plain click on ufo-3, not part of the current selection

    expect(selectedIdsOf(element)).toEqual(["ufo-3"])
  })

  it("dragging an already-selected multi-selection moves every member by the same delta", () => {
    const element = mount()
    element.sightingData = twoShapesJson()
    const canvas = nestedCanvas(element)
    clickAt(canvas, 10, 10)
    clickAt(canvas, 105, 105, { shiftKey: true }) // both ufo-1 and ufo-2 selected

    dragFromTo(canvas, { x: 10, y: 10 }, { x: 30, y: 25 }) // dx=+20, dy=+15, starting inside ufo-1's body

    expect(selectedIdsOf(element)).toEqual(["ufo-1", "ufo-2"]) // selection survives the drag
    const shapes = element.sightingData.timeline.keyframes[0].shapes
    expect(shapes.find(s => s.sourceId === "ufo-1")!.shape.bounds).toMatchObject({ x: 20, y: 15 })
    expect(shapes.find(s => s.sourceId === "ufo-2")!.shape.bounds).toMatchObject({ x: 120, y: 115 })
  })

  it("shift-clicking a grouped shape selects/deselects the whole group at once", () => {
    const element = mount()
    element.sightingData = threeShapesJson()
    const canvas = nestedCanvas(element)
    clickAt(canvas, 10, 10)
    clickAt(canvas, 105, 105, { shiftKey: true })
    const groupButton = element.shadowRoot!.getElementById("context-group") as HTMLButtonElement
    rightClickAt(canvas, 105, 105) // re-open the menu for the current ufo-1+ufo-2 selection
    groupButton.click() // ufo-1 and ufo-2 are now a group

    clickAt(canvas, 205, 205) // plain click on the ungrouped ufo-3 first — selection is now just {ufo-3}
    clickAt(canvas, 105, 105, { shiftKey: true }) // shift-click one grouped member (ufo-2) — adds its whole group

    expect(selectedIdsOf(element)).toEqual(["ufo-1", "ufo-2", "ufo-3"]) // the whole group added on top of ufo-3

    clickAt(canvas, 105, 105, { shiftKey: true }) // shift-click it again — removes the whole group as one unit

    expect(selectedIdsOf(element)).toEqual(["ufo-3"]) // only ufo-3 (never part of the group) remains
  })

  it("clicking any single grouped shape re-selects the whole group", () => {
    const element = mount()
    element.sightingData = twoShapesJson()
    const canvas = nestedCanvas(element)
    clickAt(canvas, 10, 10)
    clickAt(canvas, 105, 105, { shiftKey: true })
    const groupButton = element.shadowRoot!.getElementById("context-group") as HTMLButtonElement
    rightClickAt(canvas, 105, 105)
    groupButton.click()

    clickAt(canvas, 10, 10) // plain click on just one member

    expect(selectedIdsOf(element)).toEqual(["ufo-1", "ufo-2"])
  })

  it("Group is disabled with fewer than 2 shapes selected, enabled with 2+", () => {
    const element = mount()
    element.sightingData = twoShapesJson()
    const canvas = nestedCanvas(element)
    const groupButton = element.shadowRoot!.getElementById("context-group") as HTMLButtonElement

    rightClickAt(canvas, 10, 10) // selects only ufo-1
    expect(groupButton.disabled).toBe(true)
    expect(groupButton.title).toBe("Select at least two shapes to group them")

    clickAt(canvas, 105, 105, { shiftKey: true }) // add ufo-2 to the selection
    rightClickAt(canvas, 105, 105)
    expect(groupButton.disabled).toBe(false)
    expect(groupButton.title).toBe("")
  })

  it("Ungroup is disabled unless the current shape is actually grouped", () => {
    const element = mount()
    element.sightingData = twoShapesJson()
    const canvas = nestedCanvas(element)
    const ungroupButton = element.shadowRoot!.getElementById("context-ungroup") as HTMLButtonElement

    rightClickAt(canvas, 10, 10)
    expect(ungroupButton.disabled).toBe(true)
    expect(ungroupButton.title).toBe("This shape isn't part of a group")

    clickAt(canvas, 105, 105, { shiftKey: true })
    const groupButton = element.shadowRoot!.getElementById("context-group") as HTMLButtonElement
    rightClickAt(canvas, 105, 105)
    groupButton.click()

    rightClickAt(canvas, 10, 10) // right-click a (now grouped) member
    expect(ungroupButton.disabled).toBe(false)
  })

  it("Ungroup dissolves the whole group — a later click on either shape selects only itself", () => {
    const element = mount()
    element.sightingData = threeShapesJson()
    const canvas = nestedCanvas(element)
    clickAt(canvas, 10, 10)
    clickAt(canvas, 105, 105, { shiftKey: true }) // ufo-1 + ufo-2
    const groupButton = element.shadowRoot!.getElementById("context-group") as HTMLButtonElement
    rightClickAt(canvas, 105, 105)
    groupButton.click()

    const ungroupButton = element.shadowRoot!.getElementById("context-ungroup") as HTMLButtonElement
    rightClickAt(canvas, 10, 10)
    ungroupButton.click()

    clickAt(canvas, 205, 205) // reset the selection away from the (now former) group first
    clickAt(canvas, 10, 10) // then click just ufo-1 again

    expect(selectedIdsOf(element)).toEqual(["ufo-1"])
  })

  it("Ungroup immediately collapses the selection to the anchor shape — a visible signal something happened", () => {
    const element = mount()
    element.sightingData = twoShapesJson()
    const canvas = nestedCanvas(element)
    clickAt(canvas, 10, 10)
    clickAt(canvas, 105, 105, { shiftKey: true }) // ufo-1 + ufo-2
    const groupButton = element.shadowRoot!.getElementById("context-group") as HTMLButtonElement
    rightClickAt(canvas, 105, 105)
    groupButton.click()

    const ungroupButton = element.shadowRoot!.getElementById("context-ungroup") as HTMLButtonElement
    rightClickAt(canvas, 10, 10) // right-clicking a still-selected member doesn't collapse first
    expect(selectedIdsOf(element)).toEqual(["ufo-1", "ufo-2"]) // still both, right up to the click

    ungroupButton.click()

    expect(selectedIdsOf(element)).toEqual(["ufo-1"]) // collapsed with no extra click needed
  })

  it("bulk delete asks a pluralized confirmation and refuses to delete every shape", () => {
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true)
    const element = mount()
    element.sightingData = twoShapesJson()
    const canvas = nestedCanvas(element)
    clickAt(canvas, 10, 10)
    clickAt(canvas, 105, 105, { shiftKey: true }) // both selected — deleting both would empty the recording

    const deleteShapeButton = element.shadowRoot!.getElementById("delete-shape") as HTMLButtonElement
    expect(deleteShapeButton.disabled).toBe(true) // refused before any confirm dialog

    element.sightingData = threeShapesJson()
    clickAt(canvas, 10, 10)
    clickAt(canvas, 105, 105, { shiftKey: true }) // 2 of 3 selected — a real, allowed bulk delete

    deleteShapeButton.click()

    expect(confirmSpy).toHaveBeenCalledWith("Delete 2 shapes? This can't be undone.")
    const sourceIds = element.sightingData.timeline.keyframes[0].shapes.map(s => s.sourceId)
    expect(sourceIds).toEqual(["ufo-3"])
    confirmSpy.mockRestore()
  })

  it("bulk bring-to-front/send-to-back preserve the selected shapes' own relative order", () => {
    const element = mount()
    element.sightingData = threeShapesJson() // z-order: ufo-1, ufo-2, ufo-3
    const canvas = nestedCanvas(element)
    clickAt(canvas, 10, 10) // ufo-1
    clickAt(canvas, 205, 205, { shiftKey: true }) // + ufo-3 (non-adjacent to ufo-1)
    const frontButton = element.shadowRoot!.getElementById("context-bring-to-front") as HTMLButtonElement
    rightClickAt(canvas, 10, 10)

    frontButton.click()

    // ufo-2 (unselected) stays where the selection left it; ufo-1/ufo-3 move to the front as a
    // block, preserving their own relative order (ufo-1 was behind ufo-3 before, stays behind it).
    expect(element.sightingData.timeline.order).toEqual(["ufo-2", "ufo-1", "ufo-3"])

    // Reset the selection cleanly first — bringSelectedToFront doesn't itself change
    // selectedSourceIds, and re-shift-clicking an already-selected ufo-3 would toggle it OFF
    // instead of re-adding it.
    clickAt(canvas, 105, 105) // plain click on the unselected ufo-2 first
    clickAt(canvas, 10, 10) // plain click on ufo-1 (not currently selected) -> selection = {ufo-1}
    clickAt(canvas, 205, 205, { shiftKey: true }) // + ufo-3 -> {ufo-1, ufo-3}
    const backButton = element.shadowRoot!.getElementById("context-send-to-back") as HTMLButtonElement
    rightClickAt(canvas, 10, 10)
    backButton.click()

    expect(element.sightingData.timeline.order).toEqual(["ufo-1", "ufo-3", "ufo-2"])
  })

  it("group-resize scales both members proportionally via a shared corner handle", () => {
    const element = mount()
    element.sightingData = twoShapesJson() // ufo-1 (0,0,20,20), ufo-2 (100,100,20,20) -> group bbox (0,0,120,120)
    const canvas = nestedCanvas(element)
    clickAt(canvas, 10, 10)
    clickAt(canvas, 105, 105, { shiftKey: true })

    // "se" handle of the shared bbox is at (120,120); drag it out to (240,240) -> scale x2.
    dragFromTo(canvas, { x: 120, y: 120 }, { x: 240, y: 240 })

    const shapes = element.sightingData.timeline.keyframes[0].shapes
    expect(shapes.find(s => s.sourceId === "ufo-1")!.shape.bounds).toEqual({ x: 0, y: 0, width: 40, height: 40 })
    expect(shapes.find(s => s.sourceId === "ufo-2")!.shape.bounds).toEqual({ x: 200, y: 200, width: 40, height: 40 })
  })

  it("group-rotate revolves both members around the shared center and spins each shape's own angle", () => {
    const element = mount()
    element.sightingData = twoShapesJson() // ufo-1 (0,0,20,20), ufo-2 (100,100,20,20) -> group bbox (0,0,120,120), center (60,60)
    const canvas = nestedCanvas(element)
    clickAt(canvas, 10, 10)
    clickAt(canvas, 105, 105, { shiftKey: true })

    // Rotate handle sits at (60,-24) (center.x, bbox.top - 24). Drag it to (144,60) — a quarter
    // turn (delta = +PI/2) — start and end are both 84px from the group's center (60,60).
    dragFromTo(canvas, { x: 60, y: -24 }, { x: 144, y: 60 })

    const shapes = element.sightingData.timeline.keyframes[0].shapes
    const ufo1 = shapes.find(s => s.sourceId === "ufo-1")!.shape
    const ufo2 = shapes.find(s => s.sourceId === "ufo-2")!.shape
    // ufo-1's center (10,10) was 50px left+up of the group center -> swings to 50px right+down.
    expect(ufo1.bounds.x).toBeCloseTo(100)
    expect(ufo1.bounds.y).toBeCloseTo(0)
    // ufo-2's center (110,110) was 50px right+down of the group center -> swings to 50px left+up.
    expect(ufo2.bounds.x).toBeCloseTo(0)
    expect(ufo2.bounds.y).toBeCloseTo(100)
    // Widths/heights untouched — a rotate revolves position and spins angle, it never scales.
    expect(ufo1.bounds.width).toBe(20)
    expect(ufo2.bounds.width).toBe(20)
    // Each member's own angle advances by the same delta.
    expect(ufo1.angle).toBeCloseTo(Math.PI / 2)
    expect(ufo2.angle).toBeCloseTo(Math.PI / 2)
  })

  it("arrow keys nudge every selected shape by the same delta", () => {
    const element = mount()
    element.sightingData = twoShapesJson()
    const canvas = nestedCanvas(element)
    clickAt(canvas, 10, 10)
    clickAt(canvas, 105, 105, { shiftKey: true })

    pressKey(element, "ArrowRight")
    pressKey(element, "ArrowDown")

    const shapes = element.sightingData.timeline.keyframes[0].shapes
    expect(shapes.find(s => s.sourceId === "ufo-1")!.shape.bounds).toMatchObject({ x: 4, y: 4 })
    expect(shapes.find(s => s.sourceId === "ufo-2")!.shape.bounds).toMatchObject({ x: 104, y: 104 })
  })

  it("Shift+arrow resizes the group's shared bounding box, scaling every member", () => {
    const element = mount()
    element.sightingData = twoShapesJson() // group bbox (0,0,120,120)
    const canvas = nestedCanvas(element)
    clickAt(canvas, 10, 10)
    clickAt(canvas, 105, 105, { shiftKey: true })

    pressKey(element, "ArrowRight", { shiftKey: true }) // group bbox width 120 -> 124, symmetric about center

    const shapes = element.sightingData.timeline.keyframes[0].shapes
    // Both members scale by the same factor (124/120) and translate to match the new, still
    // center-anchored bbox — just confirm they both grew and stayed distinct, not exact pixels.
    expect(shapes.find(s => s.sourceId === "ufo-1")!.shape.bounds.width).toBeGreaterThan(20)
    expect(shapes.find(s => s.sourceId === "ufo-2")!.shape.bounds.width).toBeGreaterThan(20)
  })
})

describe("UfoRecorderElement playback controls", () => {
  afterEach(() => {
    document.body.innerHTML = ""
  })

  function setDuration(element: UfoRecorderElement, seconds: string): void {
    const durationInput = element.shadowRoot!.getElementById("durationSeconds") as HTMLInputElement
    durationInput.value = seconds
    durationInput.dispatchEvent(new Event("input"))
  }

  it("the external duration label uses real elapsed time, not the raw recording's own timeline-ms length", () => {
    const element = mount()
    // A 10-real-second raw recording (two keyframes 10000ms apart) with declared duration = the
    // same 10s, so playbackRate starts at 1 (raw timeline-ms == real-ms, the one case a naive
    // mm:ss-of-raw-value read would happen to get right by coincidence).
    element.sightingData = {
      version: 1,
      timeline: {
        keyframes: [
          { t: 0, shapes: [{ sourceId: "ufo-1", shape: { kind: "oval", bounds: { x: 0, y: 0, width: 10, height: 10 }, color: "#fff", angle: 0, transparency: 0, haloScale: 0, selected: false } }] },
          { t: 10_000, shapes: [{ sourceId: "ufo-1", shape: { kind: "oval", bounds: { x: 100, y: 0, width: 10, height: 10 }, color: "#fff", angle: 0, transparency: 0, haloScale: 0, selected: false } }] }
        ]
      }
    }
    setDuration(element, "10")
    const timeEndLabel = element.shadowRoot!.getElementById("time-end") as HTMLElement
    expect(timeEndLabel.textContent).toBe("0:10")

    // Now declare a shorter real duration (5s) *without* touching the raw 10000ms recording —
    // playbackRate becomes 2x, so raw timeline-ms no longer equals real-ms. Before the fix, this
    // label read seekableDuration (pinned to the raw recording's own length, 10000) directly as
    // if it were real ms, staying stuck at "0:10" — reproducing the exact user report ("les
    // compteurs de temps affichés restent à 10").
    setDuration(element, "5")

    expect(timeEndLabel.textContent).toBe("0:05")
    // Also matches whatever UfoElement's own (hidden) internal label computed — proves this is
    // reading the real delegated value, not a coincidence of this test's specific numbers.
    const nested = nestedUfo(element) as unknown as { durationLabel: string }
    expect(timeEndLabel.textContent).toBe(nested.durationLabel)
  })

  it("the nested ufo's own overlay toolbar is hidden — this recorder drives an external one instead", () => {
    const element = mount()
    const nestedToolbar = nestedUfo(element).shadowRoot!.getElementById("toolbar") as HTMLElement
    expect(nestedToolbar.classList.contains("hidden")).toBe(true)
  })

  it("Play/Pause is disabled with no known duration, and enabled once one is set", () => {
    const element = mount()
    const playPauseButton = element.shadowRoot!.getElementById("play-pause") as HTMLButtonElement
    expect(playPauseButton.disabled).toBe(true)
    expect(playPauseButton.title).toBe("No observation duration")

    setDuration(element, "5")

    expect(playPauseButton.disabled).toBe(false)
  })

  it("clicking Play/Pause toggles playback and its own icon/title", () => {
    const element = mount()
    setDuration(element, "5")
    const playPauseButton = element.shadowRoot!.getElementById("play-pause") as HTMLButtonElement

    playPauseButton.click()

    expect(playPauseButton.textContent).toBe("⏸")
    expect(playPauseButton.title).toBe("Pause")

    playPauseButton.click()

    expect(playPauseButton.textContent).toBe("▶")
    expect(playPauseButton.title).toBe("Play")
  })

  it("Loop toggles aria-pressed", () => {
    const element = mount()
    const loopButton = element.shadowRoot!.getElementById("loop") as HTMLButtonElement
    expect(loopButton.getAttribute("aria-pressed")).toBe("true")

    loopButton.click()

    expect(loopButton.getAttribute("aria-pressed")).toBe("false")
  })

  it("dragging the seek input moves the nested ufo's own currentTime", () => {
    const element = mount()
    setDuration(element, "10")
    const seekInput = element.shadowRoot!.getElementById("seek") as HTMLInputElement
    expect(Number(seekInput.max)).toBe(10_000)

    seekInput.value = "4000"
    seekInput.dispatchEvent(new Event("input"))

    const ufo = nestedUfo(element) as unknown as { currentTime: number }
    expect(ufo.currentTime).toBe(4000)
  })

  it("resyncs (max/value) after an unrelated timeline change, via the existing timeupdate mechanism", () => {
    const element = mount()
    setDuration(element, "5")
    const seekInput = element.shadowRoot!.getElementById("seek") as HTMLInputElement
    const addShapeButton = element.shadowRoot!.getElementById("add-shape") as HTMLButtonElement

    addShapeButton.click() // an unrelated edit — should still refresh the playback row

    expect(Number(seekInput.max)).toBe(5000)
  })
})

describe("UfoRecorderElement decor group", () => {
  afterEach(() => {
    document.body.innerHTML = ""
  })

  it("starts with no decor, showing only the Add row — the picker/delete button/property fields are hidden entirely, not just disabled", () => {
    const element = mount()
    expect(element.sightingData.decor).toEqual([])
    const shadow = element.shadowRoot!
    const rowHidden = (id: string) => {
      const el = shadow.getElementById(id) as HTMLElement
      return (el.closest("label") ?? el).hidden
    }
    expect((shadow.getElementById("delete-decor") as HTMLButtonElement).disabled).toBe(true)
    expect((shadow.getElementById("decorEast") as HTMLInputElement).disabled).toBe(true)
    expect(rowHidden("decor")).toBe(true)
    expect(rowHidden("delete-decor")).toBe(true)
    expect(rowHidden("decorTitle")).toBe(true)
    expect(rowHidden("decorEast")).toBe(true)
    expect(rowHidden("decorNorth")).toBe(true)
    expect(rowHidden("decorHeading")).toBe(true)
    expect(rowHidden("decorLit")).toBe(true)
    // The Add row itself is the one thing that's never hidden — always reachable even with
    // nothing to edit yet.
    expect((shadow.getElementById("add-decor-building") as HTMLElement).closest(".decor-add-row")).not.toBeNull()
    expect(((shadow.getElementById("add-decor-building") as HTMLElement).closest(".decor-add-row") as HTMLElement).hidden).toBe(false)
  })

  it("shows the picker/delete button/property fields again once a decor object exists", () => {
    const element = mount()
    const shadow = element.shadowRoot!
    const rowHidden = (id: string) => {
      const el = shadow.getElementById(id) as HTMLElement
      return (el.closest("label") ?? el).hidden
    }
    ;(shadow.getElementById("add-decor-building") as HTMLButtonElement).click()
    expect(rowHidden("decor")).toBe(false)
    expect(rowHidden("delete-decor")).toBe(false)
    expect(rowHidden("decorTitle")).toBe(false)
    expect(rowHidden("decorEast")).toBe(false)
  })

  it("hides only 'other witness' from the generic Decor group's own kind dropdown", () => {
    const element = mount()
    const shadow = element.shadowRoot!
    expect((shadow.getElementById("option-decor-building") as HTMLOptionElement).hidden).toBe(false)
    expect((shadow.getElementById("option-decor-witness") as HTMLOptionElement).hidden).toBe(true)
    expect((shadow.getElementById("option-decor-tree") as HTMLOptionElement).hidden).toBe(false)
  })

  it("adds a witness decor object from the Witness group's own button, not the generic dropdown", () => {
    const element = mount()
    const shadow = element.shadowRoot!
    ;(shadow.getElementById("add-decor-witness") as HTMLButtonElement).click()

    const decor = element.sightingData.decor!
    expect(decor).toHaveLength(1)
    expect(decor[0].kind).toBe("witness")
  })

  it("adds a building decor object (with its default floor count) when Building is picked in the Kind dropdown", () => {
    const element = mount()
    const shadow = element.shadowRoot!
    const kindSelect = shadow.getElementById("decorKind") as HTMLSelectElement
    kindSelect.value = "building"
    ;(shadow.getElementById("add-decor-building") as HTMLButtonElement).click()

    const decor = element.sightingData.decor!
    expect(decor).toHaveLength(1)
    expect(decor[0].kind).toBe("building")
    expect(decor[0].floors).toBe(2)
  })

  it("adds a decor object of the picked kind, offset from previously added ones", () => {
    const element = mount()
    const shadow = element.shadowRoot!
    const kindSelect = shadow.getElementById("decorKind") as HTMLSelectElement
    const addButton = shadow.getElementById("add-decor-building") as HTMLButtonElement

    kindSelect.value = "tree"
    addButton.click()
    kindSelect.value = "streetlight"
    addButton.click()

    const decor = element.sightingData.decor!
    expect(decor).toHaveLength(2)
    expect(decor[0].kind).toBe("tree")
    expect(decor[1].kind).toBe("streetlight")
    expect(decor[1].eastM).not.toBe(decor[0].eastM) // staggered, not stacked on the same spot

    const decorSelect = shadow.getElementById("decor") as HTMLSelectElement
    expect(decorSelect.options[1].value).toBe(decor[1].id)
    expect((shadow.getElementById("decorEast") as HTMLInputElement).disabled).toBe(false)
  })

  it("fills the Name field with the same numbered label the dropdown shows, so an untouched decor object is never nameless", () => {
    const element = mount()
    const shadow = element.shadowRoot!
    const kindSelect = shadow.getElementById("decorKind") as HTMLSelectElement
    const addButton = shadow.getElementById("add-decor-building") as HTMLButtonElement
    kindSelect.value = "streetlight"

    addButton.click()
    addButton.click()

    const decor = element.sightingData.decor!
    expect(decor.map(d => d.title)).toEqual(["Streetlight 1", "Streetlight 2"])
    const decorSelect = shadow.getElementById("decor") as HTMLSelectElement
    expect(decorSelect.options[1].textContent).toBe("Streetlight 2")
    const titleInput = shadow.getElementById("decorTitle") as HTMLInputElement
    expect(titleInput.value).toBe("Streetlight 2") // the just-added, now-selected one
  })

  it("flags the Name field invalid when cleared, clears the flag once it's non-empty again", () => {
    const element = mount()
    const shadow = element.shadowRoot!
    ;(shadow.getElementById("add-decor-building") as HTMLButtonElement).click()
    const titleInput = shadow.getElementById("decorTitle") as HTMLInputElement
    expect(titleInput.classList.contains("invalid")).toBe(false)

    titleInput.value = ""
    titleInput.dispatchEvent(new Event("input"))
    expect(titleInput.classList.contains("invalid")).toBe(true)
    expect(titleInput.getAttribute("aria-invalid")).toBe("true")

    titleInput.value = "Renamed"
    titleInput.dispatchEvent(new Event("input"))
    expect(titleInput.classList.contains("invalid")).toBe(false)
    expect(titleInput.getAttribute("aria-invalid")).toBe("false")
  })

  it("writes East/North/Heading edits back onto the selected decor object", () => {
    const element = mount()
    const shadow = element.shadowRoot!
    ;(shadow.getElementById("add-decor-building") as HTMLButtonElement).click()

    const eastInput = shadow.getElementById("decorEast") as HTMLInputElement
    const northInput = shadow.getElementById("decorNorth") as HTMLInputElement
    const headingInput = shadow.getElementById("decorHeading") as HTMLInputElement

    eastInput.value = "12.5"
    eastInput.dispatchEvent(new Event("input"))
    northInput.value = "-4"
    northInput.dispatchEvent(new Event("input"))
    headingInput.value = "90"
    headingInput.dispatchEvent(new Event("input"))

    const [decor] = element.sightingData.decor!
    expect(decor).toMatchObject({ eastM: 12.5, northM: -4, headingDeg: 90 })
  })

  it("records the Lit checkbox as a keyframe at the current playhead, not a plain static field", () => {
    const element = mount()
    const shadow = element.shadowRoot!
    const durationInput = shadow.getElementById("durationSeconds") as HTMLInputElement
    durationInput.value = "10"
    durationInput.dispatchEvent(new Event("input"))
    ;(shadow.getElementById("add-decor-building") as HTMLButtonElement).click()
    const litInput = shadow.getElementById("decorLit") as HTMLInputElement

    litInput.checked = true
    litInput.dispatchEvent(new Event("input"))

    const [decor] = element.sightingData.decor!
    expect(decor.litKeyframes).toEqual([{ t: 0, lit: true }])
  })

  it("resyncs the Lit checkbox from the resolved value as the playhead moves", () => {
    const element = mount()
    const shadow = element.shadowRoot!
    const durationInput = shadow.getElementById("durationSeconds") as HTMLInputElement
    durationInput.value = "10"
    durationInput.dispatchEvent(new Event("input"))
    ;(shadow.getElementById("add-decor-building") as HTMLButtonElement).click()
    const litInput = shadow.getElementById("decorLit") as HTMLInputElement
    litInput.checked = true
    litInput.dispatchEvent(new Event("input"))

    const seekInput = shadow.getElementById("seek") as HTMLInputElement
    seekInput.value = "5000"
    seekInput.dispatchEvent(new Event("input"))
    litInput.checked = false
    litInput.dispatchEvent(new Event("input"))

    expect(litInput.checked).toBe(false)
    seekInput.value = "0"
    seekInput.dispatchEvent(new Event("input"))
    expect(litInput.checked).toBe(true)

    const [decor] = element.sightingData.decor!
    expect(decor.litKeyframes).toEqual([
      { t: 0, lit: true },
      { t: 5000, lit: false }
    ])
  })

  it("deletes the selected decor object and falls back to whichever one remains, or none", () => {
    const element = mount()
    const shadow = element.shadowRoot!
    const addButton = shadow.getElementById("add-decor-building") as HTMLButtonElement
    const deleteButton = shadow.getElementById("delete-decor") as HTMLButtonElement
    addButton.click()
    addButton.click()
    expect(element.sightingData.decor).toHaveLength(2)

    deleteButton.click()
    expect(element.sightingData.decor).toHaveLength(1)
    deleteButton.click()
    expect(element.sightingData.decor).toEqual([])
    expect(deleteButton.disabled).toBe(true)
  })

  it("round-trips decor through the sightingData setter/getter", () => {
    const element = mount()
    element.sightingData = {
      version: 1,
      timeline: { keyframes: [] },
      decor: [{ id: "decor-1", kind: "streetlight", eastM: 5, northM: -8, lit: true }]
    }
    expect(element.sightingData.decor).toEqual([{ id: "decor-1", kind: "streetlight", eastM: 5, northM: -8, lit: true }])
  })

  it("names a decor object via the Name field, updating both the data and the dropdown label", () => {
    const element = mount()
    const shadow = element.shadowRoot!
    ;(shadow.getElementById("add-decor-building") as HTMLButtonElement).click()

    const titleInput = shadow.getElementById("decorTitle") as HTMLInputElement
    titleInput.value = "Streetlight on Elm St"
    titleInput.dispatchEvent(new Event("input"))

    expect(element.sightingData.decor![0].title).toBe("Streetlight on Elm St")
    const decorSelect = shadow.getElementById("decor") as HTMLSelectElement
    expect(decorSelect.options[0].textContent).toBe("Streetlight on Elm St")
  })

  it("round-trips a witness's own sightingUrl via the Witness group's URL field", () => {
    const element = mount()
    const shadow = element.shadowRoot!
    ;(shadow.getElementById("add-decor-witness") as HTMLButtonElement).click()

    const urlInput = shadow.getElementById("decorSightingUrl") as HTMLInputElement
    urlInput.value = "https://example.org/witness-2/sighting.json"
    urlInput.dispatchEvent(new Event("input"))

    expect(element.sightingData.decor![0].sightingUrl).toBe("https://example.org/witness-2/sighting.json")
  })

  it("gives a freshly created building/vehicle real windows on every side by default (50%, or FIXED_WINDOW_MIN_OPACITY_PERCENT on a fixed side) instead of starting as a windowless box", () => {
    const element = mount()
    const shadow = element.shadowRoot!
    const kindSelect = shadow.getElementById("decorKind") as HTMLSelectElement
    kindSelect.value = "building"
    ;(shadow.getElementById("add-decor-building") as HTMLButtonElement).click()
    expect(element.sightingData.decor![0].windows).toEqual({ front: 50, behind: 50, left: 50, right: 50 })

    kindSelect.value = "vehicle"
    ;(shadow.getElementById("add-decor-building") as HTMLButtonElement).click()
    expect(element.sightingData.decor![1].windows).toEqual({
      front: 90,
      behind: 90,
      "front-left": 50,
      "front-right": 50,
      "behind-left": 50,
      "behind-right": 50
    })
  })

  it("writes the 4 window opacity inputs back onto the selected decor object's windows record, leaving the other (already-defaulted) sides alone — empty means no window at all", () => {
    const element = mount()
    const shadow = element.shadowRoot!
    const kindSelect = shadow.getElementById("decorKind") as HTMLSelectElement
    kindSelect.value = "building"
    ;(shadow.getElementById("add-decor-building") as HTMLButtonElement).click()

    const frontInput = shadow.getElementById("decorWindowFront") as HTMLInputElement
    frontInput.value = "0"
    frontInput.dispatchEvent(new Event("input"))
    const leftInput = shadow.getElementById("decorWindowLeft") as HTMLInputElement
    leftInput.value = "80"
    leftInput.dispatchEvent(new Event("input"))

    expect(element.sightingData.decor![0].windows).toEqual({ front: 0, behind: 50, left: 80, right: 50 })
  })

  it("clamps a fixed (non-openable) side's opacity up to FIXED_WINDOW_MIN_OPACITY_PERCENT even if a lower value is typed, but leaves an openable door window free down to 0", () => {
    const element = mount()
    const shadow = element.shadowRoot!
    const kindSelect = shadow.getElementById("decorKind") as HTMLSelectElement
    kindSelect.value = "vehicle"
    ;(shadow.getElementById("add-decor-building") as HTMLButtonElement).click()

    expect((shadow.getElementById("decorWindowFront") as HTMLInputElement).min).toBe("90")
    expect((shadow.getElementById("decorWindowBehind") as HTMLInputElement).min).toBe("90")
    expect((shadow.getElementById("decorWindowFrontLeft") as HTMLInputElement).min).toBe("0")
    expect((shadow.getElementById("decorWindowFrontRight") as HTMLInputElement).min).toBe("0")
    expect((shadow.getElementById("decorWindowBehindLeft") as HTMLInputElement).min).toBe("0")
    expect((shadow.getElementById("decorWindowBehindRight") as HTMLInputElement).min).toBe("0")

    const frontInput = shadow.getElementById("decorWindowFront") as HTMLInputElement
    frontInput.value = "10"
    frontInput.dispatchEvent(new Event("input"))
    const frontLeftInput = shadow.getElementById("decorWindowFrontLeft") as HTMLInputElement
    frontLeftInput.value = "10"
    frontLeftInput.dispatchEvent(new Event("input"))

    expect(element.sightingData.decor![0].windows).toEqual({
      front: 90,
      behind: 90,
      "front-left": 10,
      "front-right": 50,
      "behind-left": 50,
      "behind-right": 50
    })
  })

  it("shows the Occupied floor row alongside Floors as soon as it's a building, even before a witness location is picked", () => {
    const element = mount()
    const shadow = element.shadowRoot!
    const kindSelect = shadow.getElementById("decorKind") as HTMLSelectElement
    kindSelect.value = "building"
    ;(shadow.getElementById("add-decor-building") as HTMLButtonElement).click()

    const occupiedFloorInput = shadow.getElementById("decorOccupiedFloor") as HTMLInputElement
    expect(occupiedFloorInput.closest("label")!.hidden).toBe(false)

    occupiedFloorInput.value = "1"
    occupiedFloorInput.dispatchEvent(new Event("input"))
    expect(element.sightingData.decor![0].occupiedFloor).toBe(1)

    const witnessSideSelect = shadow.getElementById("decorWitnessSide") as HTMLSelectElement
    witnessSideSelect.value = "front"
    witnessSideSelect.dispatchEvent(new Event("change"))

    expect(occupiedFloorInput.closest("label")!.hidden).toBe(false)
    expect(element.sightingData.decor![0].witnessSide).toBe("front")
    expect(element.sightingData.decor![0].occupiedFloor).toBe(1) // the pre-set floor survives picking a location
  })

  it("never writes floors/occupiedFloor/witnessSide onto a non-building/non-witness-holding kind, even if the shared inputs still display a leftover value from a previously selected building", () => {
    // Regression test: editing an unrelated field (heading) on a freshly added vehicle right
    // after a building was selected used to silently write the building's own leftover `floors`
    // value onto the vehicle too, since decorFloorsInput/decorOccupiedFloorInput are single shared
    // elements reused across every decor object, and syncDecorFields fills them with a display
    // fallback (e.g. DEFAULT_BUILDING_FLOORS) even when the newly selected object has no such
    // field at all.
    const element = mount()
    const shadow = element.shadowRoot!
    const kindSelect = shadow.getElementById("decorKind") as HTMLSelectElement
    kindSelect.value = "building"
    ;(shadow.getElementById("add-decor-building") as HTMLButtonElement).click()

    kindSelect.value = "vehicle"
    ;(shadow.getElementById("add-decor-building") as HTMLButtonElement).click()

    const decorSelect = shadow.getElementById("decor") as HTMLSelectElement
    const vehicle = element.sightingData.decor!.find(d => d.kind === "vehicle")!
    decorSelect.value = vehicle.id
    decorSelect.dispatchEvent(new Event("change"))

    const headingInput = shadow.getElementById("decorHeading") as HTMLInputElement
    headingInput.value = "15"
    headingInput.dispatchEvent(new Event("input"))

    const updatedVehicle = element.sightingData.decor!.find(d => d.kind === "vehicle")!
    expect(updatedVehicle.floors).toBeUndefined()
    expect(updatedVehicle.occupiedFloor).toBeUndefined()
  })
})

describe("UfoRecorderElement decor context menu", () => {
  afterEach(() => {
    document.body.innerHTML = ""
  })

  function rightClickCanvas(element: UfoRecorderElement): void {
    const canvas = nestedUfo(element).shadowRoot!.querySelector("canvas")!
    canvas.getBoundingClientRect = () => ({ left: 0, top: 0, width: 800, height: 600 }) as DOMRect
    canvas.dispatchEvent(new MouseEvent("contextmenu", { bubbles: true, composed: true, clientX: 400, clientY: 300 }))
  }

  it("opens the decor menu (not the shape one) when the 3D pick hits a witness", () => {
    const element = mount()
    element.sightingData = {
      version: 1,
      timeline: { keyframes: [] },
      decor: [{ id: "decor-1", kind: "witness", eastM: 0, northM: 10, sightingUrl: "https://example.org/w.json" }]
    }
    const sceneEl = element.shadowRoot!.querySelector("rr0-scene") as unknown as { pickDecorAt: () => string }
    sceneEl.pickDecorAt = () => "decor-1"

    rightClickCanvas(element)

    expect((element.shadowRoot!.getElementById("decor-context-menu") as HTMLElement).hidden).toBe(false)
    expect((element.shadowRoot!.getElementById("context-menu") as HTMLElement).hidden).toBe(true)
    const viewButton = element.shadowRoot!.getElementById("context-view-testimony") as HTMLButtonElement
    expect(viewButton.disabled).toBe(false)
  })

  it("disables 'view testimony' (with an explanatory title) for a witness with no sightingUrl", () => {
    const element = mount()
    element.sightingData = {
      version: 1,
      timeline: { keyframes: [] },
      decor: [{ id: "decor-1", kind: "witness", eastM: 0, northM: 10 }]
    }
    const sceneEl = element.shadowRoot!.querySelector("rr0-scene") as unknown as { pickDecorAt: () => string }
    sceneEl.pickDecorAt = () => "decor-1"

    rightClickCanvas(element)

    const viewButton = element.shadowRoot!.getElementById("context-view-testimony") as HTMLButtonElement
    expect(viewButton.disabled).toBe(true)
    expect(viewButton.title).not.toBe("")
  })

  it("opens the decor menu for a non-witness decor kind too, but disables 'view testimony'", () => {
    const element = mount()
    element.sightingData = {
      version: 1,
      timeline: { keyframes: [] },
      decor: [{ id: "decor-1", kind: "tree", eastM: 0, northM: 10 }]
    }
    const sceneEl = element.shadowRoot!.querySelector("rr0-scene") as unknown as { pickDecorAt: () => string }
    sceneEl.pickDecorAt = () => "decor-1"

    rightClickCanvas(element)

    expect((element.shadowRoot!.getElementById("decor-context-menu") as HTMLElement).hidden).toBe(false)
    const viewButton = element.shadowRoot!.getElementById("context-view-testimony") as HTMLButtonElement
    expect(viewButton.disabled).toBe(true)
  })

  it("Masks flyout lists every shape as a checkbox, checked per DecorObject.occludesSourceIds", () => {
    const element = mount()
    element.sightingData = {
      version: 1,
      timeline: {
        keyframes: [
          {
            t: 0,
            shapes: [
              { sourceId: "ufo-1", shape: { kind: "oval", bounds: { x: 0, y: 0, width: 10, height: 10 }, color: "#fff", angle: 0, transparency: 0, haloScale: 0, selected: false } },
              { sourceId: "ufo-2", shape: { kind: "oval", bounds: { x: 20, y: 0, width: 10, height: 10 }, color: "#fff", angle: 0, transparency: 0, haloScale: 0, selected: false } }
            ]
          }
        ]
      },
      decor: [{ id: "decor-1", kind: "tree", eastM: 0, northM: 10, occludesSourceIds: ["ufo-2"] }]
    }
    const sceneEl = element.shadowRoot!.querySelector("rr0-scene") as unknown as { pickDecorAt: () => string }
    sceneEl.pickDecorAt = () => "decor-1"

    rightClickCanvas(element)

    const checkboxes = [...element.shadowRoot!.getElementById("context-masks-submenu")!.querySelectorAll("input[type=checkbox]")] as HTMLInputElement[]
    expect(checkboxes.map(c => c.checked)).toEqual([false, true])
  })

  it("toggling a Masks checkbox writes DecorObject.occludesSourceIds without closing the menu", () => {
    const element = mount()
    element.sightingData = {
      version: 1,
      timeline: {
        keyframes: [
          { t: 0, shapes: [{ sourceId: "ufo-1", shape: { kind: "oval", bounds: { x: 0, y: 0, width: 10, height: 10 }, color: "#fff", angle: 0, transparency: 0, haloScale: 0, selected: false } }] }
        ]
      },
      decor: [{ id: "decor-1", kind: "tree", eastM: 0, northM: 10 }]
    }
    const sceneEl = element.shadowRoot!.querySelector("rr0-scene") as unknown as { pickDecorAt: () => string }
    sceneEl.pickDecorAt = () => "decor-1"

    rightClickCanvas(element)
    const checkbox = element.shadowRoot!.querySelector("#context-masks-submenu input[type=checkbox]") as HTMLInputElement
    checkbox.checked = true
    checkbox.dispatchEvent(new Event("change", { bubbles: true }))

    expect(element.sightingData.decor?.[0].occludesSourceIds).toEqual(["ufo-1"])
    expect((element.shadowRoot!.getElementById("decor-context-menu") as HTMLElement).hidden).toBe(false)
  })

  it("loads the witness's own recording when 'view testimony' is clicked", async () => {
    const element = mount()
    element.sightingData = {
      version: 1,
      timeline: { keyframes: [] },
      decor: [{ id: "decor-1", kind: "witness", eastM: 0, northM: 10, sightingUrl: "https://example.org/w.json" }]
    }
    const sceneEl = element.shadowRoot!.querySelector("rr0-scene") as unknown as { pickDecorAt: () => string }
    sceneEl.pickDecorAt = () => "decor-1"
    const witnessJson = { version: 1 as const, witness: { id: "other-witness" }, timeline: { keyframes: [] } }
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue({ ok: true, json: async () => witnessJson } as Response)

    rightClickCanvas(element)
    ;(element.shadowRoot!.getElementById("context-view-testimony") as HTMLButtonElement).click()
    await new Promise(resolve => setTimeout(resolve, 0))

    expect(fetchSpy).toHaveBeenCalledWith("https://example.org/w.json")
    expect(element.sightingData.witness).toEqual({ id: "other-witness" })
    expect((element.shadowRoot!.getElementById("decor-context-menu") as HTMLElement).hidden).toBe(true)
    fetchSpy.mockRestore()
  })
})

describe("UfoRecorderElement decor click-to-select", () => {
  afterEach(() => {
    document.body.innerHTML = ""
  })

  // jsdom has no global PointerEvent — a plain MouseEvent dispatched as "pointerdown" exercises
  // the same handler, which only reads clientX/clientY/shiftKey (same convention as this file's
  // other clickAt/rightClickAt helpers).
  function clickCanvas(element: UfoRecorderElement): void {
    const canvas = nestedUfo(element).shadowRoot!.querySelector("canvas")!
    canvas.getBoundingClientRect = () => ({ left: 0, top: 0, width: 800, height: 600 }) as DOMRect
    canvas.dispatchEvent(new MouseEvent("pointerdown", { bubbles: true, composed: true, clientX: 400, clientY: 300 }))
  }

  it("selects a decor object clicked in the 3D scene — the picker/property fields sync to it", () => {
    const element = mount()
    element.sightingData = {
      version: 1,
      timeline: { keyframes: [] },
      decor: [
        { id: "decor-1", kind: "building", eastM: 0, northM: 10, title: "Maison" },
        { id: "decor-2", kind: "tree", eastM: 5, northM: 10, title: "Chêne" }
      ]
    }
    const sceneEl = element.shadowRoot!.querySelector("rr0-scene") as unknown as { pickDecorAt: () => string }
    sceneEl.pickDecorAt = () => "decor-2"

    clickCanvas(element)

    const shadow = element.shadowRoot!
    expect((shadow.getElementById("decor") as HTMLSelectElement).value).toBe("decor-2")
    expect((shadow.getElementById("decorTitle") as HTMLInputElement).value).toBe("Chêne")
  })

  it("a shape under the pointer wins over decor beneath it — decor is never even picked at that point", () => {
    const element = mount()
    element.sightingData = {
      version: 1,
      timeline: {
        // clickCanvas clicks at clientX=400/clientY=300 against an 800x600 CSS rect, which
        // canvasPointFromEvent maps to (320,180) in the fixed 640x360 canvas space — bounds must
        // surround that point for the shape hit test to actually succeed.
        keyframes: [{ t: 0, shapes: [{ sourceId: "ufo-9", shape: { kind: "oval", bounds: { x: 300, y: 160, width: 40, height: 40 }, color: "#fff", angle: 0, transparency: 0, haloScale: 0, selected: false } }] }]
      },
      decor: [{ id: "decor-1", kind: "building", eastM: 0, northM: 10, title: "Maison" }]
    }
    const sceneEl = element.shadowRoot!.querySelector("rr0-scene") as unknown as { pickDecorAt: () => string }
    const pickDecorAtSpy = vi.fn(() => "decor-1")
    sceneEl.pickDecorAt = pickDecorAtSpy

    clickCanvas(element)

    const shadow = element.shadowRoot!
    expect(pickDecorAtSpy).not.toHaveBeenCalled()
    expect((shadow.getElementById("source") as HTMLSelectElement).value).toBe("ufo-9")
  })

  it("clicking empty space (no shape, no decor hit) is a harmless no-op for decor selection — falls through to the existing camera-drag behavior instead", () => {
    const element = mount()
    element.sightingData = { version: 1, timeline: { keyframes: [] } }
    const sceneEl = element.shadowRoot!.querySelector("rr0-scene") as unknown as { pickDecorAt: () => undefined }
    sceneEl.pickDecorAt = () => undefined

    expect(() => clickCanvas(element)).not.toThrow()
    expect((element.shadowRoot!.getElementById("decor") as HTMLSelectElement).disabled).toBe(true)
  })
})

describe("UfoRecorderElement polygon vertex editing", () => {
  afterEach(() => {
    document.body.innerHTML = ""
  })

  function nestedCanvas(element: UfoRecorderElement): HTMLCanvasElement {
    const canvas = nestedUfo(element)!.shadowRoot!.getElementById("canvas") as HTMLCanvasElement
    vi.spyOn(canvas, "getBoundingClientRect").mockReturnValue({ left: 0, top: 0, width: 640, height: 360 } as DOMRect)
    return canvas
  }

  function dragFromTo(canvas: HTMLCanvasElement, from: { x: number; y: number }, to: { x: number; y: number }): void {
    canvas.dispatchEvent(new MouseEvent("pointerdown", { clientX: from.x, clientY: from.y }))
    document.dispatchEvent(new MouseEvent("pointermove", { clientX: to.x, clientY: to.y }))
    document.dispatchEvent(new MouseEvent("pointerup", { clientX: to.x, clientY: to.y }))
  }

  function rightClickAt(canvas: HTMLCanvasElement, x: number, y: number): void {
    canvas.dispatchEvent(new MouseEvent("contextmenu", { clientX: x, clientY: y, bubbles: true, cancelable: true, composed: true }))
  }

  function polygonShapeJson(points = [{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 100, y: 50 }, { x: 0, y: 50 }]) {
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
                  kind: "polygon" as const,
                  bounds: { x: 100, y: 100, width: 100, height: 50 },
                  points,
                  color: "#39ff14",
                  angle: 0,
                  transparency: 0,
                  haloScale: 0,
                  selected: false
                }
              }
            ]
          }
        ]
      }
    }
  }

  function ovalShapeJson() {
    return {
      version: 1 as const,
      timeline: {
        keyframes: [
          {
            t: 0,
            shapes: [
              { sourceId: "ufo-1", shape: { kind: "oval" as const, bounds: { x: 100, y: 100, width: 20, height: 20 }, color: "#39ff14", angle: 0, transparency: 0, haloScale: 0, selected: false } }
            ]
          }
        ]
      }
    }
  }

  it("selecting the Polygon preset creates an editable 4-point quad", () => {
    const element = mount()
    ;(element.shadowRoot!.getElementById("preset-polygon") as HTMLButtonElement).click()

    const shape = element.sightingData.timeline.keyframes[0].shapes[0].shape as { kind: string; points?: unknown[] }
    expect(shape.kind).toBe("polygon")
    expect(shape.points).toHaveLength(4)
  })

  it("dragging a vertex handle moves only that vertex, leaving bounds and other points alone", () => {
    const element = mount()
    element.sightingData = polygonShapeJson()
    const canvas = nestedCanvas(element)

    dragFromTo(canvas, { x: 100, y: 100 }, { x: 120, y: 110 }) // vertex 0, at the bounds origin

    const shape = element.sightingData.timeline.keyframes[0].shapes[0].shape as PolygonShape
    expect(shape.points[0].x).toBeCloseTo(20)
    expect(shape.points[0].y).toBeCloseTo(10)
    expect(shape.points[1]).toEqual({ x: 100, y: 0 })
    expect(shape.bounds).toEqual({ x: 100, y: 100, width: 100, height: 50 })
  })

  it("enables Delete vertex only when the right-click landed on a real vertex", () => {
    const element = mount()
    element.sightingData = polygonShapeJson()
    const canvas = nestedCanvas(element)
    const deleteVertexButton = element.shadowRoot!.getElementById("context-delete-vertex") as HTMLButtonElement

    rightClickAt(canvas, 100, 100) // vertex 0
    expect(deleteVertexButton.disabled).toBe(false)

    rightClickAt(canvas, 150, 125) // well inside the body, not near any vertex
    expect(deleteVertexButton.disabled).toBe(true)
  })

  it("opens the menu for a vertex right outside the shape's own bounding box — the real bug this fixes: hitTest's box-inclusion check has zero margin exactly at a corner vertex, where real display/canvas-scale rounding can easily place a click a pixel or two outside it", () => {
    const element = mount()
    element.sightingData = polygonShapeJson() // vertex 0 sits exactly at bounds (100,100), its own corner
    const canvas = nestedCanvas(element)
    const menu = element.shadowRoot!.getElementById("context-menu") as HTMLElement
    const deleteVertexButton = element.shadowRoot!.getElementById("context-delete-vertex") as HTMLButtonElement

    // 3px outside the bounding box on both axes (bounds start at x:100,y:100) — a plain
    // timeline.hitTest (bounds-only) would miss this; hitTestVertex's own generous circular
    // tolerance (8px default) still catches it.
    rightClickAt(canvas, 97, 97)

    expect(menu.hidden).toBe(false)
    expect(deleteVertexButton.disabled).toBe(false)
  })

  it("Delete vertex removes the vertex the menu was opened nearest to", () => {
    const element = mount()
    element.sightingData = polygonShapeJson()
    const canvas = nestedCanvas(element)
    const deleteVertexButton = element.shadowRoot!.getElementById("context-delete-vertex") as HTMLButtonElement

    rightClickAt(canvas, 100, 100) // vertex 0
    deleteVertexButton.click()

    const shape = element.sightingData.timeline.keyframes[0].shapes[0].shape as PolygonShape
    expect(shape.points).toEqual([
      { x: 100, y: 0 },
      { x: 100, y: 50 },
      { x: 0, y: 50 }
    ])
  })

  it("refuses to delete a vertex once only MIN_POLYGON_VERTICES (3) remain", () => {
    const element = mount()
    element.sightingData = polygonShapeJson([
      { x: 0, y: 0 },
      { x: 100, y: 0 },
      { x: 50, y: 50 }
    ])
    const canvas = nestedCanvas(element)
    const deleteVertexButton = element.shadowRoot!.getElementById("context-delete-vertex") as HTMLButtonElement

    rightClickAt(canvas, 100, 100) // vertex 0
    expect(deleteVertexButton.disabled).toBe(true)
  })

  it("Add vertex inserts a point on the edge nearest to where the menu was opened", () => {
    const element = mount()
    element.sightingData = polygonShapeJson()
    const canvas = nestedCanvas(element)
    const addVertexButton = element.shadowRoot!.getElementById("context-add-vertex") as HTMLButtonElement

    rightClickAt(canvas, 150, 100) // midpoint of the top edge (points 0->1)
    expect(addVertexButton.disabled).toBe(false)
    addVertexButton.click()

    const shape = element.sightingData.timeline.keyframes[0].shapes[0].shape as PolygonShape
    expect(shape.points).toHaveLength(5)
    expect(shape.points[1]).toEqual({ x: 50, y: 0 })
  })

  it("disables Add/Delete vertex for an oval — it has no points at all", () => {
    const element = mount()
    element.sightingData = ovalShapeJson()
    const canvas = nestedCanvas(element)
    const addVertexButton = element.shadowRoot!.getElementById("context-add-vertex") as HTMLButtonElement
    const deleteVertexButton = element.shadowRoot!.getElementById("context-delete-vertex") as HTMLButtonElement

    rightClickAt(canvas, 110, 110)

    expect(addVertexButton.disabled).toBe(true)
    expect(deleteVertexButton.disabled).toBe(true)
  })
})

/**
 * The canvas's contents are drawn, not DOM, so the component hit-tests them itself and states
 * what the pointer is over in a `data-cursor` attribute — the actual cursor shapes are plain CSS
 * rules keyed on it (see ufoTemplate). These tests therefore assert the attribute, which is the
 * component's whole share of the feature.
 */
describe("UfoRecorderElement hover cursor", () => {
  afterEach(() => {
    document.body.innerHTML = ""
  })

  function nestedCanvas(element: UfoRecorderElement): HTMLCanvasElement {
    const canvas = nestedUfo(element)!.shadowRoot!.getElementById("canvas") as HTMLCanvasElement
    vi.spyOn(canvas, "getBoundingClientRect").mockReturnValue({ left: 0, top: 0, width: 640, height: 360 } as DOMRect)
    return canvas
  }

  /** jsdom has no global PointerEvent — a plain MouseEvent dispatched as "pointermove" exercises
   * the same handler, which only reads clientX/clientY. */
  function hoverAt(canvas: HTMLCanvasElement, x: number, y: number): string | undefined {
    canvas.dispatchEvent(new MouseEvent("pointermove", { clientX: x, clientY: y }))
    return canvas.dataset.cursor
  }

  function selectedShape(element: UfoRecorderElement): Shape {
    return element.sightingData.timeline.keyframes[0].shapes[0].shape as Shape
  }

  it("offers to move whatever shape is under the pointer", () => {
    const element = mount()
    const canvas = nestedCanvas(element)
    const { x, y, width, height } = selectedShape(element).bounds

    expect(hoverAt(canvas, x + width / 2, y + height / 2)).toBe("move")
  })

  it("names the axis each resize handle stretches along", () => {
    const element = mount()
    const canvas = nestedCanvas(element)
    const points = ShapeHandles.handlePointsFor(selectedShape(element))

    expect(hoverAt(canvas, points.e.x, points.e.y)).toBe("resize-ew")
    expect(hoverAt(canvas, points.s.x, points.s.y)).toBe("resize-ns")
    expect(hoverAt(canvas, points.nw.x, points.nw.y)).toBe("resize-nwse")
    expect(hoverAt(canvas, points.ne.x, points.ne.y)).toBe("resize-nesw")
  })

  it("turns the resize axes with the shape once it has been rotated", () => {
    const element = mount()
    const canvas = nestedCanvas(element)
    const before = selectedShape(element)
    const center = { x: before.bounds.x + before.bounds.width / 2, y: before.bounds.y + before.bounds.height / 2 }
    const rotateHandle = ShapeHandles.handlePointsFor(before).rotate

    // Drags the rotate handle a quarter turn clockwise (straight out to the shape's right).
    canvas.dispatchEvent(new MouseEvent("pointerdown", { clientX: rotateHandle.x, clientY: rotateHandle.y }))
    document.dispatchEvent(new MouseEvent("pointermove", { clientX: center.x + 60, clientY: center.y }))
    document.dispatchEvent(new MouseEvent("pointerup", { clientX: center.x + 60, clientY: center.y }))

    const rotated = selectedShape(element)
    expect(rotated.angle).toBeCloseTo(Math.PI / 2)
    const points = ShapeHandles.handlePointsFor(rotated)
    expect(hoverAt(canvas, points.e.x, points.e.y)).toBe("resize-ns")
    expect(hoverAt(canvas, points.n.x, points.n.y)).toBe("resize-ew")
  })

  it("advertises the rotate handle with its own cursor", () => {
    const element = mount()
    const canvas = nestedCanvas(element)
    const { rotate } = ShapeHandles.handlePointsFor(selectedShape(element))

    expect(hoverAt(canvas, rotate.x, rotate.y)).toBe("rotate")
  })

  it("advertises a polygon's vertex handles, which sit on top of the bounding box's own", () => {
    const element = mount()
    ;(element.shadowRoot!.getElementById("preset-polygon") as HTMLButtonElement).click()
    const canvas = nestedCanvas(element)
    const shape = selectedShape(element) as PolygonShape
    const vertex = ShapeHandles.vertexPointsFor(shape)[0]

    expect(hoverAt(canvas, vertex.x, vertex.y)).toBe("vertex")
  })

  it("offers the empty landscape as a grabbable pan, and closes the hand while it is being dragged", () => {
    const element = mount()
    const canvas = nestedCanvas(element)

    expect(hoverAt(canvas, 20, 20)).toBe("pan")
    canvas.dispatchEvent(new MouseEvent("pointerdown", { clientX: 20, clientY: 20 }))
    expect(canvas.dataset.cursor).toBe("panning")
    document.dispatchEvent(new MouseEvent("pointerup", { clientX: 60, clientY: 20 }))
    expect(canvas.dataset.cursor).toBe("pan")
  })

  it("keeps the drag's own cursor while the pointer wanders away from the handle it grabbed", () => {
    const element = mount()
    const canvas = nestedCanvas(element)
    const { e } = ShapeHandles.handlePointsFor(selectedShape(element))

    expect(hoverAt(canvas, e.x, e.y)).toBe("resize-ew")
    canvas.dispatchEvent(new MouseEvent("pointerdown", { clientX: e.x, clientY: e.y }))
    expect(hoverAt(canvas, 20, 20)).toBe("resize-ew") // empty canvas, but a resize is in progress
    document.dispatchEvent(new MouseEvent("pointerup", { clientX: 20, clientY: 20 }))
  })

  it("switches the whole canvas to the recording cursor while recording, and back afterwards", () => {
    const element = mount()
    const canvas = nestedCanvas(element)
    const recordButton = element.shadowRoot!.getElementById("record") as HTMLButtonElement

    recordButton.click()
    expect(canvas.dataset.cursor).toBe("record")
    expect(hoverAt(canvas, 20, 20)).toBe("record") // hover detection stays out of the way

    recordButton.click()
    expect(canvas.dataset.cursor).toBeUndefined()
  })
})

/**
 * `src` is what makes a per-observation editor URL possible: rr0.org's editor page maps its own
 * `?sighting=` parameter onto it, so ufoathome.org/<path> opens that recording for editing
 * instead of an empty canvas.
 */
describe("UfoRecorderElement src attribute", () => {
  afterEach(() => {
    document.body.innerHTML = ""
    vi.unstubAllGlobals()
  })

  const recording = {
    version: 1 as const,
    durationSeconds: 4,
    caseId: "socorro",
    timeline: {
      keyframes: [
        { t: 0, shapes: [{ sourceId: "ufo-1", shape: { kind: "oval" as const, bounds: { x: 1, y: 2, width: 10, height: 6 }, color: "#fff", angle: 0, transparency: 0, haloScale: 0, selected: false } }] }
      ]
    }
  }

  it("loads the recording it points at on connect", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve(recording) })
    vi.stubGlobal("fetch", fetchMock)

    const element = document.createElement(ELEMENT_NAME) as UfoRecorderElement
    element.weatherProvider = NO_RECORD_PROVIDER
    element.setAttribute("src", "/science/crypto/ufo/enquete/dossier/Socorro/sighting.json")
    document.body.appendChild(element)
    await new Promise(resolve => setTimeout(resolve, 0))

    expect(fetchMock).toHaveBeenCalledWith("/science/crypto/ufo/enquete/dossier/Socorro/sighting.json")
    expect(element.sightingData.caseId).toBe("socorro")
    expect(element.sightingData.timeline.keyframes[0].shapes[0].shape.bounds.width).toBe(10)
  })

  it("re-loads when src changes afterwards", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve(recording) })
    vi.stubGlobal("fetch", fetchMock)

    const element = mount()
    element.setAttribute("src", "other.json")
    await new Promise(resolve => setTimeout(resolve, 0))

    expect(fetchMock).toHaveBeenCalledWith("other.json")
  })
})

/**
 * How high the witness was decides which part of the sky they are even inside — a DC-3's 1500 m
 * puts them above the cloud layer and, before this was rendered properly, outside the star shell
 * altogether. The field also has to READ back: writing 0 unconditionally, as this did, flattened
 * an imported recording's own altitude the moment anything else in the panel was touched.
 */
describe("UfoRecorderElement witness altitude", () => {
  afterEach(() => {
    document.body.innerHTML = ""
  })

  function setField(element: UfoRecorderElement, id: string, value: string): void {
    const input = element.shadowRoot!.getElementById(id) as HTMLInputElement
    input.value = value
    input.dispatchEvent(new Event("input"))
  }

  it("records the altitude the witness was at", () => {
    const element = mount()
    setField(element, "lat", "32.3792")
    setField(element, "lng", "-86.3077")
    setField(element, "elevation", "1500")

    const pose = element.sightingData.witnessTrack!.keyframes[0].pose
    expect(pose.elevationM).toBe(1500)
    expect(pose.lat).toBeCloseTo(32.3792)
  })

  it("keeps it when another observer field is edited afterwards", () => {
    const element = mount()
    setField(element, "elevation", "1500")
    setField(element, "heading", "40")

    const keyframes = element.sightingData.witnessTrack!.keyframes
    expect(keyframes[keyframes.length - 1].pose.elevationM).toBe(1500)
  })

  it("shows the altitude of a loaded recording instead of a hardcoded ground level", () => {
    const element = mount()
    element.sightingData = {
      version: 1,
      durationSeconds: 10,
      timeline: { keyframes: [{ t: 0, shapes: [{ sourceId: "ufo-1", shape: { kind: "oval", bounds: { x: 0, y: 0, width: 10, height: 10 }, color: "#fff", angle: 0, transparency: 0, haloScale: 0, selected: false } }] }] },
      witnessTrack: { keyframes: [{ t: 0, pose: { lat: 32.3792, lng: -86.3077, elevationM: 1500, headingDeg: 40, pitchDeg: 0, fovDeg: 60 } }] }
    }

    expect((element.shadowRoot!.getElementById("elevation") as HTMLInputElement).value).toBe("1500")
  })
})

/**
 * The Circumstances group is the one part of this editor that isn't testimony: weather is a
 * measurable fact about a place at an instant, and the Location and Temporal groups already state
 * both. So it is looked up from a real record and shown read-only on that basis — unless the
 * witness takes the fields back, in which case their account outranks the record for good. See
 * UfoRecorderElement.inferWeather and engine/weather/WeatherInference.ts.
 */
describe("UfoRecorderElement inferred weather", () => {
  afterEach(() => {
    document.body.innerHTML = ""
    vi.unstubAllGlobals()
  })

  const SOURCE = { id: "era5", name: "ERA5 (Open-Meteo)", url: "https://example.org/archive?start_date=1965-07-01" }

  /** Cloud cover sits on a step-0.05 range input, so the fixture uses values that survive the
   * browser's own value sanitization unchanged. */
  const ON_RECORD: Weather = {
    cloudCover: 0.1,
    cloudDarkness: 0.15,
    cloudBaseM: 8000,
    precipitationType: "none",
    precipitationIntensity: 0,
    windDirectionDeg: 229,
    windSpeed: 1.5,
    storm: false
  }

  function recordProvider(weather: Weather = ON_RECORD): WeatherProvider {
    return {
      getWeather: query =>
        Promise.resolve({ source: SOURCE, samples: query.points.map(point => ({ time: point.time, weather })) })
    }
  }

  function setInput(shadow: ShadowRoot, id: string, value: string): void {
    const input = shadow.getElementById(id) as HTMLInputElement
    input.value = value
    input.dispatchEvent(new Event("input"))
  }

  /** States where and when the observation happened — everything the record needs to be asked. */
  function stateDateAndPlace(element: UfoRecorderElement): void {
    const shadow = element.shadowRoot!
    setInput(shadow, "lat", "43.837")
    setInput(shadow, "lng", "5.983")
    setInput(shadow, "utcOffsetHours", "1")
    setInput(shadow, "obs-time", "1965-07-01T05:00")
  }

  function weatherField(element: UfoRecorderElement, id: string): HTMLInputElement | HTMLSelectElement {
    return element.shadowRoot!.getElementById(id) as HTMLInputElement | HTMLSelectElement
  }

  function sourceLink(element: UfoRecorderElement): HTMLAnchorElement {
    return element.shadowRoot!.getElementById("weather-source-link") as HTMLAnchorElement
  }

  function sourceText(element: UfoRecorderElement): HTMLElement {
    return element.shadowRoot!.getElementById("weather-source-text")!
  }

  it("looks the weather up as soon as the sighting says where and when", async () => {
    const element = mount(recordProvider())
    stateDateAndPlace(element)

    await waitFor(() => element.sightingData.weatherSource !== undefined, 2000)
    expect(element.sightingData.weatherSource).toEqual(SOURCE)
    expect(element.sightingData.weatherTrack?.keyframes[0].weather.cloudCover).toBe(0.1)
  })

  it("shows the looked-up values, read-only, with the record and the instant they describe", async () => {
    const element = mount(recordProvider())
    stateDateAndPlace(element)
    await waitFor(() => sourceLink(element).hidden === false, 2000)

    expect((weatherField(element, "cloudCover") as HTMLInputElement).value).toBe("0.1")
    expect((weatherField(element, "windSpeed") as HTMLInputElement).value).toBe("1.5")
    for (const id of ["cloudCover", "cloudDarkness", "cloudBase", "precipitationType", "windSpeed", "storm"]) {
      expect(weatherField(element, id).disabled).toBe(true)
    }
    expect(sourceLink(element).href).toBe(SOURCE.url)
    // The record that answered is named by a picker beside the line, not baked into it.
    expect((weatherField(element, "weatherSource") as HTMLSelectElement).value).toBe("era5")
    // 05:00 on the UTC+1 clock the sighting declares — a wrong time zone shows up here first.
    expect(sourceLink(element).textContent).toContain("1965-07-01 04:00 UTC")
  })

  it("leaves Light intensity alone — it's a view preference, not weather", async () => {
    const element = mount(recordProvider())
    stateDateAndPlace(element)
    await waitFor(() => sourceLink(element).hidden === false, 2000)

    expect((element.shadowRoot!.getElementById("lensFlareBrightness") as HTMLInputElement).disabled).toBe(false)
  })

  it("leaves the fields editable, and says why, when no record covers the sighting", async () => {
    const element = mount()
    stateDateAndPlace(element)

    await waitFor(() => sourceText(element).textContent!.includes("No record"), 2000)
    // Nothing is being claimed, so nothing is locked: a pre-1940 case is filled in by hand.
    expect(weatherField(element, "cloudCover").disabled).toBe(false)
    expect(element.sightingData.weatherSource).toBeUndefined()
  })

  it("says a lookup that couldn't be made isn't the same as no record existing", async () => {
    const element = mount({ getWeather: () => Promise.reject(new Error("offline")) })
    stateDateAndPlace(element)

    await waitFor(() => sourceText(element).textContent!.includes("unreachable"), 2000)
    expect(weatherField(element, "cloudCover").disabled).toBe(false)
  })

  // Nothing to ask means nothing to ask WITH: the control is unavailable, and what it needs is on
  // the control itself rather than printed in the space reserved for what a record answered.
  it("disables the control until the sighting states a date and a place, and says so on it", async () => {
    const element = mount(recordProvider())
    const shadow = element.shadowRoot!
    const checkbox = shadow.getElementById("weatherInferred") as HTMLInputElement
    const label = shadow.getElementById("label-weather-inferred")!

    expect(checkbox.disabled).toBe(true)
    // Unticked too: a ticked box would say the weather below was read from a record when nothing
    // has been asked for one.
    expect(checkbox.checked).toBe(false)
    expect(checkbox.title).toContain("full date and a place")
    expect(label.title).toContain("full date and a place")
    expect(sourceText(element).textContent).toBe("")
    // No record was asked, so its picker would be crediting data nobody produced.
    expect(shadow.getElementById("weather-source-row")!.hidden).toBe(true)

    stateDateAndPlace(element)
    await waitFor(() => element.sightingData.weatherSource !== undefined, 2000)

    expect(checkbox.disabled).toBe(false)
    // And ticked by itself: asking the record is what this editor does by default.
    expect(checkbox.checked).toBe(true)
    expect(checkbox.title).not.toContain("full date and a place")
    expect(label.title).toBe(checkbox.title)
  })

  it("unticks itself again when the sighting stops saying where it happened", async () => {
    const element = mount(recordProvider())
    const shadow = element.shadowRoot!
    const checkbox = shadow.getElementById("weatherInferred") as HTMLInputElement
    stateDateAndPlace(element)
    await waitFor(() => checkbox.checked, 2000)

    setInput(shadow, "lat", "")
    setInput(shadow, "lng", "")

    expect(checkbox.disabled).toBe(true)
    expect(checkbox.checked).toBe(false)
  })

  // Ticking itself back on must not undo a decision the witness made: their account outranks the
  // record for good (see Sighting.weatherSource).
  // The regression this exists for: a witness described the weather BEFORE saying when and where,
  // watched the box tick itself the moment they typed those, and the record replaced their
  // account — with no way to stop it, since the only control that could was disabled until then.
  it("treats typing a weather value as taking the fields back, even before a lookup is possible", async () => {
    const element = mount(recordProvider())
    const shadow = element.shadowRoot!
    const checkbox = shadow.getElementById("weatherInferred") as HTMLInputElement
    expect(checkbox.disabled).toBe(true)

    setInput(shadow, "precipitationType", "rain")
    setInput(shadow, "precipitationIntensity", "0.9")
    stateDateAndPlace(element)
    await waitFor(() => !checkbox.disabled, 2000)
    // Long enough for a lookup to have landed, had one been allowed to run.
    await new Promise(resolve => setTimeout(resolve, 900))

    expect(checkbox.checked).toBe(false)
    expect(element.sightingData.weatherSource).toBeUndefined()
    expect(element.sightingData.weatherTrack?.keyframes.at(-1)?.weather.precipitationType).toBe("rain")
    expect((weatherField(element, "precipitationType") as HTMLSelectElement).value).toBe("rain")
  })

  it("never re-ticks itself over a witness who turned it off", async () => {
    const element = mount(recordProvider())
    const shadow = element.shadowRoot!
    const checkbox = shadow.getElementById("weatherInferred") as HTMLInputElement
    stateDateAndPlace(element)
    await waitFor(() => element.sightingData.weatherSource !== undefined, 2000)

    checkbox.checked = false
    checkbox.dispatchEvent(new Event("change"))
    // Out of, and back into, the state where a lookup is possible at all.
    setInput(shadow, "lat", "")
    setInput(shadow, "lng", "")
    setInput(shadow, "lat", "43.837")
    setInput(shadow, "lng", "5.983")
    await waitFor(() => !checkbox.disabled, 2000)

    expect(checkbox.checked).toBe(false)
    expect(element.sightingData.weatherSource).toBeUndefined()
  })

  // A date alone isn't a question either — the record is asked about a place at an instant.
  it("stays disabled while only one half of the requirement is stated", () => {
    const element = mount(recordProvider())
    const shadow = element.shadowRoot!
    setInput(shadow, "obs-time", "1965-07-01T05:00")

    expect((shadow.getElementById("weatherInferred") as HTMLInputElement).disabled).toBe(true)
  })

  it("hands the fields back to the witness on demand, keeping the record's values as a start", async () => {
    const element = mount(recordProvider())
    stateDateAndPlace(element)
    await waitFor(() => element.sightingData.weatherSource !== undefined, 2000)

    const inferredCheckbox = element.shadowRoot!.getElementById("weatherInferred") as HTMLInputElement
    inferredCheckbox.checked = false
    inferredCheckbox.dispatchEvent(new Event("change"))

    expect(weatherField(element, "cloudCover").disabled).toBe(false)
    expect((weatherField(element, "cloudCover") as HTMLInputElement).value).toBe("0.1")
    // The values are no longer claimed as measurements — and no later lookup may overwrite them.
    expect(element.sightingData.weatherSource).toBeUndefined()
  })

  it("never re-derives weather a witness declared", async () => {
    const provider = recordProvider()
    const getWeather = vi.spyOn(provider, "getWeather")
    const element = mount(provider)
    element.sightingData = {
      version: 1,
      time: { year: 1965, month: 7, day: 1, hour: 5, minute: 0, raw: "1965-07-01T05:00" },
      utcOffsetHours: 1,
      place: [{ lat: 43.837, lng: 5.983 }],
      timeline: { keyframes: [] },
      weatherTrack: { keyframes: [{ t: 0, weather: { ...ON_RECORD, cloudCover: 0.6, storm: true } }] }
    }

    await new Promise(resolve => setTimeout(resolve, 900))
    expect(getWeather).not.toHaveBeenCalled()
    expect((weatherField(element, "cloudCover") as HTMLInputElement).value).toBe("0.6")
    expect(weatherField(element, "cloudCover").disabled).toBe(false)
  })

  it("replays a recording's own stored record instead of looking it up again", async () => {
    const provider = recordProvider()
    const getWeather = vi.spyOn(provider, "getWeather")
    const element = mount(provider)
    element.sightingData = {
      version: 1,
      time: { year: 1965, month: 7, day: 1, hour: 5, minute: 0, raw: "1965-07-01T05:00" },
      utcOffsetHours: 1,
      place: [{ lat: 43.837, lng: 5.983 }],
      timeline: { keyframes: [] },
      weatherTrack: { keyframes: [{ t: 0, weather: { ...ON_RECORD, cloudCover: 0.45 } }] },
      weatherSource: SOURCE
    }

    await new Promise(resolve => setTimeout(resolve, 900))
    // A published case file must replay identically offline, and years after it was authored.
    expect(getWeather).not.toHaveBeenCalled()
    expect((weatherField(element, "cloudCover") as HTMLInputElement).value).toBe("0.45")
    expect(weatherField(element, "cloudCover").disabled).toBe(true)
    expect(sourceLink(element).hidden).toBe(false)
  })
})

/**
 * Testimony names a place, it never gives coordinates — so the Location group leads with the name,
 * and the latitude/longitude below are what searching it produces. See
 * UfoRecorderElement.searchPlace and engine/place/PlaceProvider.ts.
 */
describe("UfoRecorderElement place search", () => {
  afterEach(() => {
    document.body.innerHTML = ""
    vi.unstubAllGlobals()
  })

  const VALENSOLE = { name: "Valensole, Alpes-de-Haute-Provence, France", lat: 43.8379283, lng: 5.9839867 }
  const SPRINGFIELDS = [
    { name: "Springfield, Illinois, United States", lat: 39.8, lng: -89.6 },
    { name: "Springfield, Massachusetts, United States", lat: 42.1, lng: -72.6 }
  ]

  function placeProvider(matches: PlaceMatch[]): PlaceProvider {
    return {
      attribution: { text: "© OpenStreetMap", url: "https://osm.org/copyright" },
      search: () => Promise.resolve(matches),
      reverse: () => Promise.resolve(matches[0])
    }
  }

  function mountWith(matches: PlaceMatch[] | PlaceProvider): UfoRecorderElement {
    const element = mount()
    element.placeSearchProvider = Array.isArray(matches) ? placeProvider(matches) : matches
    return element
  }

  function field(element: UfoRecorderElement, id: string): HTMLInputElement | HTMLSelectElement {
    return element.shadowRoot!.getElementById(id) as HTMLInputElement | HTMLSelectElement
  }

  function statusText(element: UfoRecorderElement): string {
    return element.shadowRoot!.getElementById("place-status-text")!.textContent!
  }

  async function searchFor(element: UfoRecorderElement, name: string): Promise<void> {
    const input = field(element, "placeName") as HTMLInputElement
    input.value = name
    input.dispatchEvent(new Event("input"))
    ;(element.shadowRoot!.getElementById("search-place") as HTMLButtonElement).click()
    await waitFor(() => statusText(element) !== "" && !statusText(element).includes("Looking up"), 1000)
  }

  it("fills latitude and longitude from a searched name", async () => {
    const element = mountWith([VALENSOLE])
    await searchFor(element, "Valensole")

    expect((field(element, "lat") as HTMLInputElement).value).toBe("43.8379283")
    expect((field(element, "lng") as HTMLInputElement).value).toBe("5.9839867")
    expect(element.sightingData.place).toEqual([{ lat: 43.8379283, lng: 5.9839867, name: VALENSOLE.name }])
  })

  it("replaces the typed name with the qualified one it actually resolved", async () => {
    const element = mountWith([VALENSOLE])
    await searchFor(element, "Valensole")

    // The coordinates came from THAT place; leaving a vaguer name beside them would claim a
    // precision the typed text never had.
    expect((field(element, "placeName") as HTMLInputElement).value).toBe(VALENSOLE.name)
  })

  it("keyframes the observer pose, exactly as a hand-typed coordinate would", async () => {
    const element = mountWith([VALENSOLE])
    await searchFor(element, "Valensole")

    expect(element.sightingData.witnessTrack?.keyframes[0].pose.lat).toBe(43.8379283)
  })

  it("offers every candidate when a name is ambiguous, and applies the best one", async () => {
    const element = mountWith(SPRINGFIELDS)
    await searchFor(element, "Springfield")

    const picker = field(element, "placeMatch") as HTMLSelectElement
    expect(element.shadowRoot!.getElementById("place-match-row")!.hidden).toBe(false)
    expect([...picker.options].map(option => option.textContent)).toEqual(SPRINGFIELDS.map(match => match.name))
    expect(statusText(element)).toContain("2")
    expect((field(element, "lat") as HTMLInputElement).value).toBe("39.8")
  })

  it("moves the witness when another candidate is picked", async () => {
    const element = mountWith(SPRINGFIELDS)
    await searchFor(element, "Springfield")

    const picker = field(element, "placeMatch") as HTMLSelectElement
    picker.selectedIndex = 1
    picker.dispatchEvent(new Event("change"))

    expect((field(element, "lat") as HTMLInputElement).value).toBe("42.1")
    expect(element.sightingData.place?.[0].name).toBe(SPRINGFIELDS[1].name)
  })

  it("says so when no place bears the name", async () => {
    const element = mountWith([])
    await searchFor(element, "Zzzzz")

    expect(statusText(element)).toContain("No place")
    expect(element.shadowRoot!.getElementById("place-match-row")!.hidden).toBe(true)
  })

  it("says a search that couldn't be made isn't the same as no such place", async () => {
    const element = mountWith({
      attribution: { text: "© OpenStreetMap", url: "https://osm.org/copyright" },
      search: () => Promise.reject(new Error("offline")),
      reverse: () => Promise.resolve(undefined)
    })
    await searchFor(element, "Valensole")

    expect(statusText(element)).toContain("unavailable")
  })

  it("keeps a name no geocoder knows, typed by hand", () => {
    const element = mountWith([])
    const input = field(element, "placeName") as HTMLInputElement
    input.value = "the lavender field east of the farm"
    input.dispatchEvent(new Event("input"))
    const lat = field(element, "lat") as HTMLInputElement
    lat.value = "43.84"
    lat.dispatchEvent(new Event("input"))
    const lng = field(element, "lng") as HTMLInputElement
    lng.value = "5.99"
    lng.dispatchEvent(new Event("input"))

    expect(element.sightingData.place?.[0].name).toBe("the lavender field east of the farm")
  })

  it("restores the place name a recording carries", () => {
    const element = mountWith([])
    element.sightingData = {
      version: 1,
      place: [{ lat: 34.058, lng: -106.891, name: "Socorro, New Mexico, United States" }],
      timeline: { keyframes: [] }
    }

    expect((field(element, "placeName") as HTMLInputElement).value).toBe("Socorro, New Mexico, United States")
  })

  it("searches only when asked, never as the name is typed", async () => {
    const search = vi.fn().mockResolvedValue([VALENSOLE])
    const element = mountWith({ attribution: { text: "©", url: "https://example.org" }, search, reverse: () => Promise.resolve(undefined) })
    const input = field(element, "placeName") as HTMLInputElement
    for (const text of ["V", "Va", "Val"]) {
      input.value = text
      input.dispatchEvent(new Event("input"))
    }
    await new Promise(resolve => setTimeout(resolve, 800))

    // Nominatim's usage policy rules out per-keystroke autocomplete — see its provider.
    expect(search).not.toHaveBeenCalled()
  })

  it("searches on Enter as well as on the button", async () => {
    const search = vi.fn().mockResolvedValue([VALENSOLE])
    const element = mountWith({ attribution: { text: "©", url: "https://example.org" }, search, reverse: () => Promise.resolve(undefined) })
    const input = field(element, "placeName") as HTMLInputElement
    input.value = "Valensole"
    input.dispatchEvent(new Event("input"))
    input.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }))
    await waitFor(() => search.mock.calls.length > 0, 1000)

    expect(search).toHaveBeenCalledWith("Valensole", expect.anything())
  })
})

/**
 * `durationSeconds` and `endTime` are two ways of saying one thing, and sightingDurationMs gives
 * the first precedence — so editing "Observation end" on any recording carrying a durationSeconds
 * (which is every published case file) used to do nothing at all, silently. The more recent edit
 * wins now. See UfoRecorderElement.dropDurationOutrankedByDates.
 */
describe("UfoRecorderElement duration and dates", () => {
  afterEach(() => {
    document.body.innerHTML = ""
  })

  function setInput(element: UfoRecorderElement, id: string, value: string): void {
    const input = element.shadowRoot!.getElementById(id) as HTMLInputElement
    input.value = value
    input.dispatchEvent(new Event("input"))
  }

  function duration(element: UfoRecorderElement): string {
    return (element.shadowRoot!.getElementById("durationSeconds") as HTMLInputElement).value
  }

  it("derives the duration from a start and an end", () => {
    const element = mount()
    setInput(element, "obs-time", "1965-07-01T05:45")
    setInput(element, "obs-end-time", "1965-07-01T05:50")

    expect(duration(element)).toBe("300")
  })

  it("lets a new end time override a duration that was already stated", () => {
    const element = mount()
    setInput(element, "obs-time", "1965-07-01T05:45")
    setInput(element, "durationSeconds", "42")
    setInput(element, "obs-end-time", "1965-07-01T06:00")

    expect(duration(element)).toBe("900")
    expect(element.sightingData.durationSeconds).toBeUndefined()
  })

  it("lets a new duration override the dates right back", () => {
    const element = mount()
    setInput(element, "obs-time", "1965-07-01T05:45")
    setInput(element, "obs-end-time", "1965-07-01T06:00")
    setInput(element, "durationSeconds", "7")

    expect(element.sightingData.durationSeconds).toBe(7)
  })

  it("keeps a stated duration when the dates are too imprecise to replace it", () => {
    const element = mount()
    setInput(element, "obs-time", "1965-07-01T05:45")
    setInput(element, "durationSeconds", "42")
    // Known to the month only: there is no exact length to subtract here, so wiping the explicit
    // one would leave the recording with no duration at all.
    setInput(element, "obs-end-time", "1965-07")

    expect(duration(element)).toBe("42")
    expect(element.sightingData.durationSeconds).toBe(42)
  })

  it("overrides a duration a loaded recording carried, once its end time is edited", () => {
    const element = mount()
    element.sightingData = {
      version: 1,
      time: { year: 1948, month: 7, day: 24, hour: 2, minute: 45, raw: "1948-07-24T02:45" },
      durationSeconds: 10,
      timeline: { keyframes: [] }
    }
    setInput(element, "obs-end-time", "1948-07-24T02:50")

    expect(duration(element)).toBe("300")
  })
})

/**
 * The credits became pickers, sitting where the data is reported — "2 places found according to
 * [Nominatim]" — because which source answered is part of the answer. See
 * engine/source/DataSource.ts and UfoRecorderElement.sourcePicker.
 */
describe("UfoRecorderElement data sources", () => {
  afterEach(() => {
    document.body.innerHTML = ""
  })

  function select(element: UfoRecorderElement, kind: string): HTMLSelectElement {
    return element.shadowRoot!.getElementById(`${kind}Source`) as HTMLSelectElement
  }

  function creditNextTo(select: HTMLSelectElement): HTMLAnchorElement {
    return select.parentElement!.querySelector(".source-credit") as HTMLAnchorElement
  }

  it("offers a picker for every kind of real-world data it pulls in", () => {
    const element = mount()
    for (const kind of ["place", "weather", "elevation", "imagery"]) {
      expect(select(element, kind)).not.toBeNull()
    }
  })

  it("puts the geocoder's picker in the sentence reporting what it found", async () => {
    const element = mount()
    element.placeSearchProvider = {
      attribution: { text: "© OpenStreetMap", url: "https://osm.org/copyright" },
      search: () => Promise.resolve([{ name: "Valensole, France", lat: 43.8, lng: 5.9 }]),
      reverse: () => Promise.resolve(undefined)
    }
    const row = element.shadowRoot!.getElementById("place-source-row")!
    // Nothing found yet is nothing to attribute.
    expect(row.hidden).toBe(true)

    const input = element.shadowRoot!.getElementById("placeName") as HTMLInputElement
    input.value = "Valensole"
    input.dispatchEvent(new Event("input"))
    ;(element.shadowRoot!.getElementById("search-place") as HTMLButtonElement).click()
    await waitFor(() => !row.hidden, 1000)

    expect(element.shadowRoot!.getElementById("place-status-text")!.textContent).toContain("1")
    expect(row.textContent).toContain("according to")
    expect(row.querySelector("select")!.value).toBe("nominatim")
  })

  it("carries each source's own attribution beside its picker", () => {
    const element = mount()
    const credits = [...element.shadowRoot!.querySelectorAll(".source-credit")] as HTMLAnchorElement[]
    const text = credits.map(credit => credit.textContent).join(" ")

    expect(text).toContain("OpenStreetMap")
    expect(text).toContain("Copernicus")
    expect(credits.every(credit => credit.href.startsWith("http"))).toBe(true)
  })

  it("swaps the attribution when a different source is picked", () => {
    const element = mount()
    const imagery = select(element, "imagery")
    expect(creditNextTo(imagery).textContent).toContain("Esri")

    imagery.value = "eox-s2cloudless"
    imagery.dispatchEvent(new Event("change"))

    expect(creditNextTo(imagery).textContent).toContain("EOx")
  })

  it("keeps every option's attribution honest — a picker that credited nobody would be worse than a static line", () => {
    const element = mount()
    for (const kind of ["place", "weather", "elevation", "imagery"]) {
      expect(select(element, kind).options.length).toBeGreaterThan(0)
      expect(creditNextTo(select(element, kind)).textContent!.length).toBeGreaterThan(0)
    }
  })
})

/**
 * An hour of time zone is an hour of Earth's rotation and a different row of the weather record,
 * and both obey what is declared here in silence — so a value that cannot belong to the declared
 * longitude has to say so. See UfoRecorderElement.updateUtcOffsetValidity.
 */
describe("UfoRecorderElement time zone", () => {
  afterEach(() => {
    document.body.innerHTML = ""
  })

  function setInput(element: UfoRecorderElement, id: string, value: string): void {
    const input = element.shadowRoot!.getElementById(id) as HTMLInputElement
    input.value = value
    input.dispatchEvent(new Event("input"))
  }

  function utcOffset(element: UfoRecorderElement): HTMLInputElement {
    return element.shadowRoot!.getElementById("utcOffsetHours") as HTMLInputElement
  }

  it("flags a time zone no country has ever placed on that longitude", () => {
    const element = mount()
    setInput(element, "lat", "48.892")
    setInput(element, "lng", "2.207")
    setInput(element, "utcOffsetHours", "-6")

    expect(utcOffset(element).classList.contains("invalid")).toBe(true)
    expect(utcOffset(element).title).toContain("UTC+0")
  })

  it("stays silent on legal time that merely departs from solar time", () => {
    const element = mount()
    setInput(element, "lat", "43.837")
    setInput(element, "lng", "5.983")
    // France really was on UTC+1 in 1965, an hour off its own meridian.
    setInput(element, "utcOffsetHours", "1")

    expect(utcOffset(element).classList.contains("invalid")).toBe(false)
  })

  it("clears the flag once the place it contradicted moves", () => {
    const element = mount()
    setInput(element, "lat", "48.892")
    setInput(element, "lng", "2.207")
    setInput(element, "utcOffsetHours", "-6")
    expect(utcOffset(element).classList.contains("invalid")).toBe(true)

    setInput(element, "lng", "-106.891")

    expect(utcOffset(element).classList.contains("invalid")).toBe(false)
  })

  it("resyncs from a loaded recording instead of leaving the previous one's zone on screen", () => {
    const element = mount()
    setInput(element, "utcOffsetHours", "-6")
    element.sightingData = {
      version: 1,
      time: { year: 1965, month: 7, day: 1, hour: 5, minute: 45, raw: "1965-07-01T05:45" },
      utcOffsetHours: 1,
      place: [{ lat: 43.837, lng: 5.993 }],
      timeline: { keyframes: [] }
    }

    // The number shown described a sighting the editor was no longer holding.
    expect(utcOffset(element).value).toBe("1")
  })

  it("empties the field for a recording that declares no zone at all", () => {
    const element = mount()
    setInput(element, "utcOffsetHours", "-6")
    element.sightingData = { version: 1, timeline: { keyframes: [] } }

    expect(utcOffset(element).value).toBe("")
  })
})

/**
 * The Location group's two halves state one thing between them, so neither may drift: a name
 * resolved from a search follows coordinates edited by hand, and the altitude is measured from the
 * ground that location actually has. See UfoRecorderElement.schedulePlaceReverse /
 * applyGroundElevation.
 */
describe("UfoRecorderElement location coherence", () => {
  afterEach(() => {
    document.body.innerHTML = ""
  })

  const VALENSOLE = { name: "Valensole, Alpes-de-Haute-Provence, France", lat: 43.837, lng: 5.983 }
  const RIEZ = { name: "Riez, Alpes-de-Haute-Provence, France", lat: 43.817, lng: 6.093 }

  function setInput(element: UfoRecorderElement, id: string, value: string): void {
    const input = element.shadowRoot!.getElementById(id) as HTMLInputElement
    input.value = value
    input.dispatchEvent(new Event("input"))
  }

  function placeName(element: UfoRecorderElement): HTMLInputElement {
    return element.shadowRoot!.getElementById("placeName") as HTMLInputElement
  }

  async function searchValensole(element: UfoRecorderElement, reverse: () => Promise<PlaceMatch | undefined>): Promise<void> {
    element.placeSearchProvider = {
      attribution: { text: "© OpenStreetMap", url: "https://osm.org/copyright" },
      search: () => Promise.resolve([VALENSOLE]),
      reverse
    }
    const input = placeName(element)
    input.value = "Valensole"
    input.dispatchEvent(new Event("input"))
    ;(element.shadowRoot!.getElementById("search-place") as HTMLButtonElement).click()
    await waitFor(() => input.value === VALENSOLE.name, 1000)
  }

  it("re-derives the shown name when the coordinates are moved by hand", async () => {
    const element = mount()
    await searchValensole(element, () => Promise.resolve(RIEZ))

    setInput(element, "lat", "43.817")
    setInput(element, "lng", "6.093")
    await waitFor(() => placeName(element).value === RIEZ.name, 3000)

    expect(element.sightingData.place?.[0].name).toBe(RIEZ.name)
  })

  it("clears a name the coordinates have moved away from any place at all", async () => {
    const element = mount()
    await searchValensole(element, () => Promise.resolve(undefined))

    setInput(element, "lat", "0")
    setInput(element, "lng", "-30")
    await waitFor(() => placeName(element).value === "", 3000)

    // A name left describing somewhere the sighting is not at would be worse than none.
    expect(element.sightingData.place?.[0].name).toBeUndefined()
  })

  it("leaves a name the witness typed themselves alone", async () => {
    const reverse = vi.fn().mockResolvedValue(RIEZ)
    const element = mount()
    element.placeSearchProvider = {
      attribution: { text: "© OpenStreetMap", url: "https://osm.org/copyright" },
      search: () => Promise.resolve([]),
      reverse
    }
    const input = placeName(element)
    input.value = "the lavender field east of the farm"
    input.dispatchEvent(new Event("input"))
    setInput(element, "lat", "43.817")
    setInput(element, "lng", "6.093")
    await new Promise(resolve => setTimeout(resolve, 1200))

    // Their words describe a place no gazetteer lists; replacing them would lose the testimony.
    expect(reverse).not.toHaveBeenCalled()
    expect(placeName(element).value).toBe("the lavender field east of the farm")
  })

  it("doesn't re-ask about a move too small to be a different place", async () => {
    const reverse = vi.fn().mockResolvedValue(RIEZ)
    const element = mount()
    await searchValensole(element, reverse)

    // ~1 m: finer than any place name is.
    setInput(element, "lat", "43.83701")
    await new Promise(resolve => setTimeout(resolve, 1200))

    expect(reverse).not.toHaveBeenCalled()
  })
})

/**
 * A time zone is a rule, and the number it produces depends on the date it is asked about — summer
 * time included, and as it was then. See engine/time/TimeZones.ts.
 */
describe("UfoRecorderElement time zone picker", () => {
  afterEach(() => {
    document.body.innerHTML = ""
  })

  function setInput(element: UfoRecorderElement, id: string, value: string): void {
    const input = element.shadowRoot!.getElementById(id) as HTMLInputElement
    input.value = value
    input.dispatchEvent(new Event("input"))
  }

  function pickZone(element: UfoRecorderElement, zone: string): void {
    const select = element.shadowRoot!.getElementById("timeZone") as HTMLSelectElement
    select.value = zone
    select.dispatchEvent(new Event("change"))
  }

  function offset(element: UfoRecorderElement): HTMLInputElement {
    return element.shadowRoot!.getElementById("utcOffsetHours") as HTMLInputElement
  }

  it("offers the platform's zones alongside a plain entered offset", () => {
    const element = mount()
    const options = [...(element.shadowRoot!.getElementById("timeZone") as HTMLSelectElement).options]

    expect(options[0].value).toBe("")
    expect(options.map(option => option.value)).toContain("Europe/Paris")
  })

  it("derives the offset from the zone's rules at the observation's own date", () => {
    const element = mount()
    setInput(element, "obs-time", "1965-07-01T05:45")
    pickZone(element, "Europe/Paris")

    // France reintroduced summer time only in 1976 — July 1965 was UTC+1.
    expect(element.sightingData.utcOffsetHours).toBe(1)
    expect(offset(element).value).toBe("1")
  })

  it("re-derives it when the date moves to the other side of a summer-time rule", () => {
    const element = mount()
    setInput(element, "obs-time", "1965-07-01T05:45")
    pickZone(element, "Europe/Paris")
    expect(element.sightingData.utcOffsetHours).toBe(1)

    setInput(element, "obs-time", "2026-07-01T05:45")

    expect(element.sightingData.utcOffsetHours).toBe(2)
  })

  it("stops the offset being typed while a zone is deciding it, and hands it back when none is", () => {
    const element = mount()
    setInput(element, "obs-time", "1965-07-01T05:45")
    pickZone(element, "Europe/Paris")
    expect(offset(element).readOnly).toBe(true)

    pickZone(element, "")

    expect(offset(element).readOnly).toBe(false)
    // The zone's last answer stays as the witness's starting point.
    expect(element.sightingData.utcOffsetHours).toBe(1)
    expect(element.sightingData.timeZone).toBeUndefined()
  })

  it("records the rule alongside the number it produced", () => {
    const element = mount()
    setInput(element, "obs-time", "1965-07-01T05:45")
    pickZone(element, "Europe/Paris")

    expect(element.sightingData.timeZone).toBe("Europe/Paris")
    expect(element.sightingData.utcOffsetHours).toBe(1)
  })

  it("restores a loaded recording's zone", () => {
    const element = mount()
    element.sightingData = {
      version: 1,
      time: { year: 1965, month: 7, day: 1, hour: 5, minute: 45, raw: "1965-07-01T05:45" },
      utcOffsetHours: 1,
      timeZone: "Europe/Paris",
      timeline: { keyframes: [] }
    }

    expect((element.shadowRoot!.getElementById("timeZone") as HTMLSelectElement).value).toBe("Europe/Paris")
    expect(offset(element).readOnly).toBe(true)
  })
})

describe("showing the next meteor", () => {
  /** The meteor the scene will report, wherever the button is asked to look. */
  const SOMEWHERE_IN_THE_SKY = { t: 5000, altitudeDeg: 42, azimuthDeg: 137 }

  function armedWithAMeteor(): {
    element: UfoRecorderElement
    ufo: { currentTime: number; durationSeconds?: number; playbackState: string; togglePlayPause: () => void }
    toggles: () => number
  } {
    const element = mount()
    const ufo = nestedUfo(element) as unknown as {
      currentTime: number
      durationSeconds?: number
      playbackState: string
      togglePlayPause: () => void
    }
    ufo.durationSeconds = 300
    const scene = element.shadowRoot!.querySelector("rr0-scene") as unknown as { nextMeteor: () => unknown }
    scene.nextMeteor = () => SOMEWHERE_IN_THE_SKY
    let toggled = 0
    ufo.togglePlayPause = () => {
      toggled++
    }
    return { element, ufo, toggles: () => toggled }
  }

  function clickShowMeteor(element: UfoRecorderElement): void {
    ;(element.shadowRoot!.getElementById("show-meteor") as HTMLButtonElement).click()
  }

  it("stops a running recording, so the streak is still there when the eye arrives", () => {
    // The bug this exists for: a meteor is lit for about half a second. Seeking to one while the
    // recording keeps running lands on it and leaves it behind within a frame or two of the click —
    // which looks exactly like a button that does nothing, even though it aimed perfectly.
    const { element, ufo, toggles } = armedWithAMeteor()
    Object.defineProperty(ufo, "playbackState", { get: () => "playing", configurable: true })
    clickShowMeteor(element)
    expect(toggles()).toBe(1)
    expect(ufo.currentTime).toBe(SOMEWHERE_IN_THE_SKY.t)
    expect((element.shadowRoot!.getElementById("heading") as HTMLInputElement).value).toBe("137")
    expect((element.shadowRoot!.getElementById("pitch") as HTMLInputElement).value).toBe("42")
  })

  it("leaves an already-stopped recording alone rather than starting it", () => {
    // The trap on the other side: the pause is a toggle, so calling it unconditionally would set a
    // paused recording PLAYING and sweep straight past the meteor it was asked to show.
    const { element, ufo, toggles } = armedWithAMeteor()
    Object.defineProperty(ufo, "playbackState", { get: () => "paused", configurable: true })
    clickShowMeteor(element)
    expect(toggles()).toBe(0)
    expect(ufo.currentTime).toBe(SOMEWHERE_IN_THE_SKY.t)
  })
})

describe("the sky under an observation being edited", () => {
  function typeInto(element: UfoRecorderElement, id: string, value: string): void {
    const field = element.shadowRoot!.getElementById(id) as HTMLInputElement
    field.value = value
    field.dispatchEvent(new Event("input", { bubbles: true }))
    field.dispatchEvent(new Event("change", { bubbles: true }))
  }

  it("works out the meteors again once the date and place have been typed in", async () => {
    // The bug every "je ne vois rien" came through. The fall was cached against the Sighting's
    // IDENTITY — and this element edits ONE instance in place, so the schedule computed before any
    // date or place existed (necessarily empty) survived every edit a reader could make. The sky
    // line, which recomputes from the shower tables directly, would then announce 146 meteors an
    // hour while the renderer held none and the button offering to show one stayed hidden.
    //
    // Typed field by field on purpose: assigning sightingData replaces the Sighting wholesale,
    // which changes its identity and hides the bug completely.
    const element = mount()
    const button = element.shadowRoot!.getElementById("show-meteor") as HTMLButtonElement
    expect(button.hidden).toBe(true)
    // The Geminid peak over Provence — radiant 77 degrees up at 3 a.m., about 146 an hour.
    typeInto(element, "obs-time", "2023-12-14 03:00")
    typeInto(element, "lat", "43.8379")
    typeInto(element, "lng", "5.9822")
    typeInto(element, "durationSeconds", "300")
    await waitFor(() => !button.hidden)
    expect(button.hidden).toBe(false)
    // Either language: the test environment's own locale decides which, and the point here is that
    // the shower is named at all.
    expect(element.shadowRoot!.getElementById("sky-candidates")!.textContent).toMatch(/G[ée]minid/)
  })
})
