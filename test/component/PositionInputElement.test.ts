import { describe, expect, it } from "vitest"
import { register } from "../../src/component/PositionInputElement.js"
import type { PositionChange, PositionInputElement } from "../../src/component/PositionInputElement.js"
import { SaidPositions } from "../../src/engine/model/SaidPosition.js"
import type { PositionFrame } from "../../src/engine/model/SaidPosition.js"

register()

const FRAME: PositionFrame = {
  origin: { lat: 44, lng: 5 },
  references: [{ label: "the observer", eastM: 0, northM: 0 }, { id: "house", label: "House", eastM: 100, northM: 50 }]
}

const make = (native?: "geo") => {
  const told: PositionChange[] = []
  const bases: unknown[] = []
  const element = document.createElement("rr0-input-position") as PositionInputElement
  element.setAttribute("name", "decor")
  if (native) element.setAttribute("native", native)
  element.addEventListener("positionchange", event => told.push((event as CustomEvent<PositionChange>).detail))
  element.addEventListener("basischange", event => bases.push((event as CustomEvent).detail.basis))
  document.body.appendChild(element)
  element.frame = FRAME
  const mode = element.querySelector("button.position-mode") as HTMLButtonElement
  const from = element.querySelector("#decor-from") as HTMLSelectElement
  const type = (field: HTMLInputElement, value: string) => {
    field.value = value
    field.dispatchEvent(new Event("input"))
  }
  return { element, told, bases, mode, from, type }
}

describe("SaidPositions", () => {
  it("resolves a position said from a reference or as degrees, and says it again from where it now is", () => {
    expect(SaidPositions.resolve({ relativeTo: "house", eastM: 20, northM: 0 }, FRAME)).toEqual({ eastM: 120, northM: 50 })
    expect(SaidPositions.resolve({ eastM: 3, northM: 4 }, FRAME)).toEqual({ eastM: 3, northM: 4 })
    expect(SaidPositions.resolve({ relativeTo: "gone", eastM: 3, northM: 4 }, FRAME)).toBeUndefined()
    const north = SaidPositions.resolve({ lat: 44.001, lng: 5 }, FRAME)!
    expect(north.eastM).toBeCloseTo(0, 6)
    expect(north.northM).toBeCloseTo(111.32, 2)
    expect(SaidPositions.restated({ relativeTo: "house", eastM: 20, northM: 0 }, { eastM: 90, northM: 60 }, FRAME)).toEqual({ relativeTo: "house", eastM: -10, northM: 10 })
    expect(SaidPositions.restated({ lat: 0, lng: 0 }, { eastM: 0, northM: 111.32 }, FRAME)).toEqual({ lat: 44.001, lng: 5 })
  })
})

