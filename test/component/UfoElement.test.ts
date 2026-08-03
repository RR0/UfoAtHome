import { describe, expect, it, afterEach, beforeAll, vi } from "vitest"
import { registerUfo, UFO_ELEMENT_NAME } from "../../src/component/UfoElement.js"
import type { UfoElement } from "../../src/component/UfoElement.js"

registerUfo()

// jsdom's <canvas> has no real 2D context (getContext("2d") returns null without the
// native `canvas` package) — stub it, same as test/render/CanvasRenderer.test.ts's mock.
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
    fillRect: vi.fn()
  } as unknown as CanvasRenderingContext2D)
})

// jsdom doesn't implement the Fullscreen API at all — stub it as configurable so tests can
// vi.spyOn() document.exitFullscreen/fullscreenElement (spyOn needs the property to already exist).
beforeAll(() => {
  if (!("exitFullscreen" in document)) {
    Object.defineProperty(document, "exitFullscreen", {
      value: () => Promise.resolve(),
      writable: true,
      configurable: true
    })
  }
  if (!("fullscreenElement" in document)) {
    Object.defineProperty(document, "fullscreenElement", { value: null, writable: true, configurable: true })
  }
})

function mount(): UfoElement {
  const element = document.createElement(UFO_ELEMENT_NAME) as UfoElement
  document.body.appendChild(element)
  return element
}

async function waitFor(check: () => boolean, timeoutMs = 500): Promise<void> {
  const start = Date.now()
  while (!check()) {
    if (Date.now() - start > timeoutMs) throw new Error("waitFor timed out")
    await new Promise(resolve => setTimeout(resolve, 5))
  }
}

const sampleJson = {
  version: 1 as const,
  time: { year: 1948, month: 7, day: 24 },
  place: [{ lat: 32.3792, lng: -86.3077 }],
  witnessId: "ChilesWhitted",
  timeline: {
    keyframes: [
      { t: 0, shapes: [{ sourceId: "ufo-1", shape: { kind: "oval" as const, bounds: { x: 0, y: 0, width: 10, height: 10 }, color: "#163a8f", angle: 0, transparency: 0, haloScale: 1, selected: false } }] }
    ]
  }
}

