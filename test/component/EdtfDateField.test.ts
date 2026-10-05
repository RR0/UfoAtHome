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
  element.build()
  const field = element.field
  const picker = element.querySelector("input[type=datetime-local]") as HTMLInputElement
  const text = element.querySelector("input[type=text]") as HTMLInputElement
  const qualifier = element.querySelector("select") as HTMLSelectElement
  return { element, field, picker, text, qualifier, told }
}

describe("EdtfDateField", () => {
  it("says which times a picker can hold: a full instant, with or without seconds", () => {
    expect(EdtfDateField.isPickable(parseEdtfTime("1965-07-01T05:00"))).toBe(true)
    expect(EdtfDateField.isPickable(parseEdtfTime("1965-07-01T05:00:30"))).toBe(true)
    expect(EdtfDateField.isPickable(parseEdtfTime("1965-07-01"))).toBe(false)
    expect(EdtfDateField.isPickable(parseEdtfTime("1954"))).toBe(false)
    expect(EdtfDateField.opensInPicker(undefined, parseEdtfTime("1965-07-01T05:00"))).toBe(true)
    expect(EdtfDateField.opensInPicker(parseEdtfTime("1954"))).toBe(false)
  })

  it("shows a time in the picker, the text and the qualifier, whichever it can", () => {
    const { field, picker, text, qualifier } = make()
    field.set(parseEdtfTime("1965-07-01T05:00~"))
    expect(picker.value).toBe("1965-07-01T05:00")
    expect(text.value).toBe("1965-07-01T05:00~")
    expect(qualifier.value).toBe("~")
    field.set(parseEdtfTime("1954"))
    expect(picker.value).toBe("")
    expect(text.value).toBe("1954")
    expect(qualifier.value).toBe("")
    field.set(parseEdtfTime("1965-07-01T05:00:30"))
    expect(picker.step).toBe("1")
  })

  it("tells what the picker and its qualifier say, as the time a typed text would give", () => {
    const { picker, qualifier, told } = make()
    picker.value = "1965-07-01T05:00"
    qualifier.value = "?"
    picker.dispatchEvent(new Event("change"))
    expect(told).toHaveLength(1)
    expect(told[0]).toEqual(parseEdtfTime("1965-07-01T05:00?"))
  })

  it("tells nothing of a text that does not read yet, and flags it only on blur", () => {
    const { text, told } = make()
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

  it("tells that the date was cleared, and a picker half entered is not a clearing", () => {
    const { field, picker, text, told } = make()
    field.set(parseEdtfTime("1965-07-01T05:00"))
    text.value = ""
    text.dispatchEvent(new Event("input"))
    expect(told).toEqual([undefined])
    // badInput is the browser's: jsdom has none, so only the cleared case is checked here.
    expect(picker.value).toBe("1965-07-01T05:00")
  })

  it("swaps the picker for the text, and back, without writing anything", () => {
    const { field, picker, text, qualifier, told } = make()
    field.setMode(true)
    expect([picker.hidden, text.hidden, qualifier.hidden]).toEqual([true, false, true])
    field.setMode(false)
    expect([picker.hidden, text.hidden, qualifier.hidden]).toEqual([false, true, false])
    expect(told).toEqual([])
  })
})

describe("<rr0-date-input>", () => {
  it("makes its controls in its own light DOM, with ids derived from its name", () => {
    const element = document.createElement("rr0-date-input") as DateInputElement
    element.setAttribute("name", "obs-time")
    document.body.appendChild(element)
    expect(element.querySelector("#obs-time-native")).not.toBeNull()
    expect(element.querySelector("#obs-time")).not.toBeNull()
    expect(element.querySelector("#obs-time-qualifier")).not.toBeNull()
    expect(element.querySelector("button")).toBeNull() // no toggle unless asked for
    element.remove()
  })

  it("has a toggle of its own when asked, which swaps the picker for the text", () => {
    const element = document.createElement("rr0-date-input") as DateInputElement
    element.setAttribute("toggle", "")
    document.body.appendChild(element)
    const toggle = element.querySelector("button")!
    expect(element.edtf).toBe(false)
    toggle.click()
    expect(element.edtf).toBe(true)
    expect(toggle.getAttribute("aria-pressed")).toBe("true")
    element.remove()
  })

  it("says what it shows without telling anybody, and tells what the author changes", () => {
    const element = document.createElement("rr0-date-input") as DateInputElement
    const told: unknown[] = []
    element.addEventListener("datechange", event => told.push((event as CustomEvent).detail.time))
    document.body.appendChild(element)
    element.time = parseEdtfTime("1965-07-01T05:00")
    expect(told).toEqual([])
    const text = element.querySelector("input[type=text]") as HTMLInputElement
    text.value = "1965"
    text.dispatchEvent(new Event("input"))
    expect(told).toHaveLength(1)
    element.remove()
  })
})
