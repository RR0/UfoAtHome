import { describe, expect, it, beforeAll, vi } from "vitest"
import { register, ELEMENT_NAME } from "../../src/component/SightingEditorElement.js"
import type { SightingEditorElement } from "../../src/component/SightingEditorElement.js"
import type { WeatherProvider } from "../../src/engine/weather/WeatherProvider.js"

register()

/*
 * What the editor says of the sky and of the instrument for an eclipse, the Moon and the filter. Apart from
 * SightingEditorElement.test.ts, whose jsdom worker already uses about 4 GB of the 4 GB the CI gives Node:
 * five more tests there took it over (heap out of memory), where here they cost a fresh worker.
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

/** No meteorological record: the suite never reaches the network (see SightingEditorElement.test.ts). */
const NO_RECORD_PROVIDER: WeatherProvider = { getWeather: () => Promise.resolve(undefined) }

/** An editor holding one shape, as an author would add it with +. */
function mount(): SightingEditorElement {
  const element = document.createElement(ELEMENT_NAME) as SightingEditorElement
  element.weatherProvider = NO_RECORD_PROVIDER
  document.body.appendChild(element)
  ;(element.shadowRoot!.getElementById("add-shape") as HTMLButtonElement).click()
  return element
}

async function waitFor(check: () => boolean, timeoutMs = 20000): Promise<void> {
  const start = Date.now()
  while (!check()) {
    if (Date.now() - start > timeoutMs) throw new Error("waitFor timed out")
    await new Promise(resolve => setTimeout(resolve, 5))
  }
}

function typeInto(element: SightingEditorElement, id: string, value: string): void {
  const field = element.shadowRoot!.getElementById(id) as HTMLInputElement
  field.value = value
  field.dispatchEvent(new Event("input", { bubbles: true }))
  field.dispatchEvent(new Event("change", { bubbles: true }))
}

function skyLine(element: SightingEditorElement): string {
  return element.shadowRoot!.getElementById("sky-candidates")!.textContent ?? ""
}

describe("the sky and the instrument for an eclipse, the Moon and a filter", () => {
  /** Anywhere: Reims for the eclipse of 1999, Paris for the Moon. The offset is typed, as above. */
  function overPlace(element: SightingEditorElement, when: string, offsetHours: string, lat: string, lng: string): void {
    typeInto(element, "obs-time", when)
    typeInto(element, "utcOffsetHours", offsetHours)
    typeInto(element, "lat", lat)
    typeInto(element, "lng", lng)
  }

  it("puts a solar filter on at the playhead, takes it off later, and says so only where it takes something off", async () => {
    const element = mount()
    const select = element.shadowRoot!.getElementById("filter") as HTMLSelectElement
    const choose = (value: string) => {
      select.value = value
      select.dispatchEvent(new Event("change"))
    }
    const poses = () => element.sightingData!.observerTrack!.keyframes
    typeInto(element, "durationSeconds", "60")
    expect([...select.options].map(option => option.value)).toEqual(["none", "solar-visual", "solar-photo"])
    expect(select.value).toBe("none")
    // Choosing none where nothing was on says nothing, and leaves no keyframe.
    choose("none")
    expect(poses().filter(keyframe => keyframe.pose.filter !== undefined)).toHaveLength(0)
    choose("solar-visual")
    expect(poses().find(keyframe => keyframe.t === 0)?.pose.filter).toBe("solar-visual")
    // Later on the timeline, the glasses come off: that keyframe states "none" outright.
    ;(element as unknown as { ufoElement: { currentTime: number } }).ufoElement.currentTime = 5000
    choose("none")
    expect(poses().find(keyframe => keyframe.t === 5000)?.pose.filter).toBe("none")
    expect(poses().find(keyframe => keyframe.t === 0)?.pose.filter).toBe("solar-visual")
  })

  it("names a total eclipse, and its two minutes, without anyone declaring it", async () => {
    const element = mount()
    overPlace(element, "1999-08-11 12:23", "2", "49.2583", "4.0317")
    await waitFor(() => /eclipse|éclipse/i.test(skyLine(element)))
    expect(skyLine(element)).toMatch(/Total solar eclipse|Éclipse totale de Soleil/)
    expect(skyLine(element)).toMatch(/2 min \d+ s/)
  })

  it("says how much of the Sun a partial eclipse hides", async () => {
    const element = mount()
    overPlace(element, "1999-08-11 12:23", "2", "48.8566", "2.3522")
    await waitFor(() => /eclipse|éclipse/i.test(skyLine(element)))
    expect(skyLine(element)).toMatch(/hides 99% of the Sun|cache 99 % du Soleil/)
  })

  it("calls a perigee full Moon a supermoon, with its width, and does not make the horizon one", async () => {
    const element = mount()
    overPlace(element, "2016-11-14 17:50", "1", "48.8566", "2.3522")
    await waitFor(() => /supermoon|super-lune/i.test(skyLine(element)))
    expect(skyLine(element)).toMatch(/0[.,]55\d°/)
    expect(skyLine(element)).toMatch(/no bigger on the horizon than overhead|pas plus grosse à l'horizon qu'au zénith/)
  })

  it("names the lune rousse only in the lunation after Easter", async () => {
    const element = mount()
    overPlace(element, "2026-05-01 21:40", "2", "48.8566", "2.3522")
    await waitFor(() => /lune rousse/.test(skyLine(element)))
    expect(skyLine(element)).toMatch(/after Easter|suit Pâques/)
    overPlace(element, "2026-05-31 22:00", "2", "48.8566", "2.3522")
    await waitFor(() => !/lune rousse/.test(skyLine(element)))
  })
})
