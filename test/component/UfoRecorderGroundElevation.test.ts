import { describe, expect, it, afterEach, beforeAll, vi } from "vitest"
import { register, ELEMENT_NAME } from "../../src/component/UfoRecorderElement.js"
import type { UfoRecorderElement } from "../../src/component/UfoRecorderElement.js"
import type { WeatherProvider } from "../../src/engine/weather/WeatherProvider.js"

register()

/**
 * Its own file rather than another describe in UfoRecorderElement.test.ts: it mocks the elevation
 * registry so the ground under a place actually resolves, which changes what the Altitude field
 * means (it becomes a height above sea level, floored by that ground) for every test in whatever
 * module scope the mock lives in.
 *
 * What it guards is a loop that ran for as long as the editor was open: applyGroundElevation ends
 * by calling updateObserver (the Altitude field's meaning has changed, so the pose must agree with
 * it), and updateObserver schedules a ground lookup — so the two called each other about once a
 * second, each turn also re-asking the weather record and the geocoder. Three public services
 * hammered to re-derive numbers that never changed, which is what the user saw as "the UI refreshes
 * every second".
 */
let elevationLookups = 0

vi.mock("../../src/render3d/terrain/terrainSources.js", () => ({
  ELEVATION_SOURCES: [
    {
      id: "test-elevation",
      name: "Test elevation",
      credit: "test",
      creditUrl: "https://example.org",
      create: () => ({
        getElevationGrid: (bounds: unknown, resolution: { width: number; height: number }) => {
          elevationLookups++
          const { width, height } = resolution
          return Promise.resolve({ bounds, width, height, heights: new Float32Array(width * height).fill(585) })
        }
      })
    }
  ],
  IMAGERY_SOURCES: [
    {
      id: "test-imagery",
      name: "Test imagery",
      credit: "test",
      creditUrl: "https://example.org",
      create: () => ({ getImagery: () => Promise.resolve(undefined) })
    }
  ]
}))

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
    render(): void {}
    dispose(): void {}
    startTwinkle(): void {}
    stopTwinkle(): void {}
    setAnimationsRunning(): void {}
  }
}))

let weatherLookups = 0

const RECORD_PROVIDER: WeatherProvider = {
  getWeather: () => {
    weatherLookups++
    return Promise.resolve(undefined)
  }
}

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
  globalThis.fetch = vi.fn().mockResolvedValue({ arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)) }) as typeof fetch
  globalThis.ResizeObserver = class {
    observe(): void {}
    unobserve(): void {}
    disconnect(): void {}
  } as unknown as typeof ResizeObserver
})

function mount(): UfoRecorderElement {
  const element = document.createElement(ELEMENT_NAME) as UfoRecorderElement
  element.weatherProvider = RECORD_PROVIDER
  document.body.appendChild(element)
  elevationLookups = 0
  weatherLookups = 0
  return element
}

function setInput(element: UfoRecorderElement, id: string, value: string): void {
  const input = element.shadowRoot!.getElementById(id) as HTMLInputElement
  input.value = value
  input.dispatchEvent(new Event("input"))
}

function stateDateAndPlace(element: UfoRecorderElement): void {
  setInput(element, "lat", "43.837")
  setInput(element, "lng", "5.983")
  setInput(element, "utcOffsetHours", "1")
  setInput(element, "obs-time", "1965-07-01T05:00")
}

const settle = (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms))

describe("UfoRecorderElement ground elevation", () => {
  afterEach(() => {
    document.body.innerHTML = ""
  })

  it("asks for the ground under a place once, and stays quiet afterwards", async () => {
    const element = mount()
    stateDateAndPlace(element)
    // Long enough for the debounced lookup, the write-back it triggers, and two more turns of the
    // loop this guards against (its period was the ~900 ms elevation debounce).
    await settle(3000)

    expect(elevationLookups).toBe(1)
    expect(element.shadowRoot!.getElementById("ground-elevation")!.textContent).toContain("585")
    // The same loop re-asked the weather record every turn; one place and one date is one question.
    expect(weatherLookups).toBeLessThanOrEqual(2)
  }, 10_000)

  it("asks again when the witness is somewhere else", async () => {
    const element = mount()
    stateDateAndPlace(element)
    await settle(1600)
    expect(elevationLookups).toBe(1)

    setInput(element, "lat", "45.923")
    setInput(element, "lng", "6.869")
    await settle(1600)

    expect(elevationLookups).toBe(2)
  }, 10_000)
})
