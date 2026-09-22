import type { SightingMessages } from "./SightingMessages.js"
import { sightingLabels_en } from "./SightingLabels_en.js"

export const sightingMessages_en: SightingMessages = {
  ...sightingLabels_en,
  testimonyBy: "Account by",
  unnamedWitness: "Observer {n}",
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
  testimony: "Account",
  interpretationBy: "{title}, by {by}",
  confrontation: "Against the account",
  confrontationDirection: "{deg}° off",
  confrontationWidth: "width ×{ratio}",
  confrontationHeight: "height ×{ratio}",
  showComparison: "Compare with the account",
  hideComparison: "Stop comparing with the account",
  hideLabels: "Hide what it states"
}
