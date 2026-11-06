import { describe, expect, it } from "vitest"
import { BasisInputElement, register } from "../../src/component/BasisInputElement.js"
import { HintElement } from "../../src/component/HintElement.js"

const messages = {
  title: "How this value was obtained", basisField: "Basis", howField: "How", rationaleField: "Rationale",
  basis: { stated: "stated", measured: "measured", derived: "derived", assumed: "assumed" }
}

function mounted(): BasisInputElement {
  register()
  const element = document.createElement(BasisInputElement.TAG) as BasisInputElement
  element.messages = messages
  document.body.append(element)
  return element
}

describe("BasisInputElement", () => {
  it("says what a value stands on, its rationale as its tooltip", () => {
    const element = mounted()
    expect(element.pill.dataset.basis).toBe("stated")
    element.entry = { basis: "assumed", rationale: "Nobody measured it" }
    expect(element.pill.textContent).toBe("assumed")
    expect(element.pill.title).toContain("Nobody measured it")
  })

  it("opens a window where its basis and rationale are said, and reports each change", () => {
    const element = mounted()
    const reported: unknown[] = []
    element.addEventListener("basischange", event => reported.push((event as CustomEvent).detail.entry))
    element.pill.click()
    const window = element.openWindow!
    const basis = window.querySelector("select")!
    basis.value = "derived"
    basis.dispatchEvent(new Event("change"))
    const rationale = window.querySelector("textarea")!
    rationale.value = "From the road's width"
    rationale.dispatchEvent(new Event("change"))
    expect(reported).toEqual([{ basis: "derived" }, { basis: "derived", rationale: "From the road's width" }])
    // No list of ways given: none shown.
    expect(window.querySelectorAll("select").length).toBe(1)
    basis.value = "stated"
    rationale.value = ""
    rationale.dispatchEvent(new Event("change"))
    expect(reported.at(-1)).toBeUndefined()
  })
})

describe("HintElement", () => {
  it("says what a label leaves out, on hover and pressed", () => {
    const hint = HintElement.of("width, and height above the eye")
    document.body.append(hint)
    const button = hint.querySelector("button")!
    expect(button.title).toBe("width, and height above the eye")
    const popup = hint.querySelector<HTMLElement>(".hint-pop")!
    expect(popup.hidden).toBe(true)
    button.click()
    expect(popup.hidden).toBe(false)
  })
})
