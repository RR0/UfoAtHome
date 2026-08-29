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
/** Every sky the element hands the renderer, so a test can see whether editing the observation
 * actually rebuilt the fall or silently left the previous one standing. */
const meteorShowersSet: { count: number; altitudeDeg: number }[] = []

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
    setProjection(): void {}
    private meteors: { t: number; durationMs: number }[] = []
    setMeteorShower(meteors: { t: number; durationMs: number }[], altitudeDeg: number): void {
      this.meteors = meteors
      meteorShowersSet.push({ count: meteors.length, altitudeDeg })
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
  meteorShowersSet.length = 0
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

describe("meteor scheduling", () => {
  // The in-place-editing regression this pairs with lives in UfoRecorderElement.test.ts: it only
  // bites through the recorder's own form, which mutates ONE Sighting, where assigning sightingData
  // here builds a fresh one every time and would hide it.
  /** The Geminid peak over Provence: the radiant stands 77 degrees up at 3 a.m., which is about as
   * strong as any sky this project can look up ever gets. */
  const geminidNight = {
    time: { year: 2023, month: 12, day: 14, hour: 3, minute: 0 },
    utcOffsetHours: 1,
    place: [{ lat: 43.8379, lng: 5.9822 }],
    durationSeconds: 300
  }

  function edit(element: SceneElement, changes: Record<string, unknown>): void {
    // Edited IN PLACE, the way the recorder's own form does it — the same instance, mutated.
    const data = element.sightingData
    Object.assign(data, changes)
    element.sightingData = data
  }

  it("answers a request for the next meteor from the sky as it is now, not as it was", () => {
    // nextMeteor is asked by the toolbar, which may run before the scene next paints. It has to
    // schedule on demand rather than report "no meteors" from a sky not yet worked out.
    const element = mount()
    edit(element, geminidNight)
    meteorShowersSet.length = 0
    edit(element, { ...geminidNight, durationSeconds: 600 })
    element.meteorByRank(0)
    expect(meteorShowersSet.length).toBeGreaterThan(0)
  })

  it("leaves the sky alone when nothing it was built from has moved", () => {
    const element = mount()
    edit(element, geminidNight)
    meteorShowersSet.length = 0
    element.meteorByRank(0)
    element.meteorByRank(0)
    expect(meteorShowersSet).toEqual([])
  })

  it("offers only meteors the playhead can actually be moved to", () => {
    // The fall covers the DECLARED observation, which is routinely far longer than what was
    // recorded of it: a five-minute sighting with forty seconds of drawn track has most of its
    // meteors beyond the end of the timeline. Seeking to one of those clamps to the last frame,
    // where nothing is burning — the button then looks broken while doing exactly what it says.
    const element = mount()
    edit(element, geminidNight)
    const schedule = [...(element as unknown as { sceneRenderer: { meteorSchedule: { t: number; durationMs: number }[] } }).sceneRenderer.meteorSchedule]
    expect(schedule.length).toBeGreaterThan(1)
    // Only the recording's own first forty seconds can be played back.
    const recordedMs = 40_000
    const ufo = element.shadowRoot!.querySelector("rr0-ufo")!
    Object.defineProperty(ufo, "seekableDuration", { get: () => recordedMs, configurable: true })
    expect(schedule.some(meteor => meteor.t > recordedMs)).toBe(true)
    for (let rank = 0; rank < 6; rank++) {
      const answer = element.meteorByRank(rank)
      if (!answer) break
      expect(answer.t).toBeLessThanOrEqual(recordedMs)
    }
  })

  it("offers nothing at all when the recording ends before the first meteor falls", () => {
    const element = mount()
    edit(element, geminidNight)
    const ufo = element.shadowRoot!.querySelector("rr0-ufo")!
    Object.defineProperty(ufo, "seekableDuration", { get: () => 1000, configurable: true })
    expect(element.meteorByRank(0)).toBeUndefined()
  })
})

describe("which meteor gets offered", () => {
  const geminidNight = {
    time: { year: 2023, month: 12, day: 14, hour: 3, minute: 0 },
    utcOffsetHours: 1,
    place: [{ lat: 43.8379, lng: 5.9822 }],
    durationSeconds: 300
  }

  function edit(element: SceneElement, changes: Record<string, unknown>): void {
    const data = element.sightingData
    Object.assign(data, changes)
    element.sightingData = data
  }

  function scheduleOf(element: SceneElement): { t: number; durationMs: number; brightness: number }[] {
    return [...(element as unknown as { sceneRenderer: { meteorSchedule: { t: number; durationMs: number; brightness: number }[] } }).sceneRenderer.meteorSchedule]
  }

  it("offers the brightest one first, not whichever fell first", () => {
    // Measured before this existed: walking the night in order opened on a meteor of brightness
    // 0.007 — rendering three times dimmer than the stars around it. Brightness is a cubed draw,
    // so most of a shower sits near the threshold of being seen at all and chronological order
    // lands there nearly every time. A control that says "show me one" owes the reader one they
    // can actually see. The sky is untouched; only the order the examples come in.
    const element = mount()
    edit(element, geminidNight)
    const schedule = scheduleOf(element)
    const brightest = schedule.reduce((a, b) => (b.brightness > a.brightness ? b : a))
    const first = element.meteorByRank(0)!
    expect(first.t).toBe(Math.round(brightest.t + brightest.durationMs * 0.45))
    expect(schedule.some(meteor => meteor.t < brightest.t)).toBe(true)
  })

  it("walks down the ranking, never repeating until it wraps", () => {
    const element = mount()
    edit(element, geminidNight)
    const count = scheduleOf(element).length
    const seen = new Set<number>()
    for (let rank = 0; rank < count; rank++) seen.add(element.meteorByRank(rank)!.t)
    expect(seen.size).toBe(count)
    // And round again rather than running out.
    expect(element.meteorByRank(count)!.t).toBe(element.meteorByRank(0)!.t)
  })

  it("gives the same answer for the same rank, so asking is free of side effects", () => {
    // The toolbar asks for rank 0 purely to decide whether to offer the button at all.
    const element = mount()
    edit(element, geminidNight)
    expect(element.meteorByRank(0)).toEqual(element.meteorByRank(0))
  })
})
