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
    new ModelPicker(container, () => ({ title: "Choose a model", close: "Close", choose: "Choose", address: "Address", addressUrl: "Url", addressName: "Name", addressAuthor: "Author", addressLicense: "Licence", addressSource: "Source", addressUse: "Use", addressIncomplete: "Incomplete" }))
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

  describe("a model at an address", () => {
    function withAddress(current?: { url: string, title: string, author: string, license: string, source: string }) {
      const select = document.createElement("select")
      select.append(new Option("None", ""), new Option("Car", "car"))
      const label = document.createElement("label")
      label.append(select)
      container.append(label)
      const applied: unknown[] = []
      new ModelPicker(container, () => ({ title: "Choose", close: "Close", choose: "Choose", address: "Address", addressUrl: "Url", addressName: "Name", addressAuthor: "Author", addressLicense: "Licence", addressSource: "Source", addressUse: "Use", addressIncomplete: "Incomplete" }))
        .enhance(select, async () => undefined, { current: () => current, apply: address => applied.push(address) })
      container.querySelector<HTMLButtonElement>(".model-picker-button")!.click()
      return applied
    }

    it("keeps the form out of sight until the + is pressed", () => {
      withAddress()
      expect(container.querySelector<HTMLElement>(".model-picker-address")!.hidden).toBe(true)
      container.querySelector<HTMLButtonElement>(".model-picker-add")!.click()
      expect(container.querySelector<HTMLElement>(".model-picker-address")!.hidden).toBe(false)
    })

    it("gives the address and its credit, and says the model is not drawn until named and licensed", () => {
      const applied = withAddress()
      container.querySelector<HTMLButtonElement>(".model-picker-add")!.click()
      const [url, title, , license] = [...container.querySelectorAll<HTMLInputElement>(".model-picker-address input")]
      const note = container.querySelector<HTMLElement>(".model-picker-address p")!
      expect(container.querySelector<HTMLButtonElement>(".model-picker-use")!.disabled).toBe(true)
      url.value = "https://x/m.glb"
      url.dispatchEvent(new Event("input"))
      expect(note.hidden).toBe(false)
      title.value = "Mine"
      license.value = "CC0 1.0"
      title.dispatchEvent(new Event("input"))
      expect(note.hidden).toBe(true)
      container.querySelector<HTMLButtonElement>(".model-picker-address")!.dispatchEvent(new Event("submit", { cancelable: true }))
      expect(applied).toEqual([{ url: "https://x/m.glb", title: "Mine", author: "", license: "CC0 1.0", source: "" }])
      expect(container.querySelector(".model-picker")).toBeNull()
    })

    it("shows the model it has at an address as the card chosen, and fills the form with it", () => {
      withAddress({ url: "https://x/m.glb", title: "Mine", author: "Me", license: "CC0 1.0", source: "" })
      const cards = [...container.querySelectorAll<HTMLElement>(".model-card")]
      expect(cards[0].querySelector(".model-name")!.textContent).toBe("Mine")
      expect(cards.map(card => card.getAttribute("aria-pressed"))).toEqual(["true", "false", "false"])
      container.querySelector<HTMLButtonElement>(".model-picker-add")!.click()
      expect(container.querySelector<HTMLInputElement>(".model-picker-address input")!.value).toBe("https://x/m.glb")
    })
  })
})
