import type { SightingMessages } from "./SightingMessages.js"
import { sightingLabels_en } from "./SightingLabels_en.js"

export const sightingMessages_en: SightingMessages = {
  ...sightingLabels_en,
  testimonyBy: "Testimony by",
  unnamedWitness: "Witness {n}",
  about: "About",
  close: "Close",
  observation: "Observation",
  date: "Date",
  location: "Location",
  case: "Case",
  description: "Description",
  credits: "Credits",
  editThisObservation: "Edit this observation",
  embed: "Embed",
  embedReplay: "Replay",
  embedEdit: "Editor",
  embedCopy: "Copy",
  embedCopied: "Copied",
  showLabels: "Show what it states",
  interpretation: "Interpretation",
  rawTestimony: "Raw testimony",
  witnessInterpretation: "The witness's own",
  interpretationBy: "{title}, by {by}",
  confrontation: "Against the testimony",
  confrontationDirection: "{deg}° off",
  confrontationWidth: "width ×{ratio}",
  confrontationHeight: "height ×{ratio}",
  showComparison: "Compare with the testimony",
  hideComparison: "Stop comparing with the testimony",
  hideLabels: "Hide what it states"
}
