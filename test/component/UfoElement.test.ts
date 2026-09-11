import { describe, expect, it, afterEach, beforeAll, vi } from "vitest"
import { registerUfo, UFO_ELEMENT_NAME } from "../../src/component/UfoElement.js"
import type { UfoElement } from "../../src/component/UfoElement.js"
import { ApparentSize } from "../../src/engine/shape/ApparentSize.js"
import { ImageProjection } from "../../src/engine/instrument/ImageProjection.js"
import type { SightingRecordingJson } from "../../src/engine/persistence/sightingJson.js"

registerUfo()

// jsdom's <canvas> has no real 2D context (getContext("2d") returns null without the
// native `canvas` package) — stub it, same as test/render/CanvasRenderer.test.ts's mock.
beforeAll(() => {
  // mockImplementation rather than mockReturnValue, so `ctx.canvas` is the real element this
  // context was asked of — a renderer sizing itself from its own canvas (see WitnessMapRenderer)
  // reads it, and a single shared stub would have every canvas claiming to be the same one.
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockImplementation(function (this: HTMLCanvasElement) {
    return {
      canvas: this,
      save: vi.fn(),
      restore: vi.fn(),
      beginPath: vi.fn(),
      closePath: vi.fn(),
      fill: vi.fn(),
      ellipse: vi.fn(),
      arc: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      translate: vi.fn(),
      rotate: vi.fn(),
      clearRect: vi.fn(),
      strokeRect: vi.fn(),
      stroke: vi.fn(),
      fillRect: vi.fn(),
      fillText: vi.fn(),
      strokeText: vi.fn(),
      drawImage: vi.fn(),
      createRadialGradient: vi.fn(() => ({ addColorStop: vi.fn() })),
      measureText: vi.fn((text: string) => ({ width: text.length * 5 }))
    } as unknown as CanvasRenderingContext2D
  })
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
  witness: { id: "ChilesWhitted" },
  timeline: {
    keyframes: [
      { t: 0, shapes: [{ sourceId: "ufo-1", shape: { kind: "oval" as const, bounds: { x: 0, y: 0, width: 10, height: 10 }, color: "#163a8f", angle: 0, transparency: 0, haloScale: 1, selected: false } }] }
    ]
  },
  witnessTrack: { keyframes: [] },
  weatherTrack: { keyframes: [] }
}

/** What the fixture's 10x10 px shape subtends on the 360 px canvas at the default 60 degree field
 * of view, through the naked eye every recording is assumed to have used — added to every shape on
 * the way out, since a recording states an angle and not the pixels it happened to be drawn as
 * (see BaseShape.angular). */
const SAMPLE_ANGULAR = new ImageProjection("equidistant", ApparentSize.CANVAS_HEIGHT_PX, 60).ofBounds({
  width: 10,
  height: 10
})

/** sampleJson's own keyframes, as they come back out: same shapes, each now stating its angle. */
const sampleKeyframesOut = sampleJson.timeline.keyframes.map(keyframe => ({
  ...keyframe,
  shapes: keyframe.shapes.map(state => ({ ...state, shape: { ...state.shape, angular: SAMPLE_ANGULAR } }))
}))

describe("UfoElement", () => {
  afterEach(() => {
    document.body.innerHTML = ""
    vi.unstubAllGlobals()
  })

  it("hit-tests the PICTURE and not the instant: a pose long enough draws the object all along its path, and a click on the streak used to fall through to the landscape", () => {
    const element = mount()
    // A shape crossing the frame over five seconds, photographed with the shutter open ten.
    element.sightingData = {
      ...sampleJson,
      durationSeconds: 10,
      timeline: {
        keyframes: [
          { t: 0, shapes: [{ sourceId: "ufo-1", shape: { kind: "oval" as const, bounds: { x: 0, y: 0, width: 40, height: 40 }, color: "#0f0", angle: 0, transparency: 0, haloScale: 1, selected: false } }] },
          { t: 5000, shapes: [{ sourceId: "ufo-1", shape: { kind: "oval" as const, bounds: { x: 300, y: 160, width: 40, height: 40 }, color: "#0f0", angle: 0, transparency: 0, haloScale: 1, selected: false } }] }
        ]
      },
      exposureSeconds: 10,
      witnessTrack: { keyframes: [{ t: 0, pose: { elevationM: 0, pitchDeg: 0, fovDeg: 60 } }] }
    }
    element.currentTime = 0

    // Where the object IS at the playhead — it has always been possible to hit that.
    expect(element.shapeAt(20, 20)?.sourceId).toBe("ufo-1")
    // ...and where the same photograph plainly shows it, five seconds into the pose.
    expect(element.shapeAt(320, 180)?.sourceId).toBe("ufo-1")
    // Sky the object never crossed stays empty, or every click would select something.
    expect(element.shapeAt(600, 20)).toBeUndefined()
  })

  it("samples a long pose by how far the object TRAVELLED, not only by how long it lasted — 48 paintings over 300 px is what left the streak beaded", () => {
    const element = mount()
    const moving = {
      ...sampleJson,
      durationSeconds: 10,
      timeline: {
        keyframes: [
          { t: 0, shapes: [{ sourceId: "ufo-1", shape: { kind: "oval" as const, bounds: { x: 0, y: 0, width: 40, height: 40 }, color: "#0f0", angle: 0, transparency: 0, haloScale: 1, selected: false } }] },
          { t: 10000, shapes: [{ sourceId: "ufo-1", shape: { kind: "oval" as const, bounds: { x: 300, y: 0, width: 40, height: 40 }, color: "#0f0", angle: 0, transparency: 0, haloScale: 1, selected: false } }] }
        ]
      },
      exposureSeconds: 10,
      witnessTrack: { keyframes: [{ t: 0, pose: { elevationM: 0, pitchDeg: 0, fovDeg: 60 } }] }
    }
    element.sightingData = moving
    element.currentTime = 0
    // 300 px of travel at one painting every couple of pixels — well past the 48 the clock alone asks for.
    expect(element.exposureTimes(0).length).toBe(150)

    // An object that did not move gets the old count: there is nothing to bead, and a pose can
    // still hold something changing in place.
    element.sightingData = {
      ...moving,
      timeline: { keyframes: [moving.timeline.keyframes[0]] }
    }
    element.currentTime = 0
    expect(element.exposureTimes(0).length).toBe(48)
  })

  it("takes a snapshot as one instant, whatever moved", () => {
    const element = mount()
    element.sightingData = sampleJson
    expect(element.exposureTimes(0)).toEqual([0])
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
    // timeline.order/groups are always present on the way out (order: z-order support, groups:
    // multi-select grouping), even though the hand-written fixture above predates both and omits
    // them. decor is likewise always present (see Decor.ts), empty here since none was set, and so
    // is soundTrack (see SoundTrack.ts) — empty meaning nothing was recorded about sound.
    expect(element.sightingData).toEqual({
      ...sampleJson,
      timeline: { keyframes: sampleKeyframesOut, order: ["ufo-1"], groups: [] },
      soundTrack: { keyframes: [] },
      decor: []
    })
  })

  it("fetches and loads the sighting referenced by the src attribute on connect", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200, json: () => Promise.resolve(sampleJson) })
    vi.stubGlobal("fetch", fetchMock)

    const element = document.createElement(UFO_ELEMENT_NAME) as UfoElement
    element.setAttribute("src", "sighting.json")
    document.body.appendChild(element)
    await new Promise(resolve => setTimeout(resolve, 0))

    expect(fetchMock).toHaveBeenCalledWith("sighting.json")
    expect(element.sightingData.witness?.id).toBe("ChilesWhitted")
    expect(element.sightingData.timeline.keyframes).toHaveLength(1)
  })

  it("re-fetches when the src attribute changes after connect", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200, json: () => Promise.resolve(sampleJson) })
    vi.stubGlobal("fetch", fetchMock)

    const element = mount()
    element.setAttribute("src", "other-sighting.json")
    await new Promise(resolve => setTimeout(resolve, 0))

    expect(fetchMock).toHaveBeenCalledWith("other-sighting.json")
  })

  it("seek updates the reported frame via the timeline's interpolated lookup", () => {
    const element = mount()
    element.sightingData = sampleJson
    const seekInput = element.shadowRoot!.getElementById("seek") as HTMLInputElement
    expect(Number(seekInput.max)).toBe(0)

    seekInput.value = "0"
    seekInput.dispatchEvent(new Event("input"))
    // A single-keyframe timeline has duration 0; seeking shouldn't throw.
    expect(seekInput.value).toBe("0")
  })

  it("currentTime/playbackState reflect seek() and play/pause/stop", () => {
    const element = mount()
    element.sightingData = {
      version: 1,
      timeline: {
        keyframes: [
          { t: 0, shapes: [{ sourceId: "ufo-1", shape: { kind: "oval", bounds: { x: 0, y: 0, width: 10, height: 10 }, color: "#fff", angle: 0, transparency: 0, haloScale: 0, selected: false } }] },
          { t: 1000, shapes: [{ sourceId: "ufo-1", shape: { kind: "oval", bounds: { x: 10, y: 0, width: 10, height: 10 }, color: "#fff", angle: 0, transparency: 0, haloScale: 0, selected: false } }] }
        ]
      }
    }
    expect(element.playbackState).toBe("stopped")

    const seekInput = element.shadowRoot!.getElementById("seek") as HTMLInputElement
    seekInput.value = "400"
    seekInput.dispatchEvent(new Event("input"))
    expect(element.currentTime).toBe(400)

    const playPauseButton = element.shadowRoot!.getElementById("play-pause") as HTMLButtonElement
    playPauseButton.click()
    expect(element.playbackState).toBe("playing")
    playPauseButton.click()
    expect(element.playbackState).toBe("paused")
  })

  it("dispatches timeupdate with the current time on seek", () => {
    const element = mount()
    element.sightingData = {
      version: 1,
      timeline: {
        keyframes: [
          { t: 0, shapes: [{ sourceId: "ufo-1", shape: { kind: "oval", bounds: { x: 0, y: 0, width: 10, height: 10 }, color: "#fff", angle: 0, transparency: 0, haloScale: 0, selected: false } }] },
          { t: 1000, shapes: [{ sourceId: "ufo-1", shape: { kind: "oval", bounds: { x: 10, y: 0, width: 10, height: 10 }, color: "#fff", angle: 0, transparency: 0, haloScale: 0, selected: false } }] }
        ]
      }
    }
    const onTimeUpdate = vi.fn()
    element.addEventListener("timeupdate", onTimeUpdate)

    const seekInput = element.shadowRoot!.getElementById("seek") as HTMLInputElement
    seekInput.value = "250"
    seekInput.dispatchEvent(new Event("input"))

    expect(onTimeUpdate).toHaveBeenCalled()
    const lastCall = onTimeUpdate.mock.calls[onTimeUpdate.mock.calls.length - 1][0] as CustomEvent
    expect(lastCall.detail.time).toBe(250)
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

  it("durationSeconds getter/setter patches the sighting's event and rescales the end label, without rebuilding the timeline", () => {
    const element = mount()
    element.sightingData = { ...sampleJson, time: { year: 1948, month: 7, day: 24, hour: 2, minute: 45 } }
    expect(element.durationSeconds).toBeUndefined()
    const end = element.shadowRoot!.getElementById("time-end") as HTMLElement
    expect(end.textContent).toBe("0:00") // single-keyframe timeline: recorded duration is 0

    element.durationSeconds = 300

    expect(element.durationSeconds).toBe(300)
    expect(element.sightingData.durationSeconds).toBe(300)
    expect(end.textContent).toBe("02:50") // now scaled by the real reported duration
    expect(element.sightingData.timeline.keyframes).toEqual(sampleKeyframesOut) // untouched

    element.durationSeconds = undefined // clearing falls back to the recording's own length
    expect(end.textContent).toBe("0:00")
  })

  it("setting durationSeconds extends the seek bar's own range, not just the end label", () => {
    const element = mount() // fresh, empty timeline — duration 0, nothing recorded yet
    const seekInput = element.shadowRoot!.getElementById("seek") as HTMLInputElement
    expect(Number(seekInput.max)).toBe(0)

    element.durationSeconds = 10 // 10s declared duration, still nothing actually recorded

    expect(Number(seekInput.max)).toBe(10_000)
    // Previously the seek bar stayed capped at timeline.duration (still 0 here) even after
    // declaring a real duration — dragging it (or calling seek() directly) would silently
    // clamp right back to 0, i.e. "the cursor stays stuck."
    seekInput.value = "4000"
    seekInput.dispatchEvent(new Event("input"))
    expect(element.currentTime).toBe(4000)

    const start = element.shadowRoot!.getElementById("time-start") as HTMLElement
    expect(start.textContent).toBe("0:04") // reflects the actual scrub position, not stuck at 0:00
  })

  it("play actually advances once a duration is set on a not-yet-recorded (duration 0) timeline", () => {
    // Regression: playbackRate used to be timeline.duration/realDurationMs unconditionally,
    // i.e. 0/10000 = 0 here — Play would never advance at all.
    let now = 1000
    let frame: FrameRequestCallback | undefined
    const nowSpy = vi.spyOn(performance, "now").mockImplementation(() => now)
    vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => {
      frame = cb
      return 1
    })
    vi.stubGlobal("cancelAnimationFrame", () => {})

    const element = mount() // duration 0 — nothing recorded yet
    element.durationSeconds = 10

    const playPauseButton = element.shadowRoot!.getElementById("play-pause") as HTMLButtonElement
    playPauseButton.click()
    now += 3000
    frame?.(now)

    expect(element.currentTime).toBe(3000)

    vi.unstubAllGlobals()
    nowSpy.mockRestore()
  })

  it("the single play/pause button toggles its icon and title on click", () => {
    const element = mount()
    element.sightingData = twoKeyframeSighting() // needs a real duration — see "disables Play..." below
    const button = element.shadowRoot!.getElementById("play-pause") as HTMLButtonElement
    expect(button.title).toBe("Play")

    button.click()
    expect(button.title).toBe("Pause")

    button.click()
    expect(button.title).toBe("Play")
  })

  it("clicking the canvas also toggles play/pause", () => {
    const element = mount()
    element.sightingData = twoKeyframeSighting()
    const button = element.shadowRoot!.getElementById("play-pause") as HTMLButtonElement
    expect(button.title).toBe("Play")

    element.canvasElement.click()
    expect(button.title).toBe("Pause")

    element.canvasElement.click()
    expect(button.title).toBe("Play")
  })

  it("disables Play (button and canvas click) when the observation has zero duration — nothing to play", () => {
    const element = mount() // default sighting: empty timeline, no durationSeconds → duration 0
    const button = element.shadowRoot!.getElementById("play-pause") as HTMLButtonElement
    expect(button.disabled).toBe(true)

    element.canvasElement.click() // guarded the same way as the button — should stay stopped
    expect(element.playbackState).toBe("stopped")

    element.sightingData = twoKeyframeSighting() // now has a real duration
    expect(button.disabled).toBe(false)
  })

  it("canvas click-to-play can be disabled (e.g. by SightingEditorElement, which uses the canvas for drag-to-record)", () => {
    const element = mount()
    element.sightingData = twoKeyframeSighting() // a real duration — otherwise Play is disabled regardless, see above
    element.enableClickToPlay = false
    const button = element.shadowRoot!.getElementById("play-pause") as HTMLButtonElement
    expect(button.title).toBe("Play")

    element.canvasElement.click()
    expect(button.title).toBe("Play")
  })

  it("loads French labels when navigator.languages prefers fr, with no language picker", async () => {
    const spy = vi.spyOn(navigator, "languages", "get").mockReturnValue(["fr-FR", "fr"])
    const element = mount()
    element.sightingData = twoKeyframeSighting() // a real duration, so the label is "Lecture" and not the disabled one
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
    element.sightingData = twoKeyframeSighting()
    await new Promise(resolve => setTimeout(resolve, 20)) // no fr/en module load is triggered; just let any microtasks settle
    const button = element.shadowRoot!.getElementById("play-pause") as HTMLButtonElement
    expect(button.title).toBe("Play")
    spy.mockRestore()
  })

  it("explains why Play is disabled instead of leaving a stale label", () => {
    const element = mount()
    const button = element.shadowRoot!.getElementById("play-pause") as HTMLButtonElement
    expect(button.title).toBe("No observation duration")
    expect(button.getAttribute("aria-label")).toBe("No observation duration")

    element.sightingData = twoKeyframeSighting()
    expect(button.title).toBe("Play")
  })

  it("the toolbar auto-hides while playing and stays shown while paused/stopped", () => {
    const element = mount()
    element.sightingData = twoKeyframeSighting()
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

  it("showToolbar hides the overlay toolbar for a composing element with its own external controls", () => {
    const element = mount()
    const toolbar = element.shadowRoot!.getElementById("toolbar") as HTMLElement
    expect(toolbar.classList.contains("hidden")).toBe(false)

    element.showToolbar = false

    expect(toolbar.classList.contains("hidden")).toBe(true)

    element.showToolbar = true

    expect(toolbar.classList.contains("hidden")).toBe(false)
  })

  it("seekableDuration mirrors the seek input's own max (0 with nothing recorded, real duration once known)", () => {
    const element = mount()
    expect(element.seekableDuration).toBe(0)

    element.durationSeconds = 10

    expect(element.seekableDuration).toBe(10_000)
  })

  it("currentTime setter seeks the player, moving the seek input's value", () => {
    const element = mount()
    element.sightingData = twoKeyframeSighting()
    const seekInput = element.shadowRoot!.getElementById("seek") as HTMLInputElement

    element.currentTime = 400

    expect(element.currentTime).toBe(400)
    expect(seekInput.value).toBe("400")
  })

  it("autoReplayEnabled mirrors the loop button's own pressed state", () => {
    const element = mount()
    const loopButton = element.shadowRoot!.getElementById("loop") as HTMLButtonElement
    expect(element.autoReplayEnabled).toBe(true)

    loopButton.click()

    expect(element.autoReplayEnabled).toBe(false)
  })

  it("togglePlayPause/toggleLoop are callable directly (public), same effect as clicking the buttons", () => {
    const element = mount()
    element.sightingData = twoKeyframeSighting()

    element.togglePlayPause()
    expect(element.playbackState).toBe("playing")
    element.togglePlayPause()
    expect(element.playbackState).toBe("paused")

    element.toggleLoop()
    expect(element.autoReplayEnabled).toBe(false)
  })

  it("the corner buttons auto-hide alongside the toolbar", () => {
    // The whole corner row, not the fullscreen button alone: the map button moved in beside it, and
    // one of the two fading out while the other stayed would be a stray icon over the scene.
    const element = mount()
    element.sightingData = twoKeyframeSighting()
    const playPause = element.shadowRoot!.getElementById("play-pause") as HTMLButtonElement
    const corner = element.shadowRoot!.getElementById("corner-buttons")!
    expect(corner.classList.contains("auto-hide")).toBe(false)

    playPause.click() // play
    expect(corner.classList.contains("auto-hide")).toBe(true)

    playPause.click() // pause
    expect(corner.classList.contains("auto-hide")).toBe(false)
  })

  it("defaults fullscreenTarget to the component's own stage", () => {
    const element = mount()
    expect(element.fullscreenTarget).toBe(element.shadowRoot!.getElementById("stage"))
  })

  it("clicking fullscreen requests fullscreen on fullscreenTarget when not already fullscreen", () => {
    const element = mount()
    const requestFullscreen = vi.fn().mockResolvedValue(undefined)
    element.fullscreenTarget.requestFullscreen = requestFullscreen
    Object.defineProperty(document, "fullscreenEnabled", { value: true, configurable: true })
    const button = element.shadowRoot!.getElementById("fullscreen") as HTMLButtonElement

    button.click()

    expect(requestFullscreen).toHaveBeenCalledOnce()
  })

  it("fills the viewport with CSS where the browser has no Fullscreen API — every iPhone browser", () => {
    // Reported from Chrome on an iPhone, where the button did nothing. Every iOS browser is WebKit
    // underneath, and WebKit on the phone exposes no Element.requestFullscreen at all: the call did
    // not reject, it threw, because the method is not there. jsdom is in exactly that position, so
    // this is the path it takes by default.
    const element = mount()
    delete (document as { fullscreenEnabled?: boolean }).fullscreenEnabled
    const target = element.fullscreenTarget
    const button = element.shadowRoot!.getElementById("fullscreen") as HTMLButtonElement
    expect(target.style.position).toBe("")

    button.click()

    expect(target.style.position).toBe("fixed")
    expect(target.style.height).not.toBe("")
    // Measured, not assumed: with the stage's own 640:360 still applying, an explicit width and
    // height did not stop it taking 1541 px inside a 601 px viewport.
    expect(target.style.aspectRatio).toBe("auto")
    expect(document.body.style.overflow).toBe("hidden")
    expect(button.title).toBe("Exit fullscreen")
  })

  it("puts back exactly the inline styles the page had, on the way out", () => {
    const element = mount()
    delete (document as { fullscreenEnabled?: boolean }).fullscreenEnabled
    const target = element.fullscreenTarget
    target.setAttribute("style", "outline: 1px solid red")
    const button = element.shadowRoot!.getElementById("fullscreen") as HTMLButtonElement

    button.click()
    button.click()

    expect(target.getAttribute("style")).toBe("outline: 1px solid red")
    expect(document.body.style.overflow).toBe("")
    expect(button.title).toBe("Fullscreen")
  })

  it("leaves the CSS stand-in on Escape, the way real fullscreen does", () => {
    const element = mount()
    delete (document as { fullscreenEnabled?: boolean }).fullscreenEnabled
    const target = element.fullscreenTarget
    ;(element.shadowRoot!.getElementById("fullscreen") as HTMLButtonElement).click()
    expect(target.style.position).toBe("fixed")

    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }))

    expect(target.style.position).toBe("")
    expect(document.body.style.overflow).toBe("")
  })

  it("gives the page its scrolling back when the element goes away mid-stand-in", () => {
    const element = mount()
    delete (document as { fullscreenEnabled?: boolean }).fullscreenEnabled
    ;(element.shadowRoot!.getElementById("fullscreen") as HTMLButtonElement).click()
    expect(document.body.style.overflow).toBe("hidden")

    element.remove()

    expect(document.body.style.overflow).toBe("")
  })

  it("clicking fullscreen while already fullscreen exits instead of re-requesting", () => {
    const element = mount()
    const requestFullscreen = vi.fn().mockResolvedValue(undefined)
    element.fullscreenTarget.requestFullscreen = requestFullscreen
    Object.defineProperty(document, "fullscreenEnabled", { value: true, configurable: true })
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

  it("selectedSourceIds flags that source's shape as selected on the next paint, only", () => {
    const element = mount()
    element.sightingData = {
      version: 1,
      timeline: {
        keyframes: [
          {
            t: 0,
            shapes: [
              { sourceId: "ufo-1", shape: { kind: "oval", bounds: { x: 0, y: 0, width: 10, height: 10 }, color: "#fff", angle: 0, transparency: 0, haloScale: 0, selected: false } },
              { sourceId: "ufo-2", shape: { kind: "oval", bounds: { x: 20, y: 0, width: 10, height: 10 }, color: "#fff", angle: 0, transparency: 0, haloScale: 0, selected: false } }
            ]
          }
        ]
      }
    }
    const paintShape = vi.spyOn(element.renderer, "paintShape")

    element.selectedSourceIds = new Set(["ufo-2"])

    const paintedSelected = paintShape.mock.calls
      .map(([shape]) => shape as { selected: boolean; bounds: { x: number } })
      .filter(shape => shape.selected)
    expect(paintedSelected).toHaveLength(1)
    expect(paintedSelected[0].bounds.x).toBe(20)
    expect([...element.selectedSourceIds]).toEqual(["ufo-2"])
  })

  it("setting the same selectedSourceIds again doesn't trigger a redundant repaint", () => {
    const element = mount()
    element.selectedSourceIds = new Set(["ufo-1"])
    const onTimeUpdate = vi.fn()
    element.addEventListener("timeupdate", onTimeUpdate)

    element.selectedSourceIds = new Set(["ufo-1"])

    expect(onTimeUpdate).not.toHaveBeenCalled()
  })

  it("with paintsShapes off, paints no shape at all and only the selection's handles", () => {
    const element = mount()
    // What a composing <rr0-scene> does: the shapes stand in its three.js scene, and this overlay
    // keeps only what edits them — see UfoElement.paintsShapes.
    element.paintsShapes = false
    element.sightingData = {
      version: 1,
      timeline: {
        keyframes: [
          {
            t: 0,
            shapes: [
              { sourceId: "ufo-1", shape: { kind: "oval", bounds: { x: 0, y: 0, width: 10, height: 10 }, color: "#fff", angle: 0, transparency: 0, haloScale: 0, selected: false } },
              { sourceId: "ufo-2", shape: { kind: "oval", bounds: { x: 20, y: 0, width: 10, height: 10 }, color: "#fff", angle: 0, transparency: 0, haloScale: 0, selected: false } }
            ]
          }
        ]
      }
    }
    const paintShape = vi.spyOn(element.renderer, "paintShape")
    const paintSelectionOnly = vi.spyOn(element.renderer, "paintSelectionOnly")

    element.selectedSourceIds = ["ufo-1"]

    expect(paintShape).not.toHaveBeenCalled()
    expect(paintSelectionOnly.mock.calls.map(([shape]) => (shape as { bounds: { x: number } }).bounds.x)).toEqual([0])
  })

  it("selecting multiple sources paints individual outlines plus one shared group-handle overlay", () => {
    const element = mount()
    element.sightingData = {
      version: 1,
      timeline: {
        keyframes: [
          {
            t: 0,
            shapes: [
              { sourceId: "ufo-1", shape: { kind: "oval", bounds: { x: 0, y: 0, width: 10, height: 10 }, color: "#fff", angle: 0, transparency: 0, haloScale: 0, selected: false } },
              { sourceId: "ufo-2", shape: { kind: "oval", bounds: { x: 20, y: 0, width: 10, height: 10 }, color: "#fff", angle: 0, transparency: 0, haloScale: 0, selected: false } }
            ]
          }
        ]
      }
    }
    const paintShape = vi.spyOn(element.renderer, "paintShape")
    const paintMemberOutline = vi.spyOn(element.renderer, "paintMemberOutline")
    const paintGroupHandles = vi.spyOn(element.renderer, "paintGroupHandles")

    element.selectedSourceIds = new Set(["ufo-1", "ufo-2"])

    // Neither shape gets the single-shape `selected: true` treatment when >1 is selected.
    expect(paintShape.mock.calls.map(([shape]) => (shape as { selected: boolean }).selected)).toEqual([false, false])
    expect(paintMemberOutline).toHaveBeenCalledTimes(2)
    expect(paintGroupHandles).toHaveBeenCalledTimes(1)
    expect(paintGroupHandles).toHaveBeenCalledWith({ x: 0, y: 0, width: 30, height: 10 })
  })

  function twoKeyframeSighting() {
    return {
      version: 1 as const,
      timeline: {
        keyframes: [
          { t: 0, shapes: [{ sourceId: "ufo-1", shape: { kind: "oval" as const, bounds: { x: 0, y: 0, width: 10, height: 10 }, color: "#fff", angle: 0, transparency: 0, haloScale: 0, selected: false } }] },
          { t: 1000, shapes: [{ sourceId: "ufo-1", shape: { kind: "oval" as const, bounds: { x: 100, y: 0, width: 10, height: 10 }, color: "#fff", angle: 0, transparency: 0, haloScale: 0, selected: false } }] }
        ]
      }
    }
  }

  it("suppresses the selection highlight while playing", () => {
    const element = mount()
    element.sightingData = twoKeyframeSighting()
    const playPauseButton = element.shadowRoot!.getElementById("play-pause") as HTMLButtonElement
    playPauseButton.click()
    expect(element.playbackState).toBe("playing")

    const paintShape = vi.spyOn(element.renderer, "paintShape")
    element.selectedSourceIds = new Set(["ufo-1"]) // forces a synchronous repaint via refresh()

    const paintedSelected = paintShape.mock.calls
      .map(([shape]) => shape as { selected: boolean })
      .filter(shape => shape.selected)
    expect(paintedSelected).toHaveLength(0)
  })

  it("pausing immediately repaints with the highlight restored, not just eventually", () => {
    const element = mount()
    element.sightingData = twoKeyframeSighting()
    element.selectedSourceIds = new Set(["ufo-1"])
    const playPauseButton = element.shadowRoot!.getElementById("play-pause") as HTMLButtonElement
    playPauseButton.click()
    expect(element.playbackState).toBe("playing")

    const paintShape = vi.spyOn(element.renderer, "paintShape")
    playPauseButton.click()
    expect(element.playbackState).toBe("paused")

    const paintedSelected = paintShape.mock.calls
      .map(([shape]) => shape as { selected: boolean })
      .filter(shape => shape.selected)
    expect(paintedSelected).toHaveLength(1)
  })

  it("switching sightingData mid-playback cancels the old player's animation loop instead of leaking it", () => {
    // Regression: SightingElement assigns a new sightingData when the visitor switches
    // witnesses. Doing that mid-playback used to leave the *old* Player's requestAnimationFrame
    // loop running — nothing had ever paused/stopped it, so it kept ticking in the background,
    // calling this same onFrame with the *old* timeline's positions and fighting the new player
    // for the canvas/seek bar. Symptom: after switching witnesses mid-play, clicking to pause
    // only paused the *new* player while the old one kept looping underneath it — which looked
    // exactly like "pause resets to the start," since the old player's loop kept repainting
    // frame 0 onward once the new player's own (correct) pause had gone still.
    let now = 1000
    let frame: FrameRequestCallback | undefined
    const cancelSpy = vi.fn()
    vi.spyOn(performance, "now").mockImplementation(() => now)
    vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => {
      frame = cb
      return 1
    })
    vi.stubGlobal("cancelAnimationFrame", cancelSpy)

    const element = mount()
    element.sightingData = twoKeyframeSighting()
    element.canvasElement.click() // start playing
    now += 300
    frame?.(now) // one tick — schedules the next pending frame

    element.sightingData = twoKeyframeSighting() // simulates switching witnesses mid-play

    expect(cancelSpy).toHaveBeenCalled() // the old player's pending frame was actually cancelled
  })
})

