import { register } from "../component/UfoRecorderElement.js"
import type { UfoRecorderElement } from "../component/UfoRecorderElement.js"
import { registerWitnessSelector } from "../component/WitnessSelectorElement.js"
import { registerScene } from "../component/SceneElement.js"
import type { SightingRecordingJson } from "../engine/persistence/sightingJson.js"

register()
registerWitnessSelector()
registerScene()

const recorder = document.getElementById("recorder") as UfoRecorderElement
const loadSampleButton = document.getElementById("load-sample") as HTMLButtonElement

loadSampleButton.addEventListener("click", async () => {
  const response = await fetch("/demo-data/example-sighting.json")
  const json = (await response.json()) as SightingRecordingJson
  recorder.sightingData = json
})
