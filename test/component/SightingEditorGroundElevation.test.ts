import { describe, expect, it, afterEach, beforeAll, vi } from "vitest"
import { register, ELEMENT_NAME } from "../../src/component/SightingEditorElement.js"
import type { SightingEditorElement } from "../../src/component/SightingEditorElement.js"
import type { WeatherProvider } from "../../src/engine/weather/WeatherProvider.js"

register()

/**
 * Its own file rather than another describe in SightingEditorElement.test.ts: it mocks the elevation
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
    setCloudRendering(): void {}
    setCloudOffset(): void {}
    setGait(): void {}
    setTerrainOrigin(): void {}
    setStatedRoads(): void {}
    setTraces(): void {}
    setTracesShown(): void {}
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
    referenceAspect(): undefined {
      return undefined
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
    setMeteorShower(): void {}
    get meteorSchedule(): unknown[] {
      return []
    }
    meteorMidpoint(): undefined {
      return undefined
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

let weatherLookups = 0

const RECORD_PROVIDER: WeatherProvider = {
  getWeather: () => {
    weatherLookups++
    return Promise.resolve(undefined)
  }
}

beforeAll(() => {
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
  globalThis.fetch = vi.fn().mockResolvedValue({ arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)) }) as typeof fetch
  globalThis.ResizeObserver = class {
    observe(): void {}
    unobserve(): void {}
    disconnect(): void {}
  } as unknown as typeof ResizeObserver
})

function mount(): SightingEditorElement {
  const element = document.createElement(ELEMENT_NAME) as SightingEditorElement
  element.weatherProvider = RECORD_PROVIDER
  document.body.appendChild(element)
  elevationLookups = 0
  weatherLookups = 0
  return element
}

function setInput(element: SightingEditorElement, id: string, value: string): void {
  const input = element.shadowRoot!.getElementById(id) as HTMLInputElement
  input.value = value
  input.dispatchEvent(new Event("input"))
}

function stateDateAndPlace(element: SightingEditorElement): void {
  setInput(element, "lat", "43.837")
  setInput(element, "lng", "5.983")
  setInput(element, "utcOffsetHours", "1")
  setInput(element, "obs-time", "1965-07-01T05:00")
}

const settle = (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms))

describe("SightingEditorElement ground elevation", () => {
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
  })

  it("asks again when the observer is somewhere else", async () => {
    const element = mount()
    stateDateAndPlace(element)
    await settle(1600)
    expect(elevationLookups).toBe(1)

    setInput(element, "lat", "45.923")
    setInput(element, "lng", "6.869")
    await settle(1600)

    expect(elevationLookups).toBe(2)
  })
})
