import { describe, expect, it } from "vitest"
import { EdtfDateField } from "../../src/component/EdtfDateField.js"
import { register } from "../../src/component/DateInputElement.js"
import type { DateInputElement } from "../../src/component/DateInputElement.js"
import { parseEdtfTime } from "../../src/engine/model/Sighting.js"
import type { SightingTime } from "../../src/engine/model/Sighting.js"

register()

const make = () => {
  const told: (SightingTime | undefined)[] = []
  const element = document.createElement("rr0-date-input") as DateInputElement
  element.addEventListener("datechange", event => told.push((event as CustomEvent<{ time: SightingTime | undefined }>).detail.time))
  document.body.appendChild(element)
  const picker = element.querySelector("input[type=datetime-local]") as HTMLInputElement
  const text = element.querySelector("input[type=text]") as HTMLInputElement
  const mode = element.querySelector("button.edtf-mode") as HTMLButtonElement
  const help = element.querySelector("button.edtf-help") as HTMLButtonElement
  const popup = element.querySelector(".edtf-helppop") as HTMLElement
  return { element, field: element.field, picker, text, mode, help, popup, told }
}

describe("EdtfDateField", () => {
  it("says which times a picker can hold, and which a date opens precise on: an exact full instant", () => {
    expect(EdtfDateField.isPickable(parseEdtfTime("1965-07-01T05:00"))).toBe(true)
    expect(EdtfDateField.isPickable(parseEdtfTime("1965-07-01T05:00:30"))).toBe(true)
    expect(EdtfDateField.isPickable(parseEdtfTime("1965-07-01"))).toBe(false)
    expect(EdtfDateField.isPickable(parseEdtfTime("1954"))).toBe(false)
    expect(EdtfDateField.opensPrecise(undefined, parseEdtfTime("1965-07-01T05:00"))).toBe(true)
    expect(EdtfDateField.opensPrecise(parseEdtfTime("1954"))).toBe(false)
    // A doubt is not something a picker can say.
    expect(EdtfDateField.opensPrecise(parseEdtfTime("1965-07-01T05:00~"))).toBe(false)
    expect(EdtfDateField.opensPrecise(parseEdtfTime("1965-07-01T05:00?"))).toBe(false)
  })

  it("shows a time in the picker and the text, the doubt staying at the end of the text", () => {
    const { field, picker, text } = make()
    field.set(parseEdtfTime("1965-07-01T05:00~"))
    expect(picker.value).toBe("1965-07-01T05:00")
    expect(text.value).toBe("1965-07-01T05:00~")
    field.set(parseEdtfTime("1954"))
    expect(picker.value).toBe("")
    expect(text.value).toBe("1954")
    field.set(parseEdtfTime("1965-07-01T05:00:30"))
    expect(picker.step).toBe("1")
  })

  it("tells what the picker says, as the time a typed text would give", () => {
    const { picker, told } = make()
    picker.value = "1965-07-01T05:00"
    picker.dispatchEvent(new Event("change"))
    expect(told).toHaveLength(1)
    expect(told[0]).toEqual(parseEdtfTime("1965-07-01T05:00"))
  })

  it("tells nothing of a text that does not read yet, and flags it only on blur", () => {
    const { field, text, told } = make()
    field.setPrecise(false)
    text.value = "1965-07-"
    text.dispatchEvent(new Event("input"))
    expect(told).toEqual([])
    expect(text.classList.contains("invalid")).toBe(false)
    text.dispatchEvent(new Event("blur"))
    expect(text.classList.contains("invalid")).toBe(true)
    text.value = "1965-07"
    text.dispatchEvent(new Event("input"))
    expect(text.classList.contains("invalid")).toBe(false)
    expect(told).toHaveLength(1)
  })

  it("tells that the date was cleared", () => {
    const { field, text, told } = make()
    field.set(parseEdtfTime("1965-07-01T05:00"))
    text.value = ""
    text.dispatchEvent(new Event("input"))
    expect(told).toEqual([undefined])
  })

  it("has a button that says how the date is said — precise or EDTF — and swaps the two without writing anything", () => {
    const { field, picker, text, mode, told } = make()
    expect(mode.textContent).toBe("precise")
    expect([picker.hidden, text.hidden]).toEqual([false, true])
    mode.click()
    expect(mode.textContent).toBe("EDTF")
    expect([picker.hidden, text.hidden]).toEqual([true, false])
    expect(field.isPrecise).toBe(false)
    mode.click()
    expect(mode.textContent).toBe("precise")
    expect(told).toEqual([])
  })

  it("says in the text's tooltip what it understood: a date in words, with its doubt", () => {
    const { field, text } = make()
    field.setPrecise(false)
    text.value = "1965-07?"
    text.dispatchEvent(new Event("input"))
    expect(text.title).toContain("July 1965")
    expect(text.title).toContain("uncertain")
    text.value = "1965-07-01T05:00~"
    text.dispatchEvent(new Event("input"))
    expect(text.title).toContain("July 1, 1965")
    expect(text.title).toContain("05:00")
    expect(text.title).toContain("approximate")
    text.value = "05:00"
    text.dispatchEvent(new Event("input"))
    expect(text.title).toBe("→ 05:00")
  })

  it("says that the text is not understood, in its tooltip, and goes back to what it takes when there is nothing to understand", () => {
    const { element, field, text } = make()
    element.hint = "Type an EDTF date"
    field.setPrecise(false)
    expect(text.title).toBe("Type an EDTF date")
    text.value = "not a date"
    text.dispatchEvent(new Event("input"))
    expect(text.title).not.toContain("→")
    expect(text.title).not.toBe("Type an EDTF date")
    text.value = ""
    text.dispatchEvent(new Event("input"))
    expect(text.title).toBe("Type an EDTF date")
  })

  it("offers a (?) in the text field, only while the text shows, which opens the syntax it takes", () => {
    const { field, help, popup } = make()
    expect(help.hidden).toBe(true)
    field.setPrecise(false)
    expect(help.hidden).toBe(false)
    expect(popup.hidden).toBe(true)
    help.click()
    expect(popup.hidden).toBe(false)
    expect(popup.textContent).toContain("1965-07-01T05:00")
    expect(popup.textContent).toContain("?")
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }))
    expect(popup.hidden).toBe(true)
  })
})

describe("<rr0-date-input>", () => {
  it("makes its controls in its own light DOM, with ids derived from its name", () => {
    const element = document.createElement("rr0-date-input") as DateInputElement
    element.setAttribute("name", "obs-time")
    document.body.appendChild(element)
    expect(element.querySelector("#obs-time-native")).not.toBeNull()
    expect(element.querySelector("#obs-time")).not.toBeNull()
    expect(element.querySelector("select")).toBeNull() // no third control for a doubt
    element.remove()
  })

  it("says what it shows without telling anybody, and tells what the author changes", () => {
    const element = document.createElement("rr0-date-input") as DateInputElement
    const told: unknown[] = []
    element.addEventListener("datechange", event => told.push((event as CustomEvent).detail.time))
    document.body.appendChild(element)
    element.time = parseEdtfTime("1965-07-01T05:00")
    expect(told).toEqual([])
    element.setPrecise(false)
    const text = element.querySelector("input[type=text]") as HTMLInputElement
    text.value = "1965"
    text.dispatchEvent(new Event("input"))
    expect(told).toHaveLength(1)
    element.remove()
  })
})