describe("UfoElement sound", () => {
  afterEach(() => {
    document.body.innerHTML = ""
  })

  /** The element's own SightingAudio. jsdom has no Web Audio at all, so it is a no-op object — what
   * these tests check is which calls it is asked to make, which is where the wiring lives. */
  function audioOf(element: UfoElement): { setSound: ReturnType<typeof vi.spyOn>; silence: ReturnType<typeof vi.spyOn> } {
    const audio = (element as unknown as { sightingAudio: Record<string, () => void> }).sightingAudio
    return { setSound: vi.spyOn(audio, "setSound"), silence: vi.spyOn(audio, "silence") }
  }

  const humming = {
    ...sampleJson,
    durationSeconds: 4,
    soundTrack: { keyframes: [{ t: 0, sound: { kind: "hum" as const, volume: 0.8, pitchHz: 200 } }] }
  }

  it("says nothing about sound while paused, whatever the track holds", () => {
    const element = mount()
    element.sightingData = humming
    const audio = audioOf(element)
    element.refresh()
    expect(audio.setSound).not.toHaveBeenCalled()
    expect(audio.silence).toHaveBeenCalled()
  })

  it("plays what the track holds at the played instant", () => {
    const element = mount()
    element.sightingData = humming
    const audio = audioOf(element)
    element.togglePlayPause()
    element.currentTime = 1000
    expect(audio.setSound).toHaveBeenCalledWith(expect.objectContaining({ kind: "hum", volume: 0.8 }))
  })

  // The regression this exists for: a preview used to be silenced by the very next repaint, and on
  // a real case page a repaint follows an edit within a frame or two — so it was audible for about
  // a tenth of a second, exactly where the witness needed to hear it.
  it("keeps a preview alive across repaints", () => {
    const element = mount()
    element.sightingData = humming
    const audio = audioOf(element)
    element.previewSound({ kind: "whistle", volume: 0.5, pitchHz: 1200 })
    audio.setSound.mockClear()
    audio.silence.mockClear()
    element.refresh()
    expect(audio.setSound).toHaveBeenCalledWith(expect.objectContaining({ kind: "whistle" }))
    expect(audio.silence).not.toHaveBeenCalled()
  })

  it("ends a preview on stopSoundPreview, and never revives it", () => {
    const element = mount()
    element.sightingData = humming
    const audio = audioOf(element)
    element.previewSound({ kind: "whistle", volume: 0.5, pitchHz: 1200 })
    element.stopSoundPreview()
    audio.setSound.mockClear()
    element.refresh()
    expect(audio.setSound).not.toHaveBeenCalled()
    expect(audio.silence).toHaveBeenCalled()
  })

  it("drops a preview once playback starts — the recording is what should be heard then", () => {
    const element = mount()
    element.sightingData = humming
    const audio = audioOf(element)
    element.previewSound({ kind: "whistle", volume: 0.5, pitchHz: 1200 })
    element.togglePlayPause()
    audio.setSound.mockClear()
    element.currentTime = 500
    expect(audio.setSound).toHaveBeenCalledWith(expect.objectContaining({ kind: "hum" }))
    expect(audio.setSound).not.toHaveBeenCalledWith(expect.objectContaining({ kind: "whistle" }))
  })

  it("silences the outgoing recording's sound when another is loaded", () => {
    const element = mount()
    element.sightingData = humming
    const audio = audioOf(element)
    element.previewSound({ kind: "whistle", volume: 0.5, pitchHz: 1200 })
    element.sightingData = sampleJson
    audio.setSound.mockClear()
    element.refresh()
    expect(audio.setSound).not.toHaveBeenCalled()
  })
})

