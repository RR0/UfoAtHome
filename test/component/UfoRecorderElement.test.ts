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
