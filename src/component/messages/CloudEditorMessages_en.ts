import type { CloudEditorMessages } from "./CloudEditorMessages.js"

export const cloudEditorMessages_en: CloudEditorMessages = {
  intro: "Weather records supply coverage and wind when available. Cloud shape, thickness and size are visual estimates; they are not measured individual clouds.",
  editScope: "Edit scope",
  scopeInstant: "Current time",
  scopeObservation: "Whole observation",
  layer: "Layer",
  addLayer: "Add layer",
  deleteLayer: "Delete layer",
  editHelp: "Edits pause playback and save at the current weather time. Empty layer wind fields inherit the general wind. Whole observation applies the edited property to every weather keyframe.",
  individualClouds: "Individual clouds",
  individualCloud: "Individual cloud",
  addIndividualCloud: "Add individual cloud",
  pointAtCloud: "Point at cloud",
  deleteCloud: "Delete cloud",
  manipulate: "Select and drag clouds in the sky",
  individualHelp: "Individual clouds remain present at 0% global coverage. Dragging changes position and altitude; numeric fields provide precise dimensions. Clouds follow their layer's wind.",
  none: "None",
  cloud: "Cloud",
  savedAcrossObservation: "Saved across the observation; winds preserved.",
  savedAtThisTime: "Weather saved at this time.",
  noCloudHere: "No individual cloud here.",
  cloudSelected: "Cloud selected. Drag to move it.",
  cloudAdded: " Individual cloud added, independent of global coverage.",
  emptyLayers: "No cloud layer"
}
