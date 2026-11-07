import type { ModulesPanelMessages } from "./ModulesPanelMessages.js"

export const modulesPanelMessages_en: ModulesPanelMessages = {
  intro: "A module adds sources (imagery, relief, weather…) and 3D models that others published. The modules you add are kept in this browser; save them to a file to take them elsewhere.",
  codeWarning: "A module that contains code runs with everything this page can do: only add those whose author you know.",
  urlPlaceholder: "https://…/ufoathome-module.json",
  add: "Add",
  none: "No module.",
  remove: "Remove",
  enabled: "On",
  namedByRecording: "Named by this recording",
  namedByRecordingHint: "Whoever opens the recording loads this module, so that the models it takes from it are drawn. Its code, if it has any, only runs for those who added it themselves.",
  addToMine: "Add to my modules",
  loading: "Loading…",
  failed: "Could not be loaded: {error}",
  off: "Off",
  brings: "Brings: {points}",
  bringsNothing: "Brings nothing.",
  runsCode: "Runs code.",
  codeNotRun: "Its code was not run: add it to your modules to run it.",
  exportConfig: "Save my modules",
  importConfig: "Load modules",
  imported: "{count} module(s) loaded from the file.",
  importFailed: "This file is not a list of modules: {error}",
  points: {
    weather: "weather", place: "places", timeZone: "time zones", narrative: "drafting", assessment: "assessments",
    lightPollution: "light pollution", aircraft: "air traffic", upperAir: "air aloft", elevation: "relief", imagery: "imagery",
    surroundings: "surroundings", perception: "perception", interpretations: "interpretations", skyEvents: "sky events", decorModels: "3D models"
  }
}
