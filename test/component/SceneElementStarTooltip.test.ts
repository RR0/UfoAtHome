import { describe, expect, it, afterEach, beforeAll, vi } from "vitest"
import { registerScene, SCENE_ELEMENT_NAME } from "../../src/component/SceneElement.js"
import type { SceneElement } from "../../src/component/SceneElement.js"
import type { BrightStar } from "../../src/engine/astronomy/brightStarCatalog.js"

registerScene()

/**
 * Its own file rather than another describe in SceneElement.test.ts, because the whole point of it
 * is a SceneRenderer mock that ANSWERS pickStarAt — and a vi.mock is module-scoped, so putting a
 * renderer that finds a star under the pointer beside four hundred assertions written against one
 * that finds nothing would shift them all silently.
 */
const hit: { star?: BrightStar; altitudeDeg: number } = { altitudeDeg: 0 }

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
    pickStarAt(): { star: BrightStar; altitudeDeg: number } | undefined {
      return hit.star ? { star: hit.star, altitudeDeg: hit.altitudeDeg } : undefined
    }
    isScreenPointOccluded(): boolean {
      return false
    }
    decorDistancesAt(): { behindM?: number; inFrontM?: number } {
      return {}
    }
    setInstrument(): void {}
    setLensOptics(): void {}
    setMeteorShower(): void {}
    get meteorSchedule(): [] {
      return []
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

vi.mock("../../src/render3d/WeatherAudio.js", () => ({
  WeatherAudio: class {
    resume(): void {}
    setAmbient(): void {}
    dispose(): void {}
    playThunder(): void {}
    setPaused(): void {}
  }
}))

beforeAll(() => {
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({
    save: vi.fn(), restore: vi.fn(), beginPath: vi.fn(), closePath: vi.fn(), fill: vi.fn(),
    ellipse: vi.fn(), moveTo: vi.fn(), lineTo: vi.fn(), translate: vi.fn(), rotate: vi.fn(),
    clearRect: vi.fn(), strokeRect: vi.fn(), stroke: vi.fn(), fillRect: vi.fn()
  } as unknown as CanvasRenderingContext2D)
  globalThis.fetch = vi.fn().mockResolvedValue({ arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)) }) as typeof fetch
  globalThis.ResizeObserver = class {
    observe(): void {}
    unobserve(): void {}
    disconnect(): void {}
  } as unknown as typeof ResizeObserver
})

describe("SceneElement star tooltip", () => {
  afterEach(() => {
    hit.star = undefined
    document.body.innerHTML = ""
  })

  function hover(element: SceneElement): string | undefined {
    const canvas = element.ufoElement.canvasElement
    // jsdom lays nothing out, so every rect is 0x0 — and handlePointerMove bails on a zero-sized
    // canvas before it ever looks at the sky. Mocked 1:1 with the canvas's own pixels, the same
    // substitute this project's other pointer tests make.
    canvas.getBoundingClientRect = () =>
      ({ left: 0, top: 0, width: canvas.width, height: canvas.height, right: canvas.width, bottom: canvas.height, x: 0, y: 0, toJSON: () => "" })
    // jsdom has no global PointerEvent, and handlePointerMove only reads clientX/clientY — a
    // plain MouseEvent dispatched under that name exercises the same handler, the same substitute
    // the recorder's own drag tests make.
    canvas.dispatchEvent(new MouseEvent("pointermove", { clientX: 10, clientY: 10, bubbles: true, composed: true }))
    const tooltip = element.shadowRoot!.getElementById("hover-tooltip")!
    return tooltip.hidden ? undefined : tooltip.textContent!
  }

  function mount(): SceneElement {
    const element = document.createElement(SCENE_ELEMENT_NAME) as SceneElement
    document.body.appendChild(element)
    return element
  }

  /*
   * Three things and not one. A name identifies without explaining: what makes a bright point a
   * candidate for a misidentification is how bright it was and how low it stood, which is the
   * question this whole tooltip exists to answer.
   */
  it("names the star, and says how bright it was and how high it stood", () => {
    hit.star = { name: { en: "Capella", fr: "Capella" }, raHours: 5.27815, decDeg: 45.997991, mag: 0.08 }
    hit.altitudeDeg = 21.4
    const element = mount()

    expect(hover(element)).toBe("Capella — mag 0.08, 21° above the horizon")
  })

  /*
   * Two decimals below magnitude 1, as the apparent-size readout already does with degrees. At one
   * decimal the four brightest stars in the table printed as "mag 0,0" and "mag -0" — Vega is 0.03
   * and Rigil Kentaurus -0.01, and a reader has no way to tell that from a field that failed.
   */
  it("keeps the near-zero magnitudes legible instead of rounding them to nothing", () => {
    hit.star = { name: { en: "Rigil Kentaurus", fr: "Rigil Kentaurus" }, raHours: 14.6608, decDeg: -60.834, mag: -0.01 }
    hit.altitudeDeg = 3
    const element = mount()

    expect(hover(element)).toBe("Rigil Kentaurus — mag -0.01, 3° above the horizon")
  })

  it("says nothing when nothing named is under the pointer", () => {
    const element = mount()
    expect(hover(element)).toBeUndefined()
  })

  // 33 of the 178 stars in the table have no proper name, and carry what a star chart prints.
  it("shows a designation as readily as a proper name", () => {
    hit.star = { name: { en: "η Orionis", fr: "η Orionis" }, raHours: 5.407949, decDeg: -2.397146, mag: 3.35 }
    hit.altitudeDeg = 8
    const element = mount()

    expect(hover(element)).toBe("η Orionis — mag 3.4, 8° above the horizon")
  })
})