describe("UfoElement hover tooltip", () => {
  afterEach(() => {
    document.body.innerHTML = ""
  })

  // 1:1 scale (matches the canvas's own 640x360 drawing buffer) so pointer coordinates map
  // directly onto Shape.bounds — same trick as SightingEditorElement.test.ts's nestedCanvas().
  function canvasSized(element: UfoElement): HTMLCanvasElement {
    const canvas = element.shadowRoot!.getElementById("canvas") as HTMLCanvasElement
    vi.spyOn(canvas, "getBoundingClientRect").mockReturnValue({ left: 0, top: 0, width: 640, height: 360 } as DOMRect)
    return canvas
  }

  // jsdom has no global PointerEvent — a plain MouseEvent dispatched as "pointermove"/
  // "pointerleave" exercises the same handlers, which only read clientX/clientY.
  function moveTo(canvas: HTMLCanvasElement, x: number, y: number): void {
    canvas.dispatchEvent(new MouseEvent("pointermove", { clientX: x, clientY: y }))
  }

  it("shows a tooltip with the shape's title when hovering it", () => {
    const element = mount()
    element.sightingData = {
      version: 1,
      timeline: {
        keyframes: [
          { t: 0, shapes: [{ sourceId: "ufo-1", shape: { kind: "oval", bounds: { x: 0, y: 0, width: 10, height: 10 }, color: "#39ff14", angle: 0, transparency: 0, haloScale: 1, selected: false, title: "Vaisseau principal" } }] }
        ]
      }
    }
    const canvas = canvasSized(element)
    const tooltip = element.shadowRoot!.getElementById("tooltip") as HTMLElement

    moveTo(canvas, 5, 5)

    expect(tooltip.hidden).toBe(false)
    expect(tooltip.textContent).toBe("Vaisseau principal")
  })

  it("keeps the tooltip hidden when hovering an untitled shape", () => {
    const element = mount()
    element.sightingData = {
      version: 1,
      timeline: {
        keyframes: [
          { t: 0, shapes: [{ sourceId: "ufo-1", shape: { kind: "oval", bounds: { x: 0, y: 0, width: 10, height: 10 }, color: "#39ff14", angle: 0, transparency: 0, haloScale: 1, selected: false } }] }
        ]
      }
    }
    const canvas = canvasSized(element)
    const tooltip = element.shadowRoot!.getElementById("tooltip") as HTMLElement

    moveTo(canvas, 5, 5)

    expect(tooltip.hidden).toBe(true)
  })

  it("keeps the tooltip hidden when hovering empty canvas", () => {
    const element = mount()
    const canvas = canvasSized(element)
    const tooltip = element.shadowRoot!.getElementById("tooltip") as HTMLElement

    moveTo(canvas, 300, 300)

    expect(tooltip.hidden).toBe(true)
  })

  it("hides the tooltip on pointerleave", () => {
    const element = mount()
    element.sightingData = {
      version: 1,
      timeline: {
        keyframes: [
          { t: 0, shapes: [{ sourceId: "ufo-1", shape: { kind: "oval", bounds: { x: 0, y: 0, width: 10, height: 10 }, color: "#39ff14", angle: 0, transparency: 0, haloScale: 1, selected: false, title: "Vaisseau principal" } }] }
        ]
      }
    }
    const canvas = canvasSized(element)
    const tooltip = element.shadowRoot!.getElementById("tooltip") as HTMLElement
    moveTo(canvas, 5, 5)
    expect(tooltip.hidden).toBe(false)

    canvas.dispatchEvent(new MouseEvent("pointerleave"))

    expect(tooltip.hidden).toBe(true)
  })
})

