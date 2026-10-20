import { afterEach, describe, expect, it, vi } from "vitest"
import { FrozenDataPanel } from "../../src/component/FrozenDataPanel.js"
import { sightingEditorMessages_fr } from "../../src/component/messages/SightingEditorMessages_fr.js"
import { Sighting } from "../../src/engine/model/Sighting.js"
import { FrozenAnnexes } from "../../src/render3d/terrain/frozen/FrozenAnnexes.js"
import type { FreezerSources } from "../../src/render3d/terrain/frozen/TerrainFreezer.js"
import type { GeoBounds } from "../../src/render3d/terrain/GeoBounds.js"

const SILLY = { lat: 49.0789, lng: 2.3273 }

function standing(at = SILLY): Sighting {
  const sighting = Sighting.create(undefined, [at])
  sighting.observerTrack.addKeyframe(0, { ...at, elevationM: 0, headingDeg: 353, pitchDeg: 1, fovDeg: 40 })
  return sighting
}

function mounted(sighting: Sighting, sources: FreezerSources) {
  const root = document.createElement("fieldset")
  root.innerHTML = `<legend id="label-frozen"></legend><label><input id="frozen-live" type="checkbox"/> <span id="label-frozen-live"></span></label>
    <ul id="frozen-groups"></ul><p id="frozen-note" hidden></p>`
  document.body.appendChild(root)
  const changed = vi.fn()
  const panel = new FrozenDataPanel(root, {
    sighting: () => sighting, documentUrl: () => "https://example.org/case/sighting.json", sources: () => sources,
    upperAirHeard: () => undefined, changed
  })
  panel.localize(sightingEditorMessages_fr)
  return { root, panel, changed }
}

function sources(): FreezerSources & { asked: GeoBounds[] } {
  const asked: GeoBounds[] = []
  return {
    asked,
    elevation: {
      getElevationGrid: vi.fn(async (bounds: GeoBounds) => {
        asked.push(bounds)
        return { heights: new Float32Array(9).fill(80), width: 3, height: 3, bounds }
      })
    },
    elevationCredit: "Relief © IGN",
    imagery: "esri-world",
    roads: { attribution: "BD TOPO", contemporary: true, getRoads: vi.fn(async () => []) }
  }
}

afterEach(() => {
  FrozenAnnexes.release()
  document.body.replaceChildren()
})

describe("FrozenDataPanel", () => {
  it("takes the ground at export, names the annexes after the recording, and carries them", async () => {
    const sighting = standing()
    const from = sources()
    const { panel } = mounted(sighting, from)
    expect(panel.hasWork()).toBe(true)
    const files = await panel.prepare("silly-sighting")
    expect(sighting.frozen?.relief).toMatchObject({ src: "silly-sighting.relief.zip", attribution: "Relief © IGN" })
    expect(sighting.frozen?.roads?.src).toBe("silly-sighting.roads.json")
    // No canvas here: the photograph could not be taken, and the recording says nothing of it.
    expect(sighting.frozen?.imagery).toBeUndefined()
    expect([...files.keys()].sort()).toEqual(["silly-sighting.relief.zip", "silly-sighting.roads.json"])
    expect(from.asked).toHaveLength(1)
  })

  it("takes nothing again for the same ground, and takes it again once the place has moved", async () => {
    const sighting = standing()
    const from = sources()
    const { panel } = mounted(sighting, from)
    await panel.prepare("s")
    await panel.prepare("s")
    expect(from.asked).toHaveLength(1)
    sighting.observerTrack.addKeyframe(0, { lat: SILLY.lat + 0.01, lng: SILLY.lng, elevationM: 0, headingDeg: 0, pitchDeg: 0, fovDeg: 40 })
    await panel.prepare("s")
    expect(from.asked).toHaveLength(2)
  })

  it("takes nothing when everything is to be asked live, and says so", async () => {
    const sighting = standing()
    const from = sources()
    const { root, panel, changed } = mounted(sighting, from)
    const live = root.querySelector<HTMLInputElement>("#frozen-live")!
    live.checked = true
    live.dispatchEvent(new Event("change"))
    expect(sighting.frozen).toEqual({ live: true })
    expect(changed).toHaveBeenCalled()
    expect(await panel.prepare("s")).toEqual(new Map())
    expect(from.asked).toHaveLength(0)
    expect(root.querySelector("#frozen-groups")!.textContent).toContain("demandé en direct")
  })

  it("takes one group again on Refresh, and states the day it was taken", async () => {
    const sighting = standing()
    const from = sources()
    const { root, panel } = mounted(sighting, from)
    await panel.prepare("s")
    sighting.frozen!.relief!.takenOn = "2020-01-01"
    panel.render()
    const reliefRow = root.querySelectorAll("#frozen-groups li")[0]
    expect(reliefRow.textContent).toContain("relevé le 2020-01-01")
    await panel.refresh("relief")
    expect(from.asked).toHaveLength(2)
    expect(sighting.frozen!.relief!.takenOn).toBe(new Date().toISOString().slice(0, 10))
  })
})
