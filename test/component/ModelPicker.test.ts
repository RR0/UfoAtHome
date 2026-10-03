import { afterEach, describe, expect, it } from "vitest"
import { ModelPicker } from "../../src/component/ModelPicker.js"

describe("ModelPicker", () => {
  const container = document.createElement("div")
  document.body.append(container)
  afterEach(() => container.replaceChildren())

  function made(): { select: HTMLSelectElement; changes: string[] } {
    const select = document.createElement("select")
    const group = document.createElement("optgroup")
    group.label = "Catalogue"
    group.append(new Option("Car", "car"), new Option("Van", "van"))
    select.append(new Option("None", ""), group)
    select.value = "car"
    const label = document.createElement("label")
    label.append(select)
    container.append(label)
    new ModelPicker(container, () => ({ title: "Choose a model", close: "Close", choose: "Choose" }))
      .enhance(select, async () => undefined)
    const changes: string[] = []
    select.addEventListener("change", () => changes.push(select.value))
    return { select, changes }
  }

  it("replaces the drop-down by a button naming the model chosen", () => {
    const { select } = made()
    expect(select.hidden).toBe(true)
    expect(container.querySelector(".model-picker-button")?.textContent).toContain("Car")
  })

  it("lists every option as a card, in its group, with the chosen one marked", () => {
    made()
    container.querySelector<HTMLButtonElement>(".model-picker-button")!.click()
    const cards = [...container.querySelectorAll<HTMLElement>(".model-card")]
    expect(cards.map(card => card.querySelector(".model-name")!.textContent)).toEqual(["None", "Car", "Van"])
    expect(cards.map(card => card.getAttribute("aria-pressed"))).toEqual(["false", "true", "false"])
    expect(container.querySelector(".model-picker h3")?.textContent).toBe("Catalogue")
  })

  it("sets the select and fires its change when a card is picked, then closes", () => {
    const { select, changes } = made()
    container.querySelector<HTMLButtonElement>(".model-picker-button")!.click()
    ;[...container.querySelectorAll<HTMLElement>(".model-card")][2].click()
    expect(select.value).toBe("van")
    expect(changes).toEqual(["van"])
    expect(container.querySelector(".model-picker")).toBeNull()
  })

  it("closes on Escape without changing anything", () => {
    const { select, changes } = made()
    container.querySelector<HTMLButtonElement>(".model-picker-button")!.click()
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }))
    expect(container.querySelector(".model-picker")).toBeNull()
    expect(select.value).toBe("car")
    expect(changes).toEqual([])
  })
})