/**
 * A recorded timeline is a normalized parameterization of the observation's real declared
 * duration (playbackRate stretches one onto the other), so the seek bar has exactly one time
 * base. Extending its range past the last keyframe used to mix in a second one, which made the
 * displayed clock run backwards mid-bar — reproduced live on rr0.org's Socorro page (a 6 s
 * timeline declared as a 20 s observation showed 17:50:20 at 30% of the bar, then 17:50:07).
 */
describe("UfoElement seek range vs. declared duration", () => {
  afterEach(() => {
    document.body.innerHTML = ""
  })

  /** A 6-second recording declared as a 20-second observation — Socorro's own shape. */
  function shortRecordingLongObservation() {
    return {
      version: 1 as const,
      durationSeconds: 20,
      time: { year: 1964, month: 4, day: 24, hour: 17, minute: 50 },
      timeline: {
        keyframes: [
          { t: 0, shapes: [{ sourceId: "ufo-1", shape: { kind: "oval" as const, bounds: { x: 0, y: 0, width: 10, height: 10 }, color: "#fff", angle: 0, transparency: 0, haloScale: 0, selected: false } }] },
          { t: 6000, shapes: [{ sourceId: "ufo-1", shape: { kind: "oval" as const, bounds: { x: 100, y: 0, width: 10, height: 10 }, color: "#fff", angle: 0, transparency: 0, haloScale: 0, selected: false } }] }
        ]
      }
    }
  }

  it("keeps the seek range on the recorded timeline once there is motion to stretch", () => {
    const element = mount()
    element.sightingData = shortRecordingLongObservation()

    expect(element.seekableDuration).toBe(6000)
  })

  it("advances the displayed clock monotonically across the whole bar", () => {
    const element = mount()
    element.sightingData = shortRecordingLongObservation()
    const seen: string[] = []
    for (let t = 0; t <= element.seekableDuration; t += 500) {
      element.currentTime = t
      seen.push(element.positionLabel)
    }

    expect(seen[0]).toBe("17:50")
    expect(seen[seen.length - 1]).toBe("17:50:20") // the full declared duration, reached at the end
    const seconds = seen.map(label => Number(label.split(":")[2] ?? 0))
    expect(seconds).toEqual([...seconds].sort((a, b) => a - b)) // never runs backwards
  })

  it("still extends the range to the declared duration while nothing is recorded yet — an editor needs somewhere to place its first keyframes", () => {
    const element = mount()
    element.durationSeconds = 10

    expect(element.seekableDuration).toBe(10_000)
  })
})

