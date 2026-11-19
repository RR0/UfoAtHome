import { beforeEach, describe, expect, test, vi } from "vitest"
import { AroundPanel } from "../../src/component/AroundPanel.js"
import { aroundMessages_en } from "../../src/component/messages/AroundMessages_en.js"
import { fromSightingJson } from "../../src/engine/persistence/sightingJson.js"
import type { Sighting } from "../../src/engine/model/Sighting.js"

const BASIS = { title: "Basis", basis: { stated: "stated", measured: "measured", derived: "derived", assumed: "assumed", established: "established", fitted: "fitted" }, basisField: "b", howField: "h", rationaleField: "r" } as never

describe("AroundPanel", () => {
  let sighting: Sighting
  let root: HTMLElement
  let changed: ReturnType<typeof vi.fn>
  let panel: AroundPanel

  beforeEach(() => {
    sighting = fromSightingJson({ version: 4, timeline: { keyframes: [] } })
    document.body.innerHTML = `<div id="around"><h3 class="section-title"></h3><div class="around-body"></div></div>`
    root = document.getElementById("around")!
    changed = vi.fn()
    panel = new AroundPanel(root, { sighting: () => sighting, editing: () => {}, changed })
    panel.localize(aroundMessages_en, BASIS)
  })

  const field = (path: string) => root.querySelector<HTMLInputElement>(`input[data-path="${path}"]`)!
  const type = (path: string, value: string) => {
    const input = field(path)
    input.value = value
    input.dispatchEvent(new Event("input"))
  }

  test("says a quiet place when nothing is said, and shows a field for every count, blank", () => {
    expect(root.querySelector(".around-heard")!.textContent).toBe(aroundMessages_en.quiet)
    for (const key of ["cars", "trucks", "people", "talking", "withinM"]) expect(field(`around.${key}`).value).toBe("")
    expect(field("around.withinM").placeholder).toBe("200")
  })

  test("a count typed is the recording's, and what it sounds like is said at once", () => {
    type("around.cars", "6")
    expect(sighting.around).toEqual({ cars: 6 })
    expect(changed).toHaveBeenCalled()
    expect(root.querySelector(".around-heard")!.textContent).toBe("61 dB(A) where the observer stands")
    // Blanked, it says nothing again, and the recording with it.
    type("around.cars", "")
    expect(sighting.around).toBeUndefined()
  })

  test("adds a road, edits it, and removes it, what the later roads rest on going with them", () => {
    const add = () => root.querySelector<HTMLButtonElement>(".around-add-road")!.click()
    add()
    add()
    expect(sighting.around?.roads).toHaveLength(2)
    type("around.roads.1.distanceM", "120")
    expect(sighting.around?.roads?.[1].distanceM).toBe(120)
    sighting.provenance.set("around.roads.1.distanceM", { basis: "assumed" })
    root.querySelectorAll<HTMLButtonElement>(".around-remove-road")[0].click()
    expect(sighting.around?.roads).toEqual([{ distanceM: 120, vehiclesPerMinute: 5 }])
    expect(sighting.provenance.at("around.roads.0.distanceM")?.basis).toBe("assumed")
    expect(sighting.provenance.at("around.roads.1.distanceM")).toBeUndefined()
  })

  test("a road's distance and flow are what it is: blanked, they are not taken from it", () => {
    root.querySelector<HTMLButtonElement>(".around-add-road")!.click()
    type("around.roads.0.vehiclesPerMinute", "")
    expect(sighting.around?.roads?.[0].vehiclesPerMinute).toBe(5)
  })
})
