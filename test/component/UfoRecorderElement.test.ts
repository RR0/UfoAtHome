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
    setDecor(): void {}
    updateDecorAnchoring(): void {}
    pickBodyAt(): undefined {
      return undefined
    }
    pickDecorAt(): undefined {
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
    // them. decor is likewise always present (see Decor.ts), empty here since none was set.
    expect(element.sightingData).toEqual({
      ...json,
      timeline: { ...json.timeline, order: ["ufo-1"], groups: [] },
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

  it("shows the shape's title in the source dropdown once set, falling back to the raw sourceId otherwise", () => {
    const element = mount()
    const sourceSelect = element.shadowRoot!.getElementById("source") as HTMLSelectElement
    expect(sourceSelect.options[0].textContent).toBe("ufo-1")

    const titleInput = element.shadowRoot!.getElementById("shapeTitle") as HTMLInputElement
    titleInput.value = "Vaisseau principal"
    titleInput.dispatchEvent(new Event("input"))

    expect(sourceSelect.options[0].textContent).toBe("Vaisseau principal")
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
    addShapeButton.click() // "ufo-1" + "ufo-2", "ufo-2" selected

    const deleteShapeButton = element.shadowRoot!.getElementById("delete-shape") as HTMLButtonElement
    deleteShapeButton.click()

    expect(confirmSpy).toHaveBeenCalledWith(expect.stringContaining("ufo-2"))
    confirmSpy.mockRestore()
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

    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }))

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

  function pressKey(key: string): void {
    document.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true, composed: true }))
  }

  it("deletes the selected shape, with the same confirmation as the toolbar button", () => {
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true)
    const element = mount()
    const addShapeButton = element.shadowRoot!.getElementById("add-shape") as HTMLButtonElement
    addShapeButton.click() // "ufo-1" + "ufo-2", "ufo-2" selected

    pressKey("Delete")

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

    pressKey("Backspace")

    const sourceIds = element.sightingData.timeline.keyframes.flatMap(k => k.shapes.map(s => s.sourceId))
    expect(sourceIds).toEqual(["ufo-1"])
    confirmSpy.mockRestore()
  })

  it("declining the confirmation leaves the shape in place", () => {
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(false)
    const element = mount()
    const addShapeButton = element.shadowRoot!.getElementById("add-shape") as HTMLButtonElement
    addShapeButton.click()

    pressKey("Delete")

    const sourceIds = element.sightingData.timeline.keyframes.flatMap(k => k.shapes.map(s => s.sourceId))
    expect(sourceIds).toEqual(["ufo-1", "ufo-2"])
    confirmSpy.mockRestore()
  })

  it("refuses to delete the only remaining shape, even via the confirmed keyboard path", () => {
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true)
    const element = mount() // just "ufo-1"

    pressKey("Delete")

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

describe("UfoRecorderElement toolbar groups", () => {
  afterEach(() => {
    document.body.innerHTML = ""
  })

  it("renders each field group as a collapsible <details>, open by default", () => {
    const element = mount()
    const groups = element.shadowRoot!.querySelectorAll("details")
    expect(groups.length).toBe(6)
    for (const group of groups) {
      expect(group.hasAttribute("open")).toBe(true)
    }
  })

  it("orders groups observation, witness, location, temporal, circumstances, shape — closest to the render last, recording merged into shape, decor's own fields folded into location/witness", () => {
    const element = mount()
    const summaries = [...element.shadowRoot!.querySelectorAll("details summary")].map(s => s.id)
    expect(summaries).toEqual([
      "label-observation-group",
      "label-witness-group",
      "label-location-group",
      "label-temporal-group",
      "label-circumstances-group",
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

  function pressKey(key: string, options: { shiftKey?: boolean } = {}): void {
    document.dispatchEvent(new KeyboardEvent("keydown", { key, shiftKey: options.shiftKey ?? false }))
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

    pressKey("ArrowRight")
    pressKey("ArrowDown")

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

    pressKey("ArrowRight", { shiftKey: true }) // group bbox width 120 -> 124, symmetric about center

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

  it("starts with no decor and a disabled field row", () => {
    const element = mount()
    expect(element.sightingData.decor).toEqual([])
    const shadow = element.shadowRoot!
    expect((shadow.getElementById("delete-decor") as HTMLButtonElement).disabled).toBe(true)
    expect((shadow.getElementById("decorEast") as HTMLInputElement).disabled).toBe(true)
  })

  it("hides building/witness from the generic Decor group's own kind dropdown", () => {
    const element = mount()
    const shadow = element.shadowRoot!
    expect((shadow.getElementById("option-decor-building") as HTMLOptionElement).hidden).toBe(true)
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

  it("adds a building decor object from the Location group's own button, not the generic dropdown", () => {
    const element = mount()
    const shadow = element.shadowRoot!
    ;(shadow.getElementById("add-decor-building") as HTMLButtonElement).click()

    const decor = element.sightingData.decor!
    expect(decor).toHaveLength(1)
    expect(decor[0].kind).toBe("building")
  })

  it("adds a decor object of the picked kind, offset from previously added ones", () => {
    const element = mount()
    const shadow = element.shadowRoot!
    const kindSelect = shadow.getElementById("decorKind") as HTMLSelectElement
    const addButton = shadow.getElementById("add-decor") as HTMLButtonElement

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

  it("writes East/North/Heading/Lit edits back onto the selected decor object", () => {
    const element = mount()
    const shadow = element.shadowRoot!
    ;(shadow.getElementById("add-decor") as HTMLButtonElement).click()

    const eastInput = shadow.getElementById("decorEast") as HTMLInputElement
    const northInput = shadow.getElementById("decorNorth") as HTMLInputElement
    const headingInput = shadow.getElementById("decorHeading") as HTMLInputElement
    const litInput = shadow.getElementById("decorLit") as HTMLInputElement

    eastInput.value = "12.5"
    eastInput.dispatchEvent(new Event("input"))
    northInput.value = "-4"
    northInput.dispatchEvent(new Event("input"))
    headingInput.value = "90"
    headingInput.dispatchEvent(new Event("input"))
    litInput.checked = true
    litInput.dispatchEvent(new Event("input"))

    const [decor] = element.sightingData.decor!
    expect(decor).toMatchObject({ eastM: 12.5, northM: -4, headingDeg: 90, lit: true })
  })

  it("deletes the selected decor object and falls back to whichever one remains, or none", () => {
    const element = mount()
    const shadow = element.shadowRoot!
    const addButton = shadow.getElementById("add-decor") as HTMLButtonElement
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
    ;(shadow.getElementById("add-decor") as HTMLButtonElement).click()

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

  it("does not open the decor menu for a non-witness decor kind", () => {
    const element = mount()
    element.sightingData = {
      version: 1,
      timeline: { keyframes: [] },
      decor: [{ id: "decor-1", kind: "tree", eastM: 0, northM: 10 }]
    }
    const sceneEl = element.shadowRoot!.querySelector("rr0-scene") as unknown as { pickDecorAt: () => string }
    sceneEl.pickDecorAt = () => "decor-1"

    rightClickCanvas(element)

    expect((element.shadowRoot!.getElementById("decor-context-menu") as HTMLElement).hidden).toBe(true)
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