/**
 * The clock the player shows is built from a cached copy of the observation's own start time, so
 * editing that start (an EDTF field in the recorder, which mutates event.time in place) has to
 * re-derive it — otherwise the labels keep reading the previous time until a full reload.
 */
describe("UfoElement observation start", () => {
  afterEach(() => {
    document.body.innerHTML = ""
  })

  it("re-reads the observation's start time on refresh", () => {
    const element = mount()
    element.sightingData = {
      version: 1,
      durationSeconds: 20,
      time: { year: 1964, month: 4, day: 24, hour: 17, minute: 50 },
      timeline: {
        keyframes: [
          { t: 0, shapes: [{ sourceId: "ufo-1", shape: { kind: "oval", bounds: { x: 0, y: 0, width: 10, height: 10 }, color: "#fff", angle: 0, transparency: 0, haloScale: 0, selected: false } }] },
          { t: 6000, shapes: [{ sourceId: "ufo-1", shape: { kind: "oval", bounds: { x: 90, y: 0, width: 10, height: 10 }, color: "#fff", angle: 0, transparency: 0, haloScale: 0, selected: false } }] }
        ]
      }
    }
    expect(element.durationLabel).toBe("17:50:20")

    element.sighting.event.time = { year: 1964, month: 4, day: 24, hour: 21, minute: 5 }
    element.refresh()

    expect(element.durationLabel).toBe("21:05:20")
    expect(element.positionLabel).toBe("21:05")
  })
})

