// @vitest-environment jsdom
import { describe, expect, it } from "vitest"
import { SceneFieldOverlay } from "../../src/component/SceneFieldOverlay.js"

function make() {
  const card = document.createElement("div")
  const picture = document.createElement("canvas")
  card.append(picture)
  document.body.append(card)
  return { card, overlay: new SceneFieldOverlay(card, () => picture) }
}

describe("SceneFieldOverlay", () => {
  it("draws the horizon where the tilt puts it, and says so", () => {
    const { card, overlay } = make()
    overlay.horizon(0.75, "Horizon · tilt 15°")
    const line = card.querySelector<HTMLElement>(".sfo-horizon")!
    expect(line.style.top).toBe("75%")
    expect(line.textContent).toBe("Horizon · tilt 15°")
    expect(card.querySelector<HTMLElement>(".scene-field-overlay")!.hidden).toBe(false)
  })

  it("draws one thing at a time, and nothing once hidden", () => {
    const { card, overlay } = make()
    overlay.frame("Field of view 33° × 41°")
    overlay.measure(0.5, 0.4, 0.1, "4.6° · 0.4 m · 5 m")
    expect(card.querySelector(".sfo-frame")).toBeNull()
    expect(card.querySelector<HTMLElement>(".sfo-measure")!.style.left).toBe("50%")
    overlay.hide()
    expect(card.querySelector<HTMLElement>(".scene-field-overlay")!.hidden).toBe(true)
    expect(card.querySelector(".sfo-measure")).toBeNull()
  })

  it("turns the wind's arrow the way it blows from where the observer faces", () => {
    const { card, overlay } = make()
    overlay.wind(90, "Blowing toward E · 3 m/s")
    expect(card.querySelector<SVGElement>(".sfo-wind svg")!.getAttribute("style")).toContain("rotate(90deg)")
  })
})
