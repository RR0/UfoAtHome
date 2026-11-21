import { afterEach, describe, expect, it } from "vitest"
import { ColumnResize } from "../../src/component/ColumnResize.js"

describe("ColumnResize", () => {
  afterEach(() => localStorage.clear())

  const make = () => {
    const host = document.createElement("div")
    const column = document.createElement("div")
    const grip = document.createElement("div")
    host.append(column, grip)
    const resize = new ColumnResize(grip, host, () => column, "test-width")
    return { host, grip, resize }
  }

  it("gives the first column a width within bounds, remembers it, and gives its own back on a double click", () => {
    const { host, grip } = make()
    expect(grip.getAttribute("role")).toBe("separator")
    expect(host.style.getPropertyValue(ColumnResize.PROPERTY)).toBe("")
    // Never narrower than the history's cards can say what they are.
    grip.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowLeft" }))
    expect(host.style.getPropertyValue(ColumnResize.PROPERTY)).toBe("200px")
    expect(localStorage.getItem("test-width")).toBe("200px")
    // The next one opens at the width kept.
    expect(make().host.style.getPropertyValue(ColumnResize.PROPERTY)).toBe("200px")
    grip.dispatchEvent(new MouseEvent("dblclick"))
    expect(host.style.getPropertyValue(ColumnResize.PROPERTY)).toBe("")
    expect(localStorage.getItem("test-width")).toBeNull()
  })

  it("says what it does in the reader's language", () => {
    const { grip, resize } = make()
    resize.label("Redimensionner")
    expect(grip.title).toBe("Redimensionner")
    expect(grip.getAttribute("aria-label")).toBe("Redimensionner")
  })

  it("folds the column away to its button, and back, remembering it, its button saying what it does", () => {
    const { host, resize } = make()
    const button = document.createElement("button")
    resize.foldWith(button)
    resize.foldLabels("Fold", "Unfold")
    expect(host.hasAttribute("data-folded")).toBe(false)
    expect(button.title).toBe("Fold")
    button.click()
    expect(host.hasAttribute("data-folded")).toBe(true)
    expect(button.title).toBe("Unfold")
    expect(button.getAttribute("aria-expanded")).toBe("false")
    // The next one opens folded.
    const next = make()
    next.resize.foldWith(document.createElement("button"))
    expect(next.host.hasAttribute("data-folded")).toBe(true)
    button.click()
    expect(host.hasAttribute("data-folded")).toBe(false)
  })
})
