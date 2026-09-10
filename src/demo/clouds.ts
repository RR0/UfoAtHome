import type { SightingEditorElement } from "../component/SightingEditorElement.js"
import type { SightingRecordingJson } from "../engine/persistence/sightingJson.js"

/** Test scenarios exercise the actual weather editor; no second weather form. */
export function setupCloudDemo(editor: SightingEditorElement): void {
  const rendering = document.getElementById("cloud-rendering") as HTMLSelectElement
  rendering.addEventListener("change", () => editor.setCloudRendering(rendering.value as "surface" | "volume"))
  document.getElementById("cloud-load")!.addEventListener("click", async () => {
    const response = await fetch("/demo-data/sky-test-clouds.json")
    editor.sightingData = await response.json() as SightingRecordingJson
    rendering.value = "volume"
    editor.setCloudRendering("volume")
    editor.showWeatherEditor()
    editor.scrollIntoView({ block: "start", behavior: "smooth" })
  })
}
