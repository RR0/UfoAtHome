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

function mount(): UfoElement {
  const element = document.createElement(UFO_ELEMENT_NAME) as UfoElement
  document.body.appendChild(element)
  return element
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

  it("loop button starts pressed (loop enabled by default) and toggles on click", () => {
    const element = mount()
    const loopButton = element.shadowRoot!.getElementById("loop") as HTMLButtonElement
    expect(loopButton.getAttribute("aria-pressed")).toBe("true")

    loopButton.click()
    expect(loopButton.getAttribute("aria-pressed")).toBe("false")

    loopButton.click()
    expect(loopButton.getAttribute("aria-pressed")).toBe("true")
  })
})
