import { afterEach, describe, expect, it } from "vitest"
import type { SettingsProvider } from "../../src/component/ProviderSettingsElement.js"
import { ProviderSettingsElement, register } from "../../src/component/ProviderSettingsElement.js"

register()

const PROVIDERS: SettingsProvider[] = [
  {
    id: "p",
    label: "Provider P",
    hint: "About P",
    settings: [
      { id: "mode", label: "Mode", kind: "choice", default: "a", choices: [{ id: "a", label: "A" }, { id: "b", label: "B" }] },
      { id: "level", label: "Level", kind: "number", default: 0, min: 0, max: 10, step: 1, unit: "u" }
    ]
  }
]

describe("ProviderSettingsElement", () => {
  afterEach(() => {
    document.body.innerHTML = ""
  })

  const mount = (): ProviderSettingsElement => {
    const element = document.createElement("rr0-provider-settings") as ProviderSettingsElement
    document.body.append(element)
    element.providers = PROVIDERS
    return element
  }

  it("draws any provider's settings from its descriptors, with the unit after a number", () => {
    const element = mount()
    expect(element.querySelector(".ps-heading")!.textContent).toBe("Provider P")
    expect((element.querySelector("#p-mode") as HTMLSelectElement).options).toHaveLength(2)
    const level = element.querySelector<HTMLInputElement>("#p-level")!
    expect(level.type).toBe("number")
    expect(level.parentElement!.textContent).toMatch(/Level\s*u$/)
  })

  it("says a number in another unit beside it, in the page's language, following what is typed", () => {
    document.documentElement.lang = "fr"
    const element = document.createElement("rr0-provider-settings") as ProviderSettingsElement
    document.body.append(element)
    element.providers = [{ id: "a", label: "Alcohol", hint: "", settings: [
      { id: "level", label: "Level", kind: "number", default: 0, min: 0, max: 0.5, step: 0.01, unit: "%", also: { unit: "g/L", factor: 10, digits: 1 } }
    ] }]
    element.values = { a: { level: 0.08 } }
    expect(element.querySelector(".ps-also")!.textContent).toBe("(≈ 0,8 g/L)")
    const input = element.querySelector<HTMLInputElement>("#a-level")!
    input.value = "0.2"
    input.dispatchEvent(new Event("input", { bubbles: true }))
    expect(element.querySelector(".ps-also")!.textContent).toBe("(≈ 2,0 g/L)")
    document.documentElement.removeAttribute("lang")
  })

  it("reads in the language it is given, falling back to English per key", () => {
    const element = mount()
    element.labels = { p: "Fournisseur P", "p.mode.b": "Bé" }
    expect(element.querySelector(".ps-heading")!.textContent).toBe("Fournisseur P")
    expect(element.querySelector(".ps-heading")!.getAttribute("title")).toBe("About P")
    expect([...(element.querySelector("#p-mode") as HTMLSelectElement).options].map(option => option.text)).toEqual(["A", "Bé"])
  })

  it("tells the host by a bubbling settingschange, and shows what it is given without telling", () => {
    const element = mount()
    let changes = 0
    document.body.addEventListener("settingschange", () => changes++)
    element.values = { p: { mode: "b", level: 4 } }
    expect(changes).toBe(0)
    expect((element.querySelector("#p-mode") as HTMLSelectElement).value).toBe("b")
    const level = element.querySelector<HTMLInputElement>("#p-level")!
    level.value = "7"
    level.dispatchEvent(new Event("input", { bubbles: true }))
    expect(element.values.p.level).toBe(7)
    expect(changes).toBe(1)
    const mode = element.querySelector<HTMLSelectElement>("#p-mode")!
    mode.value = "a"
    mode.dispatchEvent(new Event("change", { bubbles: true }))
    expect(element.values.p.mode).toBe("a")
    expect(changes).toBe(2)
  })
})
