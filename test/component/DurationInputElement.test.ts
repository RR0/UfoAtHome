import { describe, expect, it } from "vitest"
import { register } from "../../src/component/DurationInputElement.js"
import type { DurationInputElement } from "../../src/component/DurationInputElement.js"
import { DurationText } from "../../src/engine/model/DurationText.js"

register()

const make = () => {
  const told: { seconds: number | undefined, text: string | undefined }[] = []
  const element = document.createElement("rr0-duration-input") as DurationInputElement
  element.setAttribute("name", "durationSeconds")
  element.addEventListener("durationchange", event => told.push((event as CustomEvent).detail))
  document.body.appendChild(element)
  return {
    element, told,
    number: element.input, text: element.textField,
    mode: element.querySelector("button.duration-mode") as HTMLButtonElement,
    chosen: element.querySelector(".duration-chosen") as HTMLElement,
    help: element.querySelector("button.duration-help") as HTMLButtonElement,
    popup: element.querySelector(".duration-helppop") as HTMLElement
  }
}

describe("DurationText", () => {
  it("reads ISO 8601 durations, a doubt and a range", () => {
    expect(DurationText.seconds("PT10M")).toBe(600)
    expect(DurationText.seconds("PT1H30M")).toBe(5400)
    expect(DurationText.seconds("PT45.5S")).toBe(45.5)
    expect(DurationText.seconds("P1DT1H")).toBe(90000)
    expect(DurationText.seconds("10 minutes")).toBeUndefined()
    expect(DurationText.seconds("P")).toBeUndefined()
    expect(DurationText.seconds("PT")).toBeUndefined()
    expect(DurationText.parse("PT10M~")).toEqual({ doubt: "~", minSeconds: 600, maxSeconds: 600, chosenSeconds: 600 })
    expect(DurationText.parse("PT5M/PT10M")).toEqual({ doubt: "", minSeconds: 300, maxSeconds: 600, chosenSeconds: 450 })
    expect(DurationText.parse("PT10M/PT5M?")?.chosenSeconds).toBe(450)
    expect(DurationText.parse("PT1M/PT2M/PT3M")).toBeUndefined()
  })

  it("tells an exact length from one that is not, writes seconds as ISO and says them as a reader does", () => {
    expect(DurationText.isExact("PT10M")).toBe(true)
    expect(DurationText.isExact("PT10M~")).toBe(false)
    expect(DurationText.isExact("PT5M/PT10M")).toBe(false)
    expect(DurationText.format(600)).toBe("PT10M")
    expect(DurationText.format(5400)).toBe("PT1H30M")
    expect(DurationText.format(45.5)).toBe("PT45.5S")
    expect(DurationText.say(45)).toBe("45 s")
    expect(DurationText.say(600)).toBe("10 min")
    expect(DurationText.say(5400)).toBe("1 h 30 min")
  })
})

describe("<rr0-duration-input>", () => {
  it("puts the mode button right after the input, before what the simulation is played at", () => {
    const { element, mode, chosen } = make()
    const order = [...element.children].filter(child => child === mode || child === chosen || child.classList.contains("duration-field"))
    expect(order.map(child => child.className)).toEqual(["duration-field", "duration-mode", "duration-chosen"])
    element.remove()
  })

  it("makes a number and a text, with ids derived from its name, precise to begin with", () => {
    const { element, number, text, mode } = make()
    expect(number.id).toBe("durationSeconds")
    expect(text.id).toBe("durationSeconds-text")
    expect(number.hidden).toBe(false)
    expect(text.hidden).toBe(true)
    expect(mode.textContent).toBe("precise")
    element.remove()
  })

  it("tells the seconds typed, with no stated text", () => {
    const { number, told } = make()
    number.value = "45"
    number.dispatchEvent(new Event("input"))
    expect(told).toEqual([{ seconds: 45, text: undefined }])
  })

  it("says a vague duration as it was stated, and tells the length chosen for the simulation, shown after it in brackets", () => {
    const { number, text, mode, chosen, told } = make()
    mode.click()
    expect(mode.textContent).toBe("EDTF")
    text.value = "PT5M/PT10M"
    text.dispatchEvent(new Event("input"))
    expect(told).toEqual([{ seconds: 450, text: "PT5M/PT10M" }])
    expect(number.value).toBe("450") // the number holds what the simulation uses
    expect(chosen.hidden).toBe(false)
    expect(chosen.textContent).toBe("(simulated: 7.5 min)".replace("7.5 min", "7 min 30 s"))
  })

  it("tells an exact duration typed as text as a plain length, with nothing stated beyond it", () => {
    const { mode, text, chosen, told } = make()
    mode.click()
    text.value = "PT10M"
    text.dispatchEvent(new Event("input"))
    expect(told).toEqual([{ seconds: 600, text: undefined }])
    expect(chosen.hidden).toBe(true)
  })

  it("starts the text as the exact length when the mode is switched, and writes nothing", () => {
    const { number, text, mode, told } = make()
    number.value = "600"
    mode.click()
    expect(text.value).toBe("PT10M")
    mode.click()
    expect(told).toEqual([])
    expect(number.value).toBe("600")
  })

  it("tells nothing of a text that does not read yet, and says so in its tooltip", () => {
    const { mode, text, told } = make()
    mode.click()
    text.value = "10 minutes"
    text.dispatchEvent(new Event("input"))
    expect(told).toEqual([])
    expect(text.title).not.toContain("→")
    text.value = "PT10M~"
    text.dispatchEvent(new Event("input"))
    expect(text.title).toBe("→ 10 min — approximate")
  })

  it("shows a recording's duration: exact in the number, or as stated in the text with the length chosen", () => {
    const { element, number, text, mode, chosen } = make()
    element.set(450, "PT5M/PT10M")
    expect(mode.textContent).toBe("EDTF")
    expect(text.value).toBe("PT5M/PT10M")
    expect(number.value).toBe("450")
    expect(chosen.hidden).toBe(false)
    element.set(30, undefined)
    expect(mode.textContent).toBe("precise")
    expect(number.value).toBe("30")
    expect(chosen.hidden).toBe(true)
  })

  it("offers a (?) in the text, which opens the syntax it takes", () => {
    const { mode, help, popup } = make()
    expect(help.hidden).toBe(true)
    mode.click()
    expect(help.hidden).toBe(false)
    help.click()
    expect(popup.hidden).toBe(false)
    expect(popup.textContent).toContain("PT5M/PT10M")
  })
})
