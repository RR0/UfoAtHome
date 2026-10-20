import { afterEach, describe, expect, it, vi } from "vitest"
import { WeatherFilePanel } from "../../src/component/WeatherFilePanel.js"
import { register as registerInputFile, type InputFileElement } from "../../src/component/InputFileElement.js"
import { sightingEditorMessages_en } from "../../src/component/messages/SightingEditorMessages_en.js"
import { Sighting } from "../../src/engine/model/Sighting.js"
import { DEFAULT_WEATHER } from "../../src/engine/model/Weather.js"

registerInputFile()

function mounted(sighting: Sighting) {
  const root = document.createElement("div")
  // As the editor's Files group has it (see sightingEditorTemplate).
  root.innerHTML = `<span id="label-weather-annex-source"></span> <rr0-input-file id="weather-annex-source" name="weather-annex-source" no-button></rr0-input-file>
    <button id="weather-annex-export" type="button"></button><span id="label-weather-storage"></span>
    <label><input type="radio" name="weather-storage" id="weather-storage-url" value="url"/> <span id="label-weather-storage-url"></span></label>
    <label><input type="radio" name="weather-storage" id="weather-storage-inline" value="inline"/> <span id="label-weather-storage-inline"></span></label>
    <p id="weather-annex-state"></p><p id="weather-annex-note" hidden></p>`
  document.body.appendChild(root)
  const changed = vi.fn()
  const downloads: { blob: Blob; fileName: string }[] = []
  const panel = new WeatherFilePanel(root, {
    sighting: () => sighting, documentUrl: () => "https://example.org/d/x.json", base: () => "x-sighting",
    download: (blob, fileName) => downloads.push({ blob, fileName }), changed
  })
  panel.localize(sightingEditorMessages_en)
  return { root, panel, changed, downloads }
}

afterEach(() => {
  document.body.replaceChildren()
})

describe("WeatherFilePanel", () => {
  it("keeps the weather inside the recording until it is kept beside it, and writes its annex then", () => {
    const sighting = Sighting.create()
    sighting.weatherTrack.addKeyframe(0, { ...DEFAULT_WEATHER, cloudCover: 0.3 })
    const { root, panel, changed } = mounted(sighting)
    expect(panel.annex()).toBeUndefined()
    expect(root.querySelector<HTMLInputElement>("#weather-storage-inline")!.checked).toBe(true)
    expect(panel.itemLabel()).toBe("Weather · inside the recording")
    const url = root.querySelector<HTMLInputElement>("#weather-storage-url")!
    url.checked = true
    url.dispatchEvent(new Event("change"))
    expect(changed).toHaveBeenCalled()
    expect(sighting.frozen?.weather).toEqual({ src: "x-sighting.weather.json" })
    const annex = panel.annex()!
    expect(annex.src).toBe("x-sighting.weather.json")
    expect(JSON.parse(new TextDecoder().decode(annex.bytes)).weatherTrack.keyframes[0].weather.cloudCover).toBe(0.3)
    expect(root.querySelector<InputFileElement>("#weather-annex-source")!.url).toBe("https://example.org/d/x-sighting.weather.json")
    panel.setStorage(true)
    expect(sighting.frozen).toBeUndefined()
  })

  it("takes the weather of a file the author picks, and refuses one with none", async () => {
    const sighting = Sighting.create()
    const { root, panel } = mounted(sighting)
    const weatherTrack = { keyframes: [{ t: 0, weather: { ...DEFAULT_WEATHER, cloudCover: 0.8 } }] }
    const input = root.querySelector<InputFileElement>("#weather-annex-source")!.controls.file
    Object.defineProperty(input, "files", { configurable: true, value: [new File([JSON.stringify({ version: 1, weatherTrack })], "w.json")] })
    input.dispatchEvent(new Event("change"))
    await vi.waitFor(() => expect(sighting.weatherTrack.allKeyframes[0]?.weather.cloudCover).toBe(0.8))
    await panel.take({ file: new File(["{}"], "none.json") })
    expect(root.querySelector("#weather-annex-note")!.textContent).toBe(sightingEditorMessages_en.annexUnreadable)
    expect(sighting.weatherTrack.allKeyframes[0].weather.cloudCover).toBe(0.8)
  })
})
