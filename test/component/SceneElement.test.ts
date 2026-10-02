import { describe, expect, it, afterEach, beforeAll, vi } from "vitest"
import { registerScene, SCENE_ELEMENT_NAME, AIRCRAFT_CHANGE_EVENT } from "../../src/component/SceneElement.js"
import type { AircraftProvider, AircraftTraffic } from "../../src/engine/traffic/AircraftProvider.js"
import type { UpperAir, UpperAirProvider } from "../../src/engine/traffic/UpperAirProvider.js"
import { AircraftAudio } from "../../src/audio/AircraftAudio.js"
import type { DataSource } from "../../src/engine/source/DataSource.js"
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
const astronomySet = vi.fn()
/** The id the mocked renderer answers to a pick of air traffic, if a test points at one. */
const pickedTraffic: { id?: string } = {}
/** Every decor list and presence table the element hands the renderer, to see what air traffic reaches it. */
const decorSet: { id: string }[][] = []
const presenceSet: ReadonlyMap<string, { fromMs: number; untilMs: number }>[] = []
/** Every list of trails the element hands the renderer. */
const contrailsSet: { id: string; points: { forms: boolean; persistent: boolean }[] }[][] = []
/**
 * What the record of the air aloft answers: nothing real, ever. "Could not be read" unless a test says otherwise (see upperAirSource), and the
 * places it was asked for, so that a test can see where.
 */
const upperAirAsked: { lat: number; lng: number }[] = []
let upperAirAnswer: UpperAir = { status: "failed" }
const upperAirSource: DataSource<UpperAirProvider> = {
  id: "stub-air", name: "Stub air", credit: "Weather data by Open-Meteo.com (stub)", creditUrl: "https://example.test/air",
  create: () => ({ between: async place => { upperAirAsked.push(place); return upperAirAnswer } })
}

