import type { ReadingSensitivityMessages } from "./ReadingSensitivityMessages.js"

export const readingSensitivityMessages_en = {
  heading: "Sensitivity:",
  hint: "How far each value the reading supposed can be moved before it reproduces less of the account. A likeness that holds only within a few tenths of a degree was fitted, not found. The witness's own uncertainty is not moved: it is already in what counts as a contradiction.",
  nothingToConfront: "nothing to set against the account: no body of the reading says which phenomenon it is",
  noneAgrees: "reproduces none of the {compared} comparisons",
  agreement: "reproduces {agreed} of {compared} comparisons",
  agreementOne: "reproduces 1 of {compared} comparisons",
  allAgree: "reproduces all {compared} comparisons",
  noFreeValue: "nothing supposed: no value to move",
  tightest: "most fragile: {knob}, from {lower} to {upper}",
  margin: "{knob}: from {lower} to {upper}",
  atLeast: "{value} and beyond",
  better: "Another setting reproduces more: {knob} at {amount}, {agreed} of {compared}",
  knobs: { azimuth: "direction", altitude: "height", distance: "distance", size: "size", time: "time" }
} satisfies ReadingSensitivityMessages
