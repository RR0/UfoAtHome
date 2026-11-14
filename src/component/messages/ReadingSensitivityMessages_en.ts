import type { ReadingSensitivityMessages } from "./ReadingSensitivityMessages.js"

export const readingSensitivityMessages_en = {
  heading: "Sensitivity:",
  hint: "What is compared: each direction or size the recording traces to the witness, with what it rests on, against what the body the reading places would look like from where the witness stood, at the same instant. A gap is a contradiction only beyond what a witness's estimate of that kind may be off. The margins say how far each value the reading supposed can be moved before it reproduces less: a narrow margin is a fine-tuning, a wide one a robust reading. A margin is sufficient when it covers at least half of the value's uncertainty each way, as the witness error laws give it (a factor of 10 for a supposed distance): not all of it, since agreement is already judged with that uncertainty.",
  nothingToConfront: "nothing to set against the account: no body of the reading says which phenomenon it is",
  noneSaid: "nothing to set against the account: it traces no direction and no size to the witness",
  noneAgrees: "reproduces none of the witness's {compared} indications",
  agreementOne: "reproduces 1 of the witness's {compared} indications",
  agreement: "reproduces {agreed} of the witness's {compared} indications",
  allAgree: "reproduces all the witness's {compared} indications",
  tooFew: "too few to measure how robust it is",
  noFreeValue: "nothing supposed: no value to move",
  tightest: "tightest: {knob}, from {lower} to {upper}",
  margin: "{knob}: holds from {lower} to {upper}; no law says how uncertain it is",
  marginJudged: "{knob}: holds from {lower} to {upper}, for an uncertainty of {refLower} to {refUpper} ({coverage} % covered)",
  sufficient: "sufficient margin",
  fineTuned: "fine-tuned: {knob} covers only {coverage} % of its uncertainty",
  atLeast: "{value} and beyond",
  better: "Another setting reproduces more: {knob} {amount}, {agreed} of {compared}",
  knobs: { azimuth: "direction", altitude: "height", distance: "distance", size: "size", time: "time" }
} satisfies ReadingSensitivityMessages