// jsdom's <canvas> can back neither WebGL nor Web Audio, so both are stubbed whole — same reason
// and shape as SightingElement.test.ts's identical SceneRenderer mock.
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
    setAstronomy(): void { astronomySet() }
    setShowCompass(): void {}
    setCompassPoints(): void {}
    setCompassHovered(): void {}
    setCompassForced(): void {}
    setIndoorLook(): void {}
    setWeather(): void {}
    setDecor(decor: { id: string }[]): void { decorSet.push(decor) }
    setDecorPresence(presence: ReadonlyMap<string, { fromMs: number; untilMs: number }>): void { presenceSet.push(presence) }
    setDecorSunlight(): void {}
    setContrails(trails: { id: string; points: { forms: boolean; persistent: boolean }[] }[]): void { contrailsSet.push(trails) }
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
    setLightning(): void {}
    updateLightning(): void {}
    setSatellites(): void {}
    setReentries(): void {}
    pickTrafficAt(): string | undefined {
      return pickedTraffic.id
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
    frame(): void {}
    compileNextFrameOffThread(): void {}
    holdForNewScene(): void {}
    releaseContext(): void {}
    restoreContext(): void {}
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
    setLevel(): void {}
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
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockImplementation(function (this: HTMLCanvasElement) {
    // mockImplementation, not mockReturnValue: a renderer that sizes itself from its own canvas
    // (see ObserverMapRenderer) reads ctx.canvas, and one shared object makes every canvas claim to
    // be the same one.
    return {
      canvas: this,
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
      fillRect: vi.fn(),
      arc: vi.fn(),
      fillText: vi.fn(),
      strokeText: vi.fn(),
      drawImage: vi.fn(),
      createRadialGradient: vi.fn(() => ({ addColorStop: vi.fn() })),
      measureText: vi.fn((text: string) => ({ width: text.length * 5 })),
    } as unknown as CanvasRenderingContext2D
  })
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

it("does not rebuild astronomy for centimetres of observer motion, but follows a significant move", () => {
  const element = mount()
  element.sightingData = {
    ...rainyJson,
    time: { year: 1965, month: 7, day: 1, hour: 5, minute: 45 },
    utcOffsetHours: 1,
    place: [{ lat: 43.84, lng: 5.96 }]
  }
  const internal = element as unknown as { applySceneAt(t: number): void; lastSkyKey?: string; sceneCanvas: HTMLCanvasElement }
  internal.sceneCanvas.height = 600
  const location = { lat: 43.84, lng: 5.96, pitchDeg: 0, fovDeg: 60, elevationM: 0 }
  element.ufoElement.sighting.observerTrack.addKeyframe(0, location)
  internal.lastSkyKey = undefined
  internal.applySceneAt(0)
  astronomySet.mockClear()
  // Edit the resolved geographic position without replacing the recording or resetting its cache.
  for (let i = 1; i <= 10; i++) {
    location.lat += 1e-8
    element.ufoElement.sighting.observerTrack.addKeyframe(0, location)
    internal.applySceneAt(0)
  }
  expect(astronomySet).not.toHaveBeenCalled()
  location.lat += 1
  element.ufoElement.sighting.observerTrack.addKeyframe(0, location)
  internal.applySceneAt(0)
  expect(astronomySet).toHaveBeenCalledOnce()
  element.remove()
})

describe("SceneElement weather follows the player", () => {
  afterEach(() => {
    document.body.innerHTML = ""
  })

  // A paused replay is one frozen instant of a sighting: rain still falling and still audible over
  // it would be the reader's own room, not the observer's evening.
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

  // An editor keeps the PICTURE moving while paused (there may be no way to play a recording still
  // being written), but paused is paused for the sound: nothing is heard over a stopped clock.
  it("keeps the sound stopped while an editor animates the paused picture", () => {
    const element = mount()
    element.animateWhilePaused = true
    element.ufoElement.currentTime = 2000
    expect(animationsRunning.at(-1)).toBe(true)
    expect(audioPaused.length).toBeGreaterThan(0)
    expect(audioPaused.every(paused => paused)).toBe(true)
  })

  // The clap is deliberately delayed by the distance sound travels (see handleLightningFlash), so
  // one can outlive the flash that caused it.
  it("drops a thunderclap still in flight when the replay is paused", () => {
    vi.useFakeTimers()
    try {
      const element = mount()
      element.ufoElement.togglePlayPause()
      // What playback does on reaching a flash 3.4 km away: its clap is due ten seconds later.
      const flash = { t: 0, azimuthDeg: 0, distanceM: 3430, cloudToGround: true, strokes: [{ offsetMs: 0, intensity: 1 }], channelSeed: 1 }
      ;(element as unknown as { handleLightningFlash: (f: typeof flash) => void }).handleLightningFlash(flash)
      element.ufoElement.togglePlayPause()
      vi.advanceTimersByTime(10_000)
      expect(thunderPlayed).toHaveLength(0)
    } finally {
      vi.useRealTimers()
    }
  })
})

describe("meteor scheduling", () => {
  // The in-place-editing regression this pairs with lives in SightingEditorElement.test.ts: it only
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

describe("A account whose observer said what it was", () => {
  const body = { id: "craft", model: { id: "sphere" }, track: [{ t: 0, eastM: 0, northM: 10, onGround: true }] }
  const recording = { version: 1 as const, place: [{ lat: 34, lng: -106.9 }], timeline: { keyframes: [] }, interpretation: { title: "Own", bodies: [body] } }

  it("is drawn in the round, the way they gave it, by every scene", () => {
    const element = mount()
    element.sightingData = recording
    expect(element.interpretation?.title).toBe("Own")
    // And a recording that says nothing in metres, as its angles.
    element.sightingData = { ...recording, interpretation: undefined }
    expect(element.interpretation).toBeUndefined()
  })

  it("is drawn as its angles where the scene is told to, as the editor's is", () => {
    const element = mount()
    element.accountInTheRound = false
    element.sightingData = recording
    expect(element.interpretation).toBeUndefined()
  })
})

describe("SceneElement air traffic", () => {
  const AT = { year: 2025, month: 12, day: 30, hour: 12, minute: 0 }
  const paris = { lat: 48.99, lng: 2.45, pitchDeg: 0, fovDeg: 60, elevationM: 0 }
  const noon = Date.UTC(2025, 11, 30, 12)
  let sourceNumber = 0

  afterEach(() => {
    document.body.innerHTML = ""
    decorSet.length = 0
    presenceSet.length = 0
  })

  /** A source whose provider answers as told, and counts what it was asked. */
  const stubSource = (answer: AircraftTraffic, mayCover = true) => {
    const asked: { startMs: number; endMs: number }[] = []
    const provider: AircraftProvider = {
      citation: "stub citation",
      mayCover: () => mayCover,
      between: async (_observer, startMs, endMs) => {
        asked.push({ startMs, endMs })
        return answer
      }
    }
    const source: DataSource<AircraftProvider> = { id: `stub-${++sourceNumber}`, name: "Stub", credit: "Stub credit", creditUrl: "https://example.test/", create: () => provider }
    return { source, asked }
  }

  /** One aircraft flying over the observer for a minute from the recording's start. */
  const overhead: AircraftTraffic = {
    status: "found",
    tracks: [{ icao: 0xabc123, nonIcao: false, points: [0, 20_000, 40_000, 60_000].map(t => ({ t: noon + t, lat: 48.99, lng: 2.45 + t * 1e-7, altitudeFt: 30000 })) }]
  }

  const weatherOf = (weather: object) => ({ keyframes: [{ t: 0, weather: { cloudCover: 0, cloudDarkness: 0, cloudBaseM: 2000, precipitationType: "none", precipitationIntensity: 0, windDirectionDeg: 0, windSpeed: 0, storm: false, ...weather } }] })
  const mountAt = (time: object | undefined, source: DataSource<AircraftProvider>, weather?: object) => {
    const element = mount()
    element.setAircraftSource(source)
    element.setUpperAirSource(upperAirSource)
    element.sightingData = { ...rainyJson, ...(weather ? { weatherTrack: weatherOf(weather) } : {}), time, utcOffsetHours: 0, place: [{ lat: paris.lat, lng: paris.lng }] } as never
    element.ufoElement.sighting.observerTrack.addKeyframe(0, paris)
    const internal = element as unknown as { applySceneAt(t: number): void; sceneCanvas: HTMLCanvasElement }
    internal.sceneCanvas.height = 600
    return { element, tick: (t = 0) => internal.applySceneAt(t) }
  }

  it("puts the aircraft of the record into the scene's decor, each there only while it was recorded", async () => {
    const { source, asked } = stubSource(overhead)
    const { element, tick } = mountAt(AT, source)
    const changed = vi.fn()
    element.addEventListener(AIRCRAFT_CHANGE_EVENT, changed)
    tick()
    expect(element.aircraftState.status).toBe("loading")
    await vi.waitFor(() => expect(element.aircraftState.status).toBe("ready"))
    expect(changed).toHaveBeenCalled()
    expect(asked).toHaveLength(1)
    tick()
    const decor = decorSet[decorSet.length - 1]
    expect(decor.map(object => object.id)).toEqual(["traffic-abc123-0"])
    expect(presenceSet[presenceSet.length - 1].get("traffic-abc123-0")).toEqual({ fromMs: 0, untilMs: 60_000 })
    expect(element.aircraftState).toMatchObject({ status: "ready", shown: 1, total: 1, credit: "Stub credit" })
    element.remove()
  })

  describe("the trails of the aircraft", () => {
    /** The air aloft as the record states it: the same at every level, hour by hour. */
    const air = (temperatureC: number, relativeHumidity: number): UpperAir => {
      const level = (pressureHpa: number) => ({ pressureHpa, temperatureC, relativeHumidity, windSpeedMs: 20, windFromDeg: 270 })
      const levels = [500, 400, 300, 250, 200, 150].map(level)
      return { status: "found", source: { id: "stub-air", name: "Stub air", url: "https://example.test/air" }, samples: [{ t: noon - 3_600_000, levels }, { t: noon + 3_600_000, levels }] }
    }

    afterEach(() => {
      contrailsSet.length = 0
      upperAirAsked.length = 0
      upperAirAnswer = { status: "failed" }
    })

    it("asks the air aloft at the observer's place and gives the renderer the trails the exhaust makes in it", async () => {
      upperAirAnswer = air(-58, 0.6)
      const { source } = stubSource(overhead)
      const { element, tick } = mountAt(AT, source)
      tick()
      await vi.waitFor(() => expect(element.aircraftState.status).toBe("ready"))
      await vi.waitFor(() => expect(element.aircraftState.trailCredit).toBeDefined())
      tick()
      expect(upperAirAsked).toContainEqual({ lat: 48.99, lng: 2.45 })
      const trails = contrailsSet[contrailsSet.length - 1]
      expect(trails.map(trail => trail.id)).toEqual(["traffic-abc123-0"])
      expect(trails[0].points.every(point => point.forms)).toBe(true)
      expect(element.aircraftState.trailCredit).toMatchObject({ credit: expect.stringContaining("Open-Meteo") })
      element.remove()
    })

    it("says what the air makes of the exhaust of an aircraft pointed at", async () => {
      upperAirAnswer = air(-58, 0.6)
      const { source } = stubSource(overhead)
      const { element, tick } = mountAt(AT, source)
      tick()
      await vi.waitFor(() => expect(element.aircraftState.trailCredit).toBeDefined())
      tick()
      expect(element.trafficInfoAt("traffic-abc123-0")?.contrail).toMatchObject({ persistent: expect.any(Boolean) })
      element.remove()
    })

    it("draws no trail when the record of the air could not be read, and leaves the aircraft as they are", async () => {
      const { source } = stubSource(overhead)
      const { element, tick } = mountAt(AT, source)
      tick()
      await vi.waitFor(() => expect(element.aircraftState.status).toBe("ready"))
      await vi.waitFor(() => expect(upperAirAsked.length).toBeGreaterThan(0))
      tick()
      expect(contrailsSet.every(trails => trails.length === 0)).toBe(true)
      expect(element.aircraftState.trailCredit).toBeUndefined()
      expect(decorSet[decorSet.length - 1].map(object => object.id)).toEqual(["traffic-abc123-0"])
      element.remove()
    })

    it("asks nothing for a scene whose record holds no aircraft", async () => {
      const { source } = stubSource({ status: "found", tracks: [] })
      const { element, tick } = mountAt(AT, source)
      const before = upperAirAsked.length
      tick()
      await vi.waitFor(() => expect(element.aircraftState.status).toBe("ready"))
      expect(upperAirAsked).toHaveLength(before)
      element.remove()
    })
  })

  it("asks five minutes before the recording and a minute after: its first instant is not an empty sky, and the sound of what is heard then left earlier", async () => {
    const { source, asked } = stubSource({ status: "found", tracks: [] })
    const { element, tick } = mountAt(AT, source)
    tick()
    await vi.waitFor(() => expect(element.aircraftState.status).toBe("ready"))
    expect(asked[0].startMs).toBe(noon - 300_000)
    expect(asked[0].endMs).toBeGreaterThanOrEqual(noon + 60_000)
    element.remove()
  })

  it("hands the renderer the same list while nothing has changed, so that it does not rebuild the decor", async () => {
    const { source } = stubSource(overhead)
    const { element, tick } = mountAt(AT, source)
    tick()
    await vi.waitFor(() => expect(element.aircraftState.status).toBe("ready"))
    tick(0)
    tick(10_000)
    tick(20_000)
    const last = decorSet.slice(-3)
    expect(last[1]).toBe(last[0])
    expect(last[2]).toBe(last[0])
    element.remove()
  })

  it("asks once per window and place, not once per tick", async () => {
    const { source, asked } = stubSource(overhead)
    const { element, tick } = mountAt(AT, source)
    for (let t = 0; t < 5; t++) tick(t * 1000)
    await vi.waitFor(() => expect(element.aircraftState.status).toBe("ready"))
    for (let t = 0; t < 5; t++) tick(t * 1000)
    expect(asked).toHaveLength(1)
    element.remove()
  })

  it("does not ask a source about a date it cannot hold", () => {
    const { source, asked } = stubSource(overhead, false)
    const { element, tick } = mountAt({ year: 1965, month: 7, day: 1, hour: 5, minute: 45 }, source)
    tick()
    expect(element.aircraftState.status).toBe("outside")
    expect(asked).toHaveLength(0)
    element.remove()
  })

  it("does not ask without a date", () => {
    const { source, asked } = stubSource(overhead)
    const { element, tick } = mountAt(undefined, source)
    tick()
    expect(element.aircraftState.status).toBe("outside")
    expect(asked).toHaveLength(0)
    element.remove()
  })

  it("leaves the recording's own decor as it was when the record does not cover the window or cannot be read", async () => {
    for (const status of ["outside", "failed"] as const) {
      const { source } = stubSource({ status })
      const { element, tick } = mountAt(AT, source)
      tick()
      await vi.waitFor(() => expect(element.aircraftState.status).toBe(status === "failed" ? "unavailable" : "outside"))
      tick()
      expect(decorSet[decorSet.length - 1]).toBe(element.ufoElement.sighting.decor)
      element.remove()
    }
  })

  it("draws them again as what they are once the record says: a helicopter's size and lamps, from its type", async () => {
    const described = stubSource(overhead)
    ;(described.source as { create: () => AircraftProvider }).create = () => ({
      citation: "stub", mayCover: () => true, between: async () => overhead,
      describe: async () => ({ registration: "F-HABC", type: "EC35", category: "A7" })
    })
    const { element, tick } = mountAt(AT, described.source)
    tick()
    await vi.waitFor(() => expect(element.aircraftState.status).toBe("ready"))
    // Drawn at once as a generic airliner, then refined.
    await vi.waitFor(() => {
      tick()
      const object = decorSet[decorSet.length - 1].find(candidate => candidate.id === "traffic-abc123-0") as { sizeM?: { widthM: number } } | undefined
      expect(object?.sizeM?.widthM).toBeCloseTo(10.2, 1)
    })
    const refined = decorSet[decorSet.length - 1].find(candidate => candidate.id === "traffic-abc123-0") as { lights?: { id: string }[] }
    // By day, a light helicopter's lamps are taken as off.
    expect(refined.lights).toEqual([])
    element.remove()
  })

  it("keeps drawing what it has when the record cannot say what the aircraft are", async () => {
    const failing = stubSource(overhead)
    ;(failing.source as { create: () => AircraftProvider }).create = () => ({
      citation: "stub", mayCover: () => true, between: async () => overhead,
      describe: async () => { throw new Error("shard unreachable") }
    })
    const { element, tick } = mountAt(AT, failing.source)
    tick()
    await vi.waitFor(() => expect(element.aircraftState.status).toBe("ready"))
    await new Promise(resolve => setTimeout(resolve, 20))
    tick()
    const object = decorSet[decorSet.length - 1].find(candidate => candidate.id === "traffic-abc123-0") as { sizeM?: { widthM: number } } | undefined
    expect(object?.sizeM?.widthM).toBeCloseTo(34.1, 1)
    element.remove()
  })

  /** Hovers the canvas, as the reader's pointer does, and returns what the tooltip says. */
  const hover = (element: SceneElement): string | undefined => {
    const canvas = element.ufoElement.canvasElement
    canvas.getBoundingClientRect = () =>
      ({ left: 0, top: 0, width: canvas.width, height: canvas.height, right: canvas.width, bottom: canvas.height, x: 0, y: 0, toJSON: () => "" }) as DOMRect
    // Away from the recording's own shape, which is painted over everything and would answer for it.
    canvas.dispatchEvent(new MouseEvent("pointermove", { clientX: 200, clientY: 100, bubbles: true, composed: true }))
    const tooltip = element.shadowRoot!.getElementById("hover-tooltip")!
    return tooltip.hidden ? undefined : tooltip.textContent!
  }

  it("tells who an aircraft pointed at is, how it flies, where it is and how it sounds", async () => {
    const described = stubSource(overhead)
    ;(described.source as { create: () => AircraftProvider }).create = () => ({
      citation: "stub", mayCover: () => true, between: async () => overhead,
      describe: async () => ({ registration: "F-GKXA", type: "A320", category: "A3" })
    })
    const { element, tick } = mountAt(AT, described.source)
    tick()
    await vi.waitFor(() => expect(element.aircraftState.status).toBe("ready"))
    await vi.waitFor(() => expect(element.trafficInfoAt("traffic-abc123-0")?.registration).toBe("F-GKXA"))
    // Half way through its minute over the observer.
    ;(element as unknown as { lastTimeMs: number }).lastTimeMs = 30_000
    pickedTraffic.id = "traffic-abc123-0"
    const lines = hover(element)!.split("\n")
    pickedTraffic.id = undefined
    expect(lines[0]).toBe("F-GKXA · Airbus A320")
    expect(lines[1]).toBe("30,000 ft")
    expect(lines[2]).toMatch(/km away, \d+° above the horizon/)
    expect(lines[lines.length - 1]).toBe("A compatible candidate, not an identification")
    expect(lines.some(line => /Heard at|Not audible|cannot be worked out/.test(line))).toBe(true)
    element.remove()
  })

  it("says nothing of an id that is not an aircraft of the record, nor of one no longer in the sky", async () => {
    const { source } = stubSource(overhead)
    const { element, tick } = mountAt(AT, source)
    tick()
    await vi.waitFor(() => expect(element.aircraftState.status).toBe("ready"))
    expect(element.trafficInfoAt("shack")).toBeUndefined()
    expect(element.trafficInfoAt("traffic-abc123-0")).toBeDefined()
    ;(element as unknown as { lastTimeMs: number }).lastTimeMs = 10 * 60_000
    expect(element.trafficInfoAt("traffic-abc123-0")).toBeUndefined()
    pickedTraffic.id = "traffic-abc123-0"
    expect(hover(element)).toBeUndefined()
    pickedTraffic.id = undefined
    element.remove()
  })

  describe("the sound of the aircraft", () => {
    const calm = {}
    /** An aircraft low over the observer, near enough to be heard: 600 m up, passing at a minute into the recording, from a minute before it to `untilS` seconds in. */
    const lowUntil = (untilS: number): AircraftTraffic => ({
      status: "found",
      tracks: [{
        icao: 0xabc123, nonIcao: false,
        points: Array.from({ length: Math.floor((untilS + 60) / 5) + 1 }, (_, i) => -60_000 + i * 5000)
          .map(t => ({ t: noon + t, lat: 48.99, lng: 2.45 + (t - 60_000) * 1.5e-6, altitudeFt: 2000 }))
      }]
    })
    const low = lowUntil(180)

    /** Only the spies of these tests are taken off: the file's own (the canvas's context, the fetch) stand for all of them. */
    const spies: { mockRestore(): void }[] = []
    const spyOn = <M extends "setVoices" | "setPaused" | "resume">(method: M) => {
      const spy = vi.spyOn(AircraftAudio.prototype, method)
      spies.push(spy)
      return spy
    }
    afterEach(() => {
      for (const spy of spies) spy.mockRestore()
      spies.length = 0
    })

    it("plays what is heard at the instant shown, from the first tick, once there are aircraft", async () => {
      const setVoices = spyOn("setVoices")
      const { source } = stubSource(low)
      const { element, tick } = mountAt(AT, source, calm)
      tick()
      await vi.waitFor(() => expect(element.aircraftState.status).toBe("ready"))
      tick(60_000)
      const heard = setVoices.mock.calls[setVoices.mock.calls.length - 1][0]
      expect(heard.map(voice => voice.id)).toEqual(["traffic-abc123-0"])
      expect(heard[0].levelDbA).toBeGreaterThan(50)
      expect(heard[0].bandAmplitudes.some(amplitude => amplitude > 0)).toBe(true)
      expect(typeof setVoices.mock.calls[setVoices.mock.calls.length - 1][1]).toBe("number")
      element.remove()
    })

    it("keeps the sound of an aircraft after it has left the record, which is still arriving", async () => {
      const setVoices = spyOn("setVoices")
      // Recorded until 65 s into the recording, five seconds after it passes over: at 67 s it is gone from the record and its sound, which left it two seconds before, is not.
      const { source } = stubSource(lowUntil(66))
      const { element, tick } = mountAt(AT, source, calm)
      tick()
      await vi.waitFor(() => expect(element.aircraftState.status).toBe("ready"))
      tick(67_000)
      expect(setVoices.mock.calls[setVoices.mock.calls.length - 1][0].map(voice => voice.id)).toEqual(["traffic-abc123-0"])
      element.remove()
    })

    it("plays an aircraft against the calm and not against a wind that masks it, as the same sound is no louder for the weather", async () => {
      const setVoices = spyOn("setVoices")
      // Twelve kilometres off, at 2 000 ft: a faint rumble over a calm night, and nothing over a fresh wind in the trees.
      const farOff: AircraftTraffic = { status: "found", tracks: [{ icao: 0xabc123, nonIcao: false, points: Array.from({ length: 49 }, (_, i) => i * 5000 - 120_000).map(t => ({ t: noon + 60_000 + t, lat: 48.99 + 0.11, lng: 2.45 + t * 1.5e-6, altitudeFt: 2000 })) }] }
      const voicesIn = async (weather: object) => {
        setVoices.mockClear()
        const { source } = stubSource(farOff)
        const { element, tick } = mountAt(AT, source, weather)
        tick()
        await vi.waitFor(() => expect(element.aircraftState.status).toBe("ready"))
        tick(70_000)
        const voices = setVoices.mock.calls[setVoices.mock.calls.length - 1][0]
        element.remove()
        return voices
      }
      expect((await voicesIn({})).length).toBe(1)
      expect((await voicesIn({ windSpeed: 12 })).length).toBe(0)
    })

    it("is played in proportion to the weather the scene plays: as loud as its bed for a sound at the weather's own level", async () => {
      const setVoices = spyOn("setVoices")
      const { source } = stubSource(low)
      const { element, tick } = mountAt(AT, source, { windSpeed: 4 })
      tick()
      await vi.waitFor(() => expect(element.aircraftState.status).toBe("ready"))
      tick(60_000)
      const [voice] = setVoices.mock.calls[setVoices.mock.calls.length - 1][0]
      // A bed of wind at 4 m/s over 20 is played at a fifth, and a sound over it by that much, at the amplitude of the level over it.
      expect(voice.bandAmplitudes.some(amplitude => amplitude > 0.04)).toBe(true)
      element.remove()
    })

    it("plays nothing before there are aircraft, and builds no sound for a scene that never has any", async () => {
      const setVoices = spyOn("setVoices")
      const { source } = stubSource(low, false)
      const { element, tick } = mountAt({ year: 1965, month: 7, day: 1, hour: 5, minute: 45 }, source, calm)
      tick()
      tick(1000)
      expect(setVoices).not.toHaveBeenCalled()
      element.remove()
    })

    it("is silenced when the traffic goes", async () => {
      const setVoices = spyOn("setVoices")
      const { source } = stubSource(low)
      const { element, tick } = mountAt(AT, source, calm)
      tick()
      await vi.waitFor(() => expect(element.aircraftState.status).toBe("ready"))
      tick(60_000)
      expect(setVoices.mock.calls[setVoices.mock.calls.length - 1][0]).toHaveLength(1)
      element.setAircraftSource(stubSource({ status: "outside" }).source)
      tick(60_000)
      expect(setVoices.mock.calls[setVoices.mock.calls.length - 1][0]).toEqual([])
      element.remove()
    })

    it("is paused with the clock, as every sound of the scene is", async () => {
      const setPaused = spyOn("setPaused")
      const { source } = stubSource(low)
      const { element, tick } = mountAt(AT, source, calm)
      tick()
      await vi.waitFor(() => expect(element.aircraftState.status).toBe("ready"))
      // Made paused, since the recording is not playing.
      expect(setPaused).toHaveBeenCalledWith(true)
      element.remove()
    })

    /** A scene whose recording is playing, as the player's page makes it. */
    const playingScene = async () => {
      const resume = spyOn("resume")
      const { source } = stubSource(low)
      const { element, tick } = mountAt(AT, source, calm)
      tick()
      await vi.waitFor(() => expect(element.aircraftState.status).toBe("ready"))
      resume.mockClear()
      return { element, resume }
    }
    const playbackOf = (element: HTMLElement, state: string) =>
      vi.spyOn((element as unknown as { ufoElement: { playbackState: string } }).ufoElement, "playbackState", "get").mockReturnValue(state)

    it("follows the player's volume and mute button, as the weather and the vehicles do", async () => {
      const setLevel = vi.spyOn(AircraftAudio.prototype, "setLevel")
      const { element } = await playingScene()
      setLevel.mockClear()
      const ufo = (element as unknown as { ufoElement: HTMLElement }).ufoElement
      vi.spyOn(ufo as unknown as { level: number }, "level", "get").mockReturnValue(0)
      ufo.dispatchEvent(new CustomEvent("mutedchange", { bubbles: true, composed: true, detail: { muted: true, volume: 1 } }))
      expect(setLevel).toHaveBeenCalledWith(0)
      element.remove()
    })

    it("is unlocked by a gesture anywhere on the page while it plays: the button that loads it is not inside the scene", async () => {
      const { element, resume } = await playingScene()
      playbackOf(element, "playing")
      document.body.dispatchEvent(new Event("pointerdown", { bubbles: true }))
      expect(resume).toHaveBeenCalled()
      element.remove()
    })

    it("is not unlocked by a gesture elsewhere while it is paused: a page of many scenes does not open them all", async () => {
      const { element, resume } = await playingScene()
      playbackOf(element, "paused")
      document.body.dispatchEvent(new Event("pointerdown", { bubbles: true }))
      expect(resume).not.toHaveBeenCalled()
      element.remove()
    })

    it("is unlocked as soon as it plays when the reader has already pressed something on the page", async () => {
      const { element, resume } = await playingScene()
      Object.defineProperty(navigator, "userActivation", { value: { hasBeenActive: true }, configurable: true })
      try {
        playbackOf(element, "playing")
        ;(element as unknown as { syncAnimationsToPlayback(): void }).syncAnimationsToPlayback()
        expect(resume).toHaveBeenCalled()
      } finally {
        Reflect.deleteProperty(navigator, "userActivation")
      }
      element.remove()
    })

    it("stops listening to the page once it is removed", async () => {
      const { element, resume } = await playingScene()
      playbackOf(element, "playing")
      element.remove()
      resume.mockClear()
      document.body.dispatchEvent(new Event("pointerdown", { bubbles: true }))
      expect(resume).not.toHaveBeenCalled()
    })

    it("is unlocked by the reader's first gesture, whenever it was made", async () => {
      const resume = spyOn("resume")
      const { source } = stubSource(low)
      const { element, tick } = mountAt(AT, source, calm)
      tick()
      await vi.waitFor(() => expect(element.aircraftState.status).toBe("ready"))
      element.resumeWeatherAudio()
      expect(resume).toHaveBeenCalled()
      element.remove()
    })
  })

  it("asks again when another source is chosen", async () => {
    const first = stubSource(overhead)
    const second = stubSource({ status: "found", tracks: [] })
    const { element, tick } = mountAt(AT, first.source)
    tick()
    await vi.waitFor(() => expect(element.aircraftState.status).toBe("ready"))
    element.setAircraftSource(second.source)
    tick()
    await vi.waitFor(() => expect(second.asked).toHaveLength(1))
    expect(first.asked).toHaveLength(1)
    await vi.waitFor(() => expect(element.aircraftState.shown).toBe(0))
    expect(element.aircraftState.credit).toBe("Stub credit")
    element.remove()
  })
})
