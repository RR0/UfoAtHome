import { afterEach, describe, expect, test } from "vitest"
import { ParameterForm, ParameterTarget } from "../../src/component/ParameterForm.js"
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

  describe("what a decor object needs of it", () => {
    const building: ParameterSet = {
      kind: "building",
      title: "Building",
      parameters: [
        { type: "number", key: "floors", label: "Floors", min: 0, max: 20, step: 1, effective: () => 2 },
        { type: "number", key: "occupiedFloor", label: "Occupied", min: 0, max: 20, step: 1,
          bounds: element => ({ max: (Parameters.read(element, "floors") as number | undefined) ?? 2 }) },
        { type: "number", key: "windows.front", label: "Front", min: 90, max: 100, step: 5, unit: "%", group: "Windows" },
        { type: "text", key: "note", label: "Note", group: "Windows", visibleWhen: element => Parameters.read(element, "floors") !== undefined }
      ]
    }

    test("the fields carry an id of their own, so that something outside the form can reach one", () => {
      const form = new ParameterForm(container, "en", "decorParam.")
      form.show(building, {}, () => undefined)
      expect(container.querySelector("#decorParam\\.windows\\.front")).not.toBeNull()
    })

    test("a bound that depends on the element follows it, and what is written is held to it", () => {
      const element: Record<string, unknown> = {}
      new ParameterForm(container, "en").show(building, element, () => undefined)
      const occupied = container.querySelector<HTMLInputElement>('[data-key="occupiedFloor"]')!
      expect(occupied.max).toBe("2")
      typed(container.querySelector('[data-key="floors"]')!, "6")
      expect(occupied.max).toBe("6")
      typed(occupied, "9")
      expect(element.occupiedFloor).toBe(6)
    })

    test("a value is written no lower than the field takes, whatever is on its way through the field", () => {
      const element: Record<string, unknown> = {}
      new ParameterForm(container, "en").show(building, element, () => undefined)
      typed(container.querySelector('[data-key="windows.front"]')!, "5")
      expect((element.windows as { front: number }).front).toBe(90)
    })

    test("a field that does not apply is not drawn, and its group goes when none of its fields applies", () => {
      const element: Record<string, unknown> = {}
      new ParameterForm(container, "en").show(building, element, () => undefined)
      const note = container.querySelector('[data-key="note"]')!.closest("label")!
      expect(note.hidden).toBe(true)
      typed(container.querySelector('[data-key="floors"]')!, "3")
      expect(note.hidden).toBe(false)
    })

    test("an element replaced at every edit is read again each time, and never written over from an earlier copy", () => {
      let current: Record<string, unknown> = { id: "a", floors: 1 }
      const target = new ParameterTarget(() => current, apply => {
        const draft = structuredClone(current)
        apply(draft)
        current = draft
      })
      new ParameterForm(container, "en").show(building, target, () => undefined)
      const before = current
      // Something else edits the object meanwhile, as another field of the editor does.
      current = { ...current, headingDeg: 40 }
      typed(container.querySelector('[data-key="floors"]')!, "4")
      expect(current).toEqual({ id: "a", floors: 4, headingDeg: 40 })
      expect(current).not.toBe(before)
      expect(before).toEqual({ id: "a", floors: 1 })
    })

    test("clear empties the form", () => {
      const form = new ParameterForm(container, "en")
      form.show(building, {}, () => undefined)
      form.clear()
      expect(container.children).toHaveLength(0)
    })
  })
})
