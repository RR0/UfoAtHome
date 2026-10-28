import { describe, expect, it, afterEach, beforeAll, vi } from "vitest"
import { register, ELEMENT_NAME } from "../../src/component/SightingEditorElement.js"
import type { SightingEditorElement } from "../../src/component/SightingEditorElement.js"
import type { WeatherProvider } from "../../src/engine/weather/WeatherProvider.js"
import type { Weather } from "../../src/engine/model/Weather.js"

register()

/*
 * What the editor does when a shape is moved, and when the weather records cannot be asked (no date, no place, a date half
 * entered). Apart from SightingEditorElement.test.ts, whose jsdom worker already uses about 4 GB of the 4 GB the CI gives Node.
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
    setLaunchPlumes(): void {}
    setBeams(): void {}
    pickTrafficAt(): undefined {
      return undefined
    }
    pickOpticsAt(): undefined {
      return undefined
    }
    pickRailwayAt(): undefined {
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
    setLensGhosts(): void {}
    setPerception(): void {}
    setSkyUnknown(): void {}
    setLensOptics(): void {}
    setExposure(): void {}
    private meteors: { t: number; durationMs: number }[] = []
    setMeteorShower(meteors: { t: number; durationMs: number }[]): void {
      this.meteors = meteors
    }
    get meteorSchedule(): { t: number; durationMs: number }[] {
      return this.meteors
    }
    groundHidesDirection(altitudeDeg: number): boolean {
      return altitudeDeg < 0
    }
    get groundKey(): string {
      return ""
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

/** No meteorological record: the suite never reaches the network. */
const NO_RECORD_PROVIDER: WeatherProvider = { getWeather: () => Promise.resolve(undefined) }

function mount(weatherProvider: WeatherProvider = NO_RECORD_PROVIDER): SightingEditorElement {
  const element = document.createElement(ELEMENT_NAME) as SightingEditorElement
  element.weatherProvider = weatherProvider
  document.body.appendChild(element)
  ;(element.shadowRoot!.getElementById("add-shape-oval") as HTMLButtonElement).click()
  return element
}

async function waitFor(check: () => boolean, timeoutMs = 20000): Promise<void> {
  const start = Date.now()
  while (!check()) {
    if (Date.now() - start > timeoutMs) throw new Error("waitFor timed out")
    await new Promise(resolve => setTimeout(resolve, 5))
  }
}

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

function pressKey(element: SightingEditorElement, key: string): void {
  element.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true, composed: true }))
}

describe("moving a shape", () => {
  afterEach(() => {
    document.body.innerHTML = ""
  })

  it("a moved shape drops the direction it carried when the pose gives none to state, so the scene follows its box", () => {
    const element = mount()
    const json = oneShapeJson()
    Object.assign(json.timeline.keyframes[0].shapes[0].shape, { aim: { azimuthDeg: 10, altitudeDeg: 5 } })
    element.sightingData = json
    pressKey(element, "ArrowLeft")

    const moved = element.sightingData.timeline.keyframes[0].shapes[0].shape
    expect(moved.bounds.x).toBe(96)
    expect(moved.aim).toBeUndefined()
  })

})

describe("weather records that cannot be asked", () => {
  afterEach(() => {
    document.body.innerHTML = ""
  })

  const SOURCE = { id: "era5", name: "ERA5 (Open-Meteo)", url: "https://example.org/archive?start_date=1965-07-01" }

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

  function recordProvider(): WeatherProvider {
    return {
      getWeather: query => Promise.resolve({ source: SOURCE, samples: query.points.map(point => ({ time: point.time, weather: ON_RECORD })) })
    }
  }

  function setInput(shadow: ShadowRoot, id: string, value: string): void {
    const input = shadow.getElementById(id) as HTMLInputElement
    input.value = value
    input.dispatchEvent(new Event("input"))
  }

  function stateDateAndPlace(element: SightingEditorElement): void {
    const shadow = element.shadowRoot!
    setInput(shadow, "lat", "43.837")
    setInput(shadow, "lng", "5.983")
    setInput(shadow, "utcOffsetHours", "1")
    setInput(shadow, "obs-time", "1965-07-01T05:00")
  }

  it("says beside the greyed box which half is lacking, not only in a tooltip", () => {
    const element = mount(recordProvider())
    const shadow = element.shadowRoot!
    const said = () => shadow.getElementById("weather-source-text")!.textContent!.trim()
    setInput(shadow, "obs-time", "1965-07-01T05:00")
    expect(said()).toBe("A place with coordinates is needed to look up the weather records")
    setInput(shadow, "obs-time", "")
    setInput(shadow, "lat", "43.837")
    setInput(shadow, "lng", "5.983")
    expect(said()).toBe("A full date (year, month and day) is needed to look up the weather records")
  })

  it("forgets the record it asked when the date is taken away, and says why the box is unavailable", async () => {
    const element = mount(recordProvider())
    const shadow = element.shadowRoot!
    stateDateAndPlace(element)
    await waitFor(() => element.sightingData.weatherSource !== undefined)

    setInput(shadow, "obs-time", "")

    expect(element.sightingData.weatherSource).toBeUndefined()
    expect((shadow.getElementById("weatherInferred") as HTMLInputElement).disabled).toBe(true)
    expect(shadow.getElementById("weather-source-text")!.textContent!.trim()).toContain("full date")
  })

  it("forgets the record when a segment of the date is taken out of the picker, though the field writes nothing for it", async () => {
    const element = mount(recordProvider())
    const shadow = element.shadowRoot!
    stateDateAndPlace(element)
    await waitFor(() => element.sightingData.weatherSource !== undefined)

    const picker = shadow.getElementById("obs-time-native") as HTMLInputElement
    Object.defineProperty(picker, "validity", { configurable: true, value: { badInput: true } })
    picker.dispatchEvent(new Event("input", { bubbles: true }))

    expect(element.sightingData.weatherSource).toBeUndefined()
    expect((shadow.getElementById("weatherInferred") as HTMLInputElement).disabled).toBe(true)
    expect(shadow.getElementById("weather-source-text")!.textContent!.trim()).toContain("full date")
  })

  it("forgets a record from the forecast model too (a date of today is what a recording made from scratch starts with)", async () => {
    const provider: WeatherProvider = {
      getWeather: query => Promise.resolve({ source: { ...SOURCE, id: "open-meteo-forecast" }, samples: query.points.map(point => ({ time: point.time, weather: ON_RECORD })) })
    }
    const element = mount(provider)
    const shadow = element.shadowRoot!
    stateDateAndPlace(element)
    await waitFor(() => element.sightingData.weatherSource !== undefined)
    expect(element.sightingData.weatherSource!.id).toBe("open-meteo-forecast")

    setInput(shadow, "obs-time", "1965")

    expect(element.sightingData.weatherSource).toBeUndefined()
    expect(shadow.getElementById("weather-source-text")!.textContent!.trim()).toContain("full date")
  })

})