describe("switching the counters between clock time and elapsed time", () => {
  /** An observation with a real start time: 17:50, running twenty seconds. */
  const timedSighting = {
    ...sampleJson,
    time: { year: 1964, month: 4, day: 24, hour: 17, minute: 50 },
    durationSeconds: 20
  }

  function mountUfo(sighting: object): UfoElement {
    const element = mount()
    element.sightingData = sighting as typeof sampleJson
    return element
  }

  function counters(element: UfoElement): { start: HTMLElement; end: HTMLElement } {
    const shadow = element.shadowRoot!
    return { start: shadow.getElementById("time-start")!, end: shadow.getElementById("time-end")! }
  }

  it("starts on the clock, which is how a testimony is written", () => {
    const element = mountUfo(timedSighting)
    const { start, end } = counters(element)
    expect(start.textContent).toBe("17:50")
    expect(end.textContent).toBe("17:50:20")
  })

  it("switches both counters together when either is clicked", () => {
    // Both or neither: one counter reading 17:50 beside another reading 0:20 would be two time
    // bases on one bar, which is exactly the confusion this is meant to remove.
    const element = mountUfo(timedSighting)
    const { start, end } = counters(element)
    start.click()
    expect(start.textContent).toBe("0:00")
    expect(end.textContent).toBe("0:20")
    // And back, from the other one.
    end.click()
    expect(start.textContent).toBe("17:50")
    expect(end.textContent).toBe("17:50:20")
  })

  it("says in its title what the click will do, and updates that after the click", () => {
    const element = mountUfo(timedSighting)
    const { start } = counters(element)
    expect(start.title).toContain("elapsed")
    start.click()
    expect(start.title).toContain("time of day")
  })

  it("offers nothing to switch to when the observation has no start time", () => {
    // With no clock there is only one reading available, so the counter stays plain text rather
    // than advertising a control that cannot do anything.
    const { time: _omitted, ...noTime } = sampleJson
    const element = mountUfo({ ...noTime, durationSeconds: 20 })
    const { start } = counters(element)
    expect(start.getAttribute("role")).toBe(null)
    expect(start.title).not.toContain("click")
    const before = start.textContent
    start.click()
    expect(start.textContent).toBe(before)
  })

  it("is reachable from the keyboard, as its role promises", () => {
    const element = mountUfo(timedSighting)
    const { start } = counters(element)
    expect(start.getAttribute("role")).toBe("button")
    expect(start.getAttribute("tabindex")).toBe("0")
    start.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }))
    expect(start.textContent).toBe("0:00")
  })
})

describe("UfoElement sequencing API", () => {

  const twoSecondSighting = (): SightingRecordingJson => ({
    version: 1,
    durationSeconds: 2,
    timeline: {
      keyframes: [
        { t: 0, shapes: [{ sourceId: "ufo-1", shape: { kind: "oval", bounds: { x: 10, y: 10, width: 20, height: 20 }, color: "#fff", angle: 0, transparency: 0, haloScale: 0, selected: false } }] },
        { t: 200, shapes: [{ sourceId: "ufo-1", shape: { kind: "oval", bounds: { x: 40, y: 10, width: 20, height: 20 }, color: "#fff", angle: 0, transparency: 0, haloScale: 0, selected: false } }] }
      ]
    }
  })

  it("turns auto-replay off through the same path the button uses", () => {
    const element = document.createElement("rr0-ufo") as UfoElement
    document.body.append(element)
    expect(element.autoReplayEnabled).toBe(true)
    element.autoReplayEnabled = false
    expect(element.autoReplayEnabled).toBe(false)
    // Idempotent: setting it to what it already is must not toggle it back.
    element.autoReplayEnabled = false
    expect(element.autoReplayEnabled).toBe(false)
    element.remove()
  })

  it("play() starts and pause() stops, whatever the current state is", () => {
    const element = document.createElement("rr0-ufo") as UfoElement
    document.body.append(element)
    element.sightingData = twoSecondSighting()
    element.play()
    expect(element.playbackState).toBe("playing")
    // Unlike togglePlayPause, calling it again must NOT stop it.
    element.play()
    expect(element.playbackState).toBe("playing")
    element.pause()
    expect(element.playbackState).toBe("paused")
    element.pause()
    expect(element.playbackState).toBe("paused")
    element.remove()
  })

  it("fires a bubbling, composed `ended` only on the playing -> stopped transition", () => {
    let now = 1000
    let frame: FrameRequestCallback | undefined
    const nowSpy = vi.spyOn(performance, "now").mockImplementation(() => now)
    vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => {
      frame = cb
      return 1
    })
    vi.stubGlobal("cancelAnimationFrame", () => {})

    const element = document.createElement(UFO_ELEMENT_NAME) as UfoElement
    document.body.append(element)
    element.sightingData = twoSecondSighting()
    element.autoReplayEnabled = false

    let ended = 0
    let bubbled = false
    let composed = false
    element.addEventListener("ended", event => {
      ended++
      bubbled = event.bubbles
      composed = (event as CustomEvent).composed
    })

    // A scrub to the very end of a recording that was never playing is not an ending.
    element.currentTime = element.seekableDuration
    expect(ended).toBe(0)

    element.currentTime = 0
    element.play()
    // Pausing partway is not one either.
    now += 500
    frame?.(now)
    element.pause()
    expect(ended).toBe(0)

    element.play()
    now += 5000 // well past the declared two seconds
    frame?.(now)

    expect(element.playbackState).toBe("stopped")
    expect(ended).toBe(1)
    expect(bubbled).toBe(true)
    expect(composed).toBe(true)

    element.remove()
    vi.unstubAllGlobals()
    nowSpy.mockRestore()
  })
})

describe("double-click on the canvas", () => {

  const oval = (x: number) => ({
    kind: "oval" as const, bounds: { x, y: 10, width: 20, height: 20 }, color: "#fff",
    angle: 0, transparency: 0, haloScale: 0, selected: false
  })
  const sighting = (): SightingRecordingJson => ({
    version: 1,
    durationSeconds: 2,
    timeline: {
      keyframes: [
        { t: 0, shapes: [{ sourceId: "ufo-1", shape: oval(10) }] },
        { t: 200, shapes: [{ sourceId: "ufo-1", shape: oval(40) }] }
      ]
    }
  })

  const clickPair = (canvas: HTMLCanvasElement): void => {
    // A real double-click is two clicks and then dblclick, in that order — reproduced here because
    // the whole design of the handler is about what those two clicks have already done.
    canvas.dispatchEvent(new MouseEvent("click", { detail: 1, bubbles: true }))
    canvas.dispatchEvent(new MouseEvent("click", { detail: 2, bubbles: true }))
    canvas.dispatchEvent(new MouseEvent("dblclick", { detail: 2, bubbles: true, cancelable: true }))
  }

  const withFullscreenStub = (element: UfoElement): { requested: () => number; exits: () => number } => {
    let requested = 0
    let exits = 0
    // Both halves of "this browser has fullscreen": the method AND document.fullscreenEnabled. The
    // element checks the second too, because it is what an <iframe> without allow="fullscreen" (or
    // a Permissions-Policy that forbids it) turns off — and there, as on an iPhone, the CSS
    // stand-in is what the reader should get instead of a dead button.
    Object.defineProperty(document, "fullscreenEnabled", { value: true, configurable: true })
    const stage = element.shadowRoot!.querySelector(".stage") as HTMLElement
    ;(stage as unknown as { requestFullscreen(): Promise<void> }).requestFullscreen = () => {
      requested++
      return Promise.resolve()
    }
    ;(document as unknown as { exitFullscreen(): Promise<void> }).exitFullscreen = () => {
      exits++
      return Promise.resolve()
    }
    return { requested: () => requested, exits: () => exits }
  }

  it("asks for fullscreen, and leaves playback where it found it", () => {
    const element = document.createElement(UFO_ELEMENT_NAME) as UfoElement
    document.body.append(element)
    element.sightingData = sighting()
    const fullscreen = withFullscreenStub(element)
    const canvas = element.canvasElement

    // Somewhere inside the recording, so the pair of clicks really does move the playhead: the
    // first of them plays on from here and the second stops it wherever that got to.
    element.currentTime = 150
    expect(element.playbackState).toBe("stopped")

    clickPair(canvas)

    expect(fullscreen.requested()).toBe(1)
    // Two clicks toggled play then pause; the position they moved is put back.
    expect(element.currentTime).toBe(150)
    element.remove()
  })

  it("leaves a PLAYING recording playing", () => {
    const element = document.createElement(UFO_ELEMENT_NAME) as UfoElement
    document.body.append(element)
    element.sightingData = sighting()
    withFullscreenStub(element)

    element.play()
    expect(element.playbackState).toBe("playing")

    clickPair(element.canvasElement)

    expect(element.playbackState).toBe("playing")
    element.remove()
  })

  it("is not ours to take where the canvas has been given to something else", () => {
    // What the recorder does: the canvas is its editing surface, so neither click nor double-click
    // belongs to playback there.
    const element = document.createElement(UFO_ELEMENT_NAME) as UfoElement
    document.body.append(element)
    element.sightingData = sighting()
    element.enableClickToPlay = false
    const fullscreen = withFullscreenStub(element)

    clickPair(element.canvasElement)

    expect(fullscreen.requested()).toBe(0)
    expect(element.playbackState).toBe("stopped")
    element.remove()
  })
})

