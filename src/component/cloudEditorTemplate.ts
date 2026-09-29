import type { CloudEditorMessages } from "./messages/CloudEditorMessages.js"

/** The cloud editor's texts in English: the template's own, and what every reader sees until their
 * language's CloudEditorMessages have arrived (see CloudEditorTemplate.localize). */
export const cloudEditorMessages_en: CloudEditorMessages = {
  intro: "Weather records supply coverage and wind when available. Cloud shape, thickness and size are visual estimates; they are not measured individual clouds.",
  editScope: "Edit scope",
  scopeInstant: "Current time",
  scopeObservation: "Whole observation",
  layer: "Layer",
  addLayer: "Add layer",
  deleteLayer: "Delete layer",
  cloudType: "Cloud type",
  unknownType: "Unknown",
  base: "Base (m)",
  thickness: "Thickness (m)",
  coverage: "Coverage (%)",
  cloudSize: "Cloud size (m)",
  density: "Density",
  darkness: "Darkness",
  crystalAlignment: "Crystal alignment",
  layerWindDirection: "Layer wind direction (°)",
  layerWindSpeed: "Layer wind speed (m/s)",
  generalWind: "General wind",
  patternSeed: "Pattern seed",
  editHelp: "Edits pause playback and save at the current weather time. Empty layer wind fields inherit the general wind. Whole observation applies the edited property to every weather keyframe.",
  individualClouds: "Individual clouds",
  individualCloud: "Individual cloud",
  addIndividualCloud: "Add individual cloud",
  pointAtCloud: "Point at cloud",
  deleteCloud: "Delete cloud",
  manipulate: "Select and drag clouds in the sky",
  instanceEast: "East position (m)",
  instanceNorth: "North position (m)",
  instanceBase: "Cloud base (m)",
  instanceThickness: "Cloud thickness (m)",
  instanceWidth: "Cloud width (m)",
  instanceDepth: "Cloud depth (m)",
  instanceRotation: "Cloud rotation (°)",
  instanceDensity: "Cloud density",
  layerDarkness: "Layer darkness",
  individualHelp: "Individual clouds remain present at 0% global coverage. Dragging changes position and altitude; numeric fields provide precise dimensions. Clouds follow their layer's wind.",
  none: "None",
  cloud: "Cloud",
  savedAcrossObservation: "Saved across the observation; winds preserved.",
  savedAtThisTime: "Weather saved at this time.",
  noCloudHere: "No individual cloud here.",
  cloudSelected: "Cloud selected. Drag to move it.",
  cloudAdded: " Individual cloud added, independent of global coverage."
}

type Key = keyof CloudEditorMessages

/**
 * Cloud controls live inside the weather panel; all numbers are recording data.
 *
 * Every text carries the key it was written from (`data-text`, `data-placeholder`), so that the
 * reader's own language, which arrives after the controls are up and wired, can be put in place
 * without rebuilding them (see localize).
 */
export class CloudEditorTemplate {

  static html(m: CloudEditorMessages = cloudEditorMessages_en): string {
    const t = (key: Key) => `<span data-text="${key}">${m[key]}</span>`
    const number = (id: string, label: Key, min = "", max = "", placeholder?: Key) =>
      `<label>${t(label)}<input id="${id}" type="number" step="any" ${min ? `min="${min}"` : ""} ${max ? `max="${max}"` : ""} placeholder="${placeholder ? m[placeholder] : ""}"${placeholder ? ` data-placeholder="${placeholder}"` : ""}></label>`
    return `<div class="cloud-panel">
    <p data-text="intro">${m.intro}</p>
    <div class="cloud-fields">
    <label>${t("editScope")}<select id="cloud-scope"><option value="instant" data-text="scopeInstant">${m.scopeInstant}</option><option value="observation" data-text="scopeObservation">${m.scopeObservation}</option></select></label>
    <label>${t("layer")}<select id="cloud-layer"></select></label>
    <div class="cloud-actions"><button id="cloud-layer-add" type="button" data-text="addLayer">${m.addLayer}</button>
    <button id="cloud-layer-delete" type="button" data-text="deleteLayer">${m.deleteLayer}</button></div>
    <label>${t("cloudType")}<select id="cloud-type"><option value="cumulus">Cumulus</option><option value="stratus">Stratus</option><option value="stratocumulus">Stratocumulus</option><option value="cirrus">Cirrus</option><option value="unknown" data-text="unknownType">${m.unknownType}</option></select></label>
    ${number("cloud-base", "base", "0", "20000")}
    ${number("cloud-thickness", "thickness", "10", "8000")}
    ${number("cloud-cover", "coverage", "0", "100")}
    ${number("cloud-size", "cloudSize", "50", "20000")}
    ${number("cloud-density", "density", "0", "2")}
    ${number("cloud-darkness", "darkness", "0", "1")}
    ${number("cloud-crystal-alignment", "crystalAlignment", "0", "1")}
    ${number("cloud-wind-direction", "layerWindDirection", "0", "360", "generalWind")}
    ${number("cloud-wind-speed", "layerWindSpeed", "0", "120", "generalWind")}
    ${number("cloud-seed", "patternSeed", "0", "9999")}
    </div>
    <p data-text="editHelp">${m.editHelp}</p>
    <details><summary data-text="individualClouds">${m.individualClouds}</summary><div class="cloud-fields">
    <label>${t("individualCloud")}<select id="cloud-instance"></select></label>
    <div class="cloud-actions"><button id="cloud-instance-add" type="button" data-text="addIndividualCloud">${m.addIndividualCloud}</button>
    <button id="cloud-instance-point" type="button" data-text="pointAtCloud">${m.pointAtCloud}</button>
    <button id="cloud-instance-delete" type="button" data-text="deleteCloud">${m.deleteCloud}</button></div>
    <label><input id="cloud-manipulate" type="checkbox">${t("manipulate")}</label>
    ${number("instance-east", "instanceEast", "-30000", "30000")}
    ${number("instance-north", "instanceNorth", "-30000", "30000")}
    ${number("instance-base", "instanceBase", "0", "20000")}
    ${number("instance-thickness", "instanceThickness", "10", "8000")}
    ${number("instance-width", "instanceWidth", "50", "20000")}
    ${number("instance-depth", "instanceDepth", "50", "20000")}
    ${number("instance-rotation", "instanceRotation", "-360", "360")}
    ${number("instance-density", "instanceDensity", "0", "2")}
    ${number("instance-darkness", "darkness", "0", "1", "layerDarkness")}
    </div><p data-text="individualHelp">${m.individualHelp}</p></details>
    <p id="cloud-status" role="status"></p></div>`
  }

  /** Puts `messages` in place of the texts the controls under `root` were built with. */
  static localize(root: ParentNode, messages: CloudEditorMessages): void {
    for (const element of root.querySelectorAll<HTMLElement>("[data-text]")) {
      element.textContent = messages[element.dataset.text as Key]
    }
    for (const input of root.querySelectorAll<HTMLInputElement>("[data-placeholder]")) {
      input.placeholder = messages[input.dataset.placeholder as Key]
    }
  }
}
