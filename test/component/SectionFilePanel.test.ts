import { afterEach, describe, expect, it, vi } from "vitest"
import { SectionFilePanel } from "../../src/component/SectionFilePanel.js"
import { register as registerInputFile, type InputFileElement } from "../../src/component/InputFileElement.js"
import { sightingEditorMessages_en } from "../../src/component/messages/SightingEditorMessages_en.js"
import { Sighting } from "../../src/engine/model/Sighting.js"
import { DEFAULT_WEATHER } from "../../src/engine/model/Weather.js"

registerInputFile()

function mounted(sighting: Sighting) {
  const root = document.createElement("div")
  // As the editor's Files group has it (see sightingEditorTemplate).
  root.innerHTML = `<span id="label-section-annex-source"></span> <rr0-input-file id="section-annex-source" name="section-annex-source" no-button></rr0-input-file>
    <button id="section-annex-export" type="button"></button>
    <p id="section-annex-state"></p><p id="section-annex-note" hidden></p>`
  document.body.appendChild(root)
  const changed = vi.fn()
  const downloads: { blob: Blob; fileName: string }[] = []
  const panel = new SectionFilePanel(root, {
    sighting: () => sighting, documentUrl: () => "https://example.org/d/x.json", base: () => "x-sighting", masterUrl: () => "https://example.org/d/x.json",
    download: (blob: Blob, fileName: string) => downloads.push({ blob, fileName }), changed
  })
  panel.localize(sightingEditorMessages_en)
  return { root, panel, changed, downloads }
}

afterEach(() => {
  document.body.replaceChildren()
  vi.unstubAllGlobals()
})

describe("SectionFilePanel", () => {
  it("keeps the weather inside the recording until it is kept beside it, and writes its annex then", async () => {
    const sighting = Sighting.create()
    sighting.weatherTrack.addKeyframe(0, { ...DEFAULT_WEATHER, cloudCover: 0.3 })
    const { root, panel, changed } = mounted(sighting)
    panel.show("weather")
    expect(panel.annex("weather")).toBeUndefined()
    const source = root.querySelector<InputFileElement>("#section-annex-source")!
    expect(panel.isInline("weather")).toBe(true)
    expect(source.url).toBe("https://example.org/d/x.json")
    expect(panel.itemLabel("weather")).toBe("Weather")
    panel.setStorage("weather", false)
    expect(changed).toHaveBeenCalledWith("weather")
    expect(sighting.frozen?.weather).toEqual({ src: "x-sighting.weather.json" })
    const annex = panel.annex("weather")!
    expect(annex.src).toBe("x-sighting.weather.json")
    expect(JSON.parse(new TextDecoder().decode(annex.bytes)).weatherTrack.keyframes[0].weather.cloudCover).toBe(0.3)
    expect(source.url).toBe("https://example.org/d/x-sighting.weather.json")
    // The recording's own file given as where it is: kept inside the recording again.
    await panel.take("weather", { url: "x.json" })
    expect(sighting.frozen).toBeUndefined()
  })

  it("takes the weather of a file the author picks, and refuses one with none", async () => {
    const sighting = Sighting.create()
    const { root, panel } = mounted(sighting)
    panel.show("weather")
    const weatherTrack = { keyframes: [{ t: 0, weather: { ...DEFAULT_WEATHER, cloudCover: 0.8 } }] }
    const input = root.querySelector<InputFileElement>("#section-annex-source")!.controls.file
    Object.defineProperty(input, "files", { configurable: true, value: [new File([JSON.stringify({ version: 1, weatherTrack })], "w.json")] })
    input.dispatchEvent(new Event("change"))
    await vi.waitFor(() => expect(sighting.weatherTrack.allKeyframes[0]?.weather.cloudCover).toBe(0.8))
    await panel.take("weather", { file: new File(["{}"], "none.json") })
    expect(root.querySelector("#section-annex-note")!.textContent).toBe(sightingEditorMessages_en.annexUnreadable)
    expect(sighting.weatherTrack.allKeyframes[0].weather.cloudCover).toBe(0.8)
  })

  it("takes the place and the night sky of a file, with what they say of where they came from, and reads them from the file since", async () => {
    const sighting = Sighting.create(undefined, [{ lat: 1, lng: 2 }])
    const { panel } = mounted(sighting)
    const place = [{ lat: 44.98, lng: 2.92, name: "Cussac" }]
    await panel.take("place", { file: new File([JSON.stringify({ version: 1, place })], "p.json") })
    expect(sighting.event.place?.[0]).toMatchObject({ lat: 44.98, name: "Cussac" })
    expect(sighting.frozen?.place).toEqual({})
    const lightPollution = { value: 21.2, basis: "derived", rationale: "World Atlas 2015", of: 21.2 }
    await panel.take("lightPollution", { file: new File([JSON.stringify({ version: 1, lightPollution })], "l.json") })
    expect(sighting.lightPollution).toBe(21.2)
    expect(sighting.provenance.at("lightPollution")?.rationale).toBe("World Atlas 2015")
    // Its annex states it as the recording does, provenance and all.
    panel.setStorage("lightPollution", false)
    expect(JSON.parse(new TextDecoder().decode(panel.annex("lightPollution")!.bytes)).lightPollution).toMatchObject({ value: 21.2, basis: "derived" })
    panel.setStorage("lightPollution", true)
    expect(sighting.frozen?.lightPollution).toEqual({})
  })

  it("saves a section kept inside the recording as an annex of its own", () => {
    const sighting = Sighting.create(undefined, [{ lat: 1, lng: 2, name: "Here" }])
    const { root, panel, downloads } = mounted(sighting)
    panel.show("place")
    ;(root.querySelector("#section-annex-export") as HTMLButtonElement).click()
    expect(downloads[0].fileName).toBe("x-sighting.place.json")
  })
})