describe("PositionInputElement", () => {
  it("shows metres from the observer by default and tells what is typed, from the reference picked", () => {
    const { element, told, mode, from, type } = make()
    element.value = { eastM: 120, northM: 50 }
    expect(mode.textContent).toBe("relative")
    expect(element.eastInput.value).toBe("120")
    from.value = "house"
    from.dispatchEvent(new Event("input"))
    expect(element.eastInput.value).toBe("20")
    expect(element.northInput.value).toBe("0")
    expect(told.at(-1)).toEqual({ value: { eastM: 120, northM: 50 }, said: { relativeTo: "house", eastM: 20, northM: 0 } })
    type(element.northInput, "-10")
    expect(told.at(-1)).toEqual({ value: { eastM: 120, northM: 40 }, said: { relativeTo: "house", eastM: 20, northM: -10 } })
    type(element.northInput, "-")
    expect(told).toHaveLength(2)
  })

  it("switches to degrees, converting and writing nothing, and tells a latitude typed as metres", () => {
    const { element, told, mode, type } = make()
    element.value = { eastM: 0, northM: 111.32 }
    mode.click()
    expect(mode.textContent).toBe("absolute")
    expect(element.latInput.value).toBe("44.001")
    expect(element.lngInput.value).toBe("5")
    expect(told).toHaveLength(0)
    type(element.latInput, "44.002")
    const value = told.at(-1)!.value as { eastM: number, northM: number }
    expect(value.northM).toBeCloseTo(222.64, 2)
    expect(told.at(-1)!.said).toEqual({ lat: 44.002, lng: 5 })
    mode.click()
    type(element.eastInput, "3")
    expect(told.at(-1)!.said).toBeUndefined()
  })

  it("says an observer from nothing when there is nothing", () => {
    const { element, mode } = make("geo")
    element.frame = { origin: { lat: 44, lng: 5 }, references: [] }
    expect(mode.disabled).toBe(true)
    expect(mode.textContent).toBe("absolute")
  })

  it("keeps a recording with no place in metres", () => {
    const { element, mode } = make()
    element.frame = { references: [] }
    mode.click()
    expect(mode.disabled).toBe(true)
    expect(mode.textContent).toBe("relative")
  })

  it("shows how it was said, and says an observer in degrees from a house", () => {
    const { element, told, mode, type } = make("geo")
    element.value = { lat: 44, lng: 5 }
    expect(mode.textContent).toBe("absolute")
    element.said = { relativeTo: "house", eastM: -100, northM: -50 }
    expect(mode.textContent).toBe("relative")
    expect(element.eastInput.value).toBe("-100")
    type(element.eastInput, "-90")
    const value = told.at(-1)!.value as { lat: number, lng: number }
    expect(value.lat).toBeCloseTo(44, 7)
    expect(SaidPositions.toLocal(value, FRAME.origin!).eastM).toBeCloseTo(10, 6)
    expect(told.at(-1)!.said).toEqual({ relativeTo: "house", eastM: -90, northM: -50 })
  })

  it("says what the position stands on", () => {
    const { element, bases } = make()
    const basis = element.querySelector("#decor-basis") as HTMLSelectElement
    element.basis = "measured"
    expect(basis.value).toBe("measured")
    basis.value = "assumed"
    basis.dispatchEvent(new Event("input"))
    expect(bases).toEqual(["assumed"])
    expect(element.basis).toBe("assumed")
  })
})

describe("a position in a ParameterForm", () => {
  it("writes the place kept and how it was said, and the basis where the host keeps it", async () => {
    const { ParameterForm, ParameterTarget } = await import("../../src/component/ParameterForm.js")
    const { positionInputMessages_en } = await import("../../src/component/PositionInputElement.js")
    const container = document.createElement("div")
    document.body.append(container)
    const element: Record<string, unknown> = { eastM: 120, northM: 50 }
    const bases: unknown[] = []
    const form = new ParameterForm(container, "en", "decorBase.")
    form.show({
      kind: "test", title: { en: "Test" },
      parameters: [{ type: "position", key: "eastM", secondKey: "northM", saidKey: "saidPosition", native: "local", label: { en: "Position" } }]
    }, new ParameterTarget(() => element, apply => apply(element), undefined, {
      frame: () => FRAME, messages: () => positionInputMessages_en,
      basis: { read: () => "measured", write: (_spec, basis) => bases.push(basis) }
    }), () => undefined)
    const east = container.querySelector("#decorBase\\.eastM") as HTMLInputElement
    expect(east.value).toBe("120")
    expect((container.querySelector(".position-basis") as HTMLSelectElement).value).toBe("measured")
    const from = container.querySelector("select[id$='-from']") as HTMLSelectElement
    from.value = "house"
    from.dispatchEvent(new Event("input"))
    east.value = "30"
    east.dispatchEvent(new Event("input"))
    expect(element).toEqual({ eastM: 130, northM: 50, saidPosition: { relativeTo: "house", eastM: 30, northM: 0 } })
    const basis = container.querySelector(".position-basis") as HTMLSelectElement
    basis.value = "assumed"
    basis.dispatchEvent(new Event("input"))
    expect(bases).toEqual(["assumed"])
  })
})
