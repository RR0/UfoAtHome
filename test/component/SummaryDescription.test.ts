// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest"
import { SummaryDescription } from "../../src/component/SummaryDescription.js"

describe("SummaryDescription", () => {
  const strip = (): HTMLElement => {
    const element = document.createElement("div")
    element.className = "param-summary"
    element.append(document.createElement("span"))
    document.body.append(element)
    return element
  }

  it("puts the whole text in the strip, and a cross closes it", () => {
    const element = strip()
    const onClose = vi.fn()
    SummaryDescription.sync(element, "The whole story.", "Description", "Close", onClose)
    expect(element.hasAttribute("data-describing")).toBe(true)
    expect(element.querySelector(".param-description-text")!.textContent).toBe("The whole story.")
    element.querySelector<HTMLButtonElement>(".param-description-close")!.click()
    expect(onClose).toHaveBeenCalled()
  })

  it("shows the chips again once there is no text", () => {
    const element = strip()
    SummaryDescription.sync(element, "Story", "Description", "Close", () => {})
    SummaryDescription.sync(element, undefined, "Description", "Close", () => {})
    expect(element.hasAttribute("data-describing")).toBe(false)
    expect(element.querySelector(".param-description")).toBe(null)
  })
})