describe("the witness's own map", () => {
  /** Zamora leaving the Socorro road, cut down to what the map reads: two places, a heading and
   * one named moment. */
  function movingWitness(): object {
    return {
      version: 1 as const,
      timeline: { keyframes: [{ t: 0, shapes: [] }, { t: 83000, shapes: [] }] },
      witnessTrack: {
        keyframes: [
          { t: 0, pose: { lat: 34.052376, lng: -106.89344, elevationM: 0, headingDeg: 200, pitchDeg: -5, fovDeg: 60 } },
          { t: 83000, pose: { lat: 34.042635, lng: -106.89775, elevationM: 0, headingDeg: 200, pitchDeg: -5, fovDeg: 60 } }
        ]
      },
      milestones: [{ t: 0, label: "A" }, { t: 83000, label: "F" }]
    }
  }

  /** A player whose page has asked for the map — off by default, see WITNESS_MAP_ATTRIBUTE. */
  function mountWithMap(sighting: object): UfoElement {
    const element = mount()
    element.setAttribute("show-witness-map", "")
    element.sightingData = sighting as never
    return element
  }

  function mapParts(element: UfoElement) {
    const shadow = element.shadowRoot!
    return {
      button: shadow.getElementById("witness-map") as HTMLButtonElement,
      panel: shadow.getElementById("witness-map-panel")!
    }
  }

  afterEach(() => {
    document.body.innerHTML = ""
  })

  it("offers the button to every recording that states a place, asked for or not", () => {
    // The button depends on the RECORDING, the open state on the page — two different questions.
    // A reader wanting to know where this happened is not something a page can predict, so the
    // button is there whether or not any page thought to ask.
    const element = mount()
    element.sightingData = movingWitness() as never
    const { button, panel } = mapParts(element)
    expect(button.hidden).toBe(false)
    expect(panel.hidden).toBe(true)
  })

  it("starts open when the page says so, and shuts again when it takes that back", () => {
    const element = mount()
    element.sightingData = movingWitness() as never
    expect(mapParts(element).panel.hidden).toBe(true)

    element.setAttribute("show-witness-map", "")
    expect(mapParts(element).panel.hidden).toBe(false)

    // The carousel needs this half: one stage plays every reconstruction in turn, so a page that
    // said "open for this one" must be able to say "not for the next".
    element.removeAttribute("show-witness-map")
    expect(mapParts(element).panel.hidden).toBe(true)
  })

  it("leaves a map the reader opened alone while the recording is edited", () => {
    // refresh() runs on every keystroke in the editor. A default re-applied there would slam shut
    // a map the author had just opened, and reopen one they had just closed.
    const element = mount()
    element.sightingData = movingWitness() as never
    mapParts(element).button.click()
    expect(mapParts(element).panel.hidden).toBe(false)

    element.refresh()
    expect(mapParts(element).panel.hidden).toBe(false)
  })

  it("is not offered for a recording that never said where it happened, asked for or not", () => {
    // Most recordings in this project say nothing about coordinates, and a control that is there
    // and opens onto nothing is worse than one that appears when it has an answer.
    const element = mountWithMap({ version: 1, timeline: { keyframes: [] } })
    expect(mapParts(element).button.hidden).toBe(true)
    expect(mapParts(element).panel.hidden).toBe(true)
  })

  it("is offered as soon as a recording names one place, tracked or not", () => {
    const element = mountWithMap({ version: 1, timeline: { keyframes: [] }, place: [{ lat: 34.05, lng: -106.89 }] })
    expect(mapParts(element).button.hidden).toBe(false)
  })

  it("costs no tile fetch until something actually opens it", () => {
    // These are real requests to a third party. A page listing a dozen case dossiers would fire
    // them all on load for maps nobody opened.
    const fetchSpy = vi.spyOn(globalThis, "fetch")
    const element = mount()
    element.sightingData = movingWitness() as never
    expect(mapParts(element).panel.hidden).toBe(true)
    expect(fetchSpy).not.toHaveBeenCalled()
    fetchSpy.mockRestore()
  })

  it("gets out of the phenomenon's way, and comes back once the sky is clear", () => {
    // The top-right corner is the emptiest part of nearly every sky here, which is why the map is
    // there — but a map covering the very thing a reader opened it to place is worse than no map.
    const element = mountWithMap(movingWitness())
    const panel = element.shadowRoot!.getElementById("witness-map-panel")!
    const canvas = element.canvasElement
    // jsdom lays nothing out, so the panel's own box is stated rather than measured.
    ;(element as unknown as { witnessMapBoxPx: unknown }).witnessMapBoxPx = { width: 200, top: 40, bottom: 240 }

    const put = (x: number) => {
      element.sighting.timeline.addKeyframe(0, [
        {
          sourceId: "ufo-1",
          shape: { kind: "oval", bounds: { x, y: 100, width: 40, height: 20 }, color: "#fff", angle: 0, transparency: 0, haloScale: 0, selected: false }
        }
      ])
      element.refresh()
    }

    put(canvas.width - 100) // under the map
    expect(panel.classList.contains("on-the-left")).toBe(true)

    put(canvas.width / 2 - 20) // back in the middle of the sky
    expect(panel.classList.contains("on-the-left")).toBe(false)
  })

  it("avoids both ends of a 3D exposure trail and hides when neither corner is free", () => {
    const element = mountWithMap(movingWitness())
    const panel = element.shadowRoot!.getElementById("witness-map-panel")!
    const canvas = element.canvasElement
    ;(element as unknown as { witnessMapBoxPx: unknown }).witnessMapBoxPx = { width: 200, top: 40, bottom: 240 }
    const right = { x: 1 - 100 / canvas.width, y: 100 / canvas.height, width: 40 / canvas.width, height: 20 / canvas.height }
    const left = { ...right, x: 50 / canvas.width }
    element.setMapSubjectBounds([right])
    expect(panel.classList.contains("on-the-left")).toBe(true)
    element.setMapSubjectBounds([right, left])
    expect(panel.classList.contains("subject-overlap")).toBe(true)
    expect(panel.hidden).toBe(false) // user visibility preference remains enabled
    element.setMapSubjectBounds([left])
    expect(panel.classList.contains("subject-overlap")).toBe(false)
    expect(panel.classList.contains("on-the-left")).toBe(false)
    element.setMapSubjectBounds([])
    expect(panel.classList.contains("subject-overlap")).toBe(false)
  })

  it("moves for the end of a phenomenon trail even when its first instant is clear", () => {
    const element = mountWithMap(movingWitness())
    const panel = element.shadowRoot!.getElementById("witness-map-panel")!
    const canvas = element.canvasElement
    ;(element as unknown as { witnessMapBoxPx: unknown }).witnessMapBoxPx = { width: 200, top: 40, bottom: 240 }
    const shape = (x: number) => ({ kind: "oval", bounds: { x, y: 100, width: 40, height: 20 },
      color: "#fff", angle: 0, transparency: 0, haloScale: 0, selected: false })
    const internal = element as unknown as { exposureInstants: () => unknown }
    internal.exposureInstants = () => [
      { shapes: new Map([["ufo", shape(canvas.width / 2)]]), share: 0.5 },
      { shapes: new Map([["ufo", shape(canvas.width - 100)]]), share: 0.5 }
    ]
    element.refresh()
    expect(panel.classList.contains("on-the-left")).toBe(true)
  })

  it("goes to a named moment on the map the way its mark on the bar does", () => {
    const element = mountWithMap(movingWitness())
    const canvas = element.shadowRoot!.getElementById("witness-map-canvas") as HTMLCanvasElement
    canvas.getBoundingClientRect = () => ({ left: 0, top: 0, width: canvas.width, height: canvas.height }) as DOMRect
    const renderer = (element as unknown as { witnessMapRenderer: { targets: Array<{ kind: string; t?: number; x: number; y: number }> } })
      .witnessMapRenderer
    const last = renderer.targets.find(target => target.kind === "milestone" && target.t === 83000)!

    element.currentTime = 0
    canvas.dispatchEvent(new MouseEvent("click", { bubbles: true, clientX: last.x, clientY: last.y }))
    expect(element.currentTime).toBe(83000)
  })

  it("asks whoever owns the 3D to turn toward a place on it", () => {
    // This element draws the map but cannot turn a view — it has no scene. So it says what was
    // clicked and lets the element that does own one decide, which is also what keeps a bare
    // <rr0-ufo> from pretending it can look somewhere.
    const element = mountWithMap(movingWitness())
    const canvas = element.shadowRoot!.getElementById("witness-map-canvas") as HTMLCanvasElement
    canvas.getBoundingClientRect = () => ({ left: 0, top: 0, width: canvas.width, height: canvas.height }) as DOMRect
    const renderer = (element as unknown as { witnessMapRenderer: { targets: Array<{ kind: string; x: number; y: number }> } })
      .witnessMapRenderer
    const witness = renderer.targets.find(target => target.kind === "witness")!
    const asked: Array<{ kind: string }> = []
    element.addEventListener("lookat", event => asked.push((event as CustomEvent).detail))

    canvas.dispatchEvent(new MouseEvent("click", { bubbles: true, clientX: witness.x, clientY: witness.y }))
    expect(asked).toEqual([expect.objectContaining({ kind: "witness" })])
  })

  it("asks to be looked at rather than closing, when a mark on it is clicked", () => {
    // Clicking the map used to shut it. Its marks now answer the pointer instead: a named moment is
    // an instant, so going to it moves the playhead, and anything else is a PLACE, so going to it
    // means asking whatever owns the 3D to turn the view — this element cannot turn one.
    const element = mountWithMap(movingWitness())
    const asked: unknown[] = []
    element.addEventListener("lookat", event => asked.push((event as CustomEvent).detail))
    const canvas = element.shadowRoot!.getElementById("witness-map-canvas") as HTMLCanvasElement
    canvas.getBoundingClientRect = () => ({ left: 0, top: 0, width: canvas.width, height: canvas.height }) as DOMRect

    canvas.dispatchEvent(new MouseEvent("click", { bubbles: true, clientX: -50, clientY: -50 }))
    expect(asked).toHaveLength(0) // nothing there
    expect(mapParts(element).panel.hidden).toBe(false) // and it did NOT close
  })

  it("opens and closes on the button, and says which it will do", () => {
    const element = mount()
    element.sightingData = movingWitness() as never
    const { button, panel } = mapParts(element)

    button.click()
    expect(panel.hidden).toBe(false)
    expect(button.getAttribute("aria-pressed")).toBe("true")
    expect(button.title).toBe("Hide where the witness was")

    button.click()
    expect(panel.hidden).toBe(true)
    expect(button.title).toBe("Show where the witness was")
  })

  it("closes itself when the recording it was showing is replaced by one with no place", () => {
    // A page playing several recordings in turn does exactly this. Leaving the panel up would show
    // the previous witness's ground under the new one's recording.
    const element = mountWithMap(movingWitness())
    expect(mapParts(element).panel.hidden).toBe(false)

    element.sightingData = { version: 1, timeline: { keyframes: [] } } as never
    expect(mapParts(element).panel.hidden).toBe(true)
    expect(mapParts(element).button.hidden).toBe(true)
  })

  it("applies the page's default again for each recording that arrives", () => {
    // A carousel swaps recordings under one stage. The map opening is about the recording being
    // loaded, not the one it replaced.
    const element = mountWithMap({ version: 1, timeline: { keyframes: [] } })
    expect(mapParts(element).panel.hidden).toBe(true) // nowhere to point it

    element.sightingData = movingWitness() as never
    expect(mapParts(element).panel.hidden).toBe(false)
  })
})

