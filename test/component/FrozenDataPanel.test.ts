import { afterEach, describe, expect, it, vi } from "vitest"
import { FrozenDataPanel } from "../../src/component/FrozenDataPanel.js"
import { register as registerInputFile, type InputFileElement } from "../../src/component/InputFileElement.js"
import { sightingEditorMessages_fr } from "../../src/component/messages/SightingEditorMessages_fr.js"
import { Sighting } from "../../src/engine/model/Sighting.js"
import { FrozenAnnexes } from "../../src/render3d/terrain/frozen/FrozenAnnexes.js"
import type { FreezerSources } from "../../src/render3d/terrain/frozen/TerrainFreezer.js"
import type { GeoBounds } from "../../src/render3d/terrain/GeoBounds.js"

registerInputFile()

const SILLY = { lat: 49.0789, lng: 2.3273 }

function standing(at = SILLY): Sighting {
  const sighting = Sighting.create(undefined, [at])
  sighting.observerTrack.addKeyframe(0, { ...at, elevationM: 0, headingDeg: 353, pitchDeg: 1, fovDeg: 40 })
  return sighting
}

function mounted(sighting: Sighting, sources: FreezerSources) {
  const root = document.createElement("div")
  // As the editor's Files group has it (see sightingEditorTemplate).
  root.innerHTML = `<span id="label-annex-source"></span> <rr0-input-file id="annex-source" name="annex-source" no-button></rr0-input-file>
    <button id="annex-export" type="button"></button>
    <span id="frozen-state"></span> <button id="frozen-refresh" type="button"></button>
    <label><input id="frozen-live" type="checkbox"/> <span id="label-frozen-live"></span></label>
    <p id="frozen-note" hidden></p><div id="annex-editor" hidden></div>`
  document.body.appendChild(root)
  const changed = vi.fn()
  const downloads: { blob: Blob; fileName: string }[] = []
  const panel = new FrozenDataPanel(root, {
    sighting: () => sighting, documentUrl: () => "https://example.org/case/sighting.json", sources: () => sources,
    upperAirHeard: () => undefined, changed, base: () => "silly-sighting", masterUrl: () => "https://example.org/case/sighting.json", download: (blob, fileName) => downloads.push({ blob, fileName })
  })
  panel.localize(sightingEditorMessages_fr)
  return { root, panel, changed, downloads }
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

  it("takes nothing of a group asked live, says so, and drops its annex once saved so", async () => {
    const sighting = standing()
    const from = sources()
    const { root, panel, changed } = mounted(sighting, from)
    await panel.prepare("s")
    expect(sighting.frozen?.relief?.src).toBe("s.relief.zip")
    panel.setLive("relief", true)
    expect(changed).toHaveBeenCalled()
    expect(sighting.frozen?.relief).toMatchObject({ live: true, src: "s.relief.zip" })
    panel.show("relief")
    expect(root.querySelector("#frozen-state")!.textContent).toContain("demandé en direct")
    expect(panel.itemLabel("relief")).toBe("Relief")
    expect(panel.where("relief")).toContain("demandé en direct")
    const files = await panel.prepare("s")
    expect([...files.keys()]).toEqual(["s.roads.json"])
    expect(sighting.frozen?.relief).toEqual({ live: true })
    expect(from.asked).toHaveLength(1)
    // Read from its file again: taken at the next save.
    panel.setLive("relief", false)
    expect(sighting.frozen?.relief).toBeUndefined()
    await panel.prepare("s")
    expect(from.asked).toHaveLength(2)
    expect(sighting.frozen?.relief?.src).toBe("s.relief.zip")
  })

  it("reads every group but one live when the recording asked them all live", async () => {
    const sighting = standing()
    sighting.frozen = { live: true }
    const { panel } = mounted(sighting, sources())
    panel.setLive("roads", false)
    expect(sighting.frozen.live).toBeUndefined()
    expect(panel.isLive("roads")).toBe(false)
    expect(panel.isLive("relief")).toBe(true)
    await panel.prepare("s")
    expect(sighting.frozen?.roads?.src).toBe("s.roads.json")
    expect(sighting.frozen?.relief).toEqual({ live: true })
  })

  it("takes one group again on Refresh, and states the day it was taken", async () => {
    const sighting = standing()
    const from = sources()
    const { root, panel } = mounted(sighting, from)
    await panel.prepare("s")
    sighting.frozen!.relief!.takenOn = "2020-01-01"
    panel.show("relief")
    expect(root.querySelector("#frozen-state")!.textContent).toContain("relevé le 2020-01-01")
    expect(root.querySelector<InputFileElement>("#annex-source")!.url).toBe("https://example.org/case/s.relief.zip")
    ;(root.querySelector("#frozen-refresh") as HTMLButtonElement).click()
    await vi.waitFor(() => expect(from.asked).toHaveLength(2))
    await vi.waitFor(() => expect(sighting.frozen!.relief!.takenOn).toBe(new Date().toISOString().slice(0, 10)))
    expect(from.asked).toHaveLength(2)
    expect(sighting.frozen!.relief!.takenOn).toBe(new Date().toISOString().slice(0, 10))
  })

  it("keeps an annex inside the recording, as a data: URL that goes with it, and back in a file beside it", async () => {
    const sighting = standing()
    const { root, panel } = mounted(sighting, sources())
    await panel.prepare("silly-sighting")
    panel.show("roads")
    const source = root.querySelector<InputFileElement>("#annex-source")!
    expect(source.url).toBe("https://example.org/case/silly-sighting.roads.json")
    // The recording's own file given as where it is: kept inside the recording.
    source.controls.url.value = "sighting.json"
    source.controls.url.dispatchEvent(new Event("change"))
    await vi.waitFor(() => expect(sighting.frozen!.roads!.src).toMatch(/^data:application\/json;base64,/))
    expect(panel.isInlineGroup("roads")).toBe(true)
    expect(source.url).toBe("https://example.org/case/sighting.json")
    expect(panel.where("roads")).toBe(sightingEditorMessages_fr.annexStorageInline)
    // Inside the recording, it is no file of the archive; and taken again, it stays inside.
    expect([...(await panel.prepare("silly-sighting")).keys()]).toEqual(["silly-sighting.relief.zip"])
    await panel.refresh("roads")
    expect(sighting.frozen!.roads!.src).toMatch(/^data:/)
    // Another file, where there is none yet: written there at save, with what it holds.
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: false, status: 404 }) as Response))
    await panel.replace("roads", { url: "silly-sighting.roads.json" })
    vi.unstubAllGlobals()
    expect(sighting.frozen!.roads!.src).toBe("silly-sighting.roads.json")
    expect([...(await panel.prepare("silly-sighting")).keys()].sort()).toEqual(["silly-sighting.relief.zip", "silly-sighting.roads.json"])
  })

  it("takes a file of the author's as the annex, says when it was taken, and refuses one that is not an annex", async () => {
    const sighting = standing()
    const { root, panel } = mounted(sighting, sources())
    await panel.prepare("silly-sighting")
    panel.show("roads")
    const text = JSON.stringify({ version: 1, takenOn: "2019-05-04", attribution: "Somebody's roads", patches: [] })
    const input = root.querySelector<InputFileElement>("#annex-source")!.controls.file
    Object.defineProperty(input, "files", { configurable: true, value: [new File([text], "roads.json")] })
    input.dispatchEvent(new Event("change"))
    await vi.waitFor(() => expect(sighting.frozen!.roads).toEqual({ src: "silly-sighting.roads.json", takenOn: "2019-05-04", attribution: "Somebody's roads" }))
    expect(new TextDecoder().decode(await FrozenAnnexes.bytes("https://example.org/case/silly-sighting.roads.json"))).toBe(text)
    await panel.replace("roads", { file: new File(["not json"], "x.json") })
    expect(sighting.frozen!.roads!.takenOn).toBe("2019-05-04")
    expect(root.querySelector("#frozen-note")!.textContent).toBe(sightingEditorMessages_fr.annexUnreadable)
  })

  it("saves an annex under the name it has beside the recording", async () => {
    const sighting = standing()
    const { root, panel, downloads } = mounted(sighting, sources())
    await panel.prepare("silly-sighting")
    panel.show("relief")
    ;(root.querySelector("#annex-export") as HTMLButtonElement).click()
    await vi.waitFor(() => expect(downloads).toHaveLength(1))
    expect(downloads[0].fileName).toBe("silly-sighting.relief.zip")
    expect(downloads[0].blob.type).toBe("application/zip")
  })
})
