import { afterEach, describe, expect, test } from "vitest"
import { ParameterForm } from "../../src/component/ParameterForm.js"
import { Parameters } from "../../src/engine/interpretation/Parameters.js"
import type { ParameterSet } from "../../src/engine/interpretation/Parameters.js"

/** A kind this editor has never heard of: the form must draw it from its description alone. */
const lamp: ParameterSet = {
  kind: "lamp",
  title: { en: "Lamp", fr: "Lampe" },
  parameters: [
    { type: "text", key: "name", label: { en: "Name", fr: "Nom" }, group: { en: "Identity", fr: "Identité" } },
    { type: "number", key: "light.watts", label: { en: "Power", fr: "Puissance" }, min: 1, max: 500, step: 1, unit: "W", group: { en: "Light" },
      hint: { en: "What it draws" } },
    { type: "number", key: "light.lumens", label: { en: "Output" }, min: 1, max: 9999, step: 1, unit: "lm", group: { en: "Light" },
      effective: element => {
        const watts = Parameters.read(element, "light.watts") as number | undefined
        return watts === undefined ? 800 : watts * 10
      } },
    { type: "choice", key: "light.tone", label: { en: "Tone" }, group: { en: "Light" },
      choices: [{ value: "warm", label: { en: "Warm", fr: "Chaud" } }, { value: "cold", label: { en: "Cold" } }], effective: () => "warm" },
    { type: "boolean", key: "light.dimmable", label: { en: "Dimmable" }, group: { en: "Light" } },
    { type: "colour", key: "shade", label: { en: "Shade" }, group: { en: "Look" } }
  ]
}

const typed = (field: Element, value: string): void => {
  const input = field as HTMLInputElement | HTMLSelectElement
  input.value = value
  input.dispatchEvent(new Event("input", { bubbles: true }))
}

describe("ParameterForm", () => {
  const container = document.createElement("div")
  document.body.append(container)
  afterEach(() => container.replaceChildren())

  const build = (element: Record<string, unknown> = {}, language = "en") => {
    const form = new ParameterForm(container, language)
    let changes = 0
    form.show(lamp, element, () => changes++)
    return { form, element, changes: () => changes }
  }

  test("draws a field per parameter, grouped under their headings in order of appearance", () => {
    build()
    expect([...container.querySelectorAll("legend")].map(legend => legend.textContent)).toEqual(["Identity", "Light", "Look"])
    expect(container.querySelectorAll("[data-key]")).toHaveLength(6)
  })

  test("a number field takes what its bounds allow, and its unit stands after it", () => {
    build()
    const field = container.querySelector<HTMLInputElement>('[data-key="light.watts"]')!
    expect([field.type, field.min, field.max, field.step]).toEqual(["number", "1", "500", "1"])
    const label = field.closest("label")!
    expect(label.textContent!.trim().startsWith("Power")).toBe(true)
    expect(label.textContent!.trim().endsWith("W")).toBe(true)
    expect(label.title).toBe("What it draws")
  })

  test("writes what is typed onto the element, as it is typed, and says so", () => {
    const { element, changes } = build()
    typed(container.querySelector('[data-key="light.watts"]')!, "60")
    expect(element).toEqual({ light: { watts: 60 } })
    expect(changes()).toBe(1)
    typed(container.querySelector('[data-key="name"]')!, "Hall")
    expect(element).toEqual({ light: { watts: 60 }, name: "Hall" })
  })

  test("an empty field shows what is in force, and what one value implies for another follows at once", () => {
    build()
    const output = container.querySelector<HTMLInputElement>('[data-key="light.lumens"]')!
    expect(output.placeholder).toBe("800")
    typed(container.querySelector('[data-key="light.watts"]')!, "60")
    expect(output.placeholder).toBe("600")
    expect(output.value).toBe("")
  })

  test("clearing a field goes back to what is in force, and leaves nothing behind", () => {
    const { element } = build()
    const watts = container.querySelector<HTMLInputElement>('[data-key="light.watts"]')!
    typed(watts, "60")
    typed(watts, "")
    expect(element).toEqual({})
  })

  test("a half-typed number writes nothing until it is one", () => {
    const { element } = build()
    typed(container.querySelector('[data-key="light.watts"]')!, "-")
    expect(element).toEqual({})
  })

  test("a choice names what is in force in its empty option, and writes the one picked", () => {
    const { element } = build()
    const select = container.querySelector<HTMLSelectElement>('[data-key="light.tone"]')!
    expect(select.options[0].textContent).toBe("Warm")
    typed(select, "cold")
    expect(element).toEqual({ light: { tone: "cold" } })
    typed(select, "")
    expect(element).toEqual({})
  })

  test("a checkbox and a colour write what they hold", () => {
    const { element } = build()
    const check = container.querySelector<HTMLInputElement>('[data-key="light.dimmable"]')!
    check.checked = true
    check.dispatchEvent(new Event("input", { bubbles: true }))
    typed(container.querySelector('[data-key="shade"]')!, "#ff0000")
    expect(element).toEqual({ light: { dimmable: true }, shade: "#ff0000" })
  })

  test("shows what the element states, and reads a value stated with its provenance", () => {
    build({ name: "Porch", light: { watts: { value: 40, basis: "stated" } } })
    expect(container.querySelector<HTMLInputElement>('[data-key="name"]')!.value).toBe("Porch")
    expect(container.querySelector<HTMLInputElement>('[data-key="light.watts"]')!.value).toBe("40")
    expect(container.querySelector<HTMLInputElement>('[data-key="light.lumens"]')!.placeholder).toBe("400")
  })

  test("speaks the language of the editor, and English where the description lacks it", () => {
    build({}, "fr")
    expect([...container.querySelectorAll("legend")].map(legend => legend.textContent)).toEqual(["Identité", "Light", "Look"])
    expect(container.querySelector('[data-key="name"]')!.closest("label")!.textContent).toContain("Nom")
    expect(container.querySelector('[data-key="light.lumens"]')!.closest("label")!.textContent).toContain("Output")
  })

  test("leaves a field being typed in alone when the others are re-shown", () => {
    const { form } = build({ light: { watts: 60 } })
    const watts = container.querySelector<HTMLInputElement>('[data-key="light.watts"]')!
    watts.focus()
    watts.value = "7"
    form.sync()
    expect(watts.value).toBe("7")
  })
})