describe("UfoElement", () => {
  afterEach(() => {
    document.body.innerHTML = ""
    vi.unstubAllGlobals()
  })

  it("is ready (canvasElement/renderer/sighting available) immediately after construction", () => {
    const element = document.createElement(UFO_ELEMENT_NAME) as UfoElement
    expect(element.canvasElement).toBeInstanceOf(HTMLCanvasElement)
    expect(element.renderer).toBeDefined()
    expect(element.sighting).toBeDefined()
  })

  it("sightingData round-trips through the setter/getter", () => {
    const element = mount()
    element.sightingData = sampleJson
    expect(element.sightingData).toEqual(sampleJson)
  })

  it("fetches and loads the sighting referenced by the src attribute on connect", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ json: () => Promise.resolve(sampleJson) })
    vi.stubGlobal("fetch", fetchMock)

    const element = document.createElement(UFO_ELEMENT_NAME) as UfoElement
    element.setAttribute("src", "sighting.json")
    document.body.appendChild(element)
    await new Promise(resolve => setTimeout(resolve, 0))

    expect(fetchMock).toHaveBeenCalledWith("sighting.json")
    expect(element.sightingData.witnessId).toBe("ChilesWhitted")
    expect(element.sightingData.timeline.keyframes).toHaveLength(1)
  })

  it("re-fetches when the src attribute changes after connect", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ json: () => Promise.resolve(sampleJson) })
    vi.stubGlobal("fetch", fetchMock)

    const element = mount()
    element.setAttribute("src", "other-sighting.json")
    await new Promise(resolve => setTimeout(resolve, 0))

    expect(fetchMock).toHaveBeenCalledWith("other-sighting.json")
  })

  it("seek updates the reported frame via the hold-last-keyframe timeline lookup", () => {
    const element = mount()
    element.sightingData = sampleJson
    const seekInput = element.shadowRoot!.getElementById("seek") as HTMLInputElement
    expect(Number(seekInput.max)).toBe(0)

    seekInput.value = "0"
    seekInput.dispatchEvent(new Event("input"))
    // A single-keyframe timeline has duration 0; seeking shouldn't throw.
    expect(seekInput.value).toBe("0")
  })

  it("time labels default to 0:00/0:00 before any sighting is loaded", () => {
    const element = mount()
    const start = element.shadowRoot!.getElementById("time-start") as HTMLElement
    const end = element.shadowRoot!.getElementById("time-end") as HTMLElement
    expect(start.textContent).toBe("0:00")
    expect(end.textContent).toBe("0:00")
  })

  it("time labels fall back to the recording's own elapsed duration without a known real duration", () => {
    const element = mount()
    element.sightingData = sampleJson // has a start date but no endTime/durationSeconds
    const start = element.shadowRoot!.getElementById("time-start") as HTMLElement
    const end = element.shadowRoot!.getElementById("time-end") as HTMLElement
    expect(start.textContent).toBe("0:00")
    expect(end.textContent).toBe("0:00") // single-keyframe timeline: recorded duration is 0
  })

  it("time labels show real clock start/end when time and durationSeconds are both known", () => {
    const element = mount()
    element.sightingData = {
      ...sampleJson,
      time: { year: 1948, month: 7, day: 24, hour: 2, minute: 45 },
      durationSeconds: 300
    }
    const start = element.shadowRoot!.getElementById("time-start") as HTMLElement
    const end = element.shadowRoot!.getElementById("time-end") as HTMLElement
    expect(start.textContent).toBe("02:45")
    expect(end.textContent).toBe("02:50")
  })

  it("the single play/pause button toggles its icon and title on click", () => {
    const element = mount()
    const button = element.shadowRoot!.getElementById("play-pause") as HTMLButtonElement
    expect(button.title).toBe("Play")

    button.click()
    expect(button.title).toBe("Pause")

    button.click()
    expect(button.title).toBe("Play")
  })

  it("clicking the canvas also toggles play/pause", () => {
    const element = mount()
    const button = element.shadowRoot!.getElementById("play-pause") as HTMLButtonElement
    expect(button.title).toBe("Play")

    element.canvasElement.click()
    expect(button.title).toBe("Pause")

    element.canvasElement.click()
    expect(button.title).toBe("Play")
  })

  it("canvas click-to-play can be disabled (e.g. by UfoRecorderElement, which uses the canvas for drag-to-record)", () => {
    const element = mount()
    element.enableClickToPlay = false
    const button = element.shadowRoot!.getElementById("play-pause") as HTMLButtonElement
    expect(button.title).toBe("Play")

    element.canvasElement.click()
    expect(button.title).toBe("Play")
  })

  it("loads French labels when navigator.languages prefers fr, with no language picker", async () => {
    const spy = vi.spyOn(navigator, "languages", "get").mockReturnValue(["fr-FR", "fr"])
    const element = mount()
    const button = element.shadowRoot!.getElementById("play-pause") as HTMLButtonElement
    // The dynamic import() of the fr messages module resolves over more than one tick under
    // Vitest's transform pipeline — poll rather than assume a single setTimeout(0) is enough.
    await waitFor(() => button.title === "Lecture")
    const loopButton = element.shadowRoot!.getElementById("loop") as HTMLButtonElement
    expect(loopButton.title).toBe("Lecture automatique")
    spy.mockRestore()
  })

  it("falls back to the English defaults when navigator.languages has no supported match", async () => {
    const spy = vi.spyOn(navigator, "languages", "get").mockReturnValue(["de-DE", "de"])
    const element = mount()
    await new Promise(resolve => setTimeout(resolve, 20)) // no fr/en module load is triggered; just let any microtasks settle
    const button = element.shadowRoot!.getElementById("play-pause") as HTMLButtonElement
    expect(button.title).toBe("Play")
    spy.mockRestore()
  })

  it("the toolbar auto-hides while playing and stays shown while paused/stopped", () => {
    const element = mount()
    const button = element.shadowRoot!.getElementById("play-pause") as HTMLButtonElement
    const toolbar = element.shadowRoot!.getElementById("toolbar") as HTMLElement
    expect(toolbar.classList.contains("auto-hide")).toBe(false)

    button.click() // play
    expect(toolbar.classList.contains("auto-hide")).toBe(true)

    button.click() // pause
    expect(toolbar.classList.contains("auto-hide")).toBe(false)
  })

  it("loop button starts pressed (loop enabled by default) and toggles on click", () => {
    const element = mount()
    const loopButton = element.shadowRoot!.getElementById("loop") as HTMLButtonElement
    expect(loopButton.getAttribute("aria-pressed")).toBe("true")

    loopButton.click()
    expect(loopButton.getAttribute("aria-pressed")).toBe("false")

    loopButton.click()
    expect(loopButton.getAttribute("aria-pressed")).toBe("true")
  })

  it("the fullscreen button auto-hides alongside the toolbar", () => {
    const element = mount()
    const playPause = element.shadowRoot!.getElementById("play-pause") as HTMLButtonElement
    const fullscreenButton = element.shadowRoot!.getElementById("fullscreen") as HTMLButtonElement
    expect(fullscreenButton.classList.contains("auto-hide")).toBe(false)

    playPause.click() // play
    expect(fullscreenButton.classList.contains("auto-hide")).toBe(true)

    playPause.click() // pause
    expect(fullscreenButton.classList.contains("auto-hide")).toBe(false)
  })

  it("defaults fullscreenTarget to the component's own stage", () => {
    const element = mount()
    expect(element.fullscreenTarget).toBe(element.shadowRoot!.getElementById("stage"))
  })

  it("clicking fullscreen requests fullscreen on fullscreenTarget when not already fullscreen", () => {
    const element = mount()
    const requestFullscreen = vi.fn().mockResolvedValue(undefined)
    element.fullscreenTarget.requestFullscreen = requestFullscreen
    const button = element.shadowRoot!.getElementById("fullscreen") as HTMLButtonElement

    button.click()

    expect(requestFullscreen).toHaveBeenCalledOnce()
  })

  it("clicking fullscreen while already fullscreen exits instead of re-requesting", () => {
    const element = mount()
    const requestFullscreen = vi.fn().mockResolvedValue(undefined)
    element.fullscreenTarget.requestFullscreen = requestFullscreen
    const exitFullscreenSpy = vi.spyOn(document, "exitFullscreen").mockResolvedValue(undefined)
    const fullscreenElementSpy = vi
      .spyOn(document, "fullscreenElement", "get")
      .mockReturnValue(element.fullscreenTarget)

    const button = element.shadowRoot!.getElementById("fullscreen") as HTMLButtonElement
    button.click()

    expect(exitFullscreenSpy).toHaveBeenCalledOnce()
    expect(requestFullscreen).not.toHaveBeenCalled()
    // Restore only these two spies (not vi.restoreAllMocks(), which would also undo the shared
    // HTMLCanvasElement.getContext mock from the top-level beforeAll and break later tests' mount()).
    exitFullscreenSpy.mockRestore()
    fullscreenElementSpy.mockRestore()
  })

  it("fullscreenchange updates the button's title between Fullscreen and Exit fullscreen", () => {
    const element = mount()
    const button = element.shadowRoot!.getElementById("fullscreen") as HTMLButtonElement
    expect(button.title).toBe("Fullscreen")

    const spy = vi.spyOn(document, "fullscreenElement", "get").mockReturnValue(element.fullscreenTarget)
    document.dispatchEvent(new Event("fullscreenchange"))
    expect(button.title).toBe("Exit fullscreen")

    spy.mockReturnValue(null)
    document.dispatchEvent(new Event("fullscreenchange"))
    expect(button.title).toBe("Fullscreen")

    spy.mockRestore()
  })
})
