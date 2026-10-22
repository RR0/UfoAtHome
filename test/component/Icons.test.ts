// @vitest-environment jsdom
import { describe, expect, it } from "vitest"
import { Icons } from "../../src/component/Icons.js"

describe("Icons", () => {
  it("draws the pictogram a glyph stands for, and keeps the glyph as data-icon", () => {
    const button = document.createElement("button")
    Icons.show(button, "▶")
    expect(button.querySelector("svg")).not.toBeNull()
    expect(button.dataset.icon).toBe("▶")
  })

  it("leaves an icon already shown as it is, so a click pressed on it is not taken away by the next frame", () => {
    const button = document.createElement("button")
    Icons.show(button, "⏸")
    const shown = button.querySelector("svg")
    Icons.show(button, "⏸")
    expect(button.querySelector("svg")).toBe(shown)
    Icons.show(button, "▶")
    expect(button.querySelector("svg")).not.toBe(shown)
  })

  it("writes a glyph with no pictogram as text", () => {
    const button = document.createElement("button")
    Icons.show(button, "?")
    expect(button.textContent).toBe("?")
  })
})
