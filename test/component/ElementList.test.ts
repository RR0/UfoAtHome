// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest"
import { ElementList } from "../../src/component/ElementList.js"

function make() {
  const header = document.createElement("div")
  const footer = document.createElement("div")
  document.body.append(header, footer)
  const calls = { select: vi.fn(), add: vi.fn(), remove: vi.fn(), look: vi.fn() }
  const list = new ElementList({
    header, footer,
    ids: { list: "things", label: "label-things", remove: "remove-thing", add: "add-thing", kinds: "thing-kind", kind: value => `option-${value}` },
    actions: [{ id: "look", glyph: "🎯", onClick: calls.look }],
    onSelect: calls.select, onAdd: calls.add, onRemove: calls.remove
  })
  list.setKinds([{ value: "a", label: "Alpha" }, { value: "b", label: "Beta" }, { value: "z", label: "Zed", hidden: true }])
  list.setLabels({ list: "Things", remove: "Remove", add: "Add", actions: { look: "Look" } })
  return { list, header, footer, calls }
}

describe("ElementList", () => {
  it("shows only the adding while there is nothing to pick, and the rest once there is", () => {
    const { list, header } = make()
    list.setItems([])
    expect(header.querySelector<HTMLElement>("#remove-thing")!.hidden).toBe(true)
    expect(header.querySelector<HTMLElement>("#things")!.closest("label")!.hidden).toBe(true)
    list.setItems([{ id: "x", label: "First" }], "x")
    expect(header.querySelector<HTMLElement>("#remove-thing")!.hidden).toBe(false)
    expect((header.querySelector("#things") as HTMLSelectElement).value).toBe("x")
  })

  it("adds the kind that is picked, and names the kinds it does not offer", () => {
    const { list, footer, calls } = make()
    const kinds = footer.querySelector<HTMLSelectElement>("#thing-kind")!
    kinds.value = "b"
    footer.querySelector<HTMLButtonElement>("#add-thing")!.click()
    expect(calls.add).toHaveBeenCalledWith("b")
    expect(footer.querySelector<HTMLOptionElement>("#option-z")!.hidden).toBe(true)
    expect(list.kindLabel("z")).toBe("Zed")
    expect(list.kindLabel("unknown")).toBe("unknown")
  })

  it("keeps the kind picked when the language changes", () => {
    const { list, footer } = make()
    const kinds = footer.querySelector<HTMLSelectElement>("#thing-kind")!
    kinds.value = "b"
    list.setKinds([{ value: "a", label: "Alfa" }, { value: "b", label: "Bêta" }])
    expect(kinds.value).toBe("b")
    expect(kinds.selectedOptions[0].textContent).toBe("Bêta")
  })

  it("reports a pick, a removal and an action, and renames an entry in place", () => {
    const { list, header, calls } = make()
    list.setItems([{ id: "x", label: "First" }, { id: "y", label: "Second" }], "x")
    const select = header.querySelector<HTMLSelectElement>("#things")!
    select.value = "y"
    select.dispatchEvent(new Event("change"))
    expect(calls.select).toHaveBeenCalledWith("y")
    header.querySelector<HTMLButtonElement>("#remove-thing")!.click()
    header.querySelector<HTMLButtonElement>("#look")!.click()
    expect(calls.remove).toHaveBeenCalled()
    expect(calls.look).toHaveBeenCalled()
    list.rename("y", "Renamed")
    expect(select.options[1].textContent).toBe("Renamed")
    expect(header.querySelector("#look")!.getAttribute("aria-label")).toBe("Look")
  })

  it("stays on show as a choice of none when it is optional, disabling what acts on the picked one until one is", () => {
    const header = document.createElement("div")
    const list = new ElementList({
      header, footer: header, optional: true,
      ids: { list: "clouds", remove: "remove-cloud", add: "add-cloud" },
      actions: [{ id: "point", glyph: "🎯", onClick: () => undefined }],
      onSelect: () => undefined, onAdd: () => undefined, onRemove: () => undefined
    })
    list.setLabels({ list: "Cloud", remove: "Remove", add: "Add", none: "None", actions: { point: "Point" } })
    list.setItems([], "")
    const select = header.querySelector<HTMLSelectElement>("#clouds")!
    expect([...select.options].map(option => option.textContent)).toEqual(["None"])
    expect(select.closest("label")!.hidden).toBe(false)
    expect(header.querySelector<HTMLButtonElement>("#remove-cloud")!.disabled).toBe(true)
    list.setItems([{ id: "c1", label: "Cloud 1" }], "c1")
    expect(list.value).toBe("c1")
    expect(header.querySelector<HTMLButtonElement>("#remove-cloud")!.disabled).toBe(false)
    expect(header.querySelector<HTMLButtonElement>("#point")!.disabled).toBe(false)
    list.show("")
    expect(header.querySelector<HTMLButtonElement>("#remove-cloud")!.disabled).toBe(true)
    list.show("c1")
    expect(header.querySelector<HTMLButtonElement>("#remove-cloud")!.disabled).toBe(false)
  })

  it("says whether adding is possible, and where the new element will start", () => {
    const { list, footer } = make()
    const add = footer.querySelector<HTMLButtonElement>("#add-thing")!
    list.setAddState(false)
    expect(add.disabled).toBe(true)
    list.setAddState(true, "Add one where the shape is")
    expect(add.disabled).toBe(false)
    expect(add.title).toBe("Add one where the shape is")
    list.setAddState(true)
    expect(add.title).toBe("Add")
  })

  it("steps through its elements with buttons and Alt and the arrows inside its scope, and not once it has been replaced", () => {
    const scope = document.createElement("div")
    document.body.append(scope)
    const steps: number[] = []
    const build = () => {
      const header = document.createElement("div")
      scope.replaceChildren(header)
      const list = new ElementList({
        header, footer: header, ids: { list: "steps", remove: "remove-step", add: "add-step" },
        navigation: { scope, onStep: direction => steps.push(direction) },
        onSelect: () => undefined, onAdd: () => undefined, onRemove: () => undefined
      })
      list.setLabels({ list: "Step", remove: "Remove", add: "Add", previous: "Before", next: "After" })
      list.setItems([{ id: "a", label: "A" }, { id: "b", label: "B" }], "a")
      list.setStepState(true, true)
      return { list, header }
    }
    build()
    const { header } = build()
    expect(header.querySelector("#steps-previous")!.getAttribute("title")).toBe("Before (Alt+↑)")
    header.querySelector<HTMLButtonElement>("#steps-next")!.click()
    expect(steps).toEqual([1])
    scope.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", altKey: true, bubbles: true, cancelable: true }))
    // The list that was replaced no longer answers: one step, not two.
    expect(steps).toEqual([1, 1])
    scope.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true, cancelable: true }))
    expect(steps).toEqual([1, 1])
  })
})
