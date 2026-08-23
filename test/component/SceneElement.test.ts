import { describe, expect, it, afterEach, beforeAll, vi } from "vitest"
import { registerScene, SCENE_ELEMENT_NAME } from "../../src/component/SceneElement.js"
import type { SceneElement } from "../../src/component/SceneElement.js"

registerScene()

/** Calls the element makes into the two things that animate the weather — the renderer's own frame
 * loop and the ambient beds. Recorded module-side (the element builds both itself and exposes
 * neither) and cleared per test. */
const animationsRunning: boolean[] = []
const audioPaused: boolean[] = []
const thunderPlayed: number[] = []

// jsdom's <canvas> can back neither WebGL nor Web Audio, so both are stubbed whole — same reason
// and shape as EyewitnessElement.test.ts's identical SceneRenderer mock.
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
    render(): void {}
    dispose(): void {}
    startTwinkle(): void {}
    stopTwinkle(): void {}
    setAnimationsRunning(running: boolean): void {
      animationsRunning.push(running)
    }
  }
}))

vi.mock("../../src/render3d/WeatherAudio.js", () => ({
  WeatherAudio: class {
    resume(): void {}
    setAmbient(): void {}
    dispose(): void {}
    playThunder(): void {
      thunderPlayed.push(1)
    }
    setPaused(paused: boolean): void {
      audioPaused.push(paused)
    }
  }
}))

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

const rainyJson = {
  version: 1 as const,
  durationSeconds: 4,
  timeline: {
    keyframes: [
      {
        t: 0,
        shapes: [
          {
            sourceId: "ufo-1",
            shape: {
              kind: "oval" as const,
              bounds: { x: 10, y: 10, width: 40, height: 20 },
              color: "#39ff14",
              angle: 0,
              transparency: 0,
              haloScale: 1,
              selected: false
            }
          }
        ]
      }
    ]
  },
  weatherTrack: {
    keyframes: [
      {
        t: 0,
        weather: {
          cloudCover: 0.9,
          cloudDarkness: 0.8,
          precipitationType: "rain" as const,
          precipitationIntensity: 0.7,
          windDirectionDeg: 0,
          windSpeed: 4,
          storm: true
        }
      }
    ]
  }
}

function mount(): SceneElement {
  const element = document.createElement(SCENE_ELEMENT_NAME) as SceneElement
  document.body.appendChild(element)
  element.sightingData = rainyJson
  animationsRunning.length = 0
  audioPaused.length = 0
  thunderPlayed.length = 0
  return element
}

describe("SceneElement weather follows the player", () => {
  afterEach(() => {
    document.body.innerHTML = ""
  })

  // A paused replay is one frozen instant of a sighting: rain still falling and still audible over
  // it would be the reader's own room, not the witness's evening.
  it("runs the animations and the beds only while playing", async () => {
    const element = mount()
    element.ufoElement.togglePlayPause()
    // Play starts animating on the player's first frame, not synchronously: the scene follows the
    // nested player's own timeupdate, which is what a frame produces (pause, below, forces one).
    await new Promise(resolve => setTimeout(resolve, 50))
    expect(animationsRunning.at(-1)).toBe(true)
    expect(audioPaused.at(-1)).toBe(false)

    element.ufoElement.togglePlayPause()
    expect(animationsRunning.at(-1)).toBe(false)
    expect(audioPaused.at(-1)).toBe(true)
  })

  it("leaves them stopped while merely scrubbing", () => {
    const element = mount()
    element.ufoElement.currentTime = 2000
    expect(animationsRunning.every(running => !running)).toBe(true)
    expect(audioPaused.every(paused => paused)).toBe(true)
  })

  // The clap is deliberately delayed by the distance sound travels (see handleLightningFlash), so
  // one can outlive the flash that caused it.
  it("drops a thunderclap still in flight when the replay is paused", () => {
    vi.useFakeTimers()
    try {
      const element = mount()
      element.ufoElement.togglePlayPause()
      // What SceneRenderer's onLightningFlash callback does, invoked as the renderer would.
      ;(element as unknown as { handleLightningFlash: () => void }).handleLightningFlash()
      element.ufoElement.togglePlayPause()
      vi.advanceTimersByTime(10_000)
      expect(thunderPlayed).toHaveLength(0)
    } finally {
      vi.useRealTimers()
    }
  })
})
