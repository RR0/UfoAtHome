import { afterEach, describe, expect, it } from "vitest"
import type { PickerNode } from "../../src/component/PopoverPickerElement.js"
import { PopoverPickerElement, register } from "../../src/component/PopoverPickerElement.js"

register()

const TREE: PickerNode[] = [
  {
    label: "Optics",
    children: [
      { label: "Binoculars", children: [{ id: "b1", label: "Old 6x30", disabledReason: "Not yet" }, { id: "b2", label: "10x42", hint: "A hint" }] },
      { id: "eye", label: "Naked eye" }
    ]
  }
]

describe("PopoverPickerElement", () => {
  afterEach(() => {
    document.body.innerHTML = ""
  })

  const mount = (): PopoverPickerElement => {
    const picker = document.createElement("rr0-popover-picker") as PopoverPickerElement
    document.body.append(picker)
    picker.choices = TREE
    return picker
  }
  const choiceOf = (picker: PopoverPickerElement, id: string) => picker.querySelector<HTMLButtonElement>(`.pp-choice[data-id="${id}"]`)!

  it("lists headings of any depth and shows the selected label on its button", () => {
    const picker = mount()
    picker.value = "eye"
    expect(picker.querySelectorAll(".pp-heading")).toHaveLength(2)
    expect(picker.querySelector(".pp-trigger")!.textContent).toBe("Naked eye")
    expect(picker.value).toBe("eye")
  })

  it("fires a bubbling change when a person picks, and nothing when the value is merely set", () => {
    const picker = mount()
    let changes = 0
    document.body.addEventListener("change", () => changes++)
    picker.value = "eye"
    expect(changes).toBe(0)
    choiceOf(picker, "b2").click()
    expect(picker.value).toBe("b2")
    expect(changes).toBe(1)
  })

  it("lists a disabled choice with its reason as title, and refuses it", () => {
    const picker = mount()
    picker.value = "eye"
    const disabled = choiceOf(picker, "b1")
    expect(disabled.getAttribute("aria-disabled")).toBe("true")
    expect(disabled.title).toBe("Not yet")
    disabled.click()
    expect(picker.value).toBe("eye")
    expect(choiceOf(picker, "b2").title).toBe("A hint")
  })

  it("keeps and shows a value the tree does not hold", () => {
    const picker = mount()
    picker.value = "gone"
    expect(picker.value).toBe("gone")
    expect(picker.querySelector(".pp-trigger")!.textContent).toBe("gone")
  })
})
