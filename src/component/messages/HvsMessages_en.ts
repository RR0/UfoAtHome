import type { HvsMessages } from "./HvsMessages.js"

export const hvsMessages_en = {
  heading: "Hypotheses weighed (HVS)",
  hint: "Stéphane Baron's HVS protocol weighs each hypothesis by its coverage (CS), the share of the file's elements it explains, and by its plausibility (PS), apart from the case: HVS = CS × PS, a value preferred and its envelope, never a probability. The raw CS is over every element counted (inferences of association are not), the discriminating CS over those that tell the hypotheses apart; that one names the dominant hypothesis. A hypothesis is admissible only if it covers at least half of the elements. A direction or a size a reading reconstructs is explained or not by its confrontation with the testimony; the rest, as the analyst declares. The plausibility and the context factor are the analyst's: UFO@home supplies no prior probability.",
  credit: "Stéphane Baron's HVS protocol {protocol}",
  taxonomy: "taxonomy {taxonomy}",
  notSealed: "The list of elements is not frozen: it has to be before the hypotheses are weighed.",
  noElements: "No elements: the file lists none.",
  noHypotheses: "No hypothesis weighed.",
  iqi: {
    heading: "Information quality (IQI)",
    item: "{group}: {level}",
    total: "{sum} out of {of}",
    groups: { dateTime: "Date and time", place: "Place", identification: "Who the witnesses are", witnesses: "How many witnesses", enquiry: "Enquiry" },
    levels: { complete: "complete", partial: "partial", absent: "absent" },
    unrated: "to be rated",
    suggested: "suggested from the file"
  },
  elements: {
    heading: "Elements",
    id: "Id",
    element: "Element",
    status: "Status",
    statuses: { observed: "observed fact", inferred: "inference", association: "inference of association" },
    discriminating: "tells the hypotheses apart",
    explainedByReading: "explained: the reading reproduces it",
    notExplainedByReading: "not explained: the reading does not reproduce it",
    explainedDeclared: "explained, as the analyst judges",
    notExplainedDeclared: "not explained, as the analyst judges"
  },
  hypotheses: {
    heading: "Hypotheses",
    code: "Code",
    hypothesis: "Hypothesis",
    csRaw: "Raw CS",
    csDiscriminating: "Discriminating CS",
    ps: "PS",
    hvs: "HVS",
    standing: "Milestone",
    score: "{preferred} [{low} – {high}]",
    admissible: "admissible",
    notAdmissible: "not admissible",
    admissibleHint: "Admissible: covers at least half of the elements (raw CS ≥ 0.5). A filter before the hypotheses are told apart, not a verdict.",
    dominant: "dominant",
    identified: "stimulus identified",
    proven: "proof sealed",
    geometric: "geometric mean: a rating collapses",
    missing: "not rated: {names}",
    ratings: { existence: "existence", frequency: "frequency", compatibility: "compatibility", context: "context" }
  },
  loading: "…"
} satisfies HvsMessages
