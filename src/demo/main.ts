import { setupCloudDemo } from "./clouds.js"
import { register } from "../component/SightingEditorElement.js"
import type { SightingEditorElement } from "../component/SightingEditorElement.js"
import type { SightingElement } from "../component/SightingElement.js"
import { registerSighting } from "../component/SightingElement.js"
import { registerScene } from "../component/SceneElement.js"
import type { SceneElement } from "../component/SceneElement.js"
import type { SightingRecordingJson } from "../engine/persistence/sightingJson.js"
import { DemoCatalogue } from "../../site/content/DemoCatalogue.js"

register()
registerSighting()
registerScene()

const editor = document.getElementById("editor") as SightingEditorElement
const loadSampleButton = document.getElementById("load-sample") as HTMLButtonElement

loadSampleButton.addEventListener("click", async () => {
  const response = await fetch("/demo-data/example-sighting.json")
  const json = (await response.json()) as SightingRecordingJson
  editor.sightingData = json
})

const scene = document.getElementById("scene") as SceneElement
scene.setCloudRendering("volume")
;(document.getElementById("observers") as SightingElement).scene.setCloudRendering("volume")
const sceneCaseSelect = document.getElementById("scene-case") as HTMLSelectElement
// The site's own catalogue, not a list kept here: the one kept here named files that had been renamed, and loaded nothing.
for (const group of new DemoCatalogue().groups) {
  for (const demo of group.demos) {
    const option = document.createElement("option")
    option.value = demo.src
    option.textContent = demo.title.en
    sceneCaseSelect.append(option)
  }
}
sceneCaseSelect.value = "/demo-data/observer-chiles.json"
sceneCaseSelect.addEventListener("change", () => {
  void scene.loadFromSrc(sceneCaseSelect.value)
})

setupCloudDemo(editor)
