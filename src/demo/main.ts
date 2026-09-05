import { register } from "../component/UfoRecorderElement.js"
import type { UfoRecorderElement } from "../component/UfoRecorderElement.js"
import { registerSighting } from "../component/SightingElement.js"
import { registerScene } from "../component/SceneElement.js"
import type { SceneElement } from "../component/SceneElement.js"
import type { SightingRecordingJson } from "../engine/persistence/sightingJson.js"

register()
registerSighting()
registerScene()

const recorder = document.getElementById("recorder") as UfoRecorderElement
const loadSampleButton = document.getElementById("load-sample") as HTMLButtonElement

loadSampleButton.addEventListener("click", async () => {
  const response = await fetch("/demo-data/example-sighting.json")
  const json = (await response.json()) as SightingRecordingJson
  recorder.sightingData = json
})

const scene = document.getElementById("scene") as SceneElement
const sceneCaseSelect = document.getElementById("scene-case") as HTMLSelectElement
sceneCaseSelect.addEventListener("change", () => {
  void scene.loadFromSrc(sceneCaseSelect.value)
})
