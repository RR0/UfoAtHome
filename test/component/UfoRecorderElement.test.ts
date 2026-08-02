import { describe, expect, it, afterEach, beforeAll, vi } from "vitest"
import { register, ELEMENT_NAME } from "../../src/component/UfoRecorderElement.js"
import type { UfoRecorderElement } from "../../src/component/UfoRecorderElement.js"

register()

// jsdom's <canvas> has no real 2D context (getContext("2d") returns null without the
// native `canvas` package) — stub it, same as test/render/CanvasRenderer.test.ts's mock,
// so mounting the component doesn't throw when it paints its initial preview.
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

function mount(): UfoRecorderElement {
  const element = document.createElement(ELEMENT_NAME) as UfoRecorderElement
  document.body.appendChild(element)
  return element
}

describe("UfoRecorderElement appearance toolbar", () => {
  afterEach(() => {
    document.body.innerHTML = ""
  })

  it("defaults to an oval, opaque, green appearance", () => {
    const element = mount()
    expect(element.appearance).toEqual({ presetId: "oval", color: "#39ff14", transparency: 0, haloScale: 1.5 })
  })

  it("clicking a preset button updates the appearance and its pressed state", () => {
    const element = mount()
    const saucerButton = element.shadowRoot!.getElementById("preset-saucer") as HTMLButtonElement
    saucerButton.click()

    expect(element.appearance.presetId).toBe("saucer")
    expect(saucerButton.getAttribute("aria-pressed")).toBe("true")
    const ovalButton = element.shadowRoot!.getElementById("preset-oval") as HTMLButtonElement
    expect(ovalButton.getAttribute("aria-pressed")).toBe("false")
  })

  it("changing color/transparency/halo inputs updates the appearance", () => {
    const element = mount()
    const shadow = element.shadowRoot!
    const colorInput = shadow.getElementById("color") as HTMLInputElement
    const transparencyInput = shadow.getElementById("transparency") as HTMLInputElement
    const haloInput = shadow.getElementById("haloScale") as HTMLInputElement

    colorInput.value = "#ff8800"
    colorInput.dispatchEvent(new Event("input"))
    transparencyInput.value = "0.6"
    transparencyInput.dispatchEvent(new Event("input"))
    haloInput.value = "2.5"
    haloInput.dispatchEvent(new Event("input"))

    expect(element.appearance).toEqual({ presetId: "oval", color: "#ff8800", transparency: 0.6, haloScale: 2.5 })
  })

  it("the appearance setter merges partial updates", () => {
    const element = mount()
    element.appearance = { color: "#0000ff" }
    expect(element.appearance).toEqual({ presetId: "oval", color: "#0000ff", transparency: 0, haloScale: 1.5 })
  })
})

describe("UfoRecorderElement composes a nested rr0-ufo-player", () => {
  afterEach(() => {
    document.body.innerHTML = ""
  })

  it("nests a real, upgraded UfoPlayerElement instance", () => {
    const element = mount()
    const player = element.shadowRoot!.querySelector("rr0-ufo-player")
    expect(player).not.toBeNull()
    // Would be undefined on a not-yet-upgraded element (see the constructor's
    // document.createElement comment) — asserting it's present proves the fix.
    expect((player as unknown as { canvasElement: unknown }).canvasElement).toBeDefined()
  })

  it("sightingData get/set delegates to the nested player", () => {
    const element = mount()
    const json = {
      version: 1 as const,
      timeline: {
        keyframes: [
          { t: 0, shapes: [{ sourceId: "ufo-1", shape: { kind: "oval" as const, bounds: { x: 1, y: 2, width: 3, height: 4 }, color: "#fff", angle: 0, transparency: 0, haloScale: 0, selected: false } }] }
        ]
      }
    }
    element.sightingData = json
    expect(element.sightingData).toEqual(json)
  })

  it("recording appends a keyframe to the nested player's timeline", async () => {
    // Uses real timers deliberately: RafSamplingClock drives recording via the real
    // requestAnimationFrame/performance.now (jsdom's own rAF polyfill, not a sinon-fake-timer
    // concept — see engine/record/SamplingClock.ts's IntervalSamplingClock, which is the
    // fake-timer-friendly variant already covered by test/engine/Recorder.test.ts).
    const element = mount()
    const shadow = element.shadowRoot!
    const recordButton = shadow.getElementById("record") as HTMLButtonElement
    const canvas = shadow.querySelector("rr0-ufo-player")!.shadowRoot!.getElementById("canvas") as HTMLCanvasElement
    vi.spyOn(canvas, "getBoundingClientRect").mockReturnValue({ left: 0, top: 0 } as DOMRect)

    recordButton.click()
    // jsdom has no global PointerEvent; onPointerMove only reads clientX/clientY, so a
    // plain MouseEvent dispatched as "pointermove" exercises the same handler.
    canvas.dispatchEvent(new MouseEvent("pointermove", { clientX: 50, clientY: 60 }))
    await new Promise(resolve => setTimeout(resolve, 150))
    recordButton.click()

    expect(element.sightingData.timeline.keyframes.length).toBeGreaterThan(0)
  })
})
