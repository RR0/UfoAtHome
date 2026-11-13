import type { KmlExportTexts } from "./KmlExportTexts.js"

export const kmlExportTexts_en = {
  document: "{name} — UFO@home",
  documentNote: "What this reconstruction holds geographically: where the observer stood, the directions the account states, and where a reading places what would have been seen. Nothing here is a measurement of the phenomenon.",
  folderObserver: "Observer",
  folderSightLines: "Lines of sight",
  folderBodies: "What a reading places",
  folderTraces: "Investigator's traces",
  observerPoint: "Observer, {s} s",
  observerPath: "Observer's path",
  observerNote: "{elevation} m above the ground, looking {heading}° from north.",
  sightLine: "Line of sight — {what}, {s} s",
  sightLineNote: "The direction the account states: {azimuth}° from north, {altitude}° above the horizon. The {km} km drawn is conventional — the account gives a direction, not a distance.",
  bodyPoint: "{what}",
  bodyPath: "{what} — path",
  bodyNote: "Where a reading of the account places it. Somebody's interpretation, not the account.",
  heightNote: "Heights are counted from the ground where the observer set off.",
  unnamed: "Phenomenon {id}"
} satisfies KmlExportTexts