describe("the account's named moments", () => {
  function withMilestones(): object {
    return {
      version: 1 as const,
      timeline: { keyframes: [{ t: 0, shapes: [] }, { t: 1000, shapes: [] }] },
      milestones: [{ t: 0, label: "A", note: "He hears a roar" }, { t: 500, label: "B", note: "The sound stops" }]
    }
  }

  function parts(element: UfoElement) {
    const shadow = element.shadowRoot!
    return {
      button: shadow.getElementById("milestones") as HTMLButtonElement,
      marks: shadow.getElementById("milestone-marks")!,
      caption: shadow.getElementById("milestone-caption")!
    }
  }

  afterEach(() => {
    document.body.innerHTML = ""
  })

  it("stacks the caption on the controls instead of guessing their height", () => {
    // It used to sit a fixed 2.6em from the bottom edge, which is a guess at how tall the toolbar
    // is — and Socorro's (E), long enough to wrap to two lines, then lost its second line under it.
    // jsdom lays nothing out, so what is guarded here is the structure that makes the layout right:
    // one bottom-anchored box, caption first, controls second.
    const element = mount()
    const stack = element.shadowRoot!.getElementById("bottom-stack")!
    const order = [...stack.children].map(child => child.id)
    expect(order).toEqual(["milestone-caption", "toolbar"])
  })

  it("offers no button to a recording that names no moment", () => {
    const element = mount()
    element.sightingData = { version: 1, timeline: { keyframes: [{ t: 0, shapes: [] }] } } as never
    expect(parts(element).button.hidden).toBe(true)
  })

  it("is on by default wherever there are moments to show", () => {
    // Unlike the map: these are the recording's own words about itself, so they belong wherever
    // they exist rather than waiting for a page to ask.
    const element = mount()
    element.sightingData = withMilestones() as never
    const { button, marks, caption } = parts(element)
    expect(button.hidden).toBe(false)
    expect(marks.hidden).toBe(false)
    expect(caption.hidden).toBe(false)
    expect(button.title).toBe("Hide the account's moments")
  })

  it("takes them off on the button, marks and caption together", () => {
    // Three views of the same few facts — the ticks on the bar, the sentence over the controls and
    // the lettered points on the map. Hiding one and leaving another would be showing half a thing.
    const element = mount()
    element.sightingData = withMilestones() as never
    const { button, marks, caption } = parts(element)

    button.click()
    expect(marks.hidden).toBe(true)
    expect(caption.hidden).toBe(true)
    expect(button.getAttribute("aria-pressed")).toBe("false")
    expect(button.title).toBe("Show the account's moments")

    button.click()
    expect(marks.hidden).toBe(false)
    expect(caption.hidden).toBe(false)
  })

  it("lets a page take them off, and put them back", () => {
    const element = mount()
    element.sightingData = withMilestones() as never

    element.setAttribute("hide-milestones", "")
    expect(parts(element).marks.hidden).toBe(true)
    expect(parts(element).caption.hidden).toBe(true)
    // Still offered: a page hiding them by default is not a page forbidding them.
    expect(parts(element).button.hidden).toBe(false)

    element.removeAttribute("hide-milestones")
    expect(parts(element).marks.hidden).toBe(false)
  })
})
